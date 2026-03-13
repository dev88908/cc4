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

#include "platform/emscripten/EmscriptenPlatform.h"
#include "platform/empty/modules/Accelerometer.h"
#include "platform/empty/modules/Battery.h"
#include "platform/empty/modules/Network.h"
#include "platform/empty/modules/Screen.h"
#include "platform/empty/modules/System.h"
#include "platform/empty/modules/SystemWindow.h"
#include "platform/empty/modules/Vibrator.h"
#include "platform/interfaces/OSInterface.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/html5.h>
#endif

namespace cc {

EmscriptenPlatform::EmscriptenPlatform() = default;

EmscriptenPlatform::~EmscriptenPlatform() = default;

int32_t EmscriptenPlatform::init() {
    // Register platform interfaces
    registerInterface(std::make_shared<Accelerometer>());
    registerInterface(std::make_shared<Battery>());
    registerInterface(std::make_shared<Network>());
    registerInterface(std::make_shared<Screen>());
    registerInterface(std::make_shared<System>());
    // SystemWindow requires windowId and externalHandle parameters
    // For Emscripten, we use 0 as windowId and nullptr as externalHandle
    registerInterface(std::make_shared<SystemWindow>(0, nullptr));
    registerInterface(std::make_shared<Vibrator>());
    return 0;
}

int32_t EmscriptenPlatform::loop() {
#ifdef __EMSCRIPTEN__
    // Emscripten uses its own event loop, so we don't need to implement one here
    // The browser's event loop will handle everything
    emscripten_set_main_loop([]() {
        // Main loop callback - game logic will be called from here
    }, 0, 1);
#endif
    return 0;
}

ISystemWindow *EmscriptenPlatform::createNativeWindow(uint32_t windowId, void *externalHandle) {
    // For WebAssembly, the window is the browser canvas
    // Return nullptr as window management is handled by the browser
    return nullptr;
}

} // namespace cc
