
# Spine WASM 编译指南

---

## 1. 环境要求

- **EMSdk 3.1.41**:  
  需下载 EMSdk，并根据官方仓库文档配置环境变量。
- **CMake**:  
  需将 CMake 添加到系统 `PATH` 环境变量。
- **Ninja**:  
  需将 Ninja 添加到系统 `PATH` 环境变量。

---

## 2. 修改 CMakeLists.txt

- **设置 Spine 版本**:  
  根据需要的 Spine 版本修改 `SPINE_VERSION` 配置。
- **调试/发布模式**:  
  根据调试需求修改 `CMAKE_BUILD_TYPE`。
- **WASM/ASM.js 编译**:  
  设置 `BUILD_WASM=1` 编译 WASM，或 `BUILD_WASM=0` 编译 ASM.js。

**命令示例**:

```bash
emcmake cmake .. -G "Ninja" -DCMAKE_BUILD_TYPE=Release -DBUILD_WASM=1
```

---

## 3. 创建构建目录

- 在当前目录下创建临时目录（如 `temp`）：

```bash
mkdir temp && cd temp
```

---

## 4. 编译步骤

1. **激活 EMSdk 环境**：
   - Windows：

     ```bash
     emsdk_env.bat
     ```

   - Linux/macOS：

     ```bash
     source ./emsdk_env.sh
     ```

2. **生成构建文件**：

```bash
emcmake cmake ..
```

3. **使用 Ninja 编译**：

```bash
ninja
```

---

## 5. 编译后处理

- **生成文件**：
  - `spine.wasm`
  - `spine.js`

- **文件重命名与移动**：
  - 将 `spine.js` 重命名为 `spine.wasm.js`。
  - 将文件复制到 `native/external/emscripten/spine` 目录下。

---

## 全量重编（与工程 EMSDK 一致）

若需与当前工程使用**同一 EMSDK** 全量重编 Spine WASM（避免版本/构建不一致），请使用工程内脚本：

- **Windows**：在 `cocos/editor-support/spine-wasm` 下执行：
  ```bat
  build-rebuild-spine-wasm.bat
  ```
  脚本会：清理 `temp` → 使用与 `tools/simulator/frameworks/runtime-src/build-wasm.bat` 相同的 EMSDK 配置 → 重新 CMake + Ninja 编译 → 将 `spine.wasm` 和 `spine.wasm.js` 复制到 `external/emscripten/spine`。
- 可通过环境变量 `EMSDK_ROOT` 覆盖 EMSDK 路径（默认与 build-wasm.bat 一致）。

## 注意事项

1. **版本兼容性**:  
   确保 EMSdk、CMake 和 Spine 版本兼容。
2. **路径有效性**:  
   检查所有路径（如 `emsdk_env`、输出目录）是否有效。
