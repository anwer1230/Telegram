/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Telegram Web Plus - Official Service Worker (Push Notifications & Offline Cache)
 */

const CACHE_NAME = 'tg-web-plus-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استقبال إشعارات الـ Push من سحابة تيليجرام
self.addEventListener('push', (event) => {
  let data = {
    title: 'تيليجرام ويب بلاس',
    body: 'لديك رسالة مشفرة جديدة',
    icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=192',
    chatId: 'saved_messages',
    unreadCount: 1
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=192',
    badge: data.badge || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96',
    tag: `chat_${data.chatId || 'general'}`,
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      chatId: data.chatId,
      url: `/?chatId=${data.chatId || ''}`,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'فتح المحادثة' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (event.notification.data?.chatId) {
            client.postMessage({
              type: 'NAVIGATE_TO_CHAT',
              chatId: event.notification.data.chatId
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
