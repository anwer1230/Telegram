/**
 * UpdatesDifferenceService.ts
 *
 * Implements MTProto updates.getDifference protocol for global user state,
 * private chats, contacts, secret chats, and common updates.
 *
 * Tracks:
 * - pts: Points tracker for common updates
 * - qts: Points tracker for secret chats & queries
 * - date: Timestamp tracker
 * - seq: Sequence continuity counter
 */

import { NotificationCenter } from '../core/NotificationCenter';
import { telegramDB } from '../utils/sqliteStorage';

export interface UpdatesState {
  pts: number;
  qts: number;
  date: number;
  seq: number;
  unreadCount: number;
}

const STORAGE_KEY = 'tg_updates_state_v1';

export class UpdatesDifferenceService {
  private static instance: UpdatesDifferenceService;
  private state: UpdatesState = {
    pts: 1000,
    qts: 100,
    date: Math.floor(Date.now() / 1000),
    seq: 10,
    unreadCount: 0,
  };
  private isSyncing = false;

  public static getInstance(): UpdatesDifferenceService {
    if (!UpdatesDifferenceService.instance) {
      UpdatesDifferenceService.instance = new UpdatesDifferenceService();
    }
    return UpdatesDifferenceService.instance;
  }

  private constructor() {
    this.loadState();
    this.setupListeners();
  }

  private loadState(): void {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.state = JSON.parse(saved);
        }
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {}
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.getDifference('network_reconnect');
    });

    window.addEventListener('focus', () => {
      this.getDifference('window_focus');
    });
  }

  public getState(): UpdatesState {
    return { ...this.state };
  }

  public updatePts(newPts: number): void {
    if (newPts > this.state.pts) {
      this.state.pts = newPts;
      this.saveState();
    }
  }

  /**
   * Invokes updates.getDifference with current pts, qts, and date
   */
  public async getDifference(reason: string = 'manual'): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const resp = await fetch('/api/telegram/mtproto/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'updates.getDifference',
          params: {
            pts: this.state.pts,
            date: this.state.date,
            qts: this.state.qts,
          },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.result?.state) {
          this.state.pts = data.result.state.pts || this.state.pts + 1;
          this.state.qts = data.result.state.qts || this.state.qts;
          this.state.date = data.result.state.date || Math.floor(Date.now() / 1000);
          this.state.seq = data.result.state.seq || this.state.seq + 1;
          this.saveState();

          NotificationCenter.getInstance(0).postNotificationName(
            NotificationCenter.messagesDidLoad || 19903,
            data.result
          );
        }
      }
    } catch (e) {
      console.warn('[UpdatesDifferenceService] Sync error:', e);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const updatesDifferenceService = UpdatesDifferenceService.getInstance();
