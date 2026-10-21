/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TELEGRAM_CONFIG } from '../config/telegram';

/**
 * خدمة التشفير وحماية البيانات السحابية
 * تعتمد على خوارزمية AES-GCM 256-bit عبر Web Crypto API الأصيلة
 */
class CryptoService {
  private encryptionKey: CryptoKey | null = null;
  private isInitialized = false;

  async initKey(salt: string = 'telegram_cloud_salt_2026'): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey;

    try {
      const enc = new TextEncoder();
      const rawKey = enc.encode(TELEGRAM_CONFIG.API_HASH + '_' + salt);
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      this.encryptionKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      this.isInitialized = true;
      return this.encryptionKey;
    } catch (e) {
      console.warn('Web Crypto deriveKey fallback:', e);
      // Generate standard random key if PBKDF2 not supported
      this.encryptionKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      this.isInitialized = true;
      return this.encryptionKey;
    }
  }

  /**
   * تشفير نص أو حمولة بيانات
   */
  async encrypt(data: string): Promise<{ ciphertext: string; iv: string; hash: string }> {
    const key = await this.initKey();
    const enc = new TextEncoder();
    const encodedData = enc.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivStr = btoa(String.fromCharCode(...iv));

    return { ciphertext, iv: ivStr, hash };
  }

  /**
   * فك تشفير نص أو حمولة بيانات
   */
  async decrypt(ciphertext: string, ivStr: string): Promise<string> {
    const key = await this.initKey();
    const iv = new Uint8Array(atob(ivStr).split('').map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * حساب بصمة التشفير (Fingerprint/Hash)
   */
  async calculateFingerprint(text: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(text));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  }
}

export const cryptoService = new CryptoService();
