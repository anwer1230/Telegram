import fs from 'fs';
import path from 'path';
import { getCloudFirestore, encryptPayload, decryptPayload } from './cloudSessionStore';
import {
  setFirestoreDoc,
  getFirestoreDoc,
  isFirestoreConfigured,
} from './firestoreRestClient';

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

    let savedToCloud = false;

    // A. Direct Firestore REST Client (uses project API Key and obeys firestore.rules)
    if (isFirestoreConfigured()) {
      const ok1 = await setFirestoreDoc('client_storage_backups', targetId, firestoreDoc);
      const ok2 = await setFirestoreDoc('client_storage_backups', 'latest_backup', {
        ...firestoreDoc,
        id: 'latest_backup',
      });
      if (ok1 || ok2) {
        savedToCloud = true;
        console.log(`☁️ [StorageBackupStore] Successfully saved backup to Firestore [${targetId}] (${keys.length} keys: ${keysSummary})`);
      }
    }

    // B. Fallback to Admin SDK if configured with service account credentials
    if (!savedToCloud) {
      const firestore = getCloudFirestore();
      if (firestore) {
        const collection = firestore.collection('client_storage_backups');
        await collection.doc(targetId).set(firestoreDoc, { merge: true });
        await collection.doc('latest_backup').set({
          ...firestoreDoc,
          id: 'latest_backup',
        }, { merge: true });
        console.log(`☁️ [StorageBackupStore] Successfully saved backup to Firestore Admin SDK [${targetId}]`);
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ [StorageBackupStore] Cloud backup notice (saved to disk mirror):`, err?.message || err);
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

  // 1. Attempt Firestore fetch via REST Client
  try {
    if (isFirestoreConfigured()) {
      let raw: any = targetId ? await getFirestoreDoc('client_storage_backups', targetId) : null;
      if (!raw) {
        raw = await getFirestoreDoc('client_storage_backups', 'latest_backup');
      }

      if (raw) {
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
    console.warn('[StorageBackupStore] Firestore REST read notice:', err?.message || err);
  }

  // Fallback to Admin SDK if configured
  try {
    const firestore = getCloudFirestore();
    if (firestore) {
      const collection = firestore.collection('client_storage_backups');

      let docSnap = targetId ? await collection.doc(targetId).get() : null;
      if (!docSnap || !docSnap.exists) {
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
    console.warn('[StorageBackupStore] Firestore Admin read notice:', err?.message || err);
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
  const isCloud = isFirestoreConfigured() || !!getCloudFirestore();
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
    isCloudConnected: isCloud,
    lastBackupTime: latestTime,
    totalKeysBackedUp: keys.length,
    availableKeys: keys,
  };
}
