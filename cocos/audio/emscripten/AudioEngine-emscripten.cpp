/****************************************************************************
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
 Emscripten stub implementation.
****************************************************************************/

#include "audio/emscripten/AudioEngine-emscripten.h"
#include "audio/include/AudioDef.h"

namespace cc {

AudioEngineImpl::AudioEngineImpl() = default;
AudioEngineImpl::~AudioEngineImpl() = default;

bool AudioEngineImpl::init() { return true; }

int AudioEngineImpl::play2d(const ccstd::string &filePath, bool loop, float volume) {
    (void)filePath;
    (void)loop;
    (void)volume;
    return -1;
}

void AudioEngineImpl::setVolume(int audioID, float volume) { (void)audioID; (void)volume; }
void AudioEngineImpl::setLoop(int audioID, bool loop) { (void)audioID; (void)loop; }
bool AudioEngineImpl::pause(int audioID) { (void)audioID; return false; }
bool AudioEngineImpl::resume(int audioID) { (void)audioID; return false; }
void AudioEngineImpl::stop(int audioID) { (void)audioID; }
void AudioEngineImpl::stopAll() {}
void AudioEngineImpl::onPause() {}
void AudioEngineImpl::onResume() {}

float AudioEngineImpl::getDuration(int audioID) { (void)audioID; return -1.0F; }
float AudioEngineImpl::getDurationFromFile(const ccstd::string &filePath) { (void)filePath; return -1.0F; }
float AudioEngineImpl::getCurrentTime(int audioID) { (void)audioID; return 0.0F; }
bool AudioEngineImpl::setCurrentTime(int audioID, float time) { (void)audioID; (void)time; return false; }
void AudioEngineImpl::setFinishCallback(int audioID, const std::function<void(int, const ccstd::string &)> &callback) {
    (void)audioID;
    (void)callback;
}

void AudioEngineImpl::uncache(const ccstd::string &filePath) { (void)filePath; }
void AudioEngineImpl::uncacheAll() {}

AudioCache *AudioEngineImpl::preload(const ccstd::string &filePath, const std::function<void(bool)> &callback) {
    (void)filePath;
    if (callback) callback(false);
    return nullptr;
}

void AudioEngineImpl::update(float dt) { (void)dt; }

PCMHeader AudioEngineImpl::getPCMHeader(const char *url) {
    (void)url;
    return PCMHeader{};
}

ccstd::vector<uint8_t> AudioEngineImpl::getOriginalPCMBuffer(const char *url, uint32_t channelID) {
    (void)url;
    (void)channelID;
    return ccstd::vector<uint8_t>{};
}

} // namespace cc
