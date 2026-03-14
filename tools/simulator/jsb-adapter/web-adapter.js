// Minimal web-adapter.js for Cocos Engine
// This provides basic initialization for the native engine

globalThis.__EDITOR__ = false;

// Basic window object setup
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}

// Basic console polyfill
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

// cc namespace - will be populated by native code
if (!globalThis.cc) {
    globalThis.cc = {};
}

// Create cc namespace with basic objects
cc.Node = function() {
    this._name = '';
    this._parent = null;
    this._children = [];
    this._position = { x: 0, y: 0, z: 0 };
    this._rotation = { x: 0, y: 0, z: 0, w: 1 };
    this._scale = { x: 1, y: 1, z: 1 };
    this._active = true;
};

cc.Node.prototype.setPosition = function(x, y, z) {
    this._position.x = x || 0;
    this._position.y = y || 0;
    this._position.z = z || 0;
};

cc.Node.prototype.setRotation = function(quat) {
    this._rotation = quat;
};

cc.Node.prototype.setScale = function(x, y, z) {
    this._scale.x = x || 1;
    this._scale.y = y || 1;
    this._scale.z = z || 1;
};

cc.Node.prototype.addChild = function(child) {
    if (child._parent) {
        child._parent.removeChild(child);
    }
    child._parent = this;
    this._children.push(child);
};

cc.Node.prototype.removeChild = function(child) {
    const index = this._children.indexOf(child);
    if (index >= 0) {
        this._children.splice(index, 1);
        child._parent = null;
    }
};

cc.Node.prototype.getChildByName = function(name) {
    for (const child of this._children) {
        if (child._name === name) {
            return child;
        }
    }
    return null;
};

cc.Node.prototype.destroy = function() {
    this._active = false;
    // Remove from parent
    if (this._parent) {
        this._parent.removeChild(this);
    }
    // Destroy children
    for (const child of this._children) {
        child.destroy();
    }
    this._children = [];
};

// cc.Scene
cc.Scene = function() {
    cc.Node.call(this);
    this._name = 'Scene';
};
cc.Scene.prototype = Object.create(cc.Node.prototype);
cc.Scene.prototype.constructor = cc.Scene;

// cc.Director
cc.Director = function() {
    this._scene = null;
    this._nextScene = null;
    this._paused = false;
    this._deltaTime = 0;
};
cc.director = new cc.Director();

cc.Director.prototype.getScene = function() {
    return this._scene;
};

cc.Director.prototype.runScene = function(scene) {
    this._nextScene = scene;
    console.log('[cc] Director running scene:', scene ? scene._name : 'null');
};

cc.Director.prototype.mainLoop = function(deltaTime) {
    this._deltaTime = deltaTime;
    if (this._nextScene) {
        this._scene = this._nextScene;
        this._nextScene = null;
        console.log('[cc] Scene changed to:', this._scene ? this._scene._name : 'null');
    }
};

// cc.Game
cc.Game = function() {
    this._scene = null;
    this._paused = false;
    this.frameRate = 60;
};
cc.game = new cc.Game();

cc.Game.prototype.run = function() {
    console.log('[cc] Game started');
    if (cc.director.getScene()) {
        cc.director.runScene(cc.director.getScene());
    }
};

// cc.Vec3
cc.Vec3 = function(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

cc.Vec3.prototype.set = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
};

// cc.Quat
cc.Quat = function(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 1;
};

cc.Quat.fromEuler = function(x, y, z) {
    // Simplified Euler to Quaternion conversion
    const cx = Math.cos(x * 0.5 * Math.PI / 180);
    const sx = Math.sin(x * 0.5 * Math.PI / 180);
    const cy = Math.cos(y * 0.5 * Math.PI / 180);
    const sy = Math.sin(y * 0.5 * Math.PI / 180);
    const cz = Math.cos(z * 0.5 * Math.PI / 180);
    const sz = Math.sin(z * 0.5 * Math.PI / 180);
    
    return new cc.Quat(
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz
    );
};

// cc.Color
cc.Color = function(r, g, b, a) {
    this.r = r || 0;
    this.g = g || 0;
    this.b = b || 0;
    this.a = a !== undefined ? a : 1;
};

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

console.log('[web-adapter.js] Cocos adapter loaded successfully');
