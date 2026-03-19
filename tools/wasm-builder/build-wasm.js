/**
 * WASM 工程生成器（仅生成 CMake 工程，不生成 data、不执行编译）
 *
 * 步骤：
 *   1. 从引擎模板拷贝 native/engine/common 与 native/engine/wasm（若缺失）
 *   2. 写入 build/wasm/cocos.compile.config.json 与 build/wasm/proj/cfg.cmake
 *   3. 拷贝 data-preview-editor.html 到 build/wasm/（与 proj 同级），用于预览/编辑 .data 包
 *   4. CMake configure（-S native/engine/wasm -B build/wasm/proj）
 *   5. 若存在 shell.html.ejs，生成 proj 下的 HTML 壳文件
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
    const nativePrjDir = ps.join(buildDir, 'proj');
    const nativeTemplateDir = ps.join(opts.enginePath, 'templates', 'wasm');
    const commonTemplateDir = ps.join(opts.enginePath, 'templates', 'common');
    const commonDirInPrj = ps.join(opts.projectPath, 'native', 'engine', 'common');
    const platformDirInPrj = ps.join(opts.projectPath, 'native', 'engine', 'wasm');

    return {
        buildDir,
        dataDir,
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

/** 拷贝 .data 预览编辑工具到 build/wasm/（与 proj 目录同级） */
function copyDataPreviewEditor(opts, paths) {
    const src = ps.join(__dirname, 'data-preview-editor.html');
    if (!fs.existsSync(src)) {
        console.warn(`[wasm-builder] data-preview-editor.html not found at ${src}, skip`);
        return;
    }
    let html = fs.readFileSync(src, 'utf8');
    const defaultDataFile = `${opts.executableName}.data`;
    html = html.replace(/__DEFAULT_DATA_FILE__/g, defaultDataFile);
    const outPath = ps.join(paths.buildDir, 'data-preview-editor.html');
    fs.ensureDirSync(paths.buildDir);
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
            shell: true,
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
    ];

    await runCommand(opts.cmakePath, cmakeArgs, paths.buildDir);
    console.log('[wasm-builder] CMake configure completed');
}

async function main() {
    const opts = parseArgs();
    if (opts.help) {
        console.log('Usage: node build-wasm.js <project-path> [options]');
        console.log('');
        console.log('仅生成 WASM CMake 工程（模板 + cocos.compile.config.json + cfg.cmake + cmake 配置）。');
        console.log('不生成 build/wasm/data，不执行编译或运行。');
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
