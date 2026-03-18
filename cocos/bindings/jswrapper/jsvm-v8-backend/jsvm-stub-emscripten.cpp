/*
 * JSVM stub implementation for Emscripten/WebAssembly
 *
 * The JSVM layer (jsvm/ScriptEngine.cpp etc.) expects a real JS engine.
 * On Emscripten the browser IS the JS engine, so we provide a minimal
 * implementation that keeps the C++ side happy while actual JS execution
 * happens in the browser via emscripten_run_script / EM_JS.
 *
 * Key design:
 *  - Every opaque handle type gets a real backing struct.
 *  - JSVM_CallbackInfo__ carries the actual JS call arguments so that
 *    OH_JSVM_GetCbInfo can return them to the C++ callback.
 *  - jsvm_invoke_callback is a C++ entry point (EMSCRIPTEN_KEEPALIVE) that
 *    the JS side calls directly – no indirect WASM table call needed.
 */

#include "jsvm.h"
#include "jsvm_types.h"
#include <emscripten.h>
#include <cstdlib>
#include <cstring>
#include <cstdio>

// ── Concrete backing structs ──────────────────────────────────────────────────

struct JSVM_VM__   { int dummy{1}; };
struct JSVM_VMScope__  { int dummy{1}; };
struct JSVM_EnvScope__ { int dummy{1}; };
struct JSVM_Script__   { int dummy{1}; };  // dummy holds JS string ref
struct JSVM_HandleScope__          { int dummy{1}; };
struct JSVM_EscapableHandleScope__ { int dummy{1}; };
struct JSVM_Deferred__             { int dummy{1}; };
struct JSVM_Ref__  { uint32_t refcount{1}; JSVM_Value__ *value{nullptr}; };

struct JSVM_Env__ {
    int  globalRef{0};
    bool hasException{false};
};

struct JSVM_Value__ {
    int  ref{0};   // index into Module._jsvmRefs[]
};

// CallbackInfo carries the live JS call context so OH_JSVM_GetCbInfo works.
static constexpr int CBINFO_MAX_ARGS = 20;

struct JSVM_CallbackInfo__ {
    int  thisRef{0};
    int  newTargetRef{0};
    int  argCount{0};
    int  argRefs[CBINFO_MAX_ARGS];
    void *cbData{nullptr};
};

// ── Singletons ────────────────────────────────────────────────────────────────
static JSVM_VM__       s_vm;
static JSVM_VMScope__  s_vmScope;
static JSVM_EnvScope__ s_envScope;
static JSVM_Env__      s_env;

// ── Value pool ────────────────────────────────────────────────────────────────
static constexpr int VALUE_POOL_SIZE = 8192;
static JSVM_Value__ s_valuePool[VALUE_POOL_SIZE];
static int s_valuePoolIdx = 0;

static JSVM_Value__ *allocValue(int jsRef = 0) {
    if (s_valuePoolIdx >= VALUE_POOL_SIZE) s_valuePoolIdx = 0;
    auto *v = &s_valuePool[s_valuePoolIdx++];
    v->ref = jsRef;
    return v;
}

// ── EM_JS helpers ─────────────────────────────────────────────────────────────

EM_JS(void, jsvm_refs_init, (), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
});

EM_JS(int, jsvm_get_global_ref, (), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(globalThis);
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_eval_string, (const char *src), {
    try {
        var result = eval(UTF8ToString(src));
        if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
        Module._jsvmRefs.push(result);
        return Module._jsvmRefs.length - 1;
    } catch(e) { console.error("jsvm_eval_string error:", e); return 0; }
});

EM_JS(int, jsvm_get_named_property, (int objRef, const char *name), {
    try {
        var obj = Module._jsvmRefs[objRef];
        if (obj === undefined || obj === null) return 0;
        var val = obj[UTF8ToString(name)];
        if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
        Module._jsvmRefs.push(val);
        return Module._jsvmRefs.length - 1;
    } catch(e) { return 0; }
});

EM_JS(void, jsvm_set_named_property, (int objRef, const char *name, int valRef), {
    try {
        var obj = Module._jsvmRefs[objRef];
        var val = Module._jsvmRefs[valRef];
        if (obj !== undefined && obj !== null)
            obj[UTF8ToString(name)] = val;
    } catch(e) {}
});

EM_JS(int, jsvm_call_function, (int recvRef, int funcRef, int argc, int *argRefs), {
    try {
        var func = Module._jsvmRefs[funcRef];
        var recv = Module._jsvmRefs[recvRef];
        var args = [];
        for (var i = 0; i < argc; i++) {
            args.push(Module._jsvmRefs[HEAP32[(argRefs>>2)+i]]);
        }
        var result = func.apply(recv, args);
        if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
        Module._jsvmRefs.push(result);
        return Module._jsvmRefs.length - 1;
    } catch(e) { console.error("jsvm_call_function error:", e); return 0; }
});

EM_JS(int, jsvm_typeof_ref, (int ref), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : undefined;
    if (v === undefined) return 0;
    if (v === null) return 1;
    var t = typeof v;
    if (t === 'boolean') return 2;
    if (t === 'number') return 3;
    if (t === 'string') return 4;
    if (t === 'symbol') return 5;
    if (t === 'function') return 7;
    if (t === 'bigint') return 8;
    return 6;
});

EM_JS(double, jsvm_get_number, (int ref), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : 0;
    return (typeof v === 'number') ? v : 0;
});

EM_JS(int, jsvm_make_number, (double v), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(v);
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_make_bool, (int v), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(v ? true : false);
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_get_bool, (int ref), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : false;
    return v ? 1 : 0;
});

EM_JS(int, jsvm_make_string_utf8, (const char *s, int len), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    var str = len < 0 ? UTF8ToString(s) : UTF8ToString(s, len);
    Module._jsvmRefs.push(str);
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_get_string_utf8_len, (int ref), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : "";
    if (typeof v !== 'string') v = String(v);
    return lengthBytesUTF8(v);
});

EM_JS(void, jsvm_get_string_utf8_buf, (int ref, char *buf, int bufsize), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : "";
    if (typeof v !== 'string') v = String(v);
    stringToUTF8(v, buf, bufsize);
});

EM_JS(int, jsvm_make_object, (), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push({});
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_make_array, (int len), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(new Array(len));
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_is_array, (int ref), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : undefined;
    return Array.isArray(v) ? 1 : 0;
});

EM_JS(int, jsvm_array_length, (int ref), {
    var v = Module._jsvmRefs ? Module._jsvmRefs[ref] : undefined;
    return Array.isArray(v) ? v.length : 0;
});

EM_JS(int, jsvm_get_element, (int ref, int idx), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    var arr = Module._jsvmRefs[ref];
    var val = (Array.isArray(arr) || (arr && typeof arr === 'object')) ? arr[idx] : undefined;
    Module._jsvmRefs.push(val);
    return Module._jsvmRefs.length - 1;
});

EM_JS(void, jsvm_set_element, (int ref, int idx, int valRef), {
    var arr = Module._jsvmRefs ? Module._jsvmRefs[ref] : undefined;
    var val = Module._jsvmRefs ? Module._jsvmRefs[valRef] : undefined;
    if (arr !== undefined && arr !== null) arr[idx] = val;
});

EM_JS(int, jsvm_json_parse, (int strRef), {
    try {
        var s = Module._jsvmRefs ? Module._jsvmRefs[strRef] : "";
        if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
        Module._jsvmRefs.push(JSON.parse(s));
        return Module._jsvmRefs.length - 1;
    } catch(e) { return 0; }
});

EM_JS(int, jsvm_make_null, (), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(null);
    return Module._jsvmRefs.length - 1;
});

EM_JS(int, jsvm_make_undefined, (), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(undefined);
    return Module._jsvmRefs.length - 1;
});

EM_JS(void, jsvm_wrap_native, (int objRef, void *ptr), {
    var obj = Module._jsvmRefs ? Module._jsvmRefs[objRef] : undefined;
    if (obj && typeof obj === 'object') obj.__nativePtr = ptr;
});

EM_JS(void*, jsvm_unwrap_native, (int objRef), {
    var obj = Module._jsvmRefs ? Module._jsvmRefs[objRef] : undefined;
    return (obj && typeof obj === 'object') ? (obj.__nativePtr || 0) : 0;
});

// Push a JS value ref into the refs array and return its index.
EM_JS(int, jsvm_push_ref, (int ref), {
    if (!Module._jsvmRefs) { Module._jsvmRefs = [undefined]; }
    Module._jsvmRefs.push(Module._jsvmRefs[ref]);
    return Module._jsvmRefs.length - 1;
});

// Batch-fetch all callback info in a single EM_JS call to minimize
// WASM↔JS boundary crossings (each crossing consumes a JS call-stack frame).
// outBuf layout (int32 words): [thisRef, newTargetRef, arg0Ref, arg1Ref, ...]
// Returns actual argument count.
EM_JS(int, jsvm_cbinfo_get_all, (int cbinfoIdx, int *outBuf, int maxArgs), {
    var frame = Module._jsvmCallStack && Module._jsvmCallStack[cbinfoIdx];
    if (!frame) return 0;
    var refs = Module._jsvmRefs;
    if (!refs) { refs = Module._jsvmRefs = [undefined]; }
    refs.push(frame.thisArg);
    HEAP32[(outBuf>>2)] = refs.length - 1;
    refs.push(frame.newTarget || undefined);
    HEAP32[(outBuf>>2)+1] = refs.length - 1;
    var argc = frame.args.length;
    if (argc > maxArgs) argc = maxArgs;
    var fargs = frame.args;
    for (var i = 0; i < argc; i++) {
        refs.push(fargs[i]);
        HEAP32[(outBuf>>2)+2+i] = refs.length - 1;
    }
    return argc;
});

// Store the return value from a C++ callback invocation back into the JS call frame.
EM_JS(void, jsvm_cbinfo_set_result, (int cbinfoIdx, int resultRef), {
    var frame = Module._jsvmCallStack && Module._jsvmCallStack[cbinfoIdx];
    if (frame) frame.result = Module._jsvmRefs ? Module._jsvmRefs[resultRef] : undefined;
});

// Create a JS function that, when called, invokes the C++ callback via
// the exported _jsvm_dispatch_callback C function (no indirect call needed).
// cbStructPtr: pointer to JSVM_CallbackStruct in WASM memory.
// envPtr:      pointer to JSVM_Env__ in WASM memory.
EM_JS(int, jsvm_make_function_js, (const char *name, void *cbStructPtr, void *envPtr), {
    if (!Module._jsvmRefs)     { Module._jsvmRefs = [undefined]; }
    if (!Module._jsvmCallStack){ Module._jsvmCallStack = [null]; } // index 0 unused

    var fnName = name ? UTF8ToString(name) : "";
    var fn = function() {
        // Push a call frame so OH_JSVM_GetCbInfo can read it.
        var frame = {
            args: Array.prototype.slice.call(arguments),
            thisArg: this,
            newTarget: new.target || undefined,
            result: undefined
        };
        Module._jsvmCallStack.push(frame);
        var cbinfoIdx = Module._jsvmCallStack.length - 1;

        // Call the C++ dispatcher: jsvm_dispatch_callback(envPtr, cbStructPtr, cbinfoIdx)
        // This is a direct export – no indirect call, no table lookup.
        Module._jsvm_dispatch_callback(envPtr, cbStructPtr, cbinfoIdx);

        Module._jsvmCallStack[cbinfoIdx] = null; // release frame
        return frame.result;
    };
    Object.defineProperty(fn, 'name', { value: fnName });
    Module._jsvmRefs.push(fn);
    return Module._jsvmRefs.length - 1;
});

// Set a property on a JS object to a JS function built from a JSVM_Callback.
EM_JS(void, jsvm_define_property_fn, (int objRef, const char *name, void *cbStructPtr, void *envPtr, int isStatic), {
    if (!Module._jsvmRefs)     { Module._jsvmRefs = [undefined]; }
    if (!Module._jsvmCallStack){ Module._jsvmCallStack = [null]; }
    var obj = Module._jsvmRefs[objRef];
    if (!obj) return;
    var propName = UTF8ToString(name);
    var fn = function() {
        var frame = {
            args: Array.prototype.slice.call(arguments),
            thisArg: this,
            newTarget: new.target || undefined,
            result: undefined
        };
        Module._jsvmCallStack.push(frame);
        var cbinfoIdx = Module._jsvmCallStack.length - 1;
        Module._jsvm_dispatch_callback(envPtr, cbStructPtr, cbinfoIdx);
        Module._jsvmCallStack[cbinfoIdx] = null;
        return frame.result;
    };
    Object.defineProperty(fn, 'name', { value: propName });
    obj[propName] = fn;
});

// Define getter/setter pair on a JS object.
EM_JS(void, jsvm_define_accessor, (int objRef, const char *name,
                                    void *getterCb, void *setterCb, void *envPtr), {
    if (!Module._jsvmRefs)     { Module._jsvmRefs = [undefined]; }
    if (!Module._jsvmCallStack){ Module._jsvmCallStack = [null]; }
    var obj = Module._jsvmRefs[objRef];
    if (!obj) return;
    var propName = UTF8ToString(name);
    var makeDispatch = function(cbPtr) {
        return function() {
            var frame = {
                args: Array.prototype.slice.call(arguments),
                thisArg: this,
                newTarget: undefined,
                result: undefined
            };
            Module._jsvmCallStack.push(frame);
            var idx = Module._jsvmCallStack.length - 1;
            Module._jsvm_dispatch_callback(envPtr, cbPtr, idx);
            Module._jsvmCallStack[idx] = null;
            return frame.result;
        };
    };
    var desc = { configurable: true, enumerable: true };
    if (getterCb) desc.get = makeDispatch(getterCb);
    if (setterCb) desc.set = makeDispatch(setterCb);
    Object.defineProperty(obj, propName, desc);
});

// ── C++ callback dispatcher (exported, called directly from JS) ───────────────
//
// The JS function created by jsvm_make_function_js calls this instead of using
// an indirect WASM table call, which avoids the "function signature mismatch".
//
// Signature: (JSVM_Env env, JSVM_CallbackStruct* cb, int cbinfoIdx) -> void
// The return value is stored back into the JS frame via jsvm_cbinfo_set_result.

extern "C" {

EMSCRIPTEN_KEEPALIVE
void jsvm_dispatch_callback(JSVM_Env__ *env, JSVM_CallbackStruct *cb, int cbinfoIdx) {
    if (!cb || !cb->callback) return;

    // Build JSVM_CallbackInfo__ with a single EM_JS call (no per-arg crossings).
    JSVM_CallbackInfo__ info;
    info.cbData = cb->data;
    int buf[2 + CBINFO_MAX_ARGS];
    int argc = jsvm_cbinfo_get_all(cbinfoIdx, buf, CBINFO_MAX_ARGS);
    info.thisRef     = buf[0];
    info.newTargetRef = buf[1];
    info.argCount    = argc;
    for (int i = 0; i < argc; i++)
        info.argRefs[i] = buf[2 + i];

    JSVM_Value result = cb->callback(env, &info);

    int resultRef = result ? result->ref : jsvm_make_undefined();
    jsvm_cbinfo_set_result(cbinfoIdx, resultRef);
}

// ── JSVM C API ────────────────────────────────────────────────────────────────

JSVM_Status OH_JSVM_Init(const JSVM_InitOptions *options) { return JSVM_OK; }

JSVM_Status OH_JSVM_CreateVM(const JSVM_CreateVMOptions *options, JSVM_VM *result) {
    if (result) *result = &s_vm;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_DestroyVM(JSVM_VM vm) { return JSVM_OK; }
JSVM_Status OH_JSVM_OpenVMScope(JSVM_VM vm, JSVM_VMScope *result) {
    if (result) *result = &s_vmScope;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CloseVMScope(JSVM_VM vm, JSVM_VMScope scope) { return JSVM_OK; }

JSVM_Status OH_JSVM_CreateEnv(JSVM_VM vm, size_t propCount,
                               const JSVM_PropertyDescriptor *props, JSVM_Env *result) {
    s_env.globalRef = jsvm_get_global_ref();
    if (result) *result = &s_env;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_DestroyEnv(JSVM_Env env) { return JSVM_OK; }
JSVM_Status OH_JSVM_OpenEnvScope(JSVM_Env env, JSVM_EnvScope *result) {
    if (result) *result = &s_envScope;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CloseEnvScope(JSVM_Env env, JSVM_EnvScope scope) { return JSVM_OK; }

JSVM_Status OH_JSVM_GetVersion(JSVM_Env env, uint32_t *result) {
    if (result) *result = 8;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetGlobal(JSVM_Env env, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(env ? env->globalRef : jsvm_get_global_ref());
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetUndefined(JSVM_Env env, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_undefined());
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetNull(JSVM_Env env, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_null());
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetBoolean(JSVM_Env env, bool value, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_bool(value ? 1 : 0));
    return JSVM_OK;
}

// ── Script compile / run ──────────────────────────────────────────────────────
JSVM_Status OH_JSVM_CompileScriptWithOrigin(JSVM_Env env, JSVM_Value script,
    const uint8_t *cachedData, size_t cacheLen, bool eagerCompile,
    bool *cacheRejected, JSVM_ScriptOrigin *origin, JSVM_Script *result) {
    static JSVM_Script__ scriptSlot;
    scriptSlot.dummy = script ? script->ref : 0;
    if (cacheRejected) *cacheRejected = true;
    if (result) *result = &scriptSlot;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_RunScript(JSVM_Env env, JSVM_Script script, JSVM_Value *result) {
    int strRef = script ? script->dummy : 0;
    int len = jsvm_get_string_utf8_len(strRef);
    char *buf = (char*)malloc(len + 1);
    jsvm_get_string_utf8_buf(strRef, buf, len + 1);
    int resRef = jsvm_eval_string(buf);
    free(buf);
    if (result) *result = allocValue(resRef);
    return JSVM_OK;
}

// ── Handle scopes ─────────────────────────────────────────────────────────────
static JSVM_HandleScope__          s_handleScope;
static JSVM_EscapableHandleScope__ s_escapableScope;

JSVM_Status OH_JSVM_OpenHandleScope(JSVM_Env env, JSVM_HandleScope *result) {
    if (result) *result = &s_handleScope; return JSVM_OK;
}
JSVM_Status OH_JSVM_CloseHandleScope(JSVM_Env env, JSVM_HandleScope scope) { return JSVM_OK; }
JSVM_Status OH_JSVM_OpenEscapableHandleScope(JSVM_Env env, JSVM_EscapableHandleScope *result) {
    if (result) *result = &s_escapableScope; return JSVM_OK;
}
JSVM_Status OH_JSVM_CloseEscapableHandleScope(JSVM_Env env, JSVM_EscapableHandleScope scope) { return JSVM_OK; }
JSVM_Status OH_JSVM_EscapeHandle(JSVM_Env env, JSVM_EscapableHandleScope scope,
                                  JSVM_Value escapee, JSVM_Value *result) {
    if (result) *result = escapee; return JSVM_OK;
}

// ── References ────────────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_CreateReference(JSVM_Env env, JSVM_Value value,
                                     uint32_t initialRefcount, JSVM_Ref *result) {
    if (!result) return JSVM_INVALID_ARG;
    auto *r = new JSVM_Ref__();
    r->refcount = initialRefcount;
    r->value = value;
    *result = r;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_DeleteReference(JSVM_Env env, JSVM_Ref ref) {
    delete ref; return JSVM_OK;
}
JSVM_Status OH_JSVM_ReferenceRef(JSVM_Env env, JSVM_Ref ref, uint32_t *result) {
    if (ref) ++ref->refcount;
    if (result) *result = ref ? ref->refcount : 0;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_ReferenceUnref(JSVM_Env env, JSVM_Ref ref, uint32_t *result) {
    if (ref && ref->refcount > 0) --ref->refcount;
    if (result) *result = ref ? ref->refcount : 0;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetReferenceValue(JSVM_Env env, JSVM_Ref ref, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = ref ? ref->value : nullptr;
    return JSVM_OK;
}

// ── Object / property ─────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_CreateObject(JSVM_Env env, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_object());
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetNamedProperty(JSVM_Env env, JSVM_Value object,
                                      const char *name, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_get_named_property(object ? object->ref : 0, name));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_SetNamedProperty(JSVM_Env env, JSVM_Value object,
                                      const char *name, JSVM_Value value) {
    jsvm_set_named_property(object ? object->ref : 0, name, value ? value->ref : 0);
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetPropertyNames(JSVM_Env env, JSVM_Value object, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_array(0));
    return JSVM_OK;
}

// ── DefineProperties ──────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_DefineProperties(JSVM_Env env, JSVM_Value object,
                                      size_t count, const JSVM_PropertyDescriptor *props) {
    if (!object || !props) return JSVM_INVALID_ARG;
    int objRef = object->ref;
    for (size_t i = 0; i < count; i++) {
        const auto &p = props[i];
        const char *name = p.utf8name;
        if (!name) continue;
        bool isStatic = (p.attributes & JSVM_STATIC) != 0;
        if (p.method && p.method->callback) {
            jsvm_define_property_fn(objRef, name, p.method, env, isStatic ? 1 : 0);
        } else if (p.getter || p.setter) {
            jsvm_define_accessor(objRef, name,
                p.getter ? (void*)p.getter : nullptr,
                p.setter ? (void*)p.setter : nullptr,
                env);
        } else if (p.value) {
            jsvm_set_named_property(objRef, name, p.value->ref);
        }
    }
    return JSVM_OK;
}

// ── Function ──────────────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_CreateFunction(JSVM_Env env, const char *utf8name,
                                    size_t length, JSVM_Callback cb, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    int ref = (cb && cb->callback)
        ? jsvm_make_function_js(utf8name, cb, env)
        : jsvm_make_undefined();
    *result = allocValue(ref);
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CallFunction(JSVM_Env env, JSVM_Value recv, JSVM_Value func,
                                  size_t argc, const JSVM_Value *argv, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    int *argRefs = argc > 0 ? (int*)alloca(argc * sizeof(int)) : nullptr;
    for (size_t i = 0; i < argc; i++)
        argRefs[i] = argv[i] ? argv[i]->ref : 0;
    int recvRef = recv ? recv->ref : 0;
    int funcRef = func ? func->ref : 0;
    *result = allocValue(jsvm_call_function(recvRef, funcRef, (int)argc, argRefs));
    return JSVM_OK;
}

JSVM_Status OH_JSVM_NewInstance(JSVM_Env env, JSVM_Value constructor,
                                 size_t argc, const JSVM_Value *argv, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    // Call the constructor function with 'new' semantics via JS eval is complex;
    // for now create a plain object – the C++ ctor callback will wrap native data onto it.
    *result = allocValue(jsvm_make_object());
    return JSVM_OK;
}

JSVM_Status OH_JSVM_DefineClass(JSVM_Env env, const char *utf8name, size_t length,
                                 JSVM_Callback constructor, size_t propCount,
                                 const JSVM_PropertyDescriptor *props, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;

    // Create the constructor JS function.
    int ctorRef = (constructor && constructor->callback)
        ? jsvm_make_function_js(utf8name, constructor, env)
        : jsvm_make_undefined();
    *result = allocValue(ctorRef);

    // Create a prototype object and attach it.
    int protoRef = jsvm_make_object();
    jsvm_set_named_property(ctorRef, "prototype", protoRef);

    // Install instance and static properties.
    for (size_t i = 0; i < propCount; i++) {
        const auto &p = props[i];
        const char *name = p.utf8name;
        if (!name) continue;
        bool isStatic = (p.attributes & JSVM_STATIC) != 0;
        int targetRef = isStatic ? ctorRef : protoRef;
        if (p.method && p.method->callback) {
            jsvm_define_property_fn(targetRef, name, p.method, env, isStatic ? 1 : 0);
        } else if (p.getter || p.setter) {
            jsvm_define_accessor(targetRef, name,
                p.getter ? (void*)p.getter : nullptr,
                p.setter ? (void*)p.setter : nullptr,
                env);
        } else if (p.value) {
            jsvm_set_named_property(targetRef, name, p.value->ref);
        }
    }
    return JSVM_OK;
}

// ── GetCbInfo ─────────────────────────────────────────────────────────────────
// cbinfo is a JSVM_CallbackInfo__* populated by jsvm_dispatch_callback.
JSVM_Status OH_JSVM_GetCbInfo(JSVM_Env env, JSVM_CallbackInfo cbinfo,
                               size_t *argc, JSVM_Value *argv,
                               JSVM_Value *thisArg, void **data) {
    if (!cbinfo) {
        if (argc) *argc = 0;
        if (thisArg) *thisArg = allocValue(env ? env->globalRef : 0);
        if (data) *data = nullptr;
        return JSVM_OK;
    }
    int available = cbinfo->argCount;
    if (argc) {
        int requested = (int)*argc;
        if (argv && requested > 0) {
            int fill = requested < available ? requested : available;
            for (int i = 0; i < fill; i++)
                argv[i] = allocValue(cbinfo->argRefs[i]);
            if (fill < requested) {
                // Cache one undefined ref to avoid per-slot EM_JS calls.
                static int s_undefinedRef = 0;
                if (!s_undefinedRef) s_undefinedRef = jsvm_make_undefined();
                for (int i = fill; i < requested; i++)
                    argv[i] = allocValue(s_undefinedRef);
            }
        }
        *argc = (size_t)available;
    }
    if (thisArg) *thisArg = allocValue(cbinfo->thisRef);
    if (data)    *data    = cbinfo->cbData;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetNewTarget(JSVM_Env env, JSVM_CallbackInfo cbinfo, JSVM_Value *result) {
    if (result) *result = allocValue(cbinfo ? cbinfo->newTargetRef : jsvm_make_undefined());
    return JSVM_OK;
}

// ── Wrap / Unwrap ─────────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_Wrap(JSVM_Env env, JSVM_Value jsObject, void *nativeObject,
                          JSVM_Finalize finalizeCb, void *finalizeHint, JSVM_Ref *result) {
    if (jsObject) jsvm_wrap_native(jsObject->ref, nativeObject);
    if (result) {
        auto *r = new JSVM_Ref__();
        r->value = jsObject;
        *result = r;
    }
    return JSVM_OK;
}
JSVM_Status OH_JSVM_Unwrap(JSVM_Env env, JSVM_Value jsObject, void **result) {
    if (result) *result = jsObject ? jsvm_unwrap_native(jsObject->ref) : nullptr;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_RemoveWrap(JSVM_Env env, JSVM_Value jsObject, void **result) {
    if (result) *result = jsObject ? jsvm_unwrap_native(jsObject->ref) : nullptr;
    if (jsObject) jsvm_wrap_native(jsObject->ref, nullptr);
    return JSVM_OK;
}

// ── Type checks ───────────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_Typeof(JSVM_Env env, JSVM_Value value, JSVM_ValueType *result) {
    if (!result) return JSVM_INVALID_ARG;
    int t = value ? jsvm_typeof_ref(value->ref) : 0;
    static const JSVM_ValueType map[] = {
        JSVM_UNDEFINED, JSVM_NULL, JSVM_BOOLEAN, JSVM_NUMBER,
        JSVM_STRING, JSVM_SYMBOL, JSVM_OBJECT, JSVM_FUNCTION, JSVM_BIGINT
    };
    *result = (t >= 0 && t <= 8) ? map[t] : JSVM_UNDEFINED;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_IsArray(JSVM_Env env, JSVM_Value value, bool *result) {
    if (result) *result = value ? (jsvm_is_array(value->ref) != 0) : false;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_IsArraybuffer(JSVM_Env env, JSVM_Value value, bool *result) {
    if (result) *result = false;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_IsTypedarray(JSVM_Env env, JSVM_Value value, bool *result) {
    if (result) *result = false;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_IsError(JSVM_Env env, JSVM_Value value, bool *result) {
    if (result) *result = false;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_IsExceptionPending(JSVM_Env env, bool *result) {
    if (result) *result = env ? env->hasException : false;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetAndClearLastException(JSVM_Env env, JSVM_Value *result) {
    if (env) env->hasException = false;
    if (result) *result = allocValue(jsvm_make_undefined());
    return JSVM_OK;
}

// ── Numbers / strings ─────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_CreateDouble(JSVM_Env env, double value, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_number(value));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetValueDouble(JSVM_Env env, JSVM_Value value, double *result) {
    if (result) *result = value ? jsvm_get_number(value->ref) : 0.0;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetValueBool(JSVM_Env env, JSVM_Value value, bool *result) {
    if (result) *result = value ? (jsvm_get_bool(value->ref) != 0) : false;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateBigintInt64(JSVM_Env env, int64_t value, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_number((double)value));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetValueBigintInt64(JSVM_Env env, JSVM_Value value,
                                         int64_t *result, bool *lossless) {
    if (result) *result = value ? (int64_t)jsvm_get_number(value->ref) : 0;
    if (lossless) *lossless = true;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateStringUtf8(JSVM_Env env, const char *str,
                                      size_t length, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_string_utf8(str, (int)length));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateStringUtf16(JSVM_Env env, const char16_t *str,
                                       size_t length, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_undefined());
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetValueStringUtf8(JSVM_Env env, JSVM_Value value,
                                        char *buf, size_t bufsize, size_t *result) {
    int ref = value ? value->ref : 0;
    int len = jsvm_get_string_utf8_len(ref);
    if (result) *result = (size_t)len;
    if (buf && bufsize > 0) jsvm_get_string_utf8_buf(ref, buf, (int)bufsize);
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CoerceToString(JSVM_Env env, JSVM_Value value, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    int ref = value ? value->ref : 0;
    int len = jsvm_get_string_utf8_len(ref);
    char *buf = (char*)malloc(len + 1);
    jsvm_get_string_utf8_buf(ref, buf, len + 1);
    *result = allocValue(jsvm_make_string_utf8(buf, len));
    free(buf);
    return JSVM_OK;
}
JSVM_Status OH_JSVM_JsonParse(JSVM_Env env, JSVM_Value json, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_json_parse(json ? json->ref : 0));
    return JSVM_OK;
}

// ── Arrays / ArrayBuffers ─────────────────────────────────────────────────────
JSVM_Status OH_JSVM_CreateArray(JSVM_Env env, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_array(0));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateArrayWithLength(JSVM_Env env, size_t length, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_make_array((int)length));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetArrayLength(JSVM_Env env, JSVM_Value value, uint32_t *result) {
    if (result) *result = value ? (uint32_t)jsvm_array_length(value->ref) : 0;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetElement(JSVM_Env env, JSVM_Value object, uint32_t index, JSVM_Value *result) {
    if (!result) return JSVM_INVALID_ARG;
    *result = allocValue(jsvm_get_element(object ? object->ref : 0, (int)index));
    return JSVM_OK;
}
JSVM_Status OH_JSVM_SetElement(JSVM_Env env, JSVM_Value object, uint32_t index, JSVM_Value value) {
    jsvm_set_element(object ? object->ref : 0, (int)index, value ? value->ref : 0);
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateArraybuffer(JSVM_Env env, size_t byteLength,
                                       void **data, JSVM_Value *result) {
    if (data) *data = nullptr;
    if (result) *result = allocValue(jsvm_make_undefined());
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetArraybufferInfo(JSVM_Env env, JSVM_Value arraybuffer,
                                        void **data, size_t *byteLength) {
    if (data) *data = nullptr;
    if (byteLength) *byteLength = 0;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateTypedarray(JSVM_Env env, JSVM_TypedarrayType type,
                                      size_t length, JSVM_Value arraybuffer,
                                      size_t byteOffset, JSVM_Value *result) {
    if (result) *result = allocValue(jsvm_make_undefined());
    return JSVM_OK;
}
JSVM_Status OH_JSVM_GetTypedarrayInfo(JSVM_Env env, JSVM_Value typedarray,
                                       JSVM_TypedarrayType *type, size_t *length,
                                       void **data, JSVM_Value *arraybuffer, size_t *byteOffset) {
    if (type) *type = JSVM_UINT8_ARRAY;
    if (length) *length = 0;
    if (data) *data = nullptr;
    if (arraybuffer) *arraybuffer = allocValue(jsvm_make_undefined());
    if (byteOffset) *byteOffset = 0;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateArrayBufferFromBackingStoreData(JSVM_Env env, void *data,
    size_t backingStoreSize, size_t offset, size_t arrayBufferSize, JSVM_Value *result) {
    if (result) *result = allocValue(jsvm_make_undefined());
    return JSVM_OK;
}

// ── Errors / exceptions ───────────────────────────────────────────────────────
JSVM_Status OH_JSVM_Throw(JSVM_Env env, JSVM_Value error) {
    if (env) env->hasException = true; return JSVM_OK;
}
JSVM_Status OH_JSVM_ThrowError(JSVM_Env env, const char *code, const char *msg) {
    if (env) env->hasException = true; return JSVM_OK;
}
JSVM_Status OH_JSVM_ThrowTypeError(JSVM_Env env, const char *code, const char *msg) {
    if (env) env->hasException = true; return JSVM_OK;
}
JSVM_Status OH_JSVM_ThrowRangeError(JSVM_Env env, const char *code, const char *msg) {
    if (env) env->hasException = true; return JSVM_OK;
}
JSVM_Status OH_JSVM_ThrowSyntaxError(JSVM_Env env, const char *code, const char *msg) {
    if (env) env->hasException = true; return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateError(JSVM_Env env, JSVM_Value code, JSVM_Value msg, JSVM_Value *result) {
    if (result) *result = allocValue(jsvm_make_undefined()); return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateTypeError(JSVM_Env env, JSVM_Value code, JSVM_Value msg, JSVM_Value *result) {
    if (result) *result = allocValue(jsvm_make_undefined()); return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateRangeError(JSVM_Env env, JSVM_Value code, JSVM_Value msg, JSVM_Value *result) {
    if (result) *result = allocValue(jsvm_make_undefined()); return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateSyntaxError(JSVM_Env env, JSVM_Value code, JSVM_Value msg, JSVM_Value *result) {
    if (result) *result = allocValue(jsvm_make_undefined()); return JSVM_OK;
}
JSVM_Status OH_JSVM_GetLastErrorInfo(JSVM_Env env, const JSVM_ExtendedErrorInfo **result) {
    static JSVM_ExtendedErrorInfo info{};
    if (result) *result = &info; return JSVM_OK;
}

// ── Instance data ─────────────────────────────────────────────────────────────
static void *s_instanceData = nullptr;
JSVM_Status OH_JSVM_SetInstanceData(JSVM_Env env, void *data,
                                     JSVM_Finalize finalizeCb, void *finalizeHint) {
    s_instanceData = data; return JSVM_OK;
}
JSVM_Status OH_JSVM_GetInstanceData(JSVM_Env env, void **data) {
    if (data) *data = s_instanceData; return JSVM_OK;
}

// ── VM lifecycle helpers ──────────────────────────────────────────────────────
JSVM_Status OH_JSVM_MemoryPressureNotification(JSVM_Env env, JSVM_MemoryPressureLevel level) { return JSVM_OK; }
JSVM_Status OH_JSVM_PumpMessageLoop(JSVM_VM vm, bool *result) {
    if (result) *result = false; return JSVM_OK;
}
JSVM_Status OH_JSVM_PerformMicrotaskCheckpoint(JSVM_VM vm) { return JSVM_OK; }
JSVM_Status OH_JSVM_OpenInspector(JSVM_Env env, const char *host, uint16_t port) { return JSVM_OK; }
JSVM_Status OH_JSVM_CloseInspector(JSVM_Env env) { return JSVM_OK; }
JSVM_Status OH_JSVM_WaitForDebugger(JSVM_Env env, bool breakNextLine) { return JSVM_OK; }

// ── Misc ──────────────────────────────────────────────────────────────────────
JSVM_Status OH_JSVM_GetVM(JSVM_Env env, JSVM_VM *result) {
    if (result) *result = &s_vm; return JSVM_OK;
}
JSVM_Status OH_JSVM_CompileScript(JSVM_Env env, JSVM_Value script,
    const uint8_t *cachedData, size_t cacheLen, bool eagerCompile,
    bool *cacheRejected, JSVM_Script *result) {
    static JSVM_Script__ s; s.dummy = script ? script->ref : 0;
    if (cacheRejected) *cacheRejected = true;
    if (result) *result = &s;
    return JSVM_OK;
}
JSVM_Status OH_JSVM_CreateCodeCache(JSVM_Env env, JSVM_Script script,
                                     const uint8_t **data, size_t *length) {
    if (data) *data = nullptr; if (length) *length = 0; return JSVM_OK;
}

} // extern "C"
