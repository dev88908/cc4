#!/bin/bash

# Test script to verify WebAssembly configuration
echo "Testing WebAssembly build configuration..."

# Check if emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found. Please install and activate the Emscripten SDK."
    exit 1
else
    echo "✅ Emscripten found: $(emcc --version | head -n1)"
fi

# Check if cmake is available
if ! command -v cmake &> /dev/null; then
    echo "❌ CMake not found. Please install CMake 3.8 or higher."
    exit 1
else
    echo "✅ CMake found: $(cmake --version | head -n1)"
fi

# Check if required files exist
if [ ! -f "CMakeLists-wasm.txt" ]; then
    echo "❌ CMakeLists-wasm.txt not found"
    exit 1
else
    echo "✅ CMakeLists-wasm.txt found"
fi

if [ ! -f "proj.wasm/main.cpp" ]; then
    echo "❌ proj.wasm/main.cpp not found"
    exit 1
else
    echo "✅ proj.wasm/main.cpp found"
fi

if [ ! -f "proj.wasm/index.html" ]; then
    echo "❌ proj.wasm/index.html not found"
    exit 1
else
    echo "✅ proj.wasm/index.html found"
fi

# Check if cocos engine files exist
if [ ! -f "../../../CMakeLists.txt" ]; then
    echo "❌ Cocos engine CMakeLists.txt not found"
    exit 1
else
    echo "✅ Cocos engine CMakeLists.txt found"
fi

# Test CMake configuration (dry run)
echo "Testing CMake configuration..."
BUILD_DIR="test-config"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

cp ../CMakeLists-wasm.txt ./CMakeLists.txt

if emcmake cmake . -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1; then
    echo "✅ CMake configuration test passed"
else
    echo "❌ CMake configuration test failed"
    cd ..
    rm -rf "$BUILD_DIR"
    exit 1
fi

cd ..
rm -rf "$BUILD_DIR"

echo ""
echo "🎉 All tests passed! WebAssembly build should work correctly."
echo "Run './build-wasm.sh' to build the WebAssembly version."