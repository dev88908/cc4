
macro(cc_wasm_before_target _target_name)

    if((NOT DEFINED CC_EXECUTABLE_NAME) OR "${CC_EXECUTABLE_NAME}" STREQUAL "")
        if(${APP_NAME} MATCHES "^[_0-9a-zA-Z-]+$")
            set(CC_EXECUTABLE_NAME ${APP_NAME})
        else()
            set(CC_EXECUTABLE_NAME CocosGame)
        endif()
    endif()

    cc_include_resources(${RES_DIR}/data CC_ASSET_FILES)

    source_group(TREE ${RES_DIR}/data PREFIX "Resources" FILES ${CC_ASSET_FILES})
    source_group(TREE ${CC_PROJECT_DIR} PREFIX "Source Files" FILES ${CC_PROJ_SOURCES})
    source_group(TREE ${CC_PROJECT_DIR}/../common PREFIX "Source Files" FILES ${CC_COMMON_SOURCES})

    list(APPEND CC_PROJ_SOURCES
        ${CC_PROJECT_DIR}/main.cpp
    )

    list(APPEND CC_ALL_SOURCES ${CC_PROJ_SOURCES}
        ${CC_COMMON_SOURCES}
        ${CC_ASSET_FILES}
    )
    cc_common_before_target(${CC_EXECUTABLE_NAME})
endmacro()

macro(cc_wasm_after_target _target_name)
    target_link_libraries(${CC_EXECUTABLE_NAME} ${ENGINE_NAME})

    target_include_directories(${CC_EXECUTABLE_NAME} PRIVATE
        ${CC_PROJECT_DIR}/../common/Classes
    )

    set_target_properties(${CC_EXECUTABLE_NAME} PROPERTIES
        SUFFIX ".html"
    )

    target_link_options(${CC_EXECUTABLE_NAME} PRIVATE
        "SHELL:-s ALLOW_MEMORY_GROWTH=1"
        "SHELL:-s INITIAL_MEMORY=134217728"
        "SHELL:-s STACK_SIZE=5242880"  # 5MB, same as simulator; 1MB was too small for JSVM
        "SHELL:-s WASM=1"
        "SHELL:-s FULL_ES3=1"
        "SHELL:-s USE_WEBGL2=1"
        "SHELL:-s MIN_WEBGL_VERSION=2"
        "SHELL:-s MAX_WEBGL_VERSION=2"
        "SHELL:-s FETCH=1"
        "SHELL:-s FORCE_FILESYSTEM=1"
        "SHELL:-s ALLOW_TABLE_GROWTH=1"
        "SHELL:-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','addFunction','removeFunction','FS','HEAP8','HEAPU8','HEAP16','HEAPU16','HEAP32','HEAPU32','HEAPF32','HEAPF64']"
        "SHELL:-s EXPORTED_FUNCTIONS=['_main','_jsvm_dispatch_callback']"
    )
    # Only add preload when data dir exists and has content (file_packager fails on empty dir)
    if(EXISTS "${RES_DIR}/data/main.js")
        target_link_options(${CC_EXECUTABLE_NAME} PRIVATE
            "SHELL:--preload-file ${RES_DIR}/data@/"
        )
    else()
        message(FATAL_ERROR "WASM: RES_DIR/data is empty or missing main.js. Run 'create' first (requires Windows build output at build/windows/data). RES_DIR=${RES_DIR}")
    endif()

    if(NOT CMAKE_BUILD_TYPE STREQUAL "Debug")
        target_link_options(${CC_EXECUTABLE_NAME} PRIVATE
            "SHELL:-O2"
        )
        target_compile_options(${CC_EXECUTABLE_NAME} PRIVATE -O2)
    else()
        target_link_options(${CC_EXECUTABLE_NAME} PRIVATE
            "SHELL:-s ASSERTIONS=2"
            "SHELL:-s SAFE_HEAP=1"
            "SHELL:-g"
        )
    endif()

    cc_common_after_target(${CC_EXECUTABLE_NAME})
endmacro()
