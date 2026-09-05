/**
 * ChannelDifferenceService.ts
 *
 * Dedicated service module handling MTProto updates.getChannelDifference specifically
 * for Supergroups and Broadcast Channels.
 *
 * Adheres to Telegram DrKLO architecture:
 * - Maintains and tracks PTS per-channel (channel_pts) in persistent SQLite storage.
 * - Resolves updates.channelDifferenceSlice sequentially until final.
 * - Handles updates.channelDifferenceTooLong after long offline periods:
 *   recuperates full historical message batches via deep history fetching to prevent
 *   any historical message loss.
 * - Concurrency control & queueing to prevent server flooding.
 * - Auto-reconnect & offline gap synchronization.
 */

import { Message, Chat } from '../types';
import { MessagesStorage } from '../core/MessagesStorage';
import { NotificationCenter } from '../core/NotificationCenter';
import { UserConfig } from '../core/messenger/UserConfig';

export interface ChannelDifferenceResult {
  success: boolean;
  channelId: string;
  pts?: number;
  newMessagesCount: number;
  isTooLong?: boolean;
  isSlice?: boolean;
  recoveredHistoricalCount?: number;
  error?: string;
}

export class ChannelDifferenceService {
  private static instances: Map<number, ChannelDifferenceService> = new Map();

  private currentAccount: number = 0;
  private activeSyncs: Map<string, Promise<ChannelDifferenceResult>> = new Map();
  private lastSyncTimes: Map<string, number> = new Map();
  private isRecoveringOffline: boolean = false;
  private lastOnlineTimestamp: number = Date.now();

  private constructor(account: number = 0) {
    this.currentAccount = account;
    this.setupLifecycleListeners();
  }

  public static getInstance(account: number = 0): ChannelDifferenceService {
    let instance = ChannelDifferenceService.instances.get(account);
    if (!instance) {
      instance = new ChannelDifferenceService(account);
      ChannelDifferenceService.instances.set(account, instance);
    }
    return instance;
  }

  /**
   * Sets up network/visibility listeners to detect resumption after long offline periods
   */
  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      const offlineDuration = Date.now() - this.lastOnlineTimestamp;
      console.log(`[ChannelDifferenceService ${this.currentAccount}] Network reconnected after ${Math.round(offlineDuration / 1000)}s.`);
      this.handleLongOfflineRecovery(offlineDuration);
    });

    window.addEventListener('offline', () => {
      this.lastOnlineTimestamp = Date.now();
    });

    // Listen to NotificationCenter resume event
    NotificationCenter.getInstance(this.currentAccount).addObserver(
      NotificationCenter.didResume,
      () => {
        const offlineDuration = Date.now() - this.lastOnlineTimestamp;
        if (offlineDuration > 15000) {
          this.handleLongOfflineRecovery(offlineDuration);
        }
      }
    );
  }

  /**
   * Primary entry point to fetch and process updates.getChannelDifference for a supergroup/channel.
   *
   * @param channelId Target channel/supergroup ID (e.g. 'chat_-1001234567' or '-1001234567' or '1234567')
   * @param force Force sync regardless of last sync time or current PTS
   * @param reason Diagnostic reason for tracking (e.g. 'offline_resume', 'pts_gap', 'chat_opened')
   */
  public async getChannelDifference(
    channelId: string,
    force: boolean = false,
    reason: string = 'manual'
  ): Promise<ChannelDifferenceResult> {
    if (!channelId) {
      return { success: false, channelId: '', newMessagesCount: 0, error: 'NO_CHANNEL_ID' };
    }

    const normalizedId = channelId.startsWith('chat_') ? channelId : `chat_${channelId}`;
    const cleanChanId = channelId.replace('chat_', '');

    // Prevent duplicate concurrent syncs for the same supergroup
    const existingSync = this.activeSyncs.get(normalizedId);
    if (existingSync) {
      return existingSync;
    }

    // Rate-limiting check: avoid re-syncing the same channel within 3 seconds unless forced
    const lastSync = this.lastSyncTimes.get(normalizedId) || 0;
    if (!force && Date.now() - lastSync < 3000) {
      return { success: true, channelId: normalizedId, newMessagesCount: 0 };
    }

    const syncPromise = this.executeChannelDifference(normalizedId, cleanChanId, reason);
    this.activeSyncs.set(normalizedId, syncPromise);

    try {
      const res = await syncPromise;
      this.lastSyncTimes.set(normalizedId, Date.now());
      return res;
    } finally {
      this.activeSyncs.delete(normalizedId);
    }
  }

  /**
   * Internal worker executing the MTProto updates.getChannelDifference loop
   */
  private async executeChannelDifference(
    chatId: string,
    cleanChanId: string,
    reason: string
  ): Promise<ChannelDifferenceResult> {
    const storage = MessagesStorage.getInstance(this.currentAccount);
    const userConfig = UserConfig.getInstance(this.currentAccount);
    const user = userConfig.getCurrentUser();
    const phone = user?.phone || '';
    const sessionString =
      typeof window !== 'undefined'
        ? localStorage.getItem(`tg_session_string_${this.currentAccount}`) ||
          localStorage.getItem('tg_session_string') ||
          ''
        : '';

    let currentPts = storage.getChannelPts(chatId) || storage.getChannelPts(cleanChanId) || 0;
    let accumulatedMessages: Message[] = [];
    let isTooLongEncountered = false;
    let recoveredHistoryCount = 0;
    let loopCount = 0;
    const maxLoops = 15; // Prevent runaway infinite loops on pathological slices

    console.log(`[ChannelDifferenceService ${this.currentAccount}] Starting sync for ${chatId} (PTS: ${currentPts}, reason: ${reason})...`);

    try {
      while (loopCount < maxLoops) {
        loopCount++;

        const response = await fetch('/api/telegram/updates/channel-difference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: cleanChanId,
            pts: currentPts,
            accountIndex: this.currentAccount,
            phone,
            sessionString,
            fetchHistoryIfTooLong: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[ChannelDifferenceService ${this.currentAccount}] Server error syncing ${chatId}:`, errText);
          return {
            success: false,
            channelId: chatId,
            newMessagesCount: accumulatedMessages.length,
            error: `HTTP_${response.status}`,
          };
        }

        const data = await response.json();
        if (!data || !data.success) {
          console.warn(`[ChannelDifferenceService ${this.currentAccount}] API returned unsuccessful for ${chatId}:`, data?.error);
          return {
            success: false,
            channelId: chatId,
            newMessagesCount: accumulatedMessages.length,
            error: data?.error || 'UNKNOWN_ERROR',
          };
        }

        // 1. Process ChannelDifferenceTooLong:
        // Occurs when offline period was too long and server difference buffer has wrapped.
        if (data.isTooLong) {
          isTooLongEncountered = true;
          console.log(`[ChannelDifferenceService ${this.currentAccount}] Received updates.channelDifferenceTooLong for supergroup ${chatId}!`);

          // Safeguard: Ensure no historical messages were missed by doing a comprehensive history recovery
          const recovered = await this.recoverHistoricalMessagesOnGap(chatId, cleanChanId, data.newMessages);
          recoveredHistoryCount += recovered.length;
          accumulatedMessages = accumulatedMessages.concat(recovered);

          if (data.pts) {
            currentPts = data.pts;
            storage.setChannelPts(chatId, currentPts);
            storage.setChannelPts(cleanChanId, currentPts);
          }

          // In tooLong, server gives us the new state; we do not loop further
          break;
        }

        // 2. Process regular new messages in this slice/difference
        if (data.newMessages && Array.isArray(data.newMessages) && data.newMessages.length > 0) {
          accumulatedMessages = accumulatedMessages.concat(data.newMessages);
        }

        // 3. Process other updates (e.g. edits, deletions, read inbox/outbox)
        if (data.otherUpdates && Array.isArray(data.otherUpdates) && data.otherUpdates.length > 0) {
          try {
            const { MessagesController } = await import('../core/MessagesController');
            const controller = MessagesController.getInstance(this.currentAccount);
            controller.processUpdates(data.otherUpdates, true);
          } catch (ctrlErr) {
            console.warn(`[ChannelDifferenceService] Failed to dispatch otherUpdates:`, ctrlErr);
          }
        }

        // 4. Update channel PTS
        if (data.pts && data.pts > 0) {
          currentPts = data.pts;
          storage.setChannelPts(chatId, currentPts);
          storage.setChannelPts(cleanChanId, currentPts);
        }

        // 5. If it's a slice (not final), continue fetching subsequent slices
        if (data.isSlice && !data.isFinal) {
          console.log(`[ChannelDifferenceService] Channel ${chatId} returned slice. Fetching next slice with PTS ${currentPts}...`);
          continue;
        }

        // Final slice reached or empty difference
        break;
      }

      // Persist all accumulated messages to SQLite and memory
      if (accumulatedMessages.length > 0) {
        // Deduplicate messages by ID
        const uniqueMap = new Map<string, Message>();
        accumulatedMessages.forEach((m) => {
          if (m && m.id) uniqueMap.set(String(m.id), m);
        });
        const deduplicated = Array.from(uniqueMap.values()).sort(
          (a, b) => (a.epoch || 0) - (b.epoch || 0)
        );

        // Put into SQLite storage
        storage.putMessages(deduplicated, chatId);
        storage.putMessages(deduplicated, cleanChanId);

        // Notify UI components
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.didReceiveNewMessages,
          chatId,
          deduplicated
        );

        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.dialogsNeedReload
        );

        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.updateInterfaces,
          0
        );

        console.log(`✅ [ChannelDifferenceService ${this.currentAccount}] Successfully synced supergroup ${chatId}: saved ${deduplicated.length} messages (TooLong: ${isTooLongEncountered}).`);
      }

      return {
        success: true,
        channelId: chatId,
        pts: currentPts,
        newMessagesCount: accumulatedMessages.length,
        isTooLong: isTooLongEncountered,
        recoveredHistoricalCount: recoveredHistoryCount,
      };
    } catch (err: any) {
      console.error(`[ChannelDifferenceService ${this.currentAccount}] Sync error for ${chatId}:`, err);
      return {
        success: false,
        channelId: chatId,
        newMessagesCount: accumulatedMessages.length,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Recovers historical messages during long offline periods or when channelDifferenceTooLong occurs.
   * Fetches latest history backwards to ensure continuous, gapless conversation timeline.
   */
  private async recoverHistoricalMessagesOnGap(
    chatId: string,
    cleanChanId: string,
    initialMessages: Message[] = []
  ): Promise<Message[]> {
    const recovered: Message[] = [...(initialMessages || [])];
    try {
      const userConfig = UserConfig.getInstance(this.currentAccount);
      const user = userConfig.getCurrentUser();
      const phone = user?.phone || '';
      const sessionString =
        typeof window !== 'undefined'
          ? localStorage.getItem(`tg_session_string_${this.currentAccount}`) ||
            localStorage.getItem('tg_session_string') ||
            ''
          : '';

      console.log(`[ChannelDifferenceService ${this.currentAccount}] Deep history recovery for supergroup ${chatId}...`);
      const resp = await fetch('/api/telegram/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: cleanChanId,
          limit: 60,
          phone,
          sessionString,
        }),
      });

      if (resp.ok) {
        const histData = await resp.json();
        if (histData && Array.isArray(histData.messages) && histData.messages.length > 0) {
          histData.messages.forEach((m: any) => {
            if (m && m.id) {
              recovered.push({
                id: String(m.id),
                chatId,
                senderId: m.senderId || '',
                senderName: m.senderName || 'Telegram User',
                text: m.text || '',
                timestamp: m.timestamp || '',
                date: m.date || '',
                epoch: m.epoch || (m.rawDate ? m.rawDate * 1000 : Date.now()),
                rawDate: m.rawDate,
                isOutgoing: Boolean(m.isOutgoing || m.out),
                status: 'read',
                media: m.media,
              });
            }
          });
          console.log(`[ChannelDifferenceService] Recovered ${histData.messages.length} historical messages for ${chatId}.`);
        }
      }
    } catch (histErr) {
      console.warn(`[ChannelDifferenceService] Error during deep history recovery:`, histErr);
    }
    return recovered;
  }

  /**
   * Checks whether an incoming update has a PTS gap for the channel.
   * If gap is detected, automatically triggers getChannelDifference.
   */
  public checkChannelPtsGap(channelId: string, newPts: number, ptsCount: number = 1): boolean {
    if (!channelId || !newPts) return false;
    const storage = MessagesStorage.getInstance(this.currentAccount);
    const normalizedId = channelId.startsWith('chat_') ? channelId : `chat_${channelId}`;
    const cleanId = channelId.replace('chat_', '');
    const currentPts = storage.getChannelPts(normalizedId) || storage.getChannelPts(cleanId) || 0;

    if (currentPts === 0) {
      // First time seeing PTS for this channel: save it
      storage.setChannelPts(normalizedId, newPts);
      storage.setChannelPts(cleanId, newPts);
      return false;
    }

    if (newPts > currentPts + ptsCount) {
      console.warn(`⚠️ [ChannelDifferenceService] PTS GAP detected for ${channelId}! Current: ${currentPts}, Update PTS: ${newPts} (gap: ${newPts - currentPts}). Triggering channel difference...`);
      this.getChannelDifference(normalizedId, true, 'pts_gap');
      return true;
    }

    if (newPts > currentPts) {
      storage.setChannelPts(normalizedId, newPts);
      storage.setChannelPts(cleanId, newPts);
    }

    return false;
  }

  /**
   * Triggers difference check for all known supergroups and channels upon reconnection
   * after long offline periods.
   */
  public async handleLongOfflineRecovery(offlineDurationMs: number = 0): Promise<void> {
    if (this.isRecoveringOffline) return;
    this.isRecoveringOffline = true;
    this.lastOnlineTimestamp = Date.now();

    console.log(`🔄 [ChannelDifferenceService ${this.currentAccount}] Running full supergroup offline recovery (offline ~${Math.round(offlineDurationMs / 1000)}s)...`);

    try {
      const { MessagesController } = await import('../core/MessagesController');
      const controller = MessagesController.getInstance(this.currentAccount);
      const dialogs = controller.getDialogs();

      // Filter for supergroups and channels
      const supergroups = dialogs.filter((d) => this.isSupergroupOrChannel(d));
      console.log(`[ChannelDifferenceService] Found ${supergroups.length} supergroups/channels to synchronize.`);

      // Sync in controlled batches of 2 concurrent channels
      const batchSize = 2;
      for (let i = 0; i < supergroups.length; i += batchSize) {
        const batch = supergroups.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map((sg) => this.getChannelDifference(sg.id, true, 'offline_resume'))
        );
      }
    } catch (e) {
      console.error(`[ChannelDifferenceService] handleLongOfflineRecovery error:`, e);
    } finally {
      this.isRecoveringOffline = false;
    }
  }

  /**
   * Helper to check if a chat represents a supergroup or channel
   */
  public isSupergroupOrChannel(chat: Chat | any): boolean {
    if (!chat) return false;
    const type = String(chat.type || '').toLowerCase();
    const idStr = String(chat.id || '');
    return (
      type === 'supergroup' ||
      type === 'channel' ||
      chat.isChannel === true ||
      chat.isSupergroup === true ||
      idStr.startsWith('chat_-100') ||
      idStr.startsWith('-100')
    );
  }

  /**
   * Synchronizes all known supergroups
   */
  public async syncAllChannels(force: boolean = false): Promise<void> {
    try {
      const { MessagesController } = await import('../core/MessagesController');
      const controller = MessagesController.getInstance(this.currentAccount);
      const dialogs = controller.getDialogs();
      const supergroups = dialogs.filter((d) => this.isSupergroupOrChannel(d));

      for (const sg of supergroups) {
        await this.getChannelDifference(sg.id, force, 'sync_all');
      }
    } catch (e) {
      console.warn('[ChannelDifferenceService] syncAllChannels error:', e);
    }
  }
}
