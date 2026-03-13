cmake_minimum_required(VERSION 3.8)

set(APP_NAME SimulatorApp)
project(${APP_NAME} CXX)

enable_language(C ASM)
set(CMAKE_CXX_STANDARD 17)

# Force Emscripten platform settings
set(EMSCRIPTEN TRUE)
set(CC_WGPU_WASM TRUE)
set(CC_PLATFORM_EMSCRIPTEN 9)
set(CC_PLATFORM ${CC_PLATFORM_EMSCRIPTEN})
add_definitions(-DCC_WGPU_WASM=1)
add_definitions(-DCC_PLATFORM_EMSCRIPTEN=${CC_PLATFORM_EMSCRIPTEN})
add_definitions(-DCC_PLATFORM=${CC_PLATFORM})

# WebAssembly specific options - disable problematic features
option(USE_SE_V8        "USE V8 JavaScript Engine"          OFF)  # V8 not available in WASM
option(USE_V8_DEBUGGER  "Enable Chrome Remote inspector"    OFF)  # V8 debugger not available in WASM
option(USE_SE_JSC       "USE JavaScriptCore on MacOSX/iOS"  OFF)  # JSC not available in WASM
option(USE_SE_SM        "USE SpiderMonkey JavaScript Engine" OFF)  # SpiderMonkey not available in WASM
option(USE_SE_NAPI      "USE NAPI JavaScript Engine"        OFF)  # NAPI not available in WASM
option(USE_SE_JSVM      "USE JSVM JavaScript Engine"        OFF)  # JSVM not available in WASM
option(USE_PHYSICS_PHYSX "USE PhysX Physics"                OFF)  # PhysX may have issues in WASM
option(USE_BOX2D_JSB     "USE Box2D JSB"                    OFF)  # Disable JSB for now
option(USE_SOCKET       "Enable WebSocket & SocketIO"       ON)
option(USE_AUDIO        "Enable Audio"                      OFF)  # Disable audio temporarily to fix OpenAL issues
option(USE_EDIT_BOX     "Enable EditBox"                    OFF)  # EditBox may not work in browser
option(USE_VIDEO        "Enable VideoPlayer Component"      OFF)  # Video player may have issues
option(USE_WEBVIEW      "Enable WebView Component"          OFF)  # WebView not needed in browser
option(USE_MIDDLEWARE   "Enable Middleware"                 OFF)  # Disable middleware to avoid JS dependencies
option(USE_DRAGONBONES  "Enable Dragonbones"                OFF)  # Disable dragonbones to avoid JS dependencies
option(USE_SPINE_3_8   "Enable Spine 3.8"                   OFF)  # Disable spine to avoid JS dependencies
option(USE_SPINE_4_2   "Enable Spine 4.2"                   OFF)

if(USE_SE_JSC AND APPLE)
    set(USE_SE_V8 OFF)
    set(USE_V8_DEBUGGER OFF)
endif()

set(cocosdir ${CMAKE_CURRENT_LIST_DIR}/../../../../../)
if(NOT EXISTS ${cocosdir}/CMakeLists.txt)
    message(FATAL_ERROR "COCOS_ROOT CMakeLists.txt not found at: ${cocosdir}/CMakeLists.txt")
endif()

# TODO(v3.6.1): enable all modules and scripts for simulator
set(USE_DEBUG_RENDERER OFF)

include(${cocosdir}/CMakeLists.txt)
include(${cocosdir}/tools/simulator/libsimulator/CMakeLists-wasm.txt)

set(LIB_NAME ${APP_NAME})

set(GAME_RES_ROOT ${CMAKE_CURRENT_LIST_DIR}/../../../)
set(GAME_RES_FILES
    ${GAME_RES_ROOT}/main.js
    ${GAME_RES_ROOT}/project.json
)
set(GAME_RES_FOLDERS
    ${GAME_RES_ROOT}/jsb-adapter
    ${GAME_RES_ROOT}/subpackages
    ${GAME_RES_ROOT}/res
    ${GAME_RES_ROOT}/src
)
set(GAME_RES_ALL
    ${GAME_RES_FILES}
    ${GAME_RES_FOLDERS}
)

set(PROJ_SOURCES
    ../Classes/Game.cpp
    ../Classes/Game.h
    ../Classes/ide-support/CodeIDESupport.h
    ../Classes/ide-support/RuntimeJsImpl.cpp
    ../Classes/ide-support/RuntimeJsImpl.h
    ../proj.wasm/main.cpp
)

# Create executable
add_executable(${LIB_NAME} ${PROJ_SOURCES})

target_link_libraries(${LIB_NAME} ${ENGINE_NAME} simulator)
target_include_directories(${LIB_NAME} PRIVATE
    ../Classes
    ${CMAKE_CURRENT_LIST_DIR}/../proj.wasm
)
target_compile_definitions(${LIB_NAME} PRIVATE
    GAME_NAME="${APP_NAME}"
)

source_group(TREE ${CMAKE_CURRENT_LIST_DIR}/.. PREFIX "Source Files" FILES ${PROJ_SOURCES})

# WebAssembly specific settings
# Emscripten compiler and linker flags
set(EMSCRIPTEN_FLAGS
    -s USE_SDL=2
    -s USE_WEBGL2=1
    -s FULL_ES3=1
    -s WASM=1
    -s ALLOW_MEMORY_GROWTH=1
    -s INITIAL_MEMORY=134217728  # 128MB
    -s MAXIMUM_MEMORY=268435456  # 256MB
    -s STACK_SIZE=5242880        # 5MB
    -s ASYNCIFY=1
    -s EXIT_RUNTIME=0
    -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']
    -s EXPORTED_FUNCTIONS=['_main']
    --preload-file ${CMAKE_CURRENT_LIST_DIR}/../../@/
    --shell-file ${CMAKE_CURRENT_LIST_DIR}/../proj.wasm/index.html
)

# Debug vs Release flags
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    list(APPEND EMSCRIPTEN_FLAGS
        -O1
        -g3
        -s ASSERTIONS=1
        -s GL_ASSERTIONS=1
        -s SAFE_HEAP=1
    )
else()
    list(APPEND EMSCRIPTEN_FLAGS
        -O3
        -s ASSERTIONS=0
        --closure 1
    )
endif()

# Apply flags to target
target_compile_options(${LIB_NAME} PRIVATE ${EMSCRIPTEN_FLAGS})
target_link_options(${LIB_NAME} PRIVATE ${EMSCRIPTEN_FLAGS})

# Set output file extension
set_target_properties(${LIB_NAME} PROPERTIES SUFFIX ".html")