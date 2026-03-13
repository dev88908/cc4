/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 Simple window test - no JS runtime required
****************************************************************************/

#include "Game.h"
#include "base/Log.h"
#include "platform/BasePlatform.h"
#include "platform/interfaces/modules/ISystemWindowManager.h"
#include "renderer/pipeline/GlobalDescriptorSetManager.h"

extern "C" void cc_load_all_plugins() {
    // No plugins for this simple test
}

namespace cc {

int32_t Game::init() {
    CC_LOG_INFO("Game::init() - Creating window...");

    // Initialize global descriptor set layout
    cc::pipeline::GlobalDSManager::setDescriptorSetLayout();

    // Create window
    std::call_once(_windowCreateFlag, [&]() {
        ISystemWindowInfo info;
        info.title = "Cocos Engine - Window Test";
        info.x = 100;
        info.y = 100;
        info.width = 1280;
        info.height = 720;
        info.flags = ISystemWindow::CC_WINDOW_SHOWN |
                     ISystemWindow::CC_WINDOW_RESIZABLE |
                     ISystemWindow::CC_WINDOW_INPUT_FOCUS;

        ISystemWindowManager* windowMgr = CC_GET_PLATFORM_INTERFACE(ISystemWindowManager);
        if (windowMgr) {
            windowMgr->createWindow(info);
            CC_LOG_INFO("Window created successfully!");
        } else {
            CC_LOG_ERROR("Failed to get ISystemWindowManager!");
        }
    });

    int ret = CocosApplication::init();
    if (ret != 0) {
        CC_LOG_ERROR("CocosApplication::init() failed with code: %d", ret);
        return ret;
    }

    CC_LOG_INFO("Game initialized successfully!");
    return 0;
}

void Game::onStart() {
    CC_LOG_INFO("Game::onStart() - Engine started!");
}

} // namespace cc

