/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 WebSocket stub for Emscripten/WASM. Browser WebSocket is typically used via JS bindings.
 This file provides the C++ interface so the engine links; real implementation can be in JS.
****************************************************************************/

#include "base/Macros.h"
#include "base/memory/Memory.h"
#include "network/WebSocket.h"
#include "base/std/container/string.h"
#include "base/std/container/vector.h"
#include <cstddef>
#include <mutex>

// WebSocket.h forward-declares WebSocketImpl in global namespace (line 44), so define it here in global namespace
class WebSocketImpl {
public:
    static void closeAllConnections() {}

    explicit WebSocketImpl(cc::network::WebSocket *ws)
    : _ws(ws),
      _readyState(cc::network::WebSocket::State::CLOSED),
      _delegate(nullptr) {}

    ~WebSocketImpl() = default;

    bool init(const cc::network::WebSocket::Delegate &delegate,
              const ccstd::string &url,
              const ccstd::vector<ccstd::string> *protocols = nullptr,
              const ccstd::string &caFilePath = "") {
        _delegate = const_cast<cc::network::WebSocket::Delegate *>(&delegate);
        _url = url;
        (void)protocols;
        (void)caFilePath;
        return false; // stub: not connected
    }

    void send(const ccstd::string &message) { (void)message; }
    void send(const unsigned char *binaryMsg, unsigned int len) { (void)binaryMsg; (void)len; }
    void close() {}
    void closeAsync() {}
    void closeAsync(int code, const ccstd::string &reason) { (void)code; (void)reason; }

    cc::network::WebSocket::State getReadyState() const { return _readyState; }
    const ccstd::string &getUrl() const { return _url; }
    const ccstd::string &getProtocol() const { return _selectedProtocol; }
    cc::network::WebSocket::Delegate *getDelegate() const { return _delegate; }
    size_t getBufferedAmount() const { return 0; }
    ccstd::string getExtensions() const { return ""; }

private:
    cc::network::WebSocket *_ws{nullptr};
    cc::network::WebSocket::State _readyState;
    ccstd::string _url;
    ccstd::string _selectedProtocol;
    cc::network::WebSocket::Delegate *_delegate{nullptr};
};

namespace cc {

namespace network {

void WebSocket::closeAllConnections() {
    WebSocketImpl::closeAllConnections();
}

WebSocket::WebSocket() {
    _impl = ccnew ::WebSocketImpl(this);
}

WebSocket::~WebSocket() {
    if (_impl) {
        delete _impl;
        _impl = nullptr;
    }
}

bool WebSocket::init(const Delegate &delegate,
                     const ccstd::string &url,
                     const ccstd::vector<ccstd::string> *protocols,
                     const ccstd::string &caFilePath) {
    return _impl ? _impl->init(delegate, url, protocols, caFilePath) : false;
}

void WebSocket::send(const ccstd::string &message) {
    if (_impl) _impl->send(message);
}

void WebSocket::send(const unsigned char *binaryMsg, unsigned int len) {
    if (_impl) _impl->send(binaryMsg, len);
}

void WebSocket::close() {
    if (_impl) _impl->close();
}

void WebSocket::closeAsync() {
    if (_impl) _impl->closeAsync();
}

void WebSocket::closeAsync(int code, const ccstd::string &reason) {
    if (_impl) _impl->closeAsync(code, reason);
}

WebSocket::State WebSocket::getReadyState() const {
    return _impl ? _impl->getReadyState() : State::CLOSED;
}

ccstd::string WebSocket::getExtensions() const {
    return _impl ? _impl->getExtensions() : "";
}

size_t WebSocket::getBufferedAmount() const {
    return _impl ? _impl->getBufferedAmount() : 0;
}

const ccstd::string &WebSocket::getUrl() const {
    static ccstd::string empty;
    return _impl ? _impl->getUrl() : empty;
}

const ccstd::string &WebSocket::getProtocol() const {
    static ccstd::string empty;
    return _impl ? _impl->getProtocol() : empty;
}

WebSocket::Delegate *WebSocket::getDelegate() const {
    return _impl ? _impl->getDelegate() : nullptr;
}

} // namespace network
} // namespace cc
