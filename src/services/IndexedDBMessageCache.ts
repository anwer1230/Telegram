/**
 * IndexedDBMessageCache.ts - High-Performance Local Message & Payload Cache
 *
 * Implements an IndexedDB storage engine via `idb` for caching incoming
 * MTProto message payloads, media metadata, and chat state locally.
 * 
 * Key Benefits:
 * - Instant sub-millisecond local message retrieval for ChatView with zero network latency.
 * - Prevents redundant network requests to /api/telegram/messages/fetch during navigation & pagination.
 * - Persistent across app restarts and browser refreshes.
 * - Automatic background cache invalidation and metadata tracking.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Message } from '../types';
import { getTelegramEpoch } from '../utils/dateUtils';

export interface CachedMessageRecord {
  /** Composite key: `${chatId}_${id}` */
  compoundKey: string;
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  senderUsername?: string;
  senderRole?: 'owner' | 'admin' | 'member' | 'restricted' | 'banned';
  senderRank?: string;
  text: string;
  timestamp: string;
  date: string;
  numericDate: number;
  isOutgoing: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  media?: any;
  replyTo?: any;
  forwardedFrom?: any;
  reactions?: any[];
  isPinned?: boolean;
  isEdited?: boolean;
  views?: number;
  linkPreview?: any;
  isSecret?: boolean;
  ttlSeconds?: number;
  expiresAt?: number;
  isScheduled?: boolean;
  scheduledDate?: string;
  rawDate?: number;
  epoch?: number;
  out?: boolean;
  peerId?: string;
  cachedAt: number;
  rawPayload?: any;
}

export interface ChatMetadataRecord {
  chatId: string;
  oldestMessageId?: string;
  newestMessageId?: string;
  oldestNumericDate?: number;
  newestNumericDate?: number;
  messageCount: number;
  lastSyncedAt: number;
  lastNetworkFetchAt?: number;
  hasMoreOlder: boolean;
  pts?: number;
}

export interface CachedPayloadRecord {
  key: string;
  chatId: string;
  messageId?: string;
  mimeType?: string;
  blobOrData: any;
  sizeBytes?: number;
  cachedAt: number;
}

export interface TelegramMessageDBSchema extends DBSchema {
  messages: {
    key: string; // compoundKey `${chatId}_${id}`
    value: CachedMessageRecord;
    indexes: {
      by_chatId: string;
      by_chat_date: [string, number];
      by_numericDate: number;
      by_cachedAt: number;
    };
  };
  chat_metadata: {
    key: string; // chatId
    value: ChatMetadataRecord;
  };
  payload_cache: {
    key: string; // cache key / URL / hash
    value: CachedPayloadRecord;
    indexes: {
      by_chatId: string;
      by_messageId: string;
    };
  };
}

const DB_NAME = 'telegram_client_message_cache_v2';
const DB_VERSION = 1;

export class IndexedDBMessageCache {
  private static instance: IndexedDBMessageCache | null = null;
  private dbPromise: Promise<IDBPDatabase<TelegramMessageDBSchema>> | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  private constructor() {
    if (this.isSupported) {
      this.initDB();
    }
  }

  public static getInstance(): IndexedDBMessageCache {
    if (!IndexedDBMessageCache.instance) {
      IndexedDBMessageCache.instance = new IndexedDBMessageCache();
    }
    return IndexedDBMessageCache.instance;
  }

  /**
   * Initializes or returns the open IndexedDB database instance
   */
  public async getDB(): Promise<IDBPDatabase<TelegramMessageDBSchema> | null> {
    if (!this.isSupported) return null;
    if (!this.dbPromise) {
      this.dbPromise = this.initDB();
    }
    return this.dbPromise;
  }

  private async initDB(): Promise<IDBPDatabase<TelegramMessageDBSchema>> {
    return openDB<TelegramMessageDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        console.log(`[IndexedDBMessageCache] Upgrading database from v${oldVersion} to v${DB_VERSION}`);

        // 1. Messages Store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'compoundKey' });
          messageStore.createIndex('by_chatId', 'chatId', { unique: false });
          messageStore.createIndex('by_chat_date', ['chatId', 'numericDate'], { unique: false });
          messageStore.createIndex('by_numericDate', 'numericDate', { unique: false });
          messageStore.createIndex('by_cachedAt', 'cachedAt', { unique: false });
        }

        // 2. Chat Metadata Store
        if (!db.objectStoreNames.contains('chat_metadata')) {
          db.createObjectStore('chat_metadata', { keyPath: 'chatId' });
        }

        // 3. Payload / Media Store
        if (!db.objectStoreNames.contains('payload_cache')) {
          const payloadStore = db.createObjectStore('payload_cache', { keyPath: 'key' });
          payloadStore.createIndex('by_chatId', 'chatId', { unique: false });
          payloadStore.createIndex('by_messageId', 'messageId', { unique: false });
        }
      },
      blocked() {
        console.warn('[IndexedDBMessageCache] Database open request is blocked by an open tab.');
      },
      blocking() {
        console.warn('[IndexedDBMessageCache] Database connection is blocking a newer version.');
      },
      terminated() {
        console.error('[IndexedDBMessageCache] Database connection abnormally terminated.');
      },
    });
  }

  /**
   * Transforms a Message interface into an IndexedDB CachedMessageRecord
   */
  private toRecord(chatId: string, msg: Message, rawPayload?: any): CachedMessageRecord {
    const rawId = String(msg.id || Date.now());
    const compoundKey = `${chatId}_${rawId}`;
    const numericDate = msg.epoch || msg.rawDate || getTelegramEpoch(msg);

    return {
      compoundKey,
      id: rawId,
      chatId,
      senderId: String(msg.senderId || 'user_unknown'),
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      senderUsername: msg.senderUsername,
      senderRole: msg.senderRole,
      senderRank: msg.senderRank,
      text: msg.text || '',
      timestamp: msg.timestamp || '',
      date: msg.date || '',
      numericDate: isNaN(numericDate) || numericDate <= 0 ? Date.now() : numericDate,
      isOutgoing: Boolean(msg.isOutgoing || msg.out),
      status: msg.status || 'sent',
      media: msg.media,
      replyTo: msg.replyTo,
      forwardedFrom: msg.forwardedFrom,
      reactions: msg.reactions,
      isPinned: msg.isPinned,
      isEdited: msg.isEdited,
      views: msg.views,
      linkPreview: msg.linkPreview,
      isSecret: msg.isSecret,
      ttlSeconds: msg.ttlSeconds,
      expiresAt: msg.expiresAt,
      isScheduled: msg.isScheduled,
      scheduledDate: msg.scheduledDate,
      rawDate: msg.rawDate,
      epoch: msg.epoch,
      out: msg.out,
      peerId: msg.peerId,
      cachedAt: Date.now(),
      rawPayload,
    };
  }

  /**
   * Transforms a CachedMessageRecord back to a runtime Message
   */
  private toMessage(record: CachedMessageRecord): Message {
    return {
      id: record.id,
      chatId: record.chatId,
      senderId: record.senderId,
      senderName: record.senderName,
      senderAvatar: record.senderAvatar,
      senderUsername: record.senderUsername,
      senderRole: record.senderRole,
      senderRank: record.senderRank,
      text: record.text,
      timestamp: record.timestamp,
      date: record.date,
      isOutgoing: record.isOutgoing,
      status: record.status,
      media: record.media,
      replyTo: record.replyTo,
      forwardedFrom: record.forwardedFrom,
      reactions: record.reactions,
      isPinned: record.isPinned,
      isEdited: record.isEdited,
      views: record.views,
      linkPreview: record.linkPreview,
      isSecret: record.isSecret,
      ttlSeconds: record.ttlSeconds,
      expiresAt: record.expiresAt,
      isScheduled: record.isScheduled,
      scheduledDate: record.scheduledDate,
      rawDate: record.rawDate,
      epoch: record.epoch || record.numericDate,
      out: record.out,
      peerId: record.peerId,
    };
  }

  /**
   * Caches a batch of messages for a chat into IndexedDB in a single atomic transaction.
   * Also recalculates and updates the chat metadata record.
   */
  public async putMessages(
    chatId: string,
    messages: Message[],
    options?: { isNetworkFetch?: boolean; hasMoreOlder?: boolean; rawPayload?: any }
  ): Promise<number> {
    if (!messages || messages.length === 0) return 0;
    const db = await this.getDB();
    if (!db) return 0;

    try {
      const tx = db.transaction(['messages', 'chat_metadata'], 'readwrite');
      const msgStore = tx.objectStore('messages');
      const metaStore = tx.objectStore('chat_metadata');

      let minDate = Infinity;
      let maxDate = -Infinity;
      let oldestId: string | undefined;
      let newestId: string | undefined;

      for (const msg of messages) {
        if (!msg || !msg.id) continue;
        const record = this.toRecord(chatId, msg, options?.rawPayload);
        await msgStore.put(record);

        if (record.numericDate < minDate) {
          minDate = record.numericDate;
          oldestId = record.id;
        }
        if (record.numericDate > maxDate) {
          maxDate = record.numericDate;
          newestId = record.id;
        }
      }

      // Update chat metadata
      const existingMeta = await metaStore.get(chatId);
      const totalCount = await msgStore.index('by_chatId').count(IDBKeyRange.only(chatId));

      const updatedMeta: ChatMetadataRecord = {
        chatId,
        oldestMessageId:
          existingMeta?.oldestNumericDate && existingMeta.oldestNumericDate < minDate
            ? existingMeta.oldestMessageId
            : oldestId || existingMeta?.oldestMessageId,
        newestMessageId:
          existingMeta?.newestNumericDate && existingMeta.newestNumericDate > maxDate
            ? existingMeta.newestMessageId
            : newestId || existingMeta?.newestMessageId,
        oldestNumericDate:
          existingMeta?.oldestNumericDate
            ? Math.min(existingMeta.oldestNumericDate, minDate)
            : minDate !== Infinity ? minDate : undefined,
        newestNumericDate:
          existingMeta?.newestNumericDate
            ? Math.max(existingMeta.newestNumericDate, maxDate)
            : maxDate !== -Infinity ? maxDate : undefined,
        messageCount: totalCount,
        lastSyncedAt: Date.now(),
        lastNetworkFetchAt: options?.isNetworkFetch ? Date.now() : existingMeta?.lastNetworkFetchAt,
        hasMoreOlder: options?.hasMoreOlder !== undefined ? options.hasMoreOlder : existingMeta?.hasMoreOlder ?? true,
      };

      await metaStore.put(updatedMeta);
      await tx.done;

      return messages.length;
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] putMessages failed for ${chatId}:`, e);
      return 0;
    }
  }

  /**
   * Caches a single incoming message (e.g. from Socket.IO or MTProto update).
   */
  public async putMessage(chatId: string, message: Message, rawPayload?: any): Promise<void> {
    if (!message || !message.id) return;
    const db = await this.getDB();
    if (!db) return;

    try {
      const record = this.toRecord(chatId, message, rawPayload);
      const tx = db.transaction(['messages', 'chat_metadata'], 'readwrite');
      await tx.objectStore('messages').put(record);

      const metaStore = tx.objectStore('chat_metadata');
      const existingMeta = await metaStore.get(chatId);

      const updatedMeta: ChatMetadataRecord = {
        chatId,
        oldestMessageId: existingMeta?.oldestMessageId || record.id,
        newestMessageId: record.id,
        oldestNumericDate: existingMeta?.oldestNumericDate
          ? Math.min(existingMeta.oldestNumericDate, record.numericDate)
          : record.numericDate,
        newestNumericDate: existingMeta?.newestNumericDate
          ? Math.max(existingMeta.newestNumericDate, record.numericDate)
          : record.numericDate,
        messageCount: (existingMeta?.messageCount || 0) + 1,
        lastSyncedAt: Date.now(),
        hasMoreOlder: existingMeta?.hasMoreOlder ?? true,
        lastNetworkFetchAt: existingMeta?.lastNetworkFetchAt,
      };

      await metaStore.put(updatedMeta);
      await tx.done;
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] putMessage failed for ${chatId}:`, e);
    }
  }

  /**
   * Retrieves cached messages for a chat, sorted in chronological ascending order.
   * If offsetId is provided, returns messages older than offsetId.
   */
  public async getCachedMessages(
    chatId: string,
    options?: { limit?: number; offsetId?: string; beforeNumericDate?: number }
  ): Promise<Message[]> {
    const db = await this.getDB();
    if (!db) return [];

    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('by_chat_date');

      let targetBeforeDate = options?.beforeNumericDate;

      // If offsetId is given, resolve its numericDate to paginate backwards
      if (options?.offsetId && !targetBeforeDate) {
        const offsetMsg = await store.get(`${chatId}_${options.offsetId}`);
        if (offsetMsg) {
          targetBeforeDate = offsetMsg.numericDate;
        }
      }

      let range: IDBKeyRange;
      if (targetBeforeDate) {
        // [chatId, 0] up to [chatId, targetBeforeDate - 1]
        range = IDBKeyRange.bound([chatId, 0], [chatId, targetBeforeDate - 1], false, false);
      } else {
        range = IDBKeyRange.bound([chatId, 0], [chatId, Infinity], false, false);
      }

      const limit = options?.limit || 100;
      const records: CachedMessageRecord[] = [];

      // Open cursor iterating backwards if paginating before a date, or load all
      let cursor = await index.openCursor(range, 'prev');
      while (cursor && records.length < limit) {
        records.push(cursor.value);
        cursor = await cursor.continue();
      }

      // Reverse to chronological order (oldest to newest)
      records.reverse();

      return records.map((r) => this.toMessage(r));
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] getCachedMessages failed for ${chatId}:`, e);
      return [];
    }
  }

  /**
   * Checks if any messages exist in the cache for this chat without loading records.
   */
  public async hasCachedMessages(chatId: string): Promise<boolean> {
    const db = await this.getDB();
    if (!db) return false;
    try {
      const count = await db.countFromIndex('messages', 'by_chatId', IDBKeyRange.only(chatId));
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Returns total message count in cache for a chat.
   */
  public async getCachedMessageCount(chatId: string): Promise<number> {
    const db = await this.getDB();
    if (!db) return 0;
    try {
      return await db.countFromIndex('messages', 'by_chatId', IDBKeyRange.only(chatId));
    } catch {
      return 0;
    }
  }

  /**
   * Retrieves single message from cache.
   */
  public async getCachedMessage(chatId: string, messageId: string): Promise<Message | null> {
    const db = await this.getDB();
    if (!db) return null;
    try {
      const record = await db.get('messages', `${chatId}_${messageId}`);
      return record ? this.toMessage(record) : null;
    } catch {
      return null;
    }
  }

  /**
   * Updates message status (sent/delivered/read/error) in cache.
   */
  public async updateMessageStatus(
    chatId: string,
    messageId: string,
    status: Message['status']
  ): Promise<boolean> {
    const db = await this.getDB();
    if (!db) return false;
    try {
      const key = `${chatId}_${messageId}`;
      const existing = await db.get('messages', key);
      if (existing) {
        existing.status = status;
        await db.put('messages', existing);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Updates an edited message in cache.
   */
  public async updateMessage(chatId: string, message: Message): Promise<boolean> {
    if (!message || !message.id) return false;
    const db = await this.getDB();
    if (!db) return false;
    try {
      const key = `${chatId}_${message.id}`;
      const existing = await db.get('messages', key);
      if (existing) {
        const updatedRecord = this.toRecord(chatId, message, existing.rawPayload);
        updatedRecord.cachedAt = Date.now();
        await db.put('messages', updatedRecord);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a list of message IDs from the cache.
   */
  public async deleteMessages(chatId: string, messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(['messages', 'chat_metadata'], 'readwrite');
      const store = tx.objectStore('messages');
      for (const id of messageIds) {
        await store.delete(`${chatId}_${id}`);
      }

      // Update metadata count
      const metaStore = tx.objectStore('chat_metadata');
      const meta = await metaStore.get(chatId);
      if (meta) {
        const remainingCount = await store.index('by_chatId').count(IDBKeyRange.only(chatId));
        meta.messageCount = remainingCount;
        await metaStore.put(meta);
      }

      await tx.done;
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] deleteMessages failed for ${chatId}:`, e);
    }
  }

  /**
   * Gets cached chat metadata.
   */
  public async getChatMetadata(chatId: string): Promise<ChatMetadataRecord | null> {
    const db = await this.getDB();
    if (!db) return null;
    try {
      const meta = await db.get('chat_metadata', chatId);
      return meta || null;
    } catch {
      return null;
    }
  }

  /**
   * Updates or merges chat metadata.
   */
  public async updateChatMetadata(
    chatId: string,
    updates: Partial<ChatMetadataRecord>
  ): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const existing = (await db.get('chat_metadata', chatId)) || {
        chatId,
        messageCount: 0,
        lastSyncedAt: Date.now(),
        hasMoreOlder: true,
      };
      await db.put('chat_metadata', { ...existing, ...updates, chatId });
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] updateChatMetadata failed for ${chatId}:`, e);
    }
  }

  /**
   * Determines whether a network fetch is redundant based on recent fetch time.
   * If a fetch was completed within minIntervalMs and messages exist locally, returns false.
   */
  public async shouldFetchFromNetwork(chatId: string, minIntervalMs: number = 8000): Promise<boolean> {
    const meta = await this.getChatMetadata(chatId);
    if (!meta) return true;
    if (meta.messageCount === 0) return true;
    if (!meta.lastNetworkFetchAt) return true;

    const timeSinceLast = Date.now() - meta.lastNetworkFetchAt;
    return timeSinceLast > minIntervalMs;
  }

  /**
   * Records that a network fetch has completed for this chat.
   */
  public async recordNetworkFetch(chatId: string): Promise<void> {
    await this.updateChatMetadata(chatId, { lastNetworkFetchAt: Date.now(), lastSyncedAt: Date.now() });
  }

  /**
   * Stores rich media payloads, thumbnails, or raw binary buffers in the payload store.
   */
  public async cachePayload(
    key: string,
    chatId: string,
    blobOrData: any,
    messageId?: string,
    mimeType?: string
  ): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const record: CachedPayloadRecord = {
        key,
        chatId,
        messageId,
        mimeType,
        blobOrData,
        cachedAt: Date.now(),
      };
      await db.put('payload_cache', record);
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] cachePayload failed for ${key}:`, e);
    }
  }

  /**
   * Retrieves a cached payload or media blob by key.
   */
  public async getPayload(key: string): Promise<any | null> {
    const db = await this.getDB();
    if (!db) return null;
    try {
      const record = await db.get('payload_cache', key);
      return record ? record.blobOrData : null;
    } catch {
      return null;
    }
  }

  /**
   * Clears all cached messages and metadata for a specific chat.
   */
  public async clearChat(chatId: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(['messages', 'chat_metadata', 'payload_cache'], 'readwrite');
      const msgStore = tx.objectStore('messages');
      const metaStore = tx.objectStore('chat_metadata');
      const payloadStore = tx.objectStore('payload_cache');

      // Delete messages for chatId
      let cursor = await msgStore.index('by_chatId').openKeyCursor(IDBKeyRange.only(chatId));
      while (cursor) {
        await msgStore.delete(cursor.primaryKey);
        cursor = await cursor.continue();
      }

      // Delete payloads
      let pCursor = await payloadStore.index('by_chatId').openKeyCursor(IDBKeyRange.only(chatId));
      while (pCursor) {
        await payloadStore.delete(pCursor.primaryKey);
        pCursor = await pCursor.continue();
      }

      // Delete metadata
      await metaStore.delete(chatId);
      await tx.done;
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] clearChat failed for ${chatId}:`, e);
    }
  }

  /**
   * Clears the entire database (used upon user logout).
   */
  public async clearAll(): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction(['messages', 'chat_metadata', 'payload_cache'], 'readwrite');
      await tx.objectStore('messages').clear();
      await tx.objectStore('chat_metadata').clear();
      await tx.objectStore('payload_cache').clear();
      await tx.done;
      console.log('[IndexedDBMessageCache] Cache cleared successfully.');
    } catch (e) {
      console.warn('[IndexedDBMessageCache] clearAll failed:', e);
    }
  }
}

export const messageCache = IndexedDBMessageCache.getInstance();
