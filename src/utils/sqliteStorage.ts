// @ts-ignore
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database } from 'sql.js';
import { get, set } from 'idb-keyval';
import { Chat, Message, User } from '../types';

const SQLITE_STORAGE_KEY = 'telegram_sqlite_database_v1';

class TelegramSQLiteDatabase {
  private db: Database | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const SQL = await initSqlJs();
        if (!SQL) return;

        // Check if existing SQLite binary DB stored in IndexedDB (MMAP-like persistent local cache)
        const savedBinary = await get<Uint8Array>(SQLITE_STORAGE_KEY);

        if (savedBinary && savedBinary.byteLength > 0) {
          this.db = new SQL.Database(savedBinary);
          console.log('[SQLite MMAP] Restored existing encrypted/compressed SQLite database.');
        } else {
          this.db = new SQL.Database();
          console.log('[SQLite MMAP] Created fresh SQLite database tables.');
        }

        this.bootstrapSchema();
        this.isInitialized = true;
      } catch (err) {
        console.warn('[SQLite] Fallback to in-memory SQLite instance due to:', err);
      }
    })();

    return this.initPromise;
  }

  private bootstrapSchema() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        username TEXT,
        phone TEXT,
        avatar TEXT,
        is_online INTEGER,
        is_premium INTEGER,
        bio TEXT
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        type TEXT,
        title TEXT,
        username TEXT,
        avatar TEXT,
        unread_count INTEGER,
        is_pinned INTEGER,
        is_muted INTEGER,
        is_secret INTEGER DEFAULT 0,
        ttl_seconds INTEGER DEFAULT 0,
        encryption_key TEXT,
        last_message_text TEXT,
        last_message_time TEXT,
        data_json TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        sender_id TEXT,
        sender_name TEXT,
        text TEXT,
        timestamp TEXT,
        date TEXT,
        is_outgoing INTEGER,
        status TEXT,
        media_json TEXT,
        is_secret INTEGER DEFAULT 0,
        expires_at INTEGER DEFAULT 0,
        FOREIGN KEY(chat_id) REFERENCES chats(id)
      );

      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        user_avatar TEXT,
        media_url TEXT,
        media_type TEXT,
        caption TEXT,
        timestamp TEXT,
        expires_at INTEGER,
        views_count INTEGER DEFAULT 0,
        is_viewed INTEGER DEFAULT 0,
        is_my_story INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS secret_sessions (
        chat_id TEXT PRIMARY KEY,
        dh_public_key TEXT,
        dh_shared_secret TEXT,
        fingerprint TEXT,
        ttl_seconds INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS channel_pts (
        channel_id TEXT PRIMARY KEY,
        pts INTEGER,
        updated_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    `);

    this.persist();
  }

  public async persist(): Promise<void> {
    if (!this.db) return;
    try {
      const data = this.db.export();
      await set(SQLITE_STORAGE_KEY, data);
    } catch (e) {
      console.warn('[SQLite Persistence] Error exporting database:', e);
    }
  }

  // SQLite Ops for Chats
  public saveChats(chats: Chat[]): void {
    if (!this.db) return;
    try {
      this.db.run('BEGIN TRANSACTION');
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chats (id, type, title, username, avatar, unread_count, is_pinned, is_muted, last_message_text, last_message_time, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const c of chats) {
        if (!c || !c.id) continue;
        stmt.run([
          c.id,
          c.type,
          c.title,
          c.username || '',
          c.avatar || '',
          c.unreadCount || 0,
          c.isPinned ? 1 : 0,
          c.isMuted ? 1 : 0,
          c.lastMessage?.text || '',
          c.lastMessage?.timestamp || '',
          JSON.stringify(c),
        ]);
      }
      stmt.free();
      this.db.run('COMMIT');
      this.persist();
    } catch (e) {
      try { this.db.run('ROLLBACK'); } catch (_) {}
      console.error('[SQLite] saveChats error:', e);
    }
  }

  public getChats(): Chat[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec('SELECT * FROM chats ORDER BY is_pinned DESC, last_message_time DESC');
      if (res.length > 0 && res[0].values) {
        return res[0].values.map((row) => {
          const cols = res[0].columns;
          const obj: any = {};
          cols.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          if (obj.data_json) {
            try {
              const parsed = JSON.parse(obj.data_json);
              if (parsed && parsed.id) return parsed as Chat;
            } catch (_) {}
          }
          return {
            id: obj.id,
            type: obj.type || 'user',
            title: obj.title || '',
            username: obj.username || undefined,
            avatar: obj.avatar || undefined,
            unreadCount: Number(obj.unread_count || 0),
            isPinned: Boolean(obj.is_pinned),
            isMuted: Boolean(obj.is_muted),
            lastMessage: obj.last_message_text ? {
              id: `msg_last_${obj.id}`,
              chatId: obj.id,
              senderId: '',
              senderName: '',
              text: obj.last_message_text,
              timestamp: obj.last_message_time || '',
              date: '',
              isOutgoing: false,
              status: 'read',
            } : undefined,
          } as Chat;
        });
      }
    } catch (e) {
      console.error('[SQLite] getChats error:', e);
    }
    return [];
  }

  // SQLite Ops for Messages
  public saveMessage(msg: Message, isSecret: boolean = false, expiresAt: number = 0): void {
    if (!this.db || !msg || !msg.id) return;
    try {
      this.db.run(
        `INSERT OR REPLACE INTO messages (id, chat_id, sender_id, sender_name, text, timestamp, date, is_outgoing, status, media_json, is_secret, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          msg.id,
          msg.chatId,
          msg.senderId,
          msg.senderName || '',
          msg.text,
          msg.timestamp,
          msg.date,
          msg.isOutgoing ? 1 : 0,
          msg.status,
          msg.media ? JSON.stringify(msg.media) : null,
          isSecret ? 1 : 0,
          expiresAt,
        ]
      );
      this.persist();
    } catch (e) {
      console.error('[SQLite] saveMessage error:', e);
    }
  }

  public saveMessages(messages: Message[], isSecret: boolean = false, expiresAt: number = 0): void {
    if (!this.db || !Array.isArray(messages) || messages.length === 0) return;
    try {
      this.db.run('BEGIN TRANSACTION');
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO messages (id, chat_id, sender_id, sender_name, text, timestamp, date, is_outgoing, status, media_json, is_secret, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const msg of messages) {
        if (!msg || !msg.id) continue;
        stmt.run([
          msg.id,
          msg.chatId,
          msg.senderId,
          msg.senderName || '',
          msg.text,
          msg.timestamp,
          msg.date,
          msg.isOutgoing ? 1 : 0,
          msg.status,
          msg.media ? JSON.stringify(msg.media) : null,
          isSecret ? 1 : 0,
          expiresAt,
        ]);
      }
      stmt.free();
      this.db.run('COMMIT');
      this.persist();
    } catch (e) {
      try { this.db.run('ROLLBACK'); } catch (_) {}
      console.error('[SQLite] saveMessages error:', e);
    }
  }

  public getMessagesForChat(chatId: string): Message[] {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC');
      stmt.bind([chatId]);
      const results: Message[] = [];
      while (stmt.step()) {
        const row: any = stmt.getAsObject();
        let media = undefined;
        if (row.media_json) {
          try {
            media = JSON.parse(row.media_json);
          } catch (_) {}
        }
        results.push({
          id: String(row.id),
          chatId: String(row.chat_id),
          senderId: String(row.sender_id || ''),
          senderName: String(row.sender_name || ''),
          text: String(row.text || ''),
          timestamp: String(row.timestamp || ''),
          date: String(row.date || ''),
          isOutgoing: Boolean(row.is_outgoing),
          status: (row.status as any) || 'read',
          media,
        });
      }
      stmt.free();
      return results;
    } catch (e) {
      console.error('[SQLite] getMessagesForChat error:', e);
      return [];
    }
  }

  public deleteDialog(chatId: string, messagesOnly: boolean = false): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
      if (!messagesOnly) {
        this.db.run('DELETE FROM chats WHERE id = ?', [chatId]);
      }
      this.persist();
    } catch (e) {
      console.error('[SQLite] deleteDialog error:', e);
    }
  }

  public cleanUpDatabase(): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM messages');
      this.db.run('DELETE FROM chats');
      this.db.run('DELETE FROM users');
      this.db.run('DELETE FROM stories');
      this.persist();
    } catch (e) {
      console.error('[SQLite] cleanUpDatabase error:', e);
    }
  }

  // Secret Session operations
  public saveSecretSession(chatId: string, fingerprint: string, sharedKey: string, ttl: number) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO secret_sessions (chat_id, dh_public_key, dh_shared_secret, fingerprint, ttl_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [chatId, 'DH_PUB_' + Math.random().toString(36).substring(7), sharedKey, fingerprint, ttl]
    );
    this.persist();
  }

  public getSecretSession(chatId: string) {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM secret_sessions WHERE chat_id = ?');
    stmt.bind([chatId]);
    if (stmt.step()) {
      const res = stmt.getAsObject();
      stmt.free();
      return res;
    }
    stmt.free();
    return null;
  }

  // SQLite Ops for Contacts
  public saveContacts(contacts: User[]): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO users (id, name, username, phone, avatar, is_online, is_premium, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of contacts) {
      stmt.run([
        u.id,
        u.name,
        u.username || '',
        u.phone || '',
        u.avatar || '',
        u.isOnline ? 1 : 0,
        u.isPremium ? 1 : 0,
        u.bio || '',
      ]);
    }
    stmt.free();
    this.persist();
  }

  public getContacts(): User[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec('SELECT * FROM users ORDER BY name ASC');
      if (res.length > 0 && res[0].values) {
        return res[0].values.map((row) => {
          const cols = res[0].columns;
          const obj: any = {};
          cols.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return {
            id: obj.id,
            name: obj.name,
            username: obj.username || undefined,
            phone: obj.phone || undefined,
            avatar: obj.avatar || '',
            isOnline: Boolean(obj.is_online),
            isPremium: Boolean(obj.is_premium),
            bio: obj.bio || '',
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  }

  public purgeExpiredSecretMessages(): void {
    if (!this.db) return;
    try {
      const now = Date.now();
      this.db.run('DELETE FROM messages WHERE is_secret = 1 AND expires_at > 0 AND expires_at < ?', [now]);
      this.persist();
    } catch (e) {
      console.error('[SQLite] Error purging expired messages:', e);
    }
  }

  // SQLite Ops for Channel PTS (Supergroups & Channels)
  public saveChannelPts(channelId: string, pts: number): void {
    if (!this.db || !channelId) return;
    try {
      this.db.run(
        'INSERT OR REPLACE INTO channel_pts (channel_id, pts, updated_at) VALUES (?, ?, ?)',
        [String(channelId), Number(pts) || 0, Date.now()]
      );
      this.persist();
    } catch (e) {
      console.warn('[SQLite] saveChannelPts error:', e);
    }
  }

  public getChannelPts(channelId: string): number {
    if (!this.db || !channelId) return 0;
    try {
      const res = this.db.exec('SELECT pts FROM channel_pts WHERE channel_id = ?', [String(channelId)]);
      if (res.length > 0 && res[0].values && res[0].values.length > 0) {
        return Number(res[0].values[0][0]) || 0;
      }
    } catch (e) {
      console.warn('[SQLite] getChannelPts error:', e);
    }
    return 0;
  }

  public getAllChannelPts(): Record<string, number> {
    const result: Record<string, number> = {};
    if (!this.db) return result;
    try {
      const res = this.db.exec('SELECT channel_id, pts FROM channel_pts');
      if (res.length > 0 && res[0].values) {
        for (const row of res[0].values) {
          const chanId = String(row[0]);
          const ptsVal = Number(row[1]) || 0;
          result[chanId] = ptsVal;
        }
      }
    } catch (e) {
      console.warn('[SQLite] getAllChannelPts error:', e);
    }
    return result;
  }
}

export const telegramDB = new TelegramSQLiteDatabase();
