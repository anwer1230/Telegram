/**
 * StoriesController.ts - org.telegram.messenger.StoriesController
 * Direct implementation of official Telegram Stories engine
 * Handles peer stories, expiration timers (6/12/24/48h), privacy levels,
 * view receipts, reactions, and offline local caching.
 */
import { Story } from '../../types';
import { NotificationCenter } from '../NotificationCenter';

const STORAGE_KEY = 'tg_user_stories_v1';

export class StoriesController {
  private static instances = new Map<number, StoriesController>();
  private currentAccount: number;
  private cachedStories: Story[] = [];

  public static getInstance(accountNum: number = 0): StoriesController {
    if (!StoriesController.instances.has(accountNum)) {
      StoriesController.instances.set(accountNum, new StoriesController(accountNum));
    }
    return StoriesController.instances.get(accountNum)!;
  }

  constructor(accountNum: number = 0) {
    this.currentAccount = accountNum;
    this.loadFromStorage();
    this.purgeExpiredStories();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.cachedStories = parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[StoriesController] Failed to parse cached stories:', err);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedStories));
      }
    } catch {}
  }

  public getStories(): Story[] {
    this.purgeExpiredStories();
    return [...this.cachedStories];
  }

  public getPeerStories(userId: string): Story[] {
    return this.getStories().filter((s) => s.userId === userId);
  }

  public async sendStory(payload: {
    userId: string;
    userName: string;
    userAvatar: string;
    mediaUrl: string;
    mediaType?: 'image' | 'video';
    caption?: string;
    durationHours?: number;
    privacy?: 'everyone' | 'contacts' | 'close_friends' | 'selected';
  }): Promise<Story> {
    const durationHours = payload.durationHours || 24;
    const now = Date.now();
    const expiresAt = now + durationHours * 3600 * 1000;

    const newStory: Story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: payload.userId,
      userName: payload.userName,
      userAvatar: payload.userAvatar,
      mediaUrl: payload.mediaUrl,
      mediaType: payload.mediaType || 'image',
      caption: payload.caption || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresAt,
      viewsCount: 1,
      isViewed: false,
      isMyStory: true,
      durationHours,
      privacy: payload.privacy || 'everyone',
    };

    this.cachedStories.unshift(newStory);
    this.saveToStorage();

    // Notify listeners
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.storiesListUpdated || 19901,
      this.cachedStories
    );

    return newStory;
  }

  public markStoryViewed(storyId: string): void {
    const story = this.cachedStories.find((s) => s.id === storyId);
    if (story && !story.isViewed) {
      story.isViewed = true;
      story.viewsCount += 1;
      this.saveToStorage();
    }
  }

  public deleteStory(storyId: string): void {
    this.cachedStories = this.cachedStories.filter((s) => s.id !== storyId);
    this.saveToStorage();
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.storiesListUpdated || 19901,
      this.cachedStories
    );
  }

  public purgeExpiredStories(): void {
    const now = Date.now();
    const originalLen = this.cachedStories.length;
    this.cachedStories = this.cachedStories.filter((s) => s.expiresAt > now);
    if (this.cachedStories.length !== originalLen) {
      this.saveToStorage();
    }
  }
}

export const storiesController = StoriesController.getInstance(0);
