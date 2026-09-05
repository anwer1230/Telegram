// Telegram Custom Service Worker Extension (sw-custom.js)
// Imported by Workbox SW via importScripts('/sw-custom.js')
// Handles Web Push (VAPID / FCM), Background Sync, Notification Click Routing, & Offline IndexedDB Storage

const DB_NAME = 'TelegramOfflineStore';
const DB_VERSION = 3;

// =========================================================================
// INDEXEDDB PROMISE-BASED STORAGE SUBSYSTEM
// =========================================================================

function openIndexedDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('chatId', 'chatId', { unique: false });
        msgStore.createIndex('dialog_id', 'dialog_id', { unique: false });
        msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        msgStore.createIndex('isRead', 'isRead', { unique: false });
      } else {
        const msgStore = request.transaction.objectStore('messages');
        if (!msgStore.indexNames.contains('dialog_id')) {
          msgStore.createIndex('dialog_id', 'dialog_id', { unique: false });
        }
      }

      // Chats / Dialogs summary store
      if (!db.objectStoreNames.contains('chats')) {
        const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatStore.createIndex('dialog_id', 'dialog_id', { unique: false });
        chatStore.createIndex('unreadCount', 'unreadCount', { unique: false });
        chatStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      } else {
        const chatStore = request.transaction.objectStore('chats');
        if (!chatStore.indexNames.contains('dialog_id')) {
          chatStore.createIndex('dialog_id', 'dialog_id', { unique: false });
        }
      }

      // Notification history log
      if (!db.objectStoreNames.contains('notifications')) {
        const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notifStore.createIndex('chatId', 'chatId', { unique: false });
        notifStore.createIndex('dialog_id', 'dialog_id', { unique: false });
        notifStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Pending background sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('dialog_id', 'dialog_id', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('[SW IndexedDB] Open error:', request.error);
      resolve(null);
    };
  });
}

async function persistIncomingPushMessage(payload) {
  try {
    const db = await openIndexedDB();
    if (!db) return;

    const { dialog_id, chatId, messageId, title, text, senderName, avatar, timestamp, isSilent, raw } = payload;
    const now = timestamp || Date.now();
    const effectiveDialogId = dialog_id || chatId;

    const tx = db.transaction(['messages', 'chats', 'notifications'], 'readwrite');
    const msgStore = tx.objectStore('messages');
    const chatStore = tx.objectStore('chats');
    const notifStore = tx.objectStore('notifications');

    // 1. Store message record
    const messageRecord = {
      id: messageId,
      chatId: effectiveDialogId,
      dialog_id: effectiveDialogId,
      senderId: (raw && (raw.sender_id || raw.from_id)) || effectiveDialogId,
      senderName,
      text,
      avatar,
      timestamp: now,
      date: new Date(now).toISOString(),
      isOutgoing: false,
      status: 'delivered',
      isRead: false,
      isSilent: !!isSilent,
      rawPayload: raw,
    };
    msgStore.put(messageRecord);

    // 2. Update chat summary & unread count
    const chatGetReq = chatStore.get(effectiveDialogId);
    chatGetReq.onsuccess = () => {
      const existingChat = chatGetReq.result || {
        id: effectiveDialogId,
        dialog_id: effectiveDialogId,
        title,
        unreadCount: 0,
        avatar,
        isMuted: false,
      };
      existingChat.unreadCount = (existingChat.unreadCount || 0) + 1;
      existingChat.lastMessageText = text;
      existingChat.lastMessageTime = now;
      existingChat.lastUpdated = now;
      chatStore.put(existingChat);
    };

    // 3. Log notification history
    notifStore.put({
      id: `notif_${messageId}`,
      chatId: effectiveDialogId,
      dialog_id: effectiveDialogId,
      title,
      body: text,
      timestamp: now,
      status: 'displayed',
      read: false,
    });

    await new Promise((res) => {
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch (err) {
    console.warn('[SW IndexedDB] Failed to persist push message:', err);
  }
}

async function markChatAsReadInDB(dialogId) {
  try {
    const db = await openIndexedDB();
    if (!db) return;

    const tx = db.transaction(['messages', 'chats', 'sync_queue'], 'readwrite');
    const msgStore = tx.objectStore('messages');
    const chatStore = tx.objectStore('chats');
    const syncStore = tx.objectStore('sync_queue');

    const chatReq = chatStore.get(dialogId);
    chatReq.onsuccess = () => {
      if (chatReq.result) {
        chatStore.put({ ...chatReq.result, unreadCount: 0 });
      }
    };

    const chatIndex = msgStore.index('chatId');
    const req = chatIndex.openCursor(IDBKeyRange.only(dialogId));
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const msg = cursor.value;
        if (!msg.isRead) {
          msg.isRead = true;
          cursor.update(msg);
        }
        cursor.continue();
      }
    };

    syncStore.put({
      id: `sync_read_${dialogId}_${Date.now()}`,
      type: 'MARK_READ',
      dialog_id: dialogId,
      chatId: dialogId,
      timestamp: Date.now(),
      status: 'pending',
    });

    await new Promise((res) => {
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch (err) {
    console.warn('[SW IndexedDB] Mark as read error:', err);
  }
}

async function saveInlineNotificationReply(dialogId, replyText) {
  try {
    const db = await openIndexedDB();
    if (!db) return;

    const tx = db.transaction(['messages', 'chats', 'sync_queue'], 'readwrite');
    const msgStore = tx.objectStore('messages');
    const chatStore = tx.objectStore('chats');
    const syncStore = tx.objectStore('sync_queue');

    const msgId = `msg_out_reply_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    msgStore.put({
      id: msgId,
      chatId: dialogId,
      dialog_id: dialogId,
      senderId: 'currentUser',
      senderName: 'You',
      text: replyText,
      timestamp: now,
      date: new Date(now).toISOString(),
      isOutgoing: true,
      status: 'pending',
      isRead: true,
    });

    const chatReq = chatStore.get(dialogId);
    chatReq.onsuccess = () => {
      if (chatReq.result) {
        chatStore.put({
          ...chatReq.result,
          lastMessageText: replyText,
          lastMessageTime: now,
          lastUpdated: now,
        });
      }
    };

    syncStore.put({
      id: `sync_msg_${msgId}`,
      type: 'SEND_MESSAGE',
      dialog_id: dialogId,
      chatId: dialogId,
      text: replyText,
      messageId: msgId,
      timestamp: now,
      status: 'pending',
    });

    await new Promise((res) => {
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch (err) {
    console.warn('[SW IndexedDB] Failed to save inline reply:', err);
  }
}

async function getStoredSetting(key) {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(['settings'], 'readonly');
      const req = tx.objectStore('settings').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveStoredSetting(key, value) {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(['settings'], 'readwrite');
    tx.objectStore('settings').put({ key, value });
  } catch (e) {
    console.warn('[SW IndexedDB] saveStoredSetting note:', e);
  }
}

async function processOfflineSyncQueue() {
  try {
    const db = await openIndexedDB();
    if (!db) return [];

    const tx = db.transaction(['sync_queue'], 'readonly');
    const req = tx.objectStore('sync_queue').getAll();

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const items = req.result || [];
        resolve(items.filter((i) => i.status === 'pending'));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// =========================================================================
// APPLICATION SETTINGS & MESSAGE LISTENERS
// =========================================================================

let cachedChatConfigs = {};
let cachedAppSettings = {
  notificationsEnabled: true,
  soundEffects: true,
  previewText: true,
  vibrate: true,
};

self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'FCM_SYNC_CHAT_NOTIFICATION_CONFIGS' && data.configs) {
    cachedChatConfigs = { ...cachedChatConfigs, ...data.configs };
    saveStoredSetting('chat_configs', cachedChatConfigs);
  }

  if (data.type === 'FCM_SYNC_APP_SETTINGS' && data.settings) {
    cachedAppSettings = { ...cachedAppSettings, ...data.settings };
    saveStoredSetting('app_settings', cachedAppSettings);
  }

  if (data.type === 'TRIGGER_BACKGROUND_NOTIFICATION' && data.notification) {
    const payload = parsePushPayload(data.notification);
    showTelegramPushNotification(payload);
  }

  if (data.type === 'REQUEST_OFFLINE_MESSAGES') {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(['messages'], 'readonly');
      const req = tx.objectStore('messages').getAll();
      req.onsuccess = () => {
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'OFFLINE_MESSAGES_RESPONSE',
            messages: req.result || [],
          });
        }
      };
    }
  }

  if (data.type === 'EXECUTE_BACKGROUND_SYNC') {
    const pendingItems = await processOfflineSyncQueue();
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        type: 'SYNC_QUEUE_PROCESSED',
        items: pendingItems,
      });
    }
  }
});

// =========================================================================
// PUSH EVENT PARSING & RENDERING (VAPID / WEB PUSH / FCM)
// =========================================================================

function parsePushPayload(rawData) {
  let parsed = {};
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch {
      parsed = { notification: { title: 'Telegram', body: rawData } };
    }
  } else if (rawData && typeof rawData === 'object') {
    parsed = rawData;
  }

  const fcmNotification = parsed.notification || {};
  const fcmData = parsed.data || parsed.raw || parsed;

  const rawDialogId =
    fcmData.dialog_id ||
    fcmData.dialogId ||
    fcmData.chat_id ||
    fcmData.chatId ||
    fcmData.peer_id ||
    fcmData.peerId ||
    fcmData.from_id ||
    parsed.dialog_id ||
    parsed.chatId ||
    'chat_general';

  const dialog_id = String(rawDialogId);

  const messageId =
    fcmData.msg_id ||
    fcmData.message_id ||
    fcmData.messageId ||
    parsed.messageId ||
    `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const title =
    fcmData.chat_title ||
    fcmData.title ||
    fcmNotification.title ||
    parsed.title ||
    'تيليجرام';

  const text =
    fcmData.text ||
    fcmData.body ||
    fcmData.message ||
    fcmNotification.body ||
    parsed.body ||
    'رسالة جديدة';

  const senderName = fcmData.sender_name || fcmData.senderName || parsed.senderName || title;
  const avatar = fcmData.avatar || fcmNotification.icon || parsed.icon || parsed.avatar || '/telegram-logo.svg';
  const isSilent =
    fcmData.silent === true ||
    fcmData.silent === 'true' ||
    fcmData.is_silent === 'true' ||
    parsed.isSilent === true;

  return {
    dialog_id,
    chatId: dialog_id,
    messageId: String(messageId),
    title,
    text,
    senderName,
    avatar,
    isSilent,
    raw: fcmData,
  };
}

async function showTelegramPushNotification(payload) {
  const { dialog_id, chatId, messageId, title, text, senderName, avatar, isSilent, raw } = payload;
  const effectiveDialogId = dialog_id || chatId;

  // 1. Safely persist to IndexedDB
  try {
    await persistIncomingPushMessage(payload);
  } catch (err) {
    console.warn('[SW] IndexedDB persistence warning:', err);
  }

  // 2. Read chat alert preferences
  let chatConfig = cachedChatConfigs[effectiveDialogId];
  if (!chatConfig) {
    const storedConfigs = await getStoredSetting('chat_configs');
    if (storedConfigs && storedConfigs[effectiveDialogId]) {
      chatConfig = storedConfigs[effectiveDialogId];
    }
  }

  if (!chatConfig) {
    chatConfig = {
      sound: (raw && (raw.custom_tone || raw.sound)) || 'default',
      vibration: (raw && raw.vibration) || 'default',
      priority: (raw && raw.priority) || 'default',
      enabled: true,
    };
  }

  let currentSettings = cachedAppSettings;
  const storedAppSettings = await getStoredSetting('app_settings');
  if (storedAppSettings) {
    currentSettings = { ...currentSettings, ...storedAppSettings };
  }

  // Determine sound and vibration
  const sound = chatConfig.sound || 'default';
  const vibration = chatConfig.vibration || 'default';

  const vibratePattern =
    vibration === 'short'
      ? [60]
      : vibration === 'long'
      ? [200, 100, 200]
      : vibration === 'disabled' || !currentSettings.vibrate
      ? []
      : [100];

  const displayText = currentSettings.previewText ? text : 'New message';

  const notificationOptions = {
    body: displayText,
    icon: avatar,
    badge: '/telegram-logo.svg',
    tag: `tg_dialog_${effectiveDialogId}`,
    renotify: true,
    silent: isSilent || sound === 'silent' || !currentSettings.soundEffects,
    vibrate: vibratePattern,
    data: {
      dialog_id: effectiveDialogId,
      dialogId: effectiveDialogId,
      chatId: effectiveDialogId,
      messageId,
      title,
      senderName,
      sound,
      vibration,
      priority: chatConfig.priority,
      fcmChannelId: `tg_fcm_channel_${sound}`,
      url: `/?dialog_id=${encodeURIComponent(effectiveDialogId)}#/chat/${encodeURIComponent(effectiveDialogId)}`,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_chat', title: 'فتح المحادثة' },
      { action: 'mark_read', title: 'تحديد كمقروء' },
    ],
  };

  // Chromium push standard: must always call showNotification to avoid "This site has been updated in background"
  await self.registration.showNotification(title, notificationOptions);

  // 3. Broadcast to all active window clients
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const remoteMessage = {
      messageId: `push_fcm_${messageId}`,
      sentTime: Date.now(),
      data: {
        ...raw,
        dialog_id: effectiveDialogId,
        chat_id: effectiveDialogId,
        chatId: effectiveDialogId,
        chat_title: title,
        text: displayText,
        sender_name: senderName,
        senderName,
        custom_tone: sound,
        vibration,
      },
      notification: {
        title,
        body: displayText,
        icon: avatar,
      },
    };

    clientList.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_PUSH_RECEIVED',
        dialog_id: effectiveDialogId,
        chatId: effectiveDialogId,
        remoteMessage,
        timestamp: Date.now(),
      });
    });
  } catch (err) {
    console.warn('[SW] Client broadcast warning:', err);
  }
}

// Push Event Listener (W3C Web Push & VAPID)
self.addEventListener('push', (event) => {
  let rawData = {};
  if (event.data) {
    try {
      rawData = event.data.json();
    } catch {
      rawData = { title: 'Telegram', body: event.data.text() };
    }
  }

  // Handle remote session revocation or forced logout
  if (
    rawData?.data?.type === 'SESSION_REVOKED' ||
    rawData?.type === 'SESSION_REVOKED' ||
    rawData?.data?.reason === 'AUTH_KEY_UNREGISTERED'
  ) {
    const title = rawData.title || rawData?.data?.title || '⚠️ تيليجرام: تم إلغاء الجلسة';
    const body = rawData.body || rawData?.data?.body || 'تم إنهاء الجلسة من جهاز آخر أو انتهت صلاحيتها. تم تسجيل الخروج لحماية حسابك.';
    event.waitUntil(
      Promise.all([
        self.registration.showNotification(title, {
          body,
          icon: 'https://telegram.org/img/t_logo.png',
          badge: '/telegram-logo.svg',
          tag: 'tg_session_revoked',
          data: {
            url: '/#/login',
            type: 'SESSION_REVOKED',
            reason: rawData?.data?.reason || 'SESSION_REVOKED',
          },
        }),
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SESSION_REVOKED',
              reason: rawData?.data?.reason || 'SESSION_REVOKED',
            });
          });
        }),
      ])
    );
    return;
  }

  // Handle Keyword Monitor New Alert Push Event (🔔 تنبيه: {الكلمة} وجسم: في {المجموعة} من {المرسل})
  const isAlert =
    rawData?.type === 'new_alert' ||
    rawData?.data?.type === 'new_alert' ||
    Boolean(rawData?.keyword || rawData?.data?.keyword);

  if (isAlert) {
    const alertData = rawData.data || rawData;
    const keyword = alertData.keyword || rawData.keyword || 'مراقبة';
    const group = alertData.group || alertData.chatTitle || alertData.chat_title || 'المجموعة';
    const sender = alertData.sender || alertData.senderName || alertData.sender_name || 'مستخدم';
    const alertTitle = alertData.title || `🔔 تنبيه: ${keyword}`;
    const alertBody = alertData.body || `في ${group} من ${sender}`;

    const notificationOptions = {
      body: alertBody,
      icon: alertData.icon || '/telegram-logo.svg',
      badge: '/telegram-logo.svg',
      tag: `tg_alert_${alertData.id || alertData.messageId || Date.now()}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        type: 'new_alert',
        keyword,
        group,
        sender,
        text: alertData.text,
        chatId: alertData.chatId,
        messageId: alertData.messageId,
        url: alertData.url || (alertData.chatId ? `/?dialog_id=${encodeURIComponent(alertData.chatId)}#/chat/${encodeURIComponent(alertData.chatId)}` : '/'),
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open_chat', title: 'عرض التنبيه والمحادثة' },
      ],
    };

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(alertTitle, notificationOptions),
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'NEW_KEYWORD_ALERT',
              alert: {
                ...alertData,
                keyword,
                group,
                sender,
              },
            });
          });
        }),
      ])
    );
    return;
  }

  // Standard Web Push message: extract data.title and data.body
  const notifData = rawData.data || rawData;
  const title = notifData.title || rawData.title || 'رسالة جديدة في تيليجرام';
  const body = notifData.body || notifData.text || rawData.body || rawData.text || 'لديك إشعار جديد في تيليجرام';
  const icon = notifData.icon || rawData.icon || '/telegram-logo.svg';
  const badge = notifData.badge || rawData.badge || '/telegram-logo.svg';
  const targetChatId = notifData.chatId || notifData.dialog_id || notifData.dialogId || '';
  const urlToOpen = notifData.url || (targetChatId ? `/?dialog_id=${encodeURIComponent(targetChatId)}#/chat/${encodeURIComponent(targetChatId)}` : '/');

  const options = {
    body,
    icon,
    badge,
    tag: notifData.tag || rawData.tag || `tg_dialog_${targetChatId || Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      ...notifData,
      chatId: targetChatId,
      dialog_id: targetChatId,
      url: urlToOpen,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_chat', title: 'فتح المحادثة' },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_PUSH_RECEIVED',
            title,
            body,
            dialog_id: targetChatId,
            chatId: targetChatId,
            data: notifData,
            timestamp: Date.now(),
          });
        });
      }),
    ])
  );
});

// Notification Click Handler: opens the specified chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  if (notificationData?.type === 'SESSION_REVOKED' || notificationData?.url === '/#/login') {
    event.waitUntil(
      (async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'SESSION_REVOKED', reason: notificationData?.reason || 'SESSION_REVOKED' });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/#/login');
        }
      })()
    );
    return;
  }

  const targetChatId =
    notificationData.chatId ||
    notificationData.dialog_id ||
    notificationData.dialogId ||
    '';

  const targetUrl =
    notificationData.url ||
    (targetChatId ? `/?dialog_id=${encodeURIComponent(targetChatId)}#/chat/${encodeURIComponent(targetChatId)}` : '/');

  event.waitUntil(
    (async () => {
      // 1. Mark as Read action
      if (action === 'mark_read' && targetChatId) {
        try {
          await markChatAsReadInDB(targetChatId);
        } catch (_) {}
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({
            type: 'MARK_CHAT_AS_READ',
            dialog_id: targetChatId,
            chatId: targetChatId,
          });
        });
        return;
      }

      // 2. Inline Reply action
      if ((action === 'reply' || event.reply) && targetChatId) {
        const replyText = event.reply || (event.userText ? event.userText.trim() : '');
        if (replyText) {
          try {
            await saveInlineNotificationReply(targetChatId, replyText);
          } catch (_) {}
          const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          clientList.forEach((client) => {
            client.postMessage({
              type: 'INLINE_NOTIFICATION_REPLY',
              dialog_id: targetChatId,
              chatId: targetChatId,
              text: replyText,
            });
          });
        }
        return;
      }

      // 3. Focus active window and navigate to chat
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NAVIGATE_TO_CHAT',
            dialog_id: targetChatId,
            chatId: targetChatId,
            url: targetUrl,
          });
          return client.focus();
        }
      }

      // 4. If no window is currently open, open a new window to the chat URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};
  console.log('[SW] Notification dismissed for dialog_id:', notificationData.dialog_id || notificationData.chatId);
});

// =========================================================================
// BACKGROUND SYNC
// =========================================================================

self.addEventListener('sync', (event) => {
  if (
    event.tag === 'tg_messages_sync' ||
    event.tag === 'tg_dialogs_sync' ||
    event.tag === 'tg_fcm_heartbeat' ||
    event.tag === 'telegram_bg_sync' ||
    event.tag === 'tg_pending_queue'
  ) {
    event.waitUntil(
      (async () => {
        const pendingItems = await processOfflineSyncQueue();
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC_TRIGGERED',
            tag: event.tag,
            pendingItemsCount: pendingItems.length,
            timestamp: Date.now(),
          });
        });
      })()
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tg_periodic_updates' || event.tag === 'tg_news_feed_sync') {
    event.waitUntil(
      (async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC_TRIGGERED',
            tag: event.tag,
            timestamp: Date.now(),
          });
        });
      })()
    );
  }
});
