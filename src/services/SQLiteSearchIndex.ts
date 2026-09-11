/**
 * SQLiteSearchIndex.ts - High-Performance Local Search Index using SQLite WASM in a Web Worker
 * Offloads all SQLite WASM compilation, heavy data extraction, transaction batching,
 * and FTS4 full-text search to a dedicated background Web Worker to ensure 60fps main UI responsiveness.
 */

import { Chat, Message, User } from '../types';
import type {
  SQLiteMessageHit,
  SQLiteContactSearchResult,
  SQLiteMessageSearchResult,
  WorkerAction,
  WorkerActionInput,
} from '../workers/sqlite.worker';

export type { SQLiteMessageHit, SQLiteContactSearchResult, SQLiteMessageSearchResult };
export type SQLiteContactHit = User;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: any;
}

export class SQLiteSearchIndex {
  private static instance: SQLiteSearchIndex;
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private isWasmEngine = false;
  private isFtsSupported = false;
  private initPromise: Promise<void> | null = null;
  private requestCounter = 0;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  private indexedMessagesCount = 0;
  private indexedContactsCount = 0;

  // In-memory fallback if Web Worker is unavailable or encounters error
  private fallbackMessages: Map<string, SQLiteMessageHit> = new Map();
  private fallbackContacts: Map<string, User> = new Map();

  public static getInstance(): SQLiteSearchIndex {
    if (!SQLiteSearchIndex.instance) {
      SQLiteSearchIndex.instance = new SQLiteSearchIndex();
    }
    return SQLiteSearchIndex.instance;
  }

  /**
   * Initialize Web Worker and boot SQLite WASM engine in background
   */
  public async init(): Promise<void> {
    if (this.isWorkerReady && this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        console.warn('[SQLiteSearchIndex] Web Workers not supported in this environment, using memory fallback.');
        return;
      }

      try {
        // Instantiate the dedicated Web Worker using Vite module worker syntax
        this.worker = new Worker(new URL('../workers/sqlite.worker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (event: MessageEvent) => {
          const { id, success, data, error } = event.data || {};
          if (!id) return;

          const pending = this.pendingRequests.get(id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(id);
            if (success) {
              pending.resolve(data);
            } else {
              pending.reject(new Error(error || 'Worker request failed'));
            }
          }
        };

        this.worker.onerror = (err: ErrorEvent) => {
          console.warn('[SQLiteSearchIndex] Web Worker runtime error, falling back to main-thread state:', err.message);
          this.isWorkerReady = false;
        };

        // Send INIT request to Worker
        const initResult = await this.sendWorkerRequest<{ isWasm: boolean; isFtsSupported: boolean }>({
          type: 'INIT',
        });

        this.isWorkerReady = true;
        this.isWasmEngine = initResult.isWasm;
        this.isFtsSupported = initResult.isFtsSupported;
        console.log(
          `[SQLiteSearchIndex] SQLite Web Worker initialized successfully (WASM: ${initResult.isWasm}, FTS4: ${initResult.isFtsSupported}).`
        );
      } catch (err) {
        console.warn('[SQLiteSearchIndex] Worker init failed, using in-memory search fallback:', err);
        this.isWorkerReady = false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Dispatch typed action to Web Worker with timeout and correlation ID
   */
  private sendWorkerRequest<T>(action: WorkerActionInput, timeoutMs = 15000): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error('Web Worker not created'));
    }

    const id = `req_${Date.now()}_${++this.requestCounter}`;
    const payload: WorkerAction = { ...action, id } as WorkerAction;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Worker request ${payload.type} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.worker!.postMessage(payload);
    });
  }

  /**
   * Synchronize chats, messages, and contacts into SQLite WASM inside the Web Worker
   */
  public async syncFromStore(
    chats: Chat[],
    messages: Record<string, Message[]>,
    contacts: User[]
  ): Promise<void> {
    await this.init();

    // Cache fallback state on main thread in case worker disconnects
    this.fallbackContacts.clear();
    contacts.forEach((c) => this.fallbackContacts.set(c.id, c));

    if (this.isWorkerReady && this.worker) {
      try {
        const stats = await this.sendWorkerRequest<{ messagesCount: number; contactsCount: number }>({
          type: 'SYNC',
          payload: { chats, messages, contacts },
        });
        this.indexedMessagesCount = stats.messagesCount;
        this.indexedContactsCount = stats.contactsCount;
        return;
      } catch (err) {
        console.warn('[SQLiteSearchIndex] Worker sync failed, updating fallback store:', err);
      }
    }

    // Fallback sync logic
    const chatMap = new Map<string, Chat>();
    chats.forEach((c) => chatMap.set(c.id, c));

    this.fallbackMessages.clear();
    Object.entries(messages).forEach(([chatId, msgList]) => {
      const parent = chatMap.get(chatId);
      if (Array.isArray(msgList)) {
        msgList.forEach((m) => {
          if (m && m.text) {
            this.fallbackMessages.set(String(m.id), {
              msgId: String(m.id),
              chatId,
              chatTitle: parent?.title || m.senderName || 'Chat',
              chatAvatar: parent?.avatar || m.senderAvatar || '',
              senderName: m.senderName,
              text: m.text,
              date: m.timestamp,
            });
          }
        });
      }
    });

    this.indexedMessagesCount = this.fallbackMessages.size;
    this.indexedContactsCount = this.fallbackContacts.size;
  }

  /**
   * Search messages with instant sub-millisecond retrieval offloaded to Web Worker
   */
  public async searchMessages(
    query: string,
    options: { limit?: number; chatId?: string } = {}
  ): Promise<SQLiteMessageSearchResult> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { hits: [], latencyMs: 0, engine: 'SQLite WebWorker' };
    }

    if (this.isWorkerReady && this.worker) {
      try {
        return await this.sendWorkerRequest<SQLiteMessageSearchResult>({
          type: 'SEARCH_MESSAGES',
          payload: { query: cleanQuery, options },
        });
      } catch (err) {
        console.warn('[SQLiteSearchIndex] Worker message search error, falling back to memory:', err);
      }
    }

    // Fallback search execution
    const startTime = performance.now();
    const limit = options.limit || 40;
    const qLower = cleanQuery.toLowerCase();
    const hits: SQLiteMessageHit[] = [];

    for (const m of this.fallbackMessages.values()) {
      if (options.chatId && m.chatId !== options.chatId) continue;
      if (m.text.toLowerCase().includes(qLower) || m.chatTitle.toLowerCase().includes(qLower)) {
        hits.push(m);
        if (hits.length >= limit) break;
      }
    }

    const latencyMs = Math.round((performance.now() - startTime) * 10) / 10;
    return {
      hits,
      latencyMs,
      engine: 'In-Memory Index (Main Thread Fallback)',
    };
  }

  /**
   * Search contacts with instant retrieval offloaded to Web Worker
   */
  public async searchContacts(
    query: string,
    options: { limit?: number } = {}
  ): Promise<SQLiteContactSearchResult> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { users: [], latencyMs: 0 };
    }

    if (this.isWorkerReady && this.worker) {
      try {
        return await this.sendWorkerRequest<SQLiteContactSearchResult>({
          type: 'SEARCH_CONTACTS',
          payload: { query: cleanQuery, options },
        });
      } catch (err) {
        console.warn('[SQLiteSearchIndex] Worker contact search error, falling back to memory:', err);
      }
    }

    // Fallback contact search
    const startTime = performance.now();
    const limit = options.limit || 30;
    const qLower = cleanQuery.toLowerCase();
    const results: User[] = [];

    for (const c of this.fallbackContacts.values()) {
      if (
        (c.name && c.name.toLowerCase().includes(qLower)) ||
        (c.username && c.username.toLowerCase().includes(qLower)) ||
        (c.phone && c.phone.includes(qLower)) ||
        (c.bio && c.bio.toLowerCase().includes(qLower))
      ) {
        results.push(c);
        if (results.length >= limit) break;
      }
    }

    const latencyMs = Math.round((performance.now() - startTime) * 10) / 10;
    return { users: results, latencyMs };
  }

  /**
   * Get search index health, counts, and worker status
   */
  public getStats() {
    return {
      isWasmEngine: this.isWasmEngine,
      isWorker: this.isWorkerReady,
      isFtsSupported: this.isFtsSupported,
      messagesCount: this.indexedMessagesCount,
      contactsCount: this.indexedContactsCount,
    };
  }
}

export const sqliteSearchIndex = SQLiteSearchIndex.getInstance();
