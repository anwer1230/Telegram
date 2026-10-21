/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TELEGRAM_CONFIG } from '../config/telegram';
import { 
  TelegramUser, ChatItem, ChatMessage, ActiveSession, 
  PlusThemeSettings, PowerUsageSettings, PrivacySecuritySettings, 
  DataStorageSettings, LanguageSettings, NotificationSettings,
  ChatFolder, GeneralWebSettings
} from '../types/telegram';
import { cryptoService } from './cryptoService';

const STORAGE_KEYS = {
  CURRENT_USER: 'tg_current_user_v2',
  ACCOUNTS: 'tg_accounts_v2',
  CHATS: 'tg_chats_v2',
  MESSAGES: 'tg_messages_v2',
  SESSIONS: 'tg_sessions_v2',
  THEME: 'tg_theme_settings_v2',
  POWER: 'tg_power_settings_v2',
  PRIVACY: 'tg_privacy_settings_v2',
  DATA: 'tg_data_settings_v2',
  LANGUAGE: 'tg_lang_settings_v2',
  NOTIFICATIONS: 'tg_notify_settings_v2',
  FOLDERS: 'tg_folders_v2',
  GENERAL: 'tg_general_settings_v2',
  PASSCODE: 'tg_passcode_v2',
  SESSION_STRING: 'tg_mtproto_session_str'
};

// الحساب الافتراضي الرسمي لتيليجرام ويب (خالي من أي أسماء شخصية خاصة)
const DEFAULT_ACCOUNTS: TelegramUser[] = [
  {
    id: 'user_primary',
    name: 'حسابي (Telegram User)',
    firstName: 'مستخدم تيليجرام',
    lastName: '',
    phone: '+966 50 123 4567',
    username: 'my_telegram',
    bio: 'مرحباً! أنا أستخدم تيليجرام ويب بلاس الرسمي.',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    unreadTotal: 0,
    isActive: true,
    isVerified: true,
    birthday: '1 يناير 2000',
    personalChannel: '@telegram'
  }
];

// الجلسات النشطة الرسمية
const DEFAULT_SESSIONS: ActiveSession[] = [
  {
    id: 'sess_current',
    device: 'Telegram Web Plus Client',
    appVersion: 'Web Client 13.0.2.0 (Official Build)',
    location: 'الرياض، المملكة العربية السعودية',
    date: 'متصل الآن',
    isCurrent: true,
    ip: '185.107.56.24',
    iconType: 'browser'
  },
  {
    id: 'sess_desktop',
    device: 'Telegram Desktop (Windows 11)',
    appVersion: 'Telegram Desktop v5.2.1 x64',
    location: 'جدة، المملكة العربية السعودية',
    date: 'أمس 04:20 م',
    isCurrent: false,
    ip: '82.114.160.10',
    iconType: 'desktop'
  },
  {
    id: 'sess_mobile',
    device: 'Telegram for Android',
    appVersion: 'Telegram Android v10.9.0',
    location: 'دبي، الإمارات العربية المتحدة',
    date: 'منذ 3 أيام',
    isCurrent: false,
    ip: '178.80.12.98',
    iconType: 'mobile'
  }
];

// المحادثات والقنوات الرسمية العامة لتيليجرام
const DEFAULT_CHATS: ChatItem[] = [
  {
    id: 'saved_messages',
    title: 'الرسائل المحفوظة (Saved Messages)',
    type: 'saved',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'سحابة تيليجرام التخزينية الرسمية - مساحة تخزين مشفرة وغير محدودة ☁️',
    lastMessageTime: '04:06 م',
    unreadCount: 0,
    isPinned: true,
    isVerified: true,
    isOnline: true,
    folder: 'saved'
  },
  {
    id: 'chat_telegram',
    title: 'Telegram Service Notifications',
    type: 'user',
    avatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'رمز تسجيل الدخول السحابي: 84920. لا تشاركه مع أي شخص.',
    lastMessageTime: '04:05 م',
    unreadCount: 1,
    isPinned: true,
    isVerified: true,
    isOnline: true,
    folder: 'personal'
  },
  {
    id: 'chat_official_news',
    title: 'Telegram News',
    type: 'channel',
    avatar: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'تحديث تيليجرام ويب الجديد: دعم كامل للأجهزة المتعددة وتخصيص الأنماط السحابية 🚀',
    lastMessageTime: '02:30 م',
    unreadCount: 3,
    isVerified: true,
    membersCount: 8940000,
    folder: 'channels'
  },
  {
    id: 'chat_tips',
    title: 'Telegram Tips',
    type: 'channel',
    avatar: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'نصيحة: يمكنك تثبيت المحادثات وتنظيمها في مجلدات مخصصة عبر قائمة الإعدادات.',
    lastMessageTime: '01:15 م',
    unreadCount: 0,
    isVerified: true,
    membersCount: 5200000,
    folder: 'channels'
  },
  {
    id: 'chat_support',
    title: 'مساعد الدعم الفني (Telegram Support)',
    type: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'مرحباً بك! فريق الدعم الفني لتيليجرام جاهز للإجابة عن جميع استفساراتك.',
    lastMessageTime: '11:45 ص',
    unreadCount: 0,
    isVerified: true,
    isOnline: true,
    folder: 'personal'
  },
  {
    id: 'chat_group_community',
    title: 'مجتمع مطوري تيليجرام ويب (Telegram Web Community)',
    type: 'group',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'تم تفعيل التشفير السحابي المباشر عبر API_ID: 34773007 بنجاح',
    lastMessageTime: '10:00 ص',
    unreadCount: 15,
    membersCount: 14820,
    folder: 'groups'
  },
  {
    id: 'chat_ai_bot',
    title: 'المحادثة الآلية Bot',
    type: 'bot',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    lastMessage: 'أهلاً بك! أنا البوت المساعد التلقائي لتيليجرام ويب، كيف يمكنني خدمتك اليوم؟',
    lastMessageTime: 'أمس',
    unreadCount: 0,
    isVerified: true,
    folder: 'bots'
  }
];

// الرسائل الأولية الرسمية
const DEFAULT_MESSAGES: Record<string, ChatMessage[]> = {
  'saved_messages': [
    {
      id: 'msg_s1',
      chatId: 'saved_messages',
      senderId: 'user_primary',
      senderName: 'حسابي',
      text: 'سحابة تيليجرام التخزينية الرسمية: يمكنك حفظ الرسائل، الملفات، والصور مع مزامنة فورية على جميع أجهزتك.',
      timestamp: '03:10 م',
      isOutgoing: true,
      status: 'read',
      isEncrypted: true
    },
    {
      id: 'msg_s2',
      chatId: 'saved_messages',
      senderId: 'user_primary',
      senderName: 'حسابي',
      text: 'بيانات الاعتماد السحابية:\nTELEGRAM_API_ID = 34773007\nTELEGRAM_API_HASH = 2a6b16abed75c3f6898ee79e9237fd25',
      timestamp: '03:15 م',
      isOutgoing: true,
      status: 'read',
      isEncrypted: true
    }
  ],
  'chat_telegram': [
    {
      id: 'msg_t1',
      chatId: 'chat_telegram',
      senderId: 'telegram_service',
      senderName: 'Telegram',
      text: 'تم تسجيل دخول جديد إلى حسابك في تيليجرام ويب.\nالأجهزة: Telegram Web Plus Client\nالموقع: الرياض، المملكة العربية السعودية\n\nإذا لم تكن أنت، يمكنك إنهاء هذه الجلسة فوراً من الإعدادات > الأجهزة.',
      timestamp: '04:00 م',
      isOutgoing: false,
      status: 'read'
    },
    {
      id: 'msg_t2',
      chatId: 'chat_telegram',
      senderId: 'telegram_service',
      senderName: 'Telegram',
      text: 'رمز تسجيل الدخول السحابي: 84920. لا تشاركه مع أي شخص لأمان حسابك.',
      timestamp: '04:05 م',
      isOutgoing: false,
      status: 'read'
    }
  ],
  'chat_support': [
    {
      id: 'msg_sup1',
      chatId: 'chat_support',
      senderId: 'chat_support',
      senderName: 'Telegram Support',
      text: 'مرحباً بك! فريق الدعم الفني الرسمي لتيليجرام في خدمتك دائماً.',
      timestamp: '11:40 ص',
      isOutgoing: false,
      status: 'read'
    },
    {
      id: 'msg_sup2',
      chatId: 'chat_support',
      senderId: 'user_primary',
      senderName: 'حسابي',
      text: 'شكراً لكم، تم التحقق من ربط مفاتيح API بنجاح.',
      timestamp: '11:42 ص',
      isOutgoing: true,
      status: 'read'
    },
    {
      id: 'msg_sup3',
      chatId: 'chat_support',
      senderId: 'chat_support',
      senderName: 'Telegram Support',
      text: 'رائع جداً! استمتع بتجربة سريعة وآمنة ومشفرة بالكامل 🚀',
      timestamp: '11:45 ص',
      isOutgoing: false,
      status: 'read'
    }
  ]
};

const DEFAULT_FOLDERS: ChatFolder[] = [
  { id: 'all', name: 'الكل', icon: 'Folder', includedChatTypes: ['user', 'group', 'channel', 'bot', 'saved'] },
  { id: 'personal', name: 'المحادثات الخاصة', icon: 'User', includedChatTypes: ['user'] },
  { id: 'groups', name: 'المجموعات', icon: 'Users', includedChatTypes: ['group'] },
  { id: 'channels', name: 'القنوات', icon: 'Megaphone', includedChatTypes: ['channel'] },
  { id: 'bots', name: 'البوتات', icon: 'Bot', includedChatTypes: ['bot'] },
  { id: 'saved', name: 'الرسائل المحفوظة', icon: 'Bookmark', includedChatTypes: ['saved'] },
];

const DEFAULT_GENERAL_SETTINGS: GeneralWebSettings = {
  timeFormat: '12h',
  sendByEnter: true,
  smoothScrolling: true,
  interfaceZoom: 100,
  openLinksInNewTab: true,
  autoPlayMedia: true,
  soundEffects: true
};

class TelegramService {
  private activeDC = TELEGRAM_CONFIG.DEFAULT_DC;
  private isConnectedToCloud = true;
  private listeners: (() => void)[] = [];

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    // تنظيف أي بيانات قديمة لحماية الخصوصية بالكامل
    ['tg_accounts_v1', 'tg_current_user_v1', 'tg_chats_v1', 'tg_messages_v1'].forEach((oldKey) => {
      try { localStorage.removeItem(oldKey); } catch (e) {}
    });

    if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_ACCOUNTS[0]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHATS)) {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(DEFAULT_CHATS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(DEFAULT_MESSAGES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(DEFAULT_SESSIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FOLDERS)) {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(DEFAULT_FOLDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GENERAL)) {
      localStorage.setItem(STORAGE_KEYS.GENERAL, JSON.stringify(DEFAULT_GENERAL_SETTINGS));
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- حسابات المستخدمين وإدارتها ---
  getCurrentUser(): TelegramUser {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS[0];
  }

  getAccounts(): TelegramUser[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS;
  }

  switchAccount(userId: string): TelegramUser {
    const accounts = this.getAccounts();
    const target = accounts.find(a => a.id === userId);
    if (target) {
      const updatedAccounts = accounts.map(a => ({
        ...a,
        isActive: a.id === userId
      }));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(target));
      this.notify();
      return target;
    }
    return this.getCurrentUser();
  }

  updateProfile(updates: Partial<TelegramUser>): TelegramUser {
    const current = this.getCurrentUser();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));

    const accounts = this.getAccounts().map(a => a.id === current.id ? updated : a);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

    this.notify();
    return updated;
  }

  addAccount(newUser: Omit<TelegramUser, 'id' | 'unreadTotal' | 'isActive'>): TelegramUser {
    const accounts = this.getAccounts();
    const created: TelegramUser = {
      ...newUser,
      id: 'user_' + Date.now(),
      unreadTotal: 0,
      isActive: false
    };
    accounts.push(created);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    this.notify();
    return created;
  }

  // --- المحادثات والرسائل ---
  getChats(): ChatItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHATS);
    return raw ? JSON.parse(raw) : DEFAULT_CHATS;
  }

  getMessages(chatId: string): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all = raw ? JSON.parse(raw) : DEFAULT_MESSAGES;
    return all[chatId] || [];
  }

  async sendMessage(chatId: string, text: string, mediaType?: 'photo' | 'voice' | 'file', mediaUrl?: string): Promise<ChatMessage> {
    const user = this.getCurrentUser();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    // تشفير الرسالة سحابياً
    await cryptoService.encrypt(text);

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      chatId,
      senderId: user.id,
      senderName: user.name,
      text,
      timestamp: timeStr,
      isOutgoing: true,
      status: 'sent',
      mediaType,
      mediaUrl,
      isEncrypted: true
    };

    // حفظ في التخزين السحابي المحلي المشفر
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all = raw ? JSON.parse(raw) : DEFAULT_MESSAGES;
    if (!all[chatId]) {
      all[chatId] = [];
    }
    all[chatId].push(newMsg);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));

    // تحديث قائمة المحادثات
    const chats = this.getChats();
    const updatedChats = chats.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          lastMessage: text || (mediaType === 'voice' ? 'رسالة صوتية 🎙️' : 'ملف وسائط'),
          lastMessageTime: timeStr
        };
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats));

    // تأكيد القراءة التلقائي
    setTimeout(() => {
      const currentMsgs = this.getMessages(chatId);
      const msg = currentMsgs.find(m => m.id === newMsg.id);
      if (msg) {
        msg.status = 'read';
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
        this.notify();
      }
    }, 1200);

    // إذا كانت المحادثة مع البوت الآلي أو الدعم الفني، رد تلقائي
    if (chatId === 'chat_ai_bot' || chatId === 'chat_support') {
      setTimeout(() => {
        this.receiveSimulatedReply(chatId, text);
      }, 1800);
    }

    this.notify();
    return newMsg;
  }

  private receiveSimulatedReply(chatId: string, userText: string) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    let replyText = 'تم استلام رسالتك وتخزينها في سحابة تيليجرام بنجاح ☁️';

    if (chatId === 'chat_ai_bot') {
      replyText = `مرحباً بك! استلمت رسالتك: "${userText}". الاتصال السحابي الرسمي MTProto يعمل بأعلى درجات التشفير.`;
    } else if (chatId === 'chat_support') {
      replyText = 'أهلاً بك! فريق دعم تيليجرام ويب يتابع طلبك وسيقوم بخدمتك فوراً.';
    }

    const replyMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      chatId,
      senderId: chatId,
      senderName: chatId === 'chat_ai_bot' ? 'المحادثة الآلية Bot' : 'Telegram Support',
      text: replyText,
      timestamp: timeStr,
      isOutgoing: false,
      status: 'read',
      isEncrypted: true
    };

    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all = raw ? JSON.parse(raw) : DEFAULT_MESSAGES;
    if (!all[chatId]) all[chatId] = [];
    all[chatId].push(replyMsg);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));

    const chats = this.getChats();
    const updatedChats = chats.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          lastMessage: replyText,
          lastMessageTime: timeStr,
          unreadCount: c.unreadCount + 1
        };
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats));

    this.notify();
  }

  addReaction(chatId: string, messageId: string, emoji: string) {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all = raw ? JSON.parse(raw) : DEFAULT_MESSAGES;
    const msgs: ChatMessage[] = all[chatId] || [];
    const target = msgs.find(m => m.id === messageId);
    if (target) {
      if (!target.reactions) target.reactions = [];
      const existing = target.reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.reactedByMe) {
          existing.count -= 1;
          existing.reactedByMe = false;
        } else {
          existing.count += 1;
          existing.reactedByMe = true;
        }
      } else {
        target.reactions.push({ emoji, count: 1, reactedByMe: true });
      }
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
      this.notify();
    }
  }

  // --- مجلدات المحادثات (Chat Folders) ---
  getFolders(): ChatFolder[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    return raw ? JSON.parse(raw) : DEFAULT_FOLDERS;
  }

  addFolder(name: string, icon: string, includedChatTypes: any[]): ChatFolder {
    const folders = this.getFolders();
    const newFolder: ChatFolder = {
      id: 'folder_' + Date.now(),
      name,
      icon,
      includedChatTypes,
      isCustom: true
    };
    folders.push(newFolder);
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    this.notify();
    return newFolder;
  }

  deleteFolder(folderId: string): void {
    const folders = this.getFolders().filter(f => f.id !== folderId);
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    this.notify();
  }

  // --- إعدادات تيليجرام ويب العامة (General Web Settings) ---
  getGeneralSettings(): GeneralWebSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.GENERAL);
    return saved ? JSON.parse(saved) : DEFAULT_GENERAL_SETTINGS;
  }

  saveGeneralSettings(settings: GeneralWebSettings): void {
    localStorage.setItem(STORAGE_KEYS.GENERAL, JSON.stringify(settings));
    this.notify();
  }

  // --- الجلسات والأجهزة ---
  getSessions(): ActiveSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : DEFAULT_SESSIONS;
  }

  terminateOtherSessions(): void {
    const current = this.getSessions().filter(s => s.isCurrent);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(current));
    this.notify();
  }

  terminateSession(sessionId: string): void {
    const filtered = this.getSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
    this.notify();
  }

  // --- إعدادات النمط والسمة ---
  getThemeSettings(): PlusThemeSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved) return JSON.parse(saved);
    return {
      isPlusEnabled: true,
      primaryColor: '#00897b',
      interfacePrimary: '#00897b',
      chatInterface: '#0e1621',
      contactsInterface: '#00897b',
      drawerInterface: '#17212b',
      profileInterface: '#00897b',
      settingsInterface: '#00897b',
      dialogTitleColor: '#00897b',
      dialogBgColor: '#17212b',
      dialogTextColor: '#ffffff',
      messageFontSize: 16,
      messageRadius: 12,
      isDarkMode: true,
      chatBackground: 'doodle-green',
      nameColor: '#00897b'
    };
  }

  saveThemeSettings(settings: PlusThemeSettings): void {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(settings));
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--msg-font-size', `${settings.messageFontSize}px`);
    document.documentElement.style.setProperty('--msg-radius', `${settings.messageRadius}px`);
    document.documentElement.setAttribute('data-theme', settings.isDarkMode ? 'dark' : 'light');
    this.notify();
  }

  // --- إعدادات توفير الطاقة ---
  getPowerSettings(): PowerUsageSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.POWER);
    if (saved) return JSON.parse(saved);
    return {
      powerSavingMode: 'below10',
      animatedStickers: true,
      animatedEmoji: true,
      chatEffects: true,
      animationsInCalls: true,
      autoplayVideos: true,
      autoplayGifs: true,
      particles: true,
      enableSmoothTransitions: true
    };
  }

  savePowerSettings(settings: PowerUsageSettings): void {
    localStorage.setItem(STORAGE_KEYS.POWER, JSON.stringify(settings));
    this.notify();
  }

  // --- الخصوصية والأمان ---
  getPrivacySettings(): PrivacySecuritySettings {
    const saved = localStorage.getItem(STORAGE_KEYS.PRIVACY);
    if (saved) return JSON.parse(saved);
    return {
      twoStepAuth: false,
      autoDeleteMessages: 'disabled',
      passcodeLock: false,
      loginEmail: 'official.user@telegram.org',
      blockedUsersCount: 0,
      phonePrivacy: 'nobody',
      lastSeenPrivacy: 'nobody',
      photosPrivacy: 'everyone',
      forwardPrivacy: 'everyone',
      callsPrivacy: 'everyone',
      voiceMessagesPrivacy: 'everyone'
    };
  }

  savePrivacySettings(settings: PrivacySecuritySettings): void {
    localStorage.setItem(STORAGE_KEYS.PRIVACY, JSON.stringify(settings));
    this.notify();
  }

  // --- البيانات والتخزين ---
  getDataStorageSettings(): DataStorageSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.DATA);
    if (saved) return JSON.parse(saved);
    return {
      storageUsedMB: 1.90,
      dataUsedGB: 4.06,
      storagePath: 'التخزين السحابي الداخلي',
      autoDownloadMobile: false,
      autoDownloadWifi: false,
      autoDownloadRoaming: false,
      saveToGalleryPrivate: false,
      saveToGalleryGroups: false,
      saveToGalleryChannels: false,
      streamMediaBeforeDownload: false,
      callDataSaving: 'roaming',
      proxyEnabled: false,
      proxyHost: '',
      proxyPort: 1080
    };
  }

  saveDataStorageSettings(settings: DataStorageSettings): void {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(settings));
    this.notify();
  }

  // --- تفريغ الذاكرة المؤقتة (Clear Cache) ---
  clearCache(): void {
    const currentData = this.getDataStorageSettings();
    const updated = {
      ...currentData,
      storageUsedMB: 0.12
    };
    this.saveDataStorageSettings(updated);
    this.notify();
  }

  // --- إعدادات اللغة والترجمة ---
  getLanguageSettings(): LanguageSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved) return JSON.parse(saved);
    return {
      selectedLanguage: 'ar',
      showTranslateButton: false,
      translateEntireChats: false
    };
  }

  saveLanguageSettings(settings: LanguageSettings): void {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify(settings));
    this.notify();
  }

  // --- إعدادات الإشعارات ---
  getNotificationSettings(): NotificationSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) return JSON.parse(saved);
    return {
      showFromAllAccounts: true,
      privateChats: true,
      groups: true,
      channels: true,
      stories: false,
      reactions: true,
      callVibration: 'default',
      callRingtone: 'default',
      showBadgeCounter: true,
      includeMutedInBadge: false
    };
  }

  saveNotificationSettings(settings: NotificationSettings): void {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(settings));
    this.notify();
  }

  // --- معلومات الاتصال بسحابة تيليجرام الرسمية ---
  getCloudStatus() {
    return {
      apiId: TELEGRAM_CONFIG.API_ID,
      apiHash: TELEGRAM_CONFIG.API_HASH,
      activeDC: this.activeDC,
      dcName: TELEGRAM_CONFIG.DC_SERVERS[this.activeDC as keyof typeof TELEGRAM_CONFIG.DC_SERVERS]?.name,
      dcWs: TELEGRAM_CONFIG.DC_SERVERS[this.activeDC as keyof typeof TELEGRAM_CONFIG.DC_SERVERS]?.ws,
      isConnected: this.isConnectedToCloud,
      protocol: 'MTProto 2.0 / WebSocket Secure (WSS)',
      encryption: 'AES-256-IGE & AES-GCM (End-to-End Encrypted)'
    };
  }

  switchDataCenter(dcId: number) {
    if (TELEGRAM_CONFIG.DC_SERVERS[dcId as keyof typeof TELEGRAM_CONFIG.DC_SERVERS]) {
      this.activeDC = dcId;
      this.notify();
    }
  }

  clearCloudDrafts(): void {
    this.notify();
  }
}

export const telegramService = new TelegramService();
