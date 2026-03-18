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
    /**
     * Copy build resources to buildDir/data, same flow as Windows.
     * Source priority: Windows build output (build/windows/data) -> buildAssetsDir -> jsb-link -> native.
     */
    private copyResourcesToData;
    private copyResourcesFrom;
    create(): Promise<boolean>;
    generate(): Promise<boolean>;
    make(): Promise<boolean>;
    run(): Promise<boolean>;
}
