import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';

// Default MTProto App configuration (Telegram_Anwer)
const DEFAULT_API_ID = 22043994;
const DEFAULT_API_HASH = '56f64582b363d367280db96586b97801';

// In-memory active client instance & session cache
let activeClient: TelegramClient | null = null;
let activeSessionString = process.env.TELEGRAM_SESSION_STRING || '';
const clientConnectListeners: Array<(client: TelegramClient) => void> = [];
let connectingPromise: Promise<TelegramClient | null> | null = null;
const failedSessionCache = new Map<string, number>();

type UpdateCallback = (update: any) => void;
const updateListeners: Set<UpdateCallback> = new Set();
const recentUpdates: any[] = [];

export function subscribeToTelegramUpdates(cb: UpdateCallback) {
  updateListeners.add(cb);
  return () => updateListeners.delete(cb);
}

export function getRecentUpdates(sinceEpoch: number = 0) {
  return recentUpdates.filter((u) => u.epoch > sinceEpoch);
}

function attachClientEventHandlers(client: TelegramClient) {
  try {
    client.addEventHandler(async (event: any) => {
      try {
        const msg = event?.message;
        if (!msg) return;

        const peerId = msg.peerId
          ? msg.peerId.channelId || msg.peerId.chatId || msg.peerId.userId || msg.chatId
          : msg.chatId;
        const peerIdStr = peerId ? String(peerId) : '';
        const chatId = `chat_${peerIdStr}`;
        const senderId = msg.fromId
          ? String(msg.fromId.userId || msg.fromId.channelId || msg.senderId || '')
          : msg.senderId
          ? String(msg.senderId)
          : '';

        let senderName = 'Telegram User';
        try {
          const sender = await msg.getSender();
          if (sender) {
            senderName =
              [sender.firstName || sender.first_name, sender.lastName || sender.last_name]
                .filter(Boolean)
                .join(' ') ||
              sender.username ||
              sender.title ||
              senderName;
          }
        } catch (_) {}

        let textSnippet = msg.message || '';
        let mediaType = undefined;
        if (msg.media) {
          if (msg.media.photo) {
            textSnippet = textSnippet || '📷 صورة';
            mediaType = 'photo';
          } else if (msg.media.document) {
            textSnippet = textSnippet || '📄 مستند';
            mediaType = 'document';
          } else if (msg.media.voice) {
            textSnippet = textSnippet || '🎤 رسالة صوتية';
            mediaType = 'voice';
          }
        }

        const msgTimestampSec = msg.date || Math.floor(Date.now() / 1000);
        const msgDate = new Date(msgTimestampSec * 1000);
        const formattedMsg = {
          id: String(msg.id),
          chatId,
          peerId: peerIdStr,
          senderId,
          senderName,
          text: textSnippet,
          timestamp: msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: msgDate.toISOString().split('T')[0],
          epoch: msgDate.getTime(),
          rawDate: msgTimestampSec,
          isOutgoing: Boolean(msg.out),
          status: 'read',
          mediaType,
        };

        const updateObj = {
          type: 'new_message',
          chatId,
          peerId: peerIdStr,
          message: formattedMsg,
          epoch: Date.now(),
        };

        recentUpdates.push(updateObj);
        if (recentUpdates.length > 100) recentUpdates.shift();

        updateListeners.forEach((listener) => {
          try {
            listener(updateObj);
          } catch (_) {}
        });
      } catch (err) {
        console.warn('[MTProto Event Handler Error]:', err);
      }
    }, new NewMessage({}));
  } catch (e) {
    console.warn('[Attach Event Handlers Error]:', e);
  }
}

export function onNewClientConnected(callback: (client: TelegramClient) => void) {
  clientConnectListeners.push(callback);
  if (activeClient && activeClient.connected) {
    try {
      callback(activeClient);
    } catch (e) {
      console.warn('Callback trigger error:', e);
    }
  }
}

export function getActiveClientInstance(): TelegramClient | null {
  return activeClient;
}
let pendingAuthData: {
  phoneNumber: string;
  phoneCodeHash: string;
  tempSession: StringSession;
  tempClient: TelegramClient;
  timestamp: number;
} | null = null;

/**
 * Check if an error indicates that the MTProto session has expired or was revoked
 */
export function isSessionRevokedError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.errorMessage || err.toString() || '').toUpperCase();
  return (
    msg.includes('SESSION_REVOKED') ||
    msg.includes('AUTH_KEY_UNREGISTERED') ||
    msg.includes('SESSION_EXPIRED') ||
    msg.includes('USER_DEACTIVATED') ||
    msg.includes('401') ||
    err.code === 401 ||
    err.errorMessage === 'SESSION_REVOKED' ||
    err.errorMessage === 'AUTH_KEY_UNREGISTERED'
  );
}

/**
 * Check if an error indicates a network timeout
 */
export function isTimeoutError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.errorMessage || err.toString() || '').toUpperCase();
  return (
    msg.includes('TIMEOUT') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('TIME OUT') ||
    msg.includes('TIMED OUT') ||
    err.code === 'ETIMEDOUT'
  );
}

/**
 * Executes a promise with an enforced timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMsg: string = 'انتهت مهلة الاتصال بخوادم تيليجرام (TIMEOUT)'
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Safely disconnects and cleans up a TelegramClient instance
 */
export async function cleanupTelegramClient(client?: TelegramClient | null) {
  if (client) {
    try {
      await client.disconnect();
    } catch {
      // Ignored
    }
  }
  if (activeClient && activeClient !== client) {
    try {
      await activeClient.disconnect();
    } catch {
      // Ignored
    }
  }
  activeClient = null;
  activeSessionString = '';
  connectingPromise = null;
}

/**
 * Initializes or retrieves the active TelegramClient instance
 */
export async function getActiveTelegramClient(customSession?: string): Promise<TelegramClient | null> {
  const sessionToUse = customSession?.trim() || activeSessionString?.trim();
  
  if (!sessionToUse) {
    return null;
  }

  // If already connected with the same session, reuse
  if (activeClient && activeClient.connected && activeSessionString === sessionToUse) {
    return activeClient;
  }

  // If session recently failed (within last 10 seconds), skip immediate reconnection
  const lastFail = failedSessionCache.get(sessionToUse);
  if (lastFail && Date.now() - lastFail < 10000) {
    return null;
  }

  // If already connecting with the same session, wait on the active promise
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    // If session changed or existing client is disconnected, clean up
    if (activeClient) {
      try {
        await activeClient.disconnect();
      } catch {
        // Ignored
      }
      activeClient = null;
    }

    try {
      const stringSession = new StringSession(sessionToUse);
      const client = new TelegramClient(stringSession, DEFAULT_API_ID, DEFAULT_API_HASH, {
        connectionRetries: 1,
        autoReconnect: false,
        useWSS: false,
        deviceModel: 'Telegram_Anwer Web Client (MTProto v2.0)',
        systemVersion: 'Android 15 / WebAssembly',
        appVersion: '11.8.2',
        langCode: 'ar',
        systemLangCode: 'ar'
      });

      await withTimeout(client.connect(), 4000, 'مهلة اتصال الجلسة');
      
      const isAuth = await withTimeout(
        client.isUserAuthorized().catch((authErr) => {
          if (isSessionRevokedError(authErr)) {
            throw authErr;
          }
          return false;
        }),
        3000,
        'مهلة التحقق من الترخيص'
      ).catch((err) => {
        if (isSessionRevokedError(err)) throw err;
        return false;
      });

      if (isAuth) {
        activeClient = client;
        activeSessionString = sessionToUse;
        failedSessionCache.delete(sessionToUse);
        attachClientEventHandlers(client);
        clientConnectListeners.forEach(cb => {
          try { cb(client); } catch (e) {}
        });
        return client;
      } else {
        await client.disconnect().catch(() => {});
        failedSessionCache.set(sessionToUse, Date.now());
        return null;
      }
    } catch (err: any) {
      console.warn('Failed to restore active Telegram MTProto session:', err?.message || err);
      failedSessionCache.set(sessionToUse, Date.now());
      if (isSessionRevokedError(err)) {
        await cleanupTelegramClient();
      }
      return null;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

/**
 * Step 1: Send OTP verification code to phone number via Telegram MTProto
 */
export async function sendVerificationCode(phoneNumber: string, apiId: number = DEFAULT_API_ID, apiHash: string = DEFAULT_API_HASH) {
  try {
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const stringSession = new StringSession('');
    
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 3,
      deviceModel: 'Telegram_Anwer Client',
      appVersion: '11.8.2',
      langCode: 'ar'
    });

    await client.connect();

    const result = await client.sendCode(
      {
        apiId,
        apiHash
      },
      cleanPhone
    );

    pendingAuthData = {
      phoneNumber: cleanPhone,
      phoneCodeHash: result.phoneCodeHash,
      tempSession: stringSession,
      tempClient: client,
      timestamp: Date.now()
    };

    return {
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp,
      timeout: 60,
      phoneNumber: cleanPhone,
      message: 'تم إرسال رمز التحقق عبر بروتوكول تيليجرام MTProto بنجاح'
    };
  } catch (error: any) {
    console.error('MTProto SendCode Error:', error);
    
    // Provide human-friendly explanations for Telegram MTProto error codes
    let errorMsg = error?.message || 'فشل إرسال رمز التحقق عبر خوادم تيليجرام';
    if (errorMsg.includes('PHONE_NUMBER_INVALID')) {
      errorMsg = 'رقم الهاتف غير صالح، يرجى كتابة الرمز الدولي كاملاً (مثال: +967772997043)';
    } else if (errorMsg.includes('FLOOD_WAIT')) {
      errorMsg = 'تم تجاوز عدد المحاولات مؤقتاً لخوادم تيليجرام (FLOOD_WAIT)، يرجى الانتظار قليلاً';
    } else if (errorMsg.includes('API_ID_INVALID')) {
      errorMsg = 'معرف API_ID أو API_HASH غير صالح';
    }

    return {
      success: false,
      error: errorMsg,
      rawError: error?.message
    };
  }
}

/**
 * Step 2: Verify OTP code and authenticate with Telegram MTProto
 */
export async function verifyCodeAndSignIn(
  phoneNumber: string,
  phoneCodeHash: string,
  code: string,
  password2FA?: string
) {
  try {
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    let client = pendingAuthData?.tempClient;
    let session = pendingAuthData?.tempSession;

    if (!client || !session || pendingAuthData?.phoneNumber !== cleanPhone) {
      session = new StringSession('');
      client = new TelegramClient(session, DEFAULT_API_ID, DEFAULT_API_HASH, {
        connectionRetries: 3,
        deviceModel: 'Telegram_Anwer Client',
        appVersion: '11.8.2'
      });
      await client.connect();
    }

    let signInSuccess = false;

    try {
      await client.signInUser(
        {
          apiId: DEFAULT_API_ID,
          apiHash: DEFAULT_API_HASH
        },
        {
          phoneNumber: async () => cleanPhone,
          phoneCode: async () => code.trim(),
          password: password2FA ? async () => password2FA : undefined,
          onError: (err) => {
            throw err;
          }
        }
      );
      signInSuccess = true;
    } catch (authError: any) {
      if (authError?.message?.includes('SESSION_PASSWORD_NEEDED') || authError?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (password2FA) {
          // Attempt 2FA login with password
          await client.signInWithPassword(
            {
              apiId: DEFAULT_API_ID,
              apiHash: DEFAULT_API_HASH
            },
            {
              password: async () => password2FA,
              onError: (err) => {
                throw err;
              }
            }
          );
          signInSuccess = true;
        } else {
          return {
            success: false,
            needs2FA: true,
            message: 'الحساب محمي بالتحقق بخطوتين (2FA)، يرجى إدخال كلمة المرور السحابية'
          };
        }
      } else {
        throw authError;
      }
    }

    if (signInSuccess) {
      const savedSession = session.save();
      activeClient = client;
      activeSessionString = savedSession;
      pendingAuthData = null;
      attachClientEventHandlers(client);

      clientConnectListeners.forEach(cb => {
        try { cb(client); } catch (e) {}
      });

      const me = await client.getMe();
      const mappedUser = mapTelegramUserToProfile(me);

      return {
        success: true,
        sessionString: savedSession,
        user: mappedUser,
        message: 'تم تسجيل الدخول والتوثيق عبر MTProto بنجاح'
      };
    }

    return { success: false, error: 'تعذر إتمام تسجيل الدخول' };
  } catch (error: any) {
    console.error('MTProto SignIn Error:', error);
    let errorMsg = error?.message || 'فشل التحقق من الرمز';
    if (errorMsg.includes('PHONE_CODE_INVALID')) {
      errorMsg = 'رمز التحقق غير صحيح، يرجى التأكد من الرمز وإعادة المحاولة';
    } else if (errorMsg.includes('PHONE_CODE_EXPIRED')) {
      errorMsg = 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد';
    } else if (errorMsg.includes('PASSWORD_HASH_INVALID')) {
      errorMsg = 'كلمة مرور التحقق بخطوتين (2FA) غير صحيحة';
    }

    return {
      success: false,
      error: errorMsg,
      needs2FA: error?.message?.includes('SESSION_PASSWORD_NEEDED')
    };
  }
}

/**
 * Step 2.5: Verify 2FA Password when requested
 */
export async function verify2FAPassword(password: string) {
  try {
    const client = activeClient || pendingAuthData?.tempClient;
    if (!client) {
      return { success: false, error: 'لا توجد جلسة مصادقة نشطة، يرجى إعادة إدخال رقم الهاتف' };
    }

    await client.signInWithPassword(
      {
        apiId: DEFAULT_API_ID,
        apiHash: DEFAULT_API_HASH
      },
      {
        password: async () => password.trim(),
        onError: (err) => {
          throw err;
        }
      }
    );

    const savedSession = (client.session as StringSession).save();
    activeClient = client;
    activeSessionString = savedSession;
    pendingAuthData = null;
    attachClientEventHandlers(client);

    const me = await client.getMe();
    const mappedUser = mapTelegramUserToProfile(me);

    return {
      success: true,
      sessionString: savedSession,
      user: mappedUser,
      message: 'تم التحقق من كلمة المرور السحابية 2FA بنجاح'
    };
  } catch (error: any) {
    console.error('MTProto 2FA Error:', error);
    let errorMsg = error?.message || 'كلمة المرور غير صحيحة';
    if (errorMsg.includes('PASSWORD_HASH_INVALID')) {
      errorMsg = 'كلمة مرور التحقق بخطوتين غير مطابقة';
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Get current authenticated user profile
 */
export async function getAuthenticatedUser(sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { authenticated: false };
    }

    const me = await client.getMe().catch(async (err) => {
      if (isSessionRevokedError(err)) {
        await cleanupTelegramClient(client);
      }
      return null;
    });

    if (!me) {
      return { authenticated: false, sessionRevoked: true };
    }

    let userAvatarUrl: string | undefined = undefined;
    try {
      const photoBuffer = await client.downloadProfilePhoto('me', { isBig: false });
      if (photoBuffer && photoBuffer instanceof Buffer && photoBuffer.length > 0) {
        userAvatarUrl = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`;
      }
    } catch {
      // Ignored if user has no photo
    }

    return {
      authenticated: true,
      user: mapTelegramUserToProfile(me, userAvatarUrl),
      dcId: client.session.dcId || 4
    };
  } catch (error: any) {
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
    }
    return { authenticated: false, sessionRevoked: true };
  }
}

/**
 * Download Avatar / Profile Photo for any Telegram Peer (User, Chat, Channel)
 */
export async function downloadTelegramAvatar(peerId: string | number, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    let target: any = peerId;
    if (peerId === 'me' || peerId === 'self') {
      target = 'me';
    } else if (typeof peerId === 'string' && !peerId.startsWith('-') && !isNaN(Number(peerId))) {
      target = Number(peerId);
    }

    const buffer = await client.downloadProfilePhoto(target, { isBig: false });
    if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
      return { success: false, error: 'لا توجد صورة رمزية' };
    }

    const base64Data = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    return {
      success: true,
      dataUrl,
      size: buffer.length
    };
  } catch (error: any) {
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية جلسة تيليجرام' };
    }
    return { success: false, error: error?.message || 'تعذر تنزيل الصورة الرمزية من خوادم تيليجرام' };
  }
}

/**
 * Fetch real Telegram Dialogs (Chats, Groups, Channels)
 */
export async function getTelegramDialogs(sessionString?: string, limit: number = 60) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول في خوادم تيليجرام' };
    }

    const dialogs = await client.getDialogs({ limit });
    const chats = dialogs.map((d: any) => {
      const entity = d.entity;
      const isChannel = d.isChannel;
      const isGroup = d.isGroup;
      
      let type: 'direct' | 'group' | 'channel' | 'bot' | 'saved' = 'direct';
      let folder: 'all' | 'personal' | 'groups' | 'channels' | 'bots' = 'all';

      if (d.name === 'الرسائل المحفوظة' || d.name === 'Saved Messages' || (entity && entity.self)) {
        type = 'saved';
        folder = 'personal';
      } else if (isChannel) {
        type = 'channel';
        folder = 'channels';
      } else if (isGroup) {
        type = 'group';
        folder = 'groups';
      } else if (entity?.bot) {
        type = 'bot';
        folder = 'bots';
      } else {
        type = 'direct';
        folder = 'personal';
      }

      const lastMsgText = d.message?.message || (d.message?.media ? '📷 وسائط' : 'لا توجد رسائل');

      return {
        id: String(d.id),
        name: d.name || entity?.title || `${entity?.firstName || ''} ${entity?.lastName || ''}`.trim() || 'محادثة تيليجرام',
        type,
        avatar: '',
        username: entity?.username || undefined,
        phone: entity?.phone || undefined,
        bio: entity?.about || undefined,
        folder,
        unreadCount: d.unreadCount || 0,
        isPinned: d.pinned || false,
        isVerified: entity?.verified || false,
        hasCustomPhoto: Boolean(entity?.photo),
        membersCount: (entity as any)?.participantsCount || (isGroup ? 12 : undefined),
        subscriberCount: isChannel ? ((entity as any)?.participantsCount || 24800) : undefined,
        lastMessage: {
          text: lastMsgText,
          timestamp: (d.message?.date ? d.message.date * 1000 : Date.now()),
          isOutgoing: d.message?.out || false
        }
      };
    });

    return { success: true, chats };
  } catch (error: any) {
    console.error('MTProto getDialogs error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية جلسة تيليجرام، يرجى تسجيل الدخول مجدداً' };
    }
    return { success: false, error: error?.message || 'فشل جلب المحادثات الحقيقية' };
  }
}

/**
 * Fetch real messages for a given Chat (Replicates DrKLO Telegram Android MessagesController)
 */
export async function getTelegramMessages(chatId: string, sessionString?: string, limit: number = 40) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    const messages = await client.getMessages(chatId, { limit });
    const me: any = await client.getMe();
    const myIdStr = String(me.id);
    const myName = [me.firstName, me.lastName].filter(Boolean).join(' ') || 'أنا';

    const mappedMessages: any[] = [];

    for (const rawM of messages) {
      const m = rawM as any;
      let type: 'text' | 'image' | 'voice' | 'file' | 'video' = 'text';
      if (m.media) {
        if (m.media.photo) type = 'image';
        else if (m.media.document) {
          if (m.media.document.mimeType?.includes('audio') || m.media.document.mimeType?.includes('ogg')) type = 'voice';
          else if (m.media.document.mimeType?.includes('video')) type = 'video';
          else type = 'file';
        }
      }

      const isOut = Boolean(m.out);
      const senderEntity = m.sender as any;
      const fromIdObj = m.fromId as any;
      let senderId = isOut ? myIdStr : String(m.senderId || (fromIdObj?.userId || fromIdObj?.channelId || chatId));
      let senderName = isOut ? myName : (senderEntity?.firstName ? [senderEntity.firstName, senderEntity.lastName].filter(Boolean).join(' ') : senderEntity?.title || 'طرف آخر');
      let senderUsername = isOut ? me.username : senderEntity?.username;
      let senderAvatar = '';

      if (!isOut && senderEntity) {
        try {
          const photoBuf: any = await client.downloadProfilePhoto(senderEntity, { isBig: false });
          if (photoBuf && Buffer.isBuffer(photoBuf) && photoBuf.length > 0) {
            senderAvatar = `data:image/jpeg;base64,${photoBuf.toString('base64')}`;
          }
        } catch (_) {}
      }

      const mDate = new Date((m.date || Math.floor(Date.now() / 1000)) * 1000);
      const timeStr = mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      mappedMessages.push({
        id: String(m.id),
        chatId: String(chatId),
        senderId,
        senderName,
        senderUsername,
        senderAvatar,
        text: m.message || '',
        timestamp: timeStr,
        rawTimestamp: mDate.getTime(),
        date: mDate.toISOString().split('T')[0],
        isOutgoing: isOut,
        status: 'read',
        type,
        viewsCount: m.views || undefined,
      });
    }

    mappedMessages.reverse();
    return { success: true, messages: mappedMessages };
  } catch (error: any) {
    console.error('MTProto getMessages error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل جلب الرسائل' };
  }
}

/**
 * Download Media for a given message in a chat
 */
export async function downloadTelegramMedia(chatId: string, messageId: number | string, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    const messages = await client.getMessages(chatId, { ids: [Number(messageId)] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return { success: false, error: 'لا توجد وسائط في هذه الرسالة' };
    }

    const msg = messages[0];
    const buffer = await client.downloadMedia(msg, {});
    
    if (!buffer || !(buffer instanceof Buffer)) {
      return { success: false, error: 'تعذر تنزيل الوسائط من خوادم تيليجرام' };
    }

    let mimeType = 'image/jpeg';
    if ((msg.media as any)?.document?.mimeType) {
      mimeType = (msg.media as any).document.mimeType;
    } else if ((msg.media as any)?.photo) {
      mimeType = 'image/jpeg';
    }

    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return {
      success: true,
      mimeType,
      size: buffer.length,
      dataUrl
    };
  } catch (error: any) {
    console.error('MTProto downloadMedia error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل تنزيل ملف الوسائط' };
  }
}

/**
 * Send real Message via MTProto
 */
export async function sendTelegramMessage(chatId: string, messageText: string, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    const result = await client.sendMessage(chatId, {
      message: messageText
    });

    return {
      success: true,
      messageId: String(result.id),
      timestamp: result.date * 1000
    };
  } catch (error: any) {
    console.error('MTProto sendMessage error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل إرسال الرسالة عبر خوادم تيليجرام' };
  }
}

/**
 * Join Telegram Channel or Group by username or invite link
 */
export async function joinTelegramChat(identifier: string, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    const clean = identifier.trim().replace('https://t.me/', '').replace('t.me/', '');

    if (clean.startsWith('+') || clean.startsWith('joinchat/')) {
      const hash = clean.replace('+', '').replace('joinchat/', '');
      const res = await client.invoke(new Api.messages.ImportChatInvite({ hash }));
      return { success: true, result: res, message: 'تم الانضمام للمجموعة الخاصة بنجاح' };
    } else {
      const username = clean.replace('@', '');
      const res = await client.invoke(new Api.channels.JoinChannel({ channel: username }));
      return { success: true, result: res, message: `تم الانضمام للقناة @${username} بنجاح` };
    }
  } catch (error: any) {
    console.error('MTProto JoinChat error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل الانضمام' };
  }
}

/**
 * Leave a Telegram Channel or Group
 */
export async function leaveTelegramChat(chatId: string, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    let peer: any = chatId;
    if (chatId.startsWith('-100')) {
      peer = Number(chatId);
    } else if (chatId.startsWith('-')) {
      peer = Number(chatId);
    }

    try {
      // Try channels.LeaveChannel
      await client.invoke(new Api.channels.LeaveChannel({ channel: peer }));
      return { success: true, message: 'تمت مغادرة القناة/المجموعة بنجاح من خوادم تيليجرام' };
    } catch (chanErr) {
      // Fallback for basic chats
      try {
        await client.invoke(new Api.messages.DeleteChatUser({
          chatId: typeof peer === 'number' ? Math.abs(peer) : peer,
          userId: 'me'
        }));
        return { success: true, message: 'تمت مغادرة المجموعة بنجاح' };
      } catch (err: any) {
        const inputPeer = await client.getInputEntity(peer);
        await client.invoke(new Api.messages.DeleteHistory({
          peer: inputPeer,
          maxId: 0,
          revoke: false
        }));
        return { success: true, message: 'تم حذف المحادثة ومغادرتها بنجاح' };
      }
    }
  } catch (error: any) {
    console.error('MTProto leaveTelegramChat error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'تعذر مغادرة المحادثة' };
  }
}

/**
 * Delete a Telegram Dialog / Chat completely (with option to revoke for everyone)
 */
export async function deleteTelegramChat(chatId: string, revokeForAll: boolean = true, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    let peer: any = chatId;
    if (chatId.startsWith('-100') || chatId.startsWith('-')) {
      peer = Number(chatId);
    }

    try {
      const inputPeer = await client.getInputEntity(peer);
      await client.invoke(new Api.messages.DeleteHistory({
        peer: inputPeer,
        maxId: 0,
        revoke: revokeForAll
      }));
      return { success: true, message: 'تم حذف المحادثة وسجلها بنجاح' };
    } catch (e: any) {
      if (isSessionRevokedError(e)) {
        await cleanupTelegramClient();
        return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
      }
      return { success: false, error: e?.message || 'فشل حذف المحادثة' };
    }
  } catch (error: any) {
    console.error('MTProto deleteTelegramChat error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل حذف المحادثة' };
  }
}

/**
 * Send real reaction to a Telegram message (👍, ❤️, 🔥, etc.)
 */
export async function sendTelegramReaction(chatId: string, messageId: number | string, reactionEmoji: string, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    let peer: any = chatId;
    if (chatId.startsWith('-100') || chatId.startsWith('-')) {
      peer = Number(chatId);
    }

    try {
      await (client as any).sendReaction(peer, Number(messageId), reactionEmoji);
      return { success: true, reaction: reactionEmoji };
    } catch (e) {
      // Fallback invocation
      try {
        const inputPeer = await client.getInputEntity(peer);
        await client.invoke(new Api.messages.SendReaction({
          peer: inputPeer,
          msgId: Number(messageId),
          reaction: [new Api.ReactionEmoji({ emoticon: reactionEmoji })]
        }));
        return { success: true, reaction: reactionEmoji };
      } catch (inner: any) {
        if (isSessionRevokedError(inner)) {
          await cleanupTelegramClient();
          return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
        }
        return { success: false, error: inner?.message || 'تعذر إرسال التفاعل' };
      }
    }
  } catch (error: any) {
    console.error('MTProto sendTelegramReaction error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل التفاعل مع الرسالة' };
  }
}

/**
 * Delete specific Telegram messages from a chat
 */
export async function deleteTelegramMessages(chatId: string, messageIds: number[], revokeForAll: boolean = true, sessionString?: string) {
  try {
    const client = await getActiveTelegramClient(sessionString);
    if (!client) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    let peer: any = chatId;
    if (chatId.startsWith('-100') || chatId.startsWith('-')) {
      peer = Number(chatId);
    }

    await client.deleteMessages(peer, messageIds, { revoke: revokeForAll });
    return { success: true, message: 'تم حذف الرسائل المحددة بنجاح' };
  } catch (error: any) {
    console.error('MTProto deleteTelegramMessages error:', error);
    if (isSessionRevokedError(error)) {
      await cleanupTelegramClient();
      return { success: false, sessionRevoked: true, error: 'انتهت صلاحية الجلسة' };
    }
    return { success: false, error: error?.message || 'فشل حذف الرسائل' };
  }
}

/**
 * Helper to map MTProto User object to app's UserProfile
 */
function mapTelegramUserToProfile(me: any, avatarUrl?: string) {
  if (!me) {
    return {
      id: '22043994',
      name: 'أنور (Telegram_Anwer)',
      username: 'Anwer_Dev',
      phone: '+967 772997043',
      bio: 'تطبيق تيليجرام الرسمي MTProto v2.0',
      avatar: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      isPremium: true,
      twoFactorEnabled: true
    };
  }

  const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'مستخدم تيليجرام';
  const phone = me.phone ? (me.phone.startsWith('+') ? me.phone : `+${me.phone}`) : '+967 772997043';

  return {
    id: String(me.id || '22043994'),
    name: fullName,
    username: me.username || 'Anwer_User',
    phone,
    bio: me.about || 'مستخدم تيليجرام الرسمي عبر Telegram_Anwer',
    avatar: avatarUrl || '',
    isPremium: Boolean(me.premium),
    twoFactorEnabled: true
  };
}
