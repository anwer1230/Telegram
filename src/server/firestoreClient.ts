import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  type Firestore,
} from 'firebase/firestore';
import type { StoredSession } from './cloudStorage';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let isConfigured = false;
let configuredDatabaseId = '(default)';

export interface FirebaseConfig {
  projectId: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

function loadConfig(): FirebaseConfig | null {
  // 1. Try firebase-applet-config.json in project root
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    }
  } catch (err) {
    console.warn('[Firestore] Could not load firebase-applet-config.json:', err);
  }

  // 2. Fall back to environment variables
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIRESTORE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;

  if (projectId) {
    return {
      projectId,
      apiKey: process.env.FIREBASE_API_KEY,
      firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID,
      appId: process.env.FIREBASE_APP_ID,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    };
  }

  return null;
}

export function getFirestoreDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  const config = loadConfig();
  if (!config) {
    console.warn('[Firestore] No Firebase config available.');
    return null;
  }

  try {
    const apps = getApps();
    firebaseApp = apps.length > 0 ? apps[0] : initializeApp(config);
    configuredDatabaseId = config.firestoreDatabaseId || '(default)';
    firestoreDb = getFirestore(firebaseApp, configuredDatabaseId);
    isConfigured = true;
    console.log(`[Firestore] Initialized Firestore with projectId="${config.projectId}", databaseId="${configuredDatabaseId}"`);
    return firestoreDb;
  } catch (err) {
    console.error('[Firestore] Failed to initialize Firebase Firestore:', err);
    return null;
  }
}

/**
 * Helper to wrap any promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

/**
 * Save or update a Telegram session document in Firestore
 */
export async function saveTelegramSessionToFirestore(session: StoredSession): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'telegram_sessions', session.phone);
    await withTimeout(
      setDoc(
        docRef,
        {
          phone: session.phone,
          sessionString: session.sessionString,
          name: session.name || '',
          username: session.username || '',
          userId: session.userId || '',
          savedAt: session.savedAt || new Date().toISOString(),
        },
        { merge: true }
      ),
      4000,
      'FIRESTORE_WRITE_TIMEOUT'
    );
    console.log(`[Firestore] Saved session for ${session.phone} to persistent database`);
    return true;
  } catch (err: any) {
    console.error(`[Firestore] Error saving session for ${session.phone}:`, err?.message || err);
    return false;
  }
}

/**
 * Fetch all saved Telegram sessions from Firestore
 */
export async function loadTelegramSessionsFromFirestore(): Promise<Record<string, StoredSession> | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'telegram_sessions');
    const snapshot = await withTimeout(getDocs(colRef), 4000, 'FIRESTORE_READ_TIMEOUT');
    const sessions: Record<string, StoredSession> = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.phone && data.sessionString) {
        sessions[data.phone] = {
          phone: data.phone,
          sessionString: data.sessionString,
          name: data.name || 'حساب تيليجرام',
          username: data.username || undefined,
          userId: data.userId || undefined,
          savedAt: data.savedAt || new Date().toISOString(),
        };
      }
    });

    console.log(`[Firestore] Retrieved ${Object.keys(sessions).length} active Telegram session(s) from persistent database`);
    return sessions;
  } catch (err: any) {
    console.warn('[Firestore] Error loading sessions:', err?.message || err);
    return null;
  }
}

/**
 * Delete a Telegram session from Firestore
 */
export async function deleteTelegramSessionFromFirestore(phone: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'telegram_sessions', phone);
    await deleteDoc(docRef);
    console.log(`[Firestore] Deleted session for ${phone} from persistent database`);
    return true;
  } catch (err: any) {
    console.error(`[Firestore] Error deleting session for ${phone}:`, err?.message || err);
    return false;
  }
}

/**
 * Diagnostic status of Firestore connection
 */
export function getFirestoreDiagnosticInfo() {
  const config = loadConfig();
  return {
    isConfigured: Boolean(config && config.projectId),
    projectId: config?.projectId || null,
    databaseId: configuredDatabaseId,
    hasApiKey: Boolean(config?.apiKey),
  };
}
