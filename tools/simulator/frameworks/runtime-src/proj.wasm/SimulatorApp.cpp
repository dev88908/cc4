/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

#include "SimulatorApp.h"
#include <emscripten.h>

SimulatorApp *SimulatorApp::_instance = nullptr;

SimulatorApp::SimulatorApp()
: _width(960), _height(640) {
}

SimulatorApp::~SimulatorApp() {
}

SimulatorApp *SimulatorApp::getInstance() {
    if (!_instance) {
        _instance = new SimulatorApp();
    }
    return _instance;
}

int SimulatorApp::init() {
    // In WebAssembly, initialization is minimal
    // The browser handles the window/canvas setup
    return 0;
}

int SimulatorApp::run() {
    // In WebAssembly, the main loop is handled by Emscripten
    // No need to implement a blocking run loop
    return 0;
}

int SimulatorApp::getWidth() const {
    return _width;
}

int SimulatorApp::getHeight() const {
    return _height;
}
