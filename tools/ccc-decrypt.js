/**
 * Cocos Creator .ccc file decryptor
 *
 * Usage: Run with CocosCreator's Electron binary:
 *   set ELECTRON_RUN_AS_NODE=1
 *   "C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" tools/ccc-decrypt.js <input_dir> <output_dir> [--copy-all]
 *
 * --copy-all: also copy non-.ccc files to output_dir, preserving directory structure
 *
 * Hooks vm.compileFunction to intercept decrypted source from the native
 * electron_common_compile module, returning a no-op to prevent side effects.
 */

const vm = require('vm');
const path = require('path');
const fs = require('fs');

let capturedSource = '';
const origCompileFunction = vm.compileFunction;

vm.compileFunction = function (code, params, options) {
    capturedSource = code;
    return function () {};
};
global.__vm__ = vm;

const compiler = process._linkedBinding('electron_common_compile');

function walkDir(dir, cb) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(full, cb);
        else cb(full);
    }
}

function decryptFile(filePath) {
    capturedSource = '';
    try {
        compiler.test(
            filePath,
            ['exports', 'require', 'module', '__filename', '__dirname'],
            { filename: filePath },
            {}, require, { exports: {} }, filePath, path.dirname(filePath), process, global
        );
    } catch (e) {
        // expected — native module may still throw on some files
    }
    return capturedSource;
}

const inputDir = process.argv[2];
const outputDir = process.argv[3];
const copyAll = process.argv.includes('--copy-all');

if (!inputDir || !outputDir) {
    console.error('Usage: ccc-decrypt.js <input_dir> <output_dir> [--copy-all]');
    process.exit(1);
}

const absInput = path.resolve(inputDir);
const absOutput = path.resolve(outputDir);

let cccSuccess = 0, cccFailed = 0, copied = 0, total = 0;
const t0 = Date.now();

walkDir(absInput, (filePath) => {
    total++;

    const rel = path.relative(absInput, filePath);

    if (filePath.endsWith('.ccc')) {
        const source = decryptFile(filePath);
        const outPath = path.join(absOutput, rel.replace(/\.ccc$/, '.js'));
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        if (source) {
            fs.writeFileSync(outPath, source, 'utf8');
            cccSuccess++;
        } else {
            console.error('[FAIL] ' + rel);
            cccFailed++;
        }
    } else if (copyAll) {
        const outPath = path.join(absOutput, rel);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.copyFileSync(filePath, outPath);
        copied++;
    }

    if (total % 500 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        process.stderr.write('\r  ' + total + ' files processed (' + cccSuccess + ' decrypted) ' + elapsed + 's ...');
    }
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.error('\nDone in ' + elapsed + 's: ' + total + ' files total');
console.error('  .ccc decrypted: ' + cccSuccess + ' ok, ' + cccFailed + ' failed');
if (copyAll) console.error('  other files copied: ' + copied);
