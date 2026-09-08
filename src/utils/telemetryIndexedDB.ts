import { TelemetryEvent, MAX_TELEMETRY_LOGS } from './telemetry';

const DB_NAME = 'tg_telemetry_indexeddb';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry_archive';
const BACKUP_JSON_KEY = 'tg_telemetry_json_backup';

/**
 * Open or create the IndexedDB instance for archiving telemetry logs
 */
function openTelemetryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Persist telemetry events into IndexedDB and fallback to local JSON storage
 */
export async function backupTelemetryToIndexedDB(events: TelemetryEvent[]): Promise<{ count: number; storage: 'indexedDB' | 'json' }> {
  if (!events || events.length === 0) return { count: 0, storage: 'indexedDB' };

  // Always keep a backup JSON snapshot in localStorage for recovery
  try {
    const jsonBackup = JSON.stringify({
      backedUpAt: new Date().toISOString(),
      count: events.length,
      events,
    });
    localStorage.setItem(BACKUP_JSON_KEY, jsonBackup);
  } catch (err) {
    console.warn('[TelemetryDB] Local JSON backup snapshot failed:', err);
  }

  try {
    const db = await openTelemetryDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      events.forEach((item) => {
        store.put(item);
      });

      tx.oncomplete = () => {
        db.close();
        resolve({ count: events.length, storage: 'indexedDB' });
      };

      tx.onerror = () => {
        db.close();
        resolve({ count: events.length, storage: 'json' });
      };
    });
  } catch (err) {
    console.warn('[TelemetryDB] IndexedDB error, falling back to JSON:', err);
    return { count: events.length, storage: 'json' };
  }
}

/**
 * Retrieve all archived events from IndexedDB (or fallback to JSON backup)
 */
export async function getArchivedTelemetryLogs(): Promise<TelemetryEvent[]> {
  try {
    const db = await openTelemetryDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        const results = request.result as TelemetryEvent[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          // Check json backup
          resolve(getJsonBackupLogs());
        }
      };

      request.onerror = () => {
        db.close();
        resolve(getJsonBackupLogs());
      };
    });
  } catch {
    return getJsonBackupLogs();
  }
}

/**
 * Retrieve logs from local JSON backup
 */
export function getJsonBackupLogs(): TelemetryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUP_JSON_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

/**
 * Clear archived logs from IndexedDB & JSON backup
 */
export async function clearArchivedTelemetryLogs(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BACKUP_JSON_KEY);
  } catch {}

  try {
    const db = await openTelemetryDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => db.close();
  } catch {}
}
