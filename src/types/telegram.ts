/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChatType = 'user' | 'group' | 'channel' | 'bot' | 'saved';

export interface TelegramUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  username: string;
  bio: string;
  avatar: string;
  unreadTotal: number;
  isActive: boolean;
  isVerified?: boolean;
  birthday?: string;
  personalChannel?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  mediaType?: 'photo' | 'voice' | 'file' | 'sticker' | 'location';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  voiceDuration?: number;
  reactions?: { emoji: string; count: number; reactedByMe?: boolean }[];
  replyTo?: { id: string; text: string; sender: string };
  isEncrypted?: boolean;
}

export interface ChatItem {
  id: string;
  title: string;
  type: ChatType;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isVerified?: boolean;
  isOnline?: boolean;
  folder?: string;
  typing?: string;
  phone?: string;
  username?: string;
  bio?: string;
  membersCount?: number;
  pinnedMessageId?: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  appVersion: string;
  location: string;
  date: string;
  isCurrent: boolean;
  ip: string;
  iconType: 'mobile' | 'desktop' | 'browser';
}

export interface PlusThemeSettings {
  isPlusEnabled: boolean;
  primaryColor: string; // Default #00897b
  interfacePrimary: string;
  chatInterface: string;
  contactsInterface: string;
  drawerInterface: string;
  profileInterface: string;
  settingsInterface: string;
  dialogTitleColor: string;
  dialogBgColor: string;
  dialogTextColor: string;
  messageFontSize: number;
  messageRadius: number;
  isDarkMode: boolean;
  chatBackground: 'default' | 'doodle-green' | 'doodle-blue' | 'doodle-purple' | 'math' | 'custom';
  customBgUrl?: string;
  nameColor: string;
}

export interface PowerUsageSettings {
  powerSavingMode: 'off' | 'below10' | 'on';
  animatedStickers: boolean;
  animatedEmoji: boolean;
  chatEffects: boolean;
  animationsInCalls: boolean;
  autoplayVideos: boolean;
  autoplayGifs: boolean;
  particles: boolean;
  enableSmoothTransitions: boolean;
}

export interface PrivacySecuritySettings {
  twoStepAuth: boolean;
  autoDeleteMessages: 'disabled' | '24h' | '7d' | '1m';
  passcodeLock: boolean;
  loginEmail: string;
  blockedUsersCount: number;
  phonePrivacy: 'nobody' | 'contacts' | 'everyone';
  lastSeenPrivacy: 'nobody' | 'contacts' | 'everyone';
  photosPrivacy: 'nobody' | 'contacts' | 'everyone';
  forwardPrivacy: 'nobody' | 'contacts' | 'everyone';
  callsPrivacy: 'nobody' | 'contacts' | 'everyone';
  voiceMessagesPrivacy: 'nobody' | 'contacts' | 'everyone';
}

export interface DataStorageSettings {
  storageUsedMB: number;
  dataUsedGB: number;
  storagePath: string;
  autoDownloadMobile: boolean;
  autoDownloadWifi: boolean;
  autoDownloadRoaming: boolean;
  saveToGalleryPrivate: boolean;
  saveToGalleryGroups: boolean;
  saveToGalleryChannels: boolean;
  streamMediaBeforeDownload: boolean;
  callDataSaving: 'roaming' | 'always' | 'never';
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;
  proxySecret?: string;
}

export interface LanguageSettings {
  selectedLanguage: string;
  showTranslateButton: boolean;
  translateEntireChats: boolean;
}

export interface NotificationSettings {
  showFromAllAccounts: boolean;
  privateChats: boolean;
  groups: boolean;
  channels: boolean;
  stories: boolean;
  reactions: boolean;
  callVibration: 'default' | 'short' | 'long' | 'disabled';
  callRingtone: 'default' | 'custom';
  showBadgeCounter: boolean;
  includeMutedInBadge: boolean;
}

export interface ChatFolder {
  id: string;
  name: string;
  icon: string;
  includedChatTypes: ChatType[];
  isCustom?: boolean;
}

export interface GeneralWebSettings {
  timeFormat: '12h' | '24h';
  sendByEnter: boolean;
  smoothScrolling: boolean;
  interfaceZoom: number; // 90, 100, 110, 120
  openLinksInNewTab: boolean;
  autoPlayMedia: boolean;
  soundEffects: boolean;
}

