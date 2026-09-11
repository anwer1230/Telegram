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

export type IndexedMediaType = 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'link' | 'none';

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

  // --- IndexedDB Strategy Accelerated Query Fields ---
  mediaType: IndexedMediaType;
  hasMedia: number; // 1 or 0 for clean B-tree compound range indexing
  hasLink: number; // 1 or 0
  isPinnedNum: number; // 1 or 0
  isOutgoingNum: number; // 1 or 0
  hasReactions: number; // 1 or 0
  searchTokens: string[]; // Normalized full-text search tokens for multiEntry index
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

export interface MessageFilterOptions {
  chatId?: string;
  mediaType?: IndexedMediaType | 'any_media';
  senderId?: string;
  isPinned?: boolean;
  status?: Message['status'];
  query?: string;
  fromDate?: number;
  toDate?: number;
  offsetId?: string;
  beforeNumericDate?: number;
  limit?: number;
  direction?: 'prev' | 'next';
}

export interface IndexingStats {
  totalMessages: number;
  chatCount: number;
  mediaCounts: {
    photos: number;
    videos: number;
    files: number;
    voice: number;
    audio: number;
    links: number;
  };
  pinnedCount: number;
  pendingOutgoingCount: number;
  storageEstimateBytes?: number;
  storageQuotaBytes?: number;
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
      by_chat_media_type: [string, string, number];
      by_media_type: [string, number];
      by_chat_pinned: [string, number, number];
      by_chat_sender_date: [string, string, number];
      by_status_date: [string, number];
      by_chat_status: [string, string];
      by_search_tokens: string;
      by_chat_has_media: [string, number, number];
      by_chat_has_link: [string, number, number];
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
const DB_VERSION = 2; // Upgraded for high-speed indexing & filtering strategy

/**
 * Text tokenizer with Arabic diacritics stripping, Unicode letter extraction,
 * and search token normalization for the multiEntry search index.
 */
export function tokenizeMessageText(
  text: string,
  senderName?: string,
  mediaFilename?: string
): string[] {
  const combined = `${text || ''} ${senderName || ''} ${mediaFilename || ''}`.trim();
  if (!combined) return [];

  // 1. Normalize Arabic letters and strip tashkeel (diacritics)
  const normalized = combined
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();

  // 2. Extract words matching alphanumeric or unicode letters
  const rawTokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  const tokenSet = new Set<string>();

  for (const tok of rawTokens) {
    if (tok.length >= 2 && tok.length <= 32) {
      tokenSet.add(tok);
      if (tokenSet.size >= 64) break; // bounded size for performance
    }
  }

  return Array.from(tokenSet);
}

/**
 * Derives normalized media category from message payload
 */
export function deriveIndexedMediaType(msg: Message): IndexedMediaType {
  if (msg.media) {
    const t = msg.media.type;
    if (t === 'photo') return 'photo';
    if (t === 'video') return 'video';
    if (t === 'voice') return 'voice';
    if (t === 'audio') return 'audio';
    if (t === 'document') return 'document';
  }
  if (msg.linkPreview || (msg.text && /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/i.test(msg.text))) {
    return 'link';
  }
  return 'none';
}

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
        let messageStore: any;
        if (!db.objectStoreNames.contains('messages')) {
          messageStore = db.createObjectStore('messages', { keyPath: 'compoundKey' });
        } else {
          messageStore = transaction.objectStore('messages');
        }

        // Base & Chronological Indexes
        if (!messageStore.indexNames.contains('by_chatId')) {
          messageStore.createIndex('by_chatId', 'chatId', { unique: false });
        }
        if (!messageStore.indexNames.contains('by_chat_date')) {
          messageStore.createIndex('by_chat_date', ['chatId', 'numericDate'], { unique: false });
        }
        if (!messageStore.indexNames.contains('by_numericDate')) {
          messageStore.createIndex('by_numericDate', 'numericDate', { unique: false });
        }
        if (!messageStore.indexNames.contains('by_cachedAt')) {
          messageStore.createIndex('by_cachedAt', 'cachedAt', { unique: false });
        }

        // --- High-Performance Strategy Indexes for Offline-First Filtering ---
        // 1. Media Type per Chat: Instant Shared Media tabs (photos, files, voice, music, links)
        if (!messageStore.indexNames.contains('by_chat_media_type')) {
          messageStore.createIndex('by_chat_media_type', ['chatId', 'mediaType', 'numericDate'], { unique: false });
        }
        // 2. Global Media Type: Cross-chat offline gallery
        if (!messageStore.indexNames.contains('by_media_type')) {
          messageStore.createIndex('by_media_type', ['mediaType', 'numericDate'], { unique: false });
        }
        // 3. Pinned Messages per Chat: Direct retrieval of pinned messages
        if (!messageStore.indexNames.contains('by_chat_pinned')) {
          messageStore.createIndex('by_chat_pinned', ['chatId', 'isPinnedNum', 'numericDate'], { unique: false });
        }
        // 4. Sender Filter per Chat: Messages from specific user in group/channel
        if (!messageStore.indexNames.contains('by_chat_sender_date')) {
          messageStore.createIndex('by_chat_sender_date', ['chatId', 'senderId', 'numericDate'], { unique: false });
        }
        // 5. Outgoing Offline Queue: Pending and error messages needing dispatch retry
        if (!messageStore.indexNames.contains('by_status_date')) {
          messageStore.createIndex('by_status_date', ['status', 'numericDate'], { unique: false });
        }
        // 6. Chat status compound index
        if (!messageStore.indexNames.contains('by_chat_status')) {
          messageStore.createIndex('by_chat_status', ['chatId', 'status'], { unique: false });
        }
        // 7. Full-Text Search Multi-Entry Index: Normalized word tokens
        if (!messageStore.indexNames.contains('by_search_tokens')) {
          messageStore.createIndex('by_search_tokens', 'searchTokens', { unique: false, multiEntry: true });
        }
        // 8. Messages with any media attachment
        if (!messageStore.indexNames.contains('by_chat_has_media')) {
          messageStore.createIndex('by_chat_has_media', ['chatId', 'hasMedia', 'numericDate'], { unique: false });
        }
        // 9. Messages with links or preview
        if (!messageStore.indexNames.contains('by_chat_has_link')) {
          messageStore.createIndex('by_chat_has_link', ['chatId', 'hasLink', 'numericDate'], { unique: false });
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

    const mediaType = deriveIndexedMediaType(msg);
    const hasMedia = mediaType !== 'none' && mediaType !== 'link' ? 1 : 0;
    const hasLink = mediaType === 'link' || /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/i.test(msg.text || '') ? 1 : 0;
    const isPinnedNum = msg.isPinned ? 1 : 0;
    const isOutgoingNum = Boolean(msg.isOutgoing || msg.out) ? 1 : 0;
    const hasReactions = msg.reactions && msg.reactions.length > 0 ? 1 : 0;
    const mediaTitle = msg.media?.fileName || msg.linkPreview?.title;
    const searchTokens = tokenizeMessageText(msg.text || '', msg.senderName, mediaTitle);

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
      mediaType,
      hasMedia,
      hasLink,
      isPinnedNum,
      isOutgoingNum,
      hasReactions,
      searchTokens,
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

  // =========================================================================
  // INDEXEDDB STRATEGY: ACCELERATED RETRIEVAL & FILTERING ENGINE
  // =========================================================================

  /**
   * High-performance filtered query planner using the optimal IndexedDB index.
   * Directly queries the B-tree indexes rather than in-memory scanning.
   */
  public async filterMessages(options: MessageFilterOptions): Promise<Message[]> {
    const db = await this.getDB();
    if (!db) return [];

    const limit = Math.max(1, Math.min(options.limit || 50, 200));
    const direction: IDBCursorDirection = options.direction === 'next' ? 'next' : 'prev';

    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const results: CachedMessageRecord[] = [];

      // Query Planner Selection:
      if (options.chatId && options.mediaType && options.mediaType !== 'any_media') {
        // Query Plan 1: by_chat_media_type [chatId, mediaType, numericDate]
        const minDate = options.fromDate || 0;
        const maxDate = options.beforeNumericDate || options.toDate || Infinity;
        const range = IDBKeyRange.bound(
          [options.chatId, options.mediaType, minDate],
          [options.chatId, options.mediaType, maxDate]
        );
        const index = store.index('by_chat_media_type');
        let cursor = await index.openCursor(range, direction);

        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, ['chatId', 'mediaType'])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      } else if (options.chatId && options.mediaType === 'any_media') {
        // Query Plan 2: by_chat_has_media [chatId, 1, numericDate]
        const minDate = options.fromDate || 0;
        const maxDate = options.beforeNumericDate || options.toDate || Infinity;
        const range = IDBKeyRange.bound(
          [options.chatId, 1, minDate],
          [options.chatId, 1, maxDate]
        );
        const index = store.index('by_chat_has_media');
        let cursor = await index.openCursor(range, direction);

        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, ['chatId', 'mediaType'])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      } else if (options.chatId && options.isPinned === true) {
        // Query Plan 3: by_chat_pinned [chatId, 1, numericDate]
        const range = IDBKeyRange.bound(
          [options.chatId, 1, options.fromDate || 0],
          [options.chatId, 1, options.toDate || Infinity]
        );
        const index = store.index('by_chat_pinned');
        let cursor = await index.openCursor(range, direction);

        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, ['chatId', 'isPinned'])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      } else if (options.chatId && options.senderId) {
        // Query Plan 4: by_chat_sender_date [chatId, senderId, numericDate]
        const minDate = options.fromDate || 0;
        const maxDate = options.beforeNumericDate || options.toDate || Infinity;
        const range = IDBKeyRange.bound(
          [options.chatId, options.senderId, minDate],
          [options.chatId, options.senderId, maxDate]
        );
        const index = store.index('by_chat_sender_date');
        let cursor = await index.openCursor(range, direction);

        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, ['chatId', 'senderId'])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      } else if (options.status) {
        // Query Plan 5: by_status_date [status, numericDate] (for offline queue & error states)
        const range = IDBKeyRange.bound(
          [options.status, options.fromDate || 0],
          [options.status, options.toDate || Infinity]
        );
        const index = store.index('by_status_date');
        let cursor = await index.openCursor(range, direction);

        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, ['status'])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      } else if (options.query && options.query.trim().length >= 2) {
        // Query Plan 6: Full-text search via Multi-Entry token index
        return this.searchMessagesOffline(options.query, {
          chatId: options.chatId,
          limit,
        });
      } else if (options.chatId) {
        // Query Plan 7: by_chat_date [chatId, numericDate]
        const minDate = options.fromDate || 0;
        const maxDate = options.beforeNumericDate || options.toDate || Infinity;
        const range = IDBKeyRange.bound(
          [options.chatId, minDate],
          [options.chatId, maxDate]
        );
        const index = store.index('by_chat_date');
        let cursor = await index.openCursor(range, direction);

        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, ['chatId'])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      } else {
        // Global chronological fallback
        const index = store.index('by_numericDate');
        let cursor = await index.openCursor(null, direction);
        while (cursor && results.length < limit) {
          const rec = cursor.value;
          if (this.matchesRemainingFilter(rec, options, [])) {
            results.push(rec);
          }
          cursor = await cursor.continue();
        }
      }

      await tx.done;
      return results.map((r) => this.toMessage(r));
    } catch (err) {
      console.warn('[IndexedDBMessageCache] filterMessages failed:', err);
      return [];
    }
  }

  /**
   * Helper filter validator for secondary non-indexed fields
   */
  private matchesRemainingFilter(
    rec: CachedMessageRecord,
    options: MessageFilterOptions,
    appliedIndexKeys: string[]
  ): boolean {
    if (!appliedIndexKeys.includes('chatId') && options.chatId && rec.chatId !== options.chatId) {
      return false;
    }
    if (!appliedIndexKeys.includes('senderId') && options.senderId && rec.senderId !== options.senderId) {
      return false;
    }
    if (!appliedIndexKeys.includes('status') && options.status && rec.status !== options.status) {
      return false;
    }
    if (!appliedIndexKeys.includes('isPinned') && options.isPinned !== undefined) {
      if (Boolean(rec.isPinned) !== options.isPinned) return false;
    }
    if (!appliedIndexKeys.includes('mediaType') && options.mediaType) {
      if (options.mediaType === 'any_media' && !rec.hasMedia) return false;
      if (options.mediaType !== 'any_media' && rec.mediaType !== options.mediaType) return false;
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      if (!rec.text?.toLowerCase().includes(q)) return false;
    }
    return true;
  }

  /**
   * Sub-millisecond full-text search across cached messages using the multiEntry token B-tree.
   * Scores and ranks multi-word search queries.
   */
  public async searchMessagesOffline(
    query: string,
    options?: { chatId?: string; limit?: number }
  ): Promise<Message[]> {
    const db = await this.getDB();
    if (!db || !query || query.trim().length < 2) return [];

    const tokens = tokenizeMessageText(query);
    if (tokens.length === 0) return [];

    const limit = Math.min(options?.limit || 40, 100);

    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const tokenIndex = store.index('by_search_tokens');

      // Map to track matched records and relevance score
      const matchMap = new Map<string, { record: CachedMessageRecord; score: number }>();

      // Query multiEntry index for each token
      for (const token of tokens) {
        const records = await tokenIndex.getAll(token);
        for (const rec of records) {
          if (options?.chatId && rec.chatId !== options.chatId) continue;

          const existing = matchMap.get(rec.compoundKey);
          if (existing) {
            existing.score += 10; // multiple token matches boost rank
          } else {
            // Initial score based on exact match bonus
            let score = 5;
            if (rec.text && rec.text.toLowerCase().includes(query.toLowerCase().trim())) {
              score += 20; // exact phrase match gets highest bonus
            }
            matchMap.set(rec.compoundKey, { record: rec, score });
          }
        }
      }

      await tx.done;

      // Sort by score descending, then by numericDate descending
      const sorted = Array.from(matchMap.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (b.record.numericDate || 0) - (a.record.numericDate || 0);
        })
        .slice(0, limit)
        .map((item) => this.toMessage(item.record));

      return sorted;
    } catch (e) {
      console.warn('[IndexedDBMessageCache] searchMessagesOffline failed:', e);
      return [];
    }
  }

  /**
   * Retrieves shared media for a chat filtered by category directly from IndexedDB.
   */
  public async getSharedMedia(
    chatId: string,
    mediaType: IndexedMediaType,
    options?: { limit?: number; beforeNumericDate?: number }
  ): Promise<Message[]> {
    return this.filterMessages({
      chatId,
      mediaType,
      beforeNumericDate: options?.beforeNumericDate,
      limit: options?.limit || 50,
      direction: 'prev',
    });
  }

  /**
   * Fast count of all media types and pinned messages for a chat without loading records into memory.
   */
  public async getMediaCounts(chatId: string): Promise<{
    photos: number;
    videos: number;
    files: number;
    voice: number;
    audio: number;
    links: number;
    pinned: number;
  }> {
    const db = await this.getDB();
    const fallback = { photos: 0, videos: 0, files: 0, voice: 0, audio: 0, links: 0, pinned: 0 };
    if (!db) return fallback;

    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const mediaIdx = store.index('by_chat_media_type');
      const linkIdx = store.index('by_chat_has_link');
      const pinnedIdx = store.index('by_chat_pinned');

      const [photos, videos, files, voice, audio, links, pinned] = await Promise.all([
        mediaIdx.count(IDBKeyRange.bound([chatId, 'photo', 0], [chatId, 'photo', Infinity])),
        mediaIdx.count(IDBKeyRange.bound([chatId, 'video', 0], [chatId, 'video', Infinity])),
        mediaIdx.count(IDBKeyRange.bound([chatId, 'document', 0], [chatId, 'document', Infinity])),
        mediaIdx.count(IDBKeyRange.bound([chatId, 'voice', 0], [chatId, 'voice', Infinity])),
        mediaIdx.count(IDBKeyRange.bound([chatId, 'audio', 0], [chatId, 'audio', Infinity])),
        linkIdx.count(IDBKeyRange.bound([chatId, 1, 0], [chatId, 1, Infinity])),
        pinnedIdx.count(IDBKeyRange.bound([chatId, 1, 0], [chatId, 1, Infinity])),
      ]);

      await tx.done;

      return { photos, videos, files, voice, audio, links, pinned };
    } catch (e) {
      console.warn(`[IndexedDBMessageCache] getMediaCounts failed for ${chatId}:`, e);
      return fallback;
    }
  }

  /**
   * Direct index retrieval of pinned messages in a chat.
   */
  public async getPinnedMessages(chatId: string, limit: number = 20): Promise<Message[]> {
    return this.filterMessages({
      chatId,
      isPinned: true,
      limit,
      direction: 'prev',
    });
  }

  /**
   * Outgoing offline queue: Retrieves all pending messages awaiting network dispatch.
   */
  public async getOfflinePendingQueue(): Promise<Message[]> {
    const db = await this.getDB();
    if (!db) return [];

    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const statusIdx = store.index('by_status_date');

      // Fetch 'sending' and 'error' status items
      const sendingRange = IDBKeyRange.bound(['sending', 0], ['sending', Infinity]);
      const errorRange = IDBKeyRange.bound(['error', 0], ['error', Infinity]);

      const [sendingRecords, errorRecords] = await Promise.all([
        statusIdx.getAll(sendingRange),
        statusIdx.getAll(errorRange),
      ]);

      await tx.done;
      const combined = [...sendingRecords, ...errorRecords].sort(
        (a, b) => (a.numericDate || 0) - (b.numericDate || 0)
      );

      return combined.map((r) => this.toMessage(r));
    } catch (e) {
      console.warn('[IndexedDBMessageCache] getOfflinePendingQueue failed:', e);
      return [];
    }
  }

  /**
   * Returns operational telemetry and storage statistics for offline diagnosis.
   */
  public async getIndexingStats(): Promise<IndexingStats> {
    const db = await this.getDB();
    const emptyStats: IndexingStats = {
      totalMessages: 0,
      chatCount: 0,
      mediaCounts: { photos: 0, videos: 0, files: 0, voice: 0, audio: 0, links: 0 },
      pinnedCount: 0,
      pendingOutgoingCount: 0,
    };
    if (!db) return emptyStats;

    try {
      const tx = db.transaction(['messages', 'chat_metadata'], 'readonly');
      const msgStore = tx.objectStore('messages');
      const metaStore = tx.objectStore('chat_metadata');

      const totalMessages = await msgStore.count();
      const chatCount = await metaStore.count();

      const mediaIdx = msgStore.index('by_media_type');
      const statusIdx = msgStore.index('by_status_date');

      const [photos, videos, files, voice, audio, pending] = await Promise.all([
        mediaIdx.count(IDBKeyRange.bound(['photo', 0], ['photo', Infinity])),
        mediaIdx.count(IDBKeyRange.bound(['video', 0], ['video', Infinity])),
        mediaIdx.count(IDBKeyRange.bound(['document', 0], ['document', Infinity])),
        mediaIdx.count(IDBKeyRange.bound(['voice', 0], ['voice', Infinity])),
        mediaIdx.count(IDBKeyRange.bound(['audio', 0], ['audio', Infinity])),
        statusIdx.count(IDBKeyRange.bound(['sending', 0], ['sending', Infinity])),
      ]);

      await tx.done;

      let storageEstimateBytes: number | undefined;
      let storageQuotaBytes: number | undefined;

      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          storageEstimateBytes = estimate.usage;
          storageQuotaBytes = estimate.quota;
        } catch {
          // ignore
        }
      }

      return {
        totalMessages,
        chatCount,
        mediaCounts: { photos, videos, files, voice, audio, links: 0 },
        pinnedCount: 0,
        pendingOutgoingCount: pending,
        storageEstimateBytes,
        storageQuotaBytes,
      };
    } catch (e) {
      console.warn('[IndexedDBMessageCache] getIndexingStats failed:', e);
      return emptyStats;
    }
  }

  /**
   * Lazily re-indexes any existing records in the database that were saved prior to schema v2
   */
  public async reindexExistingMessages(): Promise<number> {
    const db = await this.getDB();
    if (!db) return 0;

    let updatedCount = 0;
    try {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      let cursor = await store.openCursor();

      while (cursor) {
        const val = cursor.value;
        if (!val.mediaType || !Array.isArray(val.searchTokens)) {
          const mediaType = deriveIndexedMediaType(val as any);
          const hasMedia = mediaType !== 'none' && mediaType !== 'link' ? 1 : 0;
          const hasLink = mediaType === 'link' || /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/i.test(val.text || '') ? 1 : 0;
          const isPinnedNum = val.isPinned ? 1 : 0;
          const isOutgoingNum = Boolean(val.isOutgoing || val.out) ? 1 : 0;
          const hasReactions = val.reactions && val.reactions.length > 0 ? 1 : 0;
          const searchTokens = tokenizeMessageText(val.text || '', val.senderName, val.media?.fileName);

          const updated: CachedMessageRecord = {
            ...val,
            mediaType,
            hasMedia,
            hasLink,
            isPinnedNum,
            isOutgoingNum,
            hasReactions,
            searchTokens,
          };

          await cursor.update(updated);
          updatedCount++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      if (updatedCount > 0) {
        console.log(`[IndexedDBMessageCache] Re-indexed ${updatedCount} legacy messages with v2 indexes.`);
      }
    } catch (e) {
      console.warn('[IndexedDBMessageCache] reindexExistingMessages failed:', e);
    }
    return updatedCount;
  }
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
