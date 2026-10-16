/*
 * This is the source code of tgnet library for Telegram,
 * an official client for Android and other mobile platforms.
 * https://github.com/DrKLO/Telegram
 *
 * Copyright (c) 2015-2024, Telegram Messenger Inc.
 */

#include "Connection.h"
#include "Datacenter.h"
#include "Handshake.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>

namespace tgnet {

Connection::Connection(Datacenter *dc, ConnectionType type) {
    datacenter = dc;
    connectionType = type;
    currentSocket = -1;
    state = ConnectionStateDisconnected;
    isSuspended = false;
    hasSentAcks = false;
    channelToken = 0;
    reconnectTimer = 0;
    lastPingTime = 0;
}

Connection::~Connection() {
    closeSocket();
}

void Connection::connect() {
    if (state != ConnectionStateDisconnected) {
        return;
    }
    
    currentSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (currentSocket < 0) {
        state = ConnectionStateDisconnected;
        return;
    }

    // Set non-blocking socket
    int flags = fcntl(currentSocket, F_GETFL, 0);
    fcntl(currentSocket, F_SETFL, flags | O_NONBLOCK);

    // Disable Nagle's algorithm for instant MTProto packet dispatch
    int yes = 1;
    setsockopt(currentSocket, IPPROTO_TCP, TCP_NODELAY, (char*)&yes, sizeof(int));

    state = ConnectionStateConnecting;
    sockaddr_in serverAddress{};
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_port = htons(datacenter->getPort());
    inet_pton(AF_INET, datacenter->getAddress().c_str(), &serverAddress.sin_addr);

    int result = ::connect(currentSocket, (struct sockaddr*)&serverAddress, sizeof(serverAddress));
    if (result == 0 || (result < 0 && errno == EINPROGRESS)) {
        state = ConnectionStateConnected;
        onConnected();
    } else {
        closeSocket();
    }
}

void Connection::sendData(NativeByteBuffer *buffer, bool reportAck) {
    if (state != ConnectionStateConnected || currentSocket < 0) {
        return;
    }
    
    uint32_t length = buffer->limit();
    uint8_t *bytes = buffer->bytes();
    
    ssize_t sent = ::send(currentSocket, bytes, length, 0);
    if (sent < 0) {
        if (errno != EAGAIN && errno != EWOULDBLOCK) {
            closeSocket();
        }
    }
}

void Connection::onReceivedData(NativeByteBuffer *buffer) {
    if (datacenter != nullptr) {
        datacenter->onDataReceived(buffer, this);
    }
}

void Connection::closeSocket() {
    if (currentSocket >= 0) {
        ::close(currentSocket);
        currentSocket = -1;
    }
    state = ConnectionStateDisconnected;
}

} // namespace tgnet
