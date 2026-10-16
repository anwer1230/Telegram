/*
 * This is the source code of tgnet library for Telegram,
 * an official client for Android and other mobile platforms.
 * https://github.com/DrKLO/Telegram
 *
 * Copyright (c) 2015-2024, Telegram Messenger Inc.
 */

#include "Datacenter.h"
#include "Connection.h"
#include "Handshake.h"
#include <vector>

namespace tgnet {

Datacenter::Datacenter(uint32_t id, const std::string &address, uint16_t port) {
    datacenterId = id;
    ipAddress = address;
    serverPort = port;
    authKey = nullptr;
    handshake = nullptr;
    genericConnection = nullptr;
    authorized = false;
}

Datacenter::~Datacenter() {
    if (handshake != nullptr) {
        delete handshake;
    }
    if (genericConnection != nullptr) {
        delete genericConnection;
    }
}

void Datacenter::connect() {
    if (genericConnection == nullptr) {
        genericConnection = new Connection(this, ConnectionTypeGeneric);
    }
    genericConnection->connect();

    if (authKey == nullptr) {
        handshake = new Handshake(this);
        handshake->begin();
    }
}

void Datacenter::sendData(NativeByteBuffer *buffer, bool reportAck) {
    if (genericConnection != nullptr) {
        genericConnection->sendData(buffer, reportAck);
    }
}

void Datacenter::onDataReceived(NativeByteBuffer *buffer, Connection *connection) {
    if (handshake != nullptr && !handshake->isCompleted()) {
        handshake->processServerResponse(buffer);
        return;
    }

    // Pass decrypted payload to MTProto dispatcher
    onUnparsedMessageReceived(datacenterId, buffer);
}

void Datacenter::onHandshakeCompleted(AuthKey *key) {
    authKey = key;
    authorized = true;
    if (handshake != nullptr) {
        delete handshake;
        handshake = nullptr;
    }
}

uint32_t Datacenter::getDatacenterId() const {
    return datacenterId;
}

const std::string& Datacenter::getAddress() const {
    return ipAddress;
}

uint16_t Datacenter::getPort() const {
    return serverPort;
}

} // namespace tgnet
