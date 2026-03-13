/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#include "platform/emscripten/FileUtils-emscripten.h"
#include <sys/stat.h>
#include <unistd.h>
#include "base/Log.h"
#include "base/memory/Memory.h"

namespace cc {

FileUtils *createFileUtils() {
    return ccnew FileUtilsEmscripten();
}

FileUtilsEmscripten::FileUtilsEmscripten() = default;

FileUtilsEmscripten::~FileUtilsEmscripten() = default;

bool FileUtilsEmscripten::init() {
    _defaultResRootPath = "/";
    return FileUtils::init();
}

ccstd::string FileUtilsEmscripten::getWritablePath() const {
    // In Emscripten, we can use IndexedDB for persistent storage
    // For now, return a simple path
    return "/data/";
}

bool FileUtilsEmscripten::isFileExistInternal(const ccstd::string &filename) const {
    if (filename.empty()) {
        return false;
    }

    struct stat buf;
    if (stat(filename.c_str(), &buf) == 0) {
        return S_ISREG(buf.st_mode);
    }
    return false;
}

bool FileUtilsEmscripten::isDirectoryExistInternal(const ccstd::string &dirPath) const {
    if (dirPath.empty()) {
        return false;
    }

    struct stat buf;
    if (stat(dirPath.c_str(), &buf) == 0) {
        return S_ISDIR(buf.st_mode);
    }
    return false;
}

} // namespace cc
