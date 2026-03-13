/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 Simple window test - no JS runtime required
****************************************************************************/

#include "Game.h"
#include "application/ApplicationManager.h"
#include "platform/BasePlatform.h"

#if CC_PLATFORM == CC_PLATFORM_WINDOWS
#include <Windows.h>
#include <shellapi.h>

int APIENTRY wWinMain(HINSTANCE hInstance,
                      HINSTANCE hPrevInstance,
                      LPWSTR    lpCmdLine,
                      int       nCmdShow) {
    UNREFERENCED_PARAMETER(hPrevInstance);
    UNREFERENCED_PARAMETER(lpCmdLine);
    UNREFERENCED_PARAMETER(nCmdShow);

    // Get platform and initialize
    cc::BasePlatform* platform = cc::BasePlatform::getPlatform();
    if (!platform) {
        MessageBox(nullptr, L"Failed to create platform!", L"Error", MB_OK | MB_ICONERROR);
        return -1;
    }

    if (platform->init()) {
        MessageBox(nullptr, L"Platform initialization failed!", L"Error", MB_OK | MB_ICONERROR);
        return -1;
    }

    return platform->run(0, nullptr);
}

#else

int main(int argc, char** argv) {
    cc::BasePlatform* platform = cc::BasePlatform::getPlatform();
    if (!platform) {
        return -1;
    }

    if (platform->init()) {
        return -1;
    }

    return platform->run(argc, const_cast<const char**>(argv));
}

#endif

