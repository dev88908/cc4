/**
 * Standalone WASM Builder for Cocos Creator Projects
 *
 * Generates the `data/` directory independently from project source files
 * and engine code, then invokes native-pack-tool for CMake build.
 *
 * Usage:
 *   node build-wasm.js <project-path> [options]
 *
 * Options:
 *   --engine <path>       Engine root path (defaults to ../../)
 *   --editor-engine <path> Editor engine path (for pre-built adapters / ccbuild)
 *   --emsdk <path>        EMSDK path (defaults to $EMSDK env)
 *   --debug               Build in Debug mode
 *   --clean               Clean build directory before building
 *   --skip-create         Skip create step (template copy)
 *   --skip-generate       Skip CMake generate step
 *   --skip-make           Skip CMake build step
 *   --skip-data           Skip data generation (use existing data/)
 *   --run                 Run the built project after make
 *   --source <path>       Source data directory (fallback copy)
 *   --executable <name>   Executable name (defaults to project folder name)
 *   --cmake <path>        CMake executable path
 *   --gles3               Enable GLES3 (default: true)
 *   --gles2               Enable GLES2 (default: false)
 *
 * Examples:
 *   node build-wasm.js D:\work\myProject
 *   node build-wasm.js D:\work\myProject --emsdk D:\devlib\emsdk --debug --run
 */

const ps = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const { spawn } = require('child_process');

// ─────────────────────── Constants ───────────────────────

const DEFAULT_EDITOR_ENGINE = 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine';
const EDITOR_ASAR_ROOT = 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.extracted';
const ENGINE_VERSION = '3.8.8';

// ─────────────────────── Argument Parsing ───────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        projectPath: null,
        enginePath: ps.resolve(__dirname, '../../'),
        editorEnginePath: DEFAULT_EDITOR_ENGINE,
        emsdkPath: process.env.EMSDK || '',
        debug: false,
        clean: false,
        skipCreate: false,
        skipGenerate: false,
        skipMake: false,
        skipData: false,
        run: false,
        sourceDataDir: null,
        executableName: null,
        cmakePath: 'cmake',
        gles3: true,
        gles2: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--engine': opts.enginePath = ps.resolve(args[++i]); break;
            case '--editor-engine': opts.editorEnginePath = ps.resolve(args[++i]); break;
            case '--emsdk': opts.emsdkPath = ps.resolve(args[++i]); break;
            case '--debug': opts.debug = true; break;
            case '--clean': opts.clean = true; break;
            case '--skip-create': opts.skipCreate = true; break;
            case '--skip-generate': opts.skipGenerate = true; break;
            case '--skip-make': opts.skipMake = true; break;
            case '--skip-data': opts.skipData = true; break;
            case '--run': opts.run = true; break;
            case '--source': opts.sourceDataDir = ps.resolve(args[++i]); break;
            case '--executable': opts.executableName = args[++i]; break;
            case '--cmake': opts.cmakePath = args[++i]; break;
            case '--gles3': opts.gles3 = true; break;
            case '--gles2': opts.gles2 = true; break;
            default:
                if (!arg.startsWith('--') && !opts.projectPath) {
                    opts.projectPath = ps.resolve(arg);
                } else {
                    console.warn(`Unknown argument: ${arg}`);
                }
        }
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

// ─────────────────────── Path Helpers ───────────────────────

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

// ─────────────────────── Config Generation ───────────────────────

function generateCompileConfig(opts, paths) {
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
            content += value + '\n';
        }
    }
    fs.ensureDirSync(ps.dirname(outputPath));
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[wasm-builder] Generated cfg.cmake at ${outputPath}`);
}

// ─────────────────────── Project Settings Reader ───────────────────────

function readProjectSettings(projectPath) {
    const settingsDir = ps.join(projectPath, 'settings', 'v2', 'packages');
    const result = { engine: {}, project: {}, builder: {}, device: {} };

    const files = ['engine', 'project', 'builder', 'device'];
    for (const name of files) {
        const filePath = ps.join(settingsDir, `${name}.json`);
        if (fs.existsSync(filePath)) {
            result[name] = fs.readJSONSync(filePath);
        }
    }
    return result;
}

function getIncludeModules(projectSettings) {
    try {
        const engineConfig = projectSettings.engine;
        const globalKey = engineConfig.modules?.globalConfigKey || 'defaultConfig';
        const config = engineConfig.modules?.configs?.[globalKey];
        if (config?.includeModules) {
            return config.includeModules;
        }
    } catch (e) { /* fallback */ }

    return [
        'base', '2d', 'ui', 'animation', 'audio', 'tween', 'profiler',
        'gfx-webgl', 'gfx-webgl2',
    ];
}

// ─────────────────────── Data Generation Pipeline ───────────────────────

/**
 * Phase 1: Template rendering and file copying
 */
async function generateMainJs(opts, paths) {
    console.log('[data-gen] Rendering main.js from EJS template...');

    const templatePath = ps.join(opts.enginePath, 'templates', 'native', 'index.ejs');
    const templateStr = fs.readFileSync(templatePath, 'utf8');

    const rendered = ejs.render(templateStr, {
        polyfillsBundleFile: null,
        systemJsBundleFile: 'src/system.bundle.js',
        importMapFile: 'src/import-map.json',
        applicationJs: './application.js',
    });

    const outPath = ps.join(paths.dataDir, 'main.js');
    fs.ensureDirSync(ps.dirname(outPath));
    fs.writeFileSync(outPath, rendered, 'utf8');
    console.log(`[data-gen] Written: ${outPath}`);
}

async function generateApplicationJs(opts, paths) {
    console.log('[data-gen] Rendering application.js from EJS template...');

    const templatePath = ps.join(opts.enginePath, 'templates', 'launcher', 'application.ejs');
    const versionCheckTemplatePath = ps.join(opts.enginePath, 'templates', 'launcher', 'version-check.ejs');

    const templateStr = fs.readFileSync(templatePath, 'utf8');

    const rawRendered = ejs.render(templateStr, {
        settingsJsonPath: 'src/settings.json',
        showFPS: opts.debug,
        debugMode: opts.debug,
        versionCheckTemplate: versionCheckTemplatePath,
        renderMode: false,
        customVersion: ENGINE_VERSION,
        version: ENGINE_VERSION,
        versionTips: '',
    });

    const systemJsWrapped = wrapAsSystemJsModule(rawRendered);

    const outPath = ps.join(paths.dataDir, 'application.js');
    fs.writeFileSync(outPath, systemJsWrapped, 'utf8');
    console.log(`[data-gen] Written: ${outPath}`);
}

function wrapAsSystemJsModule(esModuleCode) {
    const exportMatch = esModuleCode.match(/export\s+class\s+(\w+)/);
    const className = exportMatch ? exportMatch[1] : 'Application';

    const bodyCode = esModuleCode
        .replace(/^let\s+cc;\s*$/m, '')
        .replace(/export\s+class/, 'class')
        .trim();

    return `System.register([], function (_export, _context) {
  "use strict";

  var ${className}, cc;
  _export("${className}", void 0);
  return {
    setters: [],
    execute: function () {
      _export("${className}", ${className} = ${bodyCode.replace(/^class/, 'class')});
    }
  };
});`;
}

async function copyJsbAdapter(opts, paths) {
    console.log('[data-gen] Copying jsb-adapter...');

    const adapterDir = ps.join(paths.dataDir, 'jsb-adapter');
    fs.ensureDirSync(adapterDir);

    const editorAdapterDir = ps.join(opts.editorEnginePath, 'bin', 'adapter', 'native');
    if (fs.existsSync(editorAdapterDir)) {
        const files = ['engine-adapter.js', 'web-adapter.js'];
        for (const file of files) {
            const src = ps.join(editorAdapterDir, file);
            const dest = ps.join(adapterDir, file);
            if (fs.existsSync(src)) {
                fs.copySync(src, dest);
                console.log(`[data-gen] Copied adapter: ${file}`);
            } else {
                console.warn(`[data-gen] WARNING: Adapter file not found: ${src}`);
            }
        }
    } else {
        console.warn(`[data-gen] WARNING: Editor adapter dir not found: ${editorAdapterDir}`);
        console.warn('[data-gen] jsb-adapter files need to be manually placed.');
    }
}

async function generateImportMap(paths) {
    console.log('[data-gen] Generating import-map.json...');

    const srcDir = ps.join(paths.dataDir, 'src');
    fs.ensureDirSync(srcDir);

    const importMap = { imports: { cc: './cocos-js/cc.js' } };
    const outPath = ps.join(srcDir, 'import-map.json');
    fs.writeJSONSync(outPath, importMap);
    console.log(`[data-gen] Written: ${outPath}`);
}

/**
 * Phase 2: Engine compilation
 */
async function buildEngineJs(opts, paths) {
    console.log('[data-gen] Building engine cc.js via @cocos/ccbuild...');

    const projectSettings = readProjectSettings(opts.projectPath);
    const includeModules = getIncludeModules(projectSettings);

    const ccbuildPath = ps.join(opts.editorEnginePath, 'node_modules', '@cocos', 'ccbuild');
    if (!fs.existsSync(ccbuildPath)) {
        console.warn(`[data-gen] WARNING: @cocos/ccbuild not found at ${ccbuildPath}`);
        console.warn('[data-gen] Attempting fallback: copy cc.js from existing build...');
        return tryFallbackCcJs(opts, paths);
    }

    const { buildEngine } = require(ccbuildPath);

    const outDir = ps.join(paths.dataDir, 'src', 'cocos-js');
    fs.ensureDirSync(outDir);

    const buildOptions = {
        engine: opts.editorEnginePath,
        out: outDir,
        platform: 'HTML5',
        mode: opts.debug ? 'PREVIEW' : 'BUILD',
        moduleFormat: 'system',
        compress: !opts.debug,
        split: false,
        features: includeModules,
        flags: {
            DEBUG: opts.debug,
        },
        nativeCodeBundleMode: 'wasm',
        sourceMap: opts.debug,
        enableNamedRegisterForSystemJSModuleFormat: true,
    };

    console.log(`[data-gen] Engine features: ${includeModules.join(', ')}`);
    console.log(`[data-gen] Output: ${outDir}`);

    try {
        await buildEngine(buildOptions);
        console.log('[data-gen] Engine build complete!');
    } catch (err) {
        console.error('[data-gen] Engine build failed:', err.message || err);
        console.warn('[data-gen] Attempting fallback: copy cc.js from existing build...');
        return tryFallbackCcJs(opts, paths);
    }
}

function tryFallbackCcJs(opts, paths) {
    const candidates = [
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'src', 'cocos-js', 'cc.js'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'src', 'cocos-js', 'cc.js'),
    ].filter(Boolean);

    for (const src of candidates) {
        if (fs.existsSync(src)) {
            const dest = ps.join(paths.dataDir, 'src', 'cocos-js', 'cc.js');
            fs.ensureDirSync(ps.dirname(dest));
            fs.copySync(src, dest);
            console.log(`[data-gen] Fallback: Copied cc.js from ${src}`);
            return;
        }
    }
    console.warn('[data-gen] WARNING: No cc.js found. The build may fail at runtime.');
}

async function generateSystemBundle(opts, paths) {
    console.log('[data-gen] Generating system.bundle.js...');

    const outPath = ps.join(paths.dataDir, 'src', 'system.bundle.js');
    fs.ensureDirSync(ps.dirname(outPath));

    const moduleSystemPath = ps.join(EDITOR_ASAR_ROOT, 'node_modules', '@cocos', 'module-system');
    if (fs.existsSync(moduleSystemPath)) {
        try {
            const { build } = require(ps.join(moduleSystemPath, 'dist', 'index.js'));
            await build({
                out: outPath,
                sourceMap: false,
                minify: !opts.debug,
                platform: 'wasm',
            });
            console.log(`[data-gen] system.bundle.js built successfully`);
            return;
        } catch (err) {
            console.warn(`[data-gen] @cocos/module-system build failed: ${err.message}`);
        }
    }

    const prebuiltCandidates = [
        ps.join(EDITOR_ASAR_ROOT, 'builtin', 'preview', 'static', 'simulator', 'system.bundle.js'),
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'src', 'system.bundle.js'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'src', 'system.bundle.js'),
    ].filter(Boolean);

    for (const src of prebuiltCandidates) {
        if (fs.existsSync(src)) {
            fs.copySync(src, outPath);
            console.log(`[data-gen] Copied system.bundle.js from: ${src}`);
            return;
        }
    }

    console.warn('[data-gen] WARNING: system.bundle.js not found. Runtime will fail.');
}

async function generateSettingsJson(opts, paths) {
    console.log('[data-gen] Generating settings.json...');

    const projectSettings = readProjectSettings(opts.projectPath);
    const includeModules = getIncludeModules(projectSettings);

    const builtinAssets = await getBuiltinAssetUuids(opts);
    const launchScene = await findLaunchScene(opts);

    const settings = {
        CocosEngine: ENGINE_VERSION,
        engine: {
            debug: opts.debug,
            platform: 'wasm',
            customLayers: [],
            sortingLayers: [],
            macros: {},
            builtinAssets,
        },
        animation: {
            customJointTextureLayouts:
                projectSettings.project?.custom_joint_texture_layouts || [],
        },
        assets: {
            server: '',
            remoteBundles: [],
            subpackages: [],
            preloadBundles: [{ bundle: 'main' }],
            bundleVers: {},
            preloadAssets: [],
            projectBundles: ['internal', 'main'],
            downloadMaxConcurrency: 15,
        },
        plugins: {
            jsList: [],
        },
        scripting: {
            scriptPackages: ['../chunks/bundle.js'],
        },
        launch: {
            launchScene: launchScene || 'db://assets/main.scene',
        },
        screen: {
            exactFitScreen: true,
            designResolution: { width: 1280, height: 720, policy: 4 },
        },
        rendering: {
            renderPipeline: '',
            customPipeline: includeModules.includes('custom-pipeline'),
            effectSettingsPath: 'src/effect.bin',
        },
        splashScreen: {
            displayRatio: 1,
            totalTime: 2000,
            logo: { type: 'default', base64: '' },
            background: {
                type: 'default',
                color: { x: 0.016, y: 0.035, z: 0.039, w: 0.004 },
            },
            watermarkLocation: 'default',
            autoFit: true,
        },
        physics: {
            physicsEngine: '',
            gravity: { x: 0, y: -10, z: 0 },
            allowSleep: true,
            sleepThreshold: 0.1,
            autoSimulation: true,
            fixedTimeStep: 0.0166667,
            maxSubSteps: 1,
            defaultMaterial: '',
        },
    };

    const outPath = ps.join(paths.dataDir, 'src', 'settings.json');
    fs.ensureDirSync(ps.dirname(outPath));
    fs.writeJSONSync(outPath, settings);
    console.log(`[data-gen] Written: ${outPath}`);
}

async function getBuiltinAssetUuids(opts) {
    const settingsCandidate = [
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'src', 'settings.json'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'src', 'settings.json'),
    ].filter(Boolean);

    for (const src of settingsCandidate) {
        if (fs.existsSync(src)) {
            try {
                const existing = fs.readJSONSync(src);
                if (existing.engine?.builtinAssets) {
                    return existing.engine.builtinAssets;
                }
            } catch (e) { /* continue */ }
        }
    }
    return [];
}

async function findLaunchScene(opts) {
    const assetsDir = ps.join(opts.projectPath, 'assets');
    if (!fs.existsSync(assetsDir)) return null;

    const sceneFiles = [];
    function findScenes(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = ps.join(dir, entry.name);
            if (entry.isDirectory()) {
                findScenes(fullPath);
            } else if (entry.name.endsWith('.scene')) {
                sceneFiles.push(fullPath);
            }
        }
    }
    findScenes(assetsDir);

    if (sceneFiles.length > 0) {
        const relPath = ps.relative(opts.projectPath, sceneFiles[0]).replace(/\\/g, '/');
        return `db://${relPath}`;
    }
    return null;
}

/**
 * Phase 3: Asset bundles (simplified)
 */
async function generateInternalBundle(opts, paths) {
    console.log('[data-gen] Generating internal bundle...');

    const internalDir = ps.join(paths.dataDir, 'assets', 'internal');
    fs.ensureDirSync(internalDir);

    const fallbackSources = [
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'assets', 'internal'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'assets', 'internal'),
    ].filter(Boolean);

    for (const src of fallbackSources) {
        if (fs.existsSync(src) && fs.existsSync(ps.join(src, 'cc.config.json'))) {
            fs.copySync(src, internalDir, { overwrite: true });
            console.log(`[data-gen] Copied internal bundle from: ${src}`);
            return;
        }
    }

    console.log('[data-gen] No pre-built internal bundle found, generating minimal...');
    generateMinimalInternalBundle(internalDir);
}

function generateMinimalInternalBundle(internalDir) {
    const ccConfig = {
        importBase: 'import',
        nativeBase: 'native',
        name: 'internal',
        deps: [],
        uuids: [],
        paths: {},
        scenes: {},
        packs: {},
        versions: { import: [], native: [] },
        redirect: [],
        debug: false,
        extensionMap: {},
        hasPreloadScript: true,
        dependencyRelationships: {},
        types: [],
    };

    fs.writeJSONSync(ps.join(internalDir, 'cc.config.json'), ccConfig);

    const indexJs = `System.register("chunks:///_virtual/internal",[],(function(){return{execute:function(){}}}));

(function(r) {
  r('virtual:///prerequisite-imports/internal', 'chunks:///_virtual/internal');
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};
            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});`;
    fs.writeFileSync(ps.join(internalDir, 'index.js'), indexJs, 'utf8');

    fs.ensureDirSync(ps.join(internalDir, 'import'));
}

async function generateMainBundle(opts, paths) {
    console.log('[data-gen] Generating main bundle...');

    const mainDir = ps.join(paths.dataDir, 'assets', 'main');
    fs.ensureDirSync(mainDir);

    const fallbackSources = [
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'assets', 'main'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'assets', 'main'),
    ].filter(Boolean);

    for (const src of fallbackSources) {
        if (fs.existsSync(src) && fs.existsSync(ps.join(src, 'cc.config.json'))) {
            fs.copySync(src, mainDir, { overwrite: true });
            console.log(`[data-gen] Copied main bundle from: ${src}`);
            return;
        }
    }

    console.log('[data-gen] No pre-built main bundle found, generating minimal...');
    generateMinimalMainBundle(opts, mainDir);
}

function generateMinimalMainBundle(opts, mainDir) {
    const launchScene = 'db://assets/main.scene';

    const ccConfig = {
        importBase: 'import',
        nativeBase: 'native',
        name: 'main',
        deps: [],
        uuids: [],
        paths: {},
        scenes: {},
        packs: {},
        versions: { import: [], native: [] },
        redirect: [],
        debug: false,
        extensionMap: {},
        hasPreloadScript: true,
        dependencyRelationships: {},
        types: [],
    };

    fs.writeJSONSync(ps.join(mainDir, 'cc.config.json'), ccConfig);

    const indexJs = `System.register("chunks:///_virtual/main",[],(function(){return{execute:function(){}}}));

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main');
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};
            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});`;
    fs.writeFileSync(ps.join(mainDir, 'index.js'), indexJs, 'utf8');

    fs.ensureDirSync(ps.join(mainDir, 'import'));
}

async function generateUserScriptBundle(opts, paths) {
    console.log('[data-gen] Generating user script bundle (chunks/bundle.js)...');

    const chunksDir = ps.join(paths.dataDir, 'src', 'chunks');
    fs.ensureDirSync(chunksDir);

    const fallbackSources = [
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'src', 'chunks'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'src', 'chunks'),
    ].filter(Boolean);

    for (const src of fallbackSources) {
        if (fs.existsSync(src)) {
            fs.copySync(src, chunksDir, { overwrite: true });
            console.log(`[data-gen] Copied user scripts from: ${src}`);
            return;
        }
    }

    const bundlePath = ps.join(chunksDir, 'bundle.js');
    const minimalBundle = `System.register([], function(_export, _context) { return { execute: function () {\n\n} }; });`;
    fs.writeFileSync(bundlePath, minimalBundle, 'utf8');
    console.log(`[data-gen] Written minimal bundle: ${bundlePath}`);
}

async function generateEffectBin(opts, paths) {
    console.log('[data-gen] Generating effect.bin...');

    const outPath = ps.join(paths.dataDir, 'src', 'effect.bin');
    fs.ensureDirSync(ps.dirname(outPath));

    const fallbackSources = [
        opts.sourceDataDir && ps.join(opts.sourceDataDir, 'src', 'effect.bin'),
        ps.join(opts.projectPath, 'build', 'windows', 'data', 'src', 'effect.bin'),
    ].filter(Boolean);

    for (const src of fallbackSources) {
        if (fs.existsSync(src)) {
            fs.copySync(src, outPath);
            console.log(`[data-gen] Copied effect.bin from: ${src}`);
            return;
        }
    }

    fs.writeFileSync(outPath, Buffer.alloc(0));
    console.log('[data-gen] Written empty effect.bin (placeholder)');
}

/**
 * Master data generation orchestrator
 */
async function generateData(opts, paths) {
    console.log('\n══════════════════════════════════════════');
    console.log('  Step: Generate Data Directory');
    console.log('══════════════════════════════════════════\n');

    fs.ensureDirSync(paths.dataDir);

    // Phase 1: Template rendering + file copying
    console.log('\n── Phase 1: Templates & File Copying ──\n');
    await generateMainJs(opts, paths);
    await generateApplicationJs(opts, paths);
    await copyJsbAdapter(opts, paths);
    await generateImportMap(paths);

    // Phase 2: Engine compilation
    console.log('\n── Phase 2: Engine Compilation ──\n');
    await buildEngineJs(opts, paths);
    await generateSystemBundle(opts, paths);
    await generateSettingsJson(opts, paths);

    // Phase 3: Asset bundles
    console.log('\n── Phase 3: Asset Bundles ──\n');
    await generateEffectBin(opts, paths);
    await generateInternalBundle(opts, paths);
    await generateMainBundle(opts, paths);
    await generateUserScriptBundle(opts, paths);

    console.log('\n[data-gen] Data directory generation complete!');
    console.log(`[data-gen] Output: ${paths.dataDir}\n`);
}

// ─────────────────────── Command Runner ───────────────────────

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

// ─────────────────────── Build Steps ───────────────────────

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
        `-S`, fixPath(cmakeListsDir),
        `-B`, fixPath(paths.nativePrjDir),
        `-DCMAKE_TOOLCHAIN_FILE=${fixPath(toolchainFile)}`,
        `-G`, generator,
        `-DRES_DIR=${fixPath(paths.buildDir)}`,
        `-DAPP_NAME=${compileConfig.projectName}`,
        `-DLAUNCH_TYPE=${compileConfig.debug ? 'Debug' : 'Release'}`,
    ];

    await runCommand(opts.cmakePath, cmakeArgs, paths.buildDir);
    console.log('[wasm-builder] CMake configure completed');
}

async function stepMake(opts, paths, compileConfig) {
    console.log('\n══════════════════════════════════════════');
    console.log('  Step: Make (CMake Build)');
    console.log('══════════════════════════════════════════\n');

    if (!fs.existsSync(paths.nativePrjDir)) {
        throw new Error(`Project directory ${paths.nativePrjDir} does not exist. Run generate first.`);
    }

    const cmakeArgs = [
        '--build', fixPath(paths.nativePrjDir),
        '--config', compileConfig.debug ? 'Debug' : 'Release',
    ];

    await runCommand(opts.cmakePath, cmakeArgs, paths.nativePrjDir);
    console.log('[wasm-builder] Build completed');
}

async function stepRun(opts, paths, compileConfig) {
    console.log('\n══════════════════════════════════════════');
    console.log('  Step: Run');
    console.log('══════════════════════════════════════════\n');

    const emsdkPath = compileConfig.platformParams.emscriptenPath;
    const ext = process.platform === 'win32' ? '.bat' : '';
    const emrunBin = ps.join(emsdkPath, `upstream/emscripten/emrun${ext}`);

    const targetName = compileConfig.executableName;
    const htmlFile = ps.join(paths.nativePrjDir, `${targetName}.html`);
    const jsFile = ps.join(paths.nativePrjDir, `${targetName}.js`);

    let entryFile;
    if (fs.existsSync(htmlFile)) {
        entryFile = htmlFile;
    } else if (fs.existsSync(jsFile)) {
        entryFile = jsFile;
    } else {
        throw new Error(
            `Build output not found. Expected ${targetName}.html or ${targetName}.js in ${paths.nativePrjDir}`
        );
    }

    if (!fs.existsSync(emrunBin)) {
        throw new Error(`emrun not found at ${emrunBin}`);
    }

    console.log(`[wasm-builder] Launching: ${entryFile}`);
    await runCommand(emrunBin, ['--no_browser', entryFile], paths.nativePrjDir);
}

// ─────────────────────── Main ───────────────────────

async function main() {
    const opts = parseArgs();
    const paths = getBuildPaths(opts);
    const compileConfig = generateCompileConfig(opts, paths);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║    Cocos Creator WASM Builder            ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`  Project:       ${opts.projectPath}`);
    console.log(`  Engine:        ${opts.enginePath}`);
    console.log(`  Editor Engine: ${opts.editorEnginePath}`);
    console.log(`  EMSDK:         ${opts.emsdkPath}`);
    console.log(`  Build Dir:     ${paths.buildDir}`);
    console.log(`  Debug:         ${opts.debug}`);
    console.log(`  Executable:    ${opts.executableName}`);
    console.log('');

    if (opts.clean) {
        console.log('[wasm-builder] Cleaning build directory...');
        if (fs.existsSync(paths.nativePrjDir)) {
            await fs.remove(paths.nativePrjDir);
        }
    }

    // Step 1: Generate data directory
    if (!opts.skipData) {
        await generateData(opts, paths);
    } else {
        console.log('[wasm-builder] Skipping data generation (--skip-data)');
    }

    // Step 2: Create (template copy + config)
    if (!opts.skipCreate) {
        await stepCreate(opts, paths, compileConfig);
    }

    // Step 3: CMake generate
    if (!opts.skipGenerate) {
        await stepGenerate(opts, paths, compileConfig);
    }

    // Step 4: CMake build
    if (!opts.skipMake) {
        await stepMake(opts, paths, compileConfig);
    }

    // Step 5: Run
    if (opts.run) {
        await stepRun(opts, paths, compileConfig);
    }

    console.log('\n[wasm-builder] Build completed successfully!');
}

main().catch((err) => {
    console.error('\n[wasm-builder] Build failed:');
    console.error(err.message || err);
    process.exit(1);
});
