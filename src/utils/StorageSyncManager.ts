/**
 * StorageSyncManager.ts - Synchronization between SQLite, Dexie, and localStorage
 */

import { draftSyncService } from '../services/DraftSyncService';

export class StorageSyncManager {
  private static instance: StorageSyncManager;

  public static getInstance(): StorageSyncManager {
    if (!StorageSyncManager.instance) {
      StorageSyncManager.instance = new StorageSyncManager();
    }
    return StorageSyncManager.instance;
  }

  public async syncAll(): Promise<boolean> {
    draftSyncService.flushPendingWrites();
    return true;
  }

  public getAllDrafts(): Record<string, string> {
    return draftSyncService.getAllDrafts();
  }

  public setDraft(chatId: string, draft: string): void {
    draftSyncService.saveDraft(chatId, draft);
  }

  public async loadSettings(): Promise<any> {
    return null;
  }

  public async saveSettings(_settings: any): Promise<void> {}

  public saveSessions(_accounts: any[], _activeAccountId?: string): void {}

  public clearAllOnLogout(): void {}
}

export const storageSyncManager = StorageSyncManager.getInstance();
