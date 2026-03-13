/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 Downloader stub for Emscripten/WebAssembly
 ****************************************************************************/

#pragma once

#include "network/Downloader.h"
#include "network/DownloaderImpl.h"

namespace cc {
namespace network {

class DownloaderEmscripten : public IDownloaderImpl {
public:
    DownloaderEmscripten(const DownloaderHints &hints);
    ~DownloaderEmscripten() override;

    IDownloadTask *createCoTask(std::shared_ptr<const DownloadTask> &task) override;
    void abort(const std::unique_ptr<IDownloadTask> &task) override;
};

} // namespace network
} // namespace cc
