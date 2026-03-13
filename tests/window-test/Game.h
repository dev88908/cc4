/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 Simple window test - no JS runtime required
****************************************************************************/

#pragma once

#include "application/CocosApplication.h"
#include "platform/BasePlatform.h"
#include "platform/interfaces/modules/ISystemWindow.h"
#include "platform/interfaces/modules/ISystemWindowManager.h"

namespace cc {

class Game : public CocosApplication {
public:
    Game() = default;
    ~Game() override = default;

    int32_t init() override;
    void onStart() override;

private:
    std::once_flag _windowCreateFlag;
};

} // namespace cc

