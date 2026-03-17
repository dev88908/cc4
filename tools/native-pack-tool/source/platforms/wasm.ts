import { CocosParams, NativePackTool } from "../base/default";
import * as fs from 'fs-extra';
import * as ps from 'path';
import { cchelper, toolHelper, Paths } from "../utils";

export interface IWasmParams {
    emscriptenPath?: string;
}

export class WasmPackTool extends NativePackTool {
    params!: CocosParams<IWasmParams>;

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

    // ------------------- create ------------------- //

    async create(): Promise<boolean> {
        await this.copyCommonTemplate();
        await this.copyPlatformTemplate();
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
