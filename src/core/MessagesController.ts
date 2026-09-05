/**
 * MessagesController.ts - Telegram Core Message, Dialog & Moderation Engine
 * 
 * Replicated directly from DrKLO/Telegram Android:
 * org.telegram.messenger.MessagesController.java
 * org.telegram.messenger.MessagesStorage.java
 */

import { Chat, Message } from '../types';
import { TLRPC } from './TLRPC';
import { NotificationCenter } from './NotificationCenter';
import { MessagesStorage } from './MessagesStorage';
import { ConnectionsManager } from './ConnectionsManager';
import { DialogsController } from './messenger/DialogsController';
import { UserConfig } from './messenger/UserConfig';
import { KeywordMonitor } from './messenger/KeywordMonitor';
import { ChannelDifferenceService } from '../services/ChannelDifferenceService';

export interface ChatParticipantInfo {
  userId: string;
  name: string;
  username?: string;
  avatar?: string;
  role: 'creator' | 'admin' | 'member' | 'restricted' | 'banned';
  adminRights?: TLRPC.TL_chatAdminRights;
  bannedRights?: TLRPC.TL_chatBannedRights;
  canSendMessages?: boolean;
  canSendMedia?: boolean;
  canPinMessages?: boolean;
  canInviteUsers?: boolean;
  untilDate?: number;
}

export interface SlowmodeState {
  chatId: string;
  cooldownSeconds: number;
  lastSentTimestamp: number;
}

export interface GroupedMessageItem {
  type: 'message' | 'date_divider' | 'unread_divider';
  id: string;
  message?: Message;
  dateText?: string;
  isGroupStart?: boolean;
  isGroupMiddle?: boolean;
  isGroupEnd?: boolean;
  isSingle?: boolean;
}

export class MessagesController {
  private static instances = new Map<number, MessagesController>();
  private currentAccount: number = 0;

  // In-memory caching structures mimicking Android TL caches
  public dialogs: Chat[] = [];
  public users: Map<string, any> = new Map();
  public chats: Map<string, Chat> = new Map();
  public loadingDialogs: boolean = false;
  public dialogsEndReached: boolean = false;

  private participantsMap: Map<string, Map<string, ChatParticipantInfo>> = new Map();
  private slowmodeMap: Map<string, SlowmodeState> = new Map();
  private draftsMap: Map<string, { text: string; date: number }> = new Map();
  private adminOnlyPostingMap: Set<string> = new Set();
  private bannedUsersMap: Map<string, Set<string>> = new Map();

  // MTProto Updates and Sync State
  public pts: number = 0;
  public seq: number = 0;
  public lastDate: number = 0;
  public qts: number = 0;
  private gettingDifference: boolean = false;
  private channelDifferenceService?: ChannelDifferenceService;

  public static getInstance(accountNum: number = 0): MessagesController {
    if (!MessagesController.instances.has(accountNum)) {
      MessagesController.instances.set(accountNum, new MessagesController(accountNum));
    }
    return MessagesController.instances.get(accountNum)!;
  }

  private constructor(accountNum: number = 0) {
    this.currentAccount = accountNum;
    this.channelDifferenceService = ChannelDifferenceService.getInstance(accountNum);
  }

  public getChannelDifferenceService(): ChannelDifferenceService {
    if (!this.channelDifferenceService) {
      this.channelDifferenceService = ChannelDifferenceService.getInstance(this.currentAccount);
    }
    return this.channelDifferenceService;
  }

  public getDialogs(): Chat[] {
    return this.dialogs;
  }

  /**
   * Cleans up all in-memory dialogs, caches and user states (called on real auth or switch)
   */
  public cleanup(): void {
    this.dialogs = [];
    this.users.clear();
    this.chats.clear();
    this.participantsMap.clear();
    this.slowmodeMap.clear();
    this.draftsMap.clear();
    this.adminOnlyPostingMap.clear();
    this.bannedUsersMap.clear();
    this.loadingDialogs = false;
    this.dialogsEndReached = false;
  }

  /**
   * DrKLO MessagesController: Remote Forced Logout & Session Revocation
   * Replicated from DrKLO/Telegram Android MessagesController.java
   */
  public performForcedLogout(reason: string = 'AUTH_KEY_UNREGISTERED'): void {
    console.warn(
      `[MessagesController] performForcedLogout triggered (reason: ${reason}) on account ${this.currentAccount}`
    );

    // 1. Terminate network connections
    ConnectionsManager.getInstance(this.currentAccount).cleanup(false);

    // 2. Wipe memory caches
    this.cleanup();

    // 3. Clear database tables & cached files
    MessagesStorage.getInstance(this.currentAccount).cleanUp(true);

    // 4. Wipe UserConfig and clear active credentials/tokens
    UserConfig.getInstance(this.currentAccount).clearConfig(true);

    // 5. Broadcast to NotificationCenter for UI stack reset (LaunchActivity -> LoginActivity)
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.appDidLogout,
      this.currentAccount,
      reason
    );
    NotificationCenter.getGlobalInstance().postNotificationName(
      NotificationCenter.appDidLogout,
      this.currentAccount,
      reason
    );
  }

  /**
   * Loads dialogs either from persistent storage or cloud MTProto service
   */
  public loadDialogs(offset: number = 0, count: number = 100, fromCache: boolean = true): void {
    const userConfig = UserConfig.getInstance(this.currentAccount);
    if (!userConfig.isClientAuthorized()) {
      return;
    }

    if (fromCache) {
      const storage = MessagesStorage.getInstance(this.currentAccount);
      const stored = storage.getDialogs(offset, count);
      this.dialogs = stored;
      stored.forEach((c) => this.chats.set(c.id, c));
    }

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.dialogsNeedReload
    );
  }

  public getParticipants(chatId: string): ChatParticipantInfo[] {
    let map = this.participantsMap.get(chatId);
    if (!map) {
      map = new Map();
      this.participantsMap.set(chatId, map);
    }
    return Array.from(map.values());
  }

  public isAdminOnlyPosting(chatId: string): boolean {
    return this.adminOnlyPostingMap.has(chatId);
  }

  public setAdminOnlyPosting(chatId: string, enabled: boolean) {
    if (enabled) {
      this.adminOnlyPostingMap.add(chatId);
    } else {
      this.adminOnlyPostingMap.delete(chatId);
    }
  }

  public setSlowMode(chatId: string, seconds: number) {
    this.slowmodeMap.set(chatId, {
      chatId,
      cooldownSeconds: seconds,
      lastSentTimestamp: 0,
    });
  }

  public async editAdminRights(chatId: string, userId: string, rights: TLRPC.TL_chatAdminRights) {
    let map = this.participantsMap.get(chatId);
    if (!map) {
      this.getParticipants(chatId);
      map = this.participantsMap.get(chatId)!;
    }
    const existing = map.get(userId);
    if (existing) {
      map.set(userId, {
        ...existing,
        role: 'admin',
        adminRights: rights,
        bannedRights: undefined,
        canSendMessages: true,
        canSendMedia: true,
        canPinMessages: rights.pin_messages,
        canInviteUsers: rights.invite_users,
      });
    }
  }

  public async editBannedRights(chatId: string, userId: string, rights: TLRPC.TL_chatBannedRights) {
    let map = this.participantsMap.get(chatId);
    if (!map) {
      this.getParticipants(chatId);
      map = this.participantsMap.get(chatId)!;
    }

    if (!this.bannedUsersMap.has(chatId)) {
      this.bannedUsersMap.set(chatId, new Set());
    }

    if (rights.view_messages === true || rights.send_messages === false) {
      this.bannedUsersMap.get(chatId)!.add(userId);
    }

    const existing = map.get(userId);
    if (existing) {
      map.set(userId, {
        ...existing,
        role: rights.view_messages === true ? 'banned' : 'restricted',
        bannedRights: rights,
        adminRights: undefined,
        canSendMessages: !rights.send_messages,
        canSendMedia: !rights.send_media,
      });
    }
  }

  public async unbanUser(chatId: string, userId: string) {
    const bannedSet = this.bannedUsersMap.get(chatId);
    if (bannedSet) {
      bannedSet.delete(userId);
    }

    const map = this.participantsMap.get(chatId);
    if (map) {
      const existing = map.get(userId);
      if (existing) {
        map.set(userId, {
          ...existing,
          role: 'member',
          bannedRights: undefined,
          canSendMessages: true,
          canSendMedia: true,
          canPinMessages: false,
          canInviteUsers: true,
        });
      }
    }
  }

  private getMessageEpoch(msg: Message | { date?: string | number; timestamp?: string | number; epoch?: number; rawDate?: number }): number {
    if (!msg) return 0;
    if (typeof (msg as any).epoch === 'number' && (msg as any).epoch > 0) {
      const ep = (msg as any).epoch;
      return ep < 1e11 ? ep * 1000 : ep;
    }
    if (typeof (msg as any).rawDate === 'number' && (msg as any).rawDate > 0) {
      const rd = (msg as any).rawDate;
      return rd < 1e11 ? rd * 1000 : rd;
    }
    if (typeof (msg as any).timestamp === 'number') {
      const n = (msg as any).timestamp;
      return n < 1e11 ? n * 1000 : n;
    }
    if (msg.date) {
      if (typeof msg.date === 'number') {
        const d = msg.date as number;
        return d < 1e11 ? d * 1000 : d;
      }
      if (typeof msg.date === 'string') {
        const trimmed = msg.date.trim();
        if (/^\d+$/.test(trimmed)) {
          const num = Number(trimmed);
          if (!isNaN(num) && num > 0) {
            return num < 1e11 ? num * 1000 : num;
          }
        }
        const parsedFull = Date.parse(`${trimmed} ${msg.timestamp || '00:00'}`);
        if (!isNaN(parsedFull)) return parsedFull;
        const parsedDateOnly = Date.parse(trimmed);
        if (!isNaN(parsedDateOnly)) return parsedDateOnly;
      }
    }
    if (msg.timestamp && typeof msg.timestamp === 'string') {
      const trimmedTs = msg.timestamp.trim();
      if (/^\d+$/.test(trimmedTs)) {
        const num = Number(trimmedTs);
        if (!isNaN(num) && num > 0) {
          return num < 1e11 ? num * 1000 : num;
        }
      }
      const parsedDirect = Date.parse(trimmedTs);
      if (!isNaN(parsedDirect)) return parsedDirect;
      // Handle "10:30 AM" or "22:15" format relative to today
      const timeMatch = trimmedTs.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|ص|م))?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const modifier = (timeMatch[3] || '').toUpperCase();
        if ((modifier === 'PM' || modifier === 'م') && hours < 12) hours += 12;
        if ((modifier === 'AM' || modifier === 'ص') && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d.getTime();
      }
    }
    return 0;
  }

  public canSendMessages(
    chat: Chat,
    currentUserId: string = 'user_me'
  ): {
    canSend: boolean;
    reason?: string;
    errorCode?: 'CHAT_WRITE_FORBIDDEN' | 'USER_BANNED_IN_CHANNEL' | 'SLOWMODE_WAIT_X' | 'CAPTCHA_REQUIRED' | 'ADMIN_ONLY';
    waitSeconds?: number;
  } {
    if (!chat) {
      return { canSend: false, reason: 'Chat is null', errorCode: 'CHAT_WRITE_FORBIDDEN' };
    }

    if (chat.requiresCaptcha && !chat.isCaptchaSolved) {
      return {
        canSend: false,
        reason: 'يرجى حل اختبار التحقق (Captcha) قبل الكتابة',
        errorCode: 'CAPTCHA_REQUIRED',
      };
    }

    // Check if user is owner / admin
    const chatRoles = this.participantsMap.get(chat.id);
    const userRole = chatRoles?.get(currentUserId);
    const isAdminOrCreator = Boolean(chat.creator || chat.isCreator || chat.isAdmin || (userRole && (userRole.role === 'creator' || userRole.role === 'admin')));

    if (isAdminOrCreator) {
      return { canSend: true };
    }

    // If chat is a broadcast channel (and not a supergroup/group)
    const isBroadcastChannel = chat.type === 'channel' && !chat.megagroup && !chat.isGroup;
    if (isBroadcastChannel || chat.isReadOnly) {
      return {
        canSend: false,
        reason: 'القنوات مخصصة لبث الرسائل بواسطة المشرفين فقط',
        errorCode: 'CHAT_WRITE_FORBIDDEN',
      };
    }

    // Check banned / restricted rights
    if (chat.banned_rights?.send_messages || chat.banned_rights?.send_plain || chat.hasBannedRights) {
      return {
        canSend: false,
        reason: 'المشرفون قيدوا قدرتك على إرسال الرسائل في هذه المجموعة',
        errorCode: 'USER_BANNED_IN_CHANNEL',
      };
    }

    if (chat.default_banned_rights?.send_messages || chat.default_banned_rights?.send_plain) {
      return {
        canSend: false,
        reason: 'إرسال الرسائل مقيد لجميع الأعضاء في هذه المجموعة',
        errorCode: 'USER_BANNED_IN_CHANNEL',
      };
    }

    const bannedSet = this.bannedUsersMap.get(chat.id);
    if (bannedSet && bannedSet.has(currentUserId)) {
      return {
        canSend: false,
        reason: 'تم حظرك من إرسال الرسائل في هذه المجموعة',
        errorCode: 'USER_BANNED_IN_CHANNEL',
      };
    }

    if (this.adminOnlyPostingMap.has(chat.id) || chat.adminOnly) {
      return {
        canSend: false,
        reason: 'تم تفعيل وضع المشرفين فقط بواسطة الإدارة',
        errorCode: 'ADMIN_ONLY',
      };
    }

    const slowmode = this.slowmodeMap.get(chat.id);
    const cooldown = chat.slowModeSeconds || slowmode?.cooldownSeconds || 0;
    if (cooldown > 0 && slowmode?.lastSentTimestamp) {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - slowmode.lastSentTimestamp) / 1000);
      const remaining = cooldown - elapsedSeconds;

      if (remaining > 0) {
        return {
          canSend: false,
          reason: `الوضع البطيء مفعّل. يرجى الانتظار ${remaining} ثانية`,
          errorCode: 'SLOWMODE_WAIT_X',
          waitSeconds: remaining,
        };
      }
    }

    return { canSend: true };
  }

  public recordMessageSent(chatId: string, cooldownSeconds: number = 0) {
    if (cooldownSeconds > 0) {
      this.slowmodeMap.set(chatId, {
        chatId,
        cooldownSeconds,
        lastSentTimestamp: Date.now(),
      });
    }
  }

  public sortDialogs(
    chats: Chat[],
    activeFolder: string = 'all',
    searchQuery: string = ''
  ): Chat[] {
    let list = [...chats];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.username?.toLowerCase().includes(q) ||
          c.lastMessage?.text?.toLowerCase().includes(q)
      );
    }

    if (activeFolder && activeFolder !== 'all') {
      list = list.filter((c) => {
        switch (activeFolder) {
          case 'unread':
            return c.unreadCount > 0;
          case 'personal':
          case 'direct':
            return c.type === 'private' || c.type === 'saved';
          case 'groups':
            return c.type === 'group';
          case 'channels':
            return c.type === 'channel';
          case 'bots':
            return c.type === 'bot';
          case 'archived':
            return !!c.isArchived;
          default:
            return true;
        }
      });
    } else {
      if (!searchQuery.trim()) {
        list = list.filter((c) => !c.isArchived);
      }
    }

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        return (a.pinnedIndex ?? 0) - (b.pinnedIndex ?? 0);
      }

      const draftA = this.draftsMap.get(a.id)?.date || 0;
      const draftB = this.draftsMap.get(b.id)?.date || 0;

      const timeA = Math.max(this.getMessageEpoch(a.lastMessage as any), draftA);
      const timeB = Math.max(this.getMessageEpoch(b.lastMessage as any), draftB);

      return timeB - timeA;
    });
  }

  public sortAndGroupMessages(
    messages: Message[],
    readInboxMaxId?: string
  ): GroupedMessageItem[] {
    if (!messages || messages.length === 0) return [];

    const sorted = [...messages].sort((a, b) => {
      const epochA = this.getMessageEpoch(a);
      const epochB = this.getMessageEpoch(b);
      if (epochA !== epochB) return epochA - epochB;
      return (a.id || '').localeCompare(b.id || '');
    });

    const result: GroupedMessageItem[] = [];
    let lastDateStr = '';
    let hasInsertedUnread = false;

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      const prevMsg = i > 0 ? sorted[i - 1] : null;
      const nextMsg = i < sorted.length - 1 ? sorted[i + 1] : null;

      const msgEpoch = this.getMessageEpoch(msg);
      const dateStr = this.formatDateDivider(new Date(msgEpoch > 0 ? msgEpoch : Date.now()));
      if (dateStr !== lastDateStr) {
        result.push({
          type: 'date_divider',
          id: `divider_date_${dateStr}_${msg.id}`,
          dateText: dateStr,
        });
        lastDateStr = dateStr;
      }

      if (
        readInboxMaxId &&
        !hasInsertedUnread &&
        !msg.isOutgoing &&
        msg.id > readInboxMaxId
      ) {
        result.push({
          type: 'unread_divider',
          id: `divider_unread_${msg.id}`,
          dateText: 'رسائل غير مقروءة',
        });
        hasInsertedUnread = true;
      }

      const epochMsg = this.getMessageEpoch(msg);
      const epochPrev = prevMsg ? this.getMessageEpoch(prevMsg) : 0;
      const epochNext = nextMsg ? this.getMessageEpoch(nextMsg) : 0;

      const samePrev =
        prevMsg &&
        prevMsg.senderId === msg.senderId &&
        prevMsg.isOutgoing === msg.isOutgoing &&
        Math.abs(epochMsg - epochPrev) < 300000 &&
        (prevMsg.date || dateStr) === dateStr;

      const sameNext =
        nextMsg &&
        nextMsg.senderId === msg.senderId &&
        nextMsg.isOutgoing === msg.isOutgoing &&
        Math.abs(epochNext - epochMsg) < 300000 &&
        (nextMsg.date || dateStr) === dateStr;

      let isGroupStart = false;
      let isGroupMiddle = false;
      let isGroupEnd = false;
      let isSingle = false;

      if (!samePrev && !sameNext) {
        isSingle = true;
      } else if (!samePrev && sameNext) {
        isGroupStart = true;
      } else if (samePrev && sameNext) {
        isGroupMiddle = true;
      } else if (samePrev && !sameNext) {
        isGroupEnd = true;
      }

      result.push({
        type: 'message',
        id: msg.id,
        message: msg,
        isGroupStart,
        isGroupMiddle,
        isGroupEnd,
        isSingle,
      });
    }

    return result;
  }

  private formatDateDivider(date: Date): string {
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return 'اليوم';
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'أمس';
    }

    return date.toLocaleDateString('ar-EG', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  public setChatDraft(chatId: string, draftText: string) {
    if (!draftText.trim()) {
      this.draftsMap.delete(chatId);
    } else {
      this.draftsMap.set(chatId, { text: draftText, date: Date.now() });
    }
    MessagesStorage.getInstance().saveDraft(chatId, draftText);
  }

  public getChatDraft(chatId: string): string | undefined {
    return this.draftsMap.get(chatId)?.text;
  }

  /**
   * DrKLO MessagesController.markDialogAsRead
   * Marks dialog unread count as 0, updates max read message, triggers NotificationCenter events
   */
  public markDialogAsRead(
    dialogId: string | number,
    maxId: string | number,
    account: number = 0
  ): void {
    const id = String(dialogId);
    const storage = MessagesStorage.getInstance(account);
    storage.markMessagesAsRead(id, maxId);

    // Sync in-memory DialogsController state
    DialogsController.getInstance(account).markDialogAsRead(id, typeof maxId === 'number' ? maxId : parseInt(maxId, 10) || 0);

    // Dispatch reload and UI update notifications
    const center = NotificationCenter.getInstance(account);
    center.postNotificationName(NotificationCenter.messagesRead, id, maxId);
    center.postNotificationName(NotificationCenter.dialogsNeedReload);
    center.postNotificationName(NotificationCenter.updateInterfaces, NotificationCenter.UPDATE_MASK_READ_DIALOG_MESSAGE);
  }

  /**
   * DrKLO MessagesController pin / unpin dialog
   */
  public setDialogPinned(dialogId: string | number, isPinned: boolean, account: number = 0): void {
    const id = String(dialogId);
    const storage = MessagesStorage.getInstance(account);
    storage.setDialogFlags(id, isPinned ? 1 : 0);

    // Sync in-memory DialogsController state
    DialogsController.getInstance(account).setDialogPinned(id, isPinned);

    const center = NotificationCenter.getInstance(account);
    center.postNotificationName(NotificationCenter.dialogsNeedReload);
    center.postNotificationName(NotificationCenter.updateInterfaces, NotificationCenter.UPDATE_MASK_SELECT_DIALOG);
  }

  /**
   * DrKLO MessagesController mute / unmute dialog
   */
  public muteDialog(dialogId: string | number, isMuted: boolean, account: number = 0): void {
    const id = String(dialogId);
    const storage = MessagesStorage.getInstance(account);
    storage.setDialogFlags(id, isMuted ? 2 : 0);

    const center = NotificationCenter.getInstance(account);
    center.postNotificationName(NotificationCenter.dialogsNeedReload);
    center.postNotificationName(NotificationCenter.updateInterfaces, 2);
  }

  /**
   * DrKLO MessagesController deleteDialog
   */
  public deleteDialog(dialogId: string | number, messagesOnly: boolean = false, account: number = 0): void {
    const id = String(dialogId);
    const storage = MessagesStorage.getInstance(account);
    storage.deleteDialog(id, messagesOnly ? 1 : 0);

    const center = NotificationCenter.getInstance(account);
    center.postNotificationName(NotificationCenter.dialogsNeedReload);
    center.postNotificationName(NotificationCenter.updateInterfaces, 1);
  }

  /**
   * Performs partial cache invalidation and triggers a fresh getDifference call
   * specifically when a user session is successfully established or switched.
   */
  public async onUserSessionEstablished(forceFreshSync: boolean = true): Promise<void> {
    const userConfig = UserConfig.getInstance(this.currentAccount);
    if (!userConfig.isClientAuthorized()) {
      console.warn(`[MessagesController] onUserSessionEstablished called for unauthorized account: ${this.currentAccount}`);
      return;
    }

    console.log(`[MessagesController] User session established for account ${this.currentAccount}. Performing partial cache invalidation and fresh getDifference...`);

    // 1. Partial Cache Invalidation (clear stale state, gap wait timers, and transient buffers)
    this.gettingDifference = false;
    this.loadingDialogs = false;
    this.dialogsEndReached = false;
    this.pts = 0;
    this.seq = 0;
    this.lastDate = 0;
    this.dialogs = [];
    this.chats.clear();
    this.participantsMap.clear();
    this.draftsMap.clear();

    // 2. Clear storage cached diff params for a clean baseline
    const storage = MessagesStorage.getInstance(this.currentAccount);
    storage.saveDiffParams(0, 0, 0, 0);

    // 3. Immediately trigger fresh getDifference and dialogs load
    if (forceFreshSync) {
      await this.getDifference();
      this.loadDialogs(0, 100, false);
    }

    // 4. Force sub-second UI notifications so messages and dialogs render instantly
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.dialogsNeedReload
    );
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.updateInterfaces,
      0
    );
  }

  /**
   * Forces partial cache invalidation and a fresh getDifference
   */
  public async forceResetAndGetDifference(): Promise<void> {
    return this.onUserSessionEstablished(true);
  }

  /**
   * Resynchronizes missed updates via MTProto updates.getDifference
   */
  public async getDifference(): Promise<void> {
    if (this.gettingDifference) return;
    this.gettingDifference = true;

    try {
      const userConfig = UserConfig.getInstance(this.currentAccount);
      const user = userConfig.getCurrentUser();
      const phone = user?.phone || '';
      const sessionString = typeof window !== 'undefined' ? localStorage.getItem(`tg_session_string_${this.currentAccount}`) || localStorage.getItem('tg_session_string') || '' : '';

      const storage = MessagesStorage.getInstance(this.currentAccount);

      // 1. Request real cloud differential sync slice from backend MTProto proxy
      const resp = await fetch('/api/telegram/updates/difference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIndex: this.currentAccount,
          phone,
          sessionString,
          pts: this.pts,
          date: this.lastDate,
          qts: this.qts,
        }),
      });

      const data = await resp.json();

      if (data && data.success) {
        if (data.newMessages && Array.isArray(data.newMessages) && data.newMessages.length > 0) {
          const messagesByChat: { [chatId: string]: Message[] } = {};
          data.newMessages.forEach((msg: any) => {
            if (msg && msg.id && msg.chatId) {
              if (!messagesByChat[msg.chatId]) messagesByChat[msg.chatId] = [];
              messagesByChat[msg.chatId].push(msg);
            }
          });

          Object.keys(messagesByChat).forEach((chatId) => {
            storage.putMessages(messagesByChat[chatId], chatId);
            NotificationCenter.getInstance(this.currentAccount).postNotificationName(
              NotificationCenter.didReceiveNewMessages,
              chatId,
              messagesByChat[chatId]
            );
          });
        }

        if (data.otherUpdates && Array.isArray(data.otherUpdates)) {
          this.processUpdates(data.otherUpdates, true);
        }

        if (data.state) {
          this.pts = data.state.pts || this.pts;
          this.seq = data.state.seq || this.seq;
          this.lastDate = data.state.date || this.lastDate;
          this.qts = data.state.qts || this.qts;
        }

        storage.saveDiffParams(this.pts, this.seq, this.lastDate, this.qts);

        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.dialogsNeedReload
        );
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.updateInterfaces,
          0
        );

        // Resynchronize all supergroups and broadcast channels in background
        this.getChannelDifferenceService().syncAllChannels();

        // Chain fetch remaining slices if available
        if (data.isSlice) {
          this.gettingDifference = false;
          return this.getDifference();
        }
      }
    } catch (e) {
      console.error('[MessagesController] getDifference failed:', e);
    } finally {
      this.gettingDifference = false;
    }
  }

  /**
   * Resynchronizes missed channel/supergroup updates via ChannelDifferenceService
   * Specifically handles updates.getChannelDifference, slice chaining, and long offline periods.
   */
  public async getChannelDifference(channelId: string, pts?: number, force: boolean = true): Promise<any> {
    return this.getChannelDifferenceService().getChannelDifference(channelId, force, 'controller_request');
  }

  /**
   * Checks channel difference if gap is suspected or when supergroup is active
   */
  public async checkChannelDifference(channelId: string, force: boolean = false): Promise<any> {
    return this.getChannelDifferenceService().getChannelDifference(channelId, force, 'check_channel');
  }

  /**
   * Primary MTProto Updates Processor (gap-checking & instant sub-second UI dispatch)
   */
  public processUpdates(updates: any, isDifference: boolean = false): void {
    if (!updates) return;

    if (updates._ === 'TL_updates' || updates.updates) {
      const updatesList = updates.updates || [];
      if (updates.seq) {
        this.seq = updates.seq;
        this.lastDate = updates.date || Math.floor(Date.now() / 1000);
      }

      for (const upd of updatesList) {
        if (upd.pts && upd.pts_count) {
          // If PTS was uninitialized (e.g. fresh login), initialize directly without dropping
          if (this.pts === 0) {
            this.pts = upd.pts;
          } else if (!isDifference && this.pts + upd.pts_count !== upd.pts) {
            // Sequence gap detected -> trigger fresh getDifference immediately
            this.getDifference();
            return;
          } else {
            this.pts = upd.pts;
          }
        }
        this.processSingleUpdate(upd);
      }
    } else if (Array.isArray(updates)) {
      for (const upd of updates) {
        this.processSingleUpdate(upd);
      }
    } else {
      this.processSingleUpdate(updates);
    }
  }

  public processSingleUpdate(update: any): void {
    if (!update) return;

    // 1. Channel Gap / Channel Too Long Updates
    if (
      update._ === 'TL_updateChannelTooLong' ||
      update._ === 'updateChannelTooLong' ||
      update.type === 'channel_too_long'
    ) {
      const channelId = update.channel_id || update.channelId || update.chatId;
      if (channelId) {
        console.warn(`[MessagesController] Received UpdateChannelTooLong for ${channelId}. Triggering ChannelDifferenceService...`);
        this.getChannelDifferenceService().getChannelDifference(String(channelId), true, 'updateChannelTooLong');
      }
      return;
    }

    // 2. New Channel/Supergroup Message with PTS gap detection
    if (
      update._ === 'TL_updateNewChannelMessage' ||
      update._ === 'updateNewChannelMessage' ||
      (update.type === 'new_message' && (String(update.message?.chatId || '').startsWith('chat_-100') || update.channelId))
    ) {
      const msg = update.message || update;
      const channelId = update.channelId || update.channel_id || msg.chatId || msg.peer_id;
      if (channelId && update.pts) {
        this.getChannelDifferenceService().checkChannelPtsGap(String(channelId), update.pts, update.pts_count || 1);
      }
      const storage = MessagesStorage.getInstance(this.currentAccount);
      if (msg.id && channelId) {
        storage.saveMessage(msg);
      }
      KeywordMonitor.getInstance(this.currentAccount).inspectMessage(msg);
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.didReceiveNewMessages,
        channelId,
        [msg]
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.dialogsNeedReload
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.updateInterfaces,
        0
      );
      return;
    }

    if (update._ === 'TL_updateNewMessage' || update.type === 'new_message') {
      const msg = update.message || update;
      const storage = MessagesStorage.getInstance(this.currentAccount);
      if (msg.id && (msg.chatId || msg.peer_id)) {
        storage.saveMessage(msg);
      }

      KeywordMonitor.getInstance(this.currentAccount).inspectMessage(msg);

      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.didReceiveNewMessages,
        msg.chatId || msg.peer_id,
        [msg]
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.dialogsNeedReload
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.updateInterfaces,
        0
      );
    } else if (
      update._ === 'TL_updateEditMessage' ||
      update._ === 'updateEditMessage' ||
      update._ === 'TL_updateEditChannelMessage' ||
      update._ === 'updateEditChannelMessage' ||
      update.type === 'edit_message'
    ) {
      const msg = update.message || update;
      const storage = MessagesStorage.getInstance(this.currentAccount);
      const chatId = msg.chatId || msg.peer_id || update.chatId;
      if (msg && msg.id && chatId) {
        storage.saveMessage(msg);
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.didReceiveNewMessages,
          chatId,
          [msg]
        );
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.updateInterfaces,
          0
        );
      }
    } else if (
      update._ === 'TL_updateDeleteMessages' ||
      update._ === 'updateDeleteMessages' ||
      update._ === 'TL_updateDeleteChannelMessages' ||
      update._ === 'updateDeleteChannelMessages' ||
      update.type === 'delete_messages'
    ) {
      const msgIds = update.messages || (update.messageIds ? update.messageIds : []);
      const channelId = update.channelId || update.channel_id;
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.messagesDeleted,
        msgIds,
        channelId
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.updateInterfaces,
        0
      );
    } else if (
      update._ === 'TL_updateReadHistoryInbox' ||
      update._ === 'updateReadHistoryInbox' ||
      update._ === 'TL_updateReadChannelInbox' ||
      update._ === 'updateReadChannelInbox' ||
      update.type === 'read_history_inbox'
    ) {
      const chatId = update.chatId || update.peer_id || (update.peer ? `chat_${update.peer.channelId || update.peer.chatId || update.peer.userId}` : '');
      const maxId = update.maxId || update.max_id;
      if (chatId) {
        const storage = MessagesStorage.getInstance(this.currentAccount);
        storage.markMessagesAsRead(chatId, maxId);
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.messagesRead,
          chatId,
          maxId
        );
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.updateInterfaces,
          NotificationCenter.UPDATE_MASK_READ_DIALOG_MESSAGE
        );
      }
    } else if (update._ === 'TL_updateChannel' || update.type === 'update_channel') {
      const channelId = update.channel_id || update.chatId;
      if (channelId) {
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.chatInfoDidLoad,
          channelId,
          update
        );
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.updateInterfaces,
          NotificationCenter.UPDATE_MASK_SELECT_DIALOG
        );
      }
    } else if (
      update._ === 'TL_updateNewAuthorization' ||
      update._ === 'updateNewAuthorization' ||
      update.type === 'updateNewAuthorization'
    ) {
      if (update.unregistered || update.is_current_revoked || update.hash === 'revoked' || update.hash === 'all') {
        this.performForcedLogout('REMOTE_SESSION_REVOKED');
        return;
      }
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.authorizationsUpdated
      );
    } else if (update._ === 'TL_updateNewChannelMessage') {
      const msg = update.message || update;
      const storage = MessagesStorage.getInstance(this.currentAccount);
      if (msg.id && (msg.chatId || msg.peer_id)) {
        storage.saveMessage(msg);
      }

      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.didReceiveNewMessages,
        msg.chatId || msg.peer_id,
        [msg]
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.dialogsNeedReload
      );
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.updateInterfaces,
        NotificationCenter.UPDATE_MASK_READ_DIALOG_MESSAGE
      );
    }
  }

  // ==========================================================
  // 1. Two-Step Verification & Password Settings
  // TLRPC.TL_account_getPassword / TLRPC.TL_account_updatePasswordSettings
  // ==========================================================
  public async loadPasswordSettings(): Promise<TLRPC.TL_account_password | null> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_getPassword();
      req._ = 'account.getPassword';
      const res = await conn.sendRequest<TLRPC.TL_account_password>(req);
      if (res) {
        UserConfig.getInstance(this.currentAccount).set2FA(
          !!res.has_password,
          res.hint || '',
          res.login_email_pattern || ''
        );
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.twoStepStateUpdated,
          res
        );
      }
      return res;
    } catch (e) {
      console.warn('[MessagesController] loadPasswordSettings failed:', e);
      return null;
    }
  }

  public async updatePasswordSettings(
    newSettings: TLRPC.TL_account_passwordInputSettings,
    currentPasswordHash?: any
  ): Promise<boolean> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_updatePasswordSettings();
      req._ = 'account.updatePasswordSettings';
      req.password = currentPasswordHash ? { hash: currentPasswordHash } : undefined;
      req.new_settings = newSettings;

      const res = await conn.sendRequest<any>(req);
      const ok = !!(res && (res._ === 'boolTrue' || res === true));
      if (ok) {
        await this.loadPasswordSettings();
      }
      return ok;
    } catch (e) {
      console.warn('[MessagesController] updatePasswordSettings failed:', e);
      return false;
    }
  }

  // ==========================================================
  // 2. Privacy & Security Settings
  // TLRPC.TL_account_getPrivacy / TLRPC.TL_account_setPrivacy
  // ==========================================================
  public async loadPrivacySettings(key: TLRPC.PrivacyKey): Promise<TLRPC.PrivacyRule[]> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_getPrivacy();
      req._ = 'account.getPrivacy';
      req.key = key;

      const res = await conn.sendRequest<TLRPC.TL_account_privacyRules>(req);
      const rules = res?.rules || [];
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.privacyRulesUpdated,
        key,
        rules
      );
      return rules;
    } catch (e) {
      console.warn('[MessagesController] loadPrivacySettings failed:', e);
      return [];
    }
  }

  public async setPrivacy(key: TLRPC.PrivacyKey, rules: TLRPC.PrivacyRule[]): Promise<boolean> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_setPrivacy();
      req._ = 'account.setPrivacy';
      req.key = key;
      req.rules = rules;

      const res = await conn.sendRequest<TLRPC.TL_account_privacyRules>(req);
      const ok = !!(res && res._ === 'account.privacyRules');
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.privacyRulesUpdated,
        key,
        res?.rules || rules
      );
      return ok;
    } catch (e) {
      console.warn('[MessagesController] setPrivacy failed:', e);
      return false;
    }
  }

  // ==========================================================
  // 3. Active Sessions & Authorizations
  // TLRPC.TL_account_getAuthorizations / TLRPC.TL_account_resetAuthorization
  // ==========================================================
  public async loadAuthorizations(force: boolean = false): Promise<TLRPC.TL_authorization[]> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_getAuthorizations();
      req._ = 'account.getAuthorizations';

      const res = await conn.sendRequest<TLRPC.TL_account_authorizations>(req);
      const list = res?.authorizations || [];
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.authorizationsUpdated,
        list
      );
      return list;
    } catch (e) {
      console.warn('[MessagesController] loadAuthorizations failed:', e);
      return [];
    }
  }

  public async resetAuthorization(hash: number | string): Promise<boolean> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_resetAuthorization();
      req._ = 'account.resetAuthorization';
      req.hash = hash;

      const res = await conn.sendRequest<any>(req);
      const ok = !!(res && (res._ === 'boolTrue' || res === true));
      if (ok) {
        await this.loadAuthorizations(true);
      }
      return ok;
    } catch (e) {
      console.warn('[MessagesController] resetAuthorization failed:', e);
      return false;
    }
  }

  public async resetOtherAuthorizations(): Promise<boolean> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_auth_resetAuthorizations();
      req._ = 'auth.resetAuthorizations';

      const res = await conn.sendRequest<any>(req);
      const ok = !!(res && (res._ === 'boolTrue' || res === true));
      if (ok) {
        await this.loadAuthorizations(true);
      }
      return ok;
    } catch (e) {
      console.warn('[MessagesController] resetOtherAuthorizations failed:', e);
      return false;
    }
  }

  // ==========================================================
  // 4. Stories Synchronization
  // TLRPC.TL_stories_getAllStories / TLRPC.TL_stories_sendStory
  // ==========================================================
  public async loadAllStories(force: boolean = false): Promise<any> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_stories_getAllStories();
      req._ = 'stories.getAllStories';

      const res = await conn.sendRequest<any>(req);
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.storiesUpdated,
        res
      );
      return res;
    } catch (e) {
      console.warn('[MessagesController] loadAllStories failed:', e);
      return null;
    }
  }

  public async sendStory(
    peer: TLRPC.InputPeer,
    media: any,
    caption: string,
    period: number = 86400,
    privacyRules: TLRPC.PrivacyRule[] = []
  ): Promise<any> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_stories_sendStory();
      req._ = 'stories.sendStory';
      req.peer = peer;
      req.media = media;
      req.caption = caption;
      req.period = period;
      req.privacy_rules = privacyRules;

      const res = await conn.sendRequest<any>(req);
      await this.loadAllStories(true);
      return res;
    } catch (e) {
      console.warn('[MessagesController] sendStory failed:', e);
      return null;
    }
  }

  // ==========================================================
  // 5. Message History & Search
  // TLRPC.TL_messages_getHistory / TLRPC.TL_messages_search / TLRPC.TL_messages_getDocument
  // ==========================================================
  public async loadHistory(
    dialogId: string | number,
    offsetId: number = 0,
    limit: number = 50,
    maxId: number = 0
  ): Promise<Message[]> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = {
        _: 'messages.getHistory',
        peer: { _: 'inputPeerChat', chat_id: Number(dialogId) },
        offset_id: offsetId,
        limit,
        max_id: maxId,
      };

      const res = await conn.sendRequest<any>(req);
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.messagesDidLoad,
        String(dialogId)
      );
      return res?.messages || [];
    } catch (e) {
      console.warn('[MessagesController] loadHistory failed:', e);
      return [];
    }
  }

  public async searchMessages(
    dialogId: string | number,
    query: string,
    filter: any = null,
    offsetId: number = 0,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_messages_search();
      req._ = 'messages.search';
      req.peer = { _: 'inputPeerChat', chat_id: Number(dialogId) } as any;
      req.q = query;
      req.filter = filter || { _: 'inputMessagesFilterEmpty' };
      req.offset_id = offsetId;
      req.limit = limit;

      const res = await conn.sendRequest<any>(req);
      return res?.messages || [];
    } catch (e) {
      console.warn('[MessagesController] searchMessages failed:', e);
      return [];
    }
  }

  public async getDocument(id: any): Promise<any> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_messages_getDocument();
      req._ = 'messages.getDocument';
      req.id = id;

      return await conn.sendRequest<any>(req);
    } catch (e) {
      console.warn('[MessagesController] getDocument failed:', e);
      return null;
    }
  }

  // ==========================================================
  // 6. Forum Topics (TLRPC.TL_channels_getForumTopics)
  // ==========================================================
  public async loadTopics(channelId: string | number, force: boolean = false): Promise<any> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_channels_getForumTopics();
      req._ = 'channels.getForumTopics';
      req.channel = { _: 'inputChannel', channel_id: Number(channelId), access_hash: '0' };

      const res = await conn.sendRequest<any>(req);
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.topicsDidLoaded,
        String(channelId),
        res?.topics || []
      );
      return res?.topics || [];
    } catch (e) {
      console.warn('[MessagesController] loadTopics failed:', e);
      return [];
    }
  }

  // ==========================================================
  // 7. Profile Update (TLRPC.TL_account_updateProfile)
  // ==========================================================
  public async updateProfile(firstName?: string, lastName?: string, about?: string): Promise<boolean> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_updateProfile();
      req._ = 'account.updateProfile';
      req.first_name = firstName;
      req.last_name = lastName;
      req.about = about;

      const res = await conn.sendRequest<any>(req);
      if (res && res._ === 'user') {
        const u = UserConfig.getInstance(this.currentAccount);
        if (u.currentUser) {
          u.currentUser.first_name = firstName || u.currentUser.first_name;
          u.currentUser.last_name = lastName || u.currentUser.last_name;
          u.saveConfig();
        }
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.mainUserInfoChanged
        );
      }
      return true;
    } catch (e) {
      console.warn('[MessagesController] updateProfile failed:', e);
      return false;
    }
  }

  // ==========================================================
  // 8. Notifications Settings (TLRPC.TL_account_updateNotifySettings)
  // ==========================================================
  public async updateNotificationSettings(peer: any, settings: any): Promise<boolean> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_account_updateNotifySettings();
      req._ = 'account.updateNotifySettings';
      req.peer = peer;
      req.settings = settings;

      await conn.sendRequest<any>(req);
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.notificationsCountUpdated
      );
      return true;
    } catch (e) {
      console.warn('[MessagesController] updateNotificationSettings failed:', e);
      return false;
    }
  }

  // ==========================================================
  // 9. Sponsored Messages / Ads (TLRPC.TL_channels_getSponsoredMessages)
  // ==========================================================
  public async loadSponsoredMessages(peerId: string | number): Promise<any> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = new TLRPC.TL_channels_getSponsoredMessages();
      req._ = 'channels.getSponsoredMessages';
      req.channel = { _: 'inputChannel', channel_id: Number(peerId), access_hash: '0' };

      const res = await conn.sendRequest<any>(req);
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.sponsoredMessagesLoaded,
        peerId,
        res
      );
      return res;
    } catch (e) {
      console.warn('[MessagesController] loadSponsoredMessages failed:', e);
      return null;
    }
  }

  public toggleSponsoredMessages(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tg_ads_enabled_${this.currentAccount}`, JSON.stringify(enabled));
    }
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.updateInterfaces,
      NotificationCenter.UPDATE_MASK_ALL
    );
  }

  public isSponsoredMessagesEnabled(): boolean {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem(`tg_ads_enabled_${this.currentAccount}`);
      return val !== null ? JSON.parse(val) : true;
    }
    return true;
  }

  // ==========================================================
  // 10. Save & Restore Settings (Cloud Sync)
  // ==========================================================
  public async saveSettingsToCloud(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        const bundle = {
          account: this.currentAccount,
          userConfig: UserConfig.getInstance(this.currentAccount),
          timestamp: Date.now(),
        };
        localStorage.setItem(`tg_cloud_settings_backup_${this.currentAccount}`, JSON.stringify(bundle));
      }
      NotificationCenter.getInstance(this.currentAccount).postNotificationName(
        NotificationCenter.cloudSettingsUpdated
      );
      return true;
    } catch (e) {
      console.warn('[MessagesController] saveSettingsToCloud failed:', e);
      return false;
    }
  }

  public async restoreSettingsFromCloud(): Promise<any> {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(`tg_cloud_settings_backup_${this.currentAccount}`);
        if (raw) {
          const bundle = JSON.parse(raw);
          NotificationCenter.getInstance(this.currentAccount).postNotificationName(
            NotificationCenter.cloudSettingsUpdated,
            bundle
          );
          return bundle;
        }
      }
      return null;
    } catch (e) {
      console.warn('[MessagesController] restoreSettingsFromCloud failed:', e);
      return null;
    }
  }

  /**
   * Checks for application update via MTProto / Backend (TLRPC.TL_help_getAppUpdate)
   * Replicated from DrKLO/Telegram Android: org.telegram.messenger.MessagesController.checkAppUpdate
   */
  public async checkAppUpdate(isManual: boolean = false, context?: any): Promise<void> {
    const { appUpdateController } = await import('./messenger/AppUpdateController');
    await appUpdateController.checkAppUpdate(isManual);
  }

  /**
   * Puts users into in-memory/cache storage (DrKLO MessagesController.putUsers)
   */
  public putUsers(users: any[], fromCache: boolean = false): void {
    if (!users || !Array.isArray(users)) return;
    const storage = MessagesStorage.getInstance(this.currentAccount);
    for (const u of users) {
      if (u && u.id) {
        this.users.set(String(u.id), u);
      }
    }
    if (!fromCache) {
      storage.putUsersAndChats(users, [], false, true);
    }
  }

  /**
   * Puts chats/channels into in-memory/cache storage (DrKLO MessagesController.putChats)
   */
  public putChats(chats: any[], fromCache: boolean = false): void {
    if (!chats || !Array.isArray(chats)) return;
    const storage = MessagesStorage.getInstance(this.currentAccount);
    for (const c of chats) {
      if (c && c.id) {
        this.chats.set(String(c.id), c);
      }
    }
    if (!fromCache) {
      storage.putUsersAndChats([], chats, false, true);
    }
  }

  /**
   * Loads full chat / channel information (DrKLO MessagesController.loadFullChat)
   */
  public loadFullChat(chatId: string | number, classGuidOrForce: number | boolean = 0, force: boolean = false): void {
    const cid = String(chatId).replace(/^-100/, '').replace(/^-/, '');
    const req = new TLRPC.TL_channels_getFullChannel();
    req.channel = cid;
    const conn = ConnectionsManager.getInstance(this.currentAccount);
    conn.sendRequest(req, {
      onSuccess: (response: any) => {
        if (response && response.full_chat) {
          NotificationCenter.getInstance(this.currentAccount).postNotificationName(
            NotificationCenter.chatInfoDidLoad,
            chatId,
            response.full_chat
          );
        }
      },
      onError: (err: any) => {
        console.warn('[MessagesController] loadFullChat failed:', err);
      },
    }).catch(() => {});
  }

  public get pendingAppUpdate(): TLRPC.TL_help_appUpdate | null {
    try {
      const { appUpdateController } = require('./messenger/AppUpdateController');
      return appUpdateController.pendingAppUpdate;
    } catch {
      return null;
    }
  }
}

export const messagesController = MessagesController.getInstance();
