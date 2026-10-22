/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Telegram Web Plus - Dual-Layer Persistence Engine (IndexedDB + Storage Layer)
 * Matches official Telegram Web K / Web A storage resilience
 */

import { TelegramUser, ChatMessage, ActiveSession } from '../types/telegram';

const DB_NAME = 'telegram_web_plus_db_v1';
const DB_VERSION = 1;

class IndexedDbService {
  private db: IDBDatabase | null = null;
  private isReady = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.init();
  }

  async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return false;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('accounts')) {
            db.createObjectStore('accounts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('messages')) {
            db.createObjectStore('messages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('pts_cursors')) {
            db.createObjectStore('pts_cursors', { keyPath: 'key' });
          }
        };

        req.onsuccess = () => {
          this.db = req.result;
          this.isReady = true;
          resolve(true);
        };

        req.onerror = () => {
          this.isReady = false;
          resolve(false);
        };
      } catch (err) {
        this.isReady = false;
        resolve(false);
      }
    });

    return this.initPromise;
  }

  // --- الحسابات (Accounts Store) ---
  async saveAccount(account: TelegramUser): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('accounts', 'readwrite');
        const store = tx.objectStore('accounts');
        store.put(account);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  async getAllAccounts(): Promise<TelegramUser[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('accounts', 'readonly');
        const store = tx.objectStore('accounts');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('accounts', 'readwrite');
        const store = tx.objectStore('accounts');
        store.delete(userId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  // --- مؤشر المزامنة السحابية PTS Cursor ---
  async savePtsCursor(key: string, pts: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('pts_cursors', 'readwrite');
        const store = tx.objectStore('pts_cursors');
        store.put({ key, pts, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  async getPtsCursor(key: string): Promise<number | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('pts_cursors', 'readonly');
        const store = tx.objectStore('pts_cursors');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.pts : null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
}

export const indexedDbService = new IndexedDbService();
