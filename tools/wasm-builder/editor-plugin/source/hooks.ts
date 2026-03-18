/**
 * WASM Builder Hooks
 * 
 * Build lifecycle for native platforms:
 *   onBeforeBuild -> onBeforeInit -> onAfterInit -> onBeforeBuildAssets ->
 *   onAfterBuildAssets -> onBeforeCompressSettings -> onAfterCompressSettings ->
 *   onAfterBuild -> [make stage] -> [run stage]
 * 
 * The key hooks for WASM native build:
 *   - onAfterInit:   Generate cocosParams and write cocos.compile.config.json
 *   - onAfterBuild:  Post-process build output
 *   - onBeforeMake:  Pre-make setup
 *   - make:          Execute native-pack-tool create/generate/make
 *   - onAfterMake:   Post-make cleanup
 */

import { BuildHook, IBuildResult, ITaskOptions } from '../@types';
import * as fs from 'fs-extra';
import * as path from 'path';

const PACKAGE_NAME = 'wasm-builder';

function log(...args: any[]) {
    console.log(`[${PACKAGE_NAME}]`, ...args);
}

export const throwError: BuildHook.throwError = true;

// ─────────────────────── Build Phase Hooks ───────────────────────

export const onBeforeBuild: BuildHook.onBeforeBuild = async function (
    options: ITaskOptions,
    result: IBuildResult
) {
    log('onBeforeBuild - platform:', options.platform);
};

export const onAfterCompressSettings: BuildHook.onAfterCompressSettings = async function (
    options: ITaskOptions,
    result: IBuildResult
) {
    log('onAfterCompressSettings');
};

export const onAfterBuild: BuildHook.onAfterBuild = async function (
    options: ITaskOptions,
    result: IBuildResult
) {
    log('onAfterBuild');
    log('  Build output:', result.dest);
    log('  Settings:', result.paths?.settings);

    // For WASM, we need to ensure the data directory has all required files
    const dataDir = path.join(result.dest, 'data');
    if (fs.existsSync(dataDir)) {
        const mainJs = path.join(dataDir, 'main.js');
        if (fs.existsSync(mainJs)) {
            log('  main.js found in data directory');
        } else {
            log('  WARNING: main.js not found in data directory');
        }
    }

    // Write/update cocos.compile.config.json if compileConfig path exists
    if (result.paths?.compileConfig) {
        const cocosParams = buildCocosParams(options, result);
        await fs.outputJSON(result.paths.compileConfig, cocosParams, { spaces: 2 });
        log('  Written cocos.compile.config.json');
    }
};

// ─────────────────────── Make/Run Phase Hooks ───────────────────────

export const onBeforeMake: BuildHook.onBeforeMake = async function (
    root: string,
    options: ITaskOptions
) {
    log('onBeforeMake');
    log('  root:', root);
};

export const onAfterMake: BuildHook.onAfterMake = async function (
    root: string,
    options: ITaskOptions
) {
    log('onAfterMake');

    const projDir = path.join(root, 'proj');
    const execName = options.name || 'CocosGame';

    const htmlFile = path.join(projDir, `${execName}.html`);
    const jsFile = path.join(projDir, `${execName}.js`);
    const wasmFile = path.join(projDir, `${execName}.wasm`);

    log('  Build outputs:');
    log(`    HTML: ${fs.existsSync(htmlFile) ? 'OK' : 'NOT FOUND'}`);
    log(`    JS:   ${fs.existsSync(jsFile) ? 'OK' : 'NOT FOUND'}`);
    log(`    WASM: ${fs.existsSync(wasmFile) ? 'OK' : 'NOT FOUND'}`);
};

export const onError: BuildHook.onError = async function (options, result) {
    log('Build error occurred');
};

export const load: BuildHook.load = async function () {
    log('Hooks loaded');
};

export const unload: BuildHook.unload = async function () {
    log('Hooks unloaded');
};

// ─────────────────────── Helper Functions ───────────────────────

function fixPath(p: string): string {
    return p.replace(/\\/g, '/');
}

interface CocosCompileConfig {
    platform: string;
    platformName: string;
    enginePath: string;
    nativeEnginePath: string;
    projDir: string;
    buildDir: string;
    buildAssetsDir: string;
    projectName: string;
    executableName: string;
    debug: boolean;
    cmakePath: string;
    encrypted: boolean;
    compressZip: boolean;
    cMakeConfig: Record<string, any>;
    platformParams: Record<string, any>;
}

function buildCocosParams(
    options: ITaskOptions,
    result: IBuildResult
): CocosCompileConfig {
    const pkgOpts = options.packages?.[PACKAGE_NAME] || {};
    const emscriptenPath = pkgOpts.emscriptenPath || process.env.EMSDK || '';

    const enginePath = (options as any).engineInfo?.typescript?.path
        || (options as any).engineInfo?.native?.path
        || '';

    const nativeEnginePath = (options as any).engineInfo?.native?.path || enginePath;

    const config: CocosCompileConfig = {
        platform: 'wasm',
        platformName: 'wasm',
        enginePath: fixPath(enginePath),
        nativeEnginePath: fixPath(nativeEnginePath),
        projDir: fixPath(path.dirname(result.dest)),
        buildDir: fixPath(result.dest),
        buildAssetsDir: fixPath(path.join(result.dest, 'data')),
        projectName: options.name || 'CocosGame',
        executableName: options.name || 'CocosGame',
        debug: options.debug || false,
        cmakePath: 'cmake',
        encrypted: false,
        compressZip: false,
        cMakeConfig: {
            CC_USE_GLES3: true,
            CC_USE_GLES2: false,
            USE_SERVER_MODE: 'set(USE_SERVER_MODE OFF)',
            NET_MODE: 'set(NET_MODE 0)',
            XXTEAKEY: '',
            COCOS_X_PATH: `set(COCOS_X_PATH "${fixPath(nativeEnginePath)}")`,
        },
        platformParams: {
            emscriptenPath: fixPath(emscriptenPath),
        },
    };

    return config;
}
