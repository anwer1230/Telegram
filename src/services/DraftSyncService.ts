/**
 * DraftSyncService.ts
 * 
 * Manages persistent storage and cross-session synchronization of message input drafts
 * using localStorage, window storage events, and BroadcastChannel.
 * Enables users to seamlessly resume typing if they refresh, switch chats, or switch tabs/sessions.
 */

export interface MessageDraft {
  chatId: string;
  text: string;
  cursorPosition?: number;
  replyToMsgId?: string | number;
  updatedAt: number;
}

export type DraftSubscriber = (chatId: string, draft: MessageDraft | null) => void;

export class DraftSyncService {
  private static instance: DraftSyncService;
  private readonly STORAGE_KEY = 'tg_message_drafts';
  private readonly BROADCAST_CHANNEL_NAME = 'tg_draft_sync_channel';

  private drafts: Map<string, MessageDraft> = new Map();
  private subscribers: Set<DraftSubscriber> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  public static getInstance(): DraftSyncService {
    if (!DraftSyncService.instance) {
      DraftSyncService.instance = new DraftSyncService();
    }
    return DraftSyncService.instance;
  }

  private constructor() {
    this.loadFromStorage();
    this.initCrossSessionListeners();
  }

  /**
   * Load drafts from localStorage into memory
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([chatId, data]: [string, any]) => {
            if (data && typeof data === 'object' && typeof data.text === 'string') {
              this.drafts.set(chatId, {
                chatId,
                text: data.text,
                cursorPosition: typeof data.cursorPosition === 'number' ? data.cursorPosition : undefined,
                replyToMsgId: data.replyToMsgId,
                updatedAt: data.updatedAt || Date.now(),
              });
            } else if (typeof data === 'string') {
              // Handle simple string fallback
              this.drafts.set(chatId, {
                chatId,
                text: data,
                updatedAt: Date.now(),
              });
            }
          });
        }
      }

      // Also check legacy account-specific keys like tg_drafts_0
      for (let i = 0; i < 4; i++) {
        const legacyKey = `tg_drafts_${i}`;
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw);
            if (legacyParsed && typeof legacyParsed === 'object') {
              Object.entries(legacyParsed).forEach(([chatId, data]: [string, any]) => {
                if (!this.drafts.has(chatId) && data?.message) {
                  this.drafts.set(chatId, {
                    chatId,
                    text: data.message,
                    replyToMsgId: data.replyToMsgId,
                    updatedAt: data.date || Date.now(),
                  });
                }
              });
            }
          } catch (_) {}
        }
      }

      // Default sample draft if empty
      if (this.drafts.size === 0) {
        this.drafts.set('chat_durov', {
          chatId: 'chat_durov',
          text: 'مرحباً بافل، نود مناقشة خطة التحديثات القادمة لتيليجرام.',
          updatedAt: Date.now() - 3600000,
        });
      }
    } catch (e) {
      console.warn('[DraftSyncService] Failed to load drafts from storage:', e);
    }
  }

  /**
   * Persist current in-memory drafts to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const serialized: Record<string, MessageDraft> = {};
      this.drafts.forEach((draft, chatId) => {
        if (draft.text.trim().length > 0) {
          serialized[chatId] = draft;
        }
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serialized));
    } catch (e) {
      console.warn('[DraftSyncService] Failed to persist drafts to localStorage:', e);
    }
  }

  /**
   * Initialize cross-session / cross-tab listeners
   */
  private initCrossSessionListeners(): void {
    if (typeof window === 'undefined') return;

    // 1. Cross-tab storage event
    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY && event.newValue !== null) {
        try {
          const parsed = JSON.parse(event.newValue);
          this.handleStorageUpdateFromOtherSession(parsed);
        } catch (_) {}
      }
    });

    // 2. BroadcastChannel for fast real-time synchronization between tabs
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          const { type, chatId, draft } = event.data || {};
          if (type === 'DRAFT_UPDATE' && chatId) {
            if (draft && draft.text && draft.text.trim().length > 0) {
              this.drafts.set(chatId, draft);
              this.notifySubscribers(chatId, draft);
            } else {
              this.drafts.delete(chatId);
              this.notifySubscribers(chatId, null);
            }
          }
        };
      } catch (err) {
        console.warn('[DraftSyncService] BroadcastChannel unavailable:', err);
      }
    }
  }

  /**
   * Handle updates from another tab/window via localStorage event
   */
  private handleStorageUpdateFromOtherSession(externalDrafts: Record<string, MessageDraft>): void {
    const updatedChatIds = new Set<string>([
      ...Array.from(this.drafts.keys()),
      ...Object.keys(externalDrafts),
    ]);

    updatedChatIds.forEach((chatId) => {
      const existing = this.drafts.get(chatId);
      const incoming = externalDrafts[chatId];

      if (incoming && incoming.text.trim().length > 0) {
        if (!existing || existing.text !== incoming.text || existing.updatedAt < incoming.updatedAt) {
          this.drafts.set(chatId, incoming);
          this.notifySubscribers(chatId, incoming);
        }
      } else if (existing) {
        this.drafts.delete(chatId);
        this.notifySubscribers(chatId, null);
      }
    });
  }

  /**
   * Save or update a draft for a specific chat
   */
  public saveDraft(
    chatId: string,
    text: string,
    options?: {
      cursorPosition?: number;
      replyToMsgId?: string | number;
      immediate?: boolean;
    }
  ): void {
    if (!chatId) return;

    const trimmed = text.trim();

    // Clear any existing debounce timer for this chat
    if (this.debounceTimers.has(chatId)) {
      clearTimeout(this.debounceTimers.get(chatId)!);
      this.debounceTimers.delete(chatId);
    }

    if (trimmed.length === 0) {
      // User emptied the input field - remove draft immediately
      this.drafts.delete(chatId);
      this.persistToStorage();
      this.broadcastUpdate(chatId, null);
      this.notifySubscribers(chatId, null);
      return;
    }

    const draft: MessageDraft = {
      chatId,
      text,
      cursorPosition: options?.cursorPosition,
      replyToMsgId: options?.replyToMsgId,
      updatedAt: Date.now(),
    };

    // Update memory immediately for responsive UI
    this.drafts.set(chatId, draft);
    this.notifySubscribers(chatId, draft);

    const persistAction = () => {
      this.persistToStorage();
      this.broadcastUpdate(chatId, draft);
      this.debounceTimers.delete(chatId);
    };

    if (options?.immediate) {
      persistAction();
    } else {
      // Debounce disk/storage writes to optimize performance during typing
      const timer = setTimeout(persistAction, 250);
      this.debounceTimers.set(chatId, timer);
    }
  }

  /**
   * Retrieve a draft for a chat
   */
  public getDraft(chatId: string): MessageDraft | null {
    if (!chatId) return null;
    return this.drafts.get(chatId) || null;
  }

  /**
   * Retrieve just the draft text for a chat
   */
  public getDraftText(chatId: string): string {
    if (!chatId) return '';
    return this.drafts.get(chatId)?.text || '';
  }

  /**
   * Retrieve all drafts as a Record of chatId -> draft text
   */
  public getAllDrafts(): Record<string, string> {
    const result: Record<string, string> = {};
    this.drafts.forEach((draft, chatId) => {
      if (draft.text.trim().length > 0) {
        result[chatId] = draft.text;
      }
    });
    return result;
  }

  /**
   * Retrieve all complete draft objects
   */
  public getAllDraftObjects(): Record<string, MessageDraft> {
    const result: Record<string, MessageDraft> = {};
    this.drafts.forEach((draft, chatId) => {
      if (draft.text.trim().length > 0) {
        result[chatId] = draft;
      }
    });
    return result;
  }

  /**
   * Clear draft for a specific chat (e.g. after message is sent)
   */
  public clearDraft(chatId: string): void {
    if (!chatId) return;

    if (this.debounceTimers.has(chatId)) {
      clearTimeout(this.debounceTimers.get(chatId)!);
      this.debounceTimers.delete(chatId);
    }

    this.drafts.delete(chatId);
    this.persistToStorage();
    this.broadcastUpdate(chatId, null);
    this.notifySubscribers(chatId, null);
  }

  /**
   * Clear all drafts
   */
  public clearAllDrafts(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.drafts.clear();
    this.persistToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram:drafts_cleared'));
    }
  }

  /**
   * Flush any pending debounced writes to localStorage immediately
   */
  public flushPendingWrites(): void {
    if (this.debounceTimers.size === 0) return;

    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.persistToStorage();
  }

  /**
   * Broadcast draft update to other tabs/sessions
   */
  private broadcastUpdate(chatId: string, draft: MessageDraft | null): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'DRAFT_UPDATE',
          chatId,
          draft,
        });
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('telegram:draft_updated', {
          detail: { chatId, draft },
        })
      );
    }
  }

  /**
   * Subscribe to draft updates (for reactive UI components)
   */
  public subscribe(listener: DraftSubscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers(chatId: string, draft: MessageDraft | null): void {
    this.subscribers.forEach((listener) => {
      try {
        listener(chatId, draft);
      } catch (err) {
        console.error('[DraftSyncService] Subscriber error:', err);
      }
    });
  }
}

export const draftSyncService = DraftSyncService.getInstance();
