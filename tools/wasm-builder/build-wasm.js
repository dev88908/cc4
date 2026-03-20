/**
 * WASM 工程生成器（生成 data + CMake 工程，不执行编译）
 *
 * 步骤：
 *   1. 从引擎模板拷贝 native/engine/common 与 native/engine/wasm（若缺失）
 *   2. 从 Windows 构建产物复制资源到 build/wasm/data，并在复制时修补 main.js
 *   3. 写入 build/wasm/cocos.compile.config.json 与 build/wasm/proj/cfg.cmake
 *   4. 拷贝 data-preview-editor.html 到 build/wasm/proj/，用于预览/编辑 .data 包
 *   5. CMake configure（-S native/engine/wasm -B build/wasm/proj）
 *   6. 若存在 shell.html.ejs，生成 proj 下的 HTML 壳文件
 *
 * Usage:
 *   node build-wasm.js <project-path> [options]
 *
 * Options:
 *   --engine <path>     引擎根目录（默认：本仓库 ../../）
 *   --emsdk <path>      EMSDK 根目录（默认：环境变量 EMSDK）
 *   --debug             Debug 配置
 *   --executable <name> 可执行/产物名（默认：项目文件夹名）
 *   --cmake <path>      cmake 可执行文件（默认：cmake）
 *   --gles3             启用 GLES3（默认开启）
 *   --gles2             启用 GLES2（默认关闭）
 *   --help, -h          帮助
 */

const ps = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const { spawn } = require('child_process');

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        projectPath: null,
        enginePath: ps.resolve(__dirname, '../../'),
        emsdkPath: process.env.EMSDK || '',
        debug: false,
        executableName: null,
        cmakePath: 'cmake',
        gles3: true,
        gles2: false,
        help: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--engine':
                opts.enginePath = ps.resolve(args[++i]);
                break;
            case '--emsdk':
                opts.emsdkPath = ps.resolve(args[++i]);
                break;
            case '--debug':
                opts.debug = true;
                break;
            case '--help':
            case '-h':
                opts.help = true;
                break;
            case '--executable':
                opts.executableName = args[++i];
                break;
            case '--cmake':
                opts.cmakePath = args[++i];
                break;
            case '--gles3':
                opts.gles3 = true;
                break;
            case '--gles2':
                opts.gles2 = true;
                break;
            default:
                if (!arg.startsWith('--') && !opts.projectPath) {
                    opts.projectPath = ps.resolve(arg);
                } else {
                    console.warn(`Unknown argument: ${arg}`);
                }
        }
    }

    if (opts.help) {
        return opts;
    }

    if (!opts.projectPath) {
        console.error('Error: Project path is required.');
        console.error('Usage: node build-wasm.js <project-path> [options]');
        process.exit(1);
    }

    if (!opts.executableName) {
        opts.executableName = ps.basename(opts.projectPath);
    }

    return opts;
}

function fixPath(p) {
    return p.replace(/\\/g, '/');
}

function getBuildPaths(opts) {
    const buildDir = ps.join(opts.projectPath, 'build', 'wasm');
    const dataDir = ps.join(buildDir, 'data');
    const buildRoot = ps.dirname(buildDir);
    const nativePrjDir = ps.join(buildDir, 'proj');
    const nativeTemplateDir = ps.join(opts.enginePath, 'templates', 'wasm');
    const commonTemplateDir = ps.join(opts.enginePath, 'templates', 'common');
    const commonDirInPrj = ps.join(opts.projectPath, 'native', 'engine', 'common');
    const platformDirInPrj = ps.join(opts.projectPath, 'native', 'engine', 'wasm');

    return {
        buildDir,
        dataDir,
        buildRoot,
        nativePrjDir,
        nativeTemplateDir,
        commonTemplateDir,
        commonDirInPrj,
        platformDirInPrj,
    };
}

function generateCompileConfig(opts, paths) {
    const shellTemplatePath = ps.join(opts.enginePath, 'templates', 'wasm', 'shell.html.ejs');
    const hasCustomShell = fs.existsSync(shellTemplatePath);

    return {
        platform: 'wasm',
        platformName: 'wasm',
        enginePath: fixPath(opts.enginePath),
        nativeEnginePath: fixPath(opts.enginePath),
        projDir: fixPath(opts.projectPath),
        buildDir: fixPath(paths.buildDir),
        buildAssetsDir: fixPath(paths.dataDir),
        projectName: opts.executableName,
        executableName: opts.executableName,
        debug: opts.debug,
        cmakePath: opts.cmakePath,
        encrypted: false,
        compressZip: false,
        useCustomShell: hasCustomShell,
        cMakeConfig: {
            CC_USE_GLES3: opts.gles3,
            CC_USE_GLES2: opts.gles2,
            USE_SERVER_MODE: 'set(USE_SERVER_MODE OFF)',
            NET_MODE: 'set(NET_MODE 0)',
            XXTEAKEY: '',
            COCOS_X_PATH: `set(COCOS_X_PATH "${fixPath(opts.enginePath)}")`,
        },
        platformParams: {
            emscriptenPath: fixPath(opts.emsdkPath),
        },
    };
}

function generateCMakeConfigFile(compileConfig, outputPath) {
    const config = compileConfig.cMakeConfig;
    let content = '';
    for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'boolean') {
            content += `set(${key} ${value ? 'ON' : 'OFF'})\n`;
        } else if (typeof value === 'string') {
            content += `${value}\n`;
        }
    }
    fs.ensureDirSync(ps.dirname(outputPath));
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[wasm-builder] Generated cfg.cmake at ${outputPath}`);
}

function getRequiredDataFiles() {
    return [
        'main.js',
        ps.join('src', 'settings.json'),
        ps.join('src', 'system.bundle.js'),
        ps.join('assets', 'main', 'cc.config.json'),
        ps.join('assets', 'internal', 'index.js'),
        ps.join('src', 'chunks', 'bundle.js'),
        ps.join('jsb-adapter', 'web-adapter.js'),
        ps.join('jsb-adapter', 'engine-adapter.js'),
    ];
}

function getMissingFiles(rootDir, requiredFiles) {
    return requiredFiles.filter((relativePath) => !fs.existsSync(ps.join(rootDir, relativePath)));
}

/**
 * 检查目录中是否存在指定文件（支持带哈希的文件名）
 * 例如: cc.config.json 或 cc.config.abc123.json
 */
function fileExistsWithHashSupport(rootDir, relativePath) {
    const fullPath = ps.join(rootDir, relativePath);
    if (fs.existsSync(fullPath)) {
        return true;
    }
    // 支持带哈希的文件名 (e.g., cc.config.abc123.json)
    const dir = ps.dirname(fullPath);
    const basename = ps.basename(fullPath);
    const ext = ps.extname(basename);
    const nameWithoutExt = ps.basename(basename, ext);

    if (!fs.existsSync(dir)) {
        return false;
    }
    const files = fs.readdirSync(dir);
    const regex = new RegExp(`^${nameWithoutExt}\\.[a-f0-9]+${ext}$`);
    return files.some((f) => regex.test(f));
}

function isValidWasmDataSource(rootDir) {
    if (!rootDir || !fs.existsSync(rootDir)) {
        return false;
    }
    const requiredFiles = [
        'main.js',
        ps.join('assets', 'main', 'cc.config.json'),
        ps.join('assets', 'internal', 'index.js'),
    ];
    return requiredFiles.every((f) => fileExistsWithHashSupport(rootDir, f));
}

function validateDataDir(dataDir) {
    const requiredFiles = getRequiredDataFiles();
    const missingFiles = requiredFiles.filter((f) => !fileExistsWithHashSupport(dataDir, f));
    if (missingFiles.length > 0) {
        throw new Error(
            `[wasm-builder] Incomplete wasm data directory at ${dataDir}. Missing: ${missingFiles.join(', ')}`
        );
    }
}

function copyBuiltinJsbAdapter(opts, dataDir) {
    const adapterDir = ps.join(dataDir, 'jsb-adapter');
    const sourceDir = ps.join(opts.enginePath, 'adapter', 'native');
    const requiredFiles = ['web-adapter.js', 'engine-adapter.js'];

    if (!fs.existsSync(sourceDir)) {
        console.warn(`[wasm-builder] Builtin jsb-adapter directory not found: ${sourceDir}`);
        return;
    }

    fs.ensureDirSync(adapterDir);
    for (const fileName of requiredFiles) {
        const sourcePath = ps.join(sourceDir, fileName);
        const targetPath = ps.join(adapterDir, fileName);
        if (fs.existsSync(sourcePath)) {
            fs.copySync(sourcePath, targetPath);
            console.log(`[wasm-builder] Copied builtin adapter: ${fileName}`);
        }
    }
}

/**
 * 查找带哈希的文件并返回实际的文件名
 */
function findHashedFile(dataDir, relativePath) {
    const fullPath = ps.join(dataDir, relativePath);
    if (fs.existsSync(fullPath)) {
        return relativePath;
    }
    const dir = ps.dirname(fullPath);
    const basename = ps.basename(fullPath);
    const ext = ps.extname(basename);
    const nameWithoutExt = ps.basename(basename, ext);

    if (!fs.existsSync(dir)) {
        return relativePath;
    }
    const files = fs.readdirSync(dir);
    const regex = new RegExp(`^${nameWithoutExt}\\.[a-f0-9]+${ext}$`);
    const match = files.find((f) => regex.test(f));
    if (!match) {
        return relativePath;
    }
    // 返回相对于 dataDir 的路径
    const relativeDir = ps.relative(dataDir, dir);
    return ps.join(relativeDir, match);
}

function patchMainJs(mainJsPath, dataDir) {
    if (!fs.existsSync(mainJsPath)) {
        throw new Error(`[wasm-builder] main.js not found at ${mainJsPath}`);
    }

    const content = fs.readFileSync(mainJsPath, 'utf8');
    if (content.includes('__WASM_BUILDER_INLINE_IMPORT_MAP__')) {
        console.log('[wasm-builder] main.js already patched, skip');
        return;
    }

    const legacyMarker = 'const importMapJson = jsb.fileUtils.getStringFromFile(';
    const legacyIndex = content.indexOf(legacyMarker);
    if (legacyIndex < 0) {
        console.log('[wasm-builder] main.js does not contain legacy import-map loader, skip');
        return;
    }

    const importMapMatch = content.match(/const importMapJson = jsb\.fileUtils\.getStringFromFile\((.+?)\);\s*const importMap = JSON\.parse\(importMapJson\);/s);
    const applicationMatch = content.match(/System\.import\((.+?)\)\s*\.then\(\(\{ Application \}\) => \{/s);
    if (!importMapMatch || !applicationMatch) {
        throw new Error(`[wasm-builder] Unable to patch legacy main.js at ${mainJsPath}`);
    }

    // 查找带哈希的实际文件名
    const bundleFile = findHashedFile(dataDir, 'src/chunks/bundle.js');
    const internalFile = findHashedFile(dataDir, 'assets/internal/index.js');
    const mainFile = findHashedFile(dataDir, 'assets/main/index.js');

    const prefix = content.slice(0, legacyIndex);
    const importMapFileExpr = importMapMatch[1].trim();
    const applicationJsExpr = applicationMatch[1].trim();
    const importMapFile = importMapFileExpr.replace(/^['"]|['"]$/g, '');
    const importMapPath = ps.join(dataDir, importMapFile);
    if (!fs.existsSync(importMapPath)) {
        throw new Error(`[wasm-builder] import-map file not found at ${importMapPath}`);
    }
    const importMap = fs.readJSONSync(importMapPath);
    const importMapLiteral = JSON.stringify(importMap, null, 2);

    const patched = `${prefix}const importMapFile = ${importMapFileExpr};
const importMap = ${importMapLiteral};
// __WASM_BUILDER_INLINE_IMPORT_MAP__

// 预加载 chunks 包，确保 System.register 在 import 前完成
try {
    require('${bundleFile}');
    require('${internalFile}');
    require('${mainFile}');
} catch (e) {
    console.warn('[WASM] Preload chunks:', e.message);
}

System.warmup({
    importMap,
    importMapUrl: importMapFile,
    defaultHandler: (urlNoSchema) => {
        const path = urlNoSchema.startsWith('/') ? urlNoSchema.substr(1) : urlNoSchema;
        let loadPath = path;
        if (path.includes('rollupPluginModLoBabelHelpers') || path.includes('BabelHelpers')) {
            loadPath = '${bundleFile}';
        } else if (path.includes('_virtual/main')) {
            loadPath = '${mainFile}';
        } else if (path.includes('builtin-pipeline') || path.includes('_virtual/internal')) {
            loadPath = '${internalFile}';
        }
        require(loadPath);
    },
});

System.import(${applicationJsExpr})
.then(({ Application }) => {
    return new Application();
}).then((application) => {
    return System.import('cc').then((cc) => {
        require('jsb-adapter/web-adapter.js');
        require('jsb-adapter/engine-adapter.js');
        return application.init(cc);
    }).then(() => {
        return application.start();
    });
}).catch((importErr) => {
    console.error(importErr.toString() + ', stack: ' + importErr.stack);
});
`;

    fs.writeFileSync(mainJsPath, patched, 'utf8');
    console.log(`[wasm-builder] Patched legacy main.js at ${mainJsPath}`);
}

/**
 * 查找带哈希的文件（支持如 application.js -> application.abc123.js）
 */
function findFileWithHashSupport(srcRoot, filename) {
    const fullPath = ps.join(srcRoot, filename);
    if (fs.existsSync(fullPath)) {
        return fullPath;
    }
    // 查找带哈希的文件
    const dir = ps.dirname(fullPath);
    const basename = ps.basename(fullPath);
    const ext = ps.extname(basename);
    const nameWithoutExt = ps.basename(basename, ext);

    if (!fs.existsSync(dir)) {
        return null;
    }
    const files = fs.readdirSync(dir);
    const regex = new RegExp(`^${nameWithoutExt}\\.[a-f0-9]+${ext}$`);
    const match = files.find((f) => regex.test(f));
    return match ? ps.join(dir, match) : null;
}

async function copyResourcesFrom(srcRoot, dataDir, copyResources) {
    for (const item of copyResources) {
        const srcPath = findFileWithHashSupport(srcRoot, item.from);
        if (!srcPath) {
            continue;
        }
        const dstFilename = item.to ? item.from : ps.basename(item.from);
        // 如果源文件有哈希，保留哈希文件名
        const srcBasename = ps.basename(srcPath);
        const dstPath = item.to ? ps.join(dataDir, item.to) : ps.join(dataDir, srcBasename);
        if (fs.existsSync(srcPath)) {
            fs.ensureDirSync(ps.dirname(dstPath));
            await fs.copy(srcPath, dstPath, { overwrite: true });
        }
    }
}

function mergeCopyResources(primaryResources, secondaryResources) {
    const merged = [];
    const seen = new Set();
    const append = (items) => {
        for (const item of items || []) {
            if (!item || !item.from) {
                continue;
            }
            const key = `${item.from}=>${item.to || ''}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            merged.push(item);
        }
    };
    append(primaryResources);
    append(secondaryResources);
    return merged;
}

async function loadCopyResources(opts, paths) {
    const projectBuildCfgPath = ps.join(paths.platformDirInPrj, 'build-cfg.json');
    const engineBuildCfgPath = ps.join(opts.enginePath, 'templates', 'wasm', 'build-cfg.json');

    const projectBuildCfg = fs.existsSync(projectBuildCfgPath) ? await fs.readJSON(projectBuildCfgPath) : {};
    const engineBuildCfg = fs.existsSync(engineBuildCfgPath) ? await fs.readJSON(engineBuildCfgPath) : {};

    const copyResources = mergeCopyResources(
        engineBuildCfg.copy_resources || [],
        projectBuildCfg.copy_resources || []
    );

    if (copyResources.length === 0) {
        throw new Error(
            `[wasm-builder] No copy_resources configured. Checked: ${engineBuildCfgPath}, ${projectBuildCfgPath}`
        );
    }

    console.log(`[wasm-builder] Using ${copyResources.length} copy_resources entries`);
    return copyResources;
}

async function copyPlatformBuildData(opts, paths) {
    const copyResources = await loadCopyResources(opts, paths);

    const isWindows = process.platform === 'win32';
    // WASM 使用 GLES 渲染，所以从 android 平台拷贝（而非 mac）
    const platformDataDir = isWindows ? 'windows' : 'android';
    const srcCandidates = [
        ps.join(paths.buildRoot, platformDataDir, 'data'),
        ps.join(paths.buildRoot, 'jsb-link'),
        ps.join(paths.buildRoot, 'native'),
    ];

    for (const srcRoot of srcCandidates) {
        if (isValidWasmDataSource(srcRoot)) {
            console.log(`[wasm-builder] Copying data from ${srcRoot} to ${paths.dataDir}`);
            fs.emptyDirSync(paths.dataDir);
            await copyResourcesFrom(srcRoot, paths.dataDir, copyResources);
            patchMainJs(ps.join(paths.dataDir, 'main.js'), paths.dataDir);
            copyBuiltinJsbAdapter(opts, paths.dataDir);
            validateDataDir(paths.dataDir);
            return;
        }
    }

    throw new Error(
        `[wasm-builder] No valid source found for wasm data copy. Tried: ${srcCandidates.join(', ')}`
    );
}

async function generateShellHtml(opts, paths) {
    console.log('[wasm-builder] Generating custom shell HTML...');

    const shellTemplatePath = ps.join(opts.enginePath, 'templates', 'wasm', 'shell.html.ejs');
    if (!fs.existsSync(shellTemplatePath)) {
        console.log('[wasm-builder] No custom shell template found, skip');
        return;
    }

    const templateStr = fs.readFileSync(shellTemplatePath, 'utf8');
    const rendered = ejs.render(templateStr, {
        title: opts.executableName,
        moduleName: opts.executableName,
    });

    const outPath = ps.join(paths.nativePrjDir, `${opts.executableName}.html`);
    fs.ensureDirSync(ps.dirname(outPath));
    fs.writeFileSync(outPath, rendered, 'utf8');
    console.log(`[wasm-builder] Generated shell HTML at ${outPath}`);
}

/** 拷贝 .data 预览编辑工具到 build/wasm/proj/ */
function copyDataPreviewEditor(opts, paths) {
    const src = ps.join(__dirname, 'data-preview-editor.html');
    if (!fs.existsSync(src)) {
        console.warn(`[wasm-builder] data-preview-editor.html not found at ${src}, skip`);
        return;
    }
    let html = fs.readFileSync(src, 'utf8');
    const defaultDataFile = `${opts.executableName}.data`;
    html = html.replace(/__DEFAULT_DATA_FILE__/g, defaultDataFile);
    const outPath = ps.join(paths.nativePrjDir, 'data-preview-editor.html');
    fs.ensureDirSync(paths.nativePrjDir);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`[wasm-builder] Copied data preview editor to ${outPath} (default data: ${defaultDataFile})`);
}

function runCommand(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`[wasm-builder] Running: ${cmd} ${args.join(' ')}`);
        console.log(`[wasm-builder]   cwd: ${cwd}`);

        const proc = spawn(cmd, args, {
            cwd,
            stdio: 'inherit',
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Command failed with exit code ${code}: ${cmd} ${args.join(' ')}`));
            }
        });

        proc.on('error', (err) => {
            reject(err);
        });
    });
}

async function stepCopyTemplates(opts, paths) {
    console.log('\n══════════════════════════════════════════');
    console.log('  Step: Copy Templates');
    console.log('══════════════════════════════════════════\n');

    if (!fs.existsSync(ps.join(paths.commonDirInPrj, 'CMakeLists.txt'))) {
        if (fs.existsSync(paths.commonTemplateDir)) {
            console.log(`[wasm-builder] Copying common template from ${paths.commonTemplateDir}`);
            await fs.copy(paths.commonTemplateDir, paths.commonDirInPrj, { overwrite: false });
        }
    } else {
        console.log('[wasm-builder] Common template already exists');
    }

    if (!fs.existsSync(paths.platformDirInPrj)) {
        if (fs.existsSync(paths.nativeTemplateDir)) {
            console.log(`[wasm-builder] Copying wasm template from ${paths.nativeTemplateDir}`);
            await fs.copy(paths.nativeTemplateDir, paths.platformDirInPrj, { overwrite: false });
        }
    } else {
        console.log('[wasm-builder] Platform template already exists');
    }
}

async function stepCreate(opts, paths, compileConfig) {
    console.log('\n══════════════════════════════════════════');
    console.log('  Step: Create (Template + Config)');
    console.log('══════════════════════════════════════════\n');

    await stepCopyTemplates(opts, paths);
    await copyPlatformBuildData(opts, paths);

    const configPath = ps.join(paths.buildDir, 'cocos.compile.config.json');
    fs.ensureDirSync(paths.buildDir);
    fs.writeJSONSync(configPath, compileConfig, { spaces: 2 });
    console.log(`[wasm-builder] Written compile config to ${configPath}`);

    const cfgCmakePath = ps.join(paths.nativePrjDir, 'cfg.cmake');
    generateCMakeConfigFile(compileConfig, cfgCmakePath);
}

async function stepGenerate(opts, paths, compileConfig) {
    console.log('\n══════════════════════════════════════════');
    console.log('  Step: Generate (CMake Configure)');
    console.log('══════════════════════════════════════════\n');

    const emsdkPath = compileConfig.platformParams.emscriptenPath;
    if (!emsdkPath || !fs.existsSync(emsdkPath)) {
        throw new Error(
            `EMSDK path not found: "${emsdkPath}". ` +
                'Set --emsdk <path> or the EMSDK environment variable.'
        );
    }

    const toolchainFile = ps.join(emsdkPath, 'upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake');
    if (!fs.existsSync(toolchainFile)) {
        throw new Error(`Emscripten toolchain file not found at ${toolchainFile}`);
    }

    const cmakeListsDir = paths.platformDirInPrj;
    if (!fs.existsSync(ps.join(cmakeListsDir, 'CMakeLists.txt'))) {
        throw new Error(`CMakeLists.txt not found at ${cmakeListsDir}`);
    }

    fs.ensureDirSync(paths.nativePrjDir);

    const generator = process.platform === 'win32' ? 'Ninja' : 'Unix Makefiles';
    const cmakeArgs = [
        `-S`,
        fixPath(cmakeListsDir),
        `-B`,
        fixPath(paths.nativePrjDir),
        `-DCMAKE_TOOLCHAIN_FILE=${fixPath(toolchainFile)}`,
        `-G`,
        generator,
        `-DRES_DIR=${fixPath(paths.buildDir)}`,
        `-DAPP_NAME=${compileConfig.projectName}`,
        `-DLAUNCH_TYPE=${compileConfig.debug ? 'Debug' : 'Release'}`,
        `-DCMAKE_BUILD_TYPE=${compileConfig.debug ? 'Debug' : 'Release'}`,
    ];

    await runCommand(opts.cmakePath, cmakeArgs, paths.buildDir);
    console.log('[wasm-builder] CMake configure completed');
}

async function main() {
    const opts = parseArgs();
    if (opts.help) {
        console.log('Usage: node build-wasm.js <project-path> [options]');
        console.log('');
        console.log('生成 WASM 数据目录与 CMake 工程（模板 + build/wasm/data + cocos.compile.config.json + cfg.cmake + cmake 配置）。');
        console.log('不执行编译或运行。');
        console.log('');
        console.log('Options:');
        console.log('  --engine <path>      Engine root path');
        console.log('  --emsdk <path>       EMSDK path');
        console.log('  --debug              Debug CMake config');
        console.log('  --executable <name>  Output / project name');
        console.log('  --cmake <path>       CMake executable');
        console.log('  --gles3              Enable GLES3 (default)');
        console.log('  --gles2              Enable GLES2');
        console.log('  --help, -h           Show this help');
        return;
    }

    const paths = getBuildPaths(opts);
    const compileConfig = generateCompileConfig(opts, paths);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║    Cocos WASM Project Generator          ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`  Project:    ${opts.projectPath}`);
    console.log(`  Engine:     ${opts.enginePath}`);
    console.log(`  EMSDK:      ${opts.emsdkPath}`);
    console.log(`  Build Dir:  ${paths.buildDir}`);
    console.log(`  Debug:      ${opts.debug}`);
    console.log(`  Executable: ${opts.executableName}`);
    console.log('');

    await stepCreate(opts, paths, compileConfig);
    copyDataPreviewEditor(opts, paths);
    await stepGenerate(opts, paths, compileConfig);
    await generateShellHtml(opts, paths);

    console.log('\n[wasm-builder] WASM project generation completed.');
}

main().catch((err) => {
    console.error('\n[wasm-builder] Failed:');
    console.error(err.message || err);
    process.exit(1);
});
