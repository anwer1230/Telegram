/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationCenter } from '../core/NotificationCenter';

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'PERF';
  type: 'latency_probe' | 'sync_start' | 'sync_success' | 'sync_failure' | 'network_change' | 'queue_sync';
  endpoint?: string;
  latencyMs?: number;
  rating?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  status?: number | string;
  message: string;
  error?: string;
  details?: Record<string, any>;
  networkInfo?: {
    online: boolean;
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
  };
}

const STORAGE_KEY = 'tg_developer_telemetry_logs_v1';
const SALAM_STORAGE_KEY = 'tg_salam_activity_logs_v2';
const MAX_LOCAL_LOGS = 150;

// In-memory ring buffer
let inMemoryLogs: TelemetryLogEntry[] = [];

// Initialize in-memory logs from localStorage
try {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      inMemoryLogs = JSON.parse(raw);
    }
  }
} catch {
  inMemoryLogs = [];
}

/**
 * Calculates human-readable latency quality rating
 */
export function calculateLatencyRating(latencyMs?: number, isError?: boolean): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
  if (isError || latencyMs == null) return 'CRITICAL';
  if (latencyMs < 150) return 'EXCELLENT';
  if (latencyMs < 350) return 'GOOD';
  if (latencyMs < 800) return 'FAIR';
  if (latencyMs < 2000) return 'POOR';
  return 'CRITICAL';
}

/**
 * Records a telemetry event:
 * 1. Appends to memory buffer and local storage.
 * 2. Writes to the local developer log file on disk via /api/developer/telemetry/log.
 * 3. Injects into SalamActivityLog (via NotificationCenter & localStorage).
 */
export function recordTelemetry(
  entry: Omit<TelemetryLogEntry, 'id' | 'timestamp' | 'networkInfo'>
): TelemetryLogEntry {
  const isErr = entry.level === 'ERROR' || entry.type === 'sync_failure';
  const rating = entry.rating || calculateLatencyRating(entry.latencyMs, isErr);

  // Network info extraction if available
  let networkInfo: TelemetryLogEntry['networkInfo'];
  if (typeof navigator !== 'undefined') {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    networkInfo = {
      online: navigator.onLine,
      effectiveType: conn?.effectiveType,
      rtt: conn?.rtt,
      downlink: conn?.downlink,
    };
  }

  const fullEntry: TelemetryLogEntry = {
    ...entry,
    id: `telem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    rating,
    networkInfo,
  };

  // 1. In-memory & localStorage buffer
  inMemoryLogs = [fullEntry, ...inMemoryLogs.slice(0, MAX_LOCAL_LOGS - 1)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryLogs));
    } catch {}

    // Dispatch DOM custom event for telemetry inspectors
    try {
      window.dispatchEvent(new CustomEvent('tg-telemetry-entry', { detail: fullEntry }));
    } catch {}
  }

  if (typeof fetch !== 'undefined') {
    fetch('/api/developer/telemetry/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullEntry),
    }).catch(() => {});
  }

  return fullEntry;
}



/**
 * Measures instantaneous network latency against a health check probe
 */
export async function measureNetworkLatency(endpoint = '/api/health'): Promise<number> {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${endpoint}?_telem=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const duration = Math.round(performance.now() - startTime);

    if (res.ok) {
      recordTelemetry({
        level: duration > 1500 ? 'WARN' : 'PERF',
        type: 'latency_probe',
        endpoint,
        latencyMs: duration,
        status: res.status,
        message: `Network ping probe completed in ${duration}ms`,
      });
    } else {
      recordTelemetry({
        level: 'WARN',
        type: 'latency_probe',
        endpoint,
        latencyMs: duration,
        status: res.status,
        message: `Network probe returned HTTP ${res.status}`,
        error: `HTTP ${res.status} ${res.statusText}`,
      });
    }

    return duration;
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    const isTimeout = err?.name === 'AbortError';
    const errMsg = isTimeout ? 'Probe timed out after 15000ms' : err?.message || 'Network unreachable';

    recordTelemetry({
      level: 'WARN',
      type: 'latency_probe',
      endpoint,
      latencyMs: duration,
      status: isTimeout ? 'TIMEOUT' : 'DISCONNECTED',
      message: `Network latency probe notice: ${errMsg}`,
      error: errMsg,
    });

    return -1;
  }
}

/**
 * Returns all recorded telemetry logs
 */
export function getTelemetryLogs(): TelemetryLogEntry[] {
  return inMemoryLogs;
}

/**
 * Clears telemetry logs from memory and localStorage
 */
export function clearTelemetryLogs(): void {
  inMemoryLogs = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

/**
 * Downloads a developer log file (.log) directly to the user's filesystem
 */
export function downloadTelemetryLogFile(): void {
  if (typeof window === 'undefined') return;

  const header = `=================================================================\n` +
    `TELEGRAM SYNC & NETWORK LATENCY TELEMETRY LOG\n` +
    `Exported At: ${new Date().toISOString()}\n` +
    `Total Records: ${inMemoryLogs.length}\n` +
    `=================================================================\n\n`;

  const lines = inMemoryLogs.map((entry) => {
    return `[${entry.timestamp}] [${entry.level}] [${entry.type}] ` +
      `Latency: ${entry.latencyMs != null ? `${entry.latencyMs}ms (${entry.rating})` : 'N/A'} | ` +
      `Endpoint: ${entry.endpoint || 'N/A'} | Status: ${entry.status || 'N/A'} | ` +
      `Msg: ${entry.message} ${entry.error ? `| Error: ${entry.error}` : ''} | ` +
      `Network: ${JSON.stringify(entry.networkInfo || {})}`;
  });

  const blob = new Blob([header + lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `telemetry_debug_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
