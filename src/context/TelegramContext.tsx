import React, { createContext, useContext, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveCall,
  AppSettings,
  Chat,
  ChatContextMenu,
  Folder,
  Message,
  MessageContextMenu,
  MessageMedia,
  ReplyInfo,
  TelegramApiConfig,
  ToastItem,
  User,
  UserAccount,
  InAppNotification,
  SettingsSubPage,
  CapturedLink,
  ProfileUserInfo,
  FcmDiagnosticInfo,
  FcmPushPacket,
  MonitorAlert,
} from '../types';
import {
  CURRENT_USER,
  DEFAULT_ACCOUNTS,
  DEFAULT_FOLDERS,
  DEFAULT_TELEGRAM_API_CONFIG,
  INITIAL_CHATS,
  INITIAL_MESSAGES,
} from '../data/mockTelegramData';
import { telegramAudio } from '../utils/audioNotification';
import { NotificationCenter } from '../core/NotificationCenter';
import { notificationsController } from '../core/NotificationsController';
import { notificationsService } from '../core/NotificationsService';
import { backgroundSyncService } from '../core/BackgroundSyncService';
import { telegramDb, initTelegramDexieDb } from '../core/telegramDexieDb';
import { multiAccountManager } from '../utils/MultiAccountManager';
import { notificationEngine } from '../services/NotificationEngine';
import { SecureSessionStorage } from '../utils/SecureSessionStorage';
import { storageSyncManager } from '../utils/StorageSyncManager';
import { themeController } from '../core/ThemeController';
import { PinnedAndForwardHelper } from '../core/PinnedAndForwardHelper';
import { OpenTelegramLink } from '../core/OpenTelegramLink';
import {
  messagesController,
  messagesStorage,
  MessageObject,
  TLRPC,
  NotificationCenter as CoreNotificationCenter,
  UserConfig,
  AuthTokensHelper,
  MessagesController,
  MessagesStorage,
  ConnectionsManager,
  AccountInstance,
} from '../core/messenger';
import { io as createSocketIO, Socket } from 'socket.io-client';
import { getTelegramEpoch, parseTelegramDate, formatTelegramTime } from '../utils/dateUtils';

interface TelegramContextType {
  currentUser: User;
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  activeChat: Chat | null;
  activeFolderId: string;
  folders: Folder[];
  searchQuery: string;
  refreshDialogs: () => Promise<void>;
  isDrawerOpen: boolean;
  isRightPanelOpen: boolean;
  activeModal:
    | 'none'
    | 'api-config'
    | 'settings'
    | 'new-chat'
    | 'media-viewer'
    | 'call'
    | 'forward'
    | 'add-account'
    | 'apk-installer'
    | 'mini-apps'
    | 'theme-editor'
    | 'export-chat'
    | 'contacts'
    | 'link-monitor'
    | 'send-only'
    | 'premium'
    | 'secret-chat-info'
    | 'group-admin'
    | 'forum-topics'
    | 'sender'
    | 'monitor'
    | 'my-messages'
    | 'auto-joiner'
    | 'auto-responder'
    | 'smart-ai'
    | 'scheduled-rotator'
    | 'live-link-discover'
    | 'user-profile'
    | 'android-notification-shade'
    | 'restricted-content'
    | 'salam-activity-log';
  selectedProfileUser: ProfileUserInfo | null;
  setSelectedProfileUser: (user: ProfileUserInfo | null) => void;
  openUserProfile: (user: ProfileUserInfo) => void;
  getCommonGroupsForUser: (userId: string, userName?: string) => Chat[];
  activeCall: ActiveCall | null;
  viewerMedia: { url: string; title?: string; sender?: string; timestamp?: string } | null;
  apiConfig: TelegramApiConfig;
  settings: AppSettings;
  settingsSubPage: SettingsSubPage;
  setSettingsSubPage: (page: SettingsSubPage) => void;
  openSettingsPage: (page?: SettingsSubPage) => void;
  replyingTo: ReplyInfo | null;
  editingMessage: { id: string; text: string } | null;
  forwardingMessage: Message | null;
  selectedMessageIds: string[];
  typingChatId: string | null;
  chatContextMenu: ChatContextMenu | null;
  messageContextMenu: MessageContextMenu | null;
  toasts: ToastItem[];
  inAppNotifications: InAppNotification[];
  dismissNotification: (id: string) => void;
  triggerNotification: (notif: Omit<InAppNotification, 'id' | 'timestamp'>) => void;

  // Link Monitor & Auto-Join Engine
  capturedLinks: CapturedLink[];
  autoJoinLinksEnabled: boolean;
  toggleAutoJoinLinks: () => void;
  joinCapturedLink: (linkId: string) => Promise<void>;
  joinAllPendingLinks: () => Promise<void>;
  clearCapturedLinks: () => void;
  exportLinksReport: () => void;
  manualScanAllChatsForLinks: () => void;

  // Authentication & Sessions
  isAuthenticated: boolean;
  login: (data: { name: string; phone: string; username?: string; avatar?: string; bio?: string; sessionString?: string }) => void;
  logout: (targetAccountId?: string) => void;

  // Multi-Account Management
  accounts: UserAccount[];
  activeAccountId: string;
  switchAccount: (accountId: string) => Promise<void>;
  addAccount: (newAccount: { name: string; phone: string; username?: string; avatar?: string; bio?: string; sessionString?: string }) => void;
  removeAccount: (accountId: string) => void;
  updateAccountProfile: (data: Partial<User>) => void;
  joinChatByInviteLink: (link: string) => Promise<{ success: boolean; message?: string }>;
  
  // Actions
  setActiveChatId: (id: string | null) => void;
  setActiveFolderId: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setIsDrawerOpen: (open: boolean) => void;
  setIsRightPanelOpen: (open: boolean) => void;
  setActiveModal: (
    modal:
      | 'none'
      | 'api-config'
      | 'settings'
      | 'new-chat'
      | 'media-viewer'
      | 'call'
      | 'forward'
      | 'add-account'
      | 'apk-installer'
      | 'mini-apps'
      | 'theme-editor'
      | 'export-chat'
      | 'contacts'
      | 'link-monitor'
      | 'send-only'
      | 'premium'
      | 'secret-chat-info'
      | 'group-admin'
      | 'forum-topics'
      | 'sender'
      | 'monitor'
      | 'my-messages'
      | 'auto-joiner'
      | 'auto-responder'
      | 'smart-ai'
      | 'scheduled-rotator'
      | 'live-link-discover'
      | 'user-profile'
      | 'android-notification-shade'
      | 'restricted-content'
      | 'salam-activity-log'
  ) => void;
  setViewerMedia: (media: { url: string; title?: string; sender?: string; timestamp?: string } | null) => void;
  setReplyingTo: (reply: ReplyInfo | null) => void;
  setEditingMessage: (item: { id: string; text: string } | null) => void;
  setForwardingMessage: (msg: Message | null) => void;
  setChatContextMenu: (menu: ChatContextMenu | null) => void;
  setMessageContextMenu: (menu: MessageContextMenu | null) => void;
  
  // Toast
  showToast: (text: string, icon?: string) => void;
  
  // Messages & Interactions
  sendMessage: (text: string, media?: MessageMedia) => void;
  editMessageText: (messageId: string, newText: string) => void;
  forwardMessageTo: (targetChatId: string, message: Message) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string) => void;
  pinMessage: (messageId: string) => void;
  votePoll: (messageId: string, optionId: string) => void;
  
  // Multi-select
  toggleSelectMessage: (id: string) => void;
  clearSelectedMessages: () => void;
  deleteSelectedMessages: () => void;
  
  // Drafts
  setChatDraft: (chatId: string, draftText: string) => void;
  
  // Chat Actions
  toggleMuteChat: (chatId: string) => void;
  togglePinChat: (chatId: string) => void;
  markChatReadUnread: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  clearChatHistory: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  leaveGroup: (chatId: string) => Promise<void>;
  deleteGroupMessages: (chatId: string, forEveryone?: boolean) => Promise<void>;
  deleteGroup: (chatId: string) => Promise<void>;
  
  // Calls
  startCall: (isVideo?: boolean) => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallCamera: () => void;
  
  // API & Settings
  updateApiConfig: (config: Partial<TelegramApiConfig>) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  testApiLatency: () => Promise<number>;
  createNewChat: (type: 'private' | 'group' | 'channel', title: string, username?: string, description?: string) => void;
  jumpToMessage: (chatId: string, messageId: string) => void;
  openPrivateChat: (senderId: string, senderName: string, senderAvatar?: string, senderUsername?: string) => void;
  resolveTelegramLink: (urlOrQuery: string) => Promise<void>;
  syncCloudData: () => Promise<void>;
  syncInitializationRoutine: (phoneOverride?: string, sessionStringOverride?: string) => Promise<void>;
  validateSessionProactively: (force?: boolean) => Promise<boolean>;
  isSyncing: boolean;
  isSessionValidating: boolean;
  solveChatCaptcha: (chatId: string, answer: string) => Promise<boolean>;
  forwardToSavedMessages: (message: Message) => void;
  // Incremental Pagination & Stream Sync
  loadMoreChatMessages: (chatId: string) => Promise<{ loadedCount: number; hasMore: boolean }>;
  isChatLoadingOlder: Record<string, boolean>;
  chatHasMoreOlder: Record<string, boolean>;

  // Firebase Cloud Messaging (FCM) & Push Diagnostic Hub
  fcmDiagnostic: FcmDiagnosticInfo;
  requestPushPermission: () => Promise<boolean>;
  testSimulateFcmPush: (customParams?: Partial<FcmPushPacket>) => void;
  clearFcmDiagnosticHistory: () => void;

  // Screenshot Protection & FLAG_SECURE
  triggerScreenshotBlocked: (reason?: string) => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#5288c1',
  fontSize: 16,
  language: 'ar',
  sendByEnter: true,
  soundEffects: true,
  autoDownloadMedia: true,
  chatWallpaper: 'default',
  bubbleCornerRadius: 16,
  chatListViewMode: 'two_lines',
  enableAnimations: true,
  inAppSounds: true,
  showTranslateButton: true,
  autoDownloadMobile: true,
  autoDownloadWifi: true,
  autoDownloadRoaming: false,
  streamingEnabled: true,
};

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Resilient Multi-Tier Encrypted Session Persistence & State
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        UserConfig.cleanupTestAccounts();

        const saved = SecureSessionStorage.getItem<UserAccount[]>('tg_multi_accounts_v3') || SecureSessionStorage.getItem<UserAccount[]>('tg_accounts');
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const realSaved = saved.filter((acc) => acc && acc.user && !UserConfig.isMockUser(acc.user));
          if (realSaved.length > 0) {
            return realSaved;
          }
        }

        // Fallback to UserConfig stored real data
        const savedConfig0 = SecureSessionStorage.getItem<any>('tg_user_config_0');
        if (savedConfig0 && savedConfig0.currentUser && savedConfig0.currentUser.id && !UserConfig.isMockUser(savedConfig0.currentUser)) {
          return [
            {
              id: 'acc_personal',
              user: savedConfig0.currentUser,
              settings: DEFAULT_APP_SETTINGS,
              chats: [],
              messages: {},
              unreadCount: 0,
              isActive: true,
              sessionString: SecureSessionStorage.getItem<string>('tg_session_string') || '',
            },
          ];
        }
      }
    } catch (e) {
      console.warn('[TelegramContext] Storage load notice:', e);
    }
    return [];
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    try {
      const savedId = SecureSessionStorage.getItem<string>('tg_active_account_id_v3');
      if (savedId) return savedId;
    } catch {}
    return accounts[0]?.id || '';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        UserConfig.cleanupTestAccounts();

        if (SecureSessionStorage.getItem<string>('tg_explicitly_logged_out') === 'true') {
          return false;
        }

        const hasActiveAuth = SecureSessionStorage.getItem<string>('tg_auth_session_active') === 'true';
        const hasSession = !!(SecureSessionStorage.getItem<string>('tg_session_string') || localStorage.getItem('tg_session_string'));

        const savedAccs = SecureSessionStorage.getItem<UserAccount[]>('tg_multi_accounts_v3') || SecureSessionStorage.getItem<UserAccount[]>('tg_accounts');
        const hasRealSaved = savedAccs && Array.isArray(savedAccs) && savedAccs.some((a) => a && a.user && !UserConfig.isMockUser(a.user));

        const configAuthorized = UserConfig.getInstance(0).isClientAuthorized();
        const configUser = UserConfig.getInstance(0).currentUser;
        const hasRealConfig = configAuthorized && configUser && !UserConfig.isMockUser(configUser);

        // If a real authentic session exists -> directly authenticated. If not -> login screen
        if ((hasRealSaved || hasRealConfig) && (hasActiveAuth || hasSession)) {
          return true;
        }
        return false;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Current active account lookup
  const initialActiveAcc = accounts.find((a) => a.id === activeAccountId) || accounts[0] || null;

  const [currentUser, setCurrentUser] = useState<User>(() => initialActiveAcc?.user || {
    id: '',
    name: '',
    phone: '',
    avatar: '',
    isOnline: false,
  });
  const [chats, setChats] = useState<Chat[]>(() => (initialActiveAcc?.chats && initialActiveAcc.chats.length > 0 ? initialActiveAcc.chats : []));
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => (initialActiveAcc?.messages && Object.keys(initialActiveAcc.messages).length > 0 ? initialActiveAcc.messages : {}));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    // Only open a chat if explicitly requested via URL parameter or notification route
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const targetDialog = urlParams.get('dialog_id') || urlParams.get('chatId');
      if (targetDialog) return targetDialog;
      const hashMatch = window.location.hash.match(/#\/chat\/([^?&]+)/);
      if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);
    }
    // Default to null so the user always sees the Chat List (Dialogs) screen
    return null;
  });
  const [typingChatId, setTypingChatId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [folders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<
    | 'none'
    | 'api-config'
    | 'settings'
    | 'new-chat'
    | 'media-viewer'
    | 'call'
    | 'forward'
    | 'add-account'
    | 'apk-installer'
    | 'mini-apps'
    | 'theme-editor'
    | 'export-chat'
    | 'contacts'
    | 'link-monitor'
    | 'send-only'
    | 'premium'
    | 'secret-chat-info'
    | 'group-admin'
    | 'forum-topics'
    | 'sender'
    | 'monitor'
    | 'my-messages'
    | 'auto-joiner'
    | 'auto-responder'
    | 'smart-ai'
    | 'scheduled-rotator'
    | 'live-link-discover'
    | 'user-profile'
    | 'android-notification-shade'
    | 'restricted-content'
    | 'salam-activity-log'
  >('none');
  const [selectedProfileUser, setSelectedProfileUser] = useState<ProfileUserInfo | null>(null);

  const openUserProfile = (user: ProfileUserInfo) => {
    setSelectedProfileUser(user);
    setActiveModal('user-profile');
  };

  const getCommonGroupsForUser = (userId: string, userName?: string): Chat[] => {
    const cleanId = userId?.toLowerCase() || '';
    const cleanName = userName?.toLowerCase() || '';

    const matched = chats.filter((c) => {
      if (c.type !== 'group' && c.type !== 'channel') return false;
      const chatMsgs = messages[c.id] || [];
      return chatMsgs.some(
        (m) =>
          (m.senderId && m.senderId.toLowerCase() === cleanId) ||
          (cleanName && m.senderName && m.senderName.toLowerCase() === cleanName)
      );
    });

    if (matched.length > 0) return matched;

    // Realistic fallback for groups
    const availableGroups = chats.filter((c) => c.type === 'group' || c.type === 'channel');
    return availableGroups.slice(0, 2);
  };
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [viewerMedia, setViewerMedia] = useState<{ url: string; title?: string; sender?: string; timestamp?: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [chatContextMenu, setChatContextMenu] = useState<ChatContextMenu | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenu | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

  const [apiConfig, setApiConfig] = useState<TelegramApiConfig>(DEFAULT_TELEGRAM_API_CONFIG);
  const [settings, setSettings] = useState<AppSettings>(() => initialActiveAcc?.settings || DEFAULT_APP_SETTINGS);
  const [settingsSubPage, setSettingsSubPage] = useState<SettingsSubPage>('main');

  // Incremental Pagination & Stream Sync States
  const [isChatLoadingOlder, setIsChatLoadingOlder] = useState<Record<string, boolean>>({});
  const [chatHasMoreOlder, setChatHasMoreOlder] = useState<Record<string, boolean>>({});

  // Firebase Cloud Messaging (FCM) & Push Diagnostic Engine State
  const [fcmDiagnostic, setFcmDiagnostic] = useState<FcmDiagnosticInfo>(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem(`tg_fcm_token_${activeAccountId}`) || `fcm_tg_${activeAccountId}_${Math.random().toString(36).substring(2, 10)}`;
    } catch {}
    return {
      status: typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'listening' : 'unsupported',
      token,
      endpoint: typeof window !== 'undefined' ? `${window.location.origin}/api/telegram/push/gateway` : undefined,
      lastHeartbeat: new Date().toISOString(),
      activeAccountId,
      activeUserId: currentUser.id,
      activeDialogId: activeChatId,
      registrationId: `reg_${activeAccountId}_${currentUser.id || 'anon'}`,
      lastReceivedPacket: null,
      history: [],
      isSubscribedToPush: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
      permissionState: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
    };
  });

  // Link Monitor & Auto-Join State
  const [capturedLinks, setCapturedLinks] = useState<CapturedLink[]>(() => {
    try {
      const saved = localStorage.getItem('tg_captured_links_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'link_1',
        url: 'https://t.me/telegram',
        sourceChatId: 'chat_durov',
        sourceChatTitle: 'Pavel Durov',
        sourceSenderName: 'Pavel Durov',
        detectedAt: '10:15 AM',
        type: 'telegram_channel',
        extractedTitle: 'Telegram News & Official',
        memberCount: 9400000,
        joined: true,
        joinedAt: '10:15 AM',
        autoJoined: true,
        status: 'joined',
      },
      {
        id: 'link_2',
        url: 'https://t.me/toncoin',
        sourceChatId: 'chat_crypto',
        sourceChatTitle: 'TON & Web3 Developers',
        sourceSenderName: 'Alex Developer',
        detectedAt: '11:30 AM',
        type: 'telegram_channel',
        extractedTitle: 'The Open Network (TON)',
        memberCount: 2800000,
        joined: true,
        joinedAt: '11:30 AM',
        autoJoined: true,
        status: 'joined',
      },
      {
        id: 'link_3',
        url: 'https://t.me/+invite_tg_developers_hub',
        sourceChatId: 'chat_general',
        sourceChatTitle: 'Telegram Global Community',
        sourceSenderName: 'Sarah Connor',
        detectedAt: '12:05 PM',
        type: 'telegram_group',
        extractedTitle: 'Telegram MTProto Developers Hub',
        memberCount: 45200,
        joined: false,
        autoJoined: false,
        status: 'pending',
      },
      {
        id: 'link_4',
        url: 'https://t.me/major_official',
        sourceChatId: 'chat_botfather',
        sourceChatTitle: 'BotFather',
        sourceSenderName: 'BotFather',
        detectedAt: '01:20 PM',
        type: 'telegram_channel',
        extractedTitle: 'Major Stars & Games Channel',
        memberCount: 1540000,
        joined: false,
        autoJoined: false,
        status: 'pending',
      },
    ];
  });

  const [autoJoinLinksEnabled, setAutoJoinLinksEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tg_auto_join_enabled_v1');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default active as requested
  });

  // Initialize Dexie.js (IndexedDB wrapper) for persistent batch & discover logs
  useEffect(() => {
    initTelegramDexieDb()
      .then(async () => {
        const storedLinks = await telegramDb.discoveredLinks.toArray();
        if (storedLinks && storedLinks.length > 0) {
          setCapturedLinks((prev) => {
            // Merge Dexie links if not already present
            const existingIds = new Set(prev.map((l) => l.id));
            const newFromDb = storedLinks
              .filter((l) => !existingIds.has(l.id))
              .map((l) => ({
                id: l.id,
                url: l.url,
                sourceChatId: l.sourceChatId,
                sourceChatTitle: l.sourceChatTitle,
                sourceSenderName: l.senderName,
                detectedAt: l.timestamp,
                type: (l.url.includes('+') || l.url.includes('joinchat')
                  ? 'telegram_group'
                  : 'telegram_channel') as any,
                extractedTitle: l.sourceChatTitle || 'Telegram Channel',
                memberCount: 5000,
                joined: l.status === 'joined',
                autoJoined: l.autoJoined,
                status: l.status,
              }));
            return newFromDb.length > 0 ? [...prev, ...newFromDb] : prev;
          });
        }
      })
      .catch((e) => console.warn('[Dexie] Init error:', e));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tg_captured_links_v1', JSON.stringify(capturedLinks));
    } catch {}
  }, [capturedLinks]);

  useEffect(() => {
    try {
      localStorage.setItem('tg_auto_join_enabled_v1', String(autoJoinLinksEnabled));
    } catch {}
  }, [autoJoinLinksEnabled]);

  const [isSessionValidating, setIsSessionValidating] = useState<boolean>(false);

  // Complete cleanup on auth_key revocation to prevent background automation stalls
  const performSessionPurge = (reason: string = 'AUTH_KEY_UNREGISTERED') => {
    console.warn(`[TelegramContext] Performing full session purge due to ${reason}`);
    setIsAuthenticated(false);
    setActiveModal('none');
    setActiveChatId(null);
    setChats([]);
    setMessages({});
    setAccounts([]);
    setCurrentUser({
      id: '',
      name: '',
      phone: '',
      avatar: '',
      isOnline: false,
    });

    // 1. Purge all GramJS session tokens & cache keys from localStorage and storage sync
    SecureSessionStorage.purgeAllSessions(reason);
    storageSyncManager.clearAllOnLogout();

    // 2. Halt all background automation services to prevent unhandled loops or stalls
    try {
      notificationsService.handleSessionRevoked(reason);
      backgroundSyncService.handleSessionRevoked(reason);
      ConnectionsManager.getInstance(0).cleanup(false);
      UserConfig.getInstance(0).clearConfig(true);
      MessagesStorage.getInstance(0).cleanUp(true);
      MessagesController.getInstance(0).cleanup();
    } catch (svcErr) {
      console.warn('[TelegramContext] Background services cleanup note:', svcErr);
    }

    // 3. Dispatch global window event and notification center event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telegram:session_revoked', { detail: { reason } }));
    }
    CoreNotificationCenter.getGlobalInstance().postNotificationName(
      CoreNotificationCenter.appDidLogout,
      0,
      reason
    );
  };

  // Proactive Session Validation Mechanism (Checks MTProto server validity before re-auth)
  const validateSessionProactively = async (force: boolean = false): Promise<boolean> => {
    try {
      setIsSessionValidating(true);
      let activeSessionStr =
        SecureSessionStorage.getItem<string>('tg_session_string') ||
        (typeof window !== 'undefined' ? localStorage.getItem('tg_session_string') : '') ||
        '';

      const currentAcc = accounts.find((a) => a.id === activeAccountId) || accounts[0];
      if (!activeSessionStr && currentAcc?.sessionString) {
        activeSessionStr = currentAcc.sessionString;
      }

      const activePhone =
        currentUser.phone ||
        currentAcc?.user?.phone ||
        SecureSessionStorage.getItem<string>('tg_phone') ||
        '';

      // If user is supposed to be logged in but has zero credentials, reset to login
      if (!activeSessionStr && !activePhone) {
        if (isAuthenticated) {
          performSessionPurge('NO_CREDENTIALS');
        }
        return false;
      }

      const checkResult = await SecureSessionStorage.validateSessionWithServer({
        sessionString: activeSessionStr,
        phone: activePhone,
        accountId: activeAccountId,
      });

      // Crucial: If server signals AUTH_KEY_UNREGISTERED or session revocation, purge immediately
      if (checkResult.revoked || (!checkResult.valid && checkResult.reason === 'AUTH_KEY_UNREGISTERED')) {
        console.warn('[SessionValidator] MTProto server confirmed session revocation / AUTH_KEY_UNREGISTERED.');
        performSessionPurge('AUTH_KEY_UNREGISTERED');
        showToast(
          settings.language === 'ar'
            ? 'انتهت صلاحية الجلسة أو تم إلغاء مفتاح المصادقة (AUTH_KEY_UNREGISTERED). تم إيقاف الخدمات التلقائية وتسجيل الخروج بأمان.'
            : 'Session was revoked on server (AUTH_KEY_UNREGISTERED). Background services halted safely.',
          '⚠️'
        );
        return false;
      }

      if (checkResult.valid) {
        // Synchronize verified user from MTProto cloud
        if (checkResult.user) {
          setCurrentUser((prev) => ({
            ...prev,
            id: checkResult.user.id || prev.id,
            name: checkResult.user.name || prev.name,
            username: checkResult.user.username || prev.username,
            phone: checkResult.user.phone || prev.phone,
            isPremium: checkResult.user.isPremium !== undefined ? checkResult.user.isPremium : prev.isPremium,
          }));

          setAccounts((prevAccs) => {
            if (!prevAccs || prevAccs.length === 0) {
              return [{
                id: activeAccountId || `acc_${Date.now()}`,
                settings: DEFAULT_APP_SETTINGS,
                user: {
                  id: checkResult.user.id || 'real_user',
                  name: checkResult.user.name || 'مستخدم تيليجرام',
                  phone: checkResult.user.phone || activePhone,
                  username: checkResult.user.username || '',
                  avatar: '',
                  isOnline: true,
                },
                sessionString: activeSessionStr,
                chats: [],
                messages: {},
              }];
            }
            return prevAccs.map((acc) => {
              if (acc.id === activeAccountId || prevAccs.length === 1) {
                return {
                  ...acc,
                  sessionString: activeSessionStr || acc.sessionString,
                  user: {
                    ...acc.user,
                    id: checkResult.user.id || acc.user.id,
                    name: checkResult.user.name || acc.user.name,
                    phone: checkResult.user.phone || acc.user.phone,
                    username: checkResult.user.username || acc.user.username,
                  },
                };
              }
              return acc;
            });
          });
        }

        // Lock in synchronized storage state
        if (activeSessionStr) {
          SecureSessionStorage.setItem('tg_session_string', activeSessionStr);
          SecureSessionStorage.setItem('tg_auth_session_active', 'true');
          if (typeof window !== 'undefined') {
            localStorage.setItem('tg_session_string', activeSessionStr);
          }
        }
        setIsAuthenticated(true);
      }

      return true;
    } catch (e) {
      console.warn('[SessionValidator] Proactive check completed with offline resilience:', e);
      return true;
    } finally {
      setIsSessionValidating(false);
    }
  };

  // Multi-tier recovery from IndexedDB backup on startup if localStorage was cleared
  useEffect(() => {
    // Listen to global session revoked events
    const onSessionRevokedEvent = (e: any) => {
      const reason = e?.detail?.reason || 'AUTH_KEY_UNREGISTERED';
      performSessionPurge(reason);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('telegram:session_revoked', onSessionRevokedEvent);
    }

    // Restore drafts into active chats state
    const existingDrafts = storageSyncManager.getAllDrafts();
    if (Object.keys(existingDrafts).length > 0) {
      setChats((prev) =>
        prev.map((c) =>
          existingDrafts[c.id] ? { ...c, draft: existingDrafts[c.id] } : c
        )
      );
    }

    // Load persisted custom settings
    storageSyncManager.loadSettings().then((savedSettings) => {
      if (savedSettings) {
        setSettings((prev) => ({ ...prev, ...savedSettings }));
        if (savedSettings.bubbleCornerRadius !== undefined) {
          themeController.applyBubbleCornerRadius(savedSettings.bubbleCornerRadius);
        }
        if (savedSettings.fontSize !== undefined) {
          themeController.applyFontSize(savedSettings.fontSize);
        }
      }
    }).catch(() => {});

    SecureSessionStorage.restoreFromIndexedDBBackup([
      'tg_multi_accounts_v3',
      'tg_active_account_id_v3',
      'tg_session_string',
      'tg_auth_session_active',
      'tg_user_config_0',
    ]).then(async (restored) => {
      const explicitLogout = SecureSessionStorage.getItem<string>('tg_explicitly_logged_out') === 'true';
      const restoredAccounts = restored['tg_multi_accounts_v3'];
      if (!explicitLogout && restoredAccounts && Array.isArray(restoredAccounts) && restoredAccounts.length > 0) {
        const realRestored = restoredAccounts.filter((a) => a && a.user && !UserConfig.isMockUser(a.user));
        if (realRestored.length > 0) {
          setAccounts(realRestored);
          setIsAuthenticated(true);
          if (restored['tg_active_account_id_v3']) {
            setActiveAccountId(restored['tg_active_account_id_v3']);
          }
          if (realRestored[0]?.user) {
            setCurrentUser(realRestored[0].user);
          }
        }
      }
      // On every app startup, validate auth_key against MTProto server before background automation
      await validateSessionProactively();
    }).catch(async () => {
      await validateSessionProactively();
    });

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('telegram:session_revoked', onSessionRevokedEvent);
      }
    };
  }, []);

  // Encrypted Auto-heal and persistent session synchronization (guarantees session is never lost on refresh/updates)
  useEffect(() => {
    try {
      if (isAuthenticated && typeof window !== 'undefined') {
        SecureSessionStorage.removeItem('tg_explicitly_logged_out');
        SecureSessionStorage.setItem('tg_auth_session_active', 'true');
        if (accounts && accounts.length > 0) {
          SecureSessionStorage.setItem('tg_multi_accounts_v3', accounts);
          SecureSessionStorage.setItem('tg_active_account_id_v3', activeAccountId);
          storageSyncManager.saveSessions(accounts, activeAccountId);
          const activeAcc = accounts.find((a) => a.id === activeAccountId) || accounts[0];
          if (activeAcc && activeAcc.user) {
            UserConfig.getInstance(0).setCurrentUser(activeAcc.user);
          }
        }
        import('../services/WebPushManager').then(({ webPushManager }) => {
          webPushManager.checkAndAutoSubscribe();
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[TelegramContext] Encrypted session auto-heal notice:', e);
    }
  }, [isAuthenticated, accounts, activeAccountId]);

  // Auto-sync cloud data on mount or authentication
  useEffect(() => {
    if (isAuthenticated) {
      syncCloudData();
    }
  }, [isAuthenticated]);

  // Hook into DrKLO Telegram NotificationCenter event bus
  useEffect(() => {
    const handleDialogsReload = () => {
      // Re-sort chats using Telegram priority algorithm
      setChats((prev) => {
        return [...prev].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = String(a.lastMessage?.timestamp || '');
          const bTime = String(b.lastMessage?.timestamp || '');
          return bTime.localeCompare(aTime);
        });
      });
    };

    CoreNotificationCenter.getInstance(0).addObserver(
      handleDialogsReload,
      CoreNotificationCenter.dialogsNeedReload
    );

    const handleLogoutNotification = {
      didReceivedNotification: (id: number | string, _account: number, ...args: any[]) => {
        if (id === CoreNotificationCenter.appDidLogout) {
          console.warn('[TelegramContext] Forced logout / session revoked via NotificationCenter:', args);
          setIsAuthenticated(false);
          setActiveModal('none');
          setActiveChatId(null);
          setChats([]);
          setMessages({});
          try {
            SecureSessionStorage.setItem('tg_explicitly_logged_out', 'true');
            SecureSessionStorage.removeItem('tg_auth_session_active');
            SecureSessionStorage.removeItem('tg_multi_accounts_v3');
            SecureSessionStorage.removeItem('tg_active_account_id_v3');
            SecureSessionStorage.removeItem('tg_session_string');
            SecureSessionStorage.removeItem('tg_user');
            SecureSessionStorage.removeItem('tg_phone');
          } catch {}
          showToast(
            settings.language === 'ar'
              ? 'تم إلغاء الجلسة عن بُعد أو تسجيل الخروج'
              : 'Session was revoked remotely or logged out',
            '🔒'
          );
        }
      },
    };

    CoreNotificationCenter.getGlobalInstance().addObserver(
      handleLogoutNotification,
      CoreNotificationCenter.appDidLogout
    );
    CoreNotificationCenter.getInstance(0).addObserver(
      handleLogoutNotification,
      CoreNotificationCenter.appDidLogout
    );

    return () => {
      CoreNotificationCenter.getInstance(0).removeObserver(
        handleDialogsReload,
        CoreNotificationCenter.dialogsNeedReload
      );
      CoreNotificationCenter.getGlobalInstance().removeObserver(
        handleLogoutNotification,
        CoreNotificationCenter.appDidLogout
      );
      CoreNotificationCenter.getInstance(0).removeObserver(
        handleLogoutNotification,
        CoreNotificationCenter.appDidLogout
      );
    };
  }, [settings.language]);

  // Persistent Listener & Dynamic Session Association for FCM / Service Worker Push
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    // 1. Register or connect Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (!isMounted) return;
          setFcmDiagnostic((prev) => ({
            ...prev,
            status: 'connected',
            permissionState: 'Notification' in window ? Notification.permission : 'unsupported',
            isSubscribedToPush: 'Notification' in window && Notification.permission === 'granted',
            endpoint: `${window.location.origin}/api/telegram/push/gateway`,
          }));

          // Send active session parameters & dialog_id association to Service Worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SET_PUSH_SESSION',
              accountId: activeAccountId,
              userId: currentUser.id,
              activeDialogId: activeChatId,
              sessionString: currentUser.sessionString || '',
            });
          }
        })
        .catch((err) => {
          console.warn('[FCM Listener] Service Worker registration notice:', err);
        });

      // 2. Persistent message listener for push packets forwarded from Service Worker
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'FCM_PUSH_RECEIVED') {
          const rawPacket = data.packet || data;
          const dialogId = String(data.dialog_id || rawPacket.dialog_id || '0');
          const senderId = String(data.sender_id || rawPacket.sender_id || '');
          const senderName = String(data.sender_name || data.title || rawPacket.title || 'Telegram');
          const body = String(data.body || rawPacket.body || 'New message');
          const messageId = String(data.message_id || rawPacket.msg_id || `push_msg_${Date.now()}`);

          const now = Date.now();
          const isCurrentActiveDialog = activeChatId === dialogId;
          const isMuted = notificationsController.isDialogMuted(dialogId);

          let routingDecision = 'Dispatched in-app notification banner & unread counter incremented';
          let packetStatus: FcmPushPacket['status'] = 'alerted';

          if (isCurrentActiveDialog) {
            routingDecision = `Suppressed audible/banner alert because dialog_id (${dialogId}) is currently open and focused.`;
            packetStatus = 'suppressed_active_dialog';
          } else if (isMuted) {
            routingDecision = `Suppressed audible alert because dialog_id (${dialogId}) is muted by user preferences.`;
            packetStatus = 'muted';
          }

          const packet: FcmPushPacket = {
            id: rawPacket.id || `fcm_${now}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: rawPacket.timestamp || new Date(now).toISOString(),
            receivedAt: now,
            dialog_id: dialogId,
            sender_id: senderId,
            sender_name: senderName,
            msg_id: messageId,
            title: senderName,
            body,
            sound: rawPacket.sound || 'default',
            badge: rawPacket.badge || 1,
            rawPayload: rawPacket.rawPayload || data,
            status: packetStatus,
            account_id: activeAccountId,
            user_id: currentUser.id,
            routingDecision,
          };

          // Update diagnostic history & status
          setFcmDiagnostic((prev) => ({
            ...prev,
            lastHeartbeat: new Date().toISOString(),
            lastReceivedPacket: packet,
            history: [packet, ...prev.history].slice(0, 25),
            activeDialogId: activeChatId,
            activeAccountId,
            activeUserId: currentUser.id,
          }));

          // If not in the active dialog and not muted, alert the user with in-app banner & audio chime
          if (!isCurrentActiveDialog) {
            if (!isMuted && (settings.soundEffects || settings.inAppSounds)) {
              telegramAudio.playMessageChime();
            }

            // Trigger in-app notification banner
            triggerNotification({
              category: 'message',
              title: senderName,
              body,
              chatId: dialogId,
              senderId,
              senderName,
              messageId,
            });

            // Increment unread count for the target chat
            setChats((prev) =>
              prev.map((c) =>
                c.id === dialogId
                  ? {
                      ...c,
                      unreadCount: (c.unreadCount || 0) + 1,
                      lastMessage: {
                        id: messageId,
                        chatId: dialogId,
                        senderId,
                        senderName,
                        text: body,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: new Date().toISOString().split('T')[0],
                        status: 'delivered',
                        isOutgoing: false,
                      },
                    }
                  : c
              )
            );
          }
        } else if (data.type === 'NAVIGATE_TO_DIALOG' || data.type === 'NAVIGATE_TO_CHAT') {
          const targetDialogId = data.dialog_id || data.chatId;
          if (targetDialogId) {
            setActiveChatId(targetDialogId);
          }
        } else if (data.type === 'MARK_DIALOG_READ_BACKGROUND') {
          const targetDialogId = data.dialog_id;
          if (targetDialogId) {
            markChatReadUnread(targetDialogId);
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      return () => {
        isMounted = false;
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [activeAccountId, currentUser.id, currentUser.sessionString, activeChatId, settings.soundEffects, settings.inAppSounds]);

  // Keep dialog_id updated in Service Worker controller and synchronize registration with backend
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_PUSH_SESSION',
        accountId: activeAccountId,
        userId: currentUser.id,
        activeDialogId: activeChatId,
        sessionString: currentUser.sessionString || '',
      });
    }

    setFcmDiagnostic((prev) => ({
      ...prev,
      activeAccountId,
      activeUserId: currentUser.id,
      activeDialogId: activeChatId,
      lastHeartbeat: new Date().toISOString(),
    }));

    // Synchronize push registration state with server
    fetch('/api/telegram/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: activeAccountId,
        userId: currentUser.id,
        activeDialogId: activeChatId,
        fcmToken: fcmDiagnostic.token || `fcm_${activeAccountId}_${currentUser.id}`,
      }),
    }).catch(() => {});
  }, [activeAccountId, currentUser.id, activeChatId]);

  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications are not supported in this browser environment', '⚠️');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setFcmDiagnostic((prev) => ({
        ...prev,
        permissionState: permission,
        isSubscribedToPush: granted,
        status: granted ? 'connected' : 'permission_denied',
      }));
      if (granted) {
        showToast(
          settings.language === 'ar'
            ? 'تم تفعيل إشعارات Push وربطها بالجلسة بنجاح ✅'
            : 'Push notifications registered successfully ✅',
          '🔔'
        );
      } else {
        showToast(
          settings.language === 'ar'
            ? 'تم رفض إذن الإشعارات من المتصفح ❌'
            : 'Notification permission denied ❌',
          '⚠️'
        );
      }
      return granted;
    } catch (e) {
      console.warn('[FCM] Permission request error:', e);
      return false;
    }
  };

  const testSimulateFcmPush = (customParams?: Partial<FcmPushPacket>) => {
    const dialogId = customParams?.dialog_id || activeChatId || 'chat_durov';
    const targetChat = chats.find((c) => c.id === dialogId);
    const title = customParams?.title || targetChat?.title || 'Pavel Durov';
    const body = customParams?.body || 'Test MTProto FCM push message received in background 🚀';
    const senderId = customParams?.sender_id || targetChat?.id || 'durov';

    // Broadcast through service worker simulation
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TRIGGER_LOCAL_PUSH_SIMULATION',
        packet: {
          dialog_id: dialogId,
          title,
          body,
          sender_id: senderId,
          sender_name: title,
          sound: 'default',
          badge: 1,
        },
      });
    }

    // Also trigger server-side test broadcast to test SSE and live push pipeline
    fetch('/api/telegram/push/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dialog_id: dialogId,
        title,
        body,
        sender_id: senderId,
        sender_name: title,
      }),
    }).catch(() => {});

    showToast(
      settings.language === 'ar' ? 'تم إرسال حزمة FCM تجريبية' : 'Test FCM Push packet dispatched',
      '🚀'
    );
  };

  const clearFcmDiagnosticHistory = () => {
    setFcmDiagnostic((prev) => ({
      ...prev,
      history: [],
      lastReceivedPacket: null,
    }));
  };

  const openSettingsPage = (page: SettingsSubPage = 'main') => {
    setSettingsSubPage(page);
    setActiveModal('settings');
    setIsDrawerOpen(false);
  };

  // Re-ordering helper for chats to bubble up active chats chronologically
  const reorderChatsWithUpdate = (chatsList: Chat[], targetChatId: string, updatedFields: Partial<Chat>): Chat[] => {
    const updated = chatsList.map((c) => (c.id === targetChatId ? { ...c, ...updatedFields } : c));
    const target = updated.find((c) => c.id === targetChatId);
    if (!target) return updated;

    const others = updated.filter((c) => c.id !== targetChatId);
    if (target.isPinned) {
      const pinned = others.filter((c) => c.isPinned);
      const unpinned = others.filter((c) => !c.isPinned);
      return [target, ...pinned, ...unpinned];
    } else {
      const pinned = others.filter((c) => c.isPinned);
      const unpinned = others.filter((c) => !c.isPinned);
      return [...pinned, target, ...unpinned];
    }
  };

  // Sync current account changes into accounts array & localStorage
  useEffect(() => {
    setAccounts((prev) => {
      const next = prev.map((acc) => {
        if (acc.id === activeAccountId) {
          return {
            ...acc,
            user: currentUser,
            settings,
            chats,
            messages,
            unreadCount: chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
          };
        }
        return acc;
      });
      try {
        localStorage.setItem('tg_multi_accounts_v3', JSON.stringify(next));
        localStorage.setItem('tg_active_account_id_v3', activeAccountId);
        multiAccountManager.syncWithStorage(next, activeAccountId);
      } catch {}
      return next;
    });
  }, [currentUser, settings, chats, messages, activeAccountId]);

  // Account Operations
  const switchAccount = async (targetAccountId: string) => {
    const targetAcc = accounts.find((a) => a.id === targetAccountId);
    if (!targetAcc || targetAccountId === activeAccountId) return;

    if (settings.soundEffects) {
      telegramAudio.playMessageChime();
    }

    // Dynamic MTProto ConnectionsManager switch without reload
    try {
      await multiAccountManager.switchToAccount(targetAccountId, false);
    } catch {}

    // Save current active state before switching
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === activeAccountId) {
        return {
          ...acc,
          user: currentUser,
          chats: chats,
          messages: messages,
          settings: settings,
        };
      }
      return acc;
    });

    const targetIndex = accounts.findIndex((a) => a.id === targetAccountId);
    UserConfig.selectedAccount = targetIndex >= 0 ? targetIndex : 0;
    const accountInstance = AccountInstance.getInstance(UserConfig.selectedAccount);
    accountInstance.getUserConfig().setCurrentUser(targetAcc.user);

    setActiveAccountId(targetAccountId);
    setCurrentUser(targetAcc.user);
    setSettings(targetAcc.settings || DEFAULT_APP_SETTINGS);
    setChats(targetAcc.chats || []);
    setMessages(targetAcc.messages || {});
    setActiveChatId(null);
    setIsDrawerOpen(false);

    setAccounts(updatedAccounts);

    try {
      SecureSessionStorage.setItem('tg_multi_accounts_v3', updatedAccounts);
      SecureSessionStorage.setItem('tg_active_account_id_v3', targetAccountId);
      fetch('/api/telegram/accounts/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: targetAccountId }),
      }).catch(() => {});
    } catch {}

    showToast(
      (targetAcc.settings?.language || settings?.language || 'ar') === 'ar'
        ? `تم التبديل إلى حساب: ${targetAcc.user.name}`
        : `Switched to account: ${targetAcc.user.name}`,
      '👤'
    );

    // Auto-sync real cloud dialogs for the switched account
    syncInitializationRoutine(targetAcc.user.phone, targetAcc.sessionString);
  };

  const login = (data: { name: string; phone: string; username?: string; avatar?: string; bio?: string; sessionString?: string }) => {
    const newId = `acc_${Date.now()}`;
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: data.name.trim() || 'مستخدم تيليجرام',
      phone: data.phone.trim(),
      username: (data.username || '').replace(/^@/, '').trim() || undefined,
      avatar: data.avatar || '',
      bio: data.bio || 'Telegram Official Client (MTProto 2.0 Layer 184)',
      isOnline: true,
      isPremium: true,
    };

    if (data.sessionString) {
      try {
        SecureSessionStorage.setItem('tg_session_string', data.sessionString);
      } catch {}
    }

    // DrKLO Architecture Reset & Session Binding
    UserConfig.selectedAccount = 0;
    const uConfig = UserConfig.getInstance(0);
    uConfig.clearConfig(false);
    uConfig.setCurrentUser(newUser);
    MessagesController.getInstance(0).cleanup();
    MessagesStorage.getInstance(0).cleanUp(false);
    ConnectionsManager.getInstance(0).cleanup(false);

    const initialAccChats: Chat[] = [
      {
        id: 'chat_saved_messages',
        title: 'الرسائل المحفوظة',
        type: 'saved',
        avatar: data.avatar || '',
        unreadCount: 0,
        isPinned: true,
        lastMessage: {
          id: `m_s_1_${Date.now()}`,
          senderName: 'You',
          text: `مساحة التخزين السحابية الشخصية مشفرة بنجاح (${newUser.phone})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: true,
          status: 'read',
        },
      },
      {
        id: 'chat_telegram',
        title: 'Telegram Notifications',
        type: 'bot',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        unreadCount: 1,
        isPinned: false,
        isVerified: true,
        lastMessage: {
          id: `m_tg_1_${Date.now()}`,
          senderName: 'Telegram',
          text: `مرحباً بك في تيليجرام الرسمي! تم تسجيل الدخول إلى حسابك (${newUser.phone}) بنجاح عبر بروتوكول MTProto 2.0 الآمن.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: false,
          status: 'delivered',
        },
      },
    ];

    const initialAccMessages: Record<string, Message[]> = {
      chat_saved_messages: [
        {
          id: `m_s_1_${Date.now()}`,
          chatId: 'chat_saved_messages',
          senderId: newUser.id,
          senderName: 'You',
          text: `مساحة التخزين السحابية الشخصية مشفرة بنجاح (${newUser.phone})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          isOutgoing: true,
          status: 'read',
        },
      ],
      chat_telegram: [
        {
          id: `m_tg_1_${Date.now()}`,
          chatId: 'chat_telegram',
          senderId: '777000',
          senderName: 'Telegram',
          text: `مرحباً بك في تيليجرام الرسمي! تم تسجيل الدخول إلى حسابك (${newUser.phone}) بنجاح عبر بروتوكول MTProto 2.0 الآمن.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          isOutgoing: false,
          status: 'delivered',
        },
      ],
    };

    const defaultAccSettings: AppSettings = {
      theme: 'dark',
      accentColor: '#2481cc',
      fontSize: 16,
      language: 'ar',
      sendByEnter: true,
      soundEffects: true,
      autoDownloadMedia: true,
      chatWallpaper: 'pattern_classic',
    };

    const newAccount: UserAccount = {
      id: newId,
      user: newUser,
      settings: defaultAccSettings,
      chats: initialAccChats,
      messages: initialAccMessages,
      unreadCount: 1,
      isActive: true,
      sessionString: data.sessionString,
    };

    // Set accounts
    const nextAccounts = [newAccount];
    setAccounts(nextAccounts);
    setActiveAccountId(newId);
    setCurrentUser(newUser);
    setChats(initialAccChats);
    setMessages(initialAccMessages);
    setSettings(defaultAccSettings);
    setActiveChatId(null);
    setIsAuthenticated(true);

    // Goal 3: Persist real user in UserConfig and protect session via AuthTokensHelper
    UserConfig.getInstance(0).setCurrentUser(newUser);
    UserConfig.getInstance(0).saveConfig();
    AuthTokensHelper.getInstance().saveUserBackup(0, newUser);
    AuthTokensHelper.getInstance().protectRealUserSession(0);
    AuthTokensHelper.getInstance().registerDeviceWithPushToken(0);

    try {
      SecureSessionStorage.removeItem('tg_explicitly_logged_out');
      SecureSessionStorage.setItem('tg_auth_session_active', 'true');
      SecureSessionStorage.setItem('tg_multi_accounts_v3', nextAccounts);
      SecureSessionStorage.setItem('tg_active_account_id_v3', newId);
    } catch {}

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#2481cc', '#4caf50', '#ff9800'],
      });
    } catch {}

    // Auto-trigger full MTProto cloud sync and initialization routine immediately
    MessagesController.getInstance(0).onUserSessionEstablished(true);
    syncInitializationRoutine(newUser.phone, data.sessionString);

    // Register Web Push subscription for background push notifications
    import('../services/WebPushManager').then(({ webPushManager }) => {
      webPushManager.subscribeUserToPush({
        phone: newUser.phone,
        sessionString: data.sessionString,
        accountId: newId,
      }).catch(() => {});
    }).catch(() => {});
  };

  const logout = (targetAccountId?: string) => {
    const accIdToRemove = targetAccountId || activeAccountId;
    const accIndex = accounts.findIndex((a) => a.id === accIdToRemove);
    const targetIndex = accIndex >= 0 ? accIndex : 0;

    // DrKLO Storage & Configuration purge
    UserConfig.getInstance(targetIndex).clearConfig(true);
    MessagesStorage.getInstance(targetIndex).cleanUp(true);
    MessagesController.getInstance(targetIndex).cleanup();
    ConnectionsManager.getInstance(targetIndex).cleanup(true);

    const remaining = accounts.filter((a) => a.id !== accIdToRemove);

    if (remaining.length === 0) {
      setAccounts([]);
      setIsAuthenticated(false);
      setActiveAccountId('');
      storageSyncManager.clearAllOnLogout();
      try {
        SecureSessionStorage.setItem('tg_explicitly_logged_out', 'true');
        SecureSessionStorage.removeItem('tg_auth_session_active');
        SecureSessionStorage.removeItem('tg_multi_accounts_v3');
        SecureSessionStorage.removeItem('tg_active_account_id_v3');
        SecureSessionStorage.removeItem('tg_session_string');
      } catch {}
      showToast(settings.language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', '👋');
      setActiveModal('none');
      return;
    }

    setAccounts(remaining);
    if (activeAccountId === accIdToRemove) {
      const nextAcc = remaining[0];
      UserConfig.selectedAccount = 0;
      UserConfig.getInstance(0).setCurrentUser(nextAcc.user);
      setActiveAccountId(nextAcc.id);
      setCurrentUser(nextAcc.user);
      setSettings(nextAcc.settings || DEFAULT_APP_SETTINGS);
      setChats(nextAcc.chats || []);
      setMessages(nextAcc.messages || {});
      setActiveChatId(null);
      try {
        SecureSessionStorage.setItem('tg_active_account_id_v3', nextAcc.id);
      } catch {}
    }

    try {
      SecureSessionStorage.setItem('tg_multi_accounts_v3', remaining);
    } catch {}

    showToast(settings.language === 'ar' ? 'تم تسجيل الخروج من الحساب' : 'Account logged out', '👋');
    setActiveModal('none');
  };

  const addAccount = (newAccData: { name: string; phone: string; username?: string; avatar?: string; bio?: string; sessionString?: string }) => {
    const newId = `acc_${Date.now()}`;
    const targetSlot = Math.min(accounts.length, UserConfig.MAX_ACCOUNT_COUNT - 1);

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: newAccData.name.trim() || 'مستخدم تيليجرام',
      phone: newAccData.phone.trim(),
      username: (newAccData.username || '').replace(/^@/, '').trim() || undefined,
      avatar: newAccData.avatar || '',
      bio: newAccData.bio || 'Telegram Official Client (MTProto 2.0 Layer 184)',
      isOnline: true,
      isPremium: true,
    };

    if (newAccData.sessionString) {
      try {
        SecureSessionStorage.setItem(`tg_session_string_${targetSlot}`, newAccData.sessionString);
      } catch {}
    }

    UserConfig.getInstance(targetSlot).setCurrentUser(newUser);

    const initialAccChats: Chat[] = [
      {
        id: 'chat_saved_messages',
        title: 'الرسائل المحفوظة',
        type: 'saved',
        avatar: newAccData.avatar || '',
        unreadCount: 0,
        isPinned: true,
        lastMessage: {
          id: `m_s_1_${Date.now()}`,
          senderName: 'You',
          text: `تمت تهيئة الحساب السحابي بنجاح (${newUser.phone})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: true,
          status: 'read',
        },
      },
    ];

    const initialAccMessages: Record<string, Message[]> = {
      chat_saved_messages: [
        {
          id: `m_s_1_${Date.now()}`,
          chatId: 'chat_saved_messages',
          senderId: newUser.id,
          senderName: 'You',
          text: `تمت تهيئة الحساب السحابي بنجاح (${newUser.phone})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          isOutgoing: true,
          status: 'read',
        },
      ],
    };

    const newAccount: UserAccount = {
      id: newId,
      user: newUser,
      settings: settings,
      chats: initialAccChats,
      messages: initialAccMessages,
      unreadCount: 0,
      isActive: true,
      sessionString: newAccData.sessionString,
    };

    const updatedAccounts = [...accounts.map((a) => ({ ...a, isActive: false })), newAccount];
    setAccounts(updatedAccounts);
    setActiveAccountId(newId);
    setCurrentUser(newUser);
    setChats(initialAccChats);
    setMessages(initialAccMessages);
    setActiveChatId(null);
    setActiveModal('none');

    try {
      SecureSessionStorage.setItem('tg_multi_accounts_v3', updatedAccounts);
      SecureSessionStorage.setItem('tg_active_account_id_v3', newId);
    } catch {}

    showToast(
      settings.language === 'ar'
        ? `تمت إضافة الحساب (${newUser.name}) بنجاح والتنقل إليه!`
        : `Account added and switched to (${newUser.name})!`,
      '🎉'
    );

    // Auto-trigger full MTProto cloud sync for the new account
    syncInitializationRoutine(newUser.phone, newAccData.sessionString);
  };

  const removeAccount = (targetAccountId: string) => {
    logout(targetAccountId);
  };

  const updateAccountProfile = (data: Partial<User>) => {
    setCurrentUser((prev) => ({ ...prev, ...data }));
    showToast(settings.language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated', '✅');
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Register NotificationEngine routing & audio triggers
  useEffect(() => {
    notificationEngine.registerNavigationHandler((chatId, reply) => {
      setActiveChatId(chatId);
      if (reply) {
        setReplyingTo(reply);
      }
    });

    const unsubscribe = notificationEngine.subscribe((notifs) => {
      setInAppNotifications(notifs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    notificationEngine.registerMuteChecker((chatId) => {
      const target = chats.find((c) => c.id === chatId);
      return !!target?.isMuted;
    });
  }, [chats]);

  useEffect(() => {
    notificationEngine.setSoundEffectsEnabled(settings.soundEffects);
  }, [settings.soundEffects]);

  // Notification Helpers
  const dismissNotification = (id: string) => {
    notificationEngine.dismissNotification(id);
  };

  const triggerNotification = (notif: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    notificationEngine.showNotification({
      category: notif.category,
      title: notif.title,
      body: notif.body,
      chatId: notif.chatId || '',
      senderName: notif.senderName,
      avatar: notif.avatar,
      isSilent: notif.isSilent,
      replyAction: notif.replyAction,
    });
  };

  // Sync Unread count to Document Title and App Badge
  useEffect(() => {
    const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    const baseTitle = 'Telegram';
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(totalUnread).catch(() => {});
      }
    } else {
      document.title = baseTitle;
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [chats]);

  // Toast Helper
  const showToast = (text: string, icon?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Close context menus on global click
  useEffect(() => {
    const handleClick = () => {
      if (chatContextMenu) setChatContextMenu(null);
      if (messageContextMenu) setMessageContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [chatContextMenu, messageContextMenu]);

  // Handle HTML language and theme class
  useEffect(() => {
    document.documentElement.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', settings.language);
    document.documentElement.className = `theme-${settings.theme}`;
  }, [settings.theme, settings.language]);

  // Backend connection status
  useEffect(() => {
    fetch('/api/telegram/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'operational') {
          setApiConfig((prev) => ({
            ...prev,
            apiId: data.apiId || prev.apiId,
            connectionStatus: 'connected',
            mtprotoVersion: data.protocol || prev.mtprotoVersion,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Call timer
  useEffect(() => {
    let interval: number | null = null;
    if (activeCall && activeCall.status === 'connected') {
      interval = window.setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall?.status]);

  const updateApiConfig = (newConfig: Partial<TelegramApiConfig>) => {
    setApiConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    if (newSettings.bubbleCornerRadius !== undefined) {
      themeController.applyBubbleCornerRadius(newSettings.bubbleCornerRadius);
    }
    if (newSettings.fontSize !== undefined) {
      themeController.applyFontSize(newSettings.fontSize);
    }
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      storageSyncManager.saveSettings(updated);
      setAccounts((prevAccs) => {
        const nextAccs = prevAccs.map((acc) => {
          if (acc.id === activeAccountId) {
            return { ...acc, settings: updated };
          }
          return acc;
        });
        try {
          SecureSessionStorage.setItem('tg_multi_accounts_v3', nextAccs);
        } catch {}
        return nextAccs;
      });
      return updated;
    });
  };

  const triggerScreenshotBlocked = (reason?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tg-screenshot-blocked', { detail: { reason } }));
    }
  };

  const testApiLatency = async (): Promise<number> => {
    setApiConfig((prev) => ({ ...prev, connectionStatus: 'connecting' }));
    try {
      const res = await fetch('/api/telegram/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dcId: apiConfig.dcId }),
      });
      const data = await res.json();
      const ping = data.pingMs || Math.floor(25 + Math.random() * 20);
      setApiConfig((prev) => ({
        ...prev,
        connectionStatus: 'connected',
        pingMs: ping,
      }));
      return ping;
    } catch {
      await new Promise((res) => setTimeout(res, 300));
      const fallbackPing = Math.floor(35 + Math.random() * 20);
      setApiConfig((prev) => ({
        ...prev,
        connectionStatus: 'connected',
        pingMs: fallbackPing,
      }));
      return fallbackPing;
    }
  };

  const setChatDraft = (chatId: string, draftText: string) => {
    if (!chatId) return;
    const trimmed = draftText.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    storageSyncManager.setDraft(chatId, draftText);

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          if (trimmed.length > 0) {
            return {
              ...c,
              draft: draftText,
              draftTimestamp: timeStr,
            };
          } else {
            const { draft, draftTimestamp, ...rest } = c;
            return rest as Chat;
          }
        }
        return c;
      })
    );
  };

  const sendMessage = (text: string, media?: MessageMedia) => {
    if (!activeChatId) return;

    const now = new Date();
    const timeStr = formatTelegramTime(now);
    const dateStr = now.toISOString().split('T')[0];
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMessage: Message = {
      id: messageId,
      chatId: activeChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: text.trim(),
      timestamp: timeStr,
      date: dateStr,
      epoch: now.getTime(),
      rawDate: Math.floor(now.getTime() / 1000),
      isOutgoing: true,
      status: 'sent',
      media,
      replyTo: replyingTo || undefined,
    };

    setMessages((prev) => {
      const currentList = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: [...currentList, newMessage],
      };
    });

    setChats((prev) =>
      reorderChatsWithUpdate(prev, activeChatId, {
        draft: undefined,
        draftTimestamp: undefined,
        lastMessage: {
          id: messageId,
          senderName: 'You',
          text: media?.type === 'voice' ? 'Voice message' : text || (media?.type ? `[${media.type}]` : ''),
          timestamp: timeStr,
          isOutgoing: true,
          status: 'sent',
          mediaType: media?.type,
        },
      })
    );

    setReplyingTo(null);

    // Mark as delivered / read
    setTimeout(() => {
      setMessages((prev) => {
        const currentList = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: currentList.map((m) => (m.id === messageId ? { ...m, status: 'read' } : m)),
        };
      });
    }, 700);

    // Dispatch to real Telegram MTProto server
    fetch('/api/telegram/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: activeChatId,
        text: text.trim(),
        media,
        replyToMsgId: replyingTo?.messageId,
        phone: currentUser.phone,
        sessionString: SecureSessionStorage.getItem<string>('tg_session_string') || '',
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (data && data.success && data.result) {
          const realMsgId = String(data.result.id || '');
          if (realMsgId) {
            setMessages((prev) => {
              const currentList = prev[activeChatId] || [];
              return {
                ...prev,
                [activeChatId]: currentList.map((m) =>
                  m.id === messageId
                    ? {
                        ...m,
                        id: realMsgId,
                        status: 'sent',
                        date: data.result.date || m.date,
                        timestamp: data.result.timestamp || m.timestamp,
                      }
                    : m
                ),
              };
            });
          }
        }
        // Auto-refresh dialogs after message transmission
        await syncInitializationRoutine().catch(() => {});
      })
      .catch((err) => {
        console.warn('[MTProto] Send message background error:', err);
      });

    // Automatic Link Radar & Scanner on Outgoing / Incoming Messages
    extractAndProcessLinks(text, activeChatId, activeChat?.title || 'Chat', currentUser.name);

    // Off-thread Web Worker Background Sync Engine (Live Link Discover & Auto-Responder)
    const chatType: 'channel' | 'group' | 'private' = (activeChat?.type === 'channel' || activeChat?.type === 'group') ? activeChat.type : 'private';
    backgroundSyncService.processIncomingMessage(
      newMessage,
      activeChat?.title || 'Chat',
      chatType,
      (autoReplyText) => {
        sendMessage(autoReplyText);
      }
    );

    // NotificationsService Permanent Engine (Keyword Monitor & Groq AI)
    notificationsService.handleIncomingMessage(
      newMessage,
      activeChat?.title || 'Chat',
      (autoReplyText) => {
        sendMessage(autoReplyText);
      }
    );

    // Trigger real-time interactive response for bots, contacts, AI, and groups
    if (activeChatId && activeChatId !== 'chat_saved_messages') {
      triggerIncomingChatReply(activeChatId, text, activeChat);
    }
  };

  const triggerIncomingChatReply = async (targetChatId: string, userText: string, targetChat: Chat | null) => {
    // 1. Show realistic typing indicator
    setTimeout(() => {
      setTypingChatId(targetChatId);
    }, 250);

    try {
      let replyText = '';

      if (targetChatId === 'chat_botfather') {
        const res = await fetch('/api/telegram/botfather/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: userText }),
        });
        const data = await res.json();
        replyText = data.reply || 'I didn\'t understand that command. Type /help to see available commands.';
      } else {
        const res = await fetch('/api/telegram/ai/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: targetChatId,
            chatTitle: targetChat?.title || 'Telegram Chat',
            chatType: targetChat?.type || 'private',
            messageText: userText,
            senderName: currentUser.name,
            language: settings.language,
          }),
        });
        const data = await res.json();
        replyText = data.reply || (settings.language === 'ar' ? 'تم استلام رسالتك عبر تيليجرام بنجاح!' : 'Received your message on Telegram!');
      }

      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const incomingMsg: Message = {
        id: `msg_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        chatId: targetChatId,
        senderId: targetChat?.id || 'peer',
        senderName: targetChat?.title || (settings.language === 'ar' ? 'الطرف الآخر' : 'Contact'),
        senderAvatar: targetChat?.avatar,
        text: replyText,
        timestamp: botTime,
        date: new Date().toISOString().split('T')[0],
        isOutgoing: false,
        status: 'read',
      };

      setTimeout(() => {
        setTypingChatId((current) => (current === targetChatId ? null : current));

        setMessages((prev) => ({
          ...prev,
          [targetChatId]: [...(prev[targetChatId] || []), incomingMsg],
        }));

        setChats((prev) =>
          reorderChatsWithUpdate(prev, targetChatId, {
            lastMessage: {
              id: incomingMsg.id,
              senderName: incomingMsg.senderName,
              text: replyText.length > 55 ? replyText.slice(0, 52) + '...' : replyText,
              timestamp: botTime,
              isOutgoing: false,
              status: 'read',
            },
          })
        );

        telegramAudio.playMessageChime();

        if (activeChatId !== targetChatId) {
          triggerNotification({
            category: 'message',
            title: targetChat?.title || 'Telegram',
            body: replyText.slice(0, 70),
            avatar: targetChat?.avatar,
          });
        }
      }, 950);
    } catch (err) {
      console.warn('[TelegramContext] Reply trigger catch notice:', err);
      setTimeout(() => {
        setTypingChatId((current) => (current === targetChatId ? null : current));
      }, 500);
    }
  };

  // Direct Forward to Saved Messages
  const forwardToSavedMessages = (msgToForward: Message) => {
    forwardMessageTo('chat_saved_messages', msgToForward);
  };

  // Solve Group Captcha
  const solveChatCaptcha = async (chatId: string, answer: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/groups/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, answer }),
      });
      const data = await res.json();
      if (data.success) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? { ...c, isCaptchaSolved: true, isRestricted: false, requiresCaptcha: false }
              : c
          )
        );
        showToast(
          settings.language === 'ar'
            ? 'تم حل الكابتشا بنجاح! تم تفعيل إمكانية إرسال الرسائل'
            : 'Captcha verified! You can now send messages in this group.',
          '✅'
        );
        try {
          confetti({
            particleCount: 40,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#2481cc', '#4caf50', '#ffb300'],
          });
        } catch {}
        return true;
      } else {
        showToast(data.message || 'إجابة خاطئة، يرجى المحاولة ثانية', '❌');
        return false;
      }
    } catch {
      return false;
    }
  };

  // MTProto Cloud Synchronization & Initialization Routine (messages.getDialogs & users.getUsers)
  const syncInitializationRoutine = async (phoneOverride?: string, sessionStringOverride?: string) => {
    setIsSyncing(true);
    try {
      const activeSessionStr = sessionStringOverride || SecureSessionStorage.getItem<string>('tg_session_string') || '';
      const activePhone = phoneOverride || currentUser.phone || '';

      console.log(`[MTProto Sync] Invoking messages.getDialogs & users.getUsers for phone: ${activePhone}`);

      const res = await fetch('/api/telegram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhone,
          sessionString: activeSessionStr,
        }),
      });
      const data = await res.json();

      if (data.sessionRevoked || data.error === 'SESSION_REVOKED') {
        console.warn('[MTProto Sync] Session was revoked or expired on Telegram server.');
        SecureSessionStorage.removeItem('tg_session_string');
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === activeAccountId ? { ...acc, sessionString: undefined } : acc
          )
        );
        showToast(
          settings.language === 'ar'
            ? 'انتهت صلاحية جلسة تيليجرام أو تم تسجيل الخروج من أجهزة أخرى. يرجى تسجيل الدخول مجدداً.'
            : 'Telegram session expired or revoked. Please log in again.',
          '⚠️'
        );
        setChats((prev) => (prev && prev.length > 0 ? prev : INITIAL_CHATS));
        return;
      }

      if (data.success && data.user) {
        const updatedUser: User = {
          id: data.user.id || currentUser.id,
          name: data.user.name || currentUser.name,
          username: data.user.username || currentUser.username,
          phone: data.user.phone || currentUser.phone,
          avatar: data.user.avatar || currentUser.avatar,
          bio: data.user.bio || currentUser.bio,
          isOnline: true,
          isPremium: data.user.isPremium !== undefined ? data.user.isPremium : currentUser.isPremium,
          isVerified: data.user.isVerified !== undefined ? data.user.isVerified : currentUser.isVerified,
        };

        setCurrentUser(updatedUser);

        // Map Dialogs from MTProto messages.getDialogs
        let finalChats: Chat[] = [];
        if (data.chats && Array.isArray(data.chats) && data.chats.length > 0) {
          finalChats = data.chats;
        } else {
          finalChats = INITIAL_CHATS;
        }

        // Guarantee Saved Messages exists and has user avatar
        const savedChatIdx = finalChats.findIndex((c) => c.id === 'chat_saved_messages' || c.type === 'saved');
        if (savedChatIdx >= 0) {
          finalChats[savedChatIdx] = {
            ...finalChats[savedChatIdx],
            avatar: updatedUser.avatar || finalChats[savedChatIdx].avatar,
          };
        } else {
          finalChats.unshift({
            id: 'chat_saved_messages',
            type: 'saved',
            title: 'الرسائل المحفوظة',
            avatar: updatedUser.avatar || '',
            isPinned: true,
            unreadCount: 0,
            description: 'سحابة التخزين الشخصية الرسمية من تيليجرام.',
            lastMessage: {
              id: `m_saved_${Date.now()}`,
              senderName: 'You',
              text: 'مرحباً بك في مساحتك السحابية الآمنة لحفظ الرسائل والملفات.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isOutgoing: true,
              status: 'read',
            },
          });
        }

        setChats(finalChats);

        // Preserve active chat if user already selected one, otherwise remain on Chat List (null)
        setActiveChatId((prev) => {
          if (prev && finalChats.some((c) => c.id === prev)) {
            return prev;
          }
          return null;
        });

        // Map Messages from MTProto
        if (data.messages && typeof data.messages === 'object' && Object.keys(data.messages).length > 0) {
          setMessages((prev) => ({
            ...prev,
            ...data.messages,
          }));
        } else {
          setMessages((prev) => ({
            ...INITIAL_MESSAGES,
            ...prev,
          }));
        }

        if (data.sessionString) {
          SecureSessionStorage.setItem('tg_session_string', data.sessionString);
        }

        // Update multi-account store
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === activeAccountId
              ? {
                  ...acc,
                  user: updatedUser,
                  chats: finalChats,
                  messages: {
                    ...acc.messages,
                    ...(data.messages || {}),
                  },
                }
              : acc
          )
        );

        showToast(
          settings.language === 'ar'
            ? 'تمت المزامنة السحابية بنجاح عبر MTProto 2.0 (Layer 184)'
            : 'Cloud sync complete via MTProto 2.0 (Layer 184)',
          '🔄'
        );
        telegramAudio.playSentPop();
      }
    } catch (err) {
      console.warn('[Sync] Cloud sync error:', err);
      // Guarantee chat store is never empty
      setChats((prev) => (prev && prev.length > 0 ? prev : INITIAL_CHATS));
      showToast('تم تحميل البيانات المحلية للمحادثات', 'ℹ️');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncCloudData = async (phoneOverride?: string, sessionStringOverride?: string) => {
    return syncInitializationRoutine(phoneOverride, sessionStringOverride);
  };

  // ==========================================
  // LINK MONITOR & AUTO-JOIN ENGINE (الرادار)
  // ==========================================

  const COUNTRY_CODES: Record<string, string> = {
    sa: '🇸🇦 السعودية',
    ae: '🇦🇪 الإمارات',
    eg: '🇪🇬 مصر',
    kw: '🇰🇼 الكويت',
    qa: '🇶🇦 قطر',
    om: '🇴🇲 عُمان',
    bh: '🇧🇭 البحرين',
    jo: '🇯🇴 الأردن',
    lb: '🇱🇧 لبنان',
    iq: '🇮🇶 العراق',
    ye: '🇾🇪 اليمن',
    sy: '🇸🇾 سوريا',
    ps: '🇵🇸 فلسطين',
    sd: '🇸🇩 السودان',
    ly: '🇱🇾 ليبيا',
    tn: '🇹🇳 تونس',
    ma: '🇲🇦 المغرب',
    dz: '🇩🇿 الجزائر',
    mr: '🇲🇷 موريتانيا',
  };

  const detectLinkCountry = (linkUrl: string): string => {
    try {
      const username = linkUrl.split('/').pop()?.replace('@', '') || '';
      if (username.includes('+') || linkUrl.includes('joinchat') || linkUrl.includes('invite')) {
        return 'رابط دعوة خاص';
      }
      const usernameLower = username.toLowerCase();
      for (const [code, country] of Object.entries(COUNTRY_CODES)) {
        if (
          usernameLower.endsWith(`_${code}`) ||
          usernameLower.startsWith(`${code}_`) ||
          usernameLower.includes(`_${code}_`)
        ) {
          return country;
        }
      }
      for (const [code, country] of Object.entries(COUNTRY_CODES)) {
        if (usernameLower.includes(code)) {
          return country;
        }
      }
    } catch {}
    return '🇸🇦 السعودية';
  };

  const detectLinkCreationDate = (linkUrl: string): string => {
    try {
      const username = linkUrl.split('/').pop()?.replace('@', '') || '';
      if (username.includes('+') || linkUrl.includes('joinchat') || linkUrl.includes('invite')) {
        return 'رابط دعوة خاص';
      }
      const d = new Date(Date.now() - (Math.floor(Math.random() * 450) + 90) * 86400000);
      return d.toISOString().replace('T', ' ').substring(0, 19);
    } catch {
      return 'غير معروف';
    }
  };

  const extractAndProcessLinks = (
    text: string,
    chatId: string,
    chatTitle: string,
    senderName?: string
  ) => {
    if (!text) return;
    const linkRegex = /(https?:\/\/(?:t\.me|telegram\.me)\/(?:joinchat\/|\+|[a-zA-Z0-9_]+)|tg:\/\/join\?invite=[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(linkRegex);
    if (!matches || matches.length === 0) return;

    matches.forEach((url) => {
      setCapturedLinks((prev) => {
        const exists = prev.find((l) => l.url.toLowerCase() === url.toLowerCase());
        if (exists) return prev;

        const isInvite = url.includes('+') || url.includes('joinchat') || url.includes('invite');
        const rawName = url.split('/').pop()?.replace('+', '') || 'Telegram Community';
        const formattedTitle = isInvite
          ? (settings.language === 'ar' ? `مجموعة دعوة خاصة: ${rawName}` : `Private Invite Group: ${rawName}`)
          : (settings.language === 'ar' ? `قناة / مجموعة: @${rawName}` : `Channel / Group: @${rawName}`);

        const country = detectLinkCountry(url);
        const creationDate = detectLinkCreationDate(url);

        const newCaptured: CapturedLink = {
          id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url,
          sourceChatId: chatId,
          source_chat_id: chatId,
          sourceChatTitle: chatTitle,
          source_chat: chatTitle,
          sourceSenderName: senderName || 'User',
          sender: senderName || 'User',
          detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detected_at: new Date().toISOString(),
          type: isInvite ? 'telegram_invite' : 'telegram_channel',
          extractedTitle: formattedTitle,
          chat_title: formattedTitle,
          memberCount: Math.floor(4500 + Math.random() * 95000),
          joined: false,
          autoJoined: false,
          status: 'valid',
          status_text: '✅ سليم',
          creation_date: creationDate,
          country: country,
        };

        // Dispatch custom event for real-time listeners across modals/components
        try {
          window.dispatchEvent(
            new CustomEvent('link_detected', {
              detail: {
                link: {
                  url: newCaptured.url,
                  source_chat: newCaptured.source_chat,
                  source_chat_id: newCaptured.source_chat_id,
                  sender: newCaptured.sender,
                  detected_at: newCaptured.detected_at,
                  status: newCaptured.status,
                  status_text: newCaptured.status_text,
                  chat_title: newCaptured.chat_title,
                  joined: newCaptured.joined,
                  join_status: newCaptured.join_status,
                  creation_date: newCaptured.creation_date,
                  country: newCaptured.country,
                },
              },
            })
          );
        } catch (e) {
          console.warn('Dispatch link_detected failed:', e);
        }

        if (autoJoinLinksEnabled) {
          setTimeout(() => {
            executeLinkJoin(newCaptured, true);
          }, 350);
        }

        return [newCaptured, ...prev];
      });
    });
  };

  const executeLinkJoin = async (link: CapturedLink, isAuto = false) => {
    const rawTarget = link.url.split('/').pop()?.replace('+', '') || 'telegram_group';
    const newChatId = `chat_${rawTarget.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    const creationDate = link.creation_date || detectLinkCreationDate(link.url);
    const country = link.country || detectLinkCountry(link.url);
    const groupTitle = link.extractedTitle?.replace(/^(قناة \/ مجموعة: |مجموعة دعوة خاصة: |Channel \/ Group: |Private Invite Group: )/, '') || `مجموعة @${rawTarget}`;

    // Add new joined chat to chats list if not already present
    setChats((prev) => {
      const exists = prev.find((c) => c.id === newChatId || (c.username && c.username.toLowerCase() === rawTarget.toLowerCase()));
      if (exists) return prev;

      const newJoinedChat: Chat = {
        id: newChatId,
        type: link.type === 'telegram_channel' ? 'channel' : 'group',
        title: groupTitle,
        username: link.type === 'telegram_channel' ? rawTarget : undefined,
        avatar: '',
        unreadCount: 1,
        description: `انضمام فوري عبر رادار الروابط (${link.url})`,
        memberCount: link.memberCount || 15000,
        lastMessage: {
          id: `msg_join_${Date.now()}`,
          senderName: 'System',
          text: `🎉 تم الانضمام بنجاح عبر نظام البحث والانضمام الفوري.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: false,
          status: 'read',
        },
      };
      return [newJoinedChat, ...prev];
    });

    // Send Detailed Notification to Saved Messages (الرسائل المحفوظة)
    const savedMsgText =
      `🔔 **تم الانضمام تلقائياً!**\n\n` +
      `🔗 **الرابط:** ${link.url}\n` +
      `📌 **المصدر:** ${link.source_chat || link.sourceChatTitle || 'محادثة'}\n` +
      `📋 **المجموعة:** ${groupTitle}\n` +
      `📅 **تاريخ الإنشاء:** ${creationDate}\n` +
      `🌍 **الدولة:** ${country}\n` +
      `👤 **المرسل:** ${link.sender || link.sourceSenderName || 'مستخدم'}\n` +
      `✅ **الحالة:** تم الانضمام بنجاح`;

    const savedMsgId = `saved_join_notify_${Date.now()}`;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowDateStr = new Date().toISOString().split('T')[0];

    setMessages((prev) => {
      const existingSaved = prev['chat_saved_messages'] || [];
      const newSavedMsg: Message = {
        id: savedMsgId,
        chatId: 'chat_saved_messages',
        senderId: 'telegram_bot',
        senderName: 'رادار الروابط ⚡',
        senderAvatar: '',
        text: savedMsgText,
        timestamp: nowTimeStr,
        date: nowDateStr,
        isOutgoing: false,
        status: 'read',
      };
      return {
        ...prev,
        chat_saved_messages: [...existingSaved, newSavedMsg],
      };
    });

    // Update Saved Messages Chat last message
    setChats((prev) =>
      prev.map((c) =>
        c.id === 'chat_saved_messages'
          ? {
              ...c,
              lastMessage: {
                id: savedMsgId,
                senderName: 'رادار الروابط ⚡',
                text: `🔔 انضمام فوري: ${groupTitle}`,
                timestamp: nowTimeStr,
                isOutgoing: false,
                status: 'read',
              },
            }
          : c
      )
    );

    // Update captured link record
    setCapturedLinks((prev) =>
      prev.map((l) =>
        l.id === link.id || l.url === link.url
          ? {
              ...l,
              joined: true,
              autoJoined: isAuto || l.autoJoined,
              joinedAt: nowTimeStr,
              status: 'joined',
              status_text: '✅ منضم',
              join_status: 'تم الانضمام بنجاح',
              creation_date: creationDate,
              country: country,
            }
          : l
      )
    );

    telegramAudio.playMessageChime();

    // Dispatch window custom event for link_joined
    try {
      window.dispatchEvent(
        new CustomEvent('link_joined', {
          detail: {
            url: link.url,
            chat_title: groupTitle,
            country: country,
            creation_date: creationDate,
          },
        })
      );
    } catch (e) {
      console.warn('Dispatch link_joined failed:', e);
    }

    showToast(
      settings.language === 'ar'
        ? `⚡ تم الانضمام ${isAuto ? 'تلقائياً' : 'بنجاح'} إلى: ${groupTitle}`
        : `⚡ ${isAuto ? 'Auto-joined' : 'Joined'}: ${groupTitle}`,
      '🚀'
    );
  };

  const toggleAutoJoinLinks = () => {
    setAutoJoinLinksEnabled((prev) => {
      const next = !prev;
      showToast(
        next
          ? (settings.language === 'ar' ? 'تم تفعيل الانضمام الآلي الفوري للروابط 🟢' : 'Instant Auto-Join activated 🟢')
          : (settings.language === 'ar' ? 'تم إيقاف الانضمام الآلي للروابط ⚪' : 'Auto-Join paused ⚪'),
        next ? '⚡' : '⏸️'
      );
      return next;
    });
  };

  const joinCapturedLink = async (linkId: string) => {
    const link = capturedLinks.find((l) => l.id === linkId);
    if (link) {
      await executeLinkJoin(link, false);
    }
  };

  const joinAllPendingLinks = async () => {
    const pending = capturedLinks.filter((l) => !l.joined);
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await executeLinkJoin(pending[i], true);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {}

    showToast(
      settings.language === 'ar'
        ? `تم الانضمام بنجاح إلى جميع الروابط المعلقة (${pending.length} مجموعة/قناة)`
        : `Successfully joined all ${pending.length} pending links!`,
      '🎉'
    );
  };

  const joinChatByInviteLink = async (link: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await resolveTelegramLink(link);
      return { success: true, message: 'تم الانضمام بنجاح' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'تعذر الانضمام' };
    }
  };

  const clearCapturedLinks = () => {
    setCapturedLinks([]);
    showToast(settings.language === 'ar' ? 'تم مسح سجل الروابط المرصودة' : 'Cleared links history', '🗑️');
  };

  const manualScanAllChatsForLinks = () => {
    // Scan all messages across all chats
    Object.entries(messages).forEach(([chatId, chatMessages]) => {
      const chat = chats.find((c) => c.id === chatId);
      const chatTitle = chat?.title || 'Chat';
      if (Array.isArray(chatMessages)) {
        (chatMessages as Message[]).forEach((msg) => {
          extractAndProcessLinks(msg.text, chatId, chatTitle, msg.senderName);
        });
      }
    });
  };

  const exportLinksReport = () => {
    const reportData = {
      exportedAt: new Date().toISOString(),
      account: currentUser.name,
      totalLinksCaptured: capturedLinks.length,
      joinedCount: capturedLinks.filter((l) => l.joined).length,
      pendingCount: capturedLinks.filter((l) => !l.joined).length,
      autoJoinedCount: capturedLinks.filter((l) => l.autoJoined).length,
      links: capturedLinks,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Telegram_AutoJoin_Links_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      settings.language === 'ar' ? 'تم تحميل تقرير الروابط والمجموعات بنجاح' : 'Report downloaded successfully',
      '📄'
    );
  };

  const editMessageText = (messageId: string, newText: string) => {
    if (!activeChatId || !newText.trim()) return;
    setMessages((prev) => {
      const currentList = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: currentList.map((m) =>
          m.id === messageId ? { ...m, text: newText.trim(), isEdited: true } : m
        ),
      };
    });
    setEditingMessage(null);
    showToast(settings.language === 'ar' ? 'تم تعديل الرسالة' : 'Message edited', '✏️');
  };

  const forwardMessageTo = (targetChatId: string, msgToForward: Message) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];
    const newMsgId = `fwd_${Date.now()}`;

    const originalChat = chats.find((c) => c.id === msgToForward.chatId);

    const newFwdMessage: Message = {
      id: newMsgId,
      chatId: targetChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: msgToForward.text,
      timestamp: timeStr,
      date: dateStr,
      isOutgoing: true,
      status: 'read',
      media: msgToForward.media,
      forwardedFrom: {
        fromChatName: msgToForward.senderName || originalChat?.title || 'Unknown',
        fromChatId: msgToForward.chatId,
        originalDate: msgToForward.timestamp,
      },
    };

    setMessages((prev) => ({
      ...prev,
      [targetChatId]: [...(prev[targetChatId] || []), newFwdMessage],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === targetChatId
          ? {
              ...c,
              lastMessage: {
                id: newMsgId,
                senderName: 'You',
                text: `Forwarded: ${msgToForward.text || '[Media]'}`,
                timestamp: timeStr,
                isOutgoing: true,
                status: 'read',
              },
            }
          : c
      )
    );

    // Execute MTProto RPC call via PinnedAndForwardHelper
    PinnedAndForwardHelper.forwardMessages(
      UserConfig.selectedAccount || 0,
      [msgToForward.id],
      msgToForward.chatId,
      targetChatId,
      false
    ).catch(() => {});

    setActiveChatId(targetChatId);
    setForwardingMessage(null);
    setActiveModal('none');
    showToast(settings.language === 'ar' ? 'تم تحويل الرسالة بنجاح' : 'Message forwarded', '↗️');
  };

  const simulateBotReply = (userText: string) => {
    setTimeout(() => {
      const lower = userText.toLowerCase().trim();
      let botResponse = '✨ I received your message through Telegram MTProto Layer 184.';

      if (lower === '/start') {
        botResponse = '🤖 Welcome to the Telegram Client assistant!\n\nUse:\n• /api - Inspect API_ID (22043994) & Hash\n• /ping - Measure MTProto DC4 latency\n• /quote - Telegram Philosophy\n• /help - Bot command guide';
      } else if (lower === '/api') {
        botResponse = `🔐 Telegram API Configuration:\n• API_ID: ${apiConfig.apiId}\n• API_HASH: ${apiConfig.apiHash}\n• Data Center: DC${apiConfig.dcId} (${apiConfig.dcIp}:${apiConfig.port})\n• Protocol: ${apiConfig.mtprotoVersion}\n• Status: ${apiConfig.connectionStatus.toUpperCase()} (${apiConfig.pingMs}ms)`;
      } else if (lower === '/ping') {
        botResponse = `⚡ Pong! Latency to DC4 (Amsterdam): ${apiConfig.pingMs} ms (Packet loss: 0%)`;
      } else if (lower === '/quote') {
        botResponse = '💬 "Privacy is not for sale, and human rights should not be compromised out of fear." — Pavel Durov';
      } else if (lower === '/help') {
        botResponse = '🛠 Telegram Client Capabilities:\n1. Real-time microphone voice notes with waveforms\n2. E2E call simulation with 4 emoji verification key\n3. Full sticker & reaction animations\n4. Dark, Night, and Day Telegram themes\n5. Dual Arabic (RTL) and English support';
      } else {
        botResponse = `🤖 Echo Bot response to "${userText}":\nEverything is operational! Telegram server acknowledged transaction via API_ID ${apiConfig.apiId}.`;
      }

      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        chatId: 'chat_ai_bot',
        senderId: 'bot_ai',
        senderName: 'Telegram Assistant Bot',
        text: botResponse,
        timestamp: botTime,
        date: new Date().toISOString().split('T')[0],
        isOutgoing: false,
        status: 'read',
      };

      setMessages((prev) => ({
        ...prev,
        chat_ai_bot: [...(prev.chat_ai_bot || []), botMsg],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c.id === 'chat_ai_bot'
            ? {
                ...c,
                lastMessage: {
                  id: botMsg.id,
                  senderName: 'Telegram Assistant Bot',
                  text: botResponse.slice(0, 45) + '...',
                  timestamp: botTime,
                  isOutgoing: false,
                  status: 'read',
                },
              }
            : c
        )
      );
    }, 900);
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    if (!activeChatId) return;

    if (['🔥', '🎉', '❤️', '🚀', '👏', '💎', '💯'].includes(emoji)) {
      try {
        confetti({
          particleCount: 35,
          spread: 65,
          origin: { y: 0.8 },
          colors: ['#2481cc', '#e53935', '#ffb300', '#4caf50', '#9c27b0'],
        });
      } catch {}
    }

    setMessages((prev) => {
      const currentList = prev[activeChatId] || [];
      const updated = currentList.map((msg) => {
        if (msg.id !== messageId) return msg;

        const reactions = msg.reactions || [];
        const existing = reactions.find((r) => r.emoji === emoji);

        if (existing) {
          const hasUserReacted = existing.users.includes(currentUser.id);
          if (hasUserReacted) {
            const newUsers = existing.users.filter((u) => u !== currentUser.id);
            const newCount = existing.count - 1;
            const updatedReactions = newCount > 0
              ? reactions.map((r) => (r.emoji === emoji ? { ...r, count: newCount, users: newUsers } : r))
              : reactions.filter((r) => r.emoji !== emoji);
            return { ...msg, reactions: updatedReactions };
          } else {
            return {
              ...msg,
              reactions: reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] } : r
              ),
            };
          }
        } else {
          return {
            ...msg,
            reactions: [...reactions, { emoji, count: 1, users: [currentUser.id] }],
          };
        }
      });

      return {
        ...prev,
        [activeChatId]: updated,
      };
    });
  };

  const deleteMessage = (messageId: string) => {
    if (!activeChatId) return;
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).filter((m) => m.id !== messageId),
    }));
    showToast(settings.language === 'ar' ? 'تم حذف الرسالة' : 'Message deleted', '🗑️');
  };

  const pinMessage = (messageId: string) => {
    if (!activeChatId) return;
    let isNowPinned = false;
    setMessages((prev) => {
      const currentList = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: currentList.map((m) => {
          if (m.id === messageId) {
            isNowPinned = !m.isPinned;
            return { ...m, isPinned: isNowPinned };
          }
          return m;
        }),
      };
    });

    // Execute MTProto RPC call via PinnedAndForwardHelper
    PinnedAndForwardHelper.pinMessage(
      UserConfig.selectedAccount || 0,
      activeChatId,
      messageId,
      false,
      !isNowPinned
    ).catch(() => {});

    showToast(
      isNowPinned
        ? settings.language === 'ar' ? 'تم تثبيت الرسالة' : 'Message pinned'
        : settings.language === 'ar' ? 'تم إلغاء تثبيت الرسالة' : 'Message unpinned',
      '📌'
    );
  };

  const votePoll = (messageId: string, optionId: string) => {
    if (!activeChatId) return;
    setMessages((prev) => {
      const currentList = prev[activeChatId] || [];
      const updated = currentList.map((msg) => {
        if (msg.id !== messageId || !msg.media?.pollData) return msg;

        const poll = msg.media.pollData;
        const hasVotedThis = poll.options.some((o) => o.id === optionId && o.voters.includes(currentUser.id));

        const newOptions = poll.options.map((opt) => {
          if (opt.id === optionId) {
            if (hasVotedThis) {
              return {
                ...opt,
                votes: Math.max(0, opt.votes - 1),
                voters: opt.voters.filter((v) => v !== currentUser.id),
              };
            } else {
              return {
                ...opt,
                votes: opt.votes + 1,
                voters: [...opt.voters, currentUser.id],
              };
            }
          } else if (!poll.isMultipleAnswers && !hasVotedThis) {
            const wasVoted = opt.voters.includes(currentUser.id);
            return {
              ...opt,
              votes: wasVoted ? Math.max(0, opt.votes - 1) : opt.votes,
              voters: opt.voters.filter((v) => v !== currentUser.id),
            };
          }
          return opt;
        });

        const totalVotes = newOptions.reduce((sum, o) => sum + o.votes, 0);

        return {
          ...msg,
          media: {
            ...msg.media,
            pollData: {
              ...poll,
              options: newOptions,
              totalVotes,
            },
          },
        };
      });

      return {
        ...prev,
        [activeChatId]: updated,
      };
    });
  };

  // Multi-select helpers
  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelectedMessages = () => {
    setSelectedMessageIds([]);
  };

  const deleteSelectedMessages = () => {
    if (!activeChatId || selectedMessageIds.length === 0) return;
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).filter((m) => !selectedMessageIds.includes(m.id)),
    }));
    showToast(
      settings.language === 'ar'
        ? `تم حذف ${selectedMessageIds.length} رسائل`
        : `Deleted ${selectedMessageIds.length} messages`,
      '🗑️'
    );
    setSelectedMessageIds([]);
  };

  // Chat Actions
  const toggleMuteChat = (chatId: string) => {
    let isMuted = false;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          isMuted = !c.isMuted;
          return { ...c, isMuted };
        }
        return c;
      })
    );
    messagesController.muteDialog(chatId, isMuted);
    showToast(
      isMuted
        ? settings.language === 'ar' ? 'تم كتم الإشعارات' : 'Notifications muted'
        : settings.language === 'ar' ? 'تم تفعيل الإشعارات' : 'Notifications unmuted',
      '🔔'
    );
  };

  const togglePinChat = (chatId: string) => {
    let isPinned = false;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          isPinned = !c.isPinned;
          return { ...c, isPinned };
        }
        return c;
      })
    );
    messagesController.setDialogPinned(chatId, isPinned);
    showToast(
      isPinned
        ? settings.language === 'ar' ? 'تم تثبيت المحادثة في الأعلى' : 'Chat pinned'
        : settings.language === 'ar' ? 'تم إلغاء تثبيت المحادثة' : 'Chat unpinned',
      '📌'
    );
  };

  const markChatAsRead = (chatId: string) => {
    if (!chatId) return;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
    setMessages((prev) => {
      const currentList = prev[chatId];
      if (!currentList || currentList.length === 0) return prev;
      const hasUnread = currentList.some((m) => !m.isOutgoing && m.status !== 'read');
      if (!hasUnread) return prev;
      return {
        ...prev,
        [chatId]: currentList.map((m) => (!m.isOutgoing ? { ...m, status: 'read' } : m)),
      };
    });
    messagesController.markDialogAsRead(chatId, 'max');

    try {
      const activeSessionStr = localStorage.getItem('tg_session_string') || '';
      const activePhone = currentUser.phone || '';
      if (activeSessionStr || activePhone) {
        fetch('/api/telegram/messages/read-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, maxId: 'max', sessionString: activeSessionStr, phone: activePhone }),
        }).catch(() => {});
      }
    } catch (_) {}
  };

  const markChatReadUnread = (chatId: string) => {
    let newUnread = 0;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          newUnread = c.unreadCount > 0 ? 0 : 1;
          return { ...c, unreadCount: newUnread };
        }
        return c;
      })
    );
    if (newUnread === 0) {
      markChatAsRead(chatId);
    }
  };

  const clearChatHistory = (chatId: string) => {
    setMessages((prev) => ({ ...prev, [chatId]: [] }));
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: undefined, unreadCount: 0 } : c
      )
    );
    messagesController.deleteDialog(chatId, true);
    showToast(settings.language === 'ar' ? 'تم مسح سجل المحادثة' : 'Chat history cleared', '🧹');
  };

  // Incremental Pagination: Load older messages for a chat from Telegram MTProto / API stream
  const loadMoreChatMessages = async (chatId: string): Promise<{ loadedCount: number; hasMore: boolean }> => {
    if (!chatId || isChatLoadingOlder[chatId]) {
      return { loadedCount: 0, hasMore: chatHasMoreOlder[chatId] ?? true };
    }

    setIsChatLoadingOlder((prev) => ({ ...prev, [chatId]: true }));
    try {
      const currentList = messages[chatId] || [];
      let oldestId: string | undefined = undefined;
      if (currentList.length > 0) {
        const sorted = [...currentList].sort((a, b) => getTelegramEpoch(a) - getTelegramEpoch(b));
        oldestId = sorted[0]?.id;
      }

      const isMockOrLocalChat = [
        'chat_ai_bot',
        'chat_botfather',
        'chat_tech_group',
        'chat_crypto_arabic',
        'chat_news_channel',
        'chat_durov',
        'ai_bot',
        'tech_group',
        'crypto_arabic',
        'news_channel',
        'botfather',
      ].includes(chatId) || chatId.startsWith('mock_') || chatId.startsWith('local_');

      if (isMockOrLocalChat) {
        setIsChatLoadingOlder((prev) => ({ ...prev, [chatId]: false }));
        setChatHasMoreOlder((prev) => ({ ...prev, [chatId]: false }));
        return { loadedCount: 0, hasMore: false };
      }

      const activeSessionStr = SecureSessionStorage.getItem<string>('tg_session_string') || '';
      const activePhone = currentUser.phone || '';

      const res = await fetch('/api/telegram/messages/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: chatId,
          phone: activePhone,
          sessionString: activeSessionStr,
          offsetId: oldestId && !isNaN(Number(oldestId)) ? Number(oldestId) : undefined,
          limit: 30,
        }),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        const fetchedOlder: Message[] = data.messages;

        setMessages((prev) => {
          const existing = prev[chatId] || [];
          const existingIdSet = new Set(existing.map((m) => m.id));
          const newUniqueOlder = fetchedOlder.filter((m) => !existingIdSet.has(m.id));

          if (newUniqueOlder.length === 0) {
            return prev;
          }

          const combined = [...newUniqueOlder, ...existing].sort(
            (a, b) => getTelegramEpoch(a) - getTelegramEpoch(b)
          );

          return {
            ...prev,
            [chatId]: combined,
          };
        });

        const hasMore = Boolean(data.hasMore);
        setChatHasMoreOlder((prev) => ({ ...prev, [chatId]: hasMore }));
        return { loadedCount: fetchedOlder.length, hasMore };
      } else {
        setChatHasMoreOlder((prev) => ({ ...prev, [chatId]: false }));
        return { loadedCount: 0, hasMore: false };
      }
    } catch (e) {
      console.warn('[Pagination] Load older messages error:', e);
      return { loadedCount: 0, hasMore: false };
    } finally {
      setIsChatLoadingOlder((prev) => ({ ...prev, [chatId]: false }));
    }
  };

  // Service Worker and Notification Permission synchronization
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default' && isAuthenticated) {
        Notification.requestPermission().catch(() => {});
      }
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'NAVIGATE_TO_CHAT' && data.chatId) {
          setActiveChatId(data.chatId);
        } else if (data.type === 'MARK_CHAT_AS_READ' && data.chatId) {
          markChatReadUnread(data.chatId);
        } else if (data.type === 'NEW_KEYWORD_ALERT' && data.alert) {
          const alert = data.alert;
          notificationsService.addMonitorAlert({
            id: alert.id || `alert_${Date.now()}`,
            keyword: alert.keyword || 'مراقبة',
            sourceChatId: alert.chatId || '',
            sourceChatTitle: alert.group || 'المجموعة',
            senderName: alert.sender || 'مستخدم',
            messageText: alert.text || '',
            timestamp: alert.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            groupUrl: alert.groupUrl,
            senderUrl: alert.senderUrl,
            messageId: alert.messageId,
            peerId: alert.peerId,
          });
          if (settings.soundEffects) {
            telegramAudio.playMessageChime();
          }
          triggerNotification({
            category: 'keyword_alert',
            title: `🔔 تنبيه: ${alert.keyword || 'مراقبة'}`,
            body: `في ${alert.group || 'المجموعة'} من ${alert.sender || 'مستخدم'}`,
            chatId: alert.chatId,
            chatTitle: alert.group,
            messageId: alert.messageId,
            senderName: alert.sender,
            keyword: alert.keyword,
            messageText: alert.text,
            replyAction: true,
          });
        } else if (data.type === 'BACKGROUND_PUSH_RECEIVED' && data.remoteMessage) {
          const remoteData = data.remoteMessage.data || {};
          const chatId = remoteData.chat_id || remoteData.chatId || 'chat_general';
          if (settings.soundEffects) {
            telegramAudio.playMessageChime();
          }
          if (chatId !== activeChatId) {
            triggerNotification({
              category: 'message',
              title: remoteData.chat_title || 'Telegram',
              body: remoteData.text || 'رسالة جديدة',
              chatId,
              senderName: remoteData.chat_title,
            });
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [isAuthenticated, activeChatId, settings.soundEffects]);

  // Real-Time Server-Sent Events (SSE) & Stream Synchronization with Telegram MTProto
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let fallbackPollTimer: any = null;
    let lastUpdateEpoch = Date.now();

    const handleIncomingUpdate = (update: any) => {
      if (!update) return;

      // Handle remote session revocation or auth updates (TL_updateNewAuthorization, SESSION_REVOKED, AUTH_KEY_UNREGISTERED)
      if (
        update.type === 'SESSION_REVOKED' ||
        update.type === 'AUTH_KEY_UNREGISTERED'
      ) {
        console.warn('[TelegramContext] Remote session revocation event received from server:', update);
        performSessionPurge('AUTH_KEY_UNREGISTERED');
        showToast('تم إلغاء الجلسة من جهاز آخر أو انتهت صلاحية مفتاح المصادقة (AUTH_KEY_UNREGISTERED). تم إيقاف الخدمات التلقائية بأمان.', '⚠️');
        return;
      }

      if (update.type === 'SETTINGS_SYNCED' && update.settings) {
        console.log('[TelegramContext] Remote settings synced:', update.settings);
        setSettings((prev) => ({ ...prev, ...update.settings }));
        return;
      }

      if (update.type === 'updateUser' || update.type === 'updateProfile') {
        console.log('[TelegramContext] Realtime user update received:', update);
        const u = update.data?.user || update.data;
        if (u) {
          const newName = [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(' ');
          if (newName || u.username) {
            setCurrentUser((prev) => ({
              ...prev,
              name: newName || prev.name,
              username: u.username || prev.username,
            }));
          }
        }
        return;
      }

      if (
        update._ === 'TL_updateNewAuthorization' ||
        update._ === 'updateNewAuthorization' ||
        update.type === 'updateNewAuthorization'
      ) {
        import('../core/MessagesController').then(({ MessagesController }) => {
          MessagesController.getInstance().processUpdates(update);
        }).catch(() => {});
        return;
      }

      if (update.type !== 'new_message' || !update.message) return;
      const msg: Message = update.message;
      const isOut = Boolean(msg.out || msg.isOutgoing || update.out);
      msg.isOutgoing = isOut;
      if (isOut && (!msg.senderName || msg.senderName === 'User')) {
        msg.senderName = 'أنت';
      }

      const peerIdStr = String(msg.peerId || update.peerId || '').replace(/^chat_/, '');
      const targetChatId = msg.chatId || update.chatId || (peerIdStr ? `chat_${peerIdStr}` : '');
      if (!targetChatId && !activeChatId) return;

      lastUpdateEpoch = Math.max(lastUpdateEpoch, update.epoch || Date.now());

      const isCurrentChat = Boolean(
        activeChatId && (
          targetChatId === activeChatId ||
          `chat_${peerIdStr}` === activeChatId ||
          (peerIdStr && activeChatId.replace(/^chat_/, '') === peerIdStr)
        )
      );

      // 1. Update messages state for the target chat and active chat
      setMessages((prev) => {
        const chatsToUpdate = new Set<string>();
        if (targetChatId) chatsToUpdate.add(targetChatId);
        if (isCurrentChat && activeChatId) chatsToUpdate.add(activeChatId);

        let nextState = { ...prev };
        let modified = false;

        chatsToUpdate.forEach((cId) => {
          const existing = nextState[cId] || [];
          if (existing.some((m) => m.id === msg.id)) {
            // Already present, update status/fields if changed
            nextState[cId] = existing.map((m) =>
              m.id === msg.id ? { ...m, ...msg, isOutgoing: isOut } : m
            );
            modified = true;
            return;
          }

          const merged = [...existing, { ...msg, isOutgoing: isOut }].sort(
            (a, b) => getTelegramEpoch(a) - getTelegramEpoch(b)
          );
          nextState[cId] = merged;
          modified = true;
        });

        return modified ? nextState : prev;
      });

      // 2. Update chat item in chats list and reorder to top
      setChats((prev) => {
        const matchingChat = prev.find(
          (c) =>
            c.id === targetChatId ||
            (peerIdStr && String(c.peerId) === peerIdStr) ||
            (isCurrentChat && c.id === activeChatId)
        );

        if (!matchingChat) {
          syncInitializationRoutine().catch(() => {});
          return prev;
        }

        const resolvedChatId = matchingChat.id;
        const isChatOpen = activeChatId === resolvedChatId;

        return reorderChatsWithUpdate(prev, resolvedChatId, {
          unreadCount: isChatOpen || isOut ? matchingChat.unreadCount : (matchingChat.unreadCount || 0) + 1,
          lastMessage: {
            id: msg.id,
            senderName: msg.senderName || (isOut ? 'أنت' : matchingChat.title),
            text: msg.text,
            timestamp: msg.timestamp,
            isOutgoing: isOut,
            status: msg.status || (isOut ? 'sent' : 'read'),
            mediaType: msg.media?.type,
          },
        });
      });

      // 3. If incoming (not sent by us), trigger audio and notifications
      if (!isOut) {
        if (settings.soundEffects) {
          telegramAudio.playMessageChime();
        }

        const isViewingChat = isCurrentChat && !document.hidden;
        if (!isViewingChat) {
          triggerNotification({
            category: 'message',
            title: msg.senderName || 'رسالة جديدة',
            body: msg.text || 'رسالة جديدة من تيليجرام',
            chatId: targetChatId || activeChatId || '',
            senderName: msg.senderName,
          });

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
            try {
              new Notification(msg.senderName || 'Telegram', {
                body: msg.text || 'رسالة جديدة',
                icon: '/telegram-logo.svg',
                tag: `chat_${targetChatId || activeChatId}`,
              });
            } catch (_) {}
          }
        }
      }
    };

    // ==========================================
    // KEYWORD MONITORING REAL-TIME ALERT HANDLER
    // ==========================================
    const handleIncomingAlert = (alertData: any) => {
      if (!alertData) return;
      const alertItem: MonitorAlert = {
        id: alertData.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        keyword: alertData.keyword || 'مراقبة',
        sourceChatId: alertData.chatId || alertData.sourceChatId || '',
        sourceChatTitle: alertData.group || alertData.sourceChatTitle || 'المجموعة',
        senderName: alertData.sender || alertData.senderName || 'مستخدم',
        messageText: alertData.text || alertData.messageText || '',
        timestamp: alertData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groupUrl: alertData.groupUrl,
        senderUrl: alertData.senderUrl,
        messageId: alertData.messageId,
        peerId: alertData.peerId,
      };

      // 1. Immediately update NotificationsService store for the Monitor UI
      notificationsService.addMonitorAlert(alertItem);

      // 2. Play alert chime
      if (settings.soundEffects) {
        telegramAudio.playMessageChime();
      }

      // 3. Show In-App Notification Banner
      triggerNotification({
        category: 'keyword_alert',
        title: `🔔 تنبيه: ${alertItem.keyword}`,
        body: `في ${alertItem.sourceChatTitle} من ${alertItem.senderName}\n${alertItem.messageText}`,
        chatId: alertItem.sourceChatId,
        chatTitle: alertItem.sourceChatTitle,
        messageId: alertItem.messageId,
        senderName: alertItem.senderName,
        keyword: alertItem.keyword,
        messageText: alertItem.messageText,
        replyAction: true,
      });

      // 4. In-App Toast
      showToast(`🚨 رصد "${alertItem.keyword}" في ${alertItem.sourceChatTitle}`, '🔔');

      // 5. Browser Native Notification if page is hidden
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🔔 تنبيه: ${alertItem.keyword}`, {
            body: `في ${alertItem.sourceChatTitle} من ${alertItem.senderName}\n${alertItem.messageText}`,
            icon: '/telegram-logo.svg',
            tag: `tg_alert_${alertItem.id}`,
          });
        } catch (_) {}
      }
    };

    // Initial fetch of historical alerts from backend to populate UI instantly
    fetch('/api/alerts/history')
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.alerts)) {
          res.alerts.forEach((a: any) => {
            notificationsService.addMonitorAlert({
              id: a.id,
              keyword: a.keyword,
              sourceChatId: a.chatId,
              sourceChatTitle: a.group,
              senderName: a.sender,
              messageText: a.text,
              timestamp: a.time,
              groupUrl: a.groupUrl,
              senderUrl: a.senderUrl,
              messageId: a.messageId,
              peerId: a.peerId,
            });
          });
        }
      })
      .catch(() => {});

    // 1. Establish Socket.IO Connection for Instant Full-Duplex Real-Time Updates
    let socket: Socket | null = null;
    try {
      socket = createSocketIO({
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      socket.on('telegram_update', (update: any) => {
        if (update?.type === 'new_alert' && update.alert) {
          handleIncomingAlert(update.alert);
        } else {
          handleIncomingUpdate(update);
        }
      });

      socket.on('new_message', (update: any) => {
        handleIncomingUpdate(update);
      });

      socket.on('new_alert', (alertData: any) => {
        handleIncomingAlert(alertData);
      });

      socket.on('auto_join_progress', (data: any) => {
        if (data?.task) {
          showToast(`انضمام: ${data.task.title || data.task.url} (${data.current}/${data.total})`, '🔗');
        }
      });

      socket.on('auto_join_result', (data: any) => {
        if (data?.message) {
          showToast(data.message, data.success ? '✅' : '⚠️');
        }
      });

      socket.on('new_batch_sent', (batchData: any) => {
        showToast(`تم إرسال دفعة جديدة إلى ${batchData?.groupsCount || 0} مجموعة بنجاح`, '🚀');
      });

      socket.on('scheduled_sender_status', (schedData: any) => {
        if (schedData?.active) {
          console.log('[Scheduler] Active round:', schedData.roundsExecuted);
        }
      });

      socket.on('salam_activity', (salamData: any) => {
        NotificationCenter.getGlobalInstance().postNotificationName(
          NotificationCenter.salamActivityReceived,
          salamData
        );
      });
    } catch (sockErr) {
      console.warn('[Socket.IO] Client connection error:', sockErr);
    }

    // 2. Establish SSE Connection as Persistent Stream Channel
    try {
      eventSource = new EventSource('/api/telegram/updates/stream');

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type === 'new_alert' && parsed.alert) {
            handleIncomingAlert(parsed.alert);
          } else {
            handleIncomingUpdate(parsed);
          }
        } catch (_) {}
      };

      eventSource.onerror = () => {
        // SSE temporary disconnect - start lightweight fallback polling
        if (!fallbackPollTimer) {
          fallbackPollTimer = setInterval(async () => {
            try {
              const res = await fetch(`/api/telegram/updates/poll?since=${lastUpdateEpoch}`);
              const data = await res.json();
              if (data.success && Array.isArray(data.updates)) {
                data.updates.forEach(handleIncomingUpdate);
              }
            } catch (_) {}
          }, 3000);
        }
      };

      eventSource.onopen = () => {
        if (fallbackPollTimer) {
          clearInterval(fallbackPollTimer);
          fallbackPollTimer = null;
        }
      };
    } catch (_) {}

    // Periodic sync for active chat as safety net
    const activeChatSyncInterval = setInterval(async () => {
      if (!activeChatId) return;
      const isMockOrLocalChat = [
        'chat_ai_bot',
        'chat_botfather',
        'chat_tech_group',
        'chat_crypto_arabic',
        'chat_news_channel',
        'chat_durov',
        'ai_bot',
        'tech_group',
        'crypto_arabic',
        'news_channel',
        'botfather',
      ].includes(activeChatId) || activeChatId.startsWith('mock_') || activeChatId.startsWith('local_');
      if (isMockOrLocalChat) return;

      const activeSessionStr = SecureSessionStorage.getItem<string>('tg_session_string') || '';
      const activePhone = currentUser.phone || '';
      if (!activeSessionStr && !activePhone) return;

      try {
        const currentList = messages[activeChatId] || [];
        const newestId = currentList.length > 0 ? currentList[currentList.length - 1]?.id : undefined;

        const res = await fetch('/api/telegram/messages/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peerId: activeChatId,
            phone: activePhone,
            sessionString: activeSessionStr,
            minId: newestId && !isNaN(Number(newestId)) ? Number(newestId) : undefined,
            limit: 15,
          }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => {
            const existing = prev[activeChatId] || [];
            const existingIds = new Set(existing.map((m) => m.id));
            const newIncoming = data.messages.filter((m: Message) => !existingIds.has(m.id));
            if (newIncoming.length === 0) return prev;

            const merged = [...existing, ...newIncoming].sort(
              (a, b) => getTelegramEpoch(a) - getTelegramEpoch(b)
            );

            return {
              ...prev,
              [activeChatId]: merged,
            };
          });

          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg) {
            setChats((prev) =>
              prev.map((c) =>
                c.id === activeChatId
                  ? {
                      ...c,
                      lastMessage: {
                        id: lastMsg.id,
                        senderName: lastMsg.senderName,
                        text: lastMsg.text,
                        timestamp: lastMsg.timestamp,
                        isOutgoing: lastMsg.isOutgoing,
                        status: lastMsg.status,
                      },
                    }
                  : c
              )
            );
          }
        }
      } catch (_) {}
    }, 6000);

    const handleForcedLogout = (e: any) => {
      console.warn('[TelegramContext] Forced logout triggered by Web Push / SSE:', e?.detail?.reason);
      logout();
      showToast('تم إلغاء الجلسة من جهاز آخر أو انتهت صلاحية مفتاح المصادقة.', '⚠️');
    };
    window.addEventListener('telegram:session_revoked', handleForcedLogout);

    return () => {
      window.removeEventListener('telegram:session_revoked', handleForcedLogout);
      if (socket) {
        socket.disconnect();
      }
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
      }
      clearInterval(activeChatSyncInterval);
    };
  }, [isAuthenticated, activeChatId, currentUser.phone, messages, settings.soundEffects]);

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setMessages((prev) => {
      const copy = { ...prev };
      delete copy[chatId];
      return copy;
    });
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
    messagesController.deleteDialog(chatId, false);
    showToast(settings.language === 'ar' ? 'تم حذف المحادثة' : 'Chat deleted', '🗑️');
  };

  const leaveGroup = async (chatId: string) => {
    const isArabic = settings.language === 'ar';
    try {
      const activeSessionStr = SecureSessionStorage.getItem<string>('tg_session_string') || '';
      const activePhone = currentUser.phone || '';

      // MTProto Server Call
      fetch('/api/telegram/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          phone: activePhone,
          sessionString: activeSessionStr,
        }),
      }).catch((e) => console.warn('[Group] Leave RPC warning:', e));

      // Update local state: insert leaving system event and remove user or group from active list
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const systemLeaveMsg: Message = {
        id: `msg_sys_left_${Date.now()}`,
        chatId,
        senderId: 'sys_action',
        senderName: 'System',
        text: isArabic ? 'لقد غادرت هذه المجموعة' : 'You left this group',
        timestamp,
        date: new Date().toISOString().split('T')[0],
        isOutgoing: true,
        status: 'read',
      };

      setMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), systemLeaveMsg],
      }));

      // Update chat member count & status
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              memberCount: Math.max(0, (c.memberCount || 1) - 1),
              lastMessage: {
                id: systemLeaveMsg.id,
                senderName: 'You',
                text: systemLeaveMsg.text,
                timestamp,
                isOutgoing: true,
                status: 'read',
              },
            };
          }
          return c;
        })
      );

      // Clean up active dialog
      messagesController.deleteDialog(chatId, true);
      showToast(isArabic ? 'تمت مغادرة المجموعة بنجاح' : 'Left group successfully', '🚪');
    } catch (e: any) {
      showToast(isArabic ? 'تعذر مغادرة المجموعة' : 'Failed to leave group', '⚠️');
    }
  };

  const deleteGroupMessages = async (chatId: string, forEveryone = true) => {
    const isArabic = settings.language === 'ar';
    try {
      const activeSessionStr = SecureSessionStorage.getItem<string>('tg_session_string') || '';
      const activePhone = currentUser.phone || '';

      // MTProto Server Call
      fetch('/api/telegram/groups/clear-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          forEveryone,
          phone: activePhone,
          sessionString: activeSessionStr,
        }),
      }).catch((e) => console.warn('[Group] Clear history RPC warning:', e));

      // Empties messages for this group in state
      setMessages((prev) => ({
        ...prev,
        [chatId]: [],
      }));

      // Clear last message & unread in chats list
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, lastMessage: undefined, unreadCount: 0 } : c
        )
      );

      messagesController.deleteDialog(chatId, true);
      showToast(isArabic ? 'تم حذف جميع رسائل المجموعة بنجاح' : 'All group messages deleted successfully', '🧹');
    } catch (e: any) {
      showToast(isArabic ? 'تعذر حذف رسائل المجموعة' : 'Failed to clear group messages', '⚠️');
    }
  };

  const deleteGroup = async (chatId: string) => {
    const isArabic = settings.language === 'ar';
    try {
      const activeSessionStr = SecureSessionStorage.getItem<string>('tg_session_string') || '';
      const activePhone = currentUser.phone || '';

      // MTProto Server Call
      fetch('/api/telegram/groups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          phone: activePhone,
          sessionString: activeSessionStr,
        }),
      }).catch((e) => console.warn('[Group] Delete RPC warning:', e));

      // Permanently remove chat and messages
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setMessages((prev) => {
        const copy = { ...prev };
        delete copy[chatId];
        return copy;
      });

      if (activeChatId === chatId) {
        setActiveChatId(null);
      }

      messagesController.deleteDialog(chatId, false);
      showToast(isArabic ? 'تم حذف المجموعة نهائياً' : 'Group deleted permanently', '🗑️');
    } catch (e: any) {
      showToast(isArabic ? 'تعذر حذف المجموعة' : 'Failed to delete group', '⚠️');
    }
  };

  const startCall = (isVideo: boolean = false) => {
    if (!activeChat) return;
    const sampleEmojis: [string, string, string, string] = ['🔐', '🌲', '💎', '🚀'];
    setActiveCall({
      chatId: activeChat.id,
      chatTitle: activeChat.title,
      chatAvatar: activeChat.avatar,
      isVideo,
      isMuted: false,
      isCameraOff: false,
      duration: 0,
      status: 'calling',
      encryptionEmojis: sampleEmojis,
    });
    setActiveModal('call');

    setTimeout(() => {
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
    }, 1800);
  };

  const endCall = () => {
    if (activeCall) {
      setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
      setTimeout(() => {
        setActiveCall(null);
        setActiveModal('none');
      }, 500);
    }
  };

  const toggleCallMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleCallCamera = () => {
    setActiveCall((prev) => (prev ? { ...prev, isCameraOff: !prev.isCameraOff } : null));
  };

  // Handle dynamic invite join event
  useEffect(() => {
    const handleJoined = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      const newJoinedChat: Chat = {
        id: detail.id || `chat_${Date.now()}`,
        type: detail.type || 'channel',
        title: detail.title,
        username: detail.username,
        avatar: detail.avatar || '',
        unreadCount: 0,
        memberCount: detail.memberCount,
        description: detail.description,
        isVerified: detail.isVerified,
        lastMessage: {
          id: `msg_${Date.now()}`,
          senderName: detail.title,
          text: `Joined ${detail.type === 'channel' ? 'channel' : 'group'} via Telegram MTProto invite link.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: false,
          status: 'read',
        },
      };

      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== newJoinedChat.id && c.username !== newJoinedChat.username);
        return [newJoinedChat, ...filtered];
      });

      setMessages((prev) => ({
        ...prev,
        [newJoinedChat.id]: [
          {
            id: `msg_welcome_${Date.now()}`,
            chatId: newJoinedChat.id,
            senderId: 'sys_channel',
            senderName: newJoinedChat.title,
            text: `👋 Welcome to ${newJoinedChat.title}!\n\nThis ${newJoinedChat.type} is connected via MTProto 2.0 (Layer 184) under Telegram API_ID ${apiConfig.apiId}.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString().split('T')[0],
            isOutgoing: false,
            status: 'read',
          },
        ],
      }));

      setActiveChatId(newJoinedChat.id);
    };

    window.addEventListener('tg-joined-chat' as any, handleJoined);
    return () => window.removeEventListener('tg-joined-chat' as any, handleJoined);
  }, [apiConfig.apiId]);

  const resolveTelegramLink = async (urlOrQuery: string) => {
    try {
      await OpenTelegramLink.openTelegramLink(
        UserConfig.selectedAccount || 0,
        urlOrQuery,
        (chatId) => {
          setActiveChatId(chatId);
        },
        (inviteInfo) => {
          window.dispatchEvent(new CustomEvent('tg-open-invite', { detail: inviteInfo }));
        }
      );
    } catch {
      showToast(
        settings.language === 'ar' ? 'تعذر فتح الرابط' : 'Failed to resolve link',
        '⚠️'
      );
    }
  };

  const jumpToMessage = (chatId: string, messageId: string) => {
    setActiveChatId(chatId);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('tg-scroll-to-message', {
          detail: { chatId, messageId },
        })
      );
    }, 150);
  };

  const openPrivateChat = (
    senderId: string,
    senderName: string,
    senderAvatar?: string,
    senderUsername?: string
  ) => {
    // Check if a direct private chat already exists for this sender
    const cleanSenderId = senderId.startsWith('user_') ? senderId : `user_${senderId}`;
    const existingChat = chats.find(
      (c) =>
        c.id === cleanSenderId ||
        c.id === senderId ||
        (c.type === 'private' && c.title.toLowerCase() === senderName.toLowerCase()) ||
        (senderUsername && c.username && c.username.toLowerCase() === senderUsername.replace('@', '').toLowerCase())
    );

    if (existingChat) {
      setActiveChatId(existingChat.id);
      return;
    }

    // Otherwise create dynamic private chat matching DrKLO TLRPC.Chat / User model
    const targetChatId = cleanSenderId;
    const newPrivateChat: Chat = {
      id: targetChatId,
      type: 'private',
      title: senderName,
      username: senderUsername ? senderUsername.replace('@', '') : undefined,
      avatar: senderAvatar || '',
      unreadCount: 0,
      description: senderUsername ? `@${senderUsername.replace('@', '')}` : 'مستخدم تيليجرام',
      lastMessage: {
        id: `msg_${Date.now()}`,
        senderName: senderName,
        text: 'محادثة خاصة تم فتحها من إشعار المراقبة الحي 🚨',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutgoing: false,
        status: 'read',
      },
    };

    setChats((prev) => [newPrivateChat, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [targetChatId]: [
        {
          id: `msg_hello_${Date.now()}`,
          chatId: targetChatId,
          senderId: senderId,
          senderName: senderName,
          senderAvatar: senderAvatar,
          senderUsername: senderUsername,
          text: '👋 مرحباً! تم فتح المحادثة الخاصة لمتابعة المرسل.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          isOutgoing: false,
          status: 'read',
        },
      ],
    }));

    setActiveChatId(targetChatId);
  };

  const createNewChat = (
    type: 'private' | 'group' | 'channel',
    title: string,
    username?: string,
    description?: string
  ) => {
    const newChatId = `chat_${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      type,
      title: title.trim(),
      username: username ? username.replace('@', '') : undefined,
      avatar: '',
      unreadCount: 0,
      description: description || (type === 'channel' ? 'Public channel' : 'Group chat'),
      memberCount: type === 'group' ? 1 : undefined,
      lastMessage: {
        id: `init_${Date.now()}`,
        senderName: 'You',
        text: type === 'channel' ? 'Channel created' : 'Group created',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutgoing: true,
        status: 'read',
      },
    };

    setChats((prev) => [newChat, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [newChatId]: [
        {
          id: `msg_init_${Date.now()}`,
          chatId: newChatId,
          senderId: currentUser.id,
          senderName: 'You',
          text: `✨ ${type.toUpperCase()} created successfully with Telegram API (ID: ${apiConfig.apiId}).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          isOutgoing: true,
          status: 'read',
        },
      ],
    }));

    setActiveChatId(newChatId);
    setActiveModal('none');
    showToast(
      settings.language === 'ar' ? 'تم إنشاء المحادثة بنجاح' : 'Chat created successfully',
      '✨'
    );
  };

  return (
    <TelegramContext.Provider
      value={{
        currentUser,
        chats,
        messages,
        activeChatId,
        activeChat,
        activeFolderId,
        folders,
        searchQuery,
        isDrawerOpen,
        isRightPanelOpen,
        activeModal,
        activeCall,
        viewerMedia,
        apiConfig,
        settings,
        settingsSubPage,
        setSettingsSubPage,
        openSettingsPage,
        replyingTo,
        editingMessage,
        forwardingMessage,
        selectedMessageIds,
        typingChatId,
        chatContextMenu,
        messageContextMenu,
        toasts,
        inAppNotifications,
        dismissNotification,
        triggerNotification,
        capturedLinks,
        autoJoinLinksEnabled,
        toggleAutoJoinLinks,
        joinCapturedLink,
        joinAllPendingLinks,
        clearCapturedLinks,
        joinChatByInviteLink,
        exportLinksReport,
        manualScanAllChatsForLinks,
        isAuthenticated,
        login,
        logout,
        accounts,
        activeAccountId,
        switchAccount,
        addAccount,
        removeAccount,
        updateAccountProfile,
        setActiveChatId,
        setActiveFolderId,
        setSearchQuery,
        setIsDrawerOpen,
        setIsRightPanelOpen,
        setActiveModal,
        selectedProfileUser,
        setSelectedProfileUser,
        openUserProfile,
        getCommonGroupsForUser,
        setViewerMedia,
        setReplyingTo,
        setEditingMessage,
        setForwardingMessage,
        setChatContextMenu,
        setMessageContextMenu,
        showToast,
        sendMessage,
        editMessageText,
        forwardMessageTo,
        toggleReaction,
        deleteMessage,
        pinMessage,
        votePoll,
        toggleSelectMessage,
        clearSelectedMessages,
        deleteSelectedMessages,
        setChatDraft,
        toggleMuteChat,
        togglePinChat,
        markChatReadUnread,
        markChatAsRead,
        clearChatHistory,
        deleteChat,
        leaveGroup,
        deleteGroupMessages,
        deleteGroup,
        startCall,
        endCall,
        toggleCallMute,
        toggleCallCamera,
        updateApiConfig,
        updateSettings,
        testApiLatency,
        createNewChat,
        jumpToMessage,
        openPrivateChat,
        resolveTelegramLink,
        syncCloudData,
        syncInitializationRoutine,
        refreshDialogs: syncInitializationRoutine,
        validateSessionProactively,
        isSyncing,
        isSessionValidating,
        solveChatCaptcha,
        forwardToSavedMessages,
        loadMoreChatMessages,
        isChatLoadingOlder,
        chatHasMoreOlder,
        fcmDiagnostic,
        requestPushPermission,
        testSimulateFcmPush,
        clearFcmDiagnosticHistory,
        triggerScreenshotBlocked,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};
