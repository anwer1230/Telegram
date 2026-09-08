// Telegram Service Worker (sw.js)
// Implements core Telegram Web & Android (DrKLO/Telegram) Push & FCM Notification handlers
// Integrated with IndexedDB persistent message and notification store
// Supports persistent background sync, FCM push listeners, and dialog_id linking

const CACHE_NAME = 'telegram-drklo-v12.9.5';
const DB_NAME = 'TelegramOfflineStore';
const DB_VERSION = 3;

const STATIC_ASSETS = [
  '/manifest.json',
  '/telegram-logo.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// =========================================================================
// INDEXEDDB PROMISE-BASED STORAGE SUBSYSTEM
// =========================================================================

/**
 * Opens or upgrades the Telegram Offline IndexedDB store
 */
function openIndexedDB() {
  return new Promise((resolve) => {
    if (!self.indexedDB) {
      resolve(null);
      return;
    }

    const request = self.indexedDB.open(DB_NAME, DB_VERSION);

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

      // Pending background sync queue (when offline / main thread suspended)
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

/**
 * Persists an incoming push notification message directly into IndexedDB
 */
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
      senderId: raw.sender_id || raw.from_id || effectiveDialogId,
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
    console.log('[SW IndexedDB] Persisted incoming push message for dialog_id:', effectiveDialogId);
  } catch (err) {
    console.warn('[SW IndexedDB] Failed to persist push message:', err);
  }
}

/**
 * Marks dialog/chat and its messages as read in IndexedDB
 */
async function markChatAsReadInDB(dialogId) {
  try {
    const db = await openIndexedDB();
    if (!db) return;

    const tx = db.transaction(['messages', 'chats', 'sync_queue'], 'readwrite');
    const msgStore = tx.objectStore('messages');
    const chatStore = tx.objectStore('chats');
    const syncStore = tx.objectStore('sync_queue');

    // 1. Reset unread count on chat
    const chatReq = chatStore.get(dialogId);
    chatReq.onsuccess = () => {
      if (chatReq.result) {
        const updated = { ...chatReq.result, unreadCount: 0 };
        chatStore.put(updated);
      }
    };

    // 2. Mark messages as read
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

    // 3. Add to sync queue for cloud sync
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
    console.log('[SW IndexedDB] Dialog marked as read in DB:', dialogId);
  } catch (err) {
    console.warn('[SW IndexedDB] Mark as read error:', err);
  }
}

/**
 * Saves an outgoing reply message sent from notification action into DB & sync queue
 */
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

    const msgRecord = {
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
    };
    msgStore.put(msgRecord);

    const chatReq = chatStore.get(dialogId);
    chatReq.onsuccess = () => {
      if (chatReq.result) {
        const updated = {
          ...chatReq.result,
          lastMessageText: replyText,
          lastMessageTime: now,
          lastUpdated: now,
        };
        chatStore.put(updated);
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
    console.log('[SW IndexedDB] Saved inline notification reply for dialog_id:', dialogId);
  } catch (err) {
    console.warn('[SW IndexedDB] Failed to save inline reply:', err);
  }
}

/**
 * Retrieves persisted settings or chat configs from IndexedDB
 */
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

/**
 * Saves a setting key/value to IndexedDB
 */
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

/**
 * Flushes pending items in the offline background sync queue
 */
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
// SERVICE WORKER LIFECYCLE & CACHE
// =========================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll non-fatal error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Always bypass cache for API and backend routes
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network-First for HTML navigations to always load fresh bundle
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Stale-while-revalidate for assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// =========================================================================
// FIREBASE CLOUD MESSAGING (FCM) & PUSH HANDLERS
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

/**
 * Parses raw FCM / Web Push payload matching Telegram Android (DrKLO) & Web schemas
 * Guarantees extraction and normalization of dialog_id
 */
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

  // Extract dialog_id adhering strictly to Telegram MTProto / FCM schema
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
    'Telegram';

  const text =
    fcmData.text ||
    fcmData.body ||
    fcmData.message ||
    fcmNotification.body ||
    parsed.body ||
    'New message received';

  const senderName = fcmData.sender_name || fcmData.senderName || parsed.senderName || title;
  const avatar = fcmData.avatar || fcmNotification.icon || parsed.avatar || '/telegram-logo.svg';
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

/**
 * Processes incoming push notification, saves to IndexedDB and triggers visual alert
 * Broadcasts to UI main thread even when the app is in the background
 */
async function showTelegramPushNotification(payload) {
  const { dialog_id, chatId, messageId, title, text, senderName, avatar, isSilent, raw } = payload;
  const effectiveDialogId = dialog_id || chatId;

  // 1. Persist directly to IndexedDB regardless of main thread state
  await persistIncomingPushMessage(payload);

  // 2. Read chat alert preference (from cache or IndexedDB)
  let chatConfig = cachedChatConfigs[effectiveDialogId];
  if (!chatConfig) {
    const storedConfigs = await getStoredSetting('chat_configs');
    if (storedConfigs && storedConfigs[effectiveDialogId]) {
      chatConfig = storedConfigs[effectiveDialogId];
    }
  }

  if (!chatConfig) {
    chatConfig = {
      sound: raw.custom_tone || raw.sound || 'default',
      vibration: raw.vibration || 'default',
      priority: raw.priority || 'default',
      enabled: true,
    };
  }

  // Load app settings from IndexedDB if not initialized
  let currentSettings = cachedAppSettings;
  const storedAppSettings = await getStoredSetting('app_settings');
  if (storedAppSettings) {
    currentSettings = { ...currentSettings, ...storedAppSettings };
  }

  // If notifications disabled or chat muted, suppress OS banner
  if (currentSettings.notificationsEnabled === false || chatConfig.enabled === false) {
    console.log('[SW] Push banner suppressed for muted dialog_id:', effectiveDialogId);
    return;
  }

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

  await self.registration.showNotification(title, notificationOptions);

  // 3. Broadcast to all active and background window clients to trigger main-thread UI updates
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
}

// Push Event Listener (FCM / Web Push)
self.addEventListener('push', (event) => {
  let rawData = {};
  if (event.data) {
    try {
      rawData = event.data.json();
    } catch {
      rawData = { notification: { title: 'Telegram', body: event.data.text() } };
    }
  }

  // Handle remote session revocation or forced logout
  if (
    rawData?.data?.type === 'SESSION_REVOKED' ||
    rawData?.type === 'SESSION_REVOKED' ||
    rawData?.data?.reason === 'AUTH_KEY_UNREGISTERED'
  ) {
    const title = rawData.title || '⚠️ تيليجرام: تم إلغاء الجلسة';
    const body = rawData.body || 'تم إنهاء الجلسة من جهاز آخر أو انتهت صلاحيتها. تم تسجيل الخروج لحماية حسابك.';
    event.waitUntil(
      Promise.all([
        self.registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
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

  const payload = parsePushPayload(rawData);
  event.waitUntil(showTelegramPushNotification(payload));
});

// Notification Click and Action Handling specifically linking to dialog_id
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const action = event.action;

  // Handle Session Revoked click
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

  // Extract target dialog_id accurately
  const targetDialogId =
    notificationData.dialog_id ||
    notificationData.dialogId ||
    notificationData.chatId ||
    'chat_general';

  event.waitUntil(
    (async () => {
      // 1. Mark as Read action
      if (action === 'mark_read') {
        if (targetDialogId) {
          await markChatAsReadInDB(targetDialogId);
        }

        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({
            type: 'MARK_CHAT_AS_READ',
            dialog_id: targetDialogId,
            chatId: targetDialogId,
          });
        });
        return;
      }

      // 2. Inline Reply action if reply text is present
      if (action === 'reply' || event.reply) {
        const replyText = event.reply || (event.userText ? event.userText.trim() : '');
        if (replyText && targetDialogId) {
          await saveInlineNotificationReply(targetDialogId, replyText);

          const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          clientList.forEach((client) => {
            client.postMessage({
              type: 'INLINE_NOTIFICATION_REPLY',
              dialog_id: targetDialogId,
              chatId: targetDialogId,
              text: replyText,
            });
          });
        }
        return;
      }

      // 3. Open / Focus Window Navigation linked specifically to dialog_id
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NAVIGATE_TO_CHAT',
            dialog_id: targetDialogId,
            chatId: targetDialogId,
            url: `/?dialog_id=${encodeURIComponent(targetDialogId)}#/chat/${encodeURIComponent(targetDialogId)}`,
          });
          return client.focus();
        }
      }

      // 4. If no window is active (app was closed / main thread suspended), launch new window directly into dialog_id
      if (self.clients.openWindow) {
        const urlToOpen = targetDialogId
          ? `/?dialog_id=${encodeURIComponent(targetDialogId)}#/chat/${encodeURIComponent(targetDialogId)}`
          : '/';
        return self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

// Notification Close tracking
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};
  console.log('[SW] Notification dismissed for dialog_id:', notificationData.dialog_id || notificationData.chatId);
});

// =========================================================================
// PERSISTENT BACKGROUND SYNC HANDLERS (Android WorkManager / JobScheduler equivalent)
// =========================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW BackgroundSync] Sync event received for tag:', event.tag);

  if (
    event.tag === 'tg_messages_sync' ||
    event.tag === 'tg_dialogs_sync' ||
    event.tag === 'tg_fcm_heartbeat' ||
    event.tag === 'telegram_bg_sync' ||
    event.tag === 'tg_pending_queue'
  ) {
    event.waitUntil(
      (async () => {
        // Process offline pending queue
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

// Periodic Background Sync (when PWA is registered with PeriodicSync API)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW PeriodicSync] Periodic sync triggered:', event.tag);

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
