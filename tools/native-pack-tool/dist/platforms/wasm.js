"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WasmPackTool = void 0;
const default_1 = require("../base/default");
const fs = __importStar(require("fs-extra"));
const ps = __importStar(require("path"));
const utils_1 = require("../utils");
class WasmPackTool extends default_1.NativePackTool {
    get emsdkPath() {
        var _a;
        const fromParams = (_a = this.params.platformParams) === null || _a === void 0 ? void 0 : _a.emscriptenPath;
        if (fromParams && fs.existsSync(fromParams)) {
            return fromParams;
        }
        if (process.env.EMSDK) {
            return process.env.EMSDK;
        }
        throw new Error(`Emscripten SDK not found. Set EMSDK environment variable or provide emscriptenPath in platform params.`);
    }
    get emcmakeBin() {
        const ext = process.platform === 'win32' ? '.bat' : '';
        return ps.join(this.emsdkPath, `upstream/emscripten/emcmake${ext}`);
    }
    get emrunBin() {
        const ext = process.platform === 'win32' ? '.bat' : '';
        return ps.join(this.emsdkPath, `upstream/emscripten/emrun${ext}`);
    }
    get emscriptenToolchainFile() {
        return ps.join(this.emsdkPath, 'upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake');
    }
    /**
     * Copy build resources to buildDir/data, same flow as Windows.
     * Source priority: Windows build output (build/windows/data) -> buildAssetsDir -> jsb-link -> native.
     */
    async copyResourcesToData() {
        const dataDir = ps.join(this.paths.buildDir, 'data');
        fs.ensureDirSync(dataDir);
        const buildCfgPath = ps.join(this.paths.platformTemplateDirInPrj, 'build-cfg.json');
        if (!fs.existsSync(buildCfgPath)) {
            return;
        }
        const buildCfg = await fs.readJSON(buildCfgPath);
        const copyResources = buildCfg.copy_resources || [];
        if (copyResources.length === 0) {
            return;
        }
        const buildRoot = ps.dirname(this.paths.buildDir);
        const srcCandidates = [
            ps.join(buildRoot, 'windows', 'data'),
            this.paths.buildAssetsDir,
            ps.join(buildRoot, 'jsb-link'),
            ps.join(buildRoot, 'native'),
        ];
        for (const srcRoot of srcCandidates) {
            if (srcRoot && fs.existsSync(srcRoot) && fs.existsSync(ps.join(srcRoot, 'main.js'))) {
                console.log(`[wasm] Copying resources from: ${srcRoot}`);
                await this.copyResourcesFrom(srcRoot, dataDir, copyResources);
                return;
            }
        }
        console.warn(`[wasm] No valid source found. Tried: ${srcCandidates.filter(Boolean).join(', ')}`);
    }
    async copyResourcesFrom(srcRoot, dataDir, copyResources) {
        for (const item of copyResources) {
            const srcPath = ps.join(srcRoot, item.from);
            const dstPath = item.to ? ps.join(dataDir, item.to) : ps.join(dataDir, ps.basename(item.from));
            if (fs.existsSync(srcPath)) {
                fs.ensureDirSync(ps.dirname(dstPath));
                await utils_1.cchelper.copyRecursiveAsync(srcPath, dstPath);
            }
        }
    }
    // ------------------- create ------------------- //
    async create() {
        await this.copyCommonTemplate();
        await this.copyPlatformTemplate();
        await this.copyResourcesToData();
        await this.generateCMakeConfig();
        await this.executeCocosTemplateTask();
        await this.encryptScripts();
        return true;
    }
    // ------------------- generate ------------------- //
    async generate() {
        const nativePrjDir = this.paths.nativePrjDir;
        const cmakePath = ps.join(this.paths.platformTemplateDirInPrj, 'CMakeLists.txt');
        if (!fs.existsSync(cmakePath)) {
            throw new Error(`CMakeLists.txt not found at ${cmakePath}`);
        }
        if (!fs.existsSync(nativePrjDir)) {
            utils_1.cchelper.makeDirectoryRecursive(nativePrjDir);
        }
        const toolchainFile = this.emscriptenToolchainFile;
        if (!fs.existsSync(toolchainFile)) {
            throw new Error(`Emscripten CMake toolchain file not found at ${toolchainFile}. ` +
                `Please verify your Emscripten SDK installation.`);
        }
        const generator = process.platform === 'win32' ? 'Ninja' : 'Unix Makefiles';
        const generateArgs = [
            `-DCMAKE_TOOLCHAIN_FILE="${utils_1.cchelper.fixPath(toolchainFile)}"`,
            `-G"${generator}"`,
        ];
        this.appendCmakeCommonArgs(generateArgs);
        await utils_1.toolHelper.runCmake([
            `-S"${utils_1.cchelper.fixPath(this.paths.platformTemplateDirInPrj)}"`,
            `-B"${utils_1.cchelper.fixPath(nativePrjDir)}"`,
        ].concat(generateArgs));
        return true;
    }
    // ------------------- make ------------------- //
    async make() {
        const nativePrjDir = this.paths.nativePrjDir;
        if (!fs.existsSync(nativePrjDir)) {
            throw new Error(`Project directory ${nativePrjDir} does not exist. Run 'generate' first.`);
        }
        await utils_1.toolHelper.runCmake([
            '--build', `"${utils_1.cchelper.fixPath(nativePrjDir)}"`,
            '--config', this.params.debug ? 'Debug' : 'Release',
        ]);
        return true;
    }
    // ------------------- run ------------------- //
    async run() {
        const outputDir = this.paths.nativePrjDir;
        const targetName = this.getExecutableNameOrDefault();
        const htmlFile = ps.join(outputDir, `${targetName}.html`);
        const jsFile = ps.join(outputDir, `${targetName}.js`);
        let entryFile;
        if (fs.existsSync(htmlFile)) {
            entryFile = htmlFile;
        }
        else if (fs.existsSync(jsFile)) {
            entryFile = jsFile;
        }
        else {
            throw new Error(`[wasm run] Build output not found. Expected ${targetName}.html or ${targetName}.js in ${outputDir}`);
        }
        const emrun = this.emrunBin;
        if (!fs.existsSync(emrun)) {
            throw new Error(`emrun not found at ${emrun}`);
        }
        console.log(`Launching wasm application with emrun: ${entryFile}`);
        await utils_1.cchelper.runCmd(emrun, ['--no_browser', `"${entryFile}"`], false, outputDir);
        return true;
    }
}
exports.WasmPackTool = WasmPackTool;
//# sourceMappingURL=wasm.js.map