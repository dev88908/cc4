import { BuildPlugin } from '../@types';

const PACKAGE_NAME = 'wasm-builder';

export const load: BuildPlugin.load = function () {
    console.debug(`${PACKAGE_NAME} loaded`);
};

export const unload: BuildPlugin.load = function () {
    console.debug(`${PACKAGE_NAME} unloaded`);
};

export const configs: BuildPlugin.Configs = {
    '*': {
        hooks: './hooks',
        options: {
            emscriptenPath: {
                label: 'Emscripten SDK Path',
                description: 'Path to the Emscripten SDK (EMSDK) root directory',
                default: process.env.EMSDK || '',
                render: {
                    ui: 'ui-file',
                    attributes: {
                        type: 'directory',
                    },
                },
                verifyRules: ['required'],
            },
        },
        verifyRuleMap: {
            required: {
                message: 'This field is required',
                func(val: any) {
                    return !!val;
                },
            },
        },
    },
};
