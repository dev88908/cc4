import { CocosParams, NativePackTool } from "../base/default";
import * as fs from 'fs-extra';
import * as ps from 'path';
import { cchelper, toolHelper, Paths } from "../utils";

export interface IWasmParams {
    emscriptenPath?: string;
}

interface CopyResource {
    from: string;
    to: string;
}

function getRequiredDataFiles(): string[] {
    return [
        'main.js',
        'application.js',
        ps.join('src', 'settings.json'),
        ps.join('src', 'system.bundle.js'),
        ps.join('assets', 'main', 'cc.config.json'),
        ps.join('assets', 'internal', 'index.js'),
        ps.join('src', 'chunks', 'bundle.js'),
        ps.join('jsb-adapter', 'web-adapter.js'),
        ps.join('jsb-adapter', 'engine-adapter.js'),
    ];
}

function getMissingFiles(rootDir: string, requiredFiles: string[]): string[] {
    return requiredFiles.filter((relativePath) => !fs.existsSync(ps.join(rootDir, relativePath)));
}

function isValidWasmDataSource(rootDir: string): boolean {
    if (!rootDir || !fs.existsSync(rootDir)) {
        return false;
    }
    return getMissingFiles(rootDir, [
        'main.js',
        ps.join('assets', 'main', 'cc.config.json'),
        ps.join('assets', 'internal', 'index.js'),
    ]).length === 0;
}

export class WasmPackTool extends NativePackTool {
    params!: CocosParams<IWasmParams>;

    private validateDataDir(dataDir: string): void {
        const missingFiles = getMissingFiles(dataDir, getRequiredDataFiles());
        if (missingFiles.length > 0) {
            throw new Error(
                `[wasm] Incomplete data directory at ${dataDir}. Missing: ${missingFiles.join(', ')}. ` +
                `Build/copy the Windows native data output first to avoid packaging a black-screen wasm build.`
            );
        }
    }

    private copyBuiltinJsbAdapter(dataDir: string): void {
        const adapterDir = ps.join(dataDir, 'jsb-adapter');
        const sourceDir = ps.join(this.params.enginePath, 'bin', 'adapter', 'native');
        const requiredFiles = ['web-adapter.js', 'engine-adapter.js'];

        if (!fs.existsSync(sourceDir)) {
            console.warn(`[wasm] Builtin jsb-adapter directory not found: ${sourceDir}`);
            return;
        }

        fs.ensureDirSync(adapterDir);
        for (const fileName of requiredFiles) {
            const sourcePath = ps.join(sourceDir, fileName);
            const targetPath = ps.join(adapterDir, fileName);
            if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
                fs.copySync(sourcePath, targetPath);
                console.log(`[wasm] Copied builtin adapter: ${fileName}`);
            }
        }
    }

    private get emsdkPath(): string {
        const fromParams = this.params.platformParams?.emscriptenPath;
        if (fromParams && fs.existsSync(fromParams)) {
            return fromParams;
        }
        if (process.env.EMSDK) {
            return process.env.EMSDK;
        }
        throw new Error(
            `Emscripten SDK not found. Set EMSDK environment variable or provide emscriptenPath in platform params.`
        );
    }

    private get emcmakeBin(): string {
        const ext = process.platform === 'win32' ? '.bat' : '';
        return ps.join(this.emsdkPath, `upstream/emscripten/emcmake${ext}`);
    }

    private get emrunBin(): string {
        const ext = process.platform === 'win32' ? '.bat' : '';
        return ps.join(this.emsdkPath, `upstream/emscripten/emrun${ext}`);
    }

    private get emscriptenToolchainFile(): string {
        return ps.join(this.emsdkPath, 'upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake');
    }

    /**
     * Copy build resources to buildDir/data, same flow as Windows.
     * Source priority: current build output -> Windows build output -> jsb-link -> native.
     */
    private async copyResourcesToData(): Promise<void> {
        const dataDir = ps.join(this.paths.buildDir, 'data');
        fs.ensureDirSync(dataDir);

        const buildCfgPath = ps.join(this.paths.platformTemplateDirInPrj, 'build-cfg.json');
        if (!fs.existsSync(buildCfgPath)) {
            return;
        }

        const buildCfg = await fs.readJSON(buildCfgPath);
        const copyResources: CopyResource[] = buildCfg.copy_resources || [];
        if (copyResources.length === 0) {
            return;
        }

        const buildRoot = ps.dirname(this.paths.buildDir);
        const srcCandidates = [
            this.paths.buildAssetsDir,
            ps.join(buildRoot, 'windows', 'data'),
            ps.join(buildRoot, 'jsb-link'),
            ps.join(buildRoot, 'native'),
        ];

        for (const srcRoot of srcCandidates) {
            if (isValidWasmDataSource(srcRoot)) {
                console.log(`[wasm] Copying resources from: ${srcRoot}`);
                await this.copyResourcesFrom(srcRoot, dataDir, copyResources);
                this.copyBuiltinJsbAdapter(dataDir);
                this.validateDataDir(dataDir);
                return;
            }
        }

        console.warn(`[wasm] No valid source found. Tried: ${srcCandidates.filter(Boolean).join(', ')}`);
    }

    private async copyResourcesFrom(srcRoot: string, dataDir: string, copyResources: CopyResource[]): Promise<void> {
        for (const item of copyResources) {
            const srcPath = ps.join(srcRoot, item.from);
            const dstPath = item.to ? ps.join(dataDir, item.to) : ps.join(dataDir, ps.basename(item.from));
            if (fs.existsSync(srcPath)) {
                fs.ensureDirSync(ps.dirname(dstPath));
                await cchelper.copyRecursiveAsync(srcPath, dstPath);
            }
        }
    }

    // ------------------- create ------------------- //

    async create(): Promise<boolean> {
        await this.copyCommonTemplate();
        await this.copyPlatformTemplate();
        await this.copyResourcesToData();
        await this.generateCMakeConfig();
        await this.executeCocosTemplateTask();

        await this.encryptScripts();
        return true;
    }

    // ------------------- generate ------------------- //

    async generate(): Promise<boolean> {
        const nativePrjDir = this.paths.nativePrjDir;

        const cmakePath = ps.join(this.paths.platformTemplateDirInPrj, 'CMakeLists.txt');
        if (!fs.existsSync(cmakePath)) {
            throw new Error(`CMakeLists.txt not found at ${cmakePath}`);
        }

        if (!fs.existsSync(nativePrjDir)) {
            cchelper.makeDirectoryRecursive(nativePrjDir);
        }

        const toolchainFile = this.emscriptenToolchainFile;
        if (!fs.existsSync(toolchainFile)) {
            throw new Error(
                `Emscripten CMake toolchain file not found at ${toolchainFile}. ` +
                `Please verify your Emscripten SDK installation.`
            );
        }

        const generator = process.platform === 'win32' ? 'Ninja' : 'Unix Makefiles';
        const generateArgs: string[] = [
            `-DCMAKE_TOOLCHAIN_FILE="${cchelper.fixPath(toolchainFile)}"`,
            `-G"${generator}"`,
        ];

        this.appendCmakeCommonArgs(generateArgs);

        await toolHelper.runCmake([
            `-S"${cchelper.fixPath(this.paths.platformTemplateDirInPrj)}"`,
            `-B"${cchelper.fixPath(nativePrjDir)}"`,
        ].concat(generateArgs));

        return true;
    }

    // ------------------- make ------------------- //

    async make(): Promise<boolean> {
        const nativePrjDir = this.paths.nativePrjDir;
        if (!fs.existsSync(nativePrjDir)) {
            throw new Error(`Project directory ${nativePrjDir} does not exist. Run 'generate' first.`);
        }

        await toolHelper.runCmake([
            '--build', `"${cchelper.fixPath(nativePrjDir)}"`,
            '--config', this.params.debug ? 'Debug' : 'Release',
        ]);

        return true;
    }

    // ------------------- run ------------------- //

    async run(): Promise<boolean> {
        const outputDir = this.paths.nativePrjDir;
        const targetName = this.getExecutableNameOrDefault();

        const htmlFile = ps.join(outputDir, `${targetName}.html`);
        const jsFile = ps.join(outputDir, `${targetName}.js`);

        let entryFile: string;
        if (fs.existsSync(htmlFile)) {
            entryFile = htmlFile;
        } else if (fs.existsSync(jsFile)) {
            entryFile = jsFile;
        } else {
            throw new Error(
                `[wasm run] Build output not found. Expected ${targetName}.html or ${targetName}.js in ${outputDir}`
            );
        }

        const emrun = this.emrunBin;
        if (!fs.existsSync(emrun)) {
            throw new Error(`emrun not found at ${emrun}`);
        }

        console.log(`Launching wasm application with emrun: ${entryFile}`);
        await cchelper.runCmd(emrun, ['--no_browser', `"${entryFile}"`], false, outputDir);

        return true;
    }
}
