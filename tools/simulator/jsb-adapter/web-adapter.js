// Minimal web-adapter.js for Cocos Engine Window Test
// This provides basic initialization for the native engine without full TypeScript runtime

globalThis.__EDITOR__ = false;

// Basic window object setup
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}

// Basic console polyfill (should already exist)
if (!globalThis.console) {
    globalThis.console = {
        log: function() {},
        info: function() {},
        warn: function() {},
        error: function() {},
        debug: function() {}
    };
}
  
// Basic jsb namespace setup
if (!globalThis.jsb) {
    globalThis.jsb = {};
}

// Device info (minimal)
jsb.device = jsb.Device || {};

// Minimal requestAnimationFrame implementation
let _requestAnimationFrameID = 0;
const _requestAnimationFrameCallbacks = {};

globalThis.requestAnimationFrame = function(cb) {
    const id = ++_requestAnimationFrameID;
    _requestAnimationFrameCallbacks[id] = cb;
    return id;
};

globalThis.cancelAnimationFrame = function(id) {
    delete _requestAnimationFrameCallbacks[id];
};

// Minimal timeout implementation
let _timeoutIDIndex = 0;
const _timeoutInfos = {};

globalThis.setTimeout = globalThis.setTimeout || function(cb, delay) {
    const id = ++_timeoutIDIndex;
    _timeoutInfos[id] = { cb: cb, delay: delay || 0, start: Date.now() };
    return id;
};

globalThis.clearTimeout = globalThis.clearTimeout || function(id) {
    delete _timeoutInfos[id];
};

globalThis.setInterval = globalThis.setInterval || function(cb, delay) {
    const id = ++_timeoutIDIndex;
    _timeoutInfos[id] = { cb: cb, delay: delay || 0, start: Date.now(), isRepeat: true };
    return id;
};

globalThis.clearInterval = globalThis.clearInterval || globalThis.clearTimeout;

// Game tick function
let _firstTick = true;
globalThis.gameTick = function(nowMilliSeconds) {
    if (_firstTick) {
        _firstTick = false;
        if (globalThis.onload) {
            globalThis.onload({ type: 'load', _target: globalThis });
        }
    }
    
    // Fire timeouts
    for (const id in _timeoutInfos) {
        const info = _timeoutInfos[id];
        if (info && info.cb) {
            if ((nowMilliSeconds - info.start) >= info.delay) {
                if (info.isRepeat) {
                    info.start = nowMilliSeconds;
                } else {
                    delete _timeoutInfos[id];
                }
                if (typeof info.cb === 'function') {
                    info.cb();
                }
            }
        }
    }
    
    // Fire animation frame callbacks
    for (const id in _requestAnimationFrameCallbacks) {
        const cb = _requestAnimationFrameCallbacks[id];
        if (cb) {
            delete _requestAnimationFrameCallbacks[id];
            cb(nowMilliSeconds);
        }
    }
};

console.log('[web-adapter.js] Minimal adapter loaded successfully');
