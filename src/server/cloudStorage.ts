import fs from 'fs';
import path from 'path';
import {
  saveTelegramSessionToFirestore,
  loadTelegramSessionsFromFirestore,
  deleteTelegramSessionFromFirestore,
  getFirestoreDiagnosticInfo,
} from './firestoreClient.js';

export interface StoredSession {
  phone: string;
  sessionString: string;
  name: string;
  username?: string;
  userId?: string;
  savedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'telegram_sessions.json');
const SESSIONS_BACKUP_FILE = path.join(DATA_DIR, 'telegram_sessions.backup.json');

// In-memory runtime cache for microsecond lookups
const memoryCache = new Map<string, StoredSession>();
let lastSyncTimestamp = new Date().toISOString();
let isCloudSynced = false;
let cloudProviderName = 'local_file';

/**
 * Determine Google Cloud Project ID if running in GCP, Firebase, or Cloud Run
 */
function getGcpProjectId(): string | null {
  return (
    process.env.FIRESTORE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    null
  );
}

/**
 * Read sessions from disk with error recovery and backup fallback
 */
function readFromDisk(): Record<string, StoredSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.sessions === 'object') {
        return parsed.sessions;
      }
    }
  } catch (err) {
    console.warn('[CloudStorage] Primary sessions file corrupted, trying backup...', err);
  }

  try {
    if (fs.existsSync(SESSIONS_BACKUP_FILE)) {
      const raw = fs.readFileSync(SESSIONS_BACKUP_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.sessions === 'object') {
        return parsed.sessions;
      }
    }
  } catch (err) {
    console.error('[CloudStorage] Backup sessions file could not be read:', err);
  }

  return {};
}

/**
 * Write sessions to disk and maintain a resilient backup
 */
function writeToDisk(sessions: Record<string, StoredSession>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = JSON.stringify({ sessions, updatedAt: new Date().toISOString() }, null, 2);
    fs.writeFileSync(SESSIONS_FILE, payload, 'utf-8');
    // Mirror to backup
    fs.writeFileSync(SESSIONS_BACKUP_FILE, payload, 'utf-8');
  } catch (err) {
    console.error('[CloudStorage] Failed to write sessions to disk:', err);
  }
}

/**
 * Read sessions from Firestore
 */
async function fetchFromFirestore(): Promise<Record<string, StoredSession> | null> {
  try {
    const sessions = await loadTelegramSessionsFromFirestore();
    if (sessions !== null) {
      isCloudSynced = true;
      cloudProviderName = 'firebase_firestore';
      return sessions;
    }
  } catch (err: any) {
    console.warn('[CloudStorage] Firestore query failed:', err?.message || err);
  }
  return null;
}

/**
 * Save a session document to Firestore
 */
async function syncSessionToFirestore(session: StoredSession): Promise<boolean> {
  try {
    const success = await saveTelegramSessionToFirestore(session);
    if (success) {
      isCloudSynced = true;
      cloudProviderName = 'firebase_firestore';
      return true;
    }
  } catch (err: any) {
    console.warn('[CloudStorage] Firestore save error:', err?.message || err);
  }
  return false;
}

/**
 * Delete a session document from Firestore
 */
async function deleteSessionFromFirestore(phone: string): Promise<boolean> {
  try {
    return await deleteTelegramSessionFromFirestore(phone);
  } catch {
    return false;
  }
}

/**
 * Initialize Cloud Storage layer on server boot:
 * Loads sessions from Firestore first, then merges with local disk and environment variables
 */
export async function initCloudStorage(): Promise<Record<string, StoredSession>> {
  console.log('[CloudStorage] Initializing multi-layer persistent session store with Firebase Firestore...');

  // 1. Check local disk
  const diskSessions = readFromDisk();
  Object.entries(diskSessions).forEach(([k, v]) => memoryCache.set(k, v));

  // 2. Check environment-injected sessions (e.g. Render / Heroku / Container secrets)
  if (process.env.TELEGRAM_PERSISTENT_SESSIONS) {
    try {
      const parsed = JSON.parse(process.env.TELEGRAM_PERSISTENT_SESSIONS);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: StoredSession) => {
          if (s.phone && s.sessionString) memoryCache.set(s.phone, s);
        });
      } else if (typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => memoryCache.set(k, v as StoredSession));
      }
      cloudProviderName = 'env_persistent';
      console.log('[CloudStorage] Loaded persistent sessions from TELEGRAM_PERSISTENT_SESSIONS env var');
    } catch {
      // ignore JSON parse error
    }
  }

  // 3. Attempt cloud query (Firestore)
  const firestoreSessions = await fetchFromFirestore();
  if (firestoreSessions) {
    Object.entries(firestoreSessions).forEach(([k, v]) => memoryCache.set(k, v));
    // Auto-sync any sessions that exist in memory/disk but not yet in Firestore
    for (const [phone, session] of memoryCache.entries()) {
      if (!firestoreSessions[phone]) {
        console.log(`[CloudStorage] Auto-syncing session for ${phone} to persistent Firestore...`);
        void saveTelegramSessionToFirestore(session);
      }
    }
  } else {
    // If Firestore was empty or freshly configured, sync all cached sessions
    for (const [, session] of memoryCache.entries()) {
      void saveTelegramSessionToFirestore(session);
    }
  }

  // Persist combined state to local disk
  const combined: Record<string, StoredSession> = {};
  memoryCache.forEach((val, key) => {
    combined[key] = val;
  });
  writeToDisk(combined);

  lastSyncTimestamp = new Date().toISOString();
  console.log(`[CloudStorage] Active session cache ready with ${memoryCache.size} registered account(s).`);
  return combined;
}

/**
 * Load all stored sessions across memory, cloud, and disk
 */
export async function loadAllSessions(): Promise<Record<string, StoredSession>> {
  if (memoryCache.size === 0) {
    return await initCloudStorage();
  }
  const result: Record<string, StoredSession> = {};
  memoryCache.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}

/**
 * Synchronous read from memory cache for instant MTProto handlers
 */
export function loadAllSessionsSync(): Record<string, StoredSession> {
  if (memoryCache.size === 0) {
    const disk = readFromDisk();
    Object.entries(disk).forEach(([k, v]) => memoryCache.set(k, v));
  }
  const result: Record<string, StoredSession> = {};
  memoryCache.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}

/**
 * Save a session record to Memory, Disk, and Cloud (Firestore)
 */
export async function saveSession(session: StoredSession): Promise<void> {
  memoryCache.set(session.phone, session);

  // Write to disk
  const all: Record<string, StoredSession> = {};
  memoryCache.forEach((val, key) => {
    all[key] = val;
  });
  writeToDisk(all);

  // Async sync to cloud
  void syncSessionToFirestore(session);

  lastSyncTimestamp = new Date().toISOString();
}

/**
 * Delete a session by phone number across all layers
 */
export async function deleteSession(phone: string): Promise<void> {
  memoryCache.delete(phone);

  const all: Record<string, StoredSession> = {};
  memoryCache.forEach((val, key) => {
    all[key] = val;
  });
  writeToDisk(all);

  void deleteSessionFromFirestore(phone);
  lastSyncTimestamp = new Date().toISOString();
}

/**
 * Clear all sessions (e.g. on global logout)
 */
export async function clearAllSessions(): Promise<void> {
  const phones = Array.from(memoryCache.keys());
  memoryCache.clear();
  writeToDisk({});

  for (const phone of phones) {
    void deleteSessionFromFirestore(phone);
  }
  lastSyncTimestamp = new Date().toISOString();
}

/**
 * Get cloud storage diagnostics for status inspection
 */
export function getStorageDiagnostics() {
  const sessions: Array<{ phone: string; name: string; username?: string; savedAt: string }> = [];
  memoryCache.forEach(s => {
    sessions.push({
      phone: s.phone,
      name: s.name,
      username: s.username,
      savedAt: s.savedAt,
    });
  });

  const firestoreInfo = getFirestoreDiagnosticInfo();

  return {
    isCloudActive: isCloudSynced || firestoreInfo.isConfigured,
    provider: firestoreInfo.isConfigured ? 'firebase_firestore' : cloudProviderName,
    firestore: firestoreInfo,
    sessionCount: memoryCache.size,
    lastSyncedAt: lastSyncTimestamp,
    sessions,
  };
}
