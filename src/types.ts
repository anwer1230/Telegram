export type ChatType = 'private' | 'group' | 'channel' | 'bot' | 'saved';

export interface User {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
  bio?: string;
  isVerified?: boolean;
  isBot?: boolean;
  isPremium?: boolean;
  premiumBadges?: string[];
  sessionString?: string;
}

export interface ProfileUserInfo {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
  isBot?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  isPremium?: boolean;
  sourceChatId?: string;
  sourceChatTitle?: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  timestamp: string;
  expiresAt: number;
  viewsCount: number;
  isViewed: boolean;
  isMyStory?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs who reacted
  isLottie?: boolean;
}

export interface ReplyInfo {
  messageId: string;
  senderName: string;
  textSnippet: string;
  mediaType?: 'photo' | 'audio' | 'document' | 'video';
}

export interface ForwardInfo {
  fromChatName: string;
  fromChatId?: string;
  originalDate?: string;
}

export interface MessageMedia {
  type: 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'poll' | 'video_note';
  url?: string;
  fileName?: string;
  fileSize?: string;
  duration?: number; // for audio/voice in seconds
  waveform?: number[]; // waveform amplitudes (0..100)
  aspectRatio?: number;
  isLottie?: boolean;
  lottieData?: any;
  stickerId?: string;
  packName?: string;
  pollData?: {
    question: string;
    options: { id: string; text: string; votes: number; voters: string[] }[];
    totalVotes: number;
    isClosed?: boolean;
    isMultipleAnswers?: boolean;
  };
}

export interface LinkPreviewData {
  url: string;
  displayUrl: string;
  siteName?: string;
  title: string;
  description?: string;
  image?: string;
  type?: 'telegram_channel' | 'telegram_message' | 'telegram_invite' | 'article' | 'video' | 'website';
  channelUsername?: string;
  memberCount?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  senderUsername?: string;
  senderRole?: 'owner' | 'admin' | 'member' | 'restricted' | 'banned';
  senderRank?: string;
  text: string;
  timestamp: string; // e.g. "10:42 AM"
  date: string; // e.g. "2026-08-19"
  isOutgoing: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  media?: MessageMedia;
  replyTo?: ReplyInfo;
  forwardedFrom?: ForwardInfo;
  reactions?: Reaction[];
  isPinned?: boolean;
  isEdited?: boolean;
  views?: number;
  linkPreview?: LinkPreviewData;
  isSecret?: boolean;
  ttlSeconds?: number;
  expiresAt?: number;
  isScheduled?: boolean;
  scheduledDate?: string;
  rawDate?: number;
  epoch?: number;
  out?: boolean;
  peerId?: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  username?: string;
  avatar: string;
  bio?: string;
  isOnline?: boolean;
  isVerified?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  pinnedIndex?: number;
  isArchived?: boolean;
  adminOnly?: boolean;
  unreadCount: number;
  isMember?: boolean;
  pinnedMessageId?: string;
  peerId?: string;
  isChannel?: boolean;
  isGroup?: boolean;
  megagroup?: boolean;
  broadcast?: boolean;
  creator?: boolean;
  isCreator?: boolean;
  isAdmin?: boolean;
  hasBannedRights?: boolean;
  admin_rights?: any;
  banned_rights?: any;
  default_banned_rights?: any;
  lastMessage?: {
    id: string;
    senderName?: string;
    text: string;
    timestamp: string;
    isOutgoing: boolean;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
    mediaType?: string;
    rawDate?: number;
    epoch?: number;
    date?: string;
  };
  memberCount?: number;
  onlineCount?: number;
  description?: string;
  inviteLink?: string;
  folderIds?: string[];
  customWallpaper?: string;
  customTone?: string;
  draft?: string;
  draftTimestamp?: string;
  isRestricted?: boolean;
  restrictionReason?: string;
  requiresCaptcha?: boolean;
  captchaQuestion?: string;
  captchaAnswer?: string;
  captchaOptions?: string[];
  isCaptchaSolved?: boolean;
  isReadOnly?: boolean;
  slowModeSeconds?: number;
  // Secret Chat Specifics
  isSecret?: boolean;
  ttlSeconds?: number;
  secretFingerprint?: string;
}

export interface Folder {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  chatTypes?: ChatType[];
  includedChatIds?: string[];
  unreadCount?: number;
}

export interface TelegramApiConfig {
  apiId: string;
  apiHash: string;
  dcId: number;
  dcIp: string;
  port: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  sessionString: string;
  mtprotoVersion: string;
  pingMs: number;
}

export type SettingsSubPage =
  | 'main'
  | 'account'
  | 'plus_settings'
  | 'plus_general'
  | 'plus_chats'
  | 'plus_stories'
  | 'plus_messages'
  | 'plus_topics'
  | 'plus_drawer'
  | 'plus_profile'
  | 'plus_notifications'
  | 'plus_privacy'
  | 'plus_shared_media'
  | 'plus_downloads'
  | 'plus_ads'
  | 'plus_media'
  | 'theme_coloring'
  | 'chat_settings'
  | 'privacy_security'
  | 'privacy_control'
  | 'two_step_verification'
  | 'passcode_lock'
  | 'auto_delete'
  | 'sessions'
  | 'blocked_users'
  | 'notifications_sounds'
  | 'data_storage'
  | 'folders'
  | 'devices'
  | 'power_saving'
  | 'language'
  | 'themes_browser'
  | 'faq'
  | 'features'
  | 'apk_installer'
  | 'support_group'
  | 'stories'
  | 'messages'
  | 'topics'
  | 'shared_media'
  | 'ads_settings'
  | 'backup_restore'
  | 'fcm_diagnostics'
  | 'gift_auctions'
  | 'channel_boosts'
  | 'member_requests'
  | 'cache_by_chats'
  | 'app_update'
  | 'premium';

export interface AppSettings {
  theme: 'dark' | 'light' | 'night' | 'day';
  accentColor: string;
  fontSize: number; // 12 .. 30
  language: 'ar' | 'en' | 'ru' | 'es' | 'fr' | 'de' | 'it' | 'tr' | 'fa' | 'pt' | 'id' | 'ms' | 'nl' | 'pl' | 'uk' | 'hi' | 'zh' | 'ja' | 'ko' | 'ur' | 'ku' | string;
  sendByEnter: boolean;
  soundEffects: boolean;
  notificationsEnabled?: boolean;
  previewText?: boolean;
  autoDownloadMedia: boolean;
  chatWallpaper: string;
  bubbleCornerRadius?: number;
  chatListViewMode?: 'two_lines' | 'three_lines';
  appIcon?: string;
  autoNightMode?: boolean;
  inAppBrowser?: boolean;
  powerSavingThreshold?: number;
  enableAnimations?: boolean;
  swipeAction?: string;
  showTranslateButton?: boolean;
  inAppSounds?: boolean;
  inAppVibrate?: boolean;
  inAppPreview?: boolean;
  inChatSounds?: boolean;
  inAppPop?: boolean;
  autoDownloadMobile?: boolean;
  autoDownloadWifi?: boolean;
  autoDownloadRoaming?: boolean;
  streamingEnabled?: boolean;
  callDataSaving?: string;
  plusThemeEnabled?: boolean;
  useSQLiteMMAP?: boolean;
  biometricLock?: boolean;
}

export interface ActiveCall {
  chatId: string;
  chatTitle: string;
  chatAvatar: string;
  isVideo: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing?: boolean;
  isNoiseSuppressed?: boolean;
  duration: number;
  status: 'calling' | 'connected' | 'ended';
  encryptionEmojis: [string, string, string, string];
  audioLevel?: number;
}

export interface ToastItem {
  id: string;
  text: string;
  icon?: string;
}

export interface ChatContextMenu {
  chatId: string;
  x: number;
  y: number;
}

export interface MessageContextMenu {
  message: Message;
  x: number;
  y: number;
}

export type NotificationCategory =
  | 'message'
  | 'channel_post'
  | 'mention'
  | 'reply'
  | 'call'
  | 'system_security'
  | 'reaction'
  | 'pinned'
  | 'keyword_alert';

export interface InAppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  avatar?: string;
  chatId?: string;
  chatTitle?: string;
  chatUsername?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  senderUsername?: string;
  timestamp: string;
  isSilent?: boolean;
  isPinned?: boolean;
  replyAction?: boolean;
  keyword?: string;
  messageText?: string;
}

export interface UserAccount {
  id: string;
  user: User;
  settings: AppSettings;
  chats: Chat[];
  messages: Record<string, Message[]>;
  unreadCount?: number;
  isActive?: boolean;
  sessionString?: string;
}

export interface CapturedLink {
  id: string;
  url: string;
  sourceChatId?: string;
  source_chat_id?: string;
  sourceChatTitle?: string;
  source_chat?: string;
  source_link?: string;
  sourceSenderName?: string;
  sender?: string;
  detectedAt?: string;
  detected_at?: string;
  type?: 'telegram_channel' | 'telegram_group' | 'telegram_invite' | 'external';
  extractedTitle?: string;
  chat_title?: string;
  memberCount?: number;
  joined: boolean;
  joinedAt?: string;
  autoJoined?: boolean;
  status: 'valid' | 'invalid' | 'joined' | 'already' | 'pending' | 'failed' | 'joining' | 'already_member' | 'expired';
  status_text?: string;
  join_status?: string;
  username?: string;
  creation_date?: string;
  country?: string;
}

// 1. Sender & Scheduler Types
export type ProtectionMode = 'salam' | 'skip' | 'smart_clean' | 'permanent_clean' | 'disabled';

export type SalamActivityStatus =
  | 'greeting_sent'
  | 'waiting_interaction'
  | 'interaction_detected'
  | 'message_edited'
  | 'message_deleted'
  | 'error';

export interface SalamActivityItem {
  id: string;
  chatId: string | number;
  chatTitle?: string;
  greetingMsgId?: number | string;
  status: SalamActivityStatus;
  statusLabel: string;
  interactionCount: number;
  requiredInteractions: number;
  remainingSeconds: number;
  totalWaitSeconds: number;
  lastMessageSnippet?: string;
  lastMessageSender?: string;
  originalText?: string;
  details?: string;
  timestamp: string;
  decision?: 'edit' | 'delete' | 'pending';
  messages?: any[];
}

export interface SenderBatch {
  id: string;
  text: string;
  images: string[];
  targetChats: { id: string; title: string; type: ChatType; status: 'sent' | 'failed' | 'skipped' | 'protected'; messageId?: string; error?: string }[];
  protectionMode: ProtectionMode;
  isScheduled: boolean;
  intervalMinutes?: number;
  durationHours?: number;
  createdAt: string;
  sentAt: string;
  totalSuccess: number;
  totalFailed: number;
  status: 'completed' | 'running' | 'paused' | 'stopped';
}

// 2. Monitor Types
export interface MonitorConfig {
  isEnabled: boolean;
  keywords: string[];
  sendAlertsToSavedMessages: boolean;
  browserPushAlerts: boolean;
  intervalMinutes?: number;
  durationHours?: number;
  startedAt?: string;
}

export interface MonitorAlert {
  id: string;
  keyword: string;
  sourceChatId: string;
  sourceChatTitle: string;
  senderName: string;
  messageText: string;
  timestamp: string;
  groupUrl?: string;
  senderUrl?: string;
  messageId?: string;
  peerId?: string;
}

// 3. My Messages (Batch Log)
export interface MyMessagesBatch {
  id: string;
  text: string;
  hasImages: boolean;
  imagesCount: number;
  groupsCount: number;
  targets: { chatId: string; chatTitle: string; messageId: string }[];
  date: string;
  timestamp: string;
}

// 4. Auto Joiner Advanced
export interface AutoJoinerTask {
  id: string;
  url: string;
  type: 'public' | 'private' | 'username';
  extractedFromText?: string;
  status: 'pending' | 'joining' | 'joined' | 'already_member' | 'invalid' | 'banned' | 'rate_limited';
  errorReason?: string;
  processedAt?: string;
}

// 5. Auto Responder
export interface AutoReplyRule {
  id: string;
  keyword: string;
  replyText: string;
  matchType: 'exact' | 'contains' | 'regex';
  scope: 'all' | 'private' | 'groups';
  isEnabled: boolean;
  timesTriggered: number;
  lastTriggeredAt?: string;
}

// 6. Smart AI Learn (Groq LLM)
export interface SmartAiService {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export interface SmartAiPattern {
  id: string;
  triggerContext: string;
  recommendedReply: string;
  learnedDate: string;
  isAccepted: boolean;
}

// 7. Scheduled Rotator (RotatingSendManager)
export interface RotatingSendConfig {
  messages: string[];
  groups: string[];
  intervalMinutes: number;
  isPersistent?: boolean;
}

export interface RotatingSendStatus {
  active: boolean;
  messages: string[];
  groups: string[];
  interval: number;
  next_send_in: number | null;
  interval_seconds?: number;
  current_index: number;
  total_sent: number;
}

export interface RotatingSendLog {
  id: string;
  timestamp: string;
  messageIndex: number;
  messageSnippet: string;
  group: string;
  status: 'success' | 'error';
  info?: string;
}

// 7. Live Link Discover & Instant Auto-Join
export interface LiveDiscoveredLink {
  id: string;
  url: string;
  sourceChatTitle: string;
  sourceChatId: string;
  senderName: string;
  timestamp: string;
  status: 'pending' | 'joining' | 'joined' | 'failed' | 'already_member' | 'expired';
  failReason?: string;
  autoJoined: boolean;
}

// 8. Protocol Buffers & Diagnostics Types
export { GoogleProtobuf } from './core/ProtobufCodec';

// 9. FCM Push Notifications & Diagnostics
export interface FcmPushPacket {
  id: string;
  timestamp: string;
  receivedAt: number;
  dialog_id: string;
  sender_id: string;
  sender_name: string;
  msg_id: string;
  title: string;
  body: string;
  sound?: string;
  badge?: number;
  rawPayload?: any;
  status: 'alerted' | 'suppressed_active_dialog' | 'muted' | 'background_synced' | 'error' | string;
  account_id: number | string;
  user_id: string;
  routingDecision: string;
}

export interface FcmDiagnosticInfo {
  status: 'listening' | 'unsupported' | 'registered' | 'connected' | 'permission_denied' | 'error' | string;
  token: string | null;
  endpoint?: string;
  lastHeartbeat: string;
  activeAccountId: number | string;
  activeUserId: string;
  activeDialogId: string | null;
  registrationId: string;
  lastReceivedPacket: FcmPushPacket | null;
  history: FcmPushPacket[];
  isSubscribedToPush: boolean;
  permissionState: NotificationPermission | 'unsupported';
}

// 10. AI Tone Selection
export type AiToneId = 'neutral' | 'formal' | 'casual' | 'concise' | 'friendly' | 'poetic' | string;

export interface AiComposeTone {
  id: AiToneId;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
}

// 11. Contact Birthdays
export interface ContactBirthday {
  userId: string;
  name: string;
  avatar: string;
  username: string;
  birthDate: string;
  isToday: boolean;
  daysRemaining: number;
  age: number;
  hasCelebrated?: boolean;
}

// 12. Cache Usage By Chats
export interface ChatCacheUsageInfo {
  chatId: string;
  chatTitle: string;
  chatAvatar: string;
  photosBytes: number;
  videosBytes: number;
  audioBytes: number;
  documentsBytes: number;
  totalBytes: number;
  keepMediaMode: '3_days' | '1_week' | '1_month' | 'forever' | string;
}

// 13. Channel Boosts
export interface ChannelBoostPerk {
  level: number;
  title: string;
  titleAr: string;
  description: string;
  isUnlocked: boolean;
}

export interface ChannelBoostData {
  chatId: string;
  currentLevel: number;
  currentBoosts: number;
  boostsToNextLevel: number;
  myBoostsCount: number;
  canBoost: boolean;
  boostUrl: string;
  unlockedPerks: ChannelBoostPerk[];
}

// 14. Fact-Checking
export interface MessageFactCheck {
  messageId: string;
  chatId: string;
  country: string;
  organization: string;
  organizationLogo?: string;
  text: string;
  sourceUrl: string;
  checkedAt: string;
  isExpanded: boolean;
}

// 15. Star Gifts & Auctions
export interface StarGiftItem {
  id: string;
  title: string;
  emoji: string;
  starsPrice: number;
  isLimited?: boolean;
  totalAvailable?: number;
  soldCount?: number;
  badge?: string;
}

export interface GiftAuctionBid {
  bidId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amountStars: number;
  timestamp: string;
}

export interface GiftAuctionAttribute {
  key: string;
  value: string;
  rarityPercentage: number;
}

export interface GiftAuctionItem {
  id: string;
  giftId: string;
  title: string;
  symbol: string;
  currentBidStars: number;
  highestBidderId: string;
  highestBidderName: string;
  highestBidderAvatar: string;
  minNextBid: number;
  endsAt: number;
  totalBidsCount: number;
  recentBids: GiftAuctionBid[];
  attributes: GiftAuctionAttribute[];
}

// 16. Member Join Requests
export interface MemberJoinRequestItem {
  id: string;
  chatId: string;
  chatTitle: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userBio?: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'approved' | 'declined' | 'dismissed';
}

// 17. Plus Configuration Types
export interface PlusConfig {
  // 1. General (عام)
  fontFamily: string;
  keepScreenOn: boolean;
  proximitySensor: boolean;
  useExternalBrowser: boolean;
  hapticFeedback: boolean;
  bigEmojis: boolean;
  showDirectShare: boolean;
  cacheLimitGb: number;

  // 2. Chats (المحادثات)
  tabsEnabled: boolean;
  tabsPosition: 'top' | 'bottom';
  showUnreadTabsCounter: boolean;
  hideMutedTabs: boolean;
  showOnlineStatusDot: boolean;
  doubleTapAction: 'reply' | 'reaction' | 'copy' | 'pin';
  chatSwipeAction: 'archive' | 'mute' | 'delete' | 'pin' | 'read';
  confirmBeforeCall: boolean;

  // 3. Stories (القصص)
  hideStoriesBar: boolean;
  stealthModeStories: boolean;
  autoSaveStories: boolean;
  highQualityPlayback: boolean;
  storySpeed: '1x' | '1.5x' | '2x';
  storyExpirationAlert: boolean;

  // 4. Messages (الرسائل)
  forwardWithoutQuote: boolean;
  showUserIdOnMessages: boolean;
  showExactSeconds: boolean;
  showEditedHistory: boolean;
  confirmVoiceNotes: boolean;
  confirmStickers: boolean;
  autoTranslateIncoming: boolean;
  translationProvider: 'telegram' | 'google' | 'deepl';

  // 5. Topics (المواضيع)
  topicsAsTabs?: boolean;
  autoOpenGeneralTopic?: boolean;
  unreadTopicBadges?: boolean;
  quickTopicSearch?: boolean;
  lastTopicMessagePreview?: boolean;

  // 6. Navigation Drawer (درج التصفح)
  drawerShowNightMode?: boolean;
  drawerShowSavedMessages?: boolean;
  drawerShowCalls?: boolean;
  drawerShowContacts?: boolean;
  drawerShowPlusSettings?: boolean;
  drawerShowAccounts?: boolean;
  drawerHeaderStyle?: 'standard' | 'minimal' | 'custom';

  // 7. Profile (الملف الشخصي)
  profileShowUserId?: boolean;
  profileCopyIdOnTap?: boolean;
  profileShowCommonGroups?: boolean;
  profileHidePhone?: boolean;
  profileQuickActions?: boolean;

  // 8. Notifications (الإشعارات)
  inAppNotificationStyle?: 'banner' | 'pill' | 'silent';
  repeatUnreadAlerts?: 'off' | '5min' | '15min';
  customPrivateTone?: string;
  customGroupTone?: string;
  vipPriorityAlerts?: boolean;
  filterSpamAlerts?: boolean;

  // 9. Privacy & Security (الخصوصية والأمان)
  ghostMode?: boolean;
  hideOnlineStatus?: boolean;
  hideReadReceipts?: boolean;
  hideTypingIndicator?: boolean;
  antiDeleteMessages?: boolean;
  antiEditMessages?: boolean;
  appLockPasscode?: string;
  isAppLockEnabled?: boolean;
  biometricsEnabled?: boolean;
  hiddenChatsLocked?: boolean;

  // 10. Shared Media (الوسائط المتبادلة)
  defaultMediaTab?: 'photos' | 'videos' | 'files' | 'audio' | 'links' | 'voice';
  gridColumnsCount?: number;
  highResThumbnailPreview?: boolean;
  pipFloatingVideo?: boolean;
  autoPauseAudioOnVideo?: boolean;
  customMediaPath?: string;

  // 11. Downloads (التحميلات)
  autoDownloadWifi?: boolean;
  autoDownloadCellular?: boolean;
  downloadBooster?: boolean;
  maxConcurrentDownloads?: number;
  downloadFinishSound?: boolean;
  autoResumeDownloads?: boolean;

  // 12. Ads (الإعلانات)
  blockSponsoredMessages?: boolean;
  hidePromotedChannels?: boolean;
  blockBotAds?: boolean;
  disablePromoAlerts?: boolean;
  cleanChatBackground?: boolean;
}


