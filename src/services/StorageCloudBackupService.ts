import { SecureSessionStorage } from '../utils/SecureSessionStorage';

export interface StorageCloudBackupStatus {
  isCloudConnected: boolean;
  lastBackupTime: string | null;
  totalKeysBackedUp: number;
  availableKeys: string[];
  isBackingUp: boolean;
  isRestoring: boolean;
}

/**
 * 📦 StorageCloudBackupService
 * Periodically backs up critical local storage keys like `tg_multi_accounts_v3` and `app_settings`
 * to the Firestore collection `client_storage_backups` to prevent data loss across device switches
 * or browser cache clears.
 */
class StorageCloudBackupService {
  private static instance: StorageCloudBackupService;

  public static readonly CRITICAL_KEYS = [
    'tg_multi_accounts_v3',
    'app_settings',
    'tg_app_settings',
    'tg_active_account_id_v3',
    'tg_session_string',
    'tg_user_config_0',
    'tg_user_config_1',
    'tg_user_config_2',
    'tg_custom_theme_v2',
    'theme_settings',
    'tg_mtproto_session_0',
  ];

  private intervalTimer: any = null;
  private debounceTimer: any = null;
  private lastDataDigest: string = '';
  private isBackingUp: boolean = false;
  private isRestoring: boolean = false;
  private isInitialized: boolean = false;

  private listeners: Set<(status: StorageCloudBackupStatus) => void> = new Set();
  private currentStatus: StorageCloudBackupStatus = {
    isCloudConnected: true,
    lastBackupTime: null,
    totalKeysBackedUp: 0,
    availableKeys: [],
    isBackingUp: false,
    isRestoring: false,
  };

  private constructor() {
    // Singleton
  }

  public static getInstance(): StorageCloudBackupService {
    if (!StorageCloudBackupService.instance) {
      StorageCloudBackupService.instance = new StorageCloudBackupService();
    }
    return StorageCloudBackupService.instance;
  }

  /**
   * Initializes the background service, triggers an initial check & auto-hydration if cache was cleared,
   * and starts the periodic 45-second background daemon.
   */
  public async initialize(options?: { autoRestoreIfEmpty?: boolean }): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    console.log('[StorageCloudBackup] Initializing periodic background backup service for Firestore...');

    // 1. Initial Health & Status Check
    this.refreshStatus();

    // 2. Auto-Hydrate if local storage is cleared / empty
    if (options?.autoRestoreIfEmpty !== false) {
      const existingAccounts = SecureSessionStorage.getItem<any[]>('tg_multi_accounts_v3');
      const explicitLogout = SecureSessionStorage.getItem<string>('tg_explicitly_logged_out') === 'true';

      if (!explicitLogout && (!existingAccounts || !Array.isArray(existingAccounts) || existingAccounts.length === 0)) {
        console.log('[StorageCloudBackup] Detected empty local storage. Attempting auto-restore from Firestore...');
        await this.autoRestoreFromCloud();
      }
    }

    // 3. Perform an initial backup check after 5 seconds
    setTimeout(() => {
      this.backupCriticalStorageIfNeeded();
    }, 5000);

    // 4. Start periodic background daemon (every 45 seconds)
    this.intervalTimer = setInterval(() => {
      this.backupCriticalStorageIfNeeded();
    }, 45000);

    // 5. Trigger backup before tab unload or when visibility changes
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.backupCriticalStorageIfNeeded();
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key && StorageCloudBackupService.CRITICAL_KEYS.includes(e.key)) {
        this.triggerDebouncedBackup();
      }
    });
  }

  /**
   * Collects critical keys from localStorage and SecureSessionStorage
   */
  public collectCriticalStorage(): Record<string, any> {
    const data: Record<string, any> = {};

    for (const key of StorageCloudBackupService.CRITICAL_KEYS) {
      try {
        // Try SecureSessionStorage first, fallback to raw localStorage
        const valFromSecure = SecureSessionStorage.getItem<any>(key);
        if (valFromSecure !== null && valFromSecure !== undefined) {
          data[key] = valFromSecure;
          continue;
        }

        const raw = localStorage.getItem(key);
        if (raw !== null && raw !== undefined) {
          try {
            data[key] = JSON.parse(raw);
          } catch {
            data[key] = raw;
          }
        }
      } catch (err) {
        console.warn(`[StorageCloudBackup] Error reading key ${key}:`, err);
      }
    }

    return data;
  }

  /**
   * Evaluates if data changed, and backs up to Firestore if needed
   */
  public async backupCriticalStorageIfNeeded(): Promise<boolean> {
    if (this.isBackingUp || typeof window === 'undefined') return false;

    const data = this.collectCriticalStorage();
    const keys = Object.keys(data);
    if (keys.length === 0) return false;

    // Fast digest check to avoid unnecessary cloud roundtrips
    const digest = JSON.stringify(data);
    if (digest === this.lastDataDigest) {
      return false;
    }

    return this.performBackup(data, digest);
  }

  /**
   * Triggers a debounced backup (e.g. after user changes theme or account updates)
   */
  public triggerDebouncedBackup(delayMs: number = 3000): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.backupCriticalStorageIfNeeded();
    }, delayMs);
  }

  /**
   * Force manual backup to Firestore
   */
  public async forceManualBackup(): Promise<{ success: boolean; message: string; keysCount: number }> {
    const data = this.collectCriticalStorage();
    const digest = JSON.stringify(data);
    const keys = Object.keys(data);

    if (keys.length === 0) {
      return { success: false, message: 'لا توجد بيانات محلية لنسخها احتياطياً.', keysCount: 0 };
    }

    const ok = await this.performBackup(data, digest);
    return {
      success: ok,
      message: ok ? `تم نسخ ${keys.length} من المفاتيح الأساسية إلى Firestore بنجاح.` : 'فشل النسخ الاحتياطي في Firestore.',
      keysCount: keys.length,
    };
  }

  /**
   * Core backup execution
   */
  private async performBackup(data: Record<string, any>, digest: string): Promise<boolean> {
    this.isBackingUp = true;
    this.updateStatus({ isBackingUp: true });

    try {
      // Find userId or phone from accounts if available
      let userId: string | undefined;
      let phone: string | undefined;

      const accounts = data['tg_multi_accounts_v3'];
      if (Array.isArray(accounts) && accounts.length > 0) {
        const activeAcc = accounts.find((a) => a && a.user) || accounts[0];
        if (activeAcc?.user) {
          userId = String(activeAcc.user.id || '');
          phone = activeAcc.user.phone;
        }
      }

      const res = await fetch('/api/backup/client_storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          userId,
          phone,
          clientVersion: '1.0.0',
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.lastDataDigest = digest;
          const now = new Date().toISOString();
          this.updateStatus({
            lastBackupTime: now,
            totalKeysBackedUp: Object.keys(data).length,
            availableKeys: Object.keys(data),
            isBackingUp: false,
          });

          // Dispatch event for UI reactivity
          window.dispatchEvent(new CustomEvent('storage_cloud_backup:success', {
            detail: { timestamp: now, keys: Object.keys(data) },
          }));

          console.log(`☁️ [StorageCloudBackup] Backed up ${Object.keys(data).length} storage keys to Firestore successfully.`);
          return true;
        }
      }
    } catch (err: any) {
      console.warn('[StorageCloudBackup] Backup network notice:', err?.message || err);
    } finally {
      this.isBackingUp = false;
      this.updateStatus({ isBackingUp: false });
    }

    return false;
  }

  /**
   * Auto-restores critical storage keys from Firestore if browser cache was cleared
   */
  public async autoRestoreFromCloud(): Promise<boolean> {
    if (this.isRestoring || typeof window === 'undefined') return false;
    this.isRestoring = true;
    this.updateStatus({ isRestoring: true });

    try {
      const res = await fetch('/api/backup/client_storage');
      if (!res.ok) return false;

      const json = await res.json();
      if (json.success && json.backup && json.backup.storageData) {
        const restoredData: Record<string, any> = json.backup.storageData;
        let restoredCount = 0;

        for (const [key, val] of Object.entries(restoredData)) {
          if (!val) continue;

          try {
            // Restore to SecureSessionStorage
            SecureSessionStorage.setItem(key, val);

            // Also mirror directly in localStorage for maximum compatibility
            if (typeof val === 'object') {
              localStorage.setItem(key, JSON.stringify(val));
            } else {
              localStorage.setItem(key, String(val));
            }
            restoredCount++;
          } catch (err) {
            console.warn(`[StorageCloudBackup] Failed to restore key ${key}:`, err);
          }
        }

        if (restoredCount > 0) {
          console.log(`✅ [StorageCloudBackup] Successfully hydrated ${restoredCount} critical storage keys from Firestore!`);

          // Remove explicit logout flag so session boots
          SecureSessionStorage.removeItem('tg_explicitly_logged_out');

          window.dispatchEvent(new CustomEvent('storage_cloud_backup:restored', {
            detail: { keys: Object.keys(restoredData), count: restoredCount },
          }));

          return true;
        }
      }
    } catch (err: any) {
      console.warn('[StorageCloudBackup] Auto-restore notice:', err?.message || err);
    } finally {
      this.isRestoring = false;
      this.updateStatus({ isRestoring: false });
    }

    return false;
  }

  /**
   * Force manual restore from Firestore
   */
  public async forceManualRestore(): Promise<{ success: boolean; message: string; restoredKeysCount: number }> {
    this.isRestoring = true;
    this.updateStatus({ isRestoring: true });

    try {
      const res = await fetch('/api/backup/client_storage');
      if (!res.ok) {
        return { success: false, message: 'فشل الاتصال بخادم النسخ الاحتياطي.', restoredKeysCount: 0 };
      }

      const json = await res.json();
      if (!json.success || !json.backup || !json.backup.storageData) {
        return { success: false, message: 'لم يتم العثور على نسخة احتياطية محفوظة في Firestore.', restoredKeysCount: 0 };
      }

      const restoredData: Record<string, any> = json.backup.storageData;
      let count = 0;
      for (const [key, val] of Object.entries(restoredData)) {
        if (!val) continue;
        try {
          SecureSessionStorage.setItem(key, val);
          if (typeof val === 'object') {
            localStorage.setItem(key, JSON.stringify(val));
          } else {
            localStorage.setItem(key, String(val));
          }
          count++;
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('storage_cloud_backup:restored', {
        detail: { keys: Object.keys(restoredData), count },
      }));

      return {
        success: true,
        message: `تمت استعادة ${count} مفتاح من Firestore بنجاح. يرجى تحديث الصفحة إن لزم الأمر.`,
        restoredKeysCount: count,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'حدث خطأ أثناء استعادة البيانات.',
        restoredKeysCount: 0,
      };
    } finally {
      this.isRestoring = false;
      this.updateStatus({ isRestoring: false });
    }
  }

  /**
   * Fetches latest diagnostic status from server
   */
  public async refreshStatus(): Promise<StorageCloudBackupStatus> {
    try {
      const res = await fetch('/api/backup/client_storage/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.updateStatus({
            isCloudConnected: json.isCloudConnected,
            lastBackupTime: json.lastBackupTime || this.currentStatus.lastBackupTime,
            totalKeysBackedUp: json.totalKeysBackedUp || this.currentStatus.totalKeysBackedUp,
            availableKeys: json.availableKeys || this.currentStatus.availableKeys,
          });
        }
      }
    } catch (_) {}

    return this.currentStatus;
  }

  public getStatus(): StorageCloudBackupStatus {
    return { ...this.currentStatus };
  }

  public subscribe(listener: (status: StorageCloudBackupStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateStatus(partial: Partial<StorageCloudBackupStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.getStatus());
      } catch (_) {}
    }
  }

  public destroy(): void {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.listeners.clear();
  }
}

export const storageCloudBackupService = StorageCloudBackupService.getInstance();
