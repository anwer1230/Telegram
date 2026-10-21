import { Chat, Folder, Message, TelegramApiConfig, User, UserAccount } from '../types';

export const CURRENT_USER: User = {
  id: '',
  name: '',
  phone: '',
  avatar: '',
  isOnline: false,
};

export const DEFAULT_TELEGRAM_API_CONFIG: TelegramApiConfig = {
  apiId: '34773007',
  apiHash: '2a6b16abed75c3f6898ee79e9237fd25',
  dcId: 4,
  dcIp: '149.154.167.91',
  port: 443,
  connectionStatus: 'connected',
  sessionString: '',
  mtprotoVersion: 'MTProto 2.0 (Layer 184 - Android)',
  pingMs: 24,
};

export const DEFAULT_FOLDERS: Folder[] = [
  { id: 'all', name: 'All Chats', nameAr: 'كل المحادثات', icon: 'Folder' },
  { id: 'personal', name: 'Personal', nameAr: 'شخصي', icon: 'User', chatTypes: ['private', 'saved'] },
  { id: 'bots', name: 'Bots & AI', nameAr: 'البوتات والذكاء', icon: 'Bot', chatTypes: ['bot'] },
  { id: 'channels', name: 'Channels', nameAr: 'قنوات', icon: 'Megaphone', chatTypes: ['channel'] },
  { id: 'groups', name: 'Groups', nameAr: 'مجموعات', icon: 'Users', chatTypes: ['group'] },
];

export const INITIAL_CHATS: Chat[] = [];

export const INITIAL_MESSAGES: Record<string, Message[]> = {};

export const TELEGRAM_STICKERS = [
  { id: 'st_duck_1', name: 'Duck Thumbs Up', emoji: '👍', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp' },
  { id: 'st_duck_2', name: 'Party Popper', emoji: '🎉', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp' },
  { id: 'st_cat_1', name: 'Cool Face', emoji: '😎', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp' },
  { id: 'st_cat_2', name: 'Red Heart', emoji: '❤️', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp' },
  { id: 'st_rocket', name: 'Rocket', emoji: '🚀', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp' },
  { id: 'st_fire', name: 'Fire', emoji: '🔥', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp' },
];

export const POPULAR_REACTIONS = ['👍', '❤️', '🔥', '🎉', '👏', '😍', '🤔', '⚡', '💯', '🚀'];

export const DEFAULT_ACCOUNTS: UserAccount[] = [];
