/**
 * NotificationCenter.ts - Telegram Central Event Bus
 * 
 * Replicated directly from DrKLO/Telegram Android:
 * org.telegram.messenger.NotificationCenter.java
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface NotificationCenterDelegate {
  didReceivedNotification(id: number | string, account: number, ...args: any[]): void;
}

export function normalizeChatIdentifier(id: any): string {
  if (id === null || id === undefined) return '';
  let str = String(id).trim().toLowerCase();
  str = str.replace(/^@/, '');
  str = str.replace(/^(?:custom_|chat_|user_|channel_)+/i, '');
  if (str.startsWith('-100')) {
    str = str.slice(4);
  } else if (str.startsWith('-')) {
    str = str.slice(1);
  }
  return str;
}

export type SalamGreetingAction = 'edit' | 'delete' | 'pending';

export interface SalamObserverOptions {
  chatId: string | number;
  initialGreetingMsgId?: number | string;
  delaySeconds?: number; // Defaults to 30 seconds
  requiredInteractions?: number; // Defaults to 3
  onInteraction?: (count: number, message: any, isGroupActive: boolean) => void;
  onProgress?: (count: number, active: boolean, remainingSeconds: number) => void;
  onDecision?: (action: 'edit' | 'delete', interactionCount: number, messages: any[]) => void;
  account?: number;
}

export interface SalamDecisionResult {
  action: 'edit' | 'delete';
  shouldEdit: boolean;
  shouldDelete: boolean;
  interactionCount: number;
  messages: any[];
  chatId: string | number;
  greetingMsgId?: number | string;
  isGroupActive: boolean;
  delayDurationSeconds: number;
  cancelled?: boolean;
  reason?: string;
}

export interface SalamTrackOptions {
  chatId: string | number;
  initialGreetingMsgId?: number | string;
  durationSeconds?: number;
  requiredMessages?: number;
  onProgress?: (count: number, active: boolean, remainingSeconds: number) => void;
  onActivityDetected?: (count: number, newMsg: any) => void;
  onMessageReceived?: (msg: any) => void;
}

export interface SalamTrackResult {
  active: boolean;
  messageCount: number;
  messages: any[];
  chatId: string | number;
  initialGreetingMsgId?: number | string;
  action?: 'edit' | 'delete';
  shouldEdit?: boolean;
  shouldDelete?: boolean;
  cancelled?: boolean;
  reason?: string;
}

export interface SalamSessionController {
  cancel: (reason?: string) => void;
  getMessageCount: () => number;
  getTrackedMessages: () => any[];
  isGroupActive: () => boolean;
  getRemainingSeconds: () => number;
  shouldEdit: () => boolean;
  shouldDelete: () => boolean;
  getDecision: () => SalamGreetingAction;
  observer?: SalamModeObserver;
  promise: Promise<SalamTrackResult>;
}

/**
 * SalamModeObserver
 * An observer mechanism that listens for incoming message events during the 30-second 'Salam Mode' delay,
 * storing the count of interactions to decide whether to edit or delete the greeting.
 */
export class SalamModeObserver implements NotificationCenterDelegate {
  public readonly chatId: string | number;
  public readonly greetingMsgId?: number | string;
  public readonly delaySeconds: number;
  public readonly requiredInteractions: number;

  private _interactionCount: number = 0;
  private _receivedMessages: any[] = [];
  private _seenMessageIds = new Set<string | number>();
  private _decision: SalamGreetingAction = 'pending';
  private _remainingSeconds: number;
  private _timer: any = null;
  private _center: NotificationCenter;
  private _normalizedChatId: string;
  private _isDestroyed: boolean = false;
  private _isCancelled: boolean = false;
  private _cancelReason?: string;

  private _options: SalamObserverOptions;
  public readonly promise: Promise<SalamDecisionResult>;
  private _resolvePromise!: (res: SalamDecisionResult) => void;
  private _rejectPromise!: (err: any) => void;

  constructor(options: SalamObserverOptions, center?: NotificationCenter) {
    this._options = options;
    this.chatId = options.chatId;
    this.greetingMsgId = options.initialGreetingMsgId;
    this.delaySeconds = Math.max(1, options.delaySeconds ?? 30);
    this.requiredInteractions = Math.max(1, options.requiredInteractions ?? 3);
    this._remainingSeconds = this.delaySeconds;
    this._normalizedChatId = normalizeChatIdentifier(options.chatId);
    this._center = center || NotificationCenter.getInstance(options.account || 0);

    this.promise = new Promise<SalamDecisionResult>((resolve, reject) => {
      this._resolvePromise = resolve;
      this._rejectPromise = reject;
    });
  }

  public start(): this {
    if (this._isDestroyed || this._timer) return this;

    // Attach observer directly to NotificationCenter for incoming message events
    this._center.addObserver(this, NotificationCenter.didReceiveNewMessages);
    this._center.addObserver(this, 'didReceiveNewMessages');

    // Announce start of Salam waiting interval
    this._center.postNotificationName(
      NotificationCenter.smartSenderWaitingIntervalStarted,
      this.chatId,
      {
        durationSeconds: this.delaySeconds,
        requiredMessages: this.requiredInteractions,
        initialGreetingMsgId: this.greetingMsgId,
      }
    );

    // 1-second countdown interval
    this._timer = setInterval(() => {
      this._remainingSeconds -= 1;
      const isActive = this._interactionCount >= this.requiredInteractions;
      this._options.onProgress?.(this._interactionCount, isActive, Math.max(0, this._remainingSeconds));

      if (this._remainingSeconds <= 0) {
        this.finish();
      }
    }, 1000);

    return this;
  }

  /**
   * NotificationCenterDelegate implementation: receives incoming new message events.
   */
  public didReceivedNotification(id: number | string, account: number, ...args: any[]): void {
    if (this._isDestroyed || this._isCancelled || this._decision !== 'pending') return;

    // Extract candidate message objects from event args
    const candidateMsgs: any[] = [];
    for (const arg of args) {
      if (!arg) continue;
      if (Array.isArray(arg)) {
        for (const item of arg) {
          if (item && typeof item === 'object') candidateMsgs.push(item);
        }
      } else if (typeof arg === 'object') {
        candidateMsgs.push(arg);
      }
    }

    for (const msg of candidateMsgs) {
      // Ignore outgoing messages sent by self
      const isOut = Boolean(msg.out || msg.isOutgoing || msg.flags?.out);
      if (isOut) continue;

      // Verify destination matches target chatId
      const msgChat =
        msg.chatId ??
        msg.peer_id ??
        msg.dialogId ??
        msg.chat_id ??
        msg.to_id?.channel_id ??
        msg.to_id?.chat_id ??
        args[0];

      const normMsgChat = normalizeChatIdentifier(msgChat);
      const isMatch =
        normMsgChat === this._normalizedChatId ||
        String(msgChat) === String(this.chatId) ||
        (msg.username && normalizeChatIdentifier(msg.username) === this._normalizedChatId);

      if (!isMatch) continue;

      // Verify message was sent after greeting message
      if (this.greetingMsgId !== undefined && this.greetingMsgId !== null && this.greetingMsgId !== 0) {
        const mId = Number(msg.id);
        const gId = Number(this.greetingMsgId);
        if (!isNaN(mId) && !isNaN(gId) && mId <= gId) {
          continue;
        }
      }

      // Avoid counting duplicate delivery updates for the same message ID
      const uniqueId = msg.id ?? `${msg.date}_${msg.message?.slice?.(0, 10) || ''}`;
      if (this._seenMessageIds.has(uniqueId)) continue;
      this._seenMessageIds.add(uniqueId);

      // Store interaction and increment counter
      this._interactionCount += 1;
      this._receivedMessages.push(msg);

      const isActive = this._interactionCount >= this.requiredInteractions;

      this._options.onInteraction?.(this._interactionCount, msg, isActive);

      // Post interaction recorded event
      this._center.postNotificationName(
        NotificationCenter.salamModeInteractionRecorded,
        this.chatId,
        this._interactionCount,
        msg,
        isActive
      );
      this._center.postNotificationName(
        NotificationCenter.smartSenderWaitingIntervalProgress,
        this.chatId,
        this._interactionCount,
        isActive,
        this._remainingSeconds,
        msg
      );
    }
  }

  public getInteractionCount(): number {
    return this._interactionCount;
  }

  public getInteractions(): number {
    return this._interactionCount;
  }

  public getMessages(): any[] {
    return [...this._receivedMessages];
  }

  public getDecision(): SalamGreetingAction {
    return this._decision;
  }

  public shouldEdit(): boolean {
    return this._interactionCount >= this.requiredInteractions;
  }

  public shouldDelete(): boolean {
    return !this.shouldEdit();
  }

  public isGroupActive(): boolean {
    return this.shouldEdit();
  }

  public getRemainingSeconds(): number {
    return Math.max(0, this._remainingSeconds);
  }

  public waitForDecision(): Promise<SalamDecisionResult> {
    return this.promise;
  }

  public cancel(reason: string = 'cancelled'): void {
    if (this._isDestroyed) return;
    this._isCancelled = true;
    this._cancelReason = reason;
    this.finish();
  }

  private finish(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    // Detach observers from center
    this._center.removeObserver(this, NotificationCenter.didReceiveNewMessages);
    this._center.removeObserver(this, 'didReceiveNewMessages');

    const shouldEdit = this._interactionCount >= this.requiredInteractions;
    const finalAction: 'edit' | 'delete' = shouldEdit ? 'edit' : 'delete';
    this._decision = finalAction;

    const result: SalamDecisionResult = {
      action: finalAction,
      shouldEdit,
      shouldDelete: !shouldEdit,
      interactionCount: this._interactionCount,
      messages: [...this._receivedMessages],
      chatId: this.chatId,
      greetingMsgId: this.greetingMsgId,
      isGroupActive: shouldEdit,
      delayDurationSeconds: this.delaySeconds,
      cancelled: this._isCancelled,
      reason: this._cancelReason,
    };

    // Post notification center events
    this._center.postNotificationName(
      NotificationCenter.salamModeDecisionMade,
      this.chatId,
      finalAction,
      this._interactionCount,
      result
    );
    this._center.postNotificationName(
      NotificationCenter.smartSenderWaitingIntervalEnded,
      this.chatId,
      shouldEdit,
      this._interactionCount,
      result.messages
    );

    this._options.onDecision?.(finalAction, this._interactionCount, result.messages);
    this._resolvePromise(result);
  }

  public destroy(): void {
    if (this._isDestroyed) return;
    this.cancel('destroyed');
    this._isDestroyed = true;
  }
}

export class NotificationCenter {
  // DrKLO/Telegram Android Event Constants
  public static readonly didReceiveNewMessages = 1;
  public static readonly updateInterfaces = 2;
  public static readonly dialogsNeedReload = 3;
  public static readonly closeChats = 4;
  public static readonly messagesDidLoad = 5;
  public static readonly didReceivedWebsitesList = 6;
  public static readonly didReplacedPhotoInMemCache = 7;
  public static readonly notificationsCountUpdated = 8;
  public static readonly didUpdateConnectionState = 9;
  public static readonly userFullInfoDidLoad = 10;
  public static readonly pinnedInfoDidLoad = 11;
  public static readonly messagePlayingProgressDidChanged = 12;
  public static readonly messagePlayingDidReset = 13;
  public static readonly messagePlayingPlayStateChanged = 14;
  public static readonly recordProgressChanged = 15;
  public static readonly recordStartError = 16;
  public static readonly recordStopped = 17;
  public static readonly chatDidCreated = 18;
  public static readonly chatDidFailCreate = 19;
  public static readonly chatInfoDidLoad = 20;
  public static readonly contactsDidLoad = 21;
  public static readonly userSelectedEmoji = 22;
  public static readonly userSelectedSticker = 23;
  public static readonly themeDidLoad = 24;
  public static readonly needSetDayNightTheme = 25;
  public static readonly didReceivedDraft = 26;
  public static readonly messageReceivedByAck = 27;
  public static readonly messagesDeleted = 28;
  public static readonly messagesRead = 29;
  public static readonly didClearDatabase = 30;
  public static readonly checkClientRole = 31;
  public static readonly storiesUpdated = 32;
  public static readonly topicsDidLoaded = 33;
  public static readonly privacyRulesUpdated = 34;
  public static readonly mainUserInfoChanged = 35;
  public static readonly twoStepStateUpdated = 36;
  public static readonly authorizationsUpdated = 37;
  public static readonly sponsoredMessagesLoaded = 38;
  public static readonly cloudSettingsUpdated = 39;
  public static readonly downloadSettingsUpdated = 40;
  public static readonly appUpdateAvailable = 41;
  public static readonly appUpdateNotModified = 42;
  public static readonly appUpdateProgress = 43;
  public static readonly appUpdateInstallReady = 44;
  public static readonly appDidLogout = 45;
  // Smart Sender / Salam Mode Events
  public static readonly smartSenderWaitingIntervalStarted = 46;
  public static readonly smartSenderWaitingIntervalProgress = 47;
  public static readonly smartSenderWaitingIntervalEnded = 48;
  public static readonly salamModeInteractionRecorded = 49;
  public static readonly salamModeDecisionMade = 50;
  public static readonly salamActivityReceived = 51;
  public static readonly UPDATE_MASK_READ_DIALOG_MESSAGE = 0x0001;
  public static readonly UPDATE_MASK_SELECT_DIALOG = 0x0002;
  public static readonly UPDATE_MASK_SEND_STATE = 0x0004;
  public static readonly UPDATE_MASK_ALL = 0xffff;

  private static instances = new Map<number, NotificationCenter>();
  private static globalInstance: NotificationCenter;

  private observers = new Map<number | string, Set<NotificationCenterDelegate | ((...args: any[]) => void)>>();
  private salamObservers = new Map<string, SalamModeObserver>();
  private currentAccount: number;

  public static getInstance(account: number = 0): NotificationCenter {
    if (!NotificationCenter.instances.has(account)) {
      const inst = new NotificationCenter(account);
      NotificationCenter.instances.set(account, inst);
      if (account === 0 && !NotificationCenter.globalInstance) {
        NotificationCenter.globalInstance = inst;
      }
    }
    return NotificationCenter.instances.get(account)!;
  }

  public static getGlobalInstance(): NotificationCenter {
    if (!NotificationCenter.globalInstance) {
      NotificationCenter.globalInstance = NotificationCenter.getInstance(0);
    }
    return NotificationCenter.globalInstance;
  }

  private constructor(account: number = 0) {
    this.currentAccount = account;
  }

  public addObserver(
    observerOrId: NotificationCenterDelegate | ((...args: any[]) => void) | number | string,
    idOrObserver: number | string | NotificationCenterDelegate | ((...args: any[]) => void)
  ): void {
    let id: number | string;
    let observer: NotificationCenterDelegate | ((...args: any[]) => void);

    if (typeof observerOrId === 'number' || (typeof observerOrId === 'string' && typeof idOrObserver === 'function')) {
      id = observerOrId;
      observer = idOrObserver as NotificationCenterDelegate | ((...args: any[]) => void);
    } else {
      observer = observerOrId as NotificationCenterDelegate | ((...args: any[]) => void);
      id = idOrObserver as number | string;
    }

    if (!this.observers.has(id)) {
      this.observers.set(id, new Set());
    }
    this.observers.get(id)!.add(observer);
  }

  public removeObserver(
    observerOrId: NotificationCenterDelegate | ((...args: any[]) => void) | number | string,
    idOrObserver: number | string | NotificationCenterDelegate | ((...args: any[]) => void)
  ): void {
    let id: number | string;
    let observer: NotificationCenterDelegate | ((...args: any[]) => void);

    if (typeof observerOrId === 'number' || (typeof observerOrId === 'string' && typeof idOrObserver === 'function')) {
      id = observerOrId;
      observer = idOrObserver as NotificationCenterDelegate | ((...args: any[]) => void);
    } else {
      observer = observerOrId as NotificationCenterDelegate | ((...args: any[]) => void);
      id = idOrObserver as number | string;
    }

    const list = this.observers.get(id);
    if (list) {
      list.delete(observer);
      if (list.size === 0) {
        this.observers.delete(id);
      }
    }
  }

  public postNotificationName(id: number | string, ...args: any[]): void {
    const list = this.observers.get(id);
    if (list) {
      list.forEach((obs) => {
        try {
          if (typeof obs === 'function') {
            obs(...args);
          } else if (typeof obs.didReceivedNotification === 'function') {
            obs.didReceivedNotification(id, this.currentAccount, ...args);
          }
        } catch (e) {
          console.error('[NotificationCenter] Error in observer callback:', e);
        }
      });
    }

    // Also dispatch a browser CustomEvent for reactive DOM integration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tg-notification-center', {
          detail: { id, account: this.currentAccount, args },
        })
      );
    }
  }

  public hasObservers(id: number | string): boolean {
    return (this.observers.get(id)?.size || 0) > 0;
  }

  /**
   * Creates a new SalamModeObserver for tracking incoming interactions during the Salam Mode delay.
   */
  public createSalamObserver(options: SalamObserverOptions): SalamModeObserver {
    const observer = new SalamModeObserver(options, this);
    const key = normalizeChatIdentifier(options.chatId);
    this.salamObservers.set(key, observer);
    return observer;
  }

  /**
   * Creates and starts a SalamModeObserver that listens for incoming message events during the 30-second delay,
   * storing the count of interactions to decide whether to edit or delete the greeting.
   */
  public observeSalamMode(options: SalamObserverOptions): SalamModeObserver {
    const observer = this.createSalamObserver(options);
    return observer.start();
  }

  public getSalamObserver(chatId: string | number): SalamModeObserver | undefined {
    return this.salamObservers.get(normalizeChatIdentifier(chatId));
  }

  public getActiveSalamObservers(): SalamModeObserver[] {
    return Array.from(this.salamObservers.values());
  }

  public static observeSalamMode(options: SalamObserverOptions, account: number = 0): SalamModeObserver {
    return NotificationCenter.getInstance(account).observeSalamMode(options);
  }

  /**
   * Tracks incoming messages for a specific group during the 'Salam' waiting interval.
   * Enables the smart sender to verify if the group is active before deciding to edit or delete the message.
   */
  public trackSalamWaitingInterval(options: SalamTrackOptions): SalamSessionController {
    const {
      chatId,
      initialGreetingMsgId,
      durationSeconds = 30,
      requiredMessages = 3,
      onProgress,
      onActivityDetected,
      onMessageReceived,
    } = options;

    const observer = this.createSalamObserver({
      chatId,
      initialGreetingMsgId,
      delaySeconds: durationSeconds,
      requiredInteractions: requiredMessages,
      onInteraction: (count, msg, active) => {
        onMessageReceived?.(msg);
        onActivityDetected?.(count, msg);
        onProgress?.(count, active, observer.getRemainingSeconds());
      },
      onProgress: (count, active, remSec) => {
        onProgress?.(count, active, remSec);
      },
      account: this.currentAccount,
    });

    observer.start();

    const promise = observer.waitForDecision().then((dec) => ({
      active: dec.isGroupActive,
      messageCount: dec.interactionCount,
      messages: dec.messages,
      chatId: dec.chatId,
      initialGreetingMsgId: dec.greetingMsgId,
      action: dec.action,
      shouldEdit: dec.shouldEdit,
      shouldDelete: dec.shouldDelete,
      cancelled: dec.cancelled,
      reason: dec.reason,
    }));

    const controller: SalamSessionController = {
      cancel: (reason = 'cancelled') => observer.cancel(reason),
      getMessageCount: () => observer.getInteractionCount(),
      getTrackedMessages: () => observer.getMessages(),
      isGroupActive: () => observer.isGroupActive(),
      getRemainingSeconds: () => observer.getRemainingSeconds(),
      shouldEdit: () => observer.shouldEdit(),
      shouldDelete: () => observer.shouldDelete(),
      getDecision: () => observer.getDecision(),
      observer,
      promise,
    };

    return controller;
  }

  public static trackSalamWaitingInterval(options: SalamTrackOptions, account: number = 0): SalamSessionController {
    return NotificationCenter.getInstance(account).trackSalamWaitingInterval(options);
  }
}

export const notificationCenter = NotificationCenter.getInstance(0);

/**
 * Direct event listener hook to track incoming messages for a specific group during the Salam window.
 * Returns an unregister function.
 */
export function addSalamMessageListener(
  chatId: string | number,
  callback: (msg: any, currentCount: number, isGroupActive: boolean) => void,
  options?: { initialGreetingMsgId?: number | string; requiredMessages?: number; account?: number }
): () => void {
  const center = NotificationCenter.getInstance(options?.account || 0);
  const normalizedTarget = normalizeChatIdentifier(chatId);
  const requiredMessages = options?.requiredMessages || 3;
  const initialGreetingMsgId = options?.initialGreetingMsgId;
  let count = 0;
  const seenIds = new Set<string | number>();

  const observer = (...args: any[]) => {
    const candidateMsgs: any[] = [];
    for (const arg of args) {
      if (!arg) continue;
      if (Array.isArray(arg)) {
        for (const item of arg) {
          if (item && typeof item === 'object') candidateMsgs.push(item);
        }
      } else if (typeof arg === 'object') {
        candidateMsgs.push(arg);
      }
    }

    for (const msg of candidateMsgs) {
      const isOut = Boolean(msg.out || msg.isOutgoing || msg.flags?.out);
      if (isOut) continue;

      const msgChat =
        msg.chatId ??
        msg.peer_id ??
        msg.dialogId ??
        msg.chat_id ??
        msg.to_id?.channel_id ??
        msg.to_id?.chat_id ??
        args[0];

      if (normalizeChatIdentifier(msgChat) !== normalizedTarget && String(msgChat) !== String(chatId)) {
        continue;
      }

      if (initialGreetingMsgId !== undefined && initialGreetingMsgId !== null) {
        const mId = Number(msg.id);
        const gId = Number(initialGreetingMsgId);
        if (!isNaN(mId) && !isNaN(gId) && mId <= gId) continue;
      }

      const uniqueId = msg.id ?? `${msg.date}_${msg.message?.slice?.(0, 10) || ''}`;
      if (seenIds.has(uniqueId)) continue;
      seenIds.add(uniqueId);

      count++;
      callback(msg, count, count >= requiredMessages);
    }
  };

  center.addObserver(NotificationCenter.didReceiveNewMessages, observer);
  center.addObserver('didReceiveNewMessages', observer);

  return () => {
    center.removeObserver(NotificationCenter.didReceiveNewMessages, observer);
    center.removeObserver('didReceiveNewMessages', observer);
  };
}

export interface UseSalamMessageTrackerResult {
  isTracking: boolean;
  messageCount: number;
  requiredMessages: number;
  isGroupActive: boolean;
  remainingSeconds: number;
  messages: any[];
  decision: SalamGreetingAction;
  shouldEdit: boolean;
  shouldDelete: boolean;
  startTracking: (trackOptions?: Partial<SalamTrackOptions>) => Promise<SalamTrackResult>;
  stopTracking: () => void;
  reset: () => void;
}

/**
 * React Hook to track new messages within the 'Salam' waiting interval.
 * Allows the smart sender to verify if the group is active before deciding to edit or delete the message.
 */
export function useSalamMessageTracker(
  defaultChatId?: string | number,
  defaultOptions?: Partial<SalamTrackOptions>
): UseSalamMessageTrackerResult {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [requiredMessages, setRequiredMessages] = useState<number>(defaultOptions?.requiredMessages || 3);
  const [isGroupActive, setIsGroupActive] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(defaultOptions?.durationSeconds || 30);
  const [messages, setMessages] = useState<any[]>([]);
  const [decision, setDecision] = useState<SalamGreetingAction>('pending');

  const controllerRef = useRef<SalamSessionController | null>(null);

  const stopTracking = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.cancel('stopped_by_user');
      controllerRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const reset = useCallback(() => {
    stopTracking();
    setMessageCount(0);
    setIsGroupActive(false);
    setRemainingSeconds(defaultOptions?.durationSeconds || 30);
    setMessages([]);
    setDecision('pending');
  }, [stopTracking, defaultOptions?.durationSeconds]);

  const startTracking = useCallback(
    (options?: Partial<SalamTrackOptions>): Promise<SalamTrackResult> => {
      stopTracking();

      const effectiveChatId = options?.chatId ?? defaultChatId;
      if (!effectiveChatId) {
        return Promise.reject(new Error('chatId is required to start tracking'));
      }

      const effectiveReq = options?.requiredMessages ?? defaultOptions?.requiredMessages ?? 3;
      const effectiveDuration = options?.durationSeconds ?? defaultOptions?.durationSeconds ?? 30;

      setIsTracking(true);
      setMessageCount(0);
      setRequiredMessages(effectiveReq);
      setIsGroupActive(false);
      setRemainingSeconds(effectiveDuration);
      setMessages([]);
      setDecision('pending');

      const center = NotificationCenter.getGlobalInstance();
      const ctrl = center.trackSalamWaitingInterval({
        chatId: effectiveChatId,
        initialGreetingMsgId: options?.initialGreetingMsgId ?? defaultOptions?.initialGreetingMsgId,
        durationSeconds: effectiveDuration,
        requiredMessages: effectiveReq,
        onProgress: (count, active, remSec) => {
          setMessageCount(count);
          setIsGroupActive(active);
          setRemainingSeconds(remSec);
          options?.onProgress?.(count, active, remSec);
        },
        onActivityDetected: (count, newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
          options?.onActivityDetected?.(count, newMsg);
        },
      });

      controllerRef.current = ctrl;

      return ctrl.promise.then(
        (res) => {
          setIsTracking(false);
          setMessageCount(res.messageCount);
          setIsGroupActive(res.active);
          setRemainingSeconds(0);
          setMessages(res.messages);
          const finalAction = res.shouldEdit ? 'edit' : 'delete';
          setDecision(finalAction);
          return res;
        },
        (err) => {
          setIsTracking(false);
          throw err;
        }
      );
    },
    [defaultChatId, defaultOptions, stopTracking]
  );

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.cancel('unmounted');
      }
    };
  }, []);

  const shouldEdit = messageCount >= requiredMessages;
  const shouldDelete = !shouldEdit;

  return {
    isTracking,
    messageCount,
    requiredMessages,
    isGroupActive,
    remainingSeconds,
    messages,
    decision,
    shouldEdit,
    shouldDelete,
    startTracking,
    stopTracking,
    reset,
  };
}
