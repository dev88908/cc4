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
#include "platform/empty/modules/SystemWindowManager.h"
#include "platform/empty/modules/Vibrator.h"
#include "platform/interfaces/OSInterface.h"
#include "engine/EngineEvents.h"
#include "platform/interfaces/modules/ISystemWindow.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/html5.h>
#endif

namespace cc {

EmscriptenPlatform::EmscriptenPlatform() = default;

EmscriptenPlatform::~EmscriptenPlatform() = default;

int32_t EmscriptenPlatform::init() {
    // Register platform interfaces (aligned with WindowsPlatform structure)
    registerInterface(std::make_shared<Accelerometer>());
    registerInterface(std::make_shared<Battery>());
    registerInterface(std::make_shared<Network>());
    registerInterface(std::make_shared<Screen>());
    registerInterface(std::make_shared<System>());
    _windowManager = std::make_shared<SystemWindowManager>();
    registerInterface(_windowManager);
    registerInterface(std::make_shared<Vibrator>());
    return _windowManager->init();
}

int32_t EmscriptenPlatform::loop() {
#ifdef __EMSCRIPTEN__
    onResume();
    emscripten_set_main_loop([]() {
        static bool firstFrame = true;
        if (firstFrame) {
            firstFrame = false;
            cc::WindowEvent ev;
            ev.type = cc::WindowEvent::Type::SHOW;
            ev.windowId = cc::ISystemWindow::mainWindowId;
            cc::events::WindowEvent::broadcast(ev);
        }

        auto* platform = static_cast<cc::UniversalPlatform*>(cc::BasePlatform::getPlatform());
        auto* emPlatform = static_cast<cc::EmscriptenPlatform*>(platform);
        if (emPlatform && emPlatform->getWindowManager()) {
            emPlatform->getWindowManager()->processEvent();
        }
        if (platform) {
            static double lastTime = 0.0;
            double now = emscripten_get_now();
            int32_t fps = platform->getFps();
            double desiredInterval = 1000.0 / fps;
            if (now - lastTime >= desiredInterval - 1.0) {
                lastTime = now;
                platform->runTask();
            }
        }
    }, 0, 1);
#endif
    return 0;
}

ISystemWindow *EmscriptenPlatform::createNativeWindow(uint32_t windowId, void *externalHandle) {
    // For WebAssembly, create a SystemWindow backed by the browser canvas.
    return new SystemWindow(windowId, externalHandle);
}

} // namespace cc
