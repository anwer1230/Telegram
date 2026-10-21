import fs from 'fs';
import path from 'path';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
  authDomain?: string;
  storageBucket?: string;
}

export const PERMANENT_FIREBASE_CONFIG: FirebaseAppletConfig = {
  projectId: 'gen-lang-client-0731655503',
  apiKey: 'AIzaSyDSO42SHD8dD2EMUUeBkUfIWdZ4ZA5--4s',
  firestoreDatabaseId: 'ai-studio-telegramcustomcl-102d010a-1b3d-4a8c-b84a-d6fc694c1dd9',
  authDomain: 'gen-lang-client-0731655503.firebaseapp.com',
  storageBucket: 'gen-lang-client-0731655503.firebasestorage.app',
};

let cachedConfig: FirebaseAppletConfig | null = null;

function loadConfig(): FirebaseAppletConfig {
  if (cachedConfig) return cachedConfig;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.projectId && parsed.apiKey) {
        cachedConfig = {
          projectId: parsed.projectId,
          apiKey: parsed.apiKey,
          firestoreDatabaseId: parsed.firestoreDatabaseId || PERMANENT_FIREBASE_CONFIG.firestoreDatabaseId,
          authDomain: parsed.authDomain || PERMANENT_FIREBASE_CONFIG.authDomain,
          storageBucket: parsed.storageBucket || PERMANENT_FIREBASE_CONFIG.storageBucket,
        };
        return cachedConfig;
      }
    }
  } catch (err: any) {
    console.warn('[FirestoreRestClient] Notice reading firebase-applet-config.json, using permanent config:', err?.message || err);
  }
  cachedConfig = { ...PERMANENT_FIREBASE_CONFIG };
  return cachedConfig;
}

function getBaseUrl(collection: string, docId?: string): string | null {
  const config = loadConfig();
  if (!config || !config.projectId || !config.apiKey) return null;

  const databaseId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? config.firestoreDatabaseId
    : '(default)';

  const base = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${databaseId}/documents/${collection}`;
  if (docId) {
    return `${base}/${encodeURIComponent(docId)}?key=${encodeURIComponent(config.apiKey)}`;
  }
  return `${base}?key=${encodeURIComponent(config.apiKey)}`;
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: v.map((item) => {
            if (typeof item === 'object' && item !== null) {
              return { mapValue: { fields: toFirestoreFields(item) } };
            }
            if (typeof item === 'number') {
              return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            }
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: String(item) };
          }),
        },
      };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    } else {
      fields[k] = { stringValue: String(v) };
    }
  }
  return fields;
}

export function fromFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  const obj: Record<string, any> = {};
  if (!fields) return obj;

  for (const [k, v] of Object.entries(fields)) {
    if (!v) continue;
    if ('stringValue' in v) obj[k] = v.stringValue;
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else if ('integerValue' in v) obj[k] = parseInt(v.integerValue, 10);
    else if ('doubleValue' in v) obj[k] = v.doubleValue;
    else if ('nullValue' in v) obj[k] = null;
    else if ('arrayValue' in v) {
      obj[k] = (v.arrayValue?.values || []).map((item: any) => {
        if (!item) return null;
        if ('stringValue' in item) return item.stringValue;
        if ('booleanValue' in item) return item.booleanValue;
        if ('integerValue' in item) return parseInt(item.integerValue, 10);
        if ('doubleValue' in item) return item.doubleValue;
        if ('mapValue' in item) return fromFirestoreFields(item.mapValue?.fields);
        return null;
      });
    } else if ('mapValue' in v) {
      obj[k] = fromFirestoreFields(v.mapValue?.fields);
    }
  }
  return obj;
}

export async function getFirestoreDoc<T = Record<string, any>>(
  collection: string,
  docId: string
): Promise<T | null> {
  const url = getBaseUrl(collection, docId);
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[FirestoreRestClient] GET ${collection}/${docId} returned ${res.status}:`, err);
      return null;
    }

    const json = await res.json();
    return fromFirestoreFields(json.fields) as T;
  } catch (err: any) {
    console.warn(`[FirestoreRestClient] GET ${collection}/${docId} network error:`, err?.message || err);
    return null;
  }
}

export async function setFirestoreDoc(
  collection: string,
  docId: string,
  data: Record<string, any>
): Promise<boolean> {
  const url = getBaseUrl(collection, docId);
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: toFirestoreFields(data),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[FirestoreRestClient] SET ${collection}/${docId} returned ${res.status}:`, err);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn(`[FirestoreRestClient] SET ${collection}/${docId} network error:`, err?.message || err);
    return false;
  }
}

export async function deleteFirestoreDoc(
  collection: string,
  docId: string
): Promise<boolean> {
  const url = getBaseUrl(collection, docId);
  if (!url) return false;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok || res.status === 404;
  } catch (err: any) {
    console.warn(`[FirestoreRestClient] DELETE ${collection}/${docId} network error:`, err?.message || err);
    return false;
  }
}

export async function listFirestoreDocs<T = Record<string, any>>(
  collection: string
): Promise<Array<{ id: string; data: T }>> {
  const url = getBaseUrl(collection);
  if (!url) return [];

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const documents = json.documents || [];
    return documents.map((doc: any) => {
      const parts = (doc.name || '').split('/');
      const id = parts[parts.length - 1];
      return {
        id,
        data: fromFirestoreFields(doc.fields) as T,
      };
    });
  } catch (err: any) {
    console.warn(`[FirestoreRestClient] LIST ${collection} network error:`, err?.message || err);
    return [];
  }
}

export function isFirestoreConfigured(): boolean {
  const cfg = loadConfig();
  return !!(cfg && cfg.projectId && cfg.apiKey);
}
