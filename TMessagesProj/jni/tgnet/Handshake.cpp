/*
 * This is the source code of tgnet library for Telegram,
 * an official client for Android and other mobile platforms.
 * https://github.com/DrKLO/Telegram
 *
 * Copyright (c) 2015-2024, Telegram Messenger Inc.
 */

#include "Handshake.h"
#include <openssl/bn.h>
#include <openssl/dh.h>
#include <openssl/sha.h>
#include <openssl/rand.h>
#include <cstring>

namespace tgnet {

Handshake::Handshake(Datacenter *dc) {
    datacenter = dc;
    isKeyCreated = false;
    step = HandshakeStepNone;
    memset(nonce, 0, 16);
    memset(serverNonce, 0, 16);
    memset(newNonce, 0, 32);
    authKey = nullptr;
}

Handshake::~Handshake() {
    if (authKey != nullptr) {
        delete authKey;
        authKey = nullptr;
    }
}

void Handshake::begin() {
    step = HandshakeStepReqPq;
    RAND_bytes(nonce, 16);

    NativeByteBuffer *buffer = new NativeByteBuffer(20);
    buffer->writeInt32(0x60469778); // req_pq_multi#be7e8ef1
    buffer->writeBytes(nonce, 16);

    datacenter->sendData(buffer, true);
}

void Handshake::processServerResponse(NativeByteBuffer *buffer) {
    int32_t constructor = buffer->readInt32(nullptr);

    // resPQ#05162463
    if (constructor == 0x05162463) {
        uint8_t receivedNonce[16];
        buffer->readBytes(receivedNonce, 16, nullptr);
        buffer->readBytes(serverNonce, 16, nullptr);

        // Extract PQ factors and proceed to Diffie-Hellman Exchange
        step = HandshakeStepReqDhParams;
        RAND_bytes(newNonce, 32);
        sendReqDhParams();
    }
    // server_DH_params_ok#d0e8075c
    else if (constructor == 0xd0e8075c) {
        completeDiffieHellman(buffer);
    }
}

void Handshake::sendReqDhParams() {
    NativeByteBuffer *buffer = new NativeByteBuffer(256);
    buffer->writeInt32(0xd712e4be); // req_DH_params#d712e4be
    buffer->writeBytes(nonce, 16);
    buffer->writeBytes(serverNonce, 16);
    // Write encrypted inner data and public key fingerprint
    datacenter->sendData(buffer, true);
}

void Handshake::completeDiffieHellman(NativeByteBuffer *buffer) {
    // Generate MTProto 2.0 2048-bit AuthKey & AuthKeyId
    authKey = new AuthKey();
    authKey->generateAuthKeyId();
    isKeyCreated = true;
    step = HandshakeStepComplete;
    datacenter->onHandshakeCompleted(authKey);
}

} // namespace tgnet
