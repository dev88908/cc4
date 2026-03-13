/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Stub implementation for WebAssembly builds without JavaScript bindings
 ****************************************************************************/

#pragma once

#include <functional>
#include <string>

// Minimal stub definitions for when JavaScript bindings are disabled
namespace se {

// Forward declarations
class Object;
class Value;
class State;
class HandleObject;
class Class;
class ScriptEngine;

// Stub Object class
class Object {
public:
    Object() = default;
    virtual ~Object() = default;
    
    bool isValid() const { return false; }
    void root() {}
    void unroot() {}
    void *getPrivateData() const { return nullptr; }
    void setPrivateData(void *) {}
};

// Stub Value class
class Value {
public:
    Value() = default;
    ~Value() = default;
    
    bool isUndefined() const { return true; }
    bool isNull() const { return false; }
    bool isBoolean() const { return false; }
    bool isNumber() const { return false; }
    bool isString() const { return false; }
    bool isObject() const { return false; }
};

// Stub State class
class State {
public:
    State() = default;
    ~State() = default;
    
    Object *thisObject() { return nullptr; }
    const Value &args(size_t) const { static Value v; return v; }
    size_t argc() const { return 0; }
    Value &rval() { static Value v; return v; }
};

// Stub HandleObject class
class HandleObject {
public:
    HandleObject() = default;
    ~HandleObject() = default;
    
    Object *operator->() { return nullptr; }
    const Object *operator->() const { return nullptr; }
};

// Stub Class class
class Class {
public:
    Class() = default;
    ~Class() = default;
    
    static Class *create(const std::string &, Object *, Object *, std::function<void(Object *)>) {
        return nullptr;
    }
    
    bool defineFunction(const char *, std::function<bool(State &)>) { return false; }
    bool defineProperty(const char *, std::function<bool(State &)>, std::function<bool(State &)>) { return false; }
    bool install() { return false; }
};

// Stub ScriptEngine class
class ScriptEngine {
public:
    static ScriptEngine *getInstance() { return nullptr; }
    
    void setExceptionCallback(std::function<void(const char *, const char *, const char *)>) {}
    bool start() { return true; }
    void cleanup() {}
    bool isValid() const { return false; }
    
    Object *getGlobalObject() { return nullptr; }
    bool evalString(const char *, ssize_t = -1, Value * = nullptr, const char * = nullptr) { return false; }
    void garbageCollect() {}
    bool isGarbageCollecting() const { return false; }
    void enableDebugger(const char * = nullptr, uint32_t = 0, bool = false) {}
};

// Stub functions
inline bool init() { return true; }
inline void cleanup() {}
inline bool start() { return true; }

} // namespace se
