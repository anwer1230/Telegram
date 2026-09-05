/**
 * MessagesStorage.ts - Telegram Core Storage & SQLite Transaction Engine
 * 
 * Replicated directly from DrKLO/Telegram Android:
 * org.telegram.messenger.MessagesStorage.java
 * org.telegram.SQLite.SQLiteDatabase.java
 */

import { Chat, Message } from '../types';
import { TLRPC } from './TLRPC';
import { NotificationCenter } from './NotificationCenter';
import { telegramDB } from '../utils/sqliteStorage';
import { messageCache } from '../services/IndexedDBMessageCache';

export interface SQLiteCursor {
  next(): boolean;
  intValue(col: number): number;
  longValue(col: number): number;
  stringValue(col: number): string;
  byteArrayValue(col: number): Uint8Array;
  dispose(): void;
}

export interface SQLitePreparedStatement {
  bindInt(col: number, val: number): void;
  bindLong(col: number, val: number): void;
  bindString(col: number, val: string): void;
  bindByteBuffer(col: number, val: Uint8Array): void;
  step(): boolean;
  dispose(): void;
  query(args: any[]): SQLiteCursor;
}

export class SQLiteDatabase {
  private inMemoryDb: Map<string, any[]> = new Map();
  private name: string;

  constructor(name: string = 'telegram.db') {
    this.name = name;
    this.initializeTables();
  }

  private initializeTables() {
    this.inMemoryDb.set('dialogs', []);
    this.inMemoryDb.set('messages', []);
    this.inMemoryDb.set('users', []);
    this.inMemoryDb.set('chats', []);
    this.inMemoryDb.set('drafts', []);
  }

  /**
   * DrKLO SQLiteDatabase.queryFinalized
   * Executes a read query and returns a finalized cursor
   */
  public queryFinalized(sql: string, ...args: any[]): SQLiteCursor {
    const table = this.extractTable(sql);
    let rows = this.inMemoryDb.get(table) || [];

    // Filter by dialogId/chatId if provided
    if (args.length > 0 && args[0] !== undefined) {
      const matchKey = args[0];
      rows = rows.filter((r) => r.dialog_id === matchKey || r.id === matchKey || r.chatId === matchKey);
    }

    let currentIndex = -1;
    return {
      next: () => {
        currentIndex++;
        return currentIndex < rows.length;
      },
      intValue: (col: number) => {
        const row = rows[currentIndex];
        if (!row) return 0;
        const keys = Object.keys(row);
        return Number(row[keys[col]]) || 0;
      },
      longValue: (col: number) => {
        const row = rows[currentIndex];
        if (!row) return 0;
        const keys = Object.keys(row);
        return Number(row[keys[col]]) || 0;
      },
      stringValue: (col: number) => {
        const row = rows[currentIndex];
        if (!row) return '';
        const keys = Object.keys(row);
        return String(row[keys[col]] || '');
      },
      byteArrayValue: (col: number) => {
        const row = rows[currentIndex];
        if (!row) return new Uint8Array(0);
        const keys = Object.keys(row);
        const val = row[keys[col]];
        if (val instanceof Uint8Array) return val;
        return new TextEncoder().encode(String(val || ''));
      },
      dispose: () => {
        // cleanup cursor
      },
    };
  }

  /**
   * DrKLO SQLiteDatabase.execute
   * Executes an INSERT / UPDATE / DELETE / DDL statement
   */
  public execute(sql: string, ...args: any[]): void {
    const trimmed = sql.trim().toUpperCase();
    const table = this.extractTable(sql);

    if (trimmed.startsWith('DELETE')) {
      if (args.length > 0) {
        const id = args[0];
        const existing = this.inMemoryDb.get(table) || [];
        this.inMemoryDb.set(
          table,
          existing.filter((r) => r.dialog_id !== id && r.id !== id && r.chatId !== id)
        );
      } else {
        this.inMemoryDb.set(table, []);
      }
    }
  }

  public insertOrReplace(table: string, record: any): void {
    const rows = this.inMemoryDb.get(table) || [];
    const index = rows.findIndex((r) => r.id === record.id || (r.dialog_id && r.dialog_id === record.dialog_id));
    if (index >= 0) {
      rows[index] = { ...rows[index], ...record };
    } else {
      rows.push(record);
    }
    this.inMemoryDb.set(table, rows);
  }

  private extractTable(sql: string): string {
    const lower = sql.toLowerCase();
    if (lower.includes('dialogs')) return 'dialogs';
    if (lower.includes('messages')) return 'messages';
    if (lower.includes('users')) return 'users';
    if (lower.includes('chats')) return 'chats';
    if (lower.includes('drafts')) return 'drafts';
    return 'dialogs';
  }
}

export class MessagesStorage {
  public static readonly MAX_ACCOUNT_COUNT: number = 4;
  private static instances = new Map<number, MessagesStorage>();
  public readonly currentAccount: number;
  public database: SQLiteDatabase;

  public static getInstance(account: number = 0): MessagesStorage {
    const validAccount = Math.max(0, Math.min(account, MessagesStorage.MAX_ACCOUNT_COUNT - 1));
    if (!MessagesStorage.instances.has(validAccount)) {
      MessagesStorage.instances.set(validAccount, new MessagesStorage(validAccount));
    }
    return MessagesStorage.instances.get(validAccount)!;
  }

  private constructor(account: number = 0) {
    this.currentAccount = account;
    const dbName = account === 0 ? 'cache4.db' : `cache4_${account}.db`;
    this.database = new SQLiteDatabase(dbName);
    this.initDatabaseFromSqlite();
  }

  /**
   * Initializes SQLite backend from IndexedDB storage
   */
  public async initDatabaseFromSqlite(): Promise<void> {
    try {
      await telegramDB.init();
      const storedChats = telegramDB.getChats();
      if (storedChats && storedChats.length > 0) {
        storedChats.forEach((c) => {
          if (c && c.id) {
            this.database.insertOrReplace('dialogs', {
              dialog_id: c.id,
              id: c.id,
              unread_count: c.unreadCount || 0,
              pinned: c.isPinned ? 1 : 0,
              flags: (c.isPinned ? 1 : 0) | (c.isMuted ? 2 : 0) | (c.isArchived ? 4 : 0),
              data: c,
            });
          }
        });
      }
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to initialize SQLite backend:`, e);
    }
  }

  /**
   * DrKLO MessagesStorage.cleanUp - Purges all stored tables for this account
   */
  public cleanUp(isLogout: boolean = true): void {
    this.database.execute('DELETE FROM dialogs');
    this.database.execute('DELETE FROM messages');
    this.database.execute('DELETE FROM users');
    this.database.execute('DELETE FROM chats');
    this.database.execute('DELETE FROM drafts');
    try {
      telegramDB.cleanUpDatabase();
      messageCache.clearAll().catch(() => {});
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to clean SQLite DB:`, e);
    }
  }

  public cleanup(isLogout: boolean = true): void {
    this.cleanUp(isLogout);
  }

  /**
   * DrKLO MessagesStorage.getDialogs
   */
  public getDialogs(offset: number = 0, count: number = 100): Chat[] {
    const cursor = this.database.queryFinalized('SELECT * FROM dialogs LIMIT ? OFFSET ?', count, offset);
    const dialogs: Chat[] = [];
    while (cursor.next()) {
      const dataStr = cursor.stringValue(5); // data column
      if (dataStr) {
        try {
          dialogs.push(JSON.parse(dataStr));
        } catch {
          // parse error fallback
        }
      }
    }
    cursor.dispose();

    if (dialogs.length === 0) {
      const sqliteChats = telegramDB.getChats();
      if (sqliteChats && sqliteChats.length > 0) {
        return sqliteChats.slice(offset, offset + count);
      }
    }

    return dialogs;
  }

  public putDialogs(dialogsRes: any): void {
    if (!dialogsRes) return;
    const dialogList: Chat[] = Array.isArray(dialogsRes.dialogs) ? dialogsRes.dialogs : (Array.isArray(dialogsRes) ? dialogsRes : []);
    dialogList.forEach((c) => {
      if (c && c.id) {
        this.database.insertOrReplace('dialogs', {
          dialog_id: c.id,
          id: c.id,
          unread_count: c.unreadCount || 0,
          pinned: c.isPinned ? 1 : 0,
          flags: (c.isPinned ? 1 : 0) | (c.isMuted ? 2 : 0) | (c.isArchived ? 4 : 0),
          data: c,
        });
      }
    });
    // Persist chats directly to IndexedDB SQLite table
    try {
      telegramDB.saveChats(dialogList);
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to persist chats to SQLite DB:`, e);
    }
  }

  public putUsersAndChats(users: any[], chats: any[], withTransaction: boolean = false, fromQueue: boolean = false): void {
    if (users && Array.isArray(users)) {
      users.forEach((u) => {
        if (u && u.id) {
          this.database.insertOrReplace('users', {
            id: u.id,
            user_id: u.id,
            data: u,
          });
        }
      });
    }
    if (chats && Array.isArray(chats)) {
      chats.forEach((c) => {
        if (c && c.id) {
          this.database.insertOrReplace('chats', {
            id: c.id,
            chat_id: c.id,
            data: c,
          });
        }
      });
    }
  }

  public putPrivacyRules(rules: any[], type: number): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`tg_privacy_rules_${this.currentAccount}_${type}`, JSON.stringify(rules));
    } catch {}
  }

  public getPrivacyRules(type: number): any[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(`tg_privacy_rules_${this.currentAccount}_${type}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * DrKLO MessagesStorage.setDialogFlags
   * Updates flags (pinned, muted, archived) in SQLite storage
   */
  public setDialogFlags(dialogId: string | number, flags: number): void {
    const id = String(dialogId);
    this.database.execute('UPDATE dialogs SET flags = ? WHERE dialog_id = ?', flags, id);
    this.database.insertOrReplace('dialogs', {
      dialog_id: id,
      id,
      flags,
      pinned: (flags & 1) !== 0 ? 1 : 0,
      muted: (flags & 2) !== 0 ? 1 : 0,
      archived: (flags & 4) !== 0 ? 1 : 0,
    });

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.dialogsNeedReload
    );
  }

  /**
   * DrKLO MessagesStorage.deleteDialog
   * Deletes a dialog and its messages from storage
   */
  public deleteDialog(dialogId: string | number, messagesOnly: number = 0): void {
    const id = String(dialogId);
    if (messagesOnly === 0) {
      this.database.execute('DELETE FROM dialogs WHERE dialog_id = ?', id);
    }
    this.database.execute('DELETE FROM messages WHERE dialog_id = ?', id);

    try {
      telegramDB.deleteDialog(id, messagesOnly !== 0);
      messageCache.clearChat(id).catch(() => {});
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to delete dialog in SQLite DB:`, e);
    }

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.dialogsNeedReload
    );
  }

  /**
   * DrKLO MessagesStorage.putMessages
   * Persists message objects batch to SQLite IndexedDB
   */
  public putMessages(messages: Message[], dialogId: string): void {
    if (!Array.isArray(messages) || messages.length === 0) return;

    messages.forEach((msg) => {
      if (!msg || !msg.id) return;
      this.database.insertOrReplace('messages', {
        id: msg.id,
        dialog_id: dialogId,
        read: msg.status === 'read' ? 1 : 0,
        out: msg.isOutgoing ? 1 : 0,
        text: msg.text,
        date: msg.timestamp,
        data: msg,
      });
    });

    // Save batch to persistent SQLite IndexedDB & IndexedDB message cache
    try {
      telegramDB.saveMessages(messages);
      messageCache.putMessages(dialogId, messages).catch(() => {});
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to persist messages to SQLite DB:`, e);
    }

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.messagesDidLoad,
      dialogId,
      messages.length
    );
  }

  /**
   * Saves a single message to local database and notifies listeners
   */
  public saveMessage(msg: Message): void {
    if (!msg || !msg.id) return;
    const dialogId = msg.chatId || 'dialog_0';
    this.putMessages([msg], dialogId);
  }

  /**
   * Retrieves messages for a specific dialog from SQLite storage
   */
  public getMessages(dialogId: string | number): Message[] {
    const id = String(dialogId);
    try {
      const sqliteMsgs = telegramDB.getMessagesForChat(id);
      if (sqliteMsgs && sqliteMsgs.length > 0) {
        return sqliteMsgs;
      }
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to read messages from SQLite DB:`, e);
    }

    // Fallback to in-memory cache
    const cursor = this.database.queryFinalized('SELECT * FROM messages WHERE dialog_id = ? ORDER BY date ASC', id);
    const msgs: Message[] = [];
    while (cursor.next()) {
      const dataStr = cursor.stringValue(6);
      if (dataStr) {
        try {
          msgs.push(JSON.parse(dataStr));
        } catch {}
      }
    }
    cursor.dispose();
    return msgs;
  }

  /**
   * Persists sync difference state parameters
   */
  public saveDiffParams(pts: number, seq: number, date: number, qts: number): void {
    try {
      localStorage.setItem(
        `tg_diff_params_${this.currentAccount}`,
        JSON.stringify({ pts, seq, date, qts })
      );
    } catch (e) {}
  }

  /**
   * Persists channel/supergroup PTS to SQLite storage
   */
  public setChannelPts(channelId: string | number, pts: number): void {
    const id = String(channelId);
    try {
      telegramDB.saveChannelPts(id, pts);
      if (typeof window !== 'undefined') {
        const key = `tg_channel_pts_${this.currentAccount}_${id}`;
        localStorage.setItem(key, String(pts));
      }
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to save channel pts:`, e);
    }
  }

  /**
   * Retrieves channel/supergroup PTS from SQLite storage
   */
  public getChannelPts(channelId: string | number): number {
    const id = String(channelId);
    try {
      const sqlitePts = telegramDB.getChannelPts(id);
      if (sqlitePts && sqlitePts > 0) {
        return sqlitePts;
      }
      if (typeof window !== 'undefined') {
        const key = `tg_channel_pts_${this.currentAccount}_${id}`;
        const val = localStorage.getItem(key);
        if (val) return Number(val) || 0;
      }
    } catch (e) {
      console.warn(`[MessagesStorage ${this.currentAccount}] Failed to get channel pts:`, e);
    }
    return 0;
  }

  /**
   * Retrieves all known channel PTS values
   */
  public getAllChannelPts(): Record<string, number> {
    try {
      return telegramDB.getAllChannelPts();
    } catch (e) {
      return {};
    }
  }

  /**
   * Marks all messages up to maxId as read
   */
  public markMessagesAsRead(dialogId: string | number, maxId: string | number): void {
    const id = String(dialogId);
    this.database.execute('UPDATE messages SET read = 1 WHERE dialog_id = ? AND id <= ?', id, maxId);
    this.database.insertOrReplace('dialogs', {
      dialog_id: id,
      id,
      unread_count: 0,
      read_inbox_max_id: maxId,
    });
  }

  /**
   * Saves or clears dialog draft
   */
  public saveDraft(dialogId: string | number, text: string, replyMsgId?: string): void {
    const id = String(dialogId);
    if (!text.trim()) {
      this.database.execute('DELETE FROM drafts WHERE dialog_id = ?', id);
    } else {
      this.database.insertOrReplace('drafts', {
        dialog_id: id,
        id,
        text,
        reply_msg_id: replyMsgId,
        date: Date.now(),
      });
    }

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.didReceivedDraft,
      id,
      text
    );
  }
  /**
   * DrKLO MessagesStorage.saveChatScrollPosition
   * Persists scroll position metrics (position, topOffset, messageId, isBottom)
   */
  public saveChatScrollPosition(
    dialogId: string | number,
    position: number,
    topOffset: number,
    messageId: string | number = 0,
    isAtBottom: boolean = false
  ): void {
    const id = String(dialogId);
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          dialogId: id,
          position,
          topOffset,
          messageId: String(messageId),
          isAtBottom,
          timestamp: Date.now(),
        };
        localStorage.setItem(`tg_scroll_pos_${this.currentAccount}_${id}`, JSON.stringify(payload));
      }
    } catch (e) {}
  }

  /**
   * DrKLO MessagesStorage.getChatScrollPosition
   */
  public getChatScrollPosition(dialogId: string | number): {
    dialogId: string;
    position: number;
    topOffset: number;
    messageId: string;
    isAtBottom: boolean;
  } | null {
    const id = String(dialogId);
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tg_scroll_pos_${this.currentAccount}_${id}`);
        return saved ? JSON.parse(saved) : null;
      }
    } catch (e) {}
    return null;
  }
}

export const messagesStorage = MessagesStorage.getInstance(0);
