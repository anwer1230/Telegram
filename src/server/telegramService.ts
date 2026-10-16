import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { computeCheck } from 'telegram/Password.js';
import { NewMessage } from 'telegram/events/index.js';
import fs from 'fs';
import path from 'path';
import {
  initCloudStorage,
  saveSession,
  deleteSession,
  clearAllSessions,
  loadAllSessionsSync,
  type StoredSession,
} from './cloudStorage.js';

// Production Telegram API Credentials
export const TELEGRAM_API_ID = Number(process.env.TELEGRAM_API_ID) || 22043994;
export const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '56f64582b363d367280db96586b97801';

export interface TelegramUser {
  id: string;
  name: string;
  username?: string;
  phone: string;
  avatarUrl?: string;
}

export interface ChatDetails {
  id: string;
  participantsCount?: number;
  onlineCount?: number;
  about?: string;
  isChannel?: boolean;
  isGroup?: boolean;
  avatarUrl?: string;
}

export interface PendingAuth {
  client: TelegramClient;
  phone: string;
  phoneCodeHash: string;
  isCodeViaApp: boolean;
  createdAt: number;
}

export type { StoredSession };

// In-memory runtime state
let activeClient: TelegramClient | null = null;
let activeUser: TelegramUser | null = null;
let activeSessionString: string | null = null;
let isLiveConnected = false;

const pendingAuths = new Map<string, PendingAuth>();

/**
 * Get active session string for relay to client
 */
export function getActiveSessionString(): string | null {
  return activeSessionString;
}

/**
 * Get all stored accounts across local & cloud storage
 */
export function getAllStoredAccounts(): StoredSession[] {
  const sessions = loadAllSessionsSync();
  return Object.values(sessions);
}

let restoringPromise: Promise<{ success: boolean; user?: TelegramUser; sessionString?: string; error?: string }> | null = null;
let lastFailedSession = '';
let lastFailedTime = 0;

/**
 * Restore Telegram MTProto Client session from a session string (Plan 1: Client-Side Session Relay)
 */
export async function restoreSessionFromString(sessionString: string): Promise<{ success: boolean; user?: TelegramUser; sessionString?: string; error?: string }> {
  if (!sessionString || typeof sessionString !== 'string' || sessionString.trim().length < 10) {
    return { success: false, error: 'INVALID_SESSION_STRING' };
  }

  const cleanSession = sessionString.trim();

  // If already connected with this exact session string and authorized, return current active user immediately
  if (activeClient && isLiveConnected && activeUser && activeSessionString === cleanSession) {
    return { success: true, user: activeUser, sessionString: cleanSession };
  }

  // Cooldown on recently failed session (don't retry for 10 seconds to prevent hammering and timeouts)
  if (lastFailedSession === cleanSession && Date.now() - lastFailedTime < 10000) {
    return { success: false, error: 'SESSION_RECENTLY_FAILED' };
  }

  // Deduplicate concurrent restoration requests
  if (restoringPromise) {
    return restoringPromise;
  }

  restoringPromise = (async () => {
    try {
      console.log('[TelegramService] Reconnecting MTProto Client via session relay...');
      const client = new TelegramClient(new StringSession(cleanSession), TELEGRAM_API_ID, TELEGRAM_API_HASH, {
        connectionRetries: 1,
        useWSS: false,
        timeout: 3,
      });

      // Guard connection with a 3-second timeout so it never hangs requests or causes TIMEOUT error
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 3000)),
      ]);

      const isAuth = await Promise.race([
        client.isUserAuthorized(),
        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('AUTH_CHECK_TIMEOUT')), 2500)),
      ]);

      if (!isAuth) {
        lastFailedSession = cleanSession;
        lastFailedTime = Date.now();
        try {
          await client.disconnect();
        } catch {
          // ignore
        }
        return { success: false, error: 'SESSION_REVOKED_OR_EXPIRED' };
      }

    const me = (await client.getMe()) as any;
    const user: TelegramUser = {
      id: me.id?.toString() || `tg_${Date.now()}`,
      name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'حساب تيليجرام',
      username: me.username ? `@${me.username}` : undefined,
      phone: me.phone ? `+${me.phone.replace(/^\+/, '')}` : '',
      avatarUrl: '/api/telegram/avatar/me',
    };

    // Safely disconnect previous client if distinct
    if (activeClient && activeClient !== client) {
      try {
        await activeClient.disconnect();
      } catch {
        // ignore
      }
    }

    activeClient = client;
    activeUser = user;
    activeSessionString = cleanSession;
    isLiveConnected = true;
    setupClientEventHandlers(client);

    // Persist to multi-layer store (local disk + Firestore/cloud storage)
    const sessionRecord: StoredSession = {
      phone: user.phone || `user_${user.id}`,
      sessionString: cleanSession,
      name: user.name,
      username: user.username,
      userId: user.id,
      savedAt: new Date().toISOString(),
    };
    await saveSession(sessionRecord);

    console.log(`[TelegramService] Successfully restored live MTProto session: ${user.name} (${user.phone})`);
    return { success: true, user, sessionString: cleanSession };
  } catch (err: any) {
    lastFailedSession = cleanSession;
    lastFailedTime = Date.now();
    console.warn('[TelegramService] Auto-reconnection failed:', err?.message || err);
    return { success: false, error: err?.message || 'AUTO_RECONNECT_FAILED' };
  } finally {
    restoringPromise = null;
  }
  })();

  return restoringPromise;
}

/**
 * Switch active account by phone number using stored sessions
 */
export async function switchAccountByPhone(phone: string): Promise<{ success: boolean; user?: TelegramUser; sessionString?: string; error?: string }> {
  const sessions = loadAllSessionsSync();
  const target = sessions[phone] || Object.values(sessions).find(s => s.phone === phone || s.userId === phone);
  if (!target || !target.sessionString) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }
  return await restoreSessionFromString(target.sessionString);
}

/**
 * Initialize Telegram Service on Server Startup (Plan 2: Persistent Cloud Storage)
 */
export async function initTelegramService() {
  console.log(`[TelegramService] Initializing MTProto Client with API_ID: ${TELEGRAM_API_ID}`);
  try {
    const stored = await initCloudStorage();
    const sessionEntries = Object.values(stored);

    if (sessionEntries.length > 0) {
      // Pick the most recently saved or primary session
      const primary = sessionEntries.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))[0];
      try {
        console.log(`[TelegramService] Found persistent session for ${primary.phone}, attempting boot restoration...`);
        const result = await restoreSessionFromString(primary.sessionString);
        if (result.success && result.user) {
          console.log(`[TelegramService] Boot restore completed for ${result.user.name} (${result.user.phone})`);
          return;
        }
      } catch (err: any) {
        console.warn(`[TelegramService] Failed boot session restoration for ${primary.phone}:`, err?.message || err);
      }
    }
  } catch (err: any) {
    console.error('[TelegramService] Error initializing persistent storage layer:', err);
  }
}

/**
 * Normalize phone number format (e.g. +966501234567)
 */
export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

/**
 * Start Telegram Authentication (Request Code)
 */
export async function startPhoneAuth(sessionId: string, rawPhone: string) {
  const cleanPhone = normalizePhone(rawPhone);
  if (cleanPhone.length < 8) {
    throw new Error('PHONE_NUMBER_INVALID');
  }

  // Clean up any existing pending auth for this session
  const existing = pendingAuths.get(sessionId);
  if (existing) {
    try {
      await existing.client.disconnect();
    } catch {
      // ignore
    }
    pendingAuths.delete(sessionId);
  }

  console.log(`[TelegramService] Initiating sendCode for ${cleanPhone} via Telegram API ID: ${TELEGRAM_API_ID}...`);

  const client = new TelegramClient(new StringSession(''), TELEGRAM_API_ID, TELEGRAM_API_HASH, {
    connectionRetries: 5,
    useWSS: false,
  });

  await client.connect();

  try {
    const sendResult = await client.sendCode(
      {
        apiId: TELEGRAM_API_ID,
        apiHash: TELEGRAM_API_HASH,
      },
      cleanPhone
    );

    pendingAuths.set(sessionId, {
      client,
      phone: cleanPhone,
      phoneCodeHash: sendResult.phoneCodeHash,
      isCodeViaApp: sendResult.isCodeViaApp,
      createdAt: Date.now(),
    });

    console.log(`[TelegramService] Code sent successfully to ${cleanPhone}. isCodeViaApp=${sendResult.isCodeViaApp}`);

    return {
      state: 'code' as const,
      isCodeViaApp: sendResult.isCodeViaApp,
      phone: cleanPhone,
      apiId: TELEGRAM_API_ID,
    };
  } catch (err: any) {
    try {
      await client.disconnect();
    } catch {
      // ignore
    }

    const errCode = err.errorMessage || err.message || 'REQUEST_FAILED';
    console.error(`[TelegramService] sendCode failed for ${cleanPhone}:`, errCode);

    if (errCode.includes('PHONE_NUMBER_INVALID')) throw new Error('PHONE_NUMBER_INVALID');
    if (errCode.includes('PHONE_NUMBER_BANNED')) throw new Error('PHONE_NUMBER_BANNED');
    if (errCode.includes('FLOOD_WAIT')) throw new Error('FLOOD_WAIT');
    throw new Error(errCode);
  }
}

/**
 * Verify Telegram Authentication Code
 */
export async function verifyAuthCode(sessionId: string, code: string) {
  const pending = pendingAuths.get(sessionId);
  if (!pending) {
    throw new Error('AUTH_SESSION_EXPIRED');
  }

  const cleanCode = code.trim();
  if (!cleanCode) {
    throw new Error('PHONE_CODE_INVALID');
  }

  console.log(`[TelegramService] Verifying code for ${pending.phone}...`);

  try {
    await pending.client.invoke(
      new Api.auth.SignIn({
        phoneNumber: pending.phone,
        phoneCodeHash: pending.phoneCodeHash,
        phoneCode: cleanCode,
      })
    );

    // If successful, retrieve user profile
    const me = (await pending.client.getMe()) as any;
    const sessionString = (pending.client.session as any).save();

    const user: TelegramUser = {
      id: me.id?.toString() || `tg_${Date.now()}`,
      name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'حساب تيليجرام',
      username: me.username ? `@${me.username}` : undefined,
      phone: pending.phone,
      avatarUrl: '/api/telegram/avatar/me',
    };

    // Save session to persistent store (memory, disk, cloud)
    const sessionRecord: StoredSession = {
      phone: pending.phone,
      sessionString,
      name: user.name,
      username: user.username,
      userId: user.id,
      savedAt: new Date().toISOString(),
    };
    await saveSession(sessionRecord);

    activeClient = pending.client;
    activeUser = user;
    activeSessionString = sessionString;
    isLiveConnected = true;
    setupClientEventHandlers(pending.client);
    pendingAuths.delete(sessionId);

    console.log(`[TelegramService] Authentication successful for ${user.name} (${user.phone})!`);

    return {
      state: 'ready' as const,
      authenticated: true,
      user,
      sessionString,
      isLiveConnected: true,
      apiId: TELEGRAM_API_ID,
    };
  } catch (err: any) {
    const errCode = err.errorMessage || err.message || '';
    console.error(`[TelegramService] Code verification error for ${pending.phone}:`, errCode);

    if (errCode === 'SESSION_PASSWORD_NEEDED') {
      console.log(`[TelegramService] Account ${pending.phone} requires Two-Factor Authentication (2FA) password.`);
      return {
        state: 'password' as const,
        authenticated: false,
      };
    }

    if (errCode.includes('PHONE_CODE_INVALID')) throw new Error('PHONE_CODE_INVALID');
    if (errCode.includes('PHONE_CODE_EXPIRED')) throw new Error('PHONE_CODE_EXPIRED');
    if (errCode.includes('FLOOD_WAIT')) throw new Error('FLOOD_WAIT');
    throw new Error(errCode || 'PHONE_CODE_INVALID');
  }
}

/**
 * Verify 2FA Password
 */
export async function verify2FAPassword(sessionId: string, password: string) {
  const pending = pendingAuths.get(sessionId);
  if (!pending) {
    throw new Error('AUTH_SESSION_EXPIRED');
  }

  console.log(`[TelegramService] Verifying 2FA password for ${pending.phone}...`);

  try {
    const passwordSrpResult = await pending.client.invoke(new Api.account.GetPassword());
    const passwordSrpCheck = await computeCheck(passwordSrpResult, password);

    await pending.client.invoke(
      new Api.auth.CheckPassword({
        password: passwordSrpCheck,
      })
    );

    const me = (await pending.client.getMe()) as any;
    const sessionString = (pending.client.session as any).save();

    const user: TelegramUser = {
      id: me.id?.toString() || `tg_${Date.now()}`,
      name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'حساب تيليجرام',
      username: me.username ? `@${me.username}` : undefined,
      phone: pending.phone,
      avatarUrl: '/api/telegram/avatar/me',
    };

    const sessionRecord: StoredSession = {
      phone: pending.phone,
      sessionString,
      name: user.name,
      username: user.username,
      userId: user.id,
      savedAt: new Date().toISOString(),
    };
    await saveSession(sessionRecord);

    activeClient = pending.client;
    activeUser = user;
    activeSessionString = sessionString;
    isLiveConnected = true;
    setupClientEventHandlers(pending.client);
    pendingAuths.delete(sessionId);

    console.log(`[TelegramService] 2FA authentication successful for ${user.name} (${user.phone})!`);

    return {
      state: 'ready' as const,
      authenticated: true,
      user,
      sessionString,
      isLiveConnected: true,
      apiId: TELEGRAM_API_ID,
    };
  } catch (err: any) {
    const errCode = err.errorMessage || err.message || '';
    console.error(`[TelegramService] 2FA password verification error:`, errCode);

    if (errCode.includes('PASSWORD_HASH_INVALID')) throw new Error('PASSWORD_HASH_INVALID');
    if (errCode.includes('FLOOD_WAIT')) throw new Error('FLOOD_WAIT');
    throw new Error(errCode || 'PASSWORD_HASH_INVALID');
  }
}

/**
 * Logout from Telegram
 */
export async function logoutTelegram(phone?: string) {
  if (activeClient) {
    try {
      await activeClient.disconnect();
    } catch {
      // ignore
    }
  }
  const phoneToClear = phone || activeUser?.phone;
  activeClient = null;
  activeUser = null;
  activeSessionString = null;
  isLiveConnected = false;

  if (phoneToClear) {
    await deleteSession(phoneToClear);
  } else {
    await clearAllSessions();
  }
  console.log('[TelegramService] Logged out successfully and sessions cleared from storage.');
}

/**
 * Remove stored session by phone without full service restart
 */
export async function removeStoredSessionByPhone(phone: string): Promise<boolean> {
  try {
    await deleteSession(phone);
    if (activeUser?.phone === phone) {
      if (activeClient) {
        try {
          await activeClient.disconnect();
        } catch {
          // ignore
        }
      }
      activeClient = null;
      activeUser = null;
      activeSessionString = null;
      isLiveConnected = false;
    }
    return true;
  } catch (err) {
    console.error(`[TelegramService] Failed to remove stored session for ${phone}:`, err);
    return false;
  }
}

/**
 * Get current Telegram status
 */
export function getTelegramServiceStatus() {
  return {
    isLiveConnected,
    apiId: TELEGRAM_API_ID,
    apiHashConfigured: Boolean(TELEGRAM_API_HASH),
    user: activeUser,
    sessionString: activeSessionString,
    hasActiveClient: Boolean(activeClient),
  };
}

const avatarCache = new Map<string, { buffer: Buffer; mime: string; expires: number }>();
const peerEntityCache = new Map<string, any>();

/**
 * Fetch profile photo buffer for a user or chat
 */
export async function fetchProfilePhotoBuffer(peerId: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!activeClient || !isLiveConnected) return null;

  const cleanPeer = peerId.startsWith('tg_') ? peerId.replace('tg_', '') : peerId;
  const cached = avatarCache.get(cleanPeer);
  if (cached && cached.expires > Date.now()) {
    return { buffer: cached.buffer, mime: cached.mime };
  }

  try {
    let target: any = cleanPeer;
    if (cleanPeer === 'me') {
      target = 'me';
    } else if (peerEntityCache.has(cleanPeer)) {
      target = peerEntityCache.get(cleanPeer);
    } else {
      try {
        if (/^-?\d+$/.test(cleanPeer)) {
          target = await activeClient.getEntity(BigInt(cleanPeer) as any);
        } else {
          target = await activeClient.getEntity(cleanPeer);
        }
      } catch {
        target = cleanPeer;
      }
    }

    const buffer = await activeClient.downloadProfilePhoto(target, { isBig: false });
    if (buffer && buffer.length > 0) {
      const result = { buffer: Buffer.from(buffer), mime: 'image/jpeg', expires: Date.now() + 1000 * 60 * 30 };
      avatarCache.set(cleanPeer, result);
      return result;
    }
  } catch (err: any) {
    // Entities without photo or access restrictions
  }
  return null;
}

const TELEGRAM_SENDER_COLORS = [
  '#e56555', // Red
  '#e08244', // Orange
  '#a667e5', // Violet
  '#439fe0', // Blue
  '#4fae4e', // Green
  '#c45479', // Pink
  '#3ca3b5', // Cyan
];

/**
 * Fetch Real Telegram Dialogs/Chats
 */
export async function fetchTelegramDialogs(limit = 40) {
  if (!activeClient || !isLiveConnected) {
    return null;
  }

  try {
    const dialogs = await activeClient.getDialogs({ limit });
    return dialogs.map(dialog => {
      const entity = dialog.entity as any;
      const isChannel = Boolean(dialog.isChannel);
      const isGroup = Boolean(dialog.isGroup);
      const name = dialog.title || dialog.name || (entity?.firstName ? `${entity.firstName} ${entity.lastName || ''}`.trim() : 'محادثة تيليجرام');
      const unread = dialog.unreadCount || 0;
      const preview = dialog.message?.message || (dialog.message as any)?.text || '';
      const date = dialog.date ? new Date(dialog.date * 1000).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : null;
      const hasPhoto = Boolean(entity?.photo);
      const avatarPeerId = entity?.id ? entity.id.toString() : dialog.id.toString();
      const avatarUrl = hasPhoto ? `/api/telegram/avatar/${avatarPeerId}` : undefined;

      // Cache entity for instant avatar resolution
      if (dialog.id) peerEntityCache.set(String(dialog.id), entity);
      if (entity?.id) peerEntityCache.set(String(entity.id), entity);

      const participantsCount = entity?.participantsCount ?? entity?.participants?.length ?? undefined;

      return {
        id: `tg_${dialog.id}`,
        name,
        preview: preview.slice(0, 80) || 'محادثة نشطة',
        time: date,
        unread,
        pinned: Boolean(dialog.pinned),
        archived: Boolean(dialog.archived),
        kind: isChannel ? 'channel' : isGroup ? 'group' : 'direct',
        isRealTelegram: true,
        avatarUrl,
        participantsCount,
      };
    });
  } catch (err) {
    console.warn('[TelegramService] Error fetching dialogs from Telegram:', err);
    return null;
  }
}

/**
 * Send real message via Telegram MTProto
 */
export async function sendRealTelegramMessage(peerId: string, message: string, replyToMsgId?: number) {
  if (!activeClient || !isLiveConnected) {
    return null;
  }

  try {
    const cleanPeer = peerId.startsWith('tg_') ? peerId.replace('tg_', '') : peerId;
    const sent = await activeClient.sendMessage(cleanPeer, {
      message,
      replyTo: replyToMsgId ? Number(replyToMsgId) : undefined,
    });
    return {
      id: sent.id.toString(),
      text: sent.message,
      time: new Date().toISOString(),
      outgoing: true,
      read: true,
    };
  } catch (err: any) {
    console.warn('[TelegramService] Error sending message via Telegram:', err);
    return null;
  }
}

/**
 * Fetch real messages for a Telegram chat/dialog
 */
export async function fetchTelegramMessages(peerId: string, limit = 50) {
  if (!activeClient || !isLiveConnected) {
    return null;
  }

  try {
    const cleanPeer = peerId.startsWith('tg_') ? peerId.replace('tg_', '') : peerId;
    const messages = await activeClient.getMessages(cleanPeer, { limit });

    return messages.map(msg => {
      let senderName = '';
      let senderId = '';
      let senderAvatar: string | undefined = undefined;
      let senderColor = TELEGRAM_SENDER_COLORS[0];
      let senderInitials = 'ت';

      const sender = (msg as any).sender;
      if (sender) {
        senderId = sender.id?.toString() || '';
        senderName = sender.firstName
          ? `${sender.firstName} ${sender.lastName || ''}`.trim()
          : (sender.title || sender.username || '');
        if (sender.photo) {
          senderAvatar = `/api/telegram/avatar/${senderId}`;
        }
      } else if ((msg as any).fromId) {
        const from = (msg as any).fromId;
        senderId = (from.userId || from.channelId || from.chatId)?.toString() || '';
      }

      if (!senderName && msg.out && activeUser) {
        senderName = activeUser.name;
        senderId = activeUser.id;
      }

      if (senderName) {
        senderInitials = senderName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || 'ت';
      }

      if (senderId) {
        const colorIndex = Math.abs([...senderId].reduce((acc, c) => acc + c.charCodeAt(0), 0)) % TELEGRAM_SENDER_COLORS.length;
        senderColor = TELEGRAM_SENDER_COLORS[colorIndex];
        if (!senderAvatar) {
          senderAvatar = `/api/telegram/avatar/${senderId}`;
        }
      }

      // Quoted reply info
      let replyTo: { id: string; senderName?: string; text: string } | undefined = undefined;
      const replyHeader = (msg as any).replyTo;
      if (replyHeader && replyHeader.replyToMsgId) {
        const replyId = replyHeader.replyToMsgId.toString();
        const replied = messages.find(m => m.id.toString() === replyId);
        if (replied) {
          const rSender = (replied as any).sender;
          const rName = rSender?.firstName
            ? `${rSender.firstName} ${rSender.lastName || ''}`.trim()
            : (rSender?.title || 'رسالة');
          replyTo = {
            id: replyId,
            senderName: rName,
            text: (replied.message || '').slice(0, 70),
          };
        } else {
          replyTo = {
            id: replyId,
            senderName: 'رد على رسالة',
            text: '...',
          };
        }
      }

      return {
        id: msg.id.toString(),
        text: msg.message || '',
        time: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
        outgoing: Boolean(msg.out),
        read: true,
        senderName: senderName || undefined,
        senderId: senderId || undefined,
        senderAvatar,
        senderColor,
        senderInitials,
        replyTo,
      };
    }).reverse();
  } catch (err: any) {
    console.warn('[TelegramService] Error fetching messages for peer:', peerId, err?.message);
    return null;
  }
}

/**
 * Fetch detailed chat information (subscribers, online members count, about/bio)
 */
export async function fetchTelegramChatDetails(chatId: string): Promise<ChatDetails | null> {
  if (!activeClient || !isLiveConnected) return null;

  const cleanPeer = chatId.startsWith('tg_') ? chatId.replace('tg_', '') : chatId;

  try {
    let entity: any = peerEntityCache.get(cleanPeer);
    if (!entity) {
      try {
        if (/^-?\d+$/.test(cleanPeer)) {
          entity = await activeClient.getEntity(BigInt(cleanPeer) as any);
        } else {
          entity = await activeClient.getEntity(cleanPeer);
        }
      } catch {
        entity = await activeClient.getInputEntity(cleanPeer);
      }
    }

    let participantsCount: number | undefined;
    let onlineCount: number | undefined;
    let about: string | undefined;

    if (entity?.className === 'Channel' || entity?.broadcast || entity?.megagroup) {
      try {
        const full = (await activeClient.invoke(new Api.channels.GetFullChannel({ channel: entity }))) as any;
        const fullChat = full?.fullChat;
        participantsCount = fullChat?.participantsCount ?? entity?.participantsCount;
        onlineCount = fullChat?.onlineCount;
        about = fullChat?.about;
      } catch (e: any) {
        console.warn('[TelegramService] GetFullChannel error:', e?.message);
        participantsCount = entity?.participantsCount;
      }
    } else if (entity?.className === 'Chat') {
      try {
        const full = (await activeClient.invoke(new Api.messages.GetFullChat({ chatId: entity.id }))) as any;
        const fullChat = full?.fullChat;
        const participants = fullChat?.participants?.participants || [];
        participantsCount = participants.length;
        if (full?.users) {
          onlineCount = full.users.filter((u: any) => u.status?.className === 'UserStatusOnline').length;
        }
        about = fullChat?.about;
      } catch (e: any) {
        console.warn('[TelegramService] GetFullChat error:', e?.message);
      }
    } else if (entity?.className === 'User') {
      try {
        const full = (await activeClient.invoke(new Api.users.GetFullUser({ id: entity }))) as any;
        about = full?.fullUser?.about;
        if (entity.status?.className === 'UserStatusOnline') {
          onlineCount = 1;
        }
      } catch (e: any) {
        console.warn('[TelegramService] GetFullUser error:', e?.message);
      }
    }

    const peerIdStr = entity?.id ? entity.id.toString() : cleanPeer;
    return {
      id: chatId,
      participantsCount,
      onlineCount,
      about,
      isChannel: Boolean(entity?.broadcast),
      isGroup: Boolean(entity?.megagroup || entity?.className === 'Chat'),
      avatarUrl: entity?.photo ? `/api/telegram/avatar/${peerIdStr}` : undefined,
    };
  } catch (err: any) {
    console.warn(`[TelegramService] Error getting full chat details for ${chatId}:`, err?.message);
    return null;
  }
}

/**
 * Type definition for incoming message listener
 */
export type TelegramIncomingMessageListener = (data: {
  senderId: string;
  senderName: string;
  senderUsername?: string;
  peerId: string;
  chatTitle?: string;
  text: string;
  messageId: number;
  time: string;
  respond: (text: string) => Promise<void>;
}) => Promise<void> | void;

const messageListeners: TelegramIncomingMessageListener[] = [];

/**
 * Register a callback whenever a new real message is received via MTProto
 */
export function registerTelegramIncomingMessageListener(listener: TelegramIncomingMessageListener) {
  messageListeners.push(listener);
}

/**
 * Attach MTProto NewMessage event handler to the active client
 */
function setupClientEventHandlers(client: TelegramClient) {
  try {
    client.addEventHandler(async (event: any) => {
      try {
        const msg = event?.message;
        if (!msg || !msg.message) return;
        const text = String(msg.message);
        const peer = msg.peerId;
        const peerId = (peer?.channelId || peer?.chatId || peer?.userId || '').toString();

        let senderName = 'مستخدم';
        let senderUsername: string | undefined;
        let senderId = '';
        try {
          const sender = await event.getSender();
          if (sender) {
            senderId = sender.id?.toString() || '';
            senderName = sender.firstName
              ? `${sender.firstName} ${sender.lastName || ''}`.trim()
              : (sender.title || sender.username || 'مستخدم');
            if (sender.username) senderUsername = `@${sender.username}`;
          }
        } catch {
          // ignore
        }

        let chatTitle: string | undefined;
        try {
          const chat = await event.getChat();
          if (chat && chat.title) chatTitle = chat.title;
        } catch {
          // ignore
        }

        const respond = async (replyText: string) => {
          try {
            await client.sendMessage(peerId || senderId, {
              message: replyText,
              replyTo: msg.id,
            });
          } catch (replyErr) {
            console.warn('[TelegramService] Error responding to message:', replyErr);
          }
        };

        for (const listener of messageListeners) {
          try {
            await listener({
              senderId,
              senderName,
              senderUsername,
              peerId,
              chatTitle,
              text,
              messageId: msg.id,
              time: new Date().toISOString(),
              respond,
            });
          } catch (lErr) {
            console.warn('[TelegramService] Message listener callback error:', lErr);
          }
        }
      } catch (inner) {
        // ignore
      }
    }, new NewMessage({ incoming: true }));
    console.log('[TelegramService] Live NewMessage event handler active for connected MTProto account');
  } catch (err: any) {
    console.warn('[TelegramService] Failed to attach NewMessage event handler:', err?.message || err);
  }
}

/**
 * Get the currently active GramJS client if connected
 */
export function getActiveTelegramClient(): TelegramClient | null {
  return activeClient;
}

/**
 * Broadcast message to multiple chats/dialogs using real MTProto client
 */
export async function broadcastRealTelegramMessage(
  targetPeers: string[],
  message: string,
  delayMs = 1200
): Promise<{ total: number; sent: number; failed: number; results: Array<{ peer: string; success: boolean; error?: string }> }> {
  if (!activeClient || !isLiveConnected) {
    return {
      total: targetPeers.length,
      sent: 0,
      failed: targetPeers.length,
      results: targetPeers.map(p => ({ peer: p, success: false, error: 'الحساب غير متصل حالياً' })),
    };
  }

  const results: Array<{ peer: string; success: boolean; error?: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const peer of targetPeers) {
    try {
      const cleanPeer = peer.startsWith('tg_') ? peer.replace('tg_', '') : peer;
      await activeClient.sendMessage(cleanPeer, { message });
      sent++;
      results.push({ peer, success: true });

      if (delayMs > 0 && targetPeers.length > 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err: any) {
      failed++;
      results.push({ peer, success: false, error: err?.message || 'فشل الإرسال' });
    }
  }

  return { total: targetPeers.length, sent, failed, results };
}

/**
 * Join Telegram group or channel using real MTProto client
 */
export async function joinTelegramChannelOrGroup(rawTarget: string): Promise<{ success: boolean; title?: string; error?: string }> {
  if (!activeClient || !isLiveConnected) {
    return { success: false, error: 'لا يوجد حساب تيليجرام نشط متصل حالياً' };
  }

  try {
    const target = rawTarget.trim();
    if (!target) {
      return { success: false, error: 'الرابط أو المعرف فارغ' };
    }

    // Check private invite link: t.me/+hash or t.me/joinchat/hash
    const inviteMatch = target.match(/(?:t\.me\/(?:\+|joinchat\/))([a-zA-Z0-9_\-]+)/);
    if (inviteMatch && inviteMatch[1]) {
      const hash = inviteMatch[1];
      try {
        const res = (await activeClient.invoke(new Api.messages.ImportChatInvite({ hash }))) as any;
        const chatTitle = res?.chats?.[0]?.title || 'مجموعة خاصة';
        return { success: true, title: chatTitle };
      } catch (inviteErr: any) {
        const msg = inviteErr?.message || String(inviteErr);
        if (msg.includes('USER_ALREADY_PARTICIPANT')) {
          return { success: true, title: 'أنت عضو بالفعل في هذه المجموعة' };
        }
        if (msg.includes('INVITE_HASH_EXPIRED')) {
          return { success: false, error: 'رابط الدعوة منتهي الصلاحية' };
        }
        throw inviteErr;
      }
    }

    // Check public channel/group: @username or t.me/username
    const cleanUsername = target
      .replace(/https?:\/\/t\.me\//, '')
      .replace(/^@/, '')
      .split('/')[0]
      .split('?')[0]
      .trim();

    if (cleanUsername) {
      const entity = (await activeClient.getEntity(cleanUsername)) as any;
      await activeClient.invoke(new Api.channels.JoinChannel({ channel: entity }));
      const title = entity?.title || cleanUsername;
      return { success: true, title };
    }

    return { success: false, error: 'صيغة الرابط غير معروفة' };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    if (errorMsg.includes('USER_ALREADY_PARTICIPANT')) {
      return { success: true, title: 'أنت عضو بالفعل في هذه المجموعة' };
    }
    if (errorMsg.includes('CHANNELS_TOO_MUCH')) {
      return { success: false, error: 'بلغ الحساب الحد الأقصى للقنوات والمجموعات المشترك بها' };
    }
    return { success: false, error: errorMsg };
  }
}


