/**
 * chatStore.ts
 * Manages chat scroll positions, read message persistence, and smart auto-scrolling
 * Replicates official Telegram scroll behavior:
 * - Stores lastReadPositions (chatId -> { lastReadMessageId, scrollTop, scrollHeight, isNearBottom, lastUpdated }) in localStorage
 * - When opening a chat for the first time: immediately scrolls to bottom (scrollToBottom)
 * - When returning to a chat: navigates to lastReadMessageId / last saved reading position, never jumping to top
 * - Smart scroll on new messages: smooth scroll to bottom if near bottom or outgoing, preserve reading offset if scrolled up
 * - Live update on scroll: updates lastReadMessageId and scroll position dynamically
 * - Conversation sync status: tracks whether conversation is fully synced with server ('synced' | 'partial' | 'syncing')
 * - Displays a 'partial' icon for locally-cached messages that haven't been verified by the cloud yet
 */

import React from 'react';
import { Chat, Message, MessageMedia, ReplyInfo } from '../types';
import { telegramDB } from '../utils/sqliteStorage';
import { SecureSessionStorage } from '../utils/SecureSessionStorage';

export interface ChatReadPosition {
  chatId: string;
  lastReadMessageId?: string;
  scrollTop: number;
  scrollHeight: number;
  isNearBottom: boolean;
  lastUpdated: number;
}

export interface InSessionScrollState extends ChatReadPosition {}

export type ConversationSyncStatus = 'synced' | 'partial' | 'syncing';

export interface QueuedOutgoingMessage {
  id: string;
  chatId: string;
  text: string;
  media?: MessageMedia;
  replyTo?: ReplyInfo;
  replyToMsgId?: string;
  timestamp: string;
  date: string;
  epoch: number;
  rawDate?: number;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  status: 'pending' | 'sending' | 'failed';
  attempts: number;
  queuedAt: number;
  lastAttemptAt?: number;
  error?: string;
  phone?: string;
  sessionString?: string;
}

export class ChatStore {
  private static instance: ChatStore;

  // Persistent Record<string, number> for last read message IDs / scroll positions
  public ScrollPositions: Record<string, number> = {};

  // Persistent rich last read positions per chat (chatId -> ChatReadPosition)
  public lastReadPositions: Record<string, ChatReadPosition> = {};

  // Tracks whether a conversation is fully synced with the server ('synced' | 'partial' | 'syncing')
  public syncStatus: Record<string, ConversationSyncStatus> = {};

  // Persistent queue for pending outgoing messages captured when offline / connection is lost
  public pendingOutgoingQueue: QueuedOutgoingMessage[] = [];
  private isSyncingPending = false;

  // Tracks message IDs that have been verified by the cloud per chat
  private verifiedMessageIds: Map<string, Set<string>> = new Map();

  // In-memory session scroll map
  private sessionScrollMap: Map<string, InSessionScrollState> = new Map();

  // Tracks chats visited during the current session
  private visitedChatsInCurrentSession: Set<string> = new Set();

  // Listeners for store subscriptions
  private listeners: Set<() => void> = new Set();

  // Threshold in pixels to consider user "at bottom"
  private readonly NEAR_BOTTOM_THRESHOLD = 140;
  private readonly STORAGE_KEY = 'tg_last_read_positions';
  private readonly SCROLL_POSITIONS_KEY = 'tg_scroll_positions';

  // Offline-First Cache storage keys
  private readonly CHATS_STORAGE_KEY = 'tg_offline_cached_chats_v1';
  private readonly MESSAGES_STORAGE_PREFIX = 'tg_offline_cached_msgs_';
  private readonly MESSAGES_INDEX_KEY = 'tg_offline_cached_chat_ids_v1';
  private readonly SYNC_STATUS_KEY = 'tg_conversation_sync_status_v1';
  private readonly VERIFIED_MSGS_KEY = 'tg_verified_messages_v1';
  private readonly OUTGOING_QUEUE_KEY = 'tg_offline_outgoing_queue_v1';

  // Synchronous in-memory caches to guarantee ZERO white screens on startup
  private cachedChats: Chat[] = [];
  private cachedMessages: Map<string, Message[]> = new Map();
  private cachedChatIds: Set<string> = new Set();

  constructor() {
    this.initFromStorage();
  }

  public static getInstance(): ChatStore {
    if (!ChatStore.instance) {
      ChatStore.instance = new ChatStore();
    }
    return ChatStore.instance;
  }

  /**
   * Subscribe to chat store changes (syncStatus, messages, positions)
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('[chatStore] Error in listener:', err);
      }
    });
  }

  /**
   * Load persistent scroll positions, sync status & offline-cached chats and messages from localStorage
   */
  private initFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      // 1. Load tg_scroll_positions (chatId -> number)
      const storedPositions = localStorage.getItem(this.SCROLL_POSITIONS_KEY);
      if (storedPositions) {
        const parsedPositions = JSON.parse(storedPositions);
        if (parsedPositions && typeof parsedPositions === 'object') {
          this.ScrollPositions = parsedPositions;
        }
      }

      // 2. Load rich lastReadPositions
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          this.lastReadPositions = parsed;
          // Synchronize to session map as well
          Object.values(parsed).forEach((item: any) => {
            if (item && item.chatId) {
              this.sessionScrollMap.set(item.chatId, item);
              if (item.lastReadMessageId && !this.ScrollPositions[item.chatId]) {
                const numericId = Number(item.lastReadMessageId);
                if (!isNaN(numericId)) {
                  this.ScrollPositions[item.chatId] = numericId;
                }
              }
            }
          });
        }
      }

      // 3. Load offline-cached chats
      const storedChats = localStorage.getItem(this.CHATS_STORAGE_KEY);
      if (storedChats) {
        try {
          const parsedChats = JSON.parse(storedChats);
          if (Array.isArray(parsedChats) && parsedChats.length > 0) {
            this.cachedChats = parsedChats;
          }
        } catch (e) {
          console.warn('[chatStore] Error parsing cached chats:', e);
        }
      }

      // 4. Load offline-cached chat message IDs index
      const storedIndex = localStorage.getItem(this.MESSAGES_INDEX_KEY);
      if (storedIndex) {
        try {
          const parsedIndex = JSON.parse(storedIndex);
          if (Array.isArray(parsedIndex)) {
            this.cachedChatIds = new Set(parsedIndex);
            // Pre-load cached messages for quick access
            for (const cId of parsedIndex) {
              const msgKey = this.MESSAGES_STORAGE_PREFIX + cId;
              const rawMsgs = localStorage.getItem(msgKey);
              if (rawMsgs) {
                try {
                  const msgs = JSON.parse(rawMsgs);
                  if (Array.isArray(msgs)) {
                    this.cachedMessages.set(cId, msgs);
                  }
                } catch {}
              }
            }
          }
        } catch (e) {
          console.warn('[chatStore] Error parsing cached message index:', e);
        }
      }

      // 5. Load syncStatus mapping
      const storedSync = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (storedSync) {
        try {
          const parsedSync = JSON.parse(storedSync);
          if (parsedSync && typeof parsedSync === 'object') {
            this.syncStatus = parsedSync;
          }
        } catch (e) {
          console.warn('[chatStore] Error parsing syncStatus:', e);
        }
      }

      // 6. Load verified message IDs
      const storedVerified = localStorage.getItem(this.VERIFIED_MSGS_KEY);
      if (storedVerified) {
        try {
          const parsedVerified = JSON.parse(storedVerified);
          if (parsedVerified && typeof parsedVerified === 'object') {
            for (const [cId, ids] of Object.entries(parsedVerified)) {
              if (Array.isArray(ids)) {
                this.verifiedMessageIds.set(cId, new Set(ids as string[]));
              }
            }
          }
        } catch (e) {
          console.warn('[chatStore] Error parsing verified messages:', e);
        }
      }

      // 7. Load offline pending outgoing message queue
      const storedQueue = localStorage.getItem(this.OUTGOING_QUEUE_KEY);
      if (storedQueue) {
        try {
          const parsedQueue = JSON.parse(storedQueue);
          if (Array.isArray(parsedQueue)) {
            this.pendingOutgoingQueue = parsedQueue.map((item) => ({
              ...item,
              status: item.status === 'sending' ? 'pending' : item.status,
            }));
          }
        } catch (e) {
          console.warn('[chatStore] Error parsing pending outgoing queue:', e);
        }
      }
    } catch (err) {
      console.warn('[chatStore] Error reading positions from localStorage:', err);
    }
  }

  /**
   * Persist pending outgoing message queue safely to localStorage
   */
  public persistPendingOutgoingQueue(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.OUTGOING_QUEUE_KEY, JSON.stringify(this.pendingOutgoingQueue));
    } catch (err) {
      console.warn('[chatStore] Error saving pending outgoing queue to localStorage:', err);
    }
  }

  /**
   * Persist both ScrollPositions and lastReadPositions safely to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.SCROLL_POSITIONS_KEY, JSON.stringify(this.ScrollPositions));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.lastReadPositions));
    } catch (err) {
      console.warn('[chatStore] Error saving positions to localStorage:', err);
    }
  }

  /**
   * Persist syncStatus to localStorage
   */
  private persistSyncStatus(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    } catch (err) {
      console.warn('[chatStore] Error saving syncStatus:', err);
    }
  }

  /**
   * Persist verified message IDs to localStorage
   */
  private persistVerifiedMessages(): void {
    if (typeof window === 'undefined') return;
    try {
      const serialized: Record<string, string[]> = {};
      for (const [cId, set] of this.verifiedMessageIds.entries()) {
        serialized[cId] = Array.from(set);
      }
      localStorage.setItem(this.VERIFIED_MSGS_KEY, JSON.stringify(serialized));
    } catch (err) {
      console.warn('[chatStore] Error saving verified messages:', err);
    }
  }

  // ==========================================
  // SYNC STATUS & VERIFICATION STATE
  // ==========================================

  /**
   * Get sync status for a conversation ('synced' | 'partial' | 'syncing')
   */
  public getSyncStatus(chatId: string): ConversationSyncStatus {
    if (!chatId) return 'synced';
    if (this.syncStatus[chatId]) {
      return this.syncStatus[chatId];
    }
    const cached = this.getCachedMessages(chatId);
    if (cached.length === 0) return 'synced';
    const verified = this.verifiedMessageIds.get(chatId);
    if (!verified || verified.size === 0) return 'partial';
    const allVerified = cached.every((m) => verified.has(m.id));
    return allVerified ? 'synced' : 'partial';
  }

  /**
   * Set sync status for a conversation
   */
  public setSyncStatus(chatId: string, status: ConversationSyncStatus): void {
    if (!chatId) return;
    this.syncStatus[chatId] = status;
    this.persistSyncStatus();
    this.notifyListeners();
  }

  /**
   * Check whether a conversation is fully synced with the server
   */
  public isConversationSynced(chatId: string): boolean {
    return this.getSyncStatus(chatId) === 'synced';
  }

  /**
   * Mark conversation as fully synced with the server
   */
  public markConversationSynced(chatId: string, messageIds?: string[]): void {
    if (!chatId) return;
    this.syncStatus[chatId] = 'synced';
    if (messageIds && messageIds.length > 0) {
      this.markMessagesVerified(chatId, messageIds);
    } else {
      const cached = this.getCachedMessages(chatId);
      if (cached.length > 0) {
        this.markMessagesVerified(chatId, cached.map((m) => m.id));
      }
    }
    this.persistSyncStatus();
    this.notifyListeners();
  }

  /**
   * Mark conversation as partially synced (having locally-cached unverified items)
   */
  public markConversationPartial(chatId: string): void {
    if (!chatId) return;
    this.syncStatus[chatId] = 'partial';
    this.persistSyncStatus();
    this.notifyListeners();
  }

  /**
   * Mark specific message IDs as verified by the cloud
   */
  public markMessagesVerified(chatId: string, messageIds: string[]): void {
    if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;
    let set = this.verifiedMessageIds.get(chatId);
    if (!set) {
      set = new Set();
      this.verifiedMessageIds.set(chatId, set);
    }
    messageIds.forEach((id) => set!.add(id));
    this.persistVerifiedMessages();
    this.notifyListeners();
  }

  /**
   * Mark a single message as verified by the cloud
   */
  public markMessageVerified(chatId: string, messageId: string): void {
    if (!chatId || !messageId) return;
    this.markMessagesVerified(chatId, [messageId]);
  }

  /**
   * Check whether a message has been verified by the cloud
   */
  public isMessageVerified(chatId: string, messageId: string): boolean {
    if (!chatId || !messageId) return true;
    const verified = this.verifiedMessageIds.get(chatId);
    if (verified && verified.has(messageId)) return true;
    if (this.syncStatus[chatId] === 'synced') return true;
    return false;
  }

  /**
   * Check whether a message is locally-cached and hasn't been verified by the cloud yet
   */
  public isLocallyCachedOnly(chatId: string, messageId: string): boolean {
    return !this.isMessageVerified(chatId, messageId);
  }

  // ==========================================
  // OFFLINE-FIRST CACHE OPS FOR CHATS & MESSAGES
  // ==========================================

  /**
   * Save chats list immediately to memory, localStorage, and IndexedDB SQLite
   */
  public saveChats(chats: Chat[]): void {
    if (!Array.isArray(chats) || chats.length === 0) return;
    this.cachedChats = chats;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.CHATS_STORAGE_KEY, JSON.stringify(chats));
      } catch (e) {
        console.warn('[chatStore] Error saving cached chats to localStorage, attempting compact storage:', e);
        try {
          // If storage quota exceeded (e.g. lots of base64 avatars), save lightweight metadata
          const compact = chats.map((c) => ({
            ...c,
            avatar: c.avatar && c.avatar.startsWith('data:image') && c.avatar.length > 2000 ? '' : c.avatar,
          }));
          localStorage.setItem(this.CHATS_STORAGE_KEY, JSON.stringify(compact));
        } catch (_) {}
      }
    }
    try {
      telegramDB.saveChats(chats);
    } catch (e) {
      console.warn('[chatStore] Error saving cached chats to telegramDB:', e);
    }
  }

  /**
   * Retrieve cached chats synchronously (Zero-latency cache first)
   */
  public getCachedChats(): Chat[] {
    if (this.cachedChats && this.cachedChats.length > 0) {
      return this.cachedChats;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.CHATS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.cachedChats = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    try {
      const sqliteChats = telegramDB.getChats();
      if (sqliteChats && sqliteChats.length > 0) {
        this.cachedChats = sqliteChats;
        return sqliteChats;
      }
    } catch {}
    return [];
  }

  /**
   * Retrieve cached chats asynchronously with full IndexedDB / SQLite resolution
   */
  public async getCachedChatsAsync(): Promise<Chat[]> {
    const sync = this.getCachedChats();
    if (sync && sync.length > 0) return sync;
    try {
      await telegramDB.init();
      const sqliteChats = telegramDB.getChats();
      if (sqliteChats && sqliteChats.length > 0) {
        this.cachedChats = sqliteChats;
        return sqliteChats;
      }
    } catch (e) {
      console.warn('[chatStore] getCachedChatsAsync error:', e);
    }
    return [];
  }

  /**
   * Save messages list for a chat immediately to memory, localStorage, and IndexedDB SQLite
   */
  public saveMessages(chatId: string, messages: Message[], options?: { isCloudVerified?: boolean }): void {
    if (!chatId || !Array.isArray(messages)) return;
    this.cachedMessages.set(chatId, messages);
    this.cachedChatIds.add(chatId);

    if (options?.isCloudVerified) {
      this.markMessagesVerified(chatId, messages.map((m) => m.id));
      this.syncStatus[chatId] = 'synced';
    } else {
      if (!this.syncStatus[chatId]) {
        this.syncStatus[chatId] = 'partial';
      }
    }
    this.persistSyncStatus();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.MESSAGES_STORAGE_PREFIX + chatId, JSON.stringify(messages));
        localStorage.setItem(this.MESSAGES_INDEX_KEY, JSON.stringify(Array.from(this.cachedChatIds)));
      } catch (e) {
        console.warn("[chatStore] Error saving cached messages for " + chatId, e);
      }
    }
    try {
      telegramDB.saveMessages(messages);
    } catch {}
  }

  /**
   * Save or update a single message immediately to memory, localStorage, and IndexedDB SQLite
   */
  public saveMessage(chatId: string, message: Message, options?: { isCloudVerified?: boolean }): void {
    if (!chatId || !message || !message.id) return;
    const existing = this.getCachedMessages(chatId);
    const existsIndex = existing.findIndex((m) => m.id === message.id);
    let updated: Message[];
    if (existsIndex >= 0) {
      updated = [...existing];
      updated[existsIndex] = message;
    } else {
      updated = [...existing, message];
    }
    this.saveMessages(chatId, updated, options);
    try {
      telegramDB.saveMessage(message);
    } catch {}
  }

  /**
   * Retrieve cached messages for a chat synchronously (Zero-latency cache first)
   */
  public getCachedMessages(chatId: string): Message[] {
    if (!chatId) return [];
    if (this.cachedMessages.has(chatId)) {
      const msgs = this.cachedMessages.get(chatId)!;
      if (msgs.length > 0) return msgs;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.MESSAGES_STORAGE_PREFIX + chatId);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.cachedMessages.set(chatId, parsed);
            this.cachedChatIds.add(chatId);
            return parsed;
          }
        }
      } catch {}
    }
    try {
      const sqliteMsgs = telegramDB.getMessagesForChat(chatId);
      if (sqliteMsgs && sqliteMsgs.length > 0) {
        this.cachedMessages.set(chatId, sqliteMsgs);
        return sqliteMsgs;
      }
    } catch {}
    return [];
  }

  /**
   * Get all cached messages across all chats synchronously
   */
  public getAllCachedMessages(): Record<string, Message[]> {
    const result: Record<string, Message[]> = {};
    for (const [cId, msgs] of this.cachedMessages.entries()) {
      if (msgs && msgs.length > 0) {
        result[cId] = msgs;
      }
    }
    for (const cId of this.cachedChatIds) {
      if (!result[cId]) {
        const msgs = this.getCachedMessages(cId);
        if (msgs.length > 0) {
          result[cId] = msgs;
        }
      }
    }
    return result;
  }

  // ==========================================
  // OFFLINE MESSAGE QUEUING & SYNCHRONIZATION
  // ==========================================

  /**
   * Captures a pending outgoing message when offline or connection is lost.
   * Persists to storage and notifies subscribers.
   */
  public enqueueOutgoingMessage(
    msg: Partial<QueuedOutgoingMessage> & { id: string; chatId: string; text: string }
  ): QueuedOutgoingMessage {
    const existingIndex = this.pendingOutgoingQueue.findIndex((item) => item.id === msg.id);
    const existing = existingIndex >= 0 ? this.pendingOutgoingQueue[existingIndex] : undefined;

    const queuedItem: QueuedOutgoingMessage = {
      id: msg.id,
      chatId: msg.chatId,
      text: msg.text,
      media: msg.media ?? existing?.media,
      replyTo: msg.replyTo ?? existing?.replyTo,
      replyToMsgId: msg.replyToMsgId ?? msg.replyTo?.messageId ?? existing?.replyToMsgId,
      timestamp: msg.timestamp || existing?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: msg.date || existing?.date || new Date().toISOString().split('T')[0],
      epoch: msg.epoch || existing?.epoch || Date.now(),
      rawDate: msg.rawDate || existing?.rawDate || Math.floor(Date.now() / 1000),
      senderId: msg.senderId || existing?.senderId || 'user_self',
      senderName: msg.senderName || existing?.senderName || 'You',
      senderAvatar: msg.senderAvatar || existing?.senderAvatar,
      status: 'pending',
      attempts: existing ? existing.attempts : 0,
      queuedAt: existing ? existing.queuedAt : Date.now(),
      phone: msg.phone || existing?.phone,
      sessionString: msg.sessionString || existing?.sessionString,
    };

    if (existingIndex >= 0) {
      this.pendingOutgoingQueue[existingIndex] = queuedItem;
    } else {
      this.pendingOutgoingQueue.push(queuedItem);
    }

    // Persist queue to localStorage
    this.persistPendingOutgoingQueue();

    // Also ensure the message exists in the local cache with 'sending' status for immediate UI feedback
    const messageModel: Message = {
      id: queuedItem.id,
      chatId: queuedItem.chatId,
      senderId: queuedItem.senderId,
      senderName: queuedItem.senderName,
      senderAvatar: queuedItem.senderAvatar,
      text: queuedItem.text,
      timestamp: queuedItem.timestamp,
      date: queuedItem.date,
      epoch: queuedItem.epoch,
      rawDate: queuedItem.rawDate,
      isOutgoing: true,
      status: 'sending',
      media: queuedItem.media,
      replyTo: queuedItem.replyTo,
    };
    this.saveMessage(queuedItem.chatId, messageModel, { isCloudVerified: false });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tg-outgoing-message-enqueued', {
          detail: { message: queuedItem },
        })
      );
    }

    this.notifyListeners();
    return queuedItem;
  }

  /**
   * Retrieves pending outgoing messages, optionally filtered by chatId.
   */
  public getPendingOutgoingMessages(chatId?: string): QueuedOutgoingMessage[] {
    if (chatId) {
      return this.pendingOutgoingQueue.filter((item) => item.chatId === chatId);
    }
    return [...this.pendingOutgoingQueue];
  }

  /**
   * Returns count of queued messages.
   */
  public getPendingOutgoingCount(chatId?: string): number {
    return this.getPendingOutgoingMessages(chatId).length;
  }

  /**
   * Checks if a message ID is in the offline pending queue.
   */
  public isMessageQueued(id: string): boolean {
    return this.pendingOutgoingQueue.some((item) => item.id === id);
  }

  /**
   * Removes a message from the pending queue (e.g. after successful sync or user cancellation).
   */
  public removePendingOutgoingMessage(id: string): void {
    const initialLen = this.pendingOutgoingQueue.length;
    this.pendingOutgoingQueue = this.pendingOutgoingQueue.filter((item) => item.id !== id);
    if (this.pendingOutgoingQueue.length !== initialLen) {
      this.persistPendingOutgoingQueue();
      this.notifyListeners();
    }
  }

  /**
   * Clears pending queue for a specific chat or all chats.
   */
  public clearPendingOutgoingMessages(chatId?: string): void {
    if (chatId) {
      this.pendingOutgoingQueue = this.pendingOutgoingQueue.filter((item) => item.chatId !== chatId);
    } else {
      this.pendingOutgoingQueue = [];
    }
    this.persistPendingOutgoingQueue();
    this.notifyListeners();
  }

  /**
   * Updates status of a queued message.
   */
  public updatePendingOutgoingMessageStatus(
    id: string,
    status: 'pending' | 'sending' | 'failed',
    error?: string
  ): void {
    const item = this.pendingOutgoingQueue.find((m) => m.id === id);
    if (item) {
      item.status = status;
      if (error) item.error = error;
      this.persistPendingOutgoingQueue();
      this.notifyListeners();
    }
  }

  /**
   * Automatically synchronizes all pending outgoing messages with the server.
   * Idempotent and thread-safe: skips if already syncing or if browser is offline.
   */
  public async syncPendingOutgoingMessages(options?: {
    customSender?: (item: QueuedOutgoingMessage) => Promise<{ success: boolean; realMsgId?: string; error?: string }>;
  }): Promise<{ total: number; sent: number; failed: number }> {
    if (this.isSyncingPending) {
      return { total: this.pendingOutgoingQueue.length, sent: 0, failed: 0 };
    }

    if (this.pendingOutgoingQueue.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[chatStore] syncPendingOutgoingMessages skipped: device is currently offline');
      return { total: this.pendingOutgoingQueue.length, sent: 0, failed: 0 };
    }

    this.isSyncingPending = true;
    this.notifyListeners();

    const queueSnapshot = [...this.pendingOutgoingQueue];
    let sentCount = 0;
    let failedCount = 0;

    console.log(`[chatStore] Starting offline message sync. Queued items count: ${queueSnapshot.length}`);

    for (const item of queueSnapshot) {
      // If we went offline during the loop, stop cleanly
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('[chatStore] Offline state detected during sync loop. Halting queue processing.');
        break;
      }

      item.status = 'sending';
      item.attempts = (item.attempts || 0) + 1;
      item.lastAttemptAt = Date.now();
      this.persistPendingOutgoingQueue();
      this.notifyListeners();

      let isSent = false;
      let returnedId: string | undefined;
      let errorReason: string | undefined;

      try {
        if (options?.customSender) {
          const res = await options.customSender(item);
          isSent = res.success;
          returnedId = res.realMsgId;
          errorReason = res.error;
        } else {
          // Standard Telegram endpoint dispatch
          const session =
            item.sessionString ||
            SecureSessionStorage.getItem<string>('tg_session_string') ||
            (typeof window !== 'undefined' ? localStorage.getItem('tg_session_string') : null) ||
            '';
          const phone =
            item.phone ||
            SecureSessionStorage.getItem<string>('tg_phone') ||
            (typeof window !== 'undefined' ? localStorage.getItem('tg_phone') : null) ||
            '';

          const res = await fetch('/api/telegram/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: item.chatId,
              text: item.text,
              media: item.media,
              replyToMsgId: item.replyToMsgId || item.replyTo?.messageId,
              phone,
              sessionString: session,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (res.ok && (data.success || data.result)) {
            isSent = true;
            returnedId = data.result?.id ? String(data.result.id) : undefined;
          } else {
            errorReason = data.error || data.message || `HTTP ${res.status}`;
          }
        }
      } catch (err: any) {
        errorReason = err?.message || 'Network request failed';
      }

      if (isSent) {
        sentCount++;
        // Remove from pending queue
        this.removePendingOutgoingMessage(item.id);

        // Update cached message in memory and SQLite
        const cached = this.getCachedMessages(item.chatId);
        const existingMsg = cached.find((m) => m.id === item.id);
        if (existingMsg) {
          const updatedMsg: Message = {
            ...existingMsg,
            id: returnedId || existingMsg.id,
            status: 'sent',
          };
          this.saveMessage(item.chatId, updatedMsg, { isCloudVerified: true });
        }

        // Dispatch sync event for active React contexts
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tg-offline-message-synced', {
              detail: {
                tempId: item.id,
                realId: returnedId,
                chatId: item.chatId,
              },
            })
          );
        }
      } else {
        failedCount++;
        // If max attempts reached, mark failed; otherwise keep pending for next reconnect
        if (item.attempts >= 5) {
          item.status = 'failed';
          item.error = errorReason;
        } else {
          item.status = 'pending';
          item.error = errorReason;
        }
        this.persistPendingOutgoingQueue();
      }
    }

    this.isSyncingPending = false;
    this.persistPendingOutgoingQueue();
    this.notifyListeners();

    console.log(
      `[chatStore] Offline message sync complete. Total: ${queueSnapshot.length}, Sent: ${sentCount}, Failed: ${failedCount}, Remaining: ${this.pendingOutgoingQueue.length}`
    );

    return {
      total: queueSnapshot.length,
      sent: sentCount,
      failed: failedCount,
    };
  }

  /**
   * Get the saved scroll position number from ScrollPositions
   */
  public getScrollPosition(chatId: string): number | undefined {
    if (!chatId) return undefined;
    return this.ScrollPositions[chatId];
  }

  /**
   * Set the saved scroll position number in ScrollPositions
   */
  public setScrollPosition(chatId: string, position: number): void {
    if (!chatId || position === undefined || isNaN(position)) return;
    this.ScrollPositions[chatId] = position;
    this.persistToStorage();
  }

  /**
   * Check if a chat exists in lastReadPositions or ScrollPositions
   */
  public hasLastReadPosition(chatId: string): boolean {
    if (!chatId) return false;
    return Boolean(this.lastReadPositions[chatId] || this.ScrollPositions[chatId] !== undefined);
  }

  /**
   * Get the saved read position for a chat
   */
  public getLastReadPosition(chatId: string): ChatReadPosition | undefined {
    if (!chatId) return undefined;
    return this.lastReadPositions[chatId];
  }

  /**
   * Get the last read message ID for a chat
   */
  public getLastReadMessageId(chatId: string): string | undefined {
    return this.getLastReadPosition(chatId)?.lastReadMessageId;
  }

  /**
   * Check if a chat was already visited in the current session
   */
  public hasVisitedInCurrentSession(chatId: string): boolean {
    return this.visitedChatsInCurrentSession.has(chatId);
  }

  /**
   * Mark a chat as opened/visited in the current session
   */
  public markChatVisitedInCurrentSession(chatId: string): void {
    if (!chatId) return;
    this.visitedChatsInCurrentSession.add(chatId);
  }

  /**
   * Saves the scroll & last-read position for a chat
   */
  public saveLastReadPosition(
    chatId: string,
    data: {
      lastReadMessageId?: string;
      scrollTop?: number;
      scrollHeight?: number;
      isNearBottom?: boolean;
    }
  ): void {
    if (!chatId) return;
    const existing = this.lastReadPositions[chatId];
    const isNearBottom = data.isNearBottom !== undefined ? data.isNearBottom : (existing?.isNearBottom ?? true);
    const scrollTop = data.scrollTop !== undefined ? data.scrollTop : (existing?.scrollTop ?? 0);
    const scrollHeight = data.scrollHeight !== undefined ? data.scrollHeight : (existing?.scrollHeight ?? 0);
    const lastReadMessageId = data.lastReadMessageId !== undefined ? data.lastReadMessageId : existing?.lastReadMessageId;

    const updated: ChatReadPosition = {
      chatId,
      lastReadMessageId,
      scrollTop,
      scrollHeight,
      isNearBottom,
      lastUpdated: Date.now(),
    };

    this.lastReadPositions[chatId] = updated;
    this.sessionScrollMap.set(chatId, updated);
    this.visitedChatsInCurrentSession.add(chatId);

    // Also update ScrollPositions mapping
    if (lastReadMessageId) {
      const numId = Number(lastReadMessageId);
      this.ScrollPositions[chatId] = !isNaN(numId) ? numId : scrollTop;
    } else if (scrollTop > 0) {
      this.ScrollPositions[chatId] = scrollTop;
    }

    this.persistToStorage();
  }

  /**
   * Updates last read message ID specifically
   */
  public updateLastReadMessageId(
    chatId: string,
    messageId: string,
    isNearBottom: boolean = false,
    scrollTop: number = 0,
    scrollHeight: number = 0
  ): void {
    this.saveLastReadPosition(chatId, {
      lastReadMessageId: messageId,
      isNearBottom,
      scrollTop,
      scrollHeight,
    });
  }

  /**
   * Legacy & in-session compatibility method
   */
  public saveSessionScrollPosition(
    chatId: string,
    scrollTop: number,
    scrollHeight: number,
    isNearBottom: boolean,
    lastReadMessageId?: string
  ): void {
    this.saveLastReadPosition(chatId, {
      scrollTop,
      scrollHeight,
      isNearBottom,
      lastReadMessageId,
    });
  }

  /**
   * Returns saved position for a chat
   */
  public getSessionScrollPosition(chatId: string): InSessionScrollState | null {
    if (!chatId) return null;
    return this.getLastReadPosition(chatId) || this.sessionScrollMap.get(chatId) || null;
  }

  /**
   * Clears saved scroll position for a chat or all chats
   */
  public clearSessionScroll(chatId?: string): void {
    if (chatId) {
      delete this.lastReadPositions[chatId];
      delete this.ScrollPositions[chatId];
      this.sessionScrollMap.delete(chatId);
      this.visitedChatsInCurrentSession.delete(chatId);
    } else {
      this.lastReadPositions = {};
      this.ScrollPositions = {};
      this.sessionScrollMap.clear();
      this.visitedChatsInCurrentSession.clear();
    }
    this.persistToStorage();
  }

  /**
   * Determines if container scroll offset is near the bottom
   */
  public isNearBottom(container: HTMLElement | null, threshold = this.NEAR_BOTTOM_THRESHOLD): boolean {
    if (!container) return true;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceToBottom <= threshold;
  }

  /**
   * Smart scroll helper: scrolls to bottom if user was near bottom or outgoing message
   */
  public smartScrollToBottom(
    container: HTMLElement | null,
    isOutgoing: boolean = false,
    force: boolean = false
  ): boolean {
    if (!container) return false;
    const nearBottom = this.isNearBottom(container);
    if (force || isOutgoing || nearBottom) {
      container.scrollTop = container.scrollHeight;
      return true;
    }
    return false;
  }
}

export const chatStore = ChatStore.getInstance();

/**
 * Partial Sync Icon displayed for locally-cached messages that haven't been verified by the cloud yet.
 * Follows Telegram mobile UI specifications: delicate dashed cloud indicator with subtle pending clock/mark.
 */
export const PartialSyncIcon = ({
  className = 'w-3.5 h-3.5',
  title = 'Locally cached — Pending cloud verification (partial)',
}: {
  className?: string;
  title?: string;
}) => {
  return React.createElement(
    'span',
    {
      title,
      className: 'inline-flex items-center justify-center text-amber-400 select-none',
      'data-testid': 'partial-sync-icon',
      'aria-label': title,
    },
    React.createElement(
      'svg',
      {
        className,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      React.createElement('path', {
        d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z',
        strokeDasharray: '3 2',
      }),
      React.createElement('circle', {
        cx: '12',
        cy: '13',
        r: '2',
        stroke: 'currentColor',
        fill: 'none',
      }),
      React.createElement('polyline', {
        points: '12 12 12 13 13 13',
      })
    )
  );
};
