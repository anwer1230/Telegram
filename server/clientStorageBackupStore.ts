import fs from 'fs';
import path from 'path';
import { getCloudFirestore, encryptPayload, decryptPayload } from './cloudSessionStore';

export interface ClientStorageBackupPayload {
  id?: string;
  userId?: string;
  phone?: string;
  data: Record<string, any>;
  clientVersion?: string;
  timestamp?: string;
}

export interface ClientStorageBackupRecord {
  id: string;
  userId?: string;
  phone?: string;
  storageData: Record<string, any>;
  keysSummary: string;
  backupTimestamp: string;
  clientVersion?: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'client_storage_backup.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[StorageBackupStore] Error ensuring data directory:', err);
  }
}

let lastBackupTimestamp: string | null = null;
let lastBackupKeys: string[] = [];

/**
 * Saves client storage backup (critical keys like tg_multi_accounts_v3, app_settings)
 * to Firestore collection `client_storage_backups` and disk mirror.
 */
export async function saveClientStorageBackup(payload: ClientStorageBackupPayload): Promise<boolean> {
  ensureDataDir();

  const now = new Date().toISOString();
  const keys = Object.keys(payload.data || {});
  const keysSummary = keys.join(', ');
  const targetId = payload.userId ? `user_${payload.userId}` : payload.phone ? `phone_${payload.phone.replace(/\D/g, '')}` : 'default_backup';

  const record: ClientStorageBackupRecord = {
    id: targetId,
    userId: payload.userId,
    phone: payload.phone,
    storageData: payload.data,
    keysSummary,
    backupTimestamp: payload.timestamp || now,
    clientVersion: payload.clientVersion || '1.0.0',
    updatedAt: now,
  };

  // 1. Mirror locally to disk
  try {
    let diskMap: Record<string, any> = {};
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        diskMap = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      } catch (_) {}
    }
    diskMap[targetId] = record;
    diskMap['latest_backup'] = record;
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(diskMap, null, 2), 'utf-8');
    lastBackupTimestamp = now;
    lastBackupKeys = keys;
  } catch (err: any) {
    console.warn('[StorageBackupStore] Failed to write disk backup mirror:', err?.message || err);
  }

  // 2. Persist to Firestore
  try {
    const firestore = getCloudFirestore();
    if (firestore) {
      const collection = firestore.collection('client_storage_backups');

      // Encrypt storageData for privacy at rest
      const encryptedData = encryptPayload(record.storageData);

      const firestoreDoc = {
        id: targetId,
        userId: record.userId || null,
        phone: record.phone || null,
        storageData: encryptedData,
        keysSummary: record.keysSummary,
        backupTimestamp: record.backupTimestamp,
        clientVersion: record.clientVersion,
        updatedAt: record.updatedAt,
      };

      // Save user/device specific document
      await collection.doc(targetId).set(firestoreDoc, { merge: true });

      // Also update latest_backup doc so new browser tabs or fresh devices can hydrate immediately
      await collection.doc('latest_backup').set({
        ...firestoreDoc,
        id: 'latest_backup',
      }, { merge: true });

      console.log(`☁️ [StorageBackupStore] Successfully saved backup to Firestore [${targetId}] (${keys.length} keys: ${keysSummary})`);
      return true;
    }
  } catch (err: any) {
    console.warn(`⚠️ [StorageBackupStore] Firestore backup failed, saved to local disk mirror:`, err?.message || err);
  }

  return true;
}

/**
 * Retrieves the latest client storage backup from Firestore or disk fallback
 */
export async function getClientStorageBackup(options?: {
  userId?: string;
  phone?: string;
}): Promise<ClientStorageBackupRecord | null> {
  const targetId = options?.userId ? `user_${options.userId}` : options?.phone ? `phone_${options.phone.replace(/\D/g, '')}` : null;

  // 1. Attempt Firestore fetch
  try {
    const firestore = getCloudFirestore();
    if (firestore) {
      const collection = firestore.collection('client_storage_backups');

      let docSnap = targetId ? await collection.doc(targetId).get() : null;
      if (!docSnap || !docSnap.exists) {
        // Fallback to latest_backup doc
        docSnap = await collection.doc('latest_backup').get();
      }

      if (docSnap && docSnap.exists) {
        const raw = docSnap.data() as any;
        let decryptedData = raw.storageData;
        if (typeof raw.storageData === 'string' && raw.storageData.includes(':')) {
          const decrypted = decryptPayload<Record<string, any>>(raw.storageData);
          if (decrypted) decryptedData = decrypted;
        }

        return {
          id: raw.id || 'latest_backup',
          userId: raw.userId || undefined,
          phone: raw.phone || undefined,
          storageData: decryptedData,
          keysSummary: raw.keysSummary || '',
          backupTimestamp: raw.backupTimestamp || raw.updatedAt || new Date().toISOString(),
          clientVersion: raw.clientVersion || '1.0.0',
          updatedAt: raw.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err: any) {
    console.warn('[StorageBackupStore] Firestore read notice:', err?.message || err);
  }

  // 2. Fallback to local disk mirror
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const diskMap = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      if (targetId && diskMap[targetId]) {
        return diskMap[targetId];
      }
      if (diskMap['latest_backup']) {
        return diskMap['latest_backup'];
      }
      const firstKey = Object.keys(diskMap)[0];
      if (firstKey) return diskMap[firstKey];
    }
  } catch (err: any) {
    console.warn('[StorageBackupStore] Disk mirror read error:', err?.message || err);
  }

  return null;
}

/**
 * Diagnostic status of the client storage backup service
 */
export async function getClientStorageBackupStatus(): Promise<{
  success: boolean;
  isCloudConnected: boolean;
  lastBackupTime: string | null;
  totalKeysBackedUp: number;
  availableKeys: string[];
}> {
  const firestore = getCloudFirestore();
  let latestTime = lastBackupTimestamp;
  let keys = lastBackupKeys;

  if (!latestTime || keys.length === 0) {
    const backup = await getClientStorageBackup();
    if (backup) {
      latestTime = backup.updatedAt || backup.backupTimestamp;
      keys = Object.keys(backup.storageData || {});
    }
  }

  return {
    success: true,
    isCloudConnected: !!firestore,
    lastBackupTime: latestTime,
    totalKeysBackedUp: keys.length,
    availableKeys: keys,
  };
}
