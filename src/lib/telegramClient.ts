/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

// Default Telegram API credentials from official application configuration
export const TELEGRAM_CONFIG = {
  apiId: Number(
    (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_TELEGRAM_API_ID || (import.meta as any).env?.VITE_API_ID)) ||
    (typeof process !== 'undefined' && (process.env?.TELEGRAM_API_ID || process.env?.API_ID)) ||
    22043994
  ),
  apiHash:
    (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_TELEGRAM_API_HASH || (import.meta as any).env?.VITE_API_HASH)) ||
    (typeof process !== 'undefined' && (process.env?.TELEGRAM_API_HASH || process.env?.API_HASH)) ||
    '56f64582b363d367280db96586b97801',
  sessionStorageKey: 'tg_mtproto_session_string',
};

// Singleton instances
let clientInstance: TelegramClient | null = null;
let sessionInstance: StringSession | null = null;

/**
 * Retrieves the saved session string from localStorage if running in browser
 */
export function getSavedSessionString(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(TELEGRAM_CONFIG.sessionStorageKey) || '';
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Saves session string to localStorage
 */
export function saveSessionString(sessionString: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (sessionString) {
        localStorage.setItem(TELEGRAM_CONFIG.sessionStorageKey, sessionString);
      } else {
        localStorage.removeItem(TELEGRAM_CONFIG.sessionStorageKey);
      }
    } catch (err) {
      console.warn('[telegramClient] Failed to persist session to localStorage:', err);
    }
  }
}

/**
 * Initializes and configures the GramJS MTProto TelegramClient
 *
 * @param customSessionString Optional initial session string (defaults to saved session in localStorage)
 * @param customApiId Optional Telegram API ID override
 * @param customApiHash Optional Telegram API Hash override
 * @returns Configured TelegramClient instance
 */
export function initTelegramClient(
  customSessionString?: string,
  customApiId?: number,
  customApiHash?: string
): TelegramClient {
  const apiId = customApiId ?? TELEGRAM_CONFIG.apiId;
  const apiHash = customApiHash ?? TELEGRAM_CONFIG.apiHash;
  const initialSession = customSessionString !== undefined ? customSessionString : getSavedSessionString();

  sessionInstance = new StringSession(initialSession);

  // Initialize client with resilient browser MTProto settings
  clientInstance = new TelegramClient(sessionInstance, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true, // Uses WebSockets for MTProto in web/browser environments
    autoReconnect: true,
    floodSleepThreshold: 60,
  });

  return clientInstance;
}

/**
 * Gets the current TelegramClient instance, initializing if not already created
 */
export function getTelegramClient(): TelegramClient {
  if (!clientInstance) {
    return initTelegramClient();
  }
  return clientInstance;
}

/**
 * Connects the MTProto client to Telegram's data centers
 */
export async function connectTelegramClient(): Promise<TelegramClient> {
  const client = getTelegramClient();
  if (!client.connected) {
    await client.connect();
    // Persist session upon successful connection
    if (sessionInstance) {
      const sessionString = sessionInstance.save();
      saveSessionString(sessionString);
    }
  }
  return client;
}

/**
 * Disconnects the MTProto client safely
 */
export async function disconnectTelegramClient(): Promise<void> {
  if (clientInstance && clientInstance.connected) {
    await clientInstance.disconnect();
  }
}

/**
 * Checks if the client is currently active and connected
 */
export function isTelegramConnected(): boolean {
  return Boolean(clientInstance && clientInstance.connected);
}

// Re-export core GramJS types and modules for convenient consumer access
export { TelegramClient, Api, StringSession };
export default getTelegramClient;
