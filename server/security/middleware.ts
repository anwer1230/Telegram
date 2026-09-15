/**
 * server/security/middleware.ts
 *
 * Security middlewares for Express:
 * - Origin validation
 * - Helmet Security Headers with adapted Content-Security-Policy
 * - CORS with dynamic origin matching
 * - CSRF verification
 * - Rate limiters
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { SECURITY_CONFIG, isAllowedOrigin } from './config';
import { verifySessionToken, verifyCsrfToken, generateCsrfToken, AuthSessionPayload } from './sessions';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userSession?: AuthSessionPayload | null;
      csrfToken?: string;
    }
  }
}

export const securityCookieParser = cookieParser(SECURITY_CONFIG.sessionSecret);

/**
 * Helmet Security Headers configured safely for Telegram Web & PWA
 */
export const securityHelmet = helmet({
  contentSecurityPolicy: false, // Vite and dynamic web workers / blob / wasm need relaxed CSP in dev/container
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
});

/**
 * Dynamic CORS & Origin Validation Middleware
 * Resolves vulnerability 9 (no HTTP Origin check)
 */
export function dynamicCorsAndOriginCheck(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      console.warn(`[Security] Blocked untrusted HTTP origin: ${origin}`);
      return res.status(403).json({
        error: 'FORBIDDEN_ORIGIN',
        message: 'Origin is not permitted by security policy',
      });
    }
  } else {
    // Same-origin or curl/server-side fetch
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, x-csrf-token, Cache-Control'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

/**
 * Rate Limiter for general /api/ routes
 * Resolves vulnerability 3
 */
export const apiRateLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimits.apiWindowMs,
  max: SECURITY_CONFIG.rateLimits.apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: false,
  },
  keyGenerator: (req) => {
    const xForwarded = req.headers['x-forwarded-for'];
    if (xForwarded) {
      const ip = Array.isArray(xForwarded) ? xForwarded[0] : xForwarded.split(',')[0].trim();
      if (ip) return ip;
    }
    const forwarded = req.headers['forwarded'];
    if (forwarded && typeof forwarded === 'string') {
      const match = forwarded.match(/for="?([^";,]+)/i);
      if (match && match[1]) return match[1].trim();
    }
    return req.ip || '127.0.0.1';
  },
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this client, please try again later.',
  },
  skip: (req) => {
    // Skip static assets or fast local health checks
    return req.path === '/api/health' || req.path.startsWith('/api/cache/');
  },
});

/**
 * Stricter Rate Limiter for sensitive Auth endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimits.authWindowMs,
  max: SECURITY_CONFIG.rateLimits.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: false,
  },
  keyGenerator: (req) => {
    const xForwarded = req.headers['x-forwarded-for'];
    if (xForwarded) {
      const ip = Array.isArray(xForwarded) ? xForwarded[0] : xForwarded.split(',')[0].trim();
      if (ip) return ip;
    }
    const forwarded = req.headers['forwarded'];
    if (forwarded && typeof forwarded === 'string') {
      const match = forwarded.match(/for="?([^";,]+)/i);
      if (match && match[1]) return match[1].trim();
    }
    return req.ip || '127.0.0.1';
  },
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please wait a minute and try again.',
  },
});

/**
 * Session verification middleware
 * Extracts signed token from cookies or Authorization header
 */
export function authenticateSession(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[SECURITY_CONFIG.cookieName];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (token) {
    const verified = verifySessionToken(token);
    if (verified) {
      req.userSession = verified;
    }
  }

  next();
}

/**
 * CSRF Protection Middleware
 * Resolves vulnerability 8 (no CSRF protection)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt public webhooks, explicit Telegram auth endpoints, FCM, and API calls
  const exemptPrefixes = [
    '/api/auth/',
    '/api/telegram/auth/',
    '/api/send-code',
    '/api/sign-in',
    '/api/qr/',
    '/api/health',
    '/api/fcm/',
    '/api/telegram/firebase/',
    '/api/web-push/',
    '/api/telegram/',
  ];

  if (exemptPrefixes.some((p) => req.path.startsWith(p))) {
    return next();
  }

  // If request has Authorization Bearer header, X-Requested-With, or is a pure application/json API call
  if (
    req.headers.authorization?.startsWith('Bearer ') ||
    req.headers['x-requested-with'] ||
    req.headers['x-telegram-client'] ||
    req.headers['content-type']?.includes('application/json')
  ) {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  const sessionId = req.userSession?.userId || req.cookies?.[SECURITY_CONFIG.cookieName] || req.ip || 'anon_session';

  if (!csrfHeader || typeof csrfHeader !== 'string' || !verifyCsrfToken(csrfHeader, sessionId)) {
    // If running in development preview, log warning and allow graceful fallback
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Security:CSRF] Warning: Missing or invalid CSRF token on ${req.method} ${req.path}`);
      return next();
    }
    return res.status(403).json({
      error: 'INVALID_CSRF_TOKEN',
      message: 'CSRF token validation failed. Please refresh and try again.',
    });
  }

  next();
}
