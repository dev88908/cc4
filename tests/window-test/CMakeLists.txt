cmake_minimum_required(VERSION 3.8)

set(APP_NAME WindowTest)
project(${APP_NAME} CXX)

enable_language(C ASM)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Disable features we don't need for a simple window test
option(USE_SE_V8        "USE V8 JavaScript Engine"          OFF)
option(USE_V8_DEBUGGER  "Enable Chrome Remote inspector"    OFF)
option(USE_SOCKET       "Enable WebSocket & SocketIO"       OFF)
option(USE_AUDIO        "Enable Audio"                      OFF)
option(USE_EDIT_BOX     "Enable EditBox"                    OFF)
option(USE_VIDEO        "Enable VideoPlayer Component"      OFF)
option(USE_WEBVIEW      "Enable WebView Component"          OFF)
option(USE_MIDDLEWARE   "Enable Middleware"                 OFF)
option(USE_DRAGONBONES  "Enable Dragonbones"                OFF)
option(USE_SPINE        "Enable Spine"                      OFF)
option(USE_SPINE_3_8    "Enable Spine 3.8"                  OFF)
option(USE_SPINE_4_2    "Enable Spine 4.2"                  OFF)
option(USE_PHYSICS_PHYSX "USE PhysX Physics"                OFF)
option(USE_BOX2D_JSB    "USE Box2D JSB"                     OFF)
option(USE_PLUGINS      "Enable Plugins"                    OFF)
option(USE_DEBUG_RENDERER "Enable Debug Renderer"           OFF)
option(USE_GEOMETRY_RENDERER "Enable Geometry Renderer"     OFF)
option(USE_OCCLUSION_QUERY "Enable Occlusion Query"         OFF)
option(USE_WEBP         "Enable WebP"                       OFF)

set(cocosdir ${CMAKE_CURRENT_LIST_DIR}/../..)
if(NOT cocosdir)
    message(FATAL_ERROR "COCOS_ROOT is not set!")
endif()

include(${cocosdir}/CMakeLists.txt)

set(PROJ_SOURCES
    main.cpp
    Game.cpp
    Game.h
)

if(WINDOWS)
    # Windows specific settings
    set(UI_RESOURCES)
    add_executable(${APP_NAME} WIN32 ${PROJ_SOURCES} ${UI_RESOURCES})
    
    target_compile_definitions(${APP_NAME} PRIVATE
        GAME_NAME="${APP_NAME}"
        WIN32
        _WIN32
        _WINDOWS
        NOMINMAX
        UNICODE
        _UNICODE
    )
    
    if(MSVC)
        target_link_options(${APP_NAME} PRIVATE /SUBSYSTEM:WINDOWS)
        
        # Copy DLLs
        foreach(item ${WINDOWS_DLLS})
            get_filename_component(filename ${item} NAME)
            get_filename_component(abs ${item} ABSOLUTE)
            add_custom_command(TARGET ${APP_NAME} POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy_if_different ${abs} $<TARGET_FILE_DIR:${APP_NAME}>/${filename}
            )
        endforeach()
    endif()
else()
    add_executable(${APP_NAME} ${PROJ_SOURCES})
endif()

target_link_libraries(${APP_NAME} ${ENGINE_NAME})
target_include_directories(${APP_NAME} PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}
    ${cocosdir}/cocos
)

