/****************************************************************************
 Copyright (c) 2014-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 Stub OpenAL type definitions for Emscripten/WASM build.
 The oalsoft backend uses these types; on Web we don't have OpenAL, so provide minimal typedefs.
****************************************************************************/

#pragma once

#include <cstdint>

typedef std::uint32_t ALuint;
typedef std::int32_t  ALint;
typedef std::int32_t  ALsizei;
typedef std::uint32_t ALenum;
typedef void          ALvoid;
