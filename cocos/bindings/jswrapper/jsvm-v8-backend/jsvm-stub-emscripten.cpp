/*
 * JSVM stub implementation for Emscripten/WebAssembly
 * 
 * This file provides stub implementations of OpenHarmony JSVM API functions
 * for the Emscripten platform. These are minimal implementations that return
 * success status but don't perform actual JavaScript VM operations.
 * 
 * For a full WebAssembly implementation, these would need to be replaced with
 * actual JavaScript interop using Emscripten's Embind or similar mechanisms.
 */

#include "jsvm.h"
#include "jsvm_types.h"

extern "C" {

JSVM_Status OH_JSVM_GetCbInfo(JSVM_Env env,
                              JSVM_CallbackInfo cbinfo,
                              size_t* argc,
                              JSVM_Value* argv,
                              JSVM_Value* thisArg,
                              void** data) {
    // Stub implementation - return success with null/zero values
    if (argc) *argc = 0;
    if (argv) *argv = nullptr;
    if (thisArg) *thisArg = nullptr;
    if (data) *data = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_Unwrap(JSVM_Env env,
                           JSVM_Value jsObject,
                           void** result) {
    // Stub implementation - return success with null result
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_DefineClass(JSVM_Env env,
                                const char* utf8name,
                                size_t length,
                                JSVM_Callback constructor,
                                size_t propertyCount,
                                const JSVM_PropertyDescriptor* properties,
                                JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateReference(JSVM_Env env,
                                    JSVM_Value value,
                                    uint32_t initialRefcount,
                                    JSVM_Ref* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_SetNamedProperty(JSVM_Env env,
                                     JSVM_Value object,
                                     const char* utf8name,
                                     JSVM_Value value) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetNamedProperty(JSVM_Env env,
                                     JSVM_Value object,
                                     const char* utf8name,
                                     JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetGlobal(JSVM_Env env,
                              JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CallFunction(JSVM_Env env,
                                 JSVM_Value recv,
                                 JSVM_Value func,
                                 size_t argc,
                                 const JSVM_Value* argv,
                                 JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetReferenceValue(JSVM_Env env,
                                      JSVM_Ref ref,
                                      JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_NewInstance(JSVM_Env env,
                                JSVM_Value constructor,
                                size_t argc,
                                const JSVM_Value* argv,
                                JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_DeleteReference(JSVM_Env env,
                                    JSVM_Ref ref) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_RemoveWrap(JSVM_Env env,
                               JSVM_Value jsObject,
                               void** result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_ReferenceRef(JSVM_Env env,
                                 JSVM_Ref ref,
                                 uint32_t* result) {
    // Stub implementation
    if (result) *result = 1;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_Wrap(JSVM_Env env,
                         JSVM_Value jsObject,
                         void* nativeObject,
                         JSVM_Finalize finalizeCb,
                         void* finalizeHint,
                         JSVM_Ref* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_ReferenceUnref(JSVM_Env env,
                                   JSVM_Ref ref,
                                   uint32_t* result) {
    // Stub implementation
    if (result) *result = 0;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_IsArray(JSVM_Env env,
                            JSVM_Value value,
                            bool* result) {
    // Stub implementation
    if (result) *result = false;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetArrayLength(JSVM_Env env,
                                   JSVM_Value value,
                                   uint32_t* result) {
    // Stub implementation
    if (result) *result = 0;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetElement(JSVM_Env env,
                               JSVM_Value object,
                               uint32_t index,
                               JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_SetElement(JSVM_Env env,
                               JSVM_Value object,
                               uint32_t index,
                               JSVM_Value value) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_IsTypedarray(JSVM_Env env,
                                 JSVM_Value value,
                                 bool* result) {
    // Stub implementation
    if (result) *result = false;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetTypedarrayInfo(JSVM_Env env,
                                      JSVM_Value typedarray,
                                      JSVM_TypedarrayType* type,
                                      size_t* length,
                                      void** data,
                                      JSVM_Value* arraybuffer,
                                      size_t* byteOffset) {
    // Stub implementation
    if (type) *type = JSVM_UINT8_ARRAY;
    if (length) *length = 0;
    if (data) *data = nullptr;
    if (arraybuffer) *arraybuffer = nullptr;
    if (byteOffset) *byteOffset = 0;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_IsArraybuffer(JSVM_Env env,
                                  JSVM_Value value,
                                  bool* result) {
    // Stub implementation
    if (result) *result = false;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetArraybufferInfo(JSVM_Env env,
                                       JSVM_Value arraybuffer,
                                       void** data,
                                       size_t* byteLength) {
    // Stub implementation
    if (data) *data = nullptr;
    if (byteLength) *byteLength = 0;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateArraybuffer(JSVM_Env env,
                                      size_t byteLength,
                                      void** data,
                                      JSVM_Value* result) {
    // Stub implementation
    if (data) *data = nullptr;
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateTypedarray(JSVM_Env env,
                                     JSVM_TypedarrayType type,
                                     size_t length,
                                     JSVM_Value arraybuffer,
                                     size_t byteOffset,
                                     JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateArrayBufferFromBackingStoreData(JSVM_Env env,
                                                          void* data,
                                                          size_t backingStoreSize,
                                                          size_t offset,
                                                          size_t arrayBufferSize,
                                                          JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_Typeof(JSVM_Env env,
                           JSVM_Value value,
                           JSVM_ValueType* result) {
    // Stub implementation
    if (result) *result = JSVM_UNDEFINED;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateFunction(JSVM_Env env,
                                   const char* utf8name,
                                   size_t length,
                                   JSVM_Callback cb,
                                   JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_DefineProperties(JSVM_Env env,
                                     JSVM_Value object,
                                     size_t propertyCount,
                                     const JSVM_PropertyDescriptor* properties) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateObject(JSVM_Env env,
                                 JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateArrayWithLength(JSVM_Env env,
                                          size_t length,
                                          JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetPropertyNames(JSVM_Env env,
                                     JSVM_Value object,
                                     JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetValueStringUtf8(JSVM_Env env,
                                       JSVM_Value value,
                                       char* buf,
                                       size_t bufsize,
                                       size_t* result) {
    // Stub implementation
    if (result) *result = 0;
    if (buf && bufsize > 0) buf[0] = '\0';
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetUndefined(JSVM_Env env,
                                 JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CoerceToString(JSVM_Env env,
                                   JSVM_Value value,
                                   JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateStringUtf8(JSVM_Env env,
                                     const char* str,
                                     size_t length,
                                     JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_JsonParse(JSVM_Env env,
                              JSVM_Value json,
                              JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateStringUtf16(JSVM_Env env,
                                      const char16_t* str,
                                      size_t length,
                                      JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_OpenHandleScope(JSVM_Env env,
                                    JSVM_HandleScope* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CloseHandleScope(JSVM_Env env,
                                     JSVM_HandleScope scope) {
    // Stub implementation
    return JSVM_OK;
}

// Additional JSVM functions needed by ScriptEngine and Utils

JSVM_Status OH_JSVM_MemoryPressureNotification(JSVM_Env env,
                                                JSVM_MemoryPressureLevel level) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_Init(const JSVM_InitOptions* options) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CompileScriptWithOrigin(JSVM_Env env,
                                            JSVM_Value script,
                                            const uint8_t* cachedData,
                                            size_t cacheDataLength,
                                            bool eagerCompile,
                                            bool* cacheRejected,
                                            JSVM_ScriptOrigin* origin,
                                            JSVM_Script* result) {
    // Stub implementation
    if (cacheRejected) *cacheRejected = false;
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_RunScript(JSVM_Env env,
                              JSVM_Script script,
                              JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateVM(const JSVM_CreateVMOptions* options,
                             JSVM_VM* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_OpenVMScope(JSVM_VM vm,
                                JSVM_VMScope* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateEnv(JSVM_VM vm,
                              size_t propertyCount,
                              const JSVM_PropertyDescriptor* properties,
                              JSVM_Env* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_OpenEnvScope(JSVM_Env env,
                                 JSVM_EnvScope* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetVersion(JSVM_Env env,
                               uint32_t* result) {
    // Stub implementation
    if (result) *result = 8; // Return version 8
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CloseInspector(JSVM_Env env) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CloseEnvScope(JSVM_Env env,
                                  JSVM_EnvScope scope) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_DestroyEnv(JSVM_Env env) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CloseVMScope(JSVM_VM vm,
                                 JSVM_VMScope scope) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_DestroyVM(JSVM_VM vm) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_OpenInspector(JSVM_Env env,
                                  const char* host,
                                  uint16_t port) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_WaitForDebugger(JSVM_Env env,
                                    bool breakNextLine) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_PumpMessageLoop(JSVM_VM vm,
                                    bool* result) {
    // Stub implementation
    if (result) *result = false;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_PerformMicrotaskCheckpoint(JSVM_VM vm) {
    // Stub implementation
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetValueDouble(JSVM_Env env,
                                   JSVM_Value value,
                                   double* result) {
    // Stub implementation
    if (result) *result = 0.0;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetValueBigintInt64(JSVM_Env env,
                                        JSVM_Value value,
                                        int64_t* result,
                                        bool* lossless) {
    // Stub implementation
    if (result) *result = 0;
    if (lossless) *lossless = true;
    return JSVM_OK;
}


JSVM_Status OH_JSVM_GetValueBool(JSVM_Env env,
                                 JSVM_Value value,
                                 bool* result) {
    // Stub implementation
    if (result) *result = false;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateDouble(JSVM_Env env,
                                 double value,
                                 JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetBoolean(JSVM_Env env,
                               bool value,
                               JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetNull(JSVM_Env env,
                            JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_CreateBigintInt64(JSVM_Env env,
                                      int64_t value,
                                      JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_IsExceptionPending(JSVM_Env env,
                                       bool* result) {
    // Stub implementation
    if (result) *result = false;
    return JSVM_OK;
}

JSVM_Status OH_JSVM_GetAndClearLastException(JSVM_Env env,
                                             JSVM_Value* result) {
    // Stub implementation
    if (result) *result = nullptr;
    return JSVM_OK;
}

} // extern "C"
