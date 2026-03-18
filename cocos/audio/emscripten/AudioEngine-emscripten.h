/****************************************************************************
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
 Emscripten stub: no OpenAL/decoders; satisfies AudioEngineImpl interface.
****************************************************************************/

#pragma once

#include <cstdint>
#include <functional>
#include <mutex>
#include "audio/include/AudioDef.h"
#include "base/RefCounted.h"
#include "base/std/container/vector.h"
#include "base/std/container/unordered_map.h"
#include "base/std/container/string.h"

namespace cc {

#define MAX_AUDIOINSTANCES 32

class AudioCache;
class Scheduler;

class CC_DLL AudioEngineImpl : public RefCounted {
public:
    AudioEngineImpl();
    ~AudioEngineImpl() override;

    bool init();
    int play2d(const ccstd::string &filePath, bool loop, float volume);
    void setVolume(int audioID, float volume);
    void setLoop(int audioID, bool loop);
    bool pause(int audioID);
    bool resume(int audioID);
    void stop(int audioID);
    void stopAll();
    void onPause();
    void onResume();
    float getDuration(int audioID);
    float getDurationFromFile(const ccstd::string &filePath);
    float getCurrentTime(int audioID);
    bool setCurrentTime(int audioID, float time);
    void setFinishCallback(int audioID, const std::function<void(int, const ccstd::string &)> &callback);

    void uncache(const ccstd::string &filePath);
    void uncacheAll();
    AudioCache *preload(const ccstd::string &filePath, const std::function<void(bool)> &callback);
    void update(float dt);
    PCMHeader getPCMHeader(const char *url);
    ccstd::vector<uint8_t> getOriginalPCMBuffer(const char *url, uint32_t channelID);

private:
    std::mutex _threadMutex;
};

} // namespace cc
