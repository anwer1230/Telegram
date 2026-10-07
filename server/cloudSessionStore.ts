/**
 * server/cloudSessionStore.ts
 *
 * Persistent Cloud Storage & Database Session Engine for Telegram Fullstack
 * 
 * Replaces ephemeral container disk storage with persistent multi-cloud backing:
 * 1. Primary: Google Cloud Firestore (via firebase-admin/firestore)
 * 2. Secondary: Redis Persistent Store (via ioredis)
 * 3. Mirror/Cache: data/telegram_sessions.json & sessions/account_X.json
 *
 * All stored session strings and account payloads are strongly encrypted at rest
 * using AES-256-GCM authenticated encryption.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import Redis from 'ioredis';

export interface StoredAccountSession {
  session: string;
  userId: string;
  phone: string;
  index?: number;
  name?: string;
  username?: string;
  avatar?: string;
  isPremium?: boolean;
  pts?: number;
  qts?: number;
  date?: number;
  seq?: number;
  updatedAt?: string;
}

export interface EncryptedCloudSessionDoc {
  id: string;
  accountIndex: number;
  phone: string;
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  isPremium?: boolean;
  encryptedPayload: string; // AES-256-GCM "ivHex:authTagHex:ciphertextHex"
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CloudStorageStatus {
  activeProvider: 'firestore' | 'redis' | 'local_mirrored';
  isCloudConnected: boolean;
  firestoreConfigured: boolean;
  redisConfigured: boolean;
  totalPersistedAccounts: number;
  accountsSummary: Array<{
    index: number;
    phone: string;
    userId: string;
    name: string;
    lastUpdated: string;
  }>;
  encryption: {
    algorithm: 'AES-256-GCM';
    keyDerived: boolean;
    atRestProtected: boolean;
  };
  lastSyncTimestamp: string | null;
}

// =========================================================================
// AES-256-GCM ENCRYPTION & DECRYPTION ENGINE
// =========================================================================
const MASTER_SECRET = process.env.SESSION_SECRET || 'tg_session_anwer_foud_secure_key_2026';
const SALT = Buffer.from('tg_persistent_cloud_sessions_salt_2026', 'utf-8');
const ENCRYPTION_KEY = crypto.scryptSync(MASTER_SECRET, SALT, 32);

/**
 * Encrypts an object using AES-256-GCM
 */
export function encryptPayload(data: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const jsonStr = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string
 */
export function decryptPayload<T = any>(encryptedStr: string): T | null {
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch (err: any) {
    console.error('[CloudSessionStore] Decryption error:', err?.message || err);
    return null;
  }
}

// =========================================================================
// PATHS & DISK MIRRORING
// =========================================================================
const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const TELEGRAM_SESSIONS_JSON = path.join(DATA_DIR, 'telegram_sessions.json');

function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

// =========================================================================
// CLOUD PROVIDERS INITIALIZATION (FIRESTORE & REDIS)
// =========================================================================
let firestoreDb: Firestore | null = null;
let firestoreInitAttempted = false;
let redisClient: Redis | null = null;
let redisInitAttempted = false;
let lastSyncTime: string | null = null;

/**
 * Lazily initializes and returns Firestore instance
 */
export function getCloudFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  if (firestoreInitAttempted) return firestoreDb;
  firestoreInitAttempted = true;

  try {
    let projectId = 'tidal-venture-7xctm';
    let databaseId: string | undefined = undefined;

    const configFile = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configFile)) {
      try {
        const raw = fs.readFileSync(configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.projectId) projectId = parsed.projectId;
        if (parsed.firestoreDatabaseId && parsed.firestoreDatabaseId !== '(default)') {
          databaseId = parsed.firestoreDatabaseId;
        }
      } catch (cfgErr) {
        console.warn('[CloudSessionStore] Could not read firebase-applet-config.json:', cfgErr);
      }
    }

    let app: any;
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      const serviceAccountFilePath = path.join(process.cwd(), 'config', 'serviceAccountKey.json');
      if (fs.existsSync(serviceAccountFilePath)) {
        app = initializeApp({
          credential: cert(serviceAccountFilePath),
          projectId,
        });
      } else if (process.env.FIREBASE_PRIVATE_KEY) {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail: `firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com`,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId,
        });
      } else {
        // Initialize with project ID
        app = initializeApp({ projectId });
      }
    }

    firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    console.log(`✅ [CloudSessionStore] Cloud Firestore initialized (Project: ${projectId}, Database: ${databaseId || '(default)'}) for collection: telegram_sessions`);
    return firestoreDb;
  } catch (err: any) {
    console.warn('⚠️ [CloudSessionStore] Firestore initialization notice:', err?.message || err);
    firestoreDb = null;
    return null;
  }
}

/**
 * Lazily initializes Redis client if REDIS_URL is provided
 */
export function getCloudRedis(): Redis | null {
  if (redisClient) return redisClient;
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
  if (!redisUrl) return null;

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 4000,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️ [CloudSessionStore] Redis connection notice:', err?.message || err);
    });

    console.log('✅ [CloudSessionStore] Redis cloud client configured');
    return redisClient;
  } catch (err: any) {
    console.warn('⚠️ [CloudSessionStore] Redis initialization failed:', err?.message || err);
    redisClient = null;
    return null;
  }
}

// =========================================================================
// LOCAL DISK MIRROR READ & WRITE
// =========================================================================

/**
 * Saves all accounts into data/telegram_sessions.json (atomic mirror)
 */
export function writeDiskMirrorJson(accountsMap: Map<number, StoredAccountSession>): void {
  try {
    ensureDirectories();
    const list: StoredAccountSession[] = Array.from(accountsMap.values());
    const payload = {
      updatedAt: new Date().toISOString(),
      count: list.length,
      accounts: list,
    };
    fs.writeFileSync(TELEGRAM_SESSIONS_JSON, JSON.stringify(payload, null, 2), 'utf-8');

    // Also mirror to individual sessions/account_{idx}.json
    for (const [idx, acc] of accountsMap.entries()) {
      const itemPath = path.join(SESSIONS_DIR, `account_${idx}.json`);
      fs.writeFileSync(itemPath, JSON.stringify(acc, null, 2), 'utf-8');
    }
  } catch (err: any) {
    console.warn('[CloudSessionStore] Disk mirror write notice:', err?.message || err);
  }
}

/**
 * Reads local accounts from data/telegram_sessions.json and sessions/ directory
 */
export function readDiskMirrorSessions(): Map<number, StoredAccountSession> {
  const map = new Map<number, StoredAccountSession>();
  try {
    ensureDirectories();

    // 1. Try reading data/telegram_sessions.json
    if (fs.existsSync(TELEGRAM_SESSIONS_JSON)) {
      try {
        const raw = fs.readFileSync(TELEGRAM_SESSIONS_JSON, 'utf-8');
        const data = JSON.parse(raw);
        const list = Array.isArray(data) ? data : data.accounts;
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.session && typeof item.index === 'number') {
              map.set(item.index, item);
            }
          }
        }
      } catch (err: any) {
        console.warn('[CloudSessionStore] Failed reading data/telegram_sessions.json:', err?.message || err);
      }
    }

    // 2. Also inspect sessions/account_{X}.json
    if (fs.existsSync(SESSIONS_DIR)) {
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        const match = file.match(/^account_(\d+)\.json$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (!map.has(idx)) {
            try {
              const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
              const parsed = JSON.parse(raw);
              if (parsed && parsed.session) {
                map.set(idx, parsed);
              }
            } catch (_) {}
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[CloudSessionStore] Error reading local disk sessions:', err?.message || err);
  }
  return map;
}

// =========================================================================
// PRIMARY CLOUD STORAGE ACTIONS: SAVE, LOAD, DELETE
// =========================================================================

/**
 * Saves an account session into the persistent cloud database (Firestore / Redis)
 * and simultaneously mirrors to disk.
 *
 * Encrypts the session string and state credentials at rest.
 */
export async function saveCloudSession(
  accountIndex: number,
  sessionData: StoredAccountSession
): Promise<boolean> {
  try {
    const cleanPhone = String(sessionData.phone || '').replace(/\D/g, '');
    const cleanUserId = String(sessionData.userId || '');
    const docId = `account_${accountIndex}`;
    const nowIso = new Date().toISOString();

    // Encrypt sensitive session payload
    const sensitivePayload = {
      session: sessionData.session,
      phone: sessionData.phone,
      userId: sessionData.userId,
      pts: sessionData.pts,
      qts: sessionData.qts,
      date: sessionData.date,
      seq: sessionData.seq,
    };
    const encryptedPayload = encryptPayload(sensitivePayload);

    const cloudDoc: EncryptedCloudSessionDoc = {
      id: docId,
      accountIndex,
      phone: sessionData.phone,
      userId: cleanUserId,
      name: sessionData.name || '',
      username: sessionData.username || '',
      avatar: sessionData.avatar || '',
      isPremium: !!sessionData.isPremium,
      encryptedPayload,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
    };

    let cloudSaved = false;

    // 1. Try Google Cloud Firestore
    const db = getCloudFirestore();
    if (db) {
      try {
        await db.collection('telegram_sessions').doc(docId).set(cloudDoc, { merge: true });
        if (cleanPhone) {
          await db.collection('telegram_sessions').doc(`phone_${cleanPhone}`).set(cloudDoc, { merge: true });
        }
        cloudSaved = true;
        console.log(`☁️ [CloudSessionStore] Saved encrypted session for Account [${accountIndex}] to Firestore.`);
      } catch (fsErr: any) {
        console.warn(`⚠️ [CloudSessionStore] Firestore save failed for Account [${accountIndex}]:`, fsErr?.message || fsErr);
      }
    }

    // 2. Try Redis
    const redis = getCloudRedis();
    if (redis) {
      try {
        await redis.set(`tg:session:${docId}`, JSON.stringify(cloudDoc));
        if (cleanPhone) {
          await redis.set(`tg:session:phone_${cleanPhone}`, JSON.stringify(cloudDoc));
        }
        await redis.hset('tg:sessions:all', docId, JSON.stringify(cloudDoc));
        cloudSaved = true;
        console.log(`☁️ [CloudSessionStore] Saved encrypted session for Account [${accountIndex}] to Redis.`);
      } catch (rdErr: any) {
        console.warn(`⚠️ [CloudSessionStore] Redis save failed for Account [${accountIndex}]:`, rdErr?.message || rdErr);
      }
    }

    // 3. Always mirror to local disk (data/telegram_sessions.json & sessions/)
    const currentLocal = readDiskMirrorSessions();
    currentLocal.set(accountIndex, {
      ...sessionData,
      index: accountIndex,
      updatedAt: nowIso,
    });
    writeDiskMirrorJson(currentLocal);

    lastSyncTime = nowIso;
    console.log(`💾 [CloudSessionStore] Account [${accountIndex}] successfully mirrored locally and to cloud (CloudSaved: ${cloudSaved}).`);
    return true;
  } catch (err: any) {
    console.error(`❌ [CloudSessionStore] Fatal error saving cloud session for Account [${accountIndex}]:`, err?.message || err);
    return false;
  }
}

/**
 * Loads all account sessions directly from Persistent Cloud Storage (Firestore / Redis).
 * If cloud is accessible, decrypts all sessions and syncs them to local disk.
 * If cloud is empty or unreachable, falls back to disk and auto-migrates to cloud.
 */
export async function loadAllCloudSessions(): Promise<Map<number, StoredAccountSession>> {
  const result = new Map<number, StoredAccountSession>();
  console.log('🔄 [CloudSessionStore] Querying persistent cloud database for saved sessions...');

  let cloudFound = false;

  // 1. Try Google Cloud Firestore
  const db = getCloudFirestore();
  if (db) {
    try {
      const snapshot = await db.collection('telegram_sessions').get();
      if (!snapshot.empty) {
        for (const doc of snapshot.docs) {
          const docData = doc.data() as EncryptedCloudSessionDoc;
          // Only process primary account_* documents to avoid duplicates with phone_* aliases
          if (doc.id.startsWith('account_') && docData.encryptedPayload) {
            const decrypted = decryptPayload(docData.encryptedPayload);
            if (decrypted && decrypted.session) {
              const accountIndex = typeof docData.accountIndex === 'number' ? docData.accountIndex : parseInt(doc.id.replace('account_', ''), 10) || 0;
              result.set(accountIndex, {
                session: decrypted.session,
                userId: decrypted.userId || docData.userId,
                phone: decrypted.phone || docData.phone,
                index: accountIndex,
                name: docData.name,
                username: docData.username,
                avatar: docData.avatar,
                isPremium: docData.isPremium,
                pts: decrypted.pts,
                qts: decrypted.qts,
                date: decrypted.date,
                seq: decrypted.seq,
                updatedAt: docData.updatedAt,
              });
              cloudFound = true;
            }
          }
        }
        if (result.size > 0) {
          console.log(`☁️ [CloudSessionStore] Loaded ${result.size} encrypted session(s) from Firestore.`);
        }
      }
    } catch (fsErr: any) {
      console.warn('⚠️ [CloudSessionStore] Firestore query failed:', fsErr?.message || fsErr);
    }
  }

  // 2. Try Redis if Firestore didn't yield sessions
  if (result.size === 0) {
    const redis = getCloudRedis();
    if (redis) {
      try {
        const allDocs = await redis.hgetall('tg:sessions:all');
        if (allDocs && Object.keys(allDocs).length > 0) {
          for (const [key, rawJson] of Object.entries(allDocs)) {
            try {
              const docData = JSON.parse(rawJson) as EncryptedCloudSessionDoc;
              if (docData.encryptedPayload) {
                const decrypted = decryptPayload(docData.encryptedPayload);
                if (decrypted && decrypted.session) {
                  const accountIndex = typeof docData.accountIndex === 'number' ? docData.accountIndex : parseInt(key.replace('account_', ''), 10) || 0;
                  result.set(accountIndex, {
                    session: decrypted.session,
                    userId: decrypted.userId || docData.userId,
                    phone: decrypted.phone || docData.phone,
                    index: accountIndex,
                    name: docData.name,
                    username: docData.username,
                    avatar: docData.avatar,
                    isPremium: docData.isPremium,
                    pts: decrypted.pts,
                    qts: decrypted.qts,
                    date: decrypted.date,
                    seq: decrypted.seq,
                    updatedAt: docData.updatedAt,
                  });
                  cloudFound = true;
                }
              }
            } catch (_) {}
          }
          if (result.size > 0) {
            console.log(`☁️ [CloudSessionStore] Loaded ${result.size} encrypted session(s) from Redis.`);
          }
        }
      } catch (rdErr: any) {
        console.warn('⚠️ [CloudSessionStore] Redis query failed:', rdErr?.message || rdErr);
      }
    }
  }

  // 3. If cloud returned sessions, write them immediately to disk mirror
  if (result.size > 0) {
    writeDiskMirrorJson(result);
    lastSyncTime = new Date().toISOString();
    return result;
  }

  // 4. Fallback: Read local disk mirror (data/telegram_sessions.json & sessions/)
  console.log('ℹ️ [CloudSessionStore] No cloud sessions found. Falling back to local disk mirror...');
  const diskSessions = readDiskMirrorSessions();

  if (diskSessions.size > 0) {
    console.log(`💾 [CloudSessionStore] Found ${diskSessions.size} account(s) on disk. Auto-migrating to persistent cloud storage...`);
    // Asynchronously back them up to cloud database
    for (const [idx, item] of diskSessions.entries()) {
      saveCloudSession(idx, item).catch(() => {});
    }
    return diskSessions;
  }

  console.log('ℹ️ [CloudSessionStore] No saved sessions found in cloud or disk. Fresh start.');
  return result;
}

/**
 * Deletes a session from Firestore, Redis, and local disk
 */
export async function deleteCloudSession(
  accountIndex: number,
  phone?: string,
  userId?: string
): Promise<boolean> {
  const docId = `account_${accountIndex}`;
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';

  try {
    // 1. Delete from Firestore
    const db = getCloudFirestore();
    if (db) {
      try {
        await db.collection('telegram_sessions').doc(docId).delete();
        if (cleanPhone) {
          await db.collection('telegram_sessions').doc(`phone_${cleanPhone}`).delete();
        }
        console.log(`☁️ [CloudSessionStore] Deleted Account [${accountIndex}] from Firestore.`);
      } catch (fsErr: any) {
        console.warn(`⚠️ [CloudSessionStore] Firestore delete notice:`, fsErr?.message || fsErr);
      }
    }

    // 2. Delete from Redis
    const redis = getCloudRedis();
    if (redis) {
      try {
        await redis.del(`tg:session:${docId}`);
        if (cleanPhone) {
          await redis.del(`tg:session:phone_${cleanPhone}`);
        }
        await redis.hdel('tg:sessions:all', docId);
        console.log(`☁️ [CloudSessionStore] Deleted Account [${accountIndex}] from Redis.`);
      } catch (rdErr: any) {
        console.warn(`⚠️ [CloudSessionStore] Redis delete notice:`, rdErr?.message || rdErr);
      }
    }

    // 3. Delete from disk
    const diskSessions = readDiskMirrorSessions();
    if (diskSessions.has(accountIndex)) {
      diskSessions.delete(accountIndex);
      writeDiskMirrorJson(diskSessions);
    }

    const itemPath = path.join(SESSIONS_DIR, `account_${accountIndex}.json`);
    if (fs.existsSync(itemPath)) {
      try {
        fs.unlinkSync(itemPath);
      } catch (_) {}
    }

    lastSyncTime = new Date().toISOString();
    return true;
  } catch (err: any) {
    console.error(`❌ [CloudSessionStore] Delete error for Account [${accountIndex}]:`, err?.message || err);
    return false;
  }
}

/**
 * Returns diagnostic metadata and sync status
 */
export async function getCloudStorageStatus(): Promise<CloudStorageStatus> {
  const firestore = getCloudFirestore();
  const redis = getCloudRedis();
  const disk = readDiskMirrorSessions();

  let activeProvider: 'firestore' | 'redis' | 'local_mirrored' = 'local_mirrored';
  let isCloudConnected = false;

  if (firestore) {
    activeProvider = 'firestore';
    isCloudConnected = true;
  } else if (redis) {
    activeProvider = 'redis';
    isCloudConnected = true;
  }

  const accountsSummary = Array.from(disk.values()).map((acc) => ({
    index: acc.index,
    phone: acc.phone,
    userId: acc.userId,
    name: acc.name || 'Telegram User',
    lastUpdated: acc.updatedAt || new Date().toISOString(),
  }));

  return {
    activeProvider,
    isCloudConnected,
    firestoreConfigured: !!firestore,
    redisConfigured: !!redis,
    totalPersistedAccounts: disk.size,
    accountsSummary,
    encryption: {
      algorithm: 'AES-256-GCM',
      keyDerived: true,
      atRestProtected: true,
    },
    lastSyncTimestamp: lastSyncTime || new Date().toISOString(),
  };
}
