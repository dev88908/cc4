@echo off
REM WebAssembly build script for Cocos Simulator
REM Make sure you have Emscripten SDK installed and activated

setlocal enabledelayedexpansion

REM Set Emscripten paths
set EMSDK_ROOT=D:\devlib\emsdk
set EMSCRIPTEN=%EMSDK_ROOT%\upstream\emscripten
set EMSDK_NODE=%EMSDK_ROOT%\node\20.18.0_64bit\bin\node.exe
set EMSDK_PYTHON=%EMSDK_ROOT%\python\3.9.2-nuget_64bit\python.exe
set NINJA_PATH=%EMSDK_ROOT%\ninja\git-release_64bit\bin

REM Add Emscripten and Ninja to PATH
set PATH=%EMSDK_ROOT%;%EMSCRIPTEN%;%NINJA_PATH%;%PATH%

REM Set Emscripten commands
set EMCC_CMD=%EMSCRIPTEN%\emcc.bat
set EMCMAKE_CMD=%EMSCRIPTEN%\emcmake.bat
set EMMAKE_CMD=%EMSCRIPTEN%\emmake.bat
set NINJA_CMD=%NINJA_PATH%\ninja.exe

echo Using Emscripten at: %EMSCRIPTEN%
echo Using Ninja at: %NINJA_PATH%
%EMCC_CMD% --version
%NINJA_CMD% --version

REM Create build directory
set BUILD_DIR=build-wasm
if exist "%BUILD_DIR%" (
    echo Cleaning existing build directory...
    rmdir /s /q "%BUILD_DIR%"
)

mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

REM Copy the WebAssembly specific CMakeLists.txt
copy ..\CMakeLists-wasm.txt .\CMakeLists.txt

REM Debug: Show the directory structure
echo Current directory: %CD%
echo Checking for cocos root at: %CD%\..\..\..\..\..\CMakeLists.txt
if exist "%CD%\..\..\..\..\..\CMakeLists.txt" (
    echo Found cocos root CMakeLists.txt
) else (
    echo ERROR: Cannot find cocos root CMakeLists.txt
    dir /b "%CD%\..\..\..\..\..\"
)

REM Configure with Emscripten using Ninja generator
echo Configuring WebAssembly build...
call %EMCMAKE_CMD% cmake . ^
    -G Ninja ^
    -DCMAKE_BUILD_TYPE=Release

if %errorlevel% neq 0 (
    echo CMake configuration failed!
    exit /b 1
)

REM Build using Ninja
echo Building WebAssembly...
call %NINJA_CMD%

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Build completed! Output files are in %BUILD_DIR%/
echo You can serve the files using a local HTTP server:
echo   cd %BUILD_DIR% ^&^& python -m http.server 8080
echo Then open http://localhost:8080/SimulatorApp.html in your browser

pause