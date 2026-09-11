/**
 * sqlite.worker.ts - Dedicated Web Worker for SQLite WASM / ASM & Heavy Data Indexing
 * Keeps the main UI thread completely fluid and unblocked during massive data syncs and FTS queries.
 */

// @ts-ignore
import initSqlJs from 'sql.js';
// @ts-ignore
import initSqlAsm from 'sql.js/dist/sql-asm.js';
import type { Database } from 'sql.js';
import { Chat, Message, User } from '../types';

export interface SQLiteMessageHit {
  msgId: string;
  chatId: string;
  chatTitle: string;
  chatAvatar?: string;
  senderName?: string;
  text: string;
  date: string;
  snippet?: string;
  score?: number;
}

export interface SQLiteContactSearchResult {
  users: User[];
  latencyMs: number;
}

export interface SQLiteMessageSearchResult {
  hits: SQLiteMessageHit[];
  latencyMs: number;
  engine: string;
}

export type WorkerActionInput =
  | { type: 'INIT' }
  | {
      type: 'SYNC';
      payload: {
        chats: Chat[];
        messages: Record<string, Message[]>;
        contacts: User[];
      };
    }
  | {
      type: 'SEARCH_MESSAGES';
      payload: {
        query: string;
        options?: { limit?: number; chatId?: string };
      };
    }
  | {
      type: 'SEARCH_CONTACTS';
      payload: {
        query: string;
        options?: { limit?: number };
      };
    }
  | { type: 'GET_STATS' };

export type WorkerAction = WorkerActionInput & { id: string };

class SQLiteWorkerEngine {
  private db: Database | null = null;
  private isWasmInitialized = false;
  private isFtsSupported = false;
  private indexedMessagesCount = 0;
  private indexedContactsCount = 0;

  // In-memory fallback maps within the worker
  private fallbackMessages: Map<string, SQLiteMessageHit> = new Map();
  private fallbackContacts: Map<string, User> = new Map();

  public async init(): Promise<{ isWasm: boolean; isFtsSupported: boolean }> {
    if (this.isWasmInitialized && this.db) {
      return { isWasm: true, isFtsSupported: this.isFtsSupported };
    }

    try {
      // 1. Attempt SQLite WASM with wasm binary from public directory
      let SQL: any = null;
      try {
        SQL = await initSqlJs({
          locateFile: (file: string) => {
            if (file.endsWith('.wasm')) return '/sql-wasm.wasm';
            return '/' + file;
          },
        });
      } catch (wasmErr) {
        console.warn('[SQLiteWorker] WASM binary fetch/compile failed, falling back to ASM.js:', wasmErr);
      }

      // 2. Fallback to ASM if WASM failed
      if (!SQL && initSqlAsm) {
        SQL = await initSqlAsm();
      }

      if (SQL) {
        this.db = new SQL.Database();
        this.initSchema();
        this.isWasmInitialized = true;
        console.log('[SQLiteWorker] Initialized SQLite database engine with FTS4 support.');
      }
    } catch (err) {
      console.warn('[SQLiteWorker] SQLite engine initialization failed, using worker memory fallback:', err);
    }

    return {
      isWasm: this.isWasmInitialized,
      isFtsSupported: this.isFtsSupported,
    };
  }

  private initSchema(): void {
    if (!this.db) return;

    try {
      // FTS4 full-text search table with porter stemmer
      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts4(
          msg_id,
          chat_id,
          chat_title,
          chat_avatar,
          sender_name,
          text,
          date,
          tokenize=porter
        );
      `);

      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts4(
          id,
          name,
          username,
          phone,
          avatar,
          bio,
          tokenize=porter
        );
      `);

      this.isFtsSupported = true;
    } catch (ftsErr) {
      console.warn('[SQLiteWorker] FTS4 not supported, falling back to standard indexed tables:', ftsErr);
      this.isFtsSupported = false;

      this.db.run(`
        CREATE TABLE IF NOT EXISTS messages_idx (
          msg_id TEXT PRIMARY KEY,
          chat_id TEXT,
          chat_title TEXT,
          chat_avatar TEXT,
          sender_name TEXT,
          text TEXT,
          date TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_msg_text ON messages_idx(text);
        CREATE INDEX IF NOT EXISTS idx_msg_chat ON messages_idx(chat_id);

        CREATE TABLE IF NOT EXISTS contacts_idx (
          id TEXT PRIMARY KEY,
          name TEXT,
          username TEXT,
          phone TEXT,
          avatar TEXT,
          bio TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts_idx(name);
        CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts_idx(username);
      `);
    }
  }

  public async syncFromStore(
    chats: Chat[],
    messages: Record<string, Message[]>,
    contacts: User[]
  ): Promise<{ messagesCount: number; contactsCount: number }> {
    await this.init();

    const chatMap = new Map<string, Chat>();
    chats.forEach((c) => chatMap.set(c.id, c));

    // Update in-memory fallback stores
    this.fallbackContacts.clear();
    contacts.forEach((c) => this.fallbackContacts.set(c.id, c));

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

    if (!this.db) {
      this.indexedMessagesCount = this.fallbackMessages.size;
      this.indexedContactsCount = this.fallbackContacts.size;
      return {
        messagesCount: this.indexedMessagesCount,
        contactsCount: this.indexedContactsCount,
      };
    }

    try {
      this.db.run('BEGIN TRANSACTION;');

      if (this.isFtsSupported) {
        this.db.run('DELETE FROM messages_fts;');
        this.db.run('DELETE FROM contacts_fts;');

        const msgStmt = this.db.prepare(`
          INSERT INTO messages_fts (msg_id, chat_id, chat_title, chat_avatar, sender_name, text, date)
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `);

        for (const m of this.fallbackMessages.values()) {
          msgStmt.run([
            m.msgId,
            m.chatId,
            m.chatTitle,
            m.chatAvatar || '',
            m.senderName || '',
            m.text,
            m.date,
          ]);
        }
        msgStmt.free();

        const contactStmt = this.db.prepare(`
          INSERT INTO contacts_fts (id, name, username, phone, avatar, bio)
          VALUES (?, ?, ?, ?, ?, ?);
        `);

        for (const c of contacts) {
          contactStmt.run([
            c.id,
            c.name || '',
            c.username || '',
            c.phone || '',
            c.avatar || '',
            c.bio || '',
          ]);
        }
        contactStmt.free();
      } else {
        this.db.run('DELETE FROM messages_idx;');
        this.db.run('DELETE FROM contacts_idx;');

        const msgStmt = this.db.prepare(`
          INSERT OR REPLACE INTO messages_idx (msg_id, chat_id, chat_title, chat_avatar, sender_name, text, date)
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `);

        for (const m of this.fallbackMessages.values()) {
          msgStmt.run([
            m.msgId,
            m.chatId,
            m.chatTitle,
            m.chatAvatar || '',
            m.senderName || '',
            m.text,
            m.date,
          ]);
        }
        msgStmt.free();

        const contactStmt = this.db.prepare(`
          INSERT OR REPLACE INTO contacts_idx (id, name, username, phone, avatar, bio)
          VALUES (?, ?, ?, ?, ?, ?);
        `);

        for (const c of contacts) {
          contactStmt.run([
            c.id,
            c.name || '',
            c.username || '',
            c.phone || '',
            c.avatar || '',
            c.bio || '',
          ]);
        }
        contactStmt.free();
      }

      this.db.run('COMMIT;');
      this.indexedMessagesCount = this.fallbackMessages.size;
      this.indexedContactsCount = contacts.length;
    } catch (err) {
      try {
        this.db.run('ROLLBACK;');
      } catch (_) {}
      console.warn('[SQLiteWorker] Sync transaction error:', err);
    }

    return {
      messagesCount: this.indexedMessagesCount,
      contactsCount: this.indexedContactsCount,
    };
  }

  public async searchMessages(
    query: string,
    options: { limit?: number; chatId?: string } = {}
  ): Promise<SQLiteMessageSearchResult> {
    const startTime = performance.now();
    const limit = options.limit || 40;
    const cleanQuery = query.trim().replace(/['"*;]/g, '');

    if (!cleanQuery) {
      return { hits: [], latencyMs: 0, engine: 'SQLite WebWorker (Idle)' };
    }

    if (!this.db) {
      // Fallback search in worker memory
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
      return { hits, latencyMs, engine: 'Worker Memory Fallback' };
    }

    const hits: SQLiteMessageHit[] = [];

    try {
      if (this.isFtsSupported) {
        const ftsQuery = `"${cleanQuery}"*`;
        const stmt = options.chatId
          ? this.db.prepare(`
              SELECT msg_id, chat_id, chat_title, chat_avatar, sender_name, text, date, snippet(messages_fts, '<mark>', '</mark>', '...', -1, 12) as snip
              FROM messages_fts
              WHERE messages_fts MATCH ? AND chat_id = ?
              LIMIT ?;
            `)
          : this.db.prepare(`
              SELECT msg_id, chat_id, chat_title, chat_avatar, sender_name, text, date, snippet(messages_fts, '<mark>', '</mark>', '...', -1, 12) as snip
              FROM messages_fts
              WHERE messages_fts MATCH ?
              LIMIT ?;
            `);

        if (options.chatId) {
          stmt.bind([ftsQuery, options.chatId, limit]);
        } else {
          stmt.bind([ftsQuery, limit]);
        }

        while (stmt.step()) {
          const row = stmt.getAsObject();
          hits.push({
            msgId: String(row.msg_id),
            chatId: String(row.chat_id),
            chatTitle: String(row.chat_title),
            chatAvatar: row.chat_avatar ? String(row.chat_avatar) : undefined,
            senderName: row.sender_name ? String(row.sender_name) : undefined,
            text: String(row.text),
            date: String(row.date),
            snippet: row.snip ? String(row.snip) : undefined,
          });
        }
        stmt.free();
      } else {
        const likePattern = `%${cleanQuery}%`;
        const stmt = options.chatId
          ? this.db.prepare(`
              SELECT msg_id, chat_id, chat_title, chat_avatar, sender_name, text, date
              FROM messages_idx
              WHERE (text LIKE ? OR chat_title LIKE ?) AND chat_id = ?
              LIMIT ?;
            `)
          : this.db.prepare(`
              SELECT msg_id, chat_id, chat_title, chat_avatar, sender_name, text, date
              FROM messages_idx
              WHERE text LIKE ? OR chat_title LIKE ?
              LIMIT ?;
            `);

        if (options.chatId) {
          stmt.bind([likePattern, likePattern, options.chatId, limit]);
        } else {
          stmt.bind([likePattern, likePattern, limit]);
        }

        while (stmt.step()) {
          const row = stmt.getAsObject();
          hits.push({
            msgId: String(row.msg_id),
            chatId: String(row.chat_id),
            chatTitle: String(row.chat_title),
            chatAvatar: row.chat_avatar ? String(row.chat_avatar) : undefined,
            senderName: row.sender_name ? String(row.sender_name) : undefined,
            text: String(row.text),
            date: String(row.date),
          });
        }
        stmt.free();
      }
    } catch (err) {
      console.warn('[SQLiteWorker] Search query error, using fallback:', err);
      const qLower = cleanQuery.toLowerCase();
      for (const m of this.fallbackMessages.values()) {
        if (options.chatId && m.chatId !== options.chatId) continue;
        if (m.text.toLowerCase().includes(qLower)) {
          hits.push(m);
          if (hits.length >= limit) break;
        }
      }
    }

    const latencyMs = Math.max(0.1, Math.round((performance.now() - startTime) * 10) / 10);
    return {
      hits,
      latencyMs,
      engine: this.isFtsSupported ? 'SQLite Worker (FTS4)' : 'SQLite Worker (B-Tree)',
    };
  }

  public async searchContacts(
    query: string,
    options: { limit?: number } = {}
  ): Promise<SQLiteContactSearchResult> {
    const startTime = performance.now();
    const limit = options.limit || 30;
    const cleanQuery = query.trim().replace(/['"*;]/g, '');

    if (!cleanQuery) {
      return { users: [], latencyMs: 0 };
    }

    const results: User[] = [];

    if (!this.db) {
      const qLower = cleanQuery.toLowerCase();
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

    try {
      if (this.isFtsSupported) {
        const ftsQuery = `"${cleanQuery}"*`;
        const stmt = this.db.prepare(`
          SELECT id, name, username, phone, avatar, bio
          FROM contacts_fts
          WHERE contacts_fts MATCH ?
          LIMIT ?;
        `);
        stmt.bind([ftsQuery, limit]);

        while (stmt.step()) {
          const row = stmt.getAsObject();
          const existing = this.fallbackContacts.get(String(row.id));
          results.push({
            id: String(row.id),
            name: String(row.name || ''),
            username: row.username ? String(row.username) : undefined,
            phone: row.phone ? String(row.phone) : undefined,
            avatar: row.avatar ? String(row.avatar) : undefined,
            bio: row.bio ? String(row.bio) : undefined,
            isOnline: existing?.isOnline || false,
            isPremium: existing?.isPremium || false,
          });
        }
        stmt.free();
      } else {
        const likePattern = `%${cleanQuery}%`;
        const stmt = this.db.prepare(`
          SELECT id, name, username, phone, avatar, bio
          FROM contacts_idx
          WHERE name LIKE ? OR username LIKE ? OR phone LIKE ? OR bio LIKE ?
          LIMIT ?;
        `);
        stmt.bind([likePattern, likePattern, likePattern, likePattern, limit]);

        while (stmt.step()) {
          const row = stmt.getAsObject();
          const existing = this.fallbackContacts.get(String(row.id));
          results.push({
            id: String(row.id),
            name: String(row.name || ''),
            username: row.username ? String(row.username) : undefined,
            phone: row.phone ? String(row.phone) : undefined,
            avatar: row.avatar ? String(row.avatar) : undefined,
            bio: row.bio ? String(row.bio) : undefined,
            isOnline: existing?.isOnline || false,
            isPremium: existing?.isPremium || false,
          });
        }
        stmt.free();
      }
    } catch (err) {
      console.warn('[SQLiteWorker] Contact query error, using fallback:', err);
      const qLower = cleanQuery.toLowerCase();
      for (const c of this.fallbackContacts.values()) {
        if (
          (c.name && c.name.toLowerCase().includes(qLower)) ||
          (c.username && c.username.toLowerCase().includes(qLower)) ||
          (c.phone && c.phone.includes(qLower))
        ) {
          results.push(c);
          if (results.length >= limit) break;
        }
      }
    }

    const latencyMs = Math.max(0.1, Math.round((performance.now() - startTime) * 10) / 10);
    return { users: results, latencyMs };
  }

  public getStats() {
    return {
      isWasmEngine: this.isWasmInitialized && this.isFtsSupported,
      messagesCount: this.indexedMessagesCount,
      contactsCount: this.indexedContactsCount,
    };
  }
}

// Instantiate engine inside Worker context
const engine = new SQLiteWorkerEngine();

self.addEventListener('message', async (event: MessageEvent<WorkerAction>) => {
  const msg = event.data;
  if (!msg || !msg.id) return;

  try {
    switch (msg.type) {
      case 'INIT': {
        const data = await engine.init();
        self.postMessage({ id: msg.id, type: 'INIT_RES', success: true, data });
        break;
      }
      case 'SYNC': {
        const data = await engine.syncFromStore(
          msg.payload.chats,
          msg.payload.messages,
          msg.payload.contacts
        );
        self.postMessage({ id: msg.id, type: 'SYNC_RES', success: true, data });
        break;
      }
      case 'SEARCH_MESSAGES': {
        const data = await engine.searchMessages(msg.payload.query, msg.payload.options);
        self.postMessage({ id: msg.id, type: 'SEARCH_MESSAGES_RES', success: true, data });
        break;
      }
      case 'SEARCH_CONTACTS': {
        const data = await engine.searchContacts(msg.payload.query, msg.payload.options);
        self.postMessage({ id: msg.id, type: 'SEARCH_CONTACTS_RES', success: true, data });
        break;
      }
      case 'GET_STATS': {
        const data = engine.getStats();
        self.postMessage({ id: msg.id, type: 'GET_STATS_RES', success: true, data });
        break;
      }
      default: {
        self.postMessage({
          id: (msg as any).id,
          success: false,
          error: `Unknown action type: ${(msg as any).type}`,
        });
      }
    }
  } catch (err: any) {
    self.postMessage({
      id: msg.id,
      success: false,
      error: err?.message || String(err),
    });
  }
});
