/**
 * server/security/config.ts
 *
 * Centralized security configurations for Telegram Web:
 * - Origin validation (HTTP & WebSockets)
 * - Secure Cookie policies (httpOnly, sameSite, maxAge)
 * - Rate limiting thresholds
 * - CSRF & Session security keys
 * - WebSocket heartbeat & connection timeouts
 */

import crypto from 'crypto';

export interface SecurityConfig {
  sessionSecret: string;
  csrfSecret: string;
  cookieName: string;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
  };
  allowedOrigins: string[];
  rateLimits: {
    apiWindowMs: number;
    apiMax: number;
    authWindowMs: number;
    authMax: number;
    wsEventMaxPerSec: number;
  };
  ws: {
    heartbeatIntervalMs: number;
    pingTimeoutMs: number;
  };
}

const isProduction = process.env.NODE_ENV === 'production';

// Dynamic Origin Validator: allows local dev, dynamic preview domains, and explicitly set APP_URL
export function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) return true; // Same-origin or server-to-server

  try {
    const url = new URL(origin);
    const host = url.hostname;

    // Allow localhost and local loopbacks
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return true;
    }

    // Allow AI Studio preview and cloud container hosts
    if (
      host.endsWith('.google.internal') ||
      host.endsWith('.aistudio-preview.app') ||
      host.endsWith('.run.app') ||
      host.endsWith('.onrender.com') ||
      host.includes('ai.studio')
    ) {
      return true;
    }

    // Configured APP_URL
    if (process.env.APP_URL) {
      try {
        const appHost = new URL(process.env.APP_URL).hostname;
        if (host === appHost) return true;
      } catch (_) {}
    }

    return false;
  } catch {
    return false;
  }
}

export const SECURITY_CONFIG: SecurityConfig = {
  sessionSecret: process.env.SESSION_SECRET || 'tg_session_anwer_foud_secure_key_2026',
  csrfSecret: process.env.CSRF_SECRET || crypto.createHash('sha256').update(process.env.SESSION_SECRET || 'csrf_tg_anwer_2026').digest('hex'),
  cookieName: 'tg_sec_auth',
  cookieOptions: {
    httpOnly: true, // Prevents XSS cookie theft (resolves vulnerability 5)
    secure: isProduction, // HTTPS in production
    sameSite: 'lax', // Resolves vulnerability 6 (was sameSite: 'none')
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (resolves vulnerability 7: was 365d)
    path: '/',
  },
  allowedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  rateLimits: {
    apiWindowMs: 60 * 1000, // 1 minute
    apiMax: 200, // 200 requests per minute
    authWindowMs: 60 * 1000, // 1 minute
    authMax: 15, // max 15 login/auth attempts per minute
    wsEventMaxPerSec: 35, // max 35 WS messages per second
  },
  ws: {
    heartbeatIntervalMs: 25000, // 25s ping
    pingTimeoutMs: 20000, // 20s timeout
  },
};
