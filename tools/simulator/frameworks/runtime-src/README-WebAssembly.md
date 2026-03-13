# Cocos Simulator WebAssembly Build

This directory contains the WebAssembly (WASM) version of the Cocos Simulator, which allows you to run the simulator in a web browser.

## Prerequisites

1. **Emscripten SDK**: You need to install and activate the Emscripten SDK
   - Download from: https://emscripten.org/docs/getting_started/downloads.html
   - Follow the installation instructions for your platform
   - Make sure to activate the SDK: `source ./emsdk_env.sh` (Linux/Mac) or `emsdk_env.bat` (Windows)

2. **CMake**: Version 3.8 or higher

3. **Python**: For serving the built files (Python 3 recommended)

## Building

### Linux/Mac
```bash
./build-wasm.sh
```

### Windows
```cmd
build-wasm.bat
```

## Running

After building, you'll find the output files in the `build-wasm/` directory. To run the simulator:

1. Start a local HTTP server:
   ```bash
   cd build-wasm
   python3 -m http.server 8080
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:8080/SimulatorApp.html
   ```

## Features and Limitations

### Supported Features
- ✅ Core Cocos2d-x engine functionality
- ✅ WebGL rendering
- ✅ Audio support
- ✅ WebSocket networking
- ✅ Box2D physics
- ✅ Spine animations
- ✅ DragonBones animations
- ✅ Middleware support

### Disabled Features (for browser compatibility)
- ❌ V8 JavaScript engine (uses browser's JS engine instead)
- ❌ PhysX physics (Box2D is used instead)
- ❌ EditBox (browser input handling differs)
- ❌ Video player (browser video APIs differ)
- ❌ WebView (not needed in browser context)

## Troubleshooting

### Build Issues
1. **Emscripten not found**: Make sure you've activated the Emscripten SDK environment
2. **Memory issues**: The build uses 128MB initial memory and 256MB maximum. Adjust in CMakeLists-wasm.txt if needed
3. **Missing dependencies**: Ensure all external dependencies are downloaded (`npx gulp init` in the root directory)

### Runtime Issues
1. **CORS errors**: Always serve files through HTTP server, don't open HTML files directly
2. **Loading issues**: Check browser console for detailed error messages
3. **Performance**: WebAssembly builds may be slower than native builds

## Customization

You can modify the WebAssembly build settings in `CMakeLists-wasm.txt`:

- **Memory settings**: Adjust `INITIAL_MEMORY` and `MAXIMUM_MEMORY`
- **Optimization**: Change from `-O3` to `-O2` or `-O1` for faster builds
- **Debug builds**: Use `CMAKE_BUILD_TYPE=Debug` for debugging support
- **Features**: Enable/disable specific engine features as needed

## File Structure

```
proj.wasm/
├── main.cpp           # WebAssembly entry point
├── index.html         # HTML shell template
CMakeLists-wasm.txt    # WebAssembly-specific CMake configuration
build-wasm.sh          # Linux/Mac build script
build-wasm.bat         # Windows build script
```

## Browser Compatibility

The WebAssembly simulator should work in modern browsers that support:
- WebAssembly
- WebGL 2.0
- Web Audio API
- WebSockets

Tested browsers:
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+