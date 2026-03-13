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

#include "network/HttpClient.h"
#include "base/Log.h"

namespace cc {
namespace network {

// Minimal stub implementation for Emscripten
// Full implementation would use Emscripten's fetch API

static HttpClient* s_httpClient = nullptr;

HttpClient::HttpClient() {
    CC_LOG_DEBUG("HttpClient::HttpClient() - stub for Emscripten");
}

HttpClient::~HttpClient() {
    CC_LOG_DEBUG("HttpClient::~HttpClient() - stub for Emscripten");
}

HttpClient* HttpClient::getInstance() {
    if (s_httpClient == nullptr) {
        s_httpClient = new HttpClient();
    }
    return s_httpClient;
}

void HttpClient::destroyInstance() {
    CC_LOG_DEBUG("HttpClient::destroyInstance() - stub for Emscripten");
    if (s_httpClient) {
        delete s_httpClient;
        s_httpClient = nullptr;
    }
}

void HttpClient::sendImmediate(HttpRequest* request) {
    CC_LOG_DEBUG("HttpClient::sendImmediate() - stub for Emscripten");
    // Stub implementation - would need to use Emscripten's fetch API
}

} // namespace network
} // namespace cc
