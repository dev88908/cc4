# WebAssembly 构建脚本修复说明

## 已修复的问题

### 1. predefine.cmake 中 templates 路径错误 ✅
**问题描述**：`predefine.cmake` 使用 `../../templates/cmake/` 来引用模板文件，但这会导致路径错误

**路径分析**：
- `CMAKE_CURRENT_LIST_DIR` = `ccnative/cmake`
- `../../templates` = `ccnative/../../templates` = `cocos/templates` ❌
- 正确路径应该是 `../templates` = `ccnative/templates` ✓

**修复方案**：将所有 `../../templates` 改为 `../templates`

```cmake
# 修复前
include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/common.cmake)

# 修复后
include(${CMAKE_CURRENT_LIST_DIR}/../templates/cmake/common.cmake)
```

### 2. EMSCRIPTEN 路径检测问题 ✅
### 2. EMSCRIPTEN 路径检测问题
**问题描述**：原始脚本假设 Emscripten.cmake 位于 `$EMSDK_ROOT/emscripten/cmake/...`，但实际可能在 `$EMSDK_ROOT/cmake/...`

**修复方案**：增加了多个路径检测逻辑，自动查找正确的 Emscripten.cmake 位置

```bash
# 修复前
EMSCRIPTEN=$(dirname $(dirname $(which emcc)))/emscripten

# 修复后
EMCC_PATH=$(which emcc)
EMSDK_ROOT=$(dirname $(dirname "$EMCC_PATH"))

if [ -f "$EMSDK_ROOT/emscripten/cmake/Modules/Platform/Emscripten.cmake" ]; then
    EMSCRIPTEN="$EMSDK_ROOT/emscripten"
elif [ -f "$EMSDK_ROOT/cmake/Modules/Platform/Emscripten.cmake" ]; then
    EMSCRIPTEN="$EMSDK_ROOT"
else
    EMSCRIPTEN="$EMSDK_ROOT"
fi
```

### 3. CMakeLists-wasm.txt 中的 cocosdir 路径错误
**问题描述**：从 `build-wasm/` 目录计算到 ccnative 根目录的层级数错误

**目录结构**：
```
ccnative/                          <- 目标目录（根目录）
└── tools/
    └── simulator/
        └── frameworks/
            └── runtime-src/
                └── build-wasm/    <- 起始目录
```

**修复方案**：
```cmake
# 修复前（错误：只上升 4 级）
set(cocosdir ${CMAKE_CURRENT_LIST_DIR}/../../../..)

# 修复后（正确：上升 5 级）
set(cocosdir ${CMAKE_CURRENT_LIST_DIR}/../../../../..)
```

## 验证结果

运行 `test-wasm-paths.sh` 验证所有路径：

```bash
cd /Users/t5/cocosProjs/cocos/ccnative/tools/simulator/frameworks/runtime-src
./test-wasm-paths.sh
```

所有检查项均通过：
- ✓ External CMakeLists.txt found
- ✓ emcc found
- ✓ Emscripten.cmake found
- ✓ Cocos CMakeLists.txt would be found
- ✓ main.js found
- ✓ project.json found
- ✓ proj.wasm/main.cpp found
- ✓ proj.wasm/index.html found
- ✓ libsimulator CMakeLists-wasm.txt found

## 其他潜在问题

### 4. --preload-file 路径
CMakeLists-wasm.txt 中的预加载文件路径：
```cmake
--preload-file ${CMAKE_CURRENT_LIST_DIR}/../../@/
```

这会预加载 `runtime-src/../../` 目录（即 `tools/simulator/frameworks/`），包含：
- main.js
- project.json
- jsb-adapter/
- subpackages/
- res/
- src/

**注意**：确保这些文件和目录存在，否则构建会失败。

### 5. PNG 和 JPEG 库支持 ✅
**问题描述**：Image.cpp 找不到 `jpeg/jpeglib.h` 和 `png/png.h` 头文件

**解决方案**：
1. 使用 Emscripten 端口系统提供 JPEG 和 PNG 库
2. 修改 Image.cpp 为 Emscripten 平台使用正确的头文件路径
3. 在 CMakeLists-wasm.txt 中添加编译和链接选项

**CMakeLists-wasm.txt 修改**：
```cmake
# 在 include 主 CMakeLists.txt 之前添加
add_compile_options("SHELL:-s USE_LIBJPEG=1" "SHELL:-s USE_LIBPNG=1")
add_link_options("SHELL:-s USE_LIBJPEG=1" "SHELL:-s USE_LIBPNG=1")
```

**Image.cpp 修改**：
```cpp
// JPEG 头文件
#if CC_USE_JPEG
    #if CC_PLATFORM == CC_PLATFORM_EMSCRIPTEN
        #include <jpeglib.h>  // Emscripten 直接提供 jpeglib.h
    #else
        #include "jpeg/jpeglib.h"
    #endif
#endif

// PNG 头文件
#if CC_USE_PNG
    #if __OHOS__ || __LINUX__ || __QNX__ || (CC_PLATFORM == CC_PLATFORM_EMSCRIPTEN)
        #include <png.h>  // Emscripten 使用系统 png.h
    #else
        #include "png/png.h"
    #endif
#endif
```

## 当前状态

PNG 和 JPEG 支持已成功启用。现在遇到新的编译错误：

```
error: static assertion failed: Type incorrect or implementation not found!
在 jsb_scene_auto.cpp 中的 sevalue_to_native<unsigned long>
```

这是 JSB 绑定代码生成的问题，需要进一步调查。

## 下一步
当前检测到的版本：`emcc 5.0.2`

某些 Emscripten 标志可能在不同版本中有变化，如果遇到编译错误，可能需要调整：
- `ASYNCIFY` 标志
- `INITIAL_MEMORY` 和 `MAXIMUM_MEMORY` 设置
- `--closure` 优化选项

## 下一步

1. 运行构建脚本测试：
```bash
cd /Users/t5/cocosProjs/cocos/ccnative/tools/simulator/frameworks/runtime-src
./build-wasm.sh
```

2. 如果遇到编译错误，检查：
   - 源文件是否存在（Classes/Game.cpp, proj.wasm/main.cpp 等）
   - 依赖库是否正确链接
   - Emscripten 标志是否与当前版本兼容

3. 构建成功后，测试运行：
```bash
cd build-wasm
python3 -m http.server 8080
# 在浏览器中打开 http://localhost:8080/SimulatorApp.html
```

## 修改的文件

1. **cmake/predefine.cmake** - 修复 templates 路径（从 `../../templates` 改为 `../templates`）
2. **tools/simulator/frameworks/runtime-src/build-wasm.sh** - 修复 EMSCRIPTEN 路径检测和移除手动指定 toolchain 文件
3. **tools/simulator/frameworks/runtime-src/CMakeLists-wasm.txt** - 修复 cocosdir 路径计算（从 4 级改为 5 级）+ 添加 Emscripten 端口支持
4. **cocos/platform/Image.cpp** - 为 Emscripten 平台添加正确的头文件包含路径
5. **tools/simulator/frameworks/runtime-src/test-wasm-paths.sh** - 新增路径验证脚本

## 依赖的目录结构

确保以下目录和文件存在：
- `ccnative/templates/cmake/common.cmake` - 已存在 ✓
- `ccnative/templates/cmake/emscripten.cmake` - 已存在 ✓
- `ccnative/external/CMakeLists.txt` - 已存在 ✓
