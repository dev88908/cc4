# Cocos Simulator WebAssembly Migration Summary

## 完成的工作

### 1. 创建了 WebAssembly 项目结构
- `proj.wasm/` - WebAssembly 平台特定文件夹
- `proj.wasm/main.cpp` - WebAssembly 入口点
- `proj.wasm/index.html` - HTML 模板文件

### 2. 修改了 CMake 配置
- 更新了 `CMakeLists.txt` 以支持 Emscripten 平台
- 创建了专门的 `CMakeLists-wasm.txt` 配置文件
- 添加了 WebAssembly 特定的编译选项和链接设置

### 3. 创建了构建脚本
- `build-wasm.sh` - Linux/Mac 构建脚本
- `build-wasm.bat` - Windows 构建脚本
- `test-wasm-config.sh` - 配置测试脚本

### 4. 添加了 Gulp 任务
- `gen-simulator-wasm` - 自动化 WebAssembly 构建任务

### 5. 创建了文档
- `README-WebAssembly.md` - 详细的使用说明
- `WebAssembly-Migration-Summary.md` - 本总结文档

## 主要特性

### 支持的功能
✅ 核心 Cocos2d-x 引擎功能  
✅ WebGL 渲染  
✅ 音频支持  
✅ WebSocket 网络  
✅ Box2D 物理引擎  
✅ Spine 动画  
✅ DragonBones 动画  
✅ 中间件支持  

### 为浏览器兼容性禁用的功能
❌ V8 JavaScript 引擎 (使用浏览器 JS 引擎)  
❌ PhysX 物理引擎 (使用 Box2D 替代)  
❌ EditBox (浏览器输入处理不同)  
❌ 视频播放器 (浏览器视频 API 不同)  
❌ WebView (浏览器环境中不需要)  

## 使用方法

### 前提条件
1. 安装 Emscripten SDK
2. 激活 Emscripten 环境
3. 确保 CMake 3.8+ 可用

### 构建方式

#### 方式 1: 使用 Gulp 任务 (推荐)
```bash
npx gulp gen-simulator-wasm
```

#### 方式 2: 使用构建脚本
```bash
# Linux/Mac
cd tools/simulator/frameworks/runtime-src
./build-wasm.sh

# Windows
cd tools/simulator/frameworks/runtime-src
build-wasm.bat
```

#### 方式 3: 手动构建
```bash
cd tools/simulator/frameworks/runtime-src
mkdir build-wasm && cd build-wasm
cp ../CMakeLists-wasm.txt ./CMakeLists.txt
emcmake cmake . -DCMAKE_BUILD_TYPE=Release
emmake make
```

### 运行
```bash
cd tools/simulator/frameworks/runtime-src/build-wasm
python3 -m http.server 8080
# 打开浏览器访问 http://localhost:8080/SimulatorApp.html
```

## 技术细节

### Emscripten 编译选项
- `USE_SDL=2` - 使用 SDL2 进行输入和窗口管理
- `USE_WEBGL2=1` - 启用 WebGL 2.0 支持
- `WASM=1` - 生成 WebAssembly 而非 asm.js
- `ALLOW_MEMORY_GROWTH=1` - 允许动态内存增长
- `ASYNCIFY=1` - 支持异步操作
- `INITIAL_MEMORY=128MB` - 初始内存大小
- `MAXIMUM_MEMORY=256MB` - 最大内存限制

### 文件结构
```
tools/simulator/frameworks/runtime-src/
├── proj.wasm/
│   ├── main.cpp           # WebAssembly 入口点
│   └── index.html         # HTML 模板
├── CMakeLists-wasm.txt    # WebAssembly CMake 配置
├── build-wasm.sh          # Linux/Mac 构建脚本
├── build-wasm.bat         # Windows 构建脚本
├── test-wasm-config.sh    # 配置测试脚本
└── README-WebAssembly.md  # 详细文档
```

## 浏览器兼容性

支持的浏览器:
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

需要的浏览器功能:
- WebAssembly
- WebGL 2.0
- Web Audio API
- WebSockets

## 故障排除

### 常见问题
1. **Emscripten 未找到**: 确保已激活 Emscripten 环境
2. **内存问题**: 调整 CMakeLists-wasm.txt 中的内存设置
3. **CORS 错误**: 必须通过 HTTP 服务器提供文件
4. **加载问题**: 检查浏览器控制台的详细错误信息

### 性能优化
- 使用 Release 构建模式
- 启用 `--closure 1` 进行代码压缩
- 调整内存设置以适应应用需求
- 考虑使用 Web Workers 进行后台处理

## 下一步

1. 测试 WebAssembly 构建
2. 根据需要调整内存和性能设置
3. 添加更多浏览器特定的优化
4. 考虑添加 PWA (Progressive Web App) 支持
5. 集成到 CI/CD 流程中