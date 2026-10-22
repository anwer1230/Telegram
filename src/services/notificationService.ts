/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Telegram Web Plus - Official Notification Engine (Web Push, In-App Banners & App Badging API)
 */

export interface InAppToast {
  id: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  chatId: string;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = 'default';
  private inAppListeners: ((toast: InAppToast) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      this.permission = Notification.permission;
    }

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = reg;

        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NAVIGATE_TO_CHAT' && event.data?.chatId) {
            window.dispatchEvent(new CustomEvent('tg:open-chat', { detail: { chatId: event.data.chatId } }));
          }
        });
      } catch (err) {
        console.log('ServiceWorker registration error:', err);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    try {
      const res = await Notification.requestPermission();
      this.permission = res;
      return res === 'granted';
    } catch (e) {
      return false;
    }
  }

  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  // عرض إشعار النظام الرسمي (System / Push Notification)
  async showNotification(title: string, body: string, icon?: string, chatId?: string) {
    // تشغيل نغمة الإشعار الرسمية
    this.playNotificationSound();

    // 1. إذا كان التطبيق مدعوماً بـ Service Worker
    if (this.swRegistration && this.permission === 'granted') {
      try {
        await this.swRegistration.showNotification(title, {
          body,
          icon: icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=192',
          badge: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96',
          tag: `tg_msg_${chatId || 'general'}`,
          data: { chatId, url: `/?chatId=${chatId || ''}` }
        });
        return;
      } catch (e) {
        // Fallback to standard Notification
      }
    }

    // 2. Fallback إلى إشعار المتصفح المباشر
    if (typeof window !== 'undefined' && 'Notification' in window && this.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=192'
        });
        notif.onclick = () => {
          window.focus();
          if (chatId) {
            window.dispatchEvent(new CustomEvent('tg:open-chat', { detail: { chatId } }));
          }
        };
      } catch (e) {}
    }
  }

  // إشعار داخلي عائم (In-App Floating Banner) عند وجود المستخدم في محادثة أخرى
  triggerInAppToast(toast: InAppToast) {
    this.playNotificationSound();
    this.inAppListeners.forEach(cb => cb(toast));
  }

  subscribeInAppToasts(callback: (toast: InAppToast) => void) {
    this.inAppListeners.push(callback);
    return () => {
      this.inAppListeners = this.inAppListeners.filter(cb => cb !== callback);
    };
  }

  // تحديث شارة التطبيق الرسمية (App Badging API)
  updateAppBadge(unreadCount: number) {
    if (typeof navigator === 'undefined') return;

    try {
      if ('setAppBadge' in navigator) {
        if (unreadCount > 0) {
          (navigator as any).setAppBadge(unreadCount).catch(() => {});
        } else {
          (navigator as any).clearAppBadge().catch(() => {});
        }
      }
    } catch (e) {}
  }

  // تشغيل نغمة تيليجرام الرسمية للإشعارات
  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }
}

export const notificationService = new NotificationService();
