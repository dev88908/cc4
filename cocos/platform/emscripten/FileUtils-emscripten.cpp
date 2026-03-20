#include "platform/emscripten/FileUtils-emscripten.h"
#include <sys/stat.h>
#include <unistd.h>
#include <emscripten.h>
#include "base/Log.h"
#include "base/memory/Memory.h"

namespace cc {

FileUtils *createFileUtils() {
    return ccnew FileUtilsEmscripten();
}

FileUtilsEmscripten::FileUtilsEmscripten() {
    _defaultResRootPath = "/";
    mkdir("/data", 0755);
    init();
}

FileUtilsEmscripten::~FileUtilsEmscripten() = default;

bool FileUtilsEmscripten::init() {
    _defaultResRootPath = "/";
    mkdir("/data", 0755);
    return FileUtils::init();
}

ccstd::string FileUtilsEmscripten::getWritablePath() const {
    return "/data";
}

EM_JS(bool, emscripten_fs_exists, (const char* path), {
    try {
        Module.FS.lookupPath(UTF8ToString(path), { follow: true });
        return true;
    } catch(e) { return false; }
});

EM_JS(bool, emscripten_fs_isFile, (const char* path), {
    try {
        var lookup = Module.FS.lookupPath(UTF8ToString(path), { follow: true });
        return lookup && lookup.node && Module.FS.isFile(lookup.node.mode);
    } catch(e) { return false; }
});

EM_JS(bool, emscripten_fs_isDir, (const char* path), {
    try {
        var lookup = Module.FS.lookupPath(UTF8ToString(path), { follow: true });
        return lookup && lookup.node && Module.FS.isDir(lookup.node.mode);
    } catch(e) { return false; }
});

EM_JS(int, emscripten_fs_readFile, (const char* path, char* buf, int bufSize), {
    try {
        var data = Module.FS.readFile(UTF8ToString(path), { encoding: 'binary' });
        if (!data) return -1;
        var arr = data instanceof Uint8Array ? data : new Uint8Array(data);
        var len = Math.min(arr.length, bufSize);
        HEAPU8.set(arr.subarray(0, len), buf);
        return len;
    } catch(e) { 
        return -1; 
    }
});

EM_JS(int, emscripten_fs_getFileSize, (const char* path), {
    try {
        var data = Module.FS.readFile(UTF8ToString(path));
        return data ? data.length : 0;
    } catch(e) { return 0; }
});

bool FileUtilsEmscripten::isFileExistInternal(const ccstd::string &filename) const {
    if (filename.empty()) {
        return false;
    }
    if (emscripten_fs_isFile(filename.c_str())) return true;
    ccstd::string pathWithSlash = "/" + filename;
    if (emscripten_fs_isFile(pathWithSlash.c_str())) return true;
    ccstd::string pathInData = "/data/" + filename;
    return emscripten_fs_isFile(pathInData.c_str());
}

bool FileUtilsEmscripten::isDirectoryExistInternal(const ccstd::string &dirPath) const {
    if (dirPath.empty()) {
        return false;
    }
    return emscripten_fs_isDir(dirPath.c_str());
}

ccstd::string FileUtilsEmscripten::getStringFromFile(const ccstd::string &filename) {
    if (filename.empty()) {
        return "";
    }

    auto tryRead = [](const ccstd::string &path) -> ccstd::string {
        int fileSize = emscripten_fs_getFileSize(path.c_str());
        if (fileSize <= 0) return "";
        std::vector<char> buffer(fileSize + 1);
        int readSize = emscripten_fs_readFile(path.c_str(), buffer.data(), fileSize + 1);
        if (readSize < 0) return "";
        return std::string(buffer.data(), readSize);
    };

    ccstd::string result = tryRead(filename);
    if (!result.empty()) return result;

    ccstd::string pathWithSlash = "/" + filename;
    result = tryRead(pathWithSlash);
    if (!result.empty()) return result;

    ccstd::string pathInData = "/data/" + filename;
    return tryRead(pathInData);
}

Data FileUtilsEmscripten::getDataFromFile(const ccstd::string &filename) {
    if (filename.empty()) {
        return Data();
    }

    auto tryRead = [](const ccstd::string &path) -> Data {
        int fileSize = emscripten_fs_getFileSize(path.c_str());
        if (fileSize <= 0) return Data();
        std::vector<uint8_t> buffer(fileSize);
        int readSize = emscripten_fs_readFile(path.c_str(), reinterpret_cast<char *>(buffer.data()), fileSize);
        if (readSize < 0) return Data();
        Data ret;
        ret.copy(buffer.data(), readSize);
        return ret;
    };

    Data result = tryRead(filename);
    if (!result.isNull()) return result;

    ccstd::string pathWithSlash = "/" + filename;
    result = tryRead(pathWithSlash);
    if (!result.isNull()) return result;

    ccstd::string pathInData = "/data/" + filename;
    return tryRead(pathInData);
}

}  // namespace cc
