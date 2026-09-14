/**
 * server/security/sessions.ts
 *
 * Secure session token management & CSRF token generator/verifier
 * Cryptographically signed with HMAC-SHA256
 */

import crypto from 'crypto';
import { SECURITY_CONFIG } from './config';

export interface AuthSessionPayload {
  userId?: string;
  phone?: string;
  sessionIndex?: number;
  sessionString?: string;
  iat: number;
  exp: number;
}

/**
 * Creates a cryptographically signed session token
 */
export function signSessionToken(payload: Omit<AuthSessionPayload, 'iat' | 'exp'>, expiresInMs = SECURITY_CONFIG.cookieOptions.maxAge): string {
  const iat = Date.now();
  const exp = iat + expiresInMs;
  const fullPayload: AuthSessionPayload = { ...payload, iat, exp };
  
  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECURITY_CONFIG.sessionSecret)
    .update(dataStr)
    .digest('base64url');

  return `${dataStr}.${signature}`;
}

/**
 * Verifies and decodes a signed session token
 */
export function verifySessionToken(token: string): AuthSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SECURITY_CONFIG.sessionSecret)
    .update(dataStr)
    .digest('base64url');

  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload: AuthSessionPayload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates a CSRF token for a given session/client
 */
export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now();
  const message = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', SECURITY_CONFIG.csrfSecret)
    .update(message)
    .digest('hex');
  return `${timestamp}:${signature}`;
}

/**
 * Verifies a CSRF token
 * Valid for 2 hours
 */
export function verifyCsrfToken(token: string, sessionId: string, maxAgeMs = 2 * 60 * 60 * 1000): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs || timestamp > Date.now() + 60000) {
    return false;
  }

  const message = `${sessionId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', SECURITY_CONFIG.csrfSecret)
    .update(message)
    .digest('hex');

  if (signature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
