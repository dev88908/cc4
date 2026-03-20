/****************************************************************************
 Copyright (c) 2012 - Zynga Inc.
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 Emscripten stub: no sqlite3; in-memory map for localStorage API.
****************************************************************************/

#include "storage/local-storage/LocalStorage.h"
#include "base/Macros.h"
#include <map>
#include <string>

static int _initialized = 0;
static std::map<ccstd::string, ccstd::string> _storage;

void localStorageInit(const ccstd::string &fullpath) {
    (void)fullpath;
    if (!_initialized) {
        _storage.clear();
        _initialized = 1;
    }
}

void localStorageFree() {
    if (_initialized) {
        _storage.clear();
        _initialized = 0;
    }
}

void localStorageSetItem(const ccstd::string &key, const ccstd::string &value) {
    CC_ASSERT(_initialized);
    _storage[key] = value;
}

bool localStorageGetItem(const ccstd::string &key, ccstd::string *outItem) {
    CC_ASSERT(_initialized);
    auto it = _storage.find(key);
    if (it == _storage.end()) return false;
    *outItem = it->second;
    return true;
}

void localStorageRemoveItem(const ccstd::string &key) {
    CC_ASSERT(_initialized);
    _storage.erase(key);
}

void localStorageClear() {
    CC_ASSERT(_initialized);
    _storage.clear();
}

void localStorageGetKey(const int nIndex, ccstd::string *outKey) {
    CC_ASSERT(_initialized);
    if (nIndex < 0) return;
    size_t idx = static_cast<size_t>(nIndex);
    if (idx >= _storage.size()) return;
    auto it = _storage.begin();
    for (size_t i = 0; i < idx; ++i) ++it;
    *outKey = it->first;
}

void localStorageGetLength(int &outLength) {
    CC_ASSERT(_initialized);
    outLength = static_cast<int>(_storage.size());
}
