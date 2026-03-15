#!/bin/bash

# macOS build script for Cocos Simulator
#
# Usage:
#   ./build-mac.sh          - Full build (clean + compile)
#   ./build-mac.sh --debug  - Build with debug configuration

set -e

# Parse arguments
BUILD_TYPE="Release"
for arg in "$@"; do
    case $arg in
        --debug)
            BUILD_TYPE="Debug"
            shift
            ;;
        *)
            ;;
    esac
done

# Get the native directory (4 levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NATIVE_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Check if external dependencies exist
if [ ! -f "$NATIVE_DIR/external/CMakeLists.txt" ]; then
    echo "External dependencies not found!"

    # Check if node_modules exists
    if [ ! -d "$NATIVE_DIR/node_modules" ]; then
        echo "Installing npm dependencies..."
        (cd "$NATIVE_DIR" && npm install)
        if [ $? -ne 0 ]; then
            echo "Error: Failed to install npm dependencies."
            exit 1
        fi
    fi

    echo "Downloading external dependencies..."
    if [ -f "$NATIVE_DIR/utils/download-deps.js" ]; then
        (cd "$NATIVE_DIR" && node ./utils/download-deps.js)
        if [ $? -ne 0 ]; then
            echo "Error: Failed to download external dependencies."
            echo "Please run 'cd $NATIVE_DIR && npm install && npx gulp init' manually."
            exit 1
        fi
    else
        echo "Error: download-deps.js not found."
        echo "Please run 'cd $NATIVE_DIR && npm install && npx gulp init' manually."
        exit 1
    fi
fi

# Create build directory in the runtime-src folder
RUNTIME_SRC_DIR="$SCRIPT_DIR"
BUILD_DIR="$RUNTIME_SRC_DIR/build-mac"

if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning existing build directory..."
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Copy the macOS specific CMakeLists.txt
cp "$RUNTIME_SRC_DIR/CMakeLists.txt" ./CMakeLists.txt.base

# Create macOS specific CMakeLists.txt
cat > ./CMakeLists.txt << 'CMAKE_EOF'
cmake_minimum_required(VERSION 3.8)

set(APP_NAME SimulatorApp)
project(${APP_NAME} CXX)

enable_language(C ASM)
set(CMAKE_CXX_STANDARD 17)

# Force macOS platform settings
set(CC_PLATFORM_MACOS 4)
set(CC_PLATFORM ${CC_PLATFORM_MACOS})
add_definitions(-DCC_PLATFORM_MACOS=${CC_PLATFORM_MACOS})
add_definitions(-DCC_PLATFORM=${CC_PLATFORM})

# macOS specific options
option(USE_SE_V8        "USE V8 JavaScript Engine"          ON)
option(USE_V8_DEBUGGER  "Enable Chrome Remote inspector"    ON)
option(USE_SE_JSC       "USE JavaScriptCore on MacOSX/iOS"  OFF)
option(USE_SE_SM        "USE SpiderMonkey JavaScript Engine" OFF)
option(USE_SE_NAPI      "USE NAPI JavaScript Engine"        OFF)
option(USE_SE_JSVM      "USE JSVM JavaScript Engine"        OFF)
option(USE_PHYSICS_PHYSX "USE PhysX Physics"                OFF)
option(USE_BOX2D_JSB     "USE Box2D JSB"                    OFF)
option(USE_SOCKET       "Enable WebSocket & SocketIO"       ON)
option(USE_AUDIO        "Enable Audio"                      ON)
option(USE_EDIT_BOX     "Enable EditBox"                    ON)
option(USE_VIDEO        "Enable VideoPlayer Component"      ON)
option(USE_WEBVIEW      "Enable WebView Component"          ON)
option(USE_MIDDLEWARE   "Enable Middleware"                 ON)
option(USE_DRAGONBONES  "Enable Dragonbones"                ON)
option(USE_SPINE_3_8   "Enable Spine 3.8"                   ON)
option(USE_SPINE_4_2   "Enable Spine 4.2"                   OFF)
option(USE_WEBP         "Enable WebP image format"          ON)

# Determine the cocos root directory
set(cocosdir ${CMAKE_CURRENT_LIST_DIR}/../../../../..)
get_filename_component(cocosdir ${cocosdir} ABSOLUTE)

if(NOT EXISTS ${cocosdir}/CMakeLists.txt)
    message(FATAL_ERROR "COCOS_ROOT CMakeLists.txt not found at: ${cocosdir}/CMakeLists.txt")
endif()

message(STATUS "Cocos root directory: ${cocosdir}")

# Set simulator options
set(USE_DEBUG_RENDERER OFF)

include(${cocosdir}/CMakeLists.txt)
include(${cocosdir}/tools/simulator/libsimulator/CMakeLists.txt)

set(LIB_NAME ${APP_NAME})

# macOS specific source files
set(PROJ_SOURCES
    ../Classes/Game.cpp
    ../Classes/Game.h
    ../Classes/ide-support/CodeIDESupport.h
    ../Classes/ide-support/RuntimeJsImpl.cpp
    ../Classes/ide-support/RuntimeJsImpl.h
    ../proj.ios_mac/mac/main.mm
    ../proj.ios_mac/mac/AppDelegate.mm
    ../proj.ios_mac/mac/SimulatorApp.mm
    ../proj.ios_mac/mac/ConsoleWindowController.m
    ../proj.ios_mac/mac/ViewController.mm
)

# Create executable
add_executable(${LIB_NAME} ${PROJ_SOURCES})

target_link_libraries(${LIB_NAME} ${ENGINE_NAME} simulator)
target_include_directories(${LIB_NAME} PRIVATE
    ../Classes
    ${CMAKE_CURRENT_LIST_DIR}/../proj.ios_mac/mac
)
target_compile_definitions(${LIB_NAME} PRIVATE
    GAME_NAME="${APP_NAME}"
)

source_group(TREE ${CMAKE_CURRENT_LIST_DIR}/.. PREFIX "Source Files" FILES ${PROJ_SOURCES})

# macOS specific settings
set_target_properties(${LIB_NAME} PROPERTIES
    MACOSX_BUNDLE TRUE
    BUNDLE_NAME ${APP_NAME}
    PRODUCT_NAME ${APP_NAME}
)

CMAKE_EOF

# Configure with Xcode generator for macOS
echo "Configuring macOS build..."
cmake . -G "Xcode" -DCMAKE_BUILD_TYPE=${BUILD_TYPE}

# Build
echo "Building macOS..."
# Detect number of CPU cores
if command -nproc &> /dev/null; then
    CORES=$(nproc)
else
    CORES=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
fi
cmake --build . --config ${BUILD_TYPE} -j${CORES}

echo "Build completed!"
echo "Output: $BUILD_DIR/${APP_NAME}.app"
