cmake_minimum_required(VERSION 3.8)

set(APP_NAME SimulatorApp)
project(${APP_NAME} CXX)

enable_language(C ASM)
set(CMAKE_CXX_STANDARD 17)

if(EMSCRIPTEN)
    # Emscripten platform settings (only when actually using emscripten toolchain)
    set(CC_WGPU_WASM TRUE)
    set(CC_PLATFORM_EMSCRIPTEN 9)
    set(CC_PLATFORM ${CC_PLATFORM_EMSCRIPTEN})
    add_definitions(-DCC_WGPU_WASM=1)
    add_definitions(-DCC_PLATFORM_EMSCRIPTEN=${CC_PLATFORM_EMSCRIPTEN})
    add_definitions(-DCC_PLATFORM=${CC_PLATFORM})

    # WebAssembly specific options - disable problematic features
    option(USE_SE_V8        "USE V8 JavaScript Engine"          OFF)  # V8 not available in WASM
    option(USE_V8_DEBUGGER  "Enable Chrome Remote inspector"    OFF)  # V8 debugger not available in WASM
    option(USE_SE_JSC       "USE JavaScriptCore on MacOSX/iOS"  OFF)  # JSC not available in WASM
    option(USE_SE_SM        "USE SpiderMonkey JavaScript Engine" OFF)  # SpiderMonkey not available in WASM
    option(USE_SE_NAPI      "USE NAPI JavaScript Engine"        OFF)  # NAPI not available in WASM
    option(USE_SE_JSVM      "USE JSVM JavaScript Engine"        ON)   # Use JSVM stub for WebAssembly (provides se:: API)
    option(USE_PHYSICS_PHYSX "USE PhysX Physics"                OFF)  # PhysX may have issues in WASM
    option(USE_BOX2D_JSB     "USE Box2D JSB"                    OFF)  # Disable JSB for now
    option(USE_SOCKET       "Enable WebSocket & SocketIO"       OFF)  # Disable - requires libuv which is not available
    option(USE_AUDIO        "Enable Audio"                      OFF)  # Disable audio temporarily to fix OpenAL issues
    option(USE_EDIT_BOX     "Enable EditBox"                    OFF)  # EditBox may not work in browser
    option(USE_VIDEO        "Enable VideoPlayer Component"      OFF)  # Video player may have issues
    option(USE_WEBVIEW      "Enable WebView Component"          OFF)  # WebView not needed in browser
    option(USE_MIDDLEWARE   "Enable Middleware"                 OFF)  # Disable middleware to avoid JS dependencies
    option(USE_DRAGONBONES  "Enable Dragonbones"                OFF)  # Disable dragonbones to avoid JS dependencies
    option(USE_SPINE_3_8   "Enable Spine 3.8"                   OFF)  # Disable spine to avoid JS dependencies
    option(USE_SPINE_4_2   "Enable Spine 4.2"                   OFF)
    option(USE_WEBP         "Enable WebP image format"          OFF)  # Disable WebP - requires external library
else()
    # Native platform options (Windows/macOS)
    option(USE_SE_V8        "USE V8 JavaScript Engine"          ON)
    option(USE_V8_DEBUGGER  "Enable Chrome Remote inspector"    ON)
    option(USE_SE_JSC       "USE JavaScriptCore on MacOSX/iOS"  OFF)
    option(USE_SOCKET       "Enable WebSocket & SocketIO"       ON)
    option(USE_AUDIO        "Enable Audio"                      ON)
    option(USE_EDIT_BOX     "Enable EditBox"                    ON)
    option(USE_VIDEO        "Enable VideoPlayer Component"      ON)
    option(USE_WEBVIEW      "Enable WebView Component"          OFF)
    option(USE_MIDDLEWARE   "Enable Middleware"                 ON)
    option(USE_DRAGONBONES  "Enable Dragonbones"                ON)
    option(USE_SPINE_3_8   "Enable Spine 3.8"                   ON)
    option(USE_SPINE_4_2   "Enable Spine 4.2"                   OFF)
    option(USE_PHYSICS_PHYSX "USE PhysX Physics"                ON)
    option(USE_BOX2D_JSB     "USE Box2D JSB"                    ON)
endif()

if(USE_SE_JSC AND APPLE)
    set(USE_SE_V8 OFF)
    set(USE_V8_DEBUGGER OFF)
endif()

# Determine the cocos root directory
# CMAKE_CURRENT_LIST_DIR points to runtime-src/ where this file lives
# runtime-src -> frameworks -> simulator -> tools -> cc4 (4 levels up)
set(cocosdir ${CMAKE_CURRENT_LIST_DIR}/../../../..)
get_filename_component(cocosdir ${cocosdir} ABSOLUTE)

if(NOT EXISTS ${cocosdir}/CMakeLists.txt)
    message(FATAL_ERROR "COCOS_ROOT CMakeLists.txt not found at: ${cocosdir}/CMakeLists.txt")
endif()

message(STATUS "Cocos root directory: ${cocosdir}")

# TODO(v3.6.1): enable all modules and scripts for simulator
set(USE_DEBUG_RENDERER OFF)

if(EMSCRIPTEN)
    # Set Emscripten image library ports for all targets
    add_compile_options("SHELL:-s USE_LIBJPEG=1" "SHELL:-s USE_LIBPNG=1" "SHELL:-s USE_SQLITE3=1")
    add_link_options("SHELL:-s USE_LIBJPEG=1" "SHELL:-s USE_LIBPNG=1" "SHELL:-s USE_SQLITE3=1")
endif()

include(${cocosdir}/CMakeLists.txt)
if(EMSCRIPTEN)
    include(${cocosdir}/tools/simulator/libsimulator/CMakeLists-wasm.txt)
else()
    include(${cocosdir}/tools/simulator/libsimulator/CMakeLists.txt)
endif()

if(EMSCRIPTEN)
    set(LIB_NAME ${APP_NAME})
elseif(MACOSX)
    set(LIB_NAME ${APP_NAME}-Mac)
else()
    set(LIB_NAME ${APP_NAME}-Win32)
endif()

set(GAME_RES_ROOT ${CMAKE_CURRENT_LIST_DIR}/../../)
set(GAME_RES_FILES
    ${GAME_RES_ROOT}/main.js
    ${GAME_RES_ROOT}/project.json
)
set(GAME_RES_FOLDERS
    ${GAME_RES_ROOT}/jsb-adapter
    ${GAME_RES_ROOT}/subpackages
    ${GAME_RES_ROOT}/res
    ${GAME_RES_ROOT}/src
)
set(GAME_RES_ALL
    ${GAME_RES_FILES}
    ${GAME_RES_FOLDERS}
)

set(PROJ_SOURCES
    Classes/Game.cpp
    Classes/Game.h
    Classes/ide-support/CodeIDESupport.h
    Classes/ide-support/RuntimeJsImpl.cpp
    Classes/ide-support/RuntimeJsImpl.h
)

if(EMSCRIPTEN)
    list(APPEND PROJ_SOURCES
        proj.wasm/main.cpp
        proj.wasm/SimulatorApp.cpp
        proj.wasm/SimulatorApp.h
    )
elseif(WINDOWS)
    set(UI_RESOURCES
        proj.win32/game.rc
        proj.win32/res/game.ico
    )
    list(APPEND PROJ_SOURCES
        proj.win32/main.cpp
        proj.win32/main.h
        proj.win32/resource.h
        proj.win32/SimulatorApp.cpp
        proj.win32/SimulatorApp.h
        ${UI_RESOURCES}
    )
elseif(MACOSX)
    set(UI_RESOURCES
        SimulatorApp-Mac/Images.xcassets
        proj.ios_mac/mac/Simulator.entitlements
        proj.ios_mac/mac/Base.lproj/ConsoleWindow.xib
        proj.ios_mac/mac/Base.lproj/MainMenu.xib
        proj.ios_mac/mac/en.lproj/MainMenu.xib
        proj.ios_mac/mac/zh-Hans.lproj/ConsoleWindow.strings
        proj.ios_mac/mac/zh-Hans.lproj/MainMenu.xib
    )
    list(APPEND PROJ_SOURCES
        proj.ios_mac/mac/main.mm
        proj.ios_mac/mac/SimulatorApp.h
        proj.ios_mac/mac/SimulatorApp.mm
        proj.ios_mac/mac/ConsoleWindowController.h
        proj.ios_mac/mac/ConsoleWindowController.m
        ${UI_RESOURCES}
    )
endif()

set(asset_files)
foreach(res ${GAME_RES_ALL})
    set(res_list)
    if(NOT EXISTS ${res})
        continue()
    endif()
    if(IS_DIRECTORY ${res})
        file(GLOB_RECURSE res_list "${res}/*")
    else()
        set(res_list ${res})
    endif()
    foreach(res ${res_list})
        get_filename_component(res_abs ${res} ABSOLUTE)
        file(RELATIVE_PATH res_rel ${GAME_RES_ROOT} ${res_abs})
        get_filename_component(res_dir ${res_rel} PATH)
        set_source_files_properties(${res_abs} PROPERTIES
                                    MACOSX_PACKAGE_LOCATION "Resources/${res_dir}/"
                                    HEADER_FILE_ONLY 1
                                    )
        list(APPEND asset_files ${res_abs})
    endforeach()
endforeach()

if(APPLE OR MSVC)
    add_executable(${LIB_NAME} ${PROJ_SOURCES} ${asset_files})
    source_group(TREE ${GAME_RES_ROOT} PREFIX "Resources" FILES ${asset_files})
else()
    add_executable(${LIB_NAME} ${PROJ_SOURCES})
endif()

target_link_libraries(${LIB_NAME} ${ENGINE_NAME} simulator)
target_include_directories(${LIB_NAME} PRIVATE
    Classes
)
target_compile_definitions(${LIB_NAME} PRIVATE
    GAME_NAME="${APP_NAME}"
)

source_group(TREE ${CMAKE_CURRENT_LIST_DIR} PREFIX "Source Files" FILES ${PROJ_SOURCES})

if(WINDOWS)
    set_target_properties(${LIB_NAME} PROPERTIES RESOURCE "${UI_RESOURCES}")
    if(EXISTS ${CMAKE_CURRENT_LIST_DIR}/../../jsb-adapter)
        set(bin_dir $<TARGET_FILE_DIR:${LIB_NAME}>)
        add_custom_command(TARGET ${LIB_NAME} PRE_BUILD
            COMMAND ${CMAKE_COMMAND} -E echo "Linking resources for ${LIB_NAME} ..."
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_LIST_DIR}/../../jsb-adapter ${bin_dir}/jsb-adapter
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_LIST_DIR}/../../res ${bin_dir}/res
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_LIST_DIR}/../../src ${bin_dir}/src
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_LIST_DIR}/../../main.js ${bin_dir}/main.js
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_LIST_DIR}/../../project.json ${bin_dir}/project.json
        )
    endif()
    target_include_directories(${LIB_NAME} PRIVATE
        ${CMAKE_CURRENT_LIST_DIR}/proj.win32
    )
    if(MSVC)
        foreach(item ${WINDOWS_DLLS})
            get_filename_component(filename ${item} NAME)
            get_filename_component(abs ${item} ABSOLUTE)
            add_custom_command(TARGET ${LIB_NAME} POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy_if_different ${abs} $<TARGET_FILE_DIR:${LIB_NAME}>/${filename}
            )
        endforeach()
        foreach(item ${V8_DLLS})
            get_filename_component(filename ${item} NAME)
            add_custom_command(TARGET ${LIB_NAME} POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy_if_different ${V8_DIR}/$<IF:$<BOOL:$<CONFIG:RELEASE>>,Release,Debug>/${filename} $<TARGET_FILE_DIR:${LIB_NAME}>/${filename}
            )
        endforeach()
        target_link_options(${LIB_NAME} PRIVATE /SUBSYSTEM:WINDOWS)
    endif()

elseif(APPLE)
    set_target_properties(${LIB_NAME} PROPERTIES MACOSX_BUNDLE 1)
    set_target_properties(${LIB_NAME} PROPERTIES RESOURCE "${UI_RESOURCES}")
    set(EXECUTABLE_NAME ${LIB_NAME})
    set(PRODUCT_NAME ${APP_NAME})
    if(MACOSX)
        set(TARGET_OSX_VERSION "10.14")
        set(CMAKE_OSX_DEPLOYMENT_TARGET ${TARGET_OSX_VERSION})
        set(MACOSX_BUNDLE_GUI_IDENTIFIER org.cocos.hellojavascript.mac)
        set_target_properties(${LIB_NAME} PROPERTIES MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_LIST_DIR}/proj.ios_mac/mac/Info.plist")
        set_target_properties(${LIB_NAME} PROPERTIES
            MACOSX_DEPLOYMENT_TARGET ${TARGET_OSX_VERSION}
            XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_APPICON_NAME "AppIcon"
            RESOURCE "${UI_RESOURCES}"
        )
        get_property(gles2_loc TARGET GLESv2 PROPERTY IMPORTED_LOCATION)
        get_property(egl_loc TARGET EGL PROPERTY IMPORTED_LOCATION)
        add_custom_command(TARGET ${LIB_NAME} POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E make_directory $<TARGET_FILE_DIR:${LIB_NAME}>/../Frameworks
            COMMAND ${CMAKE_COMMAND} -E copy ${gles2_loc} $<TARGET_FILE_DIR:${LIB_NAME}>/../Frameworks
            COMMAND ${CMAKE_COMMAND} -E copy ${egl_loc} $<TARGET_FILE_DIR:${LIB_NAME}>/../Frameworks
        )
    endif()

elseif(EMSCRIPTEN)
    target_include_directories(${LIB_NAME} PRIVATE
        ${CMAKE_CURRENT_LIST_DIR}/proj.wasm
    )

    # Emscripten compiler and linker flags
    set(EMSCRIPTEN_COMPILE_FLAGS
        "SHELL:-s USE_SDL=2"
        "SHELL:-s USE_WEBGL2=1"
        "SHELL:-s FULL_ES3=1"
        "SHELL:-s WASM=1"
        "SHELL:-s FORCE_FILESYSTEM=1"
        "SHELL:-s USE_LIBJPEG=1"
        "SHELL:-s USE_LIBPNG=1"
        "SHELL:-s USE_SQLITE3=1"
    )

    set(SIMULATOR_ROOT ${CMAKE_CURRENT_LIST_DIR}/../../)
    set(EMSCRIPTEN_LINK_FLAGS
        "SHELL:-s USE_SDL=2"
        "SHELL:-s USE_WEBGL2=1"
        "SHELL:-s FULL_ES3=1"
        "SHELL:-s WASM=1"
        "SHELL:-s FORCE_FILESYSTEM=1"
        "SHELL:-s ALLOW_MEMORY_GROWTH=1"
        "SHELL:-s INITIAL_MEMORY=134217728"  # 128MB
        "SHELL:-s MAXIMUM_MEMORY=268435456"  # 256MB
        "SHELL:-s STACK_SIZE=5242880"        # 5MB
        "SHELL:-s ASYNCIFY=1"
        "SHELL:-s EXIT_RUNTIME=0"
        "SHELL:-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','addFunction','removeFunction','FS','HEAP8','HEAPU8','HEAP16','HEAPU16','HEAP32','HEAPU32','HEAPF32','HEAPF64']"
        "SHELL:-s EXPORTED_FUNCTIONS=['_main','_jsvm_dispatch_callback']"
        "SHELL:-s ALLOW_TABLE_GROWTH=1"
        "SHELL:-s USE_LIBJPEG=1"
        "SHELL:-s USE_LIBPNG=1"
        "SHELL:-s USE_SQLITE3=1"
        "SHELL:--preload-file ${SIMULATOR_ROOT}/main.js@main.js"
        "SHELL:--preload-file ${SIMULATOR_ROOT}/project.json@project.json"
        "SHELL:--preload-file ${SIMULATOR_ROOT}/jsb-adapter@jsb-adapter"
        "SHELL:--shell-file ${CMAKE_CURRENT_LIST_DIR}/proj.wasm/index.html"
    )

    # Debug vs Release flags
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        list(APPEND EMSCRIPTEN_COMPILE_FLAGS
            -O1
            -g3
        )
        list(APPEND EMSCRIPTEN_LINK_FLAGS
            -O1
            -g3
            "SHELL:-s ASSERTIONS=2"
            "SHELL:-s GL_ASSERTIONS=1"
        )
    else()
        list(APPEND EMSCRIPTEN_COMPILE_FLAGS
            -O3
        )
        list(APPEND EMSCRIPTEN_LINK_FLAGS
            -O3
            "SHELL:-s ASSERTIONS=0"
            "SHELL:--closure 1"
        )
    endif()

    # Apply flags to target
    target_compile_options(${LIB_NAME} PRIVATE ${EMSCRIPTEN_COMPILE_FLAGS})
    target_link_options(${LIB_NAME} PRIVATE ${EMSCRIPTEN_LINK_FLAGS})

    # Set output file extension
    set_target_properties(${LIB_NAME} PROPERTIES SUFFIX ".html")
endif()