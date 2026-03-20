(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var cacheManager = require('./cache-manager');
var _require = require('./fs-utils'),
  readText = _require.readText,
  readArrayBuffer = _require.readArrayBuffer,
  readJson = _require.readJson,
  loadSubpackage = _require.loadSubpackage,
  getUserDataPath = _require.getUserDataPath,
  _subpackagesPath = _require._subpackagesPath;

//cc.assetManager.fsUtils = ral.fsUtils;

var REGEX = /^https?:\/\/.*/;
var downloader = cc.assetManager.downloader;
var parser = cc.assetManager.parser;
var presets = cc.assetManager.presets;
downloader.maxConcurrency = 12;
downloader.maxRequestsPerFrame = 64;
presets.scene.maxConcurrency = 12;
presets.scene.maxRequestsPerFrame = 64;
var subpackages = {};
var loadedScripts = {};
function downloadScript(url, options, onComplete) {
  if (typeof options === 'function') {
    onComplete = options;
    options = null;
  }
  if (loadedScripts[url]) {
    onComplete && onComplete();
    return;
  }
  download(url, function (src, options, onComplete) {
    globalThis.nodeEnv.require(src);
    loadedScripts[url] = true;
    onComplete && onComplete(null);
  }, options, options.onFileProgress, onComplete);
}
function loadAudioPlayer(url, options, onComplete) {
  cc.AudioPlayer.load(url).then(function (player) {
    var audioMeta = {
      player: player,
      url: url,
      duration: player.duration,
      type: player.type
    };
    onComplete(null, audioMeta);
  })["catch"](function (err) {
    onComplete(err);
  });
}
function download(url, func, options, onFileProgress, onComplete) {
  var result = transformUrl(url, options);
  if (result.inLocal) {
    func(result.url, options, onComplete);
  } else if (result.inCache) {
    cacheManager.updateLastTime(url);
    func(result.url, options, function (err, data) {
      if (err) {
        cacheManager.removeCache(url);
      }
      onComplete(err, data);
    });
  } else {
    downloader.downloadFile(url, options, onFileProgress, function (err, path) {
      if (err) {
        onComplete(err, null);
        return;
      }
      func(path, options, function (err, data) {
        if (!err) {
          cacheManager.tempFiles.add(url, path);
          cacheManager.cacheFile(url, path, options.cacheEnabled, options.__cacheBundleRoot__, true);
        }
        onComplete(err, data);
      });
    });
  }
}
function parseArrayBuffer(url, options, onComplete) {
  readArrayBuffer(url, onComplete);
}
function parseText(url, options, onComplete) {
  readText(url, onComplete);
}
function parseJson(url, options, onComplete) {
  readJson(url, onComplete);
}
function downloadText(url, options, onComplete) {
  download(url, parseText, options, options.onFileProgress, onComplete);
}
function downloadJson(url, options, onComplete) {
  download(url, parseJson, options, options.onFileProgress, onComplete);
}
function loadFont(url, options, onComplete) {
  var fontFamilyName = _getFontFamily(url);
  var fontFace = new FontFace(fontFamilyName, "url('".concat(url, "')"));
  document.fonts.add(fontFace);
  fontFace.load();
  fontFace.loaded.then(function () {
    onComplete(null, fontFamilyName);
  }, function () {
    cc.warnID(4933, fontFamilyName);
    onComplete(null, fontFamilyName);
  });
}
function _getFontFamily(fontHandle) {
  var ttfIndex = fontHandle.lastIndexOf('.ttf');
  if (ttfIndex === -1) {
    ttfIndex = fontHandle.lastIndexOf('.tmp');
  }
  if (ttfIndex === -1) return fontHandle;
  var slashPos = fontHandle.lastIndexOf('/');
  var fontFamilyName;
  if (slashPos === -1) {
    fontFamilyName = "".concat(fontHandle.substring(0, ttfIndex), "_LABEL");
  } else {
    fontFamilyName = "".concat(fontHandle.substring(slashPos + 1, ttfIndex), "_LABEL");
  }
  return fontFamilyName;
}
function doNothing(content, options, onComplete) {
  onComplete(null, content);
}
function downloadAsset(url, options, onComplete) {
  download(url, doNothing, options, options.onFileProgress, onComplete);
}
function downloadBundle(nameOrUrl, options, onComplete) {
  var bundleName = cc.path.basename(nameOrUrl);
  var version = options.version || downloader.bundleVers[bundleName];
  var url;
  if (REGEX.test(nameOrUrl) || nameOrUrl.startsWith(getUserDataPath())) {
    url = nameOrUrl;
    cacheManager.makeBundleFolder(bundleName);
  } else if (downloader.remoteBundles.indexOf(bundleName) !== -1) {
    url = "".concat(downloader.remoteServerAddress, "remote/").concat(bundleName);
    cacheManager.makeBundleFolder(bundleName);
  } else {
    url = "assets/".concat(bundleName);
  }
  var config = "".concat(url, "/cc.config.").concat(version ? "".concat(version, ".") : '', "json");
  options.__cacheBundleRoot__ = bundleName;
  downloadJson(config, options, function (err, response) {
    if (err) {
      onComplete(err, null);
      return;
    }
    var out = response;
    out && (out.base = "".concat(url, "/"));
    if (out.hasPreloadScript) {
      var js = "".concat(url, "/index.").concat(version ? "".concat(version, ".") : '').concat(out.encrypted ? 'jsc' : "js");
      downloadScript(js, options, function (err) {
        if (err) {
          onComplete(err, null);
          return;
        }
        onComplete(null, out);
      });
    } else {
      onComplete(null, out);
    }
  });
}
function downloadArrayBuffer(url, options, onComplete) {
  download(url, parseArrayBuffer, options, options.onFileProgress, onComplete);
}
var originParsePVRTex = parser.parsePVRTex;
var parsePVRTex = function parsePVRTex(file, options, onComplete) {
  readArrayBuffer(file, function (err, data) {
    if (err) return onComplete(err);
    originParsePVRTex(data, options, onComplete);
  });
};
var originParsePKMTex = parser.parsePKMTex;
var parsePKMTex = function parsePKMTex(file, options, onComplete) {
  readArrayBuffer(file, function (err, data) {
    if (err) return onComplete(err);
    originParsePKMTex(data, options, onComplete);
  });
};
var originParseASTCTex = parser.parseASTCTex;
var parseASTCTex = function parseASTCTex(file, options, onComplete) {
  readArrayBuffer(file, function (err, data) {
    if (err) return onComplete(err);
    originParseASTCTex(data, options, onComplete);
  });
};
var originParsePlist = parser.parsePlist;
var parsePlist = function parsePlist(url, options, onComplete) {
  readText(url, function (err, file) {
    if (err) return onComplete(err);
    originParsePlist(file, options, onComplete);
  });
};
downloader.downloadScript = downloadScript;
downloader._downloadArrayBuffer = downloadArrayBuffer;
downloader._downloadJson = downloadJson;
parser.parsePVRTex = parsePVRTex;
parser.parsePKMTex = parsePKMTex;
parser.parseASTCTex = parseASTCTex;
parser.parsePlist = parsePlist;
downloader.register({
  '.js': downloadScript,
  // Audio
  '.mp3': downloadAsset,
  '.ogg': downloadAsset,
  '.wav': downloadAsset,
  '.m4a': downloadAsset,
  // Image
  '.png': downloadAsset,
  '.jpg': downloadAsset,
  '.bmp': downloadAsset,
  '.jpeg': downloadAsset,
  '.gif': downloadAsset,
  '.ico': downloadAsset,
  '.tiff': downloadAsset,
  '.image': downloadAsset,
  '.webp': downloadAsset,
  '.pvr': downloadAsset,
  '.pkm': downloadAsset,
  '.astc': downloadAsset,
  '.font': downloadAsset,
  '.eot': downloadAsset,
  '.ttf': downloadAsset,
  '.woff': downloadAsset,
  '.svg': downloadAsset,
  '.ttc': downloadAsset,
  // Txt
  '.txt': downloadAsset,
  '.xml': downloadAsset,
  '.vsh': downloadAsset,
  '.fsh': downloadAsset,
  '.atlas': downloadAsset,
  '.tmx': downloadAsset,
  '.tsx': downloadAsset,
  '.plist': downloadAsset,
  '.fnt': downloadAsset,
  '.json': downloadJson,
  '.ExportJson': downloadAsset,
  '.binary': downloadAsset,
  '.bin': downloadAsset,
  '.dbbin': downloadAsset,
  '.skel': downloadAsset,
  '.mp4': downloadAsset,
  '.avi': downloadAsset,
  '.mov': downloadAsset,
  '.mpg': downloadAsset,
  '.mpeg': downloadAsset,
  '.rm': downloadAsset,
  '.rmvb': downloadAsset,
  bundle: downloadBundle,
  "default": downloadText
});
parser.register({
  '.png': downloader.downloadDomImage,
  '.jpg': downloader.downloadDomImage,
  '.bmp': downloader.downloadDomImage,
  '.jpeg': downloader.downloadDomImage,
  '.gif': downloader.downloadDomImage,
  '.ico': downloader.downloadDomImage,
  '.tiff': downloader.downloadDomImage,
  '.image': downloader.downloadDomImage,
  '.webp': downloader.downloadDomImage,
  '.pvr': parsePVRTex,
  '.pkm': parsePKMTex,
  '.astc': parseASTCTex,
  '.font': loadFont,
  '.eot': loadFont,
  '.ttf': loadFont,
  '.woff': loadFont,
  '.svg': loadFont,
  '.ttc': loadFont,
  // Audio
  '.mp3': loadAudioPlayer,
  '.ogg': loadAudioPlayer,
  '.wav': loadAudioPlayer,
  '.m4a': loadAudioPlayer,
  // Txt
  '.txt': parseText,
  '.xml': parseText,
  '.vsh': parseText,
  '.fsh': parseText,
  '.atlas': parseText,
  '.tmx': parseText,
  '.tsx': parseText,
  '.fnt': parseText,
  '.plist': parsePlist,
  '.binary': parseArrayBuffer,
  '.bin': parseArrayBuffer,
  '.dbbin': parseArrayBuffer,
  '.skel': parseArrayBuffer,
  '.ExportJson': parseJson
});
var transformUrl = function transformUrl(url, options) {
  var inLocal = false;
  var inCache = false;
  if (REGEX.test(url) && !url.startsWith('file://')) {
    if (options.reload) {
      return {
        url: url
      };
    } else {
      var cache = cacheManager.getCache(url);
      if (cache) {
        inCache = true;
        url = cache;
      }
    }
  } else {
    inLocal = true;
    if (url.startsWith('file://')) {
      url = globalThis.nodeEnv.require('url').fileURLToPath(url);
    }
  }
  return {
    url: url,
    inLocal: inLocal,
    inCache: inCache
  };
};
cc.assetManager.transformPipeline.append(function (task) {
  var input = task.output = task.input;
  for (var i = 0, l = input.length; i < l; i++) {
    var item = input[i];
    var options = item.options;
    if (!item.config) {
      if (item.ext === 'bundle') continue;
      options.cacheEnabled = options.cacheEnabled !== undefined ? options.cacheEnabled : false;
    } else {
      options.__cacheBundleRoot__ = item.config.name;
    }
    if (item.ext === '.cconb') {
      item.url = item.url.replace(item.ext, '.bin');
    } else if (item.ext === '.ccon') {
      item.url = item.url.replace(item.ext, '.json');
    }
  }
});
var originInit = cc.assetManager.init;
cc.assetManager.init = function (options) {
  originInit.call(cc.assetManager, options);
  var subpacks = cc.settings.querySettings('assets', 'subpackages');
  subpacks && subpacks.forEach(function (x) {
    return subpackages[x] = "".concat(_subpackagesPath).concat(x);
  });
  cacheManager.init();
};

},{"./cache-manager":2,"./fs-utils":3}],2:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.
 https://www.cocos.com/
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of cache-manager software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.
 The software or tools in cache-manager License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var _require = require('./fs-utils'),
  makeDirSync = _require.makeDirSync,
  copyFile = _require.copyFile,
  downloadFile = _require.downloadFile,
  deleteFile = _require.deleteFile,
  rmdirSync = _require.rmdirSync,
  getUserDataPath = _require.getUserDataPath;
var checkNextPeriod = false;
var writeCacheFileList = null;
var cleaning = false;
var suffix = 0;
var REGEX = /^https?:\/\/.*/;
var cacheManager = {
  cacheDir: 'gamecaches',
  cachedFileName: 'cacheList.json',
  // whether or not cache asset into user's storage space
  cacheEnabled: true,
  // whether or not auto clear cache when storage ran out
  autoClear: true,
  // cache one per cycle
  cacheInterval: 500,
  deleteInterval: 500,
  writeFileInterval: 2000,
  // whether or not storage space has run out
  outOfStorage: false,
  tempFiles: null,
  cachedFiles: null,
  cacheQueue: {},
  version: '1.0',
  getCache: function getCache(url) {
    return this.cachedFiles.has(url) ? this.cachedFiles.get(url).url : '';
  },
  getTemp: function getTemp(url) {
    return this.tempFiles.has(url) ? this.tempFiles.get(url) : '';
  },
  init: function init() {
    //TODO(qgh): Read the configuration file
    this.cacheDir = "".concat(getUserDataPath(), "/").concat(this.cacheDir);
    this.cachedFiles = new cc.AssetManager.Cache();
    this.tempFiles = new cc.AssetManager.Cache();
  },
  updateLastTime: function updateLastTime(url) {
    if (this.cachedFiles.has(url)) {
      var cache = this.cachedFiles.get(url);
      cache.lastTime = Date.now();
    }
  },
  _write: function _write() {
    writeCacheFileList = null;
    //TODO(qgh): Write to the configuration file
  },
  writeCacheFile: function writeCacheFile() {
    if (!writeCacheFileList) {
      writeCacheFileList = setTimeout(this._write.bind(this), this.writeFileInterval);
    }
  },
  _cache: function _cache() {
    checkNextPeriod = false;
    var self = this;
    var id = '';
    // eslint-disable-next-line no-unreachable-loop
    for (var key in this.cacheQueue) {
      id = key;
      break;
    }
    if (!id) return;
    var _this$cacheQueue$id = this.cacheQueue[id],
      srcUrl = _this$cacheQueue$id.srcUrl,
      isCopy = _this$cacheQueue$id.isCopy,
      cacheBundleRoot = _this$cacheQueue$id.cacheBundleRoot;
    var time = Date.now().toString();
    var localPath = '';
    if (cacheBundleRoot) {
      localPath = "".concat(this.cacheDir, "/").concat(cacheBundleRoot, "/").concat(time).concat(suffix++).concat(cc.path.extname(id));
    } else {
      localPath = "".concat(this.cacheDir, "/").concat(time).concat(suffix++).concat(cc.path.extname(id));
    }
    function callback(err) {
      if (err) {
        console.log('cannot support');
        // if (isOutOfStorage(err.message)) {
        //     self.outOfStorage = true;
        //     self.autoClear && self.clearLRU();
        //     return;
        // }
      } else {
        self.cachedFiles.add(id, {
          bundle: cacheBundleRoot,
          url: localPath,
          lastTime: time
        });
        self.writeCacheFile();
      }
      delete self.cacheQueue[id];
      if (!cc.js.isEmptyObject(self.cacheQueue) && !checkNextPeriod) {
        checkNextPeriod = true;
        setTimeout(self._cache.bind(self), self.cacheInterval);
      }
    }
    if (!isCopy) {
      downloadFile(srcUrl, localPath, null, callback);
    } else {
      copyFile(srcUrl, localPath, callback);
    }
  },
  cacheFile: function cacheFile(id, srcUrl, cacheEnabled, cacheBundleRoot, isCopy) {
    cacheEnabled = cacheEnabled !== undefined ? cacheEnabled : this.cacheEnabled;
    if (!cacheEnabled || this.cacheQueue[id] || this.cachedFiles.has(id)) return;
    this.cacheQueue[id] = {
      srcUrl: srcUrl,
      cacheBundleRoot: cacheBundleRoot,
      isCopy: isCopy
    };
    if (!checkNextPeriod && !this.outOfStorage) {
      checkNextPeriod = true;
      setTimeout(this._cache.bind(this), this.cacheInterval);
    }
  },
  clearCache: function clearCache() {
    var _this = this;
    rmdirSync(this.cacheDir, true);
    this.cachedFiles = new cc.AssetManager.Cache();
    makeDirSync(this.cacheDir, true);
    this.outOfStorage = false;
    clearTimeout(writeCacheFileList);
    this._write();
    cc.assetManager.bundles.forEach(function (bundle) {
      if (REGEX.test(bundle.base)) _this.makeBundleFolder(bundle.name);
    });
  },
  clearLRU: function clearLRU() {
    if (cleaning) return;
    cleaning = true;
    var caches = [];
    var self = this;
    this.cachedFiles.forEach(function (val, key) {
      if (self._isZipFile(key) && cc.assetManager.bundles.find(function (bundle) {
        return bundle.base.indexOf(val.url) !== -1;
      })) return;
      caches.push({
        originUrl: key,
        url: val.url,
        lastTime: val.lastTime
      });
    });
    caches.sort(function (a, b) {
      return a.lastTime - b.lastTime;
    });
    caches.length = Math.floor(caches.length / 3);
    // cache length above 3 then clear 1/3， or clear all caches
    if (caches.length < 3) {
      console.warn('Insufficient storage, cleaning now');
    } else {
      caches.length = Math.floor(caches.length / 3);
    }
    for (var i = 0, l = caches.length; i < l; i++) {
      var cacheKey = "".concat(cc.assetManager.utils.getUuidFromURL(caches[i].originUrl), "@native");
      cc.assetManager.files.remove(cacheKey);
      this.cachedFiles.remove(caches[i].originUrl);
    }
    clearTimeout(writeCacheFileList);
    this._write();
    function deferredDelete() {
      var item = caches.pop();
      self._removePathOrFile(item.originUrl, item.url);
      if (caches.length > 0) {
        setTimeout(deferredDelete, self.deleteInterval);
      } else {
        cleaning = false;
      }
    }
    setTimeout(deferredDelete, self.deleteInterval);
  },
  removeCache: function removeCache(url) {
    if (this.cachedFiles.has(url)) {
      var path = this.cachedFiles.remove(url).url;
      clearTimeout(writeCacheFileList);
      this._write();
      this._removePathOrFile(url, path);
    }
  },
  _removePathOrFile: function _removePathOrFile(url, path) {
    if (this._isZipFile(url)) {
      if (this._isZipFile(path)) {
        deleteFile(path, this._deleteFileCB.bind(this));
      } else {
        rmdirSync(path, true);
        this._deleteFileCB();
      }
    } else {
      deleteFile(path, this._deleteFileCB.bind(this));
    }
  },
  _deleteFileCB: function _deleteFileCB(err) {
    if (!err) this.outOfStorage = false;
  },
  makeBundleFolder: function makeBundleFolder(bundleName) {
    makeDirSync("".concat(this.cacheDir, "/").concat(bundleName), true);
  },
  unzipAndCacheBundle: function unzipAndCacheBundle(id, zipFilePath, cacheBundleRoot, onComplete) {
    var time = Date.now().toString();
    var targetPath = "".concat(this.cacheDir, "/").concat(cacheBundleRoot, "/").concat(time).concat(suffix++);
    var self = this;
    makeDirSync(targetPath, true);
    console.log('cannot support');
  },
  _isZipFile: function _isZipFile(url) {
    return url.slice(-4) === '.zip';
  }
};
cc.assetManager.cacheManager = module.exports = cacheManager;

},{"./fs-utils":3}],3:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.
 https://www.cocos.com/
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of fsUtils software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.
 The software or tools in fsUtils License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

var path = globalThis.nodeEnv.require('path');
var fs = globalThis.nodeEnv.require('fs-extra');
var fsUtils = {
  fs: fs,
  initJsbDownloader: function initJsbDownloader(jsbDownloaderMaxTasks, jsbDownloaderTimeout) {
    console.log("initJsbDownloader: nodejs does not support");
  },
  getUserDataPath: function getUserDataPath() {
    return path.join(globalThis.nodeEnv.userDataPath, "writablePath");
  },
  checkFsValid: function checkFsValid() {
    if (!fs) {
      cc.warn('can not get the file system!');
      return false;
    }
    return true;
  },
  deleteFile: function deleteFile(filePath, onComplete) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath);
    fs.unlink(fullFilePath, function (e) {
      if (e) {
        var err = new Error("Delete file failed: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
        console.warn(err.message);
        onComplete && onComplete(err);
      } else {
        onComplete && onComplete(null);
      }
    });
  },
  fullPathForFilename: function fullPathForFilename(filename) {
    var forceReturnFullpath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    if (filename.length <= 0) {
      return "";
    }
    if (path.isAbsolute(filename)) {
      return filename;
    }
    var newFilename = path.normalize(filename);
    var projectPath = '';
    var fullpath = path.join(projectPath, newFilename);
    if (fs.pathExistsSync(fullpath) || forceReturnFullpath) {
      return fullpath;
    }
    return "";
  },
  saveFile: function saveFile(srcPath, destPath, onComplete) {
    var fullSrcPath = fsUtils.fullPathForFilename(srcPath);
    var fullDestPath = fsUtils.fullPathForFilename(destPath, true);
    fs.ensureDirSync(path.dirname(fullDestPath));
    fs.copyFile(fullSrcPath, fullDestPath, function (e) {
      if (e) {
        var err = new Error("Save file failed: srcPath: \"".concat(srcPath, "\" (resolved: \"").concat(fullSrcPath, "\")                                                           dstPath: \"").concat(destPath, "\" (resolved: \"").concat(fullDestPath, "\")  \n                                                         ").concat(e.message));
        console.warn(err.message);
        onComplete && onComplete(err);
      } else {
        fs.remove(srcPath);
        onComplete && onComplete(null);
      }
    });
  },
  copyFile: function copyFile(srcPath, destPath, onComplete) {
    var fullSrcPath = fsUtils.fullPathForFilename(srcPath);
    var fullDestPath = fsUtils.fullPathForFilename(destPath, true);
    fs.ensureDirSync(path.dirname(fullDestPath));
    fs.copyFile(fullSrcPath, fullDestPath, function (e) {
      if (e) {
        var err = new Error("Copy file failed: srcPath: \"".concat(srcPath, "\" (resolved: \"").concat(fullSrcPath, "\")                                                           dstPath: \"").concat(destPath, "\" (resolved: \"").concat(fullDestPath, "\")  \n                                                         ").concat(e.message));
        cc.warn(err.message);
        onComplete && onComplete(err);
      } else {
        onComplete && onComplete(null);
      }
    });
  },
  writeFile: function writeFile(filePath, data, encoding, onComplete) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath, true);
    fs.writeFile(fullFilePath, data, encoding, function (e) {
      if (e) {
        var err = new Error("Write file failed: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
        cc.warn(err.message);
        onComplete && onComplete(err);
      } else {
        onComplete && onComplete(null);
      }
    });
  },
  writeFileSync: function writeFileSync(filePath, data, encoding) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath, true);
    try {
      fs.writeFile(fullFilePath, data, encoding);
      return null;
    } catch (e) {
      var err = new Error("Failed to write file synchronously: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
      cc.warn(err.message);
      return err;
    }
  },
  readFile: function readFile(filePath, encoding, onComplete) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath);
    fs.readFile(fullFilePath, encoding, function (e, data) {
      if (e) {
        var err = new Error("Read file failed: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
        cc.warn(err.message);
        onComplete && onComplete(err, null);
      } else {
        onComplete && onComplete(null, data);
      }
    });
  },
  readDir: function readDir(dirPath, onComplete) {
    var fullDirPath = fsUtils.fullPathForFilename(dirPath);
    fs.readdir(fullDirPath, function (e, files) {
      if (e) {
        var err = new Error("Read directory failed: \"".concat(dirPath, "\" (resolved: \"").concat(fullDirPath, "\") - ").concat(e.message));
        cc.warn(err.message);
        onComplete && onComplete(err, null);
      } else {
        onComplete && onComplete(null, files);
      }
    });
  },
  readText: function readText(filePath, onComplete) {
    fsUtils.readFile(filePath, 'utf8', onComplete);
  },
  readArrayBuffer: function readArrayBuffer(filePath, onComplete) {
    fsUtils.readFile(filePath, '', onComplete);
  },
  readJson: function readJson(filePath, onComplete) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath);
    fs.readJson(fullFilePath, function (e, jsonObj) {
      if (e) {
        var err = new Error("Read json failed: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
        cc.warn(err.message);
        onComplete && onComplete(err, null);
      } else {
        onComplete && onComplete(null, jsonObj);
      }
    });
  },
  readJsonSync: function readJsonSync(filePath) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath);
    try {
      return fs.readJsonSync(fullFilePath);
    } catch (e) {
      var err = new Error("Failed to read JSON file synchronously: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
      cc.warn(err.message);
      return err;
    }
  },
  makeDirSync: function makeDirSync(dirPath, recursive) {
    var fullDirPath = fsUtils.fullPathForFilename(dirPath, true);
    try {
      fs.mkdirSync(fullDirPath, {
        recursive: recursive
      });
      return null;
    } catch (e) {
      var err = new Error("Make directory failed: \"".concat(dirPath, "\" (resolved: \"").concat(fullDirPath, "\") - ").concat(e.message));
      cc.warn(err.message);
      return err;
    }
  },
  rmdirSync: function rmdirSync(dirPath, recursive) {
    var fullDirPath = fsUtils.fullPathForFilename(dirPath);
    try {
      fs.rmSync(fullDirPath, {
        recursive: recursive
      });
      return null;
    } catch (e) {
      var err = new Error("Remove directory failed: \"".concat(dirPath, "\" (resolved: \"").concat(fullDirPath, "\") - ").concat(e.message));
      cc.warn(err.message);
      return err;
    }
  },
  exists: function exists(filePath, onComplete) {
    var fullFilePath = fsUtils.fullPathForFilename(filePath);
    fs.pathExists(fullFilePath, function (e, exists) {
      if (e) {
        var err = new Error("File existence check failed: \"".concat(filePath, "\" (resolved: \"").concat(fullFilePath, "\") - ").concat(e.message));
        cc.warn(err.message);
        return err;
      }
      onComplete && onComplete(exists);
    });
  },
  loadSubpackage: function loadSubpackage(name, onProgress, onComplete) {
    throw new Error('nodejs not implement');
  }
};
globalThis.fsUtils = module.exports = fsUtils;

},{}],4:[function(require,module,exports){
"use strict";

require('./asset-manager.js');

},{"./asset-manager.js":1}]},{},[4]);
