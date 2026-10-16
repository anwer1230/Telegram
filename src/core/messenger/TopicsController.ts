/**
 * TopicsController.ts - org.telegram.messenger.TopicsController
 * Replicated from TopicsController.java in DrKLO/Telegram Android
 * Handles Forum Supergroup Topics, threading, pinned topics, and topic metadata.
 */
import { ForumTopic } from '../../types';

const STORAGE_KEY = 'tg_forum_topics_v1';

export class TopicsController {
  private currentAccount: number;
  private topicsByChat = new Map<string, ForumTopic[]>();

  constructor(accountNum: number = 0) {
    this.currentAccount = accountNum;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.entries(parsed).forEach(([chatId, topics]) => {
            if (Array.isArray(topics)) {
              this.topicsByChat.set(chatId, topics);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[TopicsController] Failed to parse cached topics:', e);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const obj: Record<string, ForumTopic[]> = {};
        this.topicsByChat.forEach((val, key) => {
          obj[key] = val;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      }
    } catch {}
  }

  public getTopics(chatId: string | number): ForumTopic[] {
    const key = String(chatId);
    if (!this.topicsByChat.has(key)) {
      // Default standard forum topics for supergroups
      const defaults: ForumTopic[] = [
        {
          id: 1,
          chatId: key,
          title: 'العام والنقاشات (General)',
          iconColor: 0x2481cc,
          iconEmoji: '💬',
          isPinned: true,
          totalMessages: 142,
          unreadCount: 3,
          lastMessage: 'مرحباً بكم في منتدى المجموعة!',
          lastMessageDate: 'الآن',
        },
        {
          id: 2,
          chatId: key,
          title: 'الإعلانات الرسمية (Announcements)',
          iconColor: 0x10b981,
          iconEmoji: '📢',
          isPinned: true,
          totalMessages: 28,
          unreadCount: 0,
          lastMessage: 'تحديث أمني جديد متاح للجميع',
          lastMessageDate: 'أمس',
        },
        {
          id: 3,
          chatId: key,
          title: 'الروابط والمصادر (Resources)',
          iconColor: 0x8b5cf6,
          iconEmoji: '🔗',
          isPinned: false,
          totalMessages: 95,
          unreadCount: 0,
          lastMessage: 'https://telegram.org/apps',
          lastMessageDate: 'منذ يومين',
        },
        {
          id: 4,
          chatId: key,
          title: 'الدعم الفني والأسئلة (Q&A Support)',
          iconColor: 0xf59e0b,
          iconEmoji: '❓',
          isPinned: false,
          totalMessages: 64,
          unreadCount: 1,
          lastMessage: 'كيف يمكن تفعيل المحادثات السرية؟',
          lastMessageDate: 'منذ 3 أيام',
        },
      ];
      this.topicsByChat.set(key, defaults);
      this.saveToStorage();
    }
    return this.topicsByChat.get(key) || [];
  }

  public createTopic(
    chatId: string | number,
    title: string,
    iconEmoji: string = '💬',
    iconColor: number = 0x2481cc
  ): ForumTopic {
    const key = String(chatId);
    const topics = this.getTopics(key);
    const newTopic: ForumTopic = {
      id: Math.floor(Date.now() / 1000) % 100000,
      chatId: key,
      title,
      iconColor,
      iconEmoji,
      isPinned: false,
      totalMessages: 0,
      unreadCount: 0,
      lastMessage: 'تم إنشاء الموضوع',
      lastMessageDate: 'الآن',
    };
    topics.push(newTopic);
    this.topicsByChat.set(key, topics);
    this.saveToStorage();
    return newTopic;
  }

  public togglePinTopic(chatId: string | number, topicId: number): void {
    const key = String(chatId);
    const topics = this.getTopics(key);
    const target = topics.find((t) => t.id === topicId);
    if (target) {
      target.isPinned = !target.isPinned;
      this.saveToStorage();
    }
  }

  public toggleCloseTopic(chatId: string | number, topicId: number): void {
    const key = String(chatId);
    const topics = this.getTopics(key);
    const target = topics.find((t) => t.id === topicId);
    if (target) {
      target.isClosed = !target.isClosed;
      this.saveToStorage();
    }
  }
}

export const topicsController = new TopicsController(0);
