/**
 * Telemetry & Latency Diagnostics Engine
 * Lightweight, strictly local client-side telemetry for debugging synchronization issues.
 * 
 * Strict Privacy & Performance Rules:
 * - NEVER records message content, user text, tokens, or sensitive credentials.
 * - 100% local in localStorage (never sent to external servers).
 * - Non-blocking asynchronous writes (zero impact on UI performance).
 * - Only active in development or when manually enabled in production via localStorage.
 */

export type TelemetryEventType =
  | 'network_online'
  | 'network_offline'
  | 'latency_ping'
  | 'sync_start'
  | 'sync_success'
  | 'sync_error'
  | 'connection_state';

export type TelemetryCategory = 'network' | 'latency' | 'sync';

export interface TelemetryEvent {
  id: string;
  timestamp: string; // ISO 8601
  type: TelemetryEventType;
  category: TelemetryCategory;
  reason?: string;
  durationMs?: number;
  serverDurationMs?: number;
  details?: Record<string, any>;
}

export const TELEMETRY_STORAGE_KEY = 'tg_telemetry_logs';
export const TELEMETRY_ENABLED_KEY = 'tg_telemetry_enabled';
export const MAX_TELEMETRY_LOGS = 50;

/**
 * Checks if telemetry logging is enabled.
 * Enabled by default in development mode; in production only if explicitly activated by the developer.
 */
export function isTelemetryEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const manualSetting = localStorage.getItem(TELEMETRY_ENABLED_KEY);
    if (manualSetting !== null) {
      return manualSetting === 'true';
    }
    // Default to true in development, false in production
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

/**
 * Manually enables or disables telemetry collection.
 */
export function setTelemetryEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TELEMETRY_ENABLED_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('tg_telemetry_status_changed', { detail: { enabled } }));
  } catch (err) {
    console.warn('[Telemetry] Failed to persist telemetry setting:', err);
  }
}

/**
 * Sanitizes details object to guarantee NO sensitive data, tokens, messages, or phone numbers are ever stored.
 */
function sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
  if (!details || typeof details !== 'object') return undefined;

  const forbiddenKeys = [
    'message',
    'text',
    'caption',
    'body',
    'phone',
    'phoneNumber',
    'sessionString',
    'session',
    'token',
    'authKey',
    'password',
    'secret',
    'code',
    'hash',
  ];

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.some((f) => lowerKey.includes(f))) {
      continue; // Skip any sensitive field
    }

    if (typeof value === 'string' && value.length > 200) {
      clean[key] = value.slice(0, 200) + '...[truncated]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = '[object]';
    } else {
      clean[key] = value;
    }
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}

/**
 * Retrieves the last 50 telemetry events stored in localStorage.
 */
export function getTelemetryLogs(): TelemetryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_TELEMETRY_LOGS);
    }
  } catch (err) {
    console.warn('[Telemetry] Error reading logs from localStorage:', err);
  }
  return [];
}

/**
 * Asynchronously logs a telemetry event without blocking UI threads.
 */
export function logTelemetry(
  event: Omit<TelemetryEvent, 'id' | 'timestamp'>
): void {
  if (!isTelemetryEnabled()) return;

  // Queue writing asynchronously to prevent any frame drops or UI latency
  const executeLog = () => {
    try {
      const newEntry: TelemetryEvent = {
        id: `tel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: event.type,
        category: event.category,
        reason: event.reason,
        durationMs: typeof event.durationMs === 'number' ? Math.round(event.durationMs * 100) / 100 : undefined,
        serverDurationMs:
          typeof event.serverDurationMs === 'number' ? Math.round(event.serverDurationMs * 100) / 100 : undefined,
        details: sanitizeDetails(event.details),
      };

      const existing = getTelemetryLogs();
      // Prepend newest event, cap at MAX_TELEMETRY_LOGS (50)
      const updated = [newEntry, ...existing].slice(0, MAX_TELEMETRY_LOGS);

      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(updated));

      // If we reach or exceed 50 events, archive to IndexedDB and local JSON backup
      if (updated.length >= MAX_TELEMETRY_LOGS) {
        import('./telemetryIndexedDB').then(({ backupTelemetryToIndexedDB }) => {
          backupTelemetryToIndexedDB([newEntry, ...existing]);
        }).catch(() => {});
      }

      // Dispatch non-blocking event for live telemetry UI updates
      window.dispatchEvent(
        new CustomEvent('tg_telemetry_updated', {
          detail: { newEvent: newEntry, count: updated.length },
        })
      );
    } catch (err) {
      console.warn('[Telemetry] Failed to write telemetry log:', err);
    }
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => executeLog());
  } else {
    setTimeout(executeLog, 0);
  }
}

/**
 * Clears all stored telemetry events.
 */
export function clearTelemetryLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('tg_telemetry_updated', { detail: { count: 0 } }));
  } catch (err) {
    console.warn('[Telemetry] Failed to clear telemetry logs:', err);
  }
}

/**
 * Measures round-trip ping latency against server.ts `/api/telegram/ping`.
 * Calculates performance.now() on client before and after response, and captures server-reported processing time.
 */
export async function measureServerLatency(dcId: number = 4): Promise<{
  success: boolean;
  clientRoundTripMs: number;
  serverDurationMs?: number;
  error?: string;
}> {
  const t0 = performance.now();
  try {
    const res = await fetch('/api/telegram/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dcId }),
    });

    const t1 = performance.now();
    const clientRoundTripMs = Math.round((t1 - t0) * 100) / 100;

    if (!res.ok) {
      const errorText = `HTTP ${res.status}: ${res.statusText}`;
      logTelemetry({
        type: 'latency_ping',
        category: 'latency',
        reason: errorText,
        durationMs: clientRoundTripMs,
      });
      return { success: false, clientRoundTripMs, error: errorText };
    }

    const data = await res.json();
    const serverDurationMs = typeof data.serverLatency === 'number' ? data.serverLatency : data.serverDurationMs;

    logTelemetry({
      type: 'latency_ping',
      category: 'latency',
      reason: `Ping to DC${dcId} successful`,
      durationMs: clientRoundTripMs,
      serverDurationMs: typeof serverDurationMs === 'number' ? serverDurationMs : undefined,
      details: {
        dcId,
        pingMs: data.pingMs,
        serverLatency: data.serverLatency,
        clientRoundTripMs,
      },
    });

    return {
      success: true,
      clientRoundTripMs,
      serverDurationMs,
    };
  } catch (err: any) {
    const t1 = performance.now();
    const clientRoundTripMs = Math.round((t1 - t0) * 100) / 100;
    const errorMsg = err?.message || 'Network request failed';

    logTelemetry({
      type: 'latency_ping',
      category: 'latency',
      reason: `Ping error: ${errorMsg}`,
      durationMs: clientRoundTripMs,
    });

    return { success: false, clientRoundTripMs, error: errorMsg };
  }
}
