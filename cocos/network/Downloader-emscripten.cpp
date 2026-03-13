/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 Downloader stub for Emscripten/WebAssembly
 ****************************************************************************/

#include "network/Downloader-emscripten.h"

namespace cc {
namespace network {

DownloaderEmscripten::DownloaderEmscripten(const DownloaderHints &hints) {
    // Stub implementation
}

DownloaderEmscripten::~DownloaderEmscripten() {
    // Stub implementation
}

IDownloadTask *DownloaderEmscripten::createCoTask(std::shared_ptr<const DownloadTask> &task) {
    // Stub implementation - return nullptr
    return nullptr;
}

void DownloaderEmscripten::abort(const std::unique_ptr<IDownloadTask> &task) {
    // Stub implementation
}

} // namespace network
} // namespace cc
