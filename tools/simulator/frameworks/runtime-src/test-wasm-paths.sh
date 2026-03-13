#!/bin/bash

# Test script to verify paths used in build-wasm.sh

set -e

echo "=== Testing build-wasm.sh paths ==="
echo ""

# Get the native directory (4 levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "SCRIPT_DIR: $SCRIPT_DIR"

NATIVE_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
echo "NATIVE_DIR: $NATIVE_DIR"
echo ""

# Check external dependencies
echo "Checking external dependencies..."
if [ -f "$NATIVE_DIR/external/CMakeLists.txt" ]; then
    echo "✓ External CMakeLists.txt found"
else
    echo "✗ External CMakeLists.txt NOT found at: $NATIVE_DIR/external/CMakeLists.txt"
fi
echo ""

# Check if emscripten is available
echo "Checking Emscripten..."
if command -v emcc &> /dev/null; then
    echo "✓ emcc found: $(which emcc)"
    echo "  Version: $(emcc --version | head -n 1)"
    
    # Check EMSCRIPTEN path
    if [ -z "$EMSCRIPTEN" ]; then
        EMSCRIPTEN_AUTO=$(dirname $(dirname $(which emcc)))
        echo "  EMSCRIPTEN not set, auto-detected: $EMSCRIPTEN_AUTO"
        
        # Check for cmake toolchain file
        if [ -f "$EMSCRIPTEN_AUTO/emscripten/cmake/Modules/Platform/Emscripten.cmake" ]; then
            echo "  ✓ Emscripten.cmake found"
        elif [ -f "$EMSCRIPTEN_AUTO/cmake/Modules/Platform/Emscripten.cmake" ]; then
            echo "  ✓ Emscripten.cmake found (alternate location)"
        else
            echo "  ✗ Emscripten.cmake NOT found"
            echo "    Tried: $EMSCRIPTEN_AUTO/emscripten/cmake/Modules/Platform/Emscripten.cmake"
            echo "    Tried: $EMSCRIPTEN_AUTO/cmake/Modules/Platform/Emscripten.cmake"
        fi
    else
        echo "  EMSCRIPTEN set to: $EMSCRIPTEN"
    fi
else
    echo "✗ emcc NOT found"
fi
echo ""

# Check CMakeLists-wasm.txt
echo "Checking CMakeLists-wasm.txt..."
if [ -f "$SCRIPT_DIR/CMakeLists-wasm.txt" ]; then
    echo "✓ CMakeLists-wasm.txt found"
    
    # Simulate the cocosdir calculation from CMakeLists-wasm.txt
    # From build-wasm/ directory: build-wasm -> runtime-src -> frameworks -> simulator -> tools -> ccnative (5 levels up)
    BUILD_DIR="$SCRIPT_DIR/build-wasm"
    COCOSDIR_FROM_BUILD="$(cd "$BUILD_DIR/../../../../.." 2>/dev/null && pwd || echo "PATH_ERROR")"
    echo "  Simulated cocosdir from build-wasm/ (5 levels up): $COCOSDIR_FROM_BUILD"
    
    if [ -f "$COCOSDIR_FROM_BUILD/CMakeLists.txt" ]; then
        echo "  ✓ Cocos CMakeLists.txt would be found"
    else
        echo "  ✗ Cocos CMakeLists.txt would NOT be found at: $COCOSDIR_FROM_BUILD/CMakeLists.txt"
    fi
else
    echo "✗ CMakeLists-wasm.txt NOT found"
fi
echo ""

# Check game resources path
echo "Checking game resources..."
GAME_RES_ROOT="$SCRIPT_DIR/../../"
echo "GAME_RES_ROOT: $GAME_RES_ROOT"

if [ -f "$GAME_RES_ROOT/main.js" ]; then
    echo "✓ main.js found"
else
    echo "✗ main.js NOT found at: $GAME_RES_ROOT/main.js"
fi

if [ -f "$GAME_RES_ROOT/project.json" ]; then
    echo "✓ project.json found"
else
    echo "✗ project.json NOT found at: $GAME_RES_ROOT/project.json"
fi
echo ""

# Check proj.wasm files
echo "Checking proj.wasm files..."
if [ -f "$SCRIPT_DIR/proj.wasm/main.cpp" ]; then
    echo "✓ proj.wasm/main.cpp found"
else
    echo "✗ proj.wasm/main.cpp NOT found"
fi

if [ -f "$SCRIPT_DIR/proj.wasm/index.html" ]; then
    echo "✓ proj.wasm/index.html found"
else
    echo "✗ proj.wasm/index.html NOT found"
fi
echo ""

# Check libsimulator CMakeLists
echo "Checking libsimulator..."
LIBSIM_CMAKE="$NATIVE_DIR/tools/simulator/libsimulator/CMakeLists-wasm.txt"
if [ -f "$LIBSIM_CMAKE" ]; then
    echo "✓ libsimulator CMakeLists-wasm.txt found"
else
    echo "✗ libsimulator CMakeLists-wasm.txt NOT found at: $LIBSIM_CMAKE"
fi
echo ""

echo "=== Path verification complete ==="
