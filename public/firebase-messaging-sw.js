// Firebase Cloud Messaging Background Service Worker (firebase-messaging-sw.js)
// Official background notification daemon for Telegram PWA & Android WebView
// Project: telegramclone-de6f2 (MessagingSenderId: 920850190750)

// Import core offline & caching service worker
try {
  importScripts('/sw.js');
} catch (e) {
  console.warn('[FCM-SW] Warning importing /sw.js:', e);
}

// Optionally load Firebase compat SDK for background message listening
try {
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    const firebaseConfig = {
      apiKey: 'AIzaSyAiTBE7zpzAP9Yn7M0lZ9IC0EVPNxuQ92Y',
      projectId: 'telegramclone-de6f2',
      messagingSenderId: '920850190750',
      appId: '1:920850190750:android:f65e389c2be73be145868f',
    };

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM-SW] Received FCM background push packet:', payload);

      const data = payload.data || {};
      const notif = payload.notification || {};

      const title = data.title || notif.title || 'Telegram';
      const body = data.body || notif.body || 'رسالة جديدة في الخلفية';
      const dialogId = data.dialog_id || data.chat_id || data.chatId || 'chat_general';
      const sound = data.custom_tone || data.sound || 'default';

      const options = {
        body,
        icon: data.avatar || notif.icon || '/icon-192.png',
        badge: '/telegram-logo.svg',
        tag: `tg_dialog_${dialogId}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
          dialog_id: dialogId,
          chatId: dialogId,
          url: `/?dialog_id=${encodeURIComponent(dialogId)}#/chat/${encodeURIComponent(dialogId)}`,
          fcmChannelId: `tg_fcm_channel_${sound}`,
          timestamp: Date.now(),
          raw: data,
        },
        actions: [
          { action: 'open_chat', title: 'فتح المحادثة' },
          { action: 'mark_read', title: 'تحديد كمقروء' },
        ],
      };

      // Notify clients
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'FCM_PUSH_RECEIVED',
            dialog_id: dialogId,
            chatId: dialogId,
            packet: {
              id: `fcm_${Date.now()}`,
              dialog_id: dialogId,
              sender_name: title,
              title,
              body,
              timestamp: new Date().toISOString(),
              rawPayload: payload,
            },
          });
        });
      });

      return self.registration.showNotification(title, options);
    });
  }
} catch (err) {
  console.log('[FCM-SW] Running in native ServiceWorker push mode:', err?.message || err);
}
