/**
 * Link Validation & Blacklist Guard Utility
 * Provides internal automatic checks for Telegram links before auto-joining.
 * Inspects blacklist status, link activity, expiration, and formatting.
 */

export interface LinkValidationResult {
  url: string;
  isValid: boolean;
  isActive: boolean;
  isBlacklisted: boolean;
  status: 'active' | 'inactive' | 'blacklisted' | 'unknown';
  reason: string;
  matchedPattern?: string;
  chatTitle?: string;
  memberCount?: number;
  type?: 'public_group' | 'channel' | 'private_channel' | 'private_invite' | 'unknown';
  checkedAt: number;
}

// Built-in blacklist keywords and patterns for instant client-side interception
export const DEFAULT_BLACKLIST_PATTERNS = [
  { pattern: 'drainer', reason: 'سحب وتصيد محافظ وعملات رقمية' },
  { pattern: 'airdrop_claim', reason: 'صفحات وهمية لسحب العملات' },
  { pattern: 'free_crypto', reason: 'احتيال عملات رقمية وهمية' },
  { pattern: 'hack_telegram', reason: 'صفحات اختراق وتصيد تيليجرام' },
  { pattern: 'invest_profit_200', reason: 'مخطط احتيال بونزي مالي' },
  { pattern: 't.me/joinchat/AAAAAF', reason: 'رابط دعوة احتيالي مبلغ عنه' },
  { pattern: 'gift_nitro', reason: 'احتيال روابط الهدايا المجانية المزيفة' },
  { pattern: 'fake_bot', reason: 'بوتات احتيالية مشبوهة' },
  { pattern: 'scam', reason: 'علامات احتيال واضحة' },
  { pattern: 'seed_phrase', reason: 'طلب عبارات الاسترداد السرية' },
];

// In-memory cache for validated links to ensure ultra-fast checks
const validationCache = new Map<string, LinkValidationResult>();

/**
 * Instant synchronous check against known blacklist patterns
 */
export function checkLinkBlacklistSync(url: string, additionalPatterns: string[] = []): {
  isBlacklisted: boolean;
  matchedPattern?: string;
  reason?: string;
} {
  if (!url) return { isBlacklisted: false };
  const clean = url.trim().toLowerCase();

  // Check built-in patterns
  for (const item of DEFAULT_BLACKLIST_PATTERNS) {
    if (clean.includes(item.pattern.toLowerCase())) {
      return {
        isBlacklisted: true,
        matchedPattern: item.pattern,
        reason: item.reason,
      };
    }
  }

  // Check additional user-defined patterns
  for (const pat of additionalPatterns) {
    const p = pat.trim().toLowerCase();
    if (p && clean.includes(p)) {
      return {
        isBlacklisted: true,
        matchedPattern: pat,
        reason: 'مدرج بالقائمة السوداء المخصصة',
      };
    }
  }

  return { isBlacklisted: false };
}

/**
 * Fast synchronous format & basic activity heuristic
 */
export function validateLinkFastSync(url: string, additionalBlacklist: string[] = []): LinkValidationResult {
  const clean = (url || '').trim();
  const cached = validationCache.get(clean);
  if (cached) return cached;

  // 1. Blacklist check
  const bl = checkLinkBlacklistSync(clean, additionalBlacklist);
  if (bl.isBlacklisted) {
    const res: LinkValidationResult = {
      url: clean,
      isValid: false,
      isActive: false,
      isBlacklisted: true,
      status: 'blacklisted',
      reason: `محظور بالقائمة السوداء: ${bl.reason || bl.matchedPattern}`,
      matchedPattern: bl.matchedPattern,
      checkedAt: Date.now(),
    };
    validationCache.set(clean, res);
    return res;
  }

  // 2. Format & entity validation
  const isInvite = clean.includes('+') || clean.includes('joinchat/') || clean.includes('tg://join?invite=');

  if (isInvite) {
    let hash = '';
    if (clean.includes('+')) hash = clean.split('+')[1]?.split('/')[0]?.split('?')[0] || '';
    else if (clean.includes('joinchat/')) hash = clean.split('joinchat/')[1]?.split('/')[0]?.split('?')[0] || '';
    else if (clean.includes('invite=')) hash = clean.split('invite=')[1]?.split('&')[0] || '';

    if (!hash || hash.length < 5) {
      const res: LinkValidationResult = {
        url: clean,
        isValid: false,
        isActive: false,
        isBlacklisted: false,
        status: 'inactive',
        reason: 'رمز الدعوة (+) تالف أو قصير جداً',
        checkedAt: Date.now(),
      };
      validationCache.set(clean, res);
      return res;
    }

    const res: LinkValidationResult = {
      url: clean,
      isValid: true,
      isActive: true,
      isBlacklisted: false,
      status: 'active',
      type: 'private_invite',
      reason: 'رابط دعوة خاصة صالح ومكتمل النسق',
      checkedAt: Date.now(),
    };
    validationCache.set(clean, res);
    return res;
  }

  // Public username
  const rawUsername = clean
    .replace(/^https?:\/\/(?:t\.me|telegram\.me)\//i, '')
    .replace('@', '')
    .split('/')[0]
    .split('?')[0]
    .trim();

  if (!rawUsername || rawUsername.length < 3) {
    const res: LinkValidationResult = {
      url: clean,
      isValid: false,
      isActive: false,
      isBlacklisted: false,
      status: 'inactive',
      reason: 'اسم المستخدم قصير جداً أو مفقود',
      checkedAt: Date.now(),
    };
    validationCache.set(clean, res);
    return res;
  }

  const reserved = ['joinchat', 'share', 'contact', 'addstickers', 'proxy', 'socks', 'login', 'c'];
  if (reserved.includes(rawUsername.toLowerCase())) {
    const res: LinkValidationResult = {
      url: clean,
      isValid: false,
      isActive: false,
      isBlacklisted: false,
      status: 'inactive',
      reason: `مسار خاص غير مخصص لمجموعة (${rawUsername})`,
      checkedAt: Date.now(),
    };
    validationCache.set(clean, res);
    return res;
  }

  const res: LinkValidationResult = {
    url: clean,
    isValid: true,
    isActive: true,
    isBlacklisted: false,
    status: 'active',
    type: 'public_group',
    reason: 'معرف عام صالح وجاهز للاستعلام',
    checkedAt: Date.now(),
  };
  validationCache.set(clean, res);
  return res;
}

/**
 * Full asynchronous verification communicating with the server's MTProto Telegram engine
 */
export async function validateLinkAsync(url: string): Promise<LinkValidationResult> {
  const clean = (url || '').trim();
  if (!clean) {
    return {
      url: '',
      isValid: false,
      isActive: false,
      isBlacklisted: false,
      status: 'inactive',
      reason: 'الرابط فارغ',
      checkedAt: Date.now(),
    };
  }

  // Quick check cache
  const cached = validationCache.get(clean);
  if (cached && Date.now() - cached.checkedAt < 60000) {
    return cached;
  }

  // Immediate synchronous fallback if network fails
  const fallback = validateLinkFastSync(clean);
  if (fallback.isBlacklisted) {
    return fallback;
  }

  try {
    const response = await fetch('/api/telegram/radar/validate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: clean }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    if (data && data.success) {
      const result: LinkValidationResult = {
        url: clean,
        isValid: Boolean(data.isValid),
        isActive: Boolean(data.isActive),
        isBlacklisted: Boolean(data.isBlacklisted),
        status: data.status || (data.isActive ? 'active' : 'inactive'),
        reason: data.reason || (data.isActive ? 'رابط نشط وصالح' : 'رابط غير نشط'),
        matchedPattern: data.matchedPattern,
        chatTitle: data.chatTitle,
        memberCount: data.memberCount,
        type: data.type,
        checkedAt: Date.now(),
      };
      validationCache.set(clean, result);
      return result;
    }

    return fallback;
  } catch (err) {
    console.warn('[LinkValidator] Error during server link validation:', err);
    return fallback;
  }
}
