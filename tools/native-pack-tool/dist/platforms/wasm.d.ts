import { CocosParams, NativePackTool } from "../base/default";
export interface IWasmParams {
    emscriptenPath?: string;
}
export declare class WasmPackTool extends NativePackTool {
    params: CocosParams<IWasmParams>;
    private get emsdkPath();
    private get emcmakeBin();
    private get emrunBin();
    private get emscriptenToolchainFile();
    create(): Promise<boolean>;
    generate(): Promise<boolean>;
    make(): Promise<boolean>;
    run(): Promise<boolean>;
}
