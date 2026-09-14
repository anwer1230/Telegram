/**
 * NotificationEngine.ts
 *
 * Implements the official Telegram Notification Engine:
 * Replicated from NotificationsController.java & NotificationCenter.java in DrKLO/Telegram.
 *
 * Provides:
 * - Direct hooks into Telegram NotificationCenter events (didReceiveNewMessages, notificationsCountUpdated)
 * - TLRPC update dispatching & routing
 * - showNotification() with sound, vibration, OS Push, and in-app banners
 * - In-app banner routing that navigates directly to the specific ChatView thread
 * - removeNotificationsForDialog() and badge management
 */

import { InAppNotification, NotificationCategory, Message } from '../types';
import { TLRPC } from '../core/TLRPC';
import { notificationsController } from '../core/NotificationsController';
import { telegramAudio } from '../utils/audioNotification';

export type NotificationEventName =
  | 'didReceiveNewMessages'
  | 'notificationsCountUpdated'
  | 'didUpdateConnectionState'
  | 'messageReceivedByAck'
  | 'dialogsNeedReload';

export interface NotificationObserver {
  (eventName: NotificationEventName, ...args: any[]): void;
}

/**
 * NotificationCenter - Replicates org.telegram.messenger.NotificationCenter
 */
export class NotificationCenter {
  private static instances = new Map<number, NotificationCenter>();
  private static globalInstance: NotificationCenter;
  private observers = new Map<NotificationEventName, Set<NotificationObserver>>();
  private accountNum: number;

  public static getInstance(accountNum: number = 0): NotificationCenter {
    if (!NotificationCenter.instances.has(accountNum)) {
      const inst = new NotificationCenter(accountNum);
      NotificationCenter.instances.set(accountNum, inst);
      if (accountNum === 0 && !NotificationCenter.globalInstance) {
        NotificationCenter.globalInstance = inst;
      }
    }
    return NotificationCenter.instances.get(accountNum)!;
  }

  public static getGlobalInstance(): NotificationCenter {
    if (!NotificationCenter.globalInstance) {
      NotificationCenter.globalInstance = NotificationCenter.getInstance(0);
    }
    return NotificationCenter.globalInstance;
  }

  public constructor(accountNum: number = 0) {
    this.accountNum = accountNum;
  }

  public addObserver(eventName: NotificationEventName, observer: NotificationObserver): void {
    if (!this.observers.has(eventName)) {
      this.observers.set(eventName, new Set());
    }
    this.observers.get(eventName)!.add(observer);
  }

  public removeObserver(eventName: NotificationEventName, observer: NotificationObserver): void {
    if (this.observers.has(eventName)) {
      this.observers.get(eventName)!.delete(observer);
    }
  }

  public postNotificationName(eventName: NotificationEventName, ...args: any[]): void {
    if (this.observers.has(eventName)) {
      this.observers.get(eventName)!.forEach((observer) => {
        try {
          observer(eventName, ...args);
        } catch (e) {
          console.error(`[NotificationCenter] Error in observer for "${eventName}":`, e);
        }
      });
    }
  }
}

export interface ShowNotificationParams {
  category?: NotificationCategory;
  title: string;
  body: string;
  chatId: string;
  chatTitle?: string;
  chatUsername?: string;
  senderId?: string;
  senderName?: string;
  senderUsername?: string;
  avatar?: string;
  isSilent?: boolean;
  replyAction?: boolean;
  messageId?: string;
  keyword?: string;
  messageText?: string;
}

/**
 * NotificationEngine - Replicates NotificationsController.java
 * Handles notification dispatching, in-app banner creation, and chat navigation routing.
 */
export class NotificationEngine {
  private static instance: NotificationEngine;
  private activeNotifications: InAppNotification[] = [];
  private listeners = new Set<(notifications: InAppNotification[]) => void>();
  private navigationHandler: ((chatId: string, replyMessage?: { messageId: string; senderName: string; textSnippet: string }) => void) | null = null;
  private isMutedCheckHandler: ((chatId: string) => boolean) | null = null;
  private soundEffectsEnabled = true;

  public static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  private constructor() {
    this.setupNotificationCenterHooks();
  }

  /**
   * Connects this engine to the NotificationCenter
   */
  private setupNotificationCenterHooks(): void {
    const center = NotificationCenter.getGlobalInstance();
    center.addObserver('didReceiveNewMessages', (eventName, dialogId, message) => {
      if (message && typeof message === 'object') {
        const msg = message as Message;
        if (!msg.isOutgoing) {
          this.showNotification({
            category: 'message',
            title: msg.senderName || 'رسالة جديدة',
            body: msg.text || (msg.media ? `[${msg.media.type}]` : 'رسالة جديدة'),
            chatId: msg.chatId,
            senderName: msg.senderName,
            avatar: msg.senderAvatar,
            messageId: msg.id,
            replyAction: true,
          });
        }
      }
    });
  }

  /**
   * Registers the main UI routing handler that triggers navigation to a specific ChatView thread.
   */
  public registerNavigationHandler(
    handler: (chatId: string, replyMessage?: { messageId: string; senderName: string; textSnippet: string }) => void
  ): () => void {
    this.navigationHandler = handler;
    return () => {
      if (this.navigationHandler === handler) {
        this.navigationHandler = null;
      }
    };
  }

  /**
   * Registers a check function to determine if a chat is muted.
   */
  public registerMuteChecker(checker: (chatId: string) => boolean): void {
    this.isMutedCheckHandler = checker;
  }

  public setSoundEffectsEnabled(enabled: boolean): void {
    this.soundEffectsEnabled = enabled;
  }

  /**
   * Subscribes to changes in the active in-app notification banner list.
   */
  public subscribe(listener: (notifications: InAppNotification[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.activeNotifications]);
    return () => this.listeners.delete(listener);
  }

  /**
   * Displays a Telegram notification (sound, in-app banner, browser Web Push, and NotificationCenter event).
   */
  public showNotification(params: ShowNotificationParams): InAppNotification {
    const isMuted = this.isMutedCheckHandler ? this.isMutedCheckHandler(params.chatId) : false;
    const shouldSilence = params.isSilent || isMuted;

    const notif: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category: params.category || 'message',
      title: params.title,
      body: params.body,
      chatId: params.chatId,
      chatTitle: params.chatTitle,
      chatUsername: params.chatUsername,
      messageId: params.messageId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderUsername: params.senderUsername,
      avatar: params.avatar,
      keyword: params.keyword,
      messageText: params.messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSilent: shouldSilence,
      replyAction: params.replyAction ?? true,
    };

    // 1. Play auditory feedback if not muted
    if (!shouldSilence && this.soundEffectsEnabled) {
      if (notif.category === 'channel_post') {
        telegramAudio?.playChannelPostSound?.();
      } else if (notif.category === 'reaction') {
        telegramAudio?.playReactionSound?.();
      } else if (notif.category === 'keyword_alert') {
        notificationsController.playNotificationSound('alert');
      } else {
        telegramAudio?.playMessageChime?.();
      }
    }

    // 2. Add to In-App notification list
    this.activeNotifications = [...this.activeNotifications, notif];
    this.notifyListeners();

    // 3. Post to central NotificationsController
    notificationsController.postNotification({
      category: notif.category,
      title: notif.title,
      body: notif.body,
      avatar: notif.avatar,
      chatId: notif.chatId,
      chatTitle: notif.chatTitle,
      chatUsername: notif.chatUsername,
      messageId: notif.messageId,
      senderId: notif.senderId,
      senderName: notif.senderName,
      senderUsername: notif.senderUsername,
      keyword: notif.keyword,
      messageText: notif.messageText,
      replyAction: notif.replyAction,
      isSilent: shouldSilence,
    });

    // 4. Trigger Web Push OS Notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const osNotif = new Notification(notif.title, {
          body: notif.body,
          icon: notif.avatar || '/favicon.ico',
          badge: '/favicon.ico',
          tag: notif.chatId || 'tg_notification',
          silent: shouldSilence,
        });

        osNotif.onclick = () => {
          window.focus();
          if (notif.chatId) {
            this.handleNotificationClick(notif.id);
          }
          osNotif.close();
        };
      } catch (e) {
        console.warn('[NotificationEngine] OS Notification error:', e);
      }
    }

    // 5. Broadcast to NotificationCenter
    NotificationCenter.getGlobalInstance().postNotificationName('notificationsCountUpdated');

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissNotification(notif.id);
    }, 5000);

    return notif;
  }

  /**
   * Handles user clicking an in-app banner:
   * - Identifies target chatId
   * - Dismisses the banner
   * - Invokes navigationHandler to activate the ChatView thread immediately
   */
  public handleNotificationClick(notificationId: string): void {
    const target = this.activeNotifications.find((n) => n.id === notificationId);
    if (!target) return;

    this.dismissNotification(notificationId);

    if (target.chatId && this.navigationHandler) {
      this.navigationHandler(target.chatId);
    }
  }

  /**
   * Handles quick reply action from in-app notification banner
   */
  public handleNotificationReply(notificationId: string): void {
    const target = this.activeNotifications.find((n) => n.id === notificationId);
    if (!target) return;

    this.dismissNotification(notificationId);

    if (target.chatId && this.navigationHandler) {
      this.navigationHandler(target.chatId, {
        messageId: target.id,
        senderName: target.senderName || target.title,
        textSnippet: target.body,
      });
    }
  }

  /**
   * Dismisses an in-app notification banner by ID
   */
  public dismissNotification(notificationId: string): void {
    const next = this.activeNotifications.filter((n) => n.id !== notificationId);
    if (next.length !== this.activeNotifications.length) {
      this.activeNotifications = next;
      this.notifyListeners();
    }
  }

  /**
   * Removes all active notifications for a specific dialog/chat ID (e.g. when chat is opened)
   */
  public removeNotificationsForDialog(chatId: string): void {
    const next = this.activeNotifications.filter((n) => n.chatId !== chatId);
    if (next.length !== this.activeNotifications.length) {
      this.activeNotifications = next;
      this.notifyListeners();
      NotificationCenter.getGlobalInstance().postNotificationName('notificationsCountUpdated');
    }
  }

  /**
   * Clears all in-app notifications
   */
  public clearAll(): void {
    this.activeNotifications = [];
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.activeNotifications]);
      } catch (e) {
        console.error('[NotificationEngine] Listener error:', e);
      }
    });
  }
}

export const notificationEngine = NotificationEngine.getInstance();
