@echo off
REM Full rebuild Spine WASM using same EMSDK as project (cocos/editor-support/spine-wasm)
REM Requires: EMSDK with Python 3.10+, CMake, Ninja. Set EMSDK_ROOT to override.

setlocal enabledelayedexpansion

if not defined EMSDK_ROOT set EMSDK_ROOT=D:\devlib\emsdk
set "EMSCRIPTEN=%EMSDK_ROOT%\upstream\emscripten"
set "NINJA_PATH=%EMSDK_ROOT%\ninja\git-release_64bit\bin"
set "PATH_PREPEND=%EMSDK_ROOT%;%EMSCRIPTEN%"
if exist "%NINJA_PATH%\ninja.exe" (
    set "PATH_PREPEND=%PATH_PREPEND%;%NINJA_PATH%"
    set "NINJA_CMD=%NINJA_PATH%\ninja.exe"
) else (
    set "NINJA_CMD=ninja"
)
set "PATH=%PATH_PREPEND%;%PATH%"
set "EMCMAKE_CMD=%EMSCRIPTEN%\emcmake.bat"

REM Resolve spine-wasm dir (script may be run from spine-wasm or repo root)
set "SCRIPT_DIR=%~dp0"
set "SPINE_WASM_DIR=%SCRIPT_DIR%"
if not exist "%SPINE_WASM_DIR%CMakeLists.txt" (
    echo [ERROR] Cannot find spine-wasm CMakeLists.txt in %SPINE_WASM_DIR%
    exit /b 1
)

cd /d "%SPINE_WASM_DIR%"

echo ----------------------------------------
echo Spine WASM full rebuild (same EMSDK as project)
echo EMSDK_ROOT=%EMSDK_ROOT%
echo ----------------------------------------
call %EMSCRIPTEN%\emcc.bat --version
if %errorlevel% neq 0 (
    echo [ERROR] Emscripten not found. Install EMSDK and set EMSDK_ROOT or run emsdk_env.bat.
    exit /b 1
)
call %NINJA_CMD% --version
if %errorlevel% neq 0 (
    echo [ERROR] Ninja not found in PATH.
    exit /b 1
)

REM Clean temp for full rebuild
if exist "temp" (
    echo Cleaning existing temp...
    rmdir /s /q "temp"
)
mkdir temp
cd temp

echo Configuring (emcmake + Ninja)...
call %EMCMAKE_CMD% cmake .. -G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel -DBUILD_WASM=1
if %errorlevel% neq 0 (
    echo [ERROR] CMake configure failed.
    cd ..
    exit /b 1
)

echo Building...
call %NINJA_CMD%
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    cd ..
    exit /b 1
)

cd ..

REM Output: temp/spine.wasm, temp/spine.js
if not exist "temp\spine.wasm" (
    echo [ERROR] Build succeeded but temp\spine.wasm not found.
    exit /b 1
)
if not exist "temp\spine.js" (
    echo [ERROR] Build succeeded but temp\spine.js not found.
    exit /b 1
)

REM Detect SPINE_VERSION from CMakeLists.txt (which active set line: 3.8 or 4.2)
set "SPINE_VER=3.8"
findstr "set(SPINE_VERSION" CMakeLists.txt | findstr /V "#" | findstr "4.2" >nul 2>nul && set "SPINE_VER=4.2"
findstr "set(SPINE_VERSION" CMakeLists.txt | findstr /V "#" | findstr "3.8" >nul 2>nul && set "SPINE_VER=3.8"
REM Copy to external/emscripten/spine/<version> e.g. spine/3.8 or spine/4.2
set "DEST=%~dp0..\..\..\external\emscripten\spine\%SPINE_VER%"
if not exist "%DEST%" mkdir "%DEST%"
copy /y "temp\spine.wasm" "%DEST%\spine.wasm"
copy /y "temp\spine.js"   "%DEST%\spine.wasm.js"
echo.
echo Build OK. Spine %SPINE_VER% output copied to: %DEST%
echo   - spine.wasm
echo   - spine.wasm.js
echo ----------------------------------------
exit /b 0
