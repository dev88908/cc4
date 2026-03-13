#!/bin/bash

# WebAssembly build script for Cocos Simulator
# Make sure you have Emscripten SDK installed and activated

set -e

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

# Check if emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten not found. Please install and activate the Emscripten SDK."
    echo "Visit: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Set EMSCRIPTEN path if not already set
if [ -z "$EMSCRIPTEN" ]; then
    EMCC_PATH=$(which emcc)
    EMSDK_ROOT=$(dirname $(dirname "$EMCC_PATH"))
    
    # Try different possible locations for Emscripten
    if [ -f "$EMSDK_ROOT/emscripten/cmake/Modules/Platform/Emscripten.cmake" ]; then
        EMSCRIPTEN="$EMSDK_ROOT/emscripten"
    elif [ -f "$EMSDK_ROOT/cmake/Modules/Platform/Emscripten.cmake" ]; then
        EMSCRIPTEN="$EMSDK_ROOT"
    else
        echo "Warning: Could not find Emscripten.cmake, using default path"
        EMSCRIPTEN="$EMSDK_ROOT"
    fi
    echo "EMSCRIPTEN path auto-detected: $EMSCRIPTEN"
fi

# Create build directory in the runtime-src folder
RUNTIME_SRC_DIR="$SCRIPT_DIR"
BUILD_DIR="$RUNTIME_SRC_DIR/build-wasm"

if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning existing build directory..."
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Copy the WebAssembly specific CMakeLists.txt
cp "$RUNTIME_SRC_DIR/CMakeLists-wasm.txt" ./CMakeLists.txt

# Configure with Emscripten
echo "Configuring WebAssembly build..."
# emcmake automatically sets the toolchain file, so we don't need to specify it
emcmake cmake . -DCMAKE_BUILD_TYPE=Release

# Build
echo "Building WebAssembly..."
# Detect number of CPU cores (cross-platform)
if command -v nproc &> /dev/null; then
    CORES=$(nproc)
else
    CORES=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
fi
emmake make -j$CORES

echo "Build completed! Output files are in $BUILD_DIR/"
echo "You can serve the files using a local HTTP server:"
echo "  cd $BUILD_DIR && python3 -m http.server 8080"
echo "Then open http://localhost:8080/SimulatorApp.html in your browser"