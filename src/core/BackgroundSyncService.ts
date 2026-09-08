/**
 * BackgroundSyncService.ts
 *
 * Dedicated background orchestration service that offloads:
 * 1. Live Link Radar & Discovery (regex URL pattern parsing, normalization, de-duplication)
 * 2. Auto-Responder Rules Engine (keyword, exact, regex evaluation, scope matching, rate-limiting)
 * to a dedicated Web Worker off the main UI thread.
 */

import {
  AutoReplyRule,
  LiveDiscoveredLink,
  Message,
} from '../types';
import { telegramDb, initTelegramDexieDb } from './telegramDexieDb';
import { connectionsManager } from './ConnectionsManager';
import { notificationsController } from './NotificationsController';

export interface BackgroundWorkerStatus {
  isWorkerActive: boolean;
  workerType: 'web-worker' | 'main-thread-fallback';
  lastProcessedTimestamp: number;
  totalMessagesProcessed: number;
  totalLinksDiscovered: number;
  totalAutoRepliesTriggered: number;
}

// Inlined Web Worker script code to ensure zero bundler/CORS loading issues in iframe
const WORKER_SCRIPT = `
(function() {
  let autoReplyRules = [];
  let isAutoResponderActive = true;
  let isLiveDiscoverActive = true;
  let isInstantAutoJoinEnabled = false;

  // Rate-limiting memory for auto-responder to avoid feedback loops
  const lastTriggeredMap = new Map();

  // Telegram Link Regex
  const TG_LINK_REGEX = /(?:https?:\\/\\/)?(?:www\\.)?(?:t\\.me|telegram\\.me|telegram\\.dog)\\/(?:\\+([a-zA-Z0-9_-]+)|joinchat\\/([a-zA-Z0-9_-]+)|([a-zA-Z0-9_]{4,}))|tg:\\/\\/join\\?invite=([a-zA-Z0-9_-]+)/gi;

  self.onmessage = function(event) {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'INIT_STATE':
      case 'SYNC_RULES': {
        if (Array.isArray(data.rules)) {
          autoReplyRules = data.rules;
        }
        if (typeof data.isAutoResponderActive === 'boolean') {
          isAutoResponderActive = data.isAutoResponderActive;
        }
        if (typeof data.isLiveDiscoverActive === 'boolean') {
          isLiveDiscoverActive = data.isLiveDiscoverActive;
        }
        if (typeof data.isInstantAutoJoinEnabled === 'boolean') {
          isInstantAutoJoinEnabled = data.isInstantAutoJoinEnabled;
        }
        self.postMessage({ type: 'ACK_SYNC', timestamp: Date.now() });
        break;
      }

      case 'PROCESS_INCOMING_MESSAGE': {
        const { message, chatTitle, chatType, correlationId } = data;
        const text = (message && message.text) ? message.text : '';

        // 1. Off-thread Link Discovery
        let discoveredLinks = [];
        if (isLiveDiscoverActive && text) {
          const matches = text.matchAll(TG_LINK_REGEX);
          for (const match of matches) {
            const rawUrl = match[0];
            const fullUrl = rawUrl.startsWith('http') || rawUrl.startsWith('tg://') ? rawUrl : 'https://' + rawUrl;
            discoveredLinks.push({
              id: 'disc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
              url: fullUrl,
              sourceChatTitle: chatTitle || 'محادثة تلغرام',
              sourceChatId: message.chatId || 'chat_unknown',
              senderName: message.senderName || 'مستخدم',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: isInstantAutoJoinEnabled ? 'joining' : 'pending',
              autoJoined: isInstantAutoJoinEnabled,
            });
          }
        }

        // 2. Off-thread Auto-Responder Rule Evaluation
        let matchedRule = null;
        let autoReplyPayload = null;

        if (isAutoResponderActive && !message.isOutgoing && text && autoReplyRules.length > 0) {
          const cleanText = text.trim().toLowerCase();
          const isGroupChat = chatType === 'group' || chatType === 'supergroup' || chatType === 'channel';

          for (const rule of autoReplyRules) {
            if (!rule.isEnabled) continue;

            // Scope filter
            if (rule.scope === 'private' && isGroupChat) continue;
            if (rule.scope === 'groups' && !isGroupChat) continue;

            // Throttle protection (10 seconds per rule per chat)
            const throttleKey = rule.id + ':' + (message.chatId || 'default');
            const lastTrigger = lastTriggeredMap.get(throttleKey) || 0;
            if (Date.now() - lastTrigger < 10000) {
              continue;
            }

            let isMatch = false;
            const cleanKeyword = (rule.keyword || '').trim().toLowerCase();

            if (rule.matchType === 'exact') {
              isMatch = cleanText === cleanKeyword;
            } else if (rule.matchType === 'contains') {
              isMatch = cleanText.includes(cleanKeyword);
            } else if (rule.matchType === 'regex') {
              try {
                const re = new RegExp(rule.keyword, 'i');
                isMatch = re.test(text);
              } catch (e) {
                isMatch = false;
              }
            }

            if (isMatch) {
              lastTriggeredMap.set(throttleKey, Date.now());
              matchedRule = {
                id: rule.id,
                replyText: rule.replyText,
              };
              autoReplyPayload = {
                ruleId: rule.id,
                replyText: rule.replyText,
                targetChatId: message.chatId,
                delayMs: 600,
              };
              break;
            }
          }
        }

        self.postMessage({
          type: 'PROCESS_RESULT',
          correlationId,
          messageId: message.id,
          discoveredLinks,
          autoReplyPayload,
          matchedRuleId: matchedRule ? matchedRule.id : null,
          processedAt: Date.now(),
        });
        break;
      }

      case 'PING': {
        self.postMessage({ type: 'PONG', timestamp: Date.now() });
        break;
      }
    }
  };

  self.postMessage({ type: 'WORKER_READY', timestamp: Date.now() });
})();
`;

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;

  private worker: Worker | null = null;
  private isWorkerReady = false;
  private listeners: Set<() => void> = new Set();

  // State caches
  private autoReplyRules: AutoReplyRule[] = [
    {
      id: 'rule_1',
      keyword: 'السلام عليكم',
      replyText: 'وعليكم السلام ورحمة الله وبركاته، مرحباً بك! كيف يمكنني مساعدتك؟ 🌸',
      matchType: 'contains',
      scope: 'all',
      isEnabled: true,
      timesTriggered: 14,
      lastTriggeredAt: '08:45 AM',
    },
    {
      id: 'rule_2',
      keyword: 'الأسعار',
      replyText: 'أهلاً بك! يمكنك الاطلاع على باقات وأسعار الخدمات عبر الرابط: https://t.me/our_services_bot 💼',
      matchType: 'contains',
      scope: 'all',
      isEnabled: true,
      timesTriggered: 9,
      lastTriggeredAt: '08:30 AM',
    },
    {
      id: 'rule_3',
      keyword: 'رابط القناة',
      replyText: 'تفضل رابط القناة الرسمية: https://t.me/tech_innovators_hub 🚀',
      matchType: 'contains',
      scope: 'all',
      isEnabled: true,
      timesTriggered: 5,
      lastTriggeredAt: '08:12 AM',
    },
  ];

  private isAutoResponderGlobal = true;
  private isLiveLinkDiscoverActive = true;
  private isInstantAutoJoinEnabled = false;
  private discoveredLinks: LiveDiscoveredLink[] = [];

  // Metrics
  private statusMetrics: BackgroundWorkerStatus = {
    isWorkerActive: false,
    workerType: 'main-thread-fallback',
    lastProcessedTimestamp: Date.now(),
    totalMessagesProcessed: 0,
    totalLinksDiscovered: 0,
    totalAutoRepliesTriggered: 0,
  };

  // Pending callbacks map for incoming message processing
  private pendingCallbacks = new Map<string, (autoReplyText: string) => void>();

  private constructor() {
    this.initWorker();
    this.initStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('telegram:session_revoked', (e: any) => {
        const reason = e?.detail?.reason || 'AUTH_KEY_UNREGISTERED';
        this.handleSessionRevoked(reason);
      });
    }
  }

  public handleSessionRevoked(reason: string = 'AUTH_KEY_UNREGISTERED') {
    console.warn(`[BackgroundSyncService] Handling session revocation (${reason}): halting automation & clearing pending callbacks.`);
    this.pendingCallbacks.clear();
    this.isInstantAutoJoinEnabled = false;
    this.notifyStateChange();
  }

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  private initWorker() {
    try {
      if (typeof window !== 'undefined' && window.Worker && typeof Blob !== 'undefined') {
        const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);

        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (err) => {
          console.warn('[BackgroundSyncService] Worker error, switching to fallback:', err);
          this.statusMetrics.isWorkerActive = false;
          this.statusMetrics.workerType = 'main-thread-fallback';
          this.notifyStateChange();
        };

        this.statusMetrics.isWorkerActive = true;
        this.statusMetrics.workerType = 'web-worker';
      } else {
        this.statusMetrics.workerType = 'main-thread-fallback';
      }
    } catch (e) {
      console.warn('[BackgroundSyncService] Web Worker initialization failed, using fallback:', e);
      this.statusMetrics.workerType = 'main-thread-fallback';
    }
  }

  private async initStorage() {
    try {
      await initTelegramDexieDb();
      const savedLinks = await telegramDb.discoveredLinks.reverse().toArray();
      if (savedLinks && savedLinks.length > 0) {
        this.discoveredLinks = savedLinks;
      }
      this.syncStateToWorker();
      this.notifyStateChange();
    } catch (e) {
      console.warn('[BackgroundSyncService] IndexedDB init note:', e);
    }
  }

  private syncStateToWorker() {
    if (this.worker && this.isWorkerReady) {
      this.worker.postMessage({
        type: 'SYNC_RULES',
        rules: this.autoReplyRules,
        isAutoResponderActive: this.isAutoResponderGlobal,
        isLiveDiscoverActive: this.isLiveLinkDiscoverActive,
        isInstantAutoJoinEnabled: this.isInstantAutoJoinEnabled,
      });
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'WORKER_READY': {
        this.isWorkerReady = true;
        this.syncStateToWorker();
        break;
      }

      case 'PROCESS_RESULT': {
        this.statusMetrics.totalMessagesProcessed++;
        this.statusMetrics.lastProcessedTimestamp = Date.now();

        // 1. Handle off-thread Discovered Links
        if (Array.isArray(data.discoveredLinks) && data.discoveredLinks.length > 0) {
          for (const newLink of data.discoveredLinks) {
            this.discoveredLinks.unshift(newLink);
            telegramDb.discoveredLinks.put(newLink).catch(() => {});
            this.statusMetrics.totalLinksDiscovered++;

            // Trigger instant auto-join if enabled
            if (this.isInstantAutoJoinEnabled) {
              this.manualJoinDiscoveredLink(newLink.id);
            }
          }
        }

        // 2. Handle off-thread Auto-Responder matches
        if (data.autoReplyPayload && data.autoReplyPayload.replyText) {
          const { ruleId, replyText, delayMs } = data.autoReplyPayload;

          // Increment rule trigger stats
          const rule = this.autoReplyRules.find((r) => r.id === ruleId);
          if (rule) {
            rule.timesTriggered = (rule.timesTriggered || 0) + 1;
            rule.lastTriggeredAt = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
          }

          this.statusMetrics.totalAutoRepliesTriggered++;

          // Dispatch callback to send message
          const cb = this.pendingCallbacks.get(data.correlationId);
          if (cb) {
            setTimeout(() => {
              cb(replyText);
              this.pendingCallbacks.delete(data.correlationId);
            }, delayMs || 600);
          }
        } else {
          this.pendingCallbacks.delete(data.correlationId);
        }

        this.notifyStateChange();
        break;
      }

      case 'ACK_SYNC':
      case 'PONG': {
        break;
      }
    }
  }

  // ==========================================
  // INCOMING MESSAGE MONITORING (NON-BLOCKING)
  // ==========================================
  public processIncomingMessage(
    message: Message,
    chatTitle: string,
    chatType: 'private' | 'group' | 'channel' = 'group',
    onAutoReply?: (replyText: string) => void
  ) {
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    if (onAutoReply) {
      this.pendingCallbacks.set(correlationId, onAutoReply);
    }

    if (this.worker && this.isWorkerReady) {
      // Offload to Web Worker thread
      this.worker.postMessage({
        type: 'PROCESS_INCOMING_MESSAGE',
        message: {
          id: message.id,
          text: message.text,
          chatId: message.chatId,
          senderName: message.senderName,
          isOutgoing: message.isOutgoing,
        },
        chatTitle,
        chatType,
        correlationId,
      });
    } else {
      // Synchronous fallback if worker is unavailable
      this.fallbackProcessIncomingMessage(message, chatTitle, chatType, onAutoReply);
    }
  }

  private fallbackProcessIncomingMessage(
    message: Message,
    chatTitle: string,
    chatType: 'private' | 'group' | 'channel',
    onAutoReply?: (replyText: string) => void
  ) {
    const text = message.text || '';
    this.statusMetrics.totalMessagesProcessed++;
    this.statusMetrics.lastProcessedTimestamp = Date.now();

    // 1. Link radar fallback
    if (this.isLiveLinkDiscoverActive && text) {
      const TG_LINK_REGEX =
        /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/(?:\+([a-zA-Z0-9_-]+)|joinchat\/([a-zA-Z0-9_-]+)|([a-zA-Z0-9_]{4,}))|tg:\/\/join\?invite=([a-zA-Z0-9_-]+)/gi;
      const matches = text.matchAll(TG_LINK_REGEX);
      for (const match of matches) {
        const rawUrl = match[0];
        const fullUrl =
          rawUrl.startsWith('http') || rawUrl.startsWith('tg://') ? rawUrl : 'https://' + rawUrl;

        const discItem: LiveDiscoveredLink = {
          id: 'disc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          url: fullUrl,
          sourceChatTitle: chatTitle || 'محادثة تلغرام',
          sourceChatId: message.chatId || 'chat_unknown',
          senderName: message.senderName || 'مستخدم',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: this.isInstantAutoJoinEnabled ? 'joining' : 'pending',
          autoJoined: this.isInstantAutoJoinEnabled,
        };

        this.discoveredLinks.unshift(discItem);
        telegramDb.discoveredLinks.put(discItem).catch(() => {});
        this.statusMetrics.totalLinksDiscovered++;

        if (this.isInstantAutoJoinEnabled) {
          this.manualJoinDiscoveredLink(discItem.id);
        }
      }
    }

    // 2. Auto responder fallback
    if (this.isAutoResponderGlobal && !message.isOutgoing && text && onAutoReply) {
      const cleanText = text.trim().toLowerCase();
      const isGroupChat = chatType === 'group' || chatType === 'channel';

      for (const rule of this.autoReplyRules) {
        if (!rule.isEnabled) continue;
        if (rule.scope === 'private' && isGroupChat) continue;
        if (rule.scope === 'groups' && !isGroupChat) continue;

        let isMatch = false;
        const cleanKeyword = (rule.keyword || '').trim().toLowerCase();

        if (rule.matchType === 'exact') {
          isMatch = cleanText === cleanKeyword;
        } else if (rule.matchType === 'contains') {
          isMatch = cleanText.includes(cleanKeyword);
        } else if (rule.matchType === 'regex') {
          try {
            const re = new RegExp(rule.keyword, 'i');
            isMatch = re.test(text);
          } catch (e) {
            isMatch = false;
          }
        }

        if (isMatch) {
          rule.timesTriggered = (rule.timesTriggered || 0) + 1;
          rule.lastTriggeredAt = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          this.statusMetrics.totalAutoRepliesTriggered++;
          setTimeout(() => {
            onAutoReply(rule.replyText);
          }, 600);
          break;
        }
      }
    }

    this.notifyStateChange();
  }

  // ==========================================
  // AUTO RESPONDER CONTROLLER METHODS
  // ==========================================
  public getAutoReplyRules(): AutoReplyRule[] {
    return this.autoReplyRules;
  }

  public setAutoReplyRules(rules: AutoReplyRule[]) {
    this.autoReplyRules = rules;
    this.syncStateToWorker();
    this.notifyStateChange();
  }

  public addAutoReplyRule(rule: Omit<AutoReplyRule, 'id' | 'timesTriggered'>) {
    const newRule: AutoReplyRule = {
      ...rule,
      id: `rule_${Date.now()}`,
      timesTriggered: 0,
    };
    this.autoReplyRules.unshift(newRule);
    this.syncStateToWorker();
    this.notifyStateChange();
  }

  public toggleRule(ruleId: string) {
    const rule = this.autoReplyRules.find((r) => r.id === ruleId);
    if (rule) {
      rule.isEnabled = !rule.isEnabled;
      this.syncStateToWorker();
      this.notifyStateChange();
    }
  }

  public deleteRule(ruleId: string) {
    this.autoReplyRules = this.autoReplyRules.filter((r) => r.id !== ruleId);
    this.syncStateToWorker();
    this.notifyStateChange();
  }

  public toggleGlobalAutoResponder(enabled: boolean) {
    this.isAutoResponderGlobal = enabled;
    this.syncStateToWorker();
    this.notifyStateChange();
  }

  public isAutoResponderActive(): boolean {
    return this.isAutoResponderGlobal;
  }

  // ==========================================
  // LIVE LINK DISCOVER CONTROLLER METHODS
  // ==========================================
  public getDiscoveredLinks(): LiveDiscoveredLink[] {
    return this.discoveredLinks;
  }

  public toggleLiveDiscover(enabled: boolean) {
    this.isLiveLinkDiscoverActive = enabled;
    this.syncStateToWorker();
    this.notifyStateChange();
  }

  public isLiveDiscoverActive(): boolean {
    return this.isLiveLinkDiscoverActive;
  }

  public toggleInstantAutoJoin(enabled: boolean) {
    this.isInstantAutoJoinEnabled = enabled;
    this.syncStateToWorker();
    this.notifyStateChange();
  }

  public isInstantJoinEnabled(): boolean {
    return this.isInstantAutoJoinEnabled;
  }

  public clearDiscoveredLinks() {
    this.discoveredLinks = [];
    telegramDb.discoveredLinks.clear().catch(() => {});
    this.notifyStateChange();
  }

  public async manualJoinDiscoveredLink(linkId: string): Promise<boolean> {
    const item = this.discoveredLinks.find((l) => l.id === linkId);
    if (!item) return false;

    item.status = 'joining';
    this.notifyStateChange();

    try {
      if (item.url.includes('+') || item.url.includes('joinchat')) {
        const hash = item.url.split('+')[1] || item.url.split('joinchat/')[1] || '';
        await connectionsManager.sendRequest({
          _: 'TL_messages_importChatInvite',
          hash: hash.split('?')[0].split('/')[0],
        });
        item.status = 'joined';
        item.autoJoined = false;
        await telegramDb.discoveredLinks
          .update(linkId, { status: 'joined', autoJoined: false })
          .catch(() => {});
        this.notifyStateChange();
        return true;
      } else {
        const username = item.url.replace('https://t.me/', '').replace('http://t.me/', '').split('/')[0];
        await connectionsManager.sendRequest({
          _: 'TL_channels_joinChannel',
          channel: { _: 'inputChannel', channel_id: username, access_hash: '0' },
        });
        item.status = 'joined';
        item.autoJoined = false;
        await telegramDb.discoveredLinks
          .update(linkId, { status: 'joined', autoJoined: false })
          .catch(() => {});
        this.notifyStateChange();
        return true;
      }
    } catch (e: any) {
      item.status = 'failed';
      item.failReason = e?.text || 'INVITE_EXPIRED_OR_PRIVATE';
      await telegramDb.discoveredLinks
        .update(linkId, { status: 'failed', failReason: item.failReason })
        .catch(() => {});
      this.notifyStateChange();
      return false;
    }
  }

  // ==========================================
  // STATUS & PUBSUB
  // ==========================================
  public getWorkerStatus(): BackgroundWorkerStatus {
    return { ...this.statusMetrics };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStateChange() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[BackgroundSyncService] Listener callback error:', err);
      }
    });
  }
}

export const backgroundSyncService = BackgroundSyncService.getInstance();
