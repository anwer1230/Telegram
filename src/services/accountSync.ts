/**
 * accountSync.ts
 * خدمة المزامنة المباشرة لإعدادات الحساب مع خوادم تيليجرام عبر MTProto (GramJS)
 * تتولى: جلب وتحديث الملف الشخصي، الصورة الشخصية، كلمة المرور الثنائية (2FA)، وإعدادات الخصوصية.
 */

export interface TelegramAccountProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
  avatar?: string;
  about?: string;
  bio?: string;
  isPremium?: boolean;
  isVerified?: boolean;
}

export interface TwoFactorState {
  hasPassword: boolean;
  hint: string;
  hasRecovery: boolean;
  emailPattern: string;
}

export type PrivacyOption = 'everybody' | 'contacts' | 'nobody';

export type PrivacyTarget =
  | 'last_seen'
  | 'lastSeen'
  | 'phone_number'
  | 'phoneNumber'
  | 'profile_photos'
  | 'profilePhotos'
  | 'forwards'
  | 'calls'
  | 'voice_messages'
  | 'voiceMessages'
  | 'bio';

export interface AccountSettingsState {
  account: TelegramAccountProfile;
  twoFactor: TwoFactorState;
  privacy: Record<string, PrivacyOption>;
}

export interface UpdateProfileParams {
  firstName?: string;
  lastName?: string;
  about?: string;
  username?: string;
  photoBase64?: string;
}

export interface UpdateTwoFactorParams {
  currentPassword?: string;
  newPassword: string; // فارغ لإلغاء كلمة المرور
  hint?: string;
  email?: string;
}

export interface UpdatePrivacyParams {
  privacyTarget: PrivacyTarget;
  privacyOption: PrivacyOption;
}

export interface UpdateAccountSettingsPayload {
  sessionString?: string;
  phone?: string;
  accountIndex?: number;
  firstName?: string;
  lastName?: string;
  about?: string;
  username?: string;
  photoBase64?: string;
  currentPassword?: string;
  newPassword?: string;
  hint?: string;
  email?: string;
  privacyTarget?: string;
  privacyOption?: PrivacyOption;
}

export interface UpdateAccountSettingsResponse {
  success: boolean;
  actionsDone?: string[];
  user?: TelegramAccountProfile;
  message?: string;
  error?: string;
}

/**
 * جلب الجلسة النشطة المخزنة في localStorage للمزامنة
 */
export function getActiveTelegramSession(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tg_session_string') || '';
}

/**
 * 1. جلب الحالة الكاملة لإعدادات الحساب من خوادم تيليجرام (GET /api/account/settings/state)
 */
export async function fetchAccountSettingsState(
  sessionString?: string,
  phone?: string,
  accountIndex?: number
): Promise<{ success: boolean; data?: AccountSettingsState; error?: string }> {
  const session = sessionString || getActiveTelegramSession();
  if (!session) {
    return { success: false, error: 'NO_SESSION' };
  }

  try {
    const params = new URLSearchParams();
    params.set('sessionString', session);
    if (phone) params.set('phone', phone);
    if (accountIndex !== undefined) params.set('accountIndex', String(accountIndex));

    const res = await fetch(`/api/account/settings/state?${params.toString()}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || data.message || 'FAILED_TO_FETCH_SETTINGS' };
    }

    return {
      success: true,
      data: {
        account: data.account,
        twoFactor: data.twoFactor,
        privacy: data.privacy || {},
      },
    };
  } catch (err: any) {
    console.error('[accountSync] fetchAccountSettingsState error:', err);
    return { success: false, error: err?.message || 'NETWORK_ERROR' };
  }
}

/**
 * 2. تحديث الملف الشخصي في تيليجرام (الاسم الأول، اسم العائلة، النبذة، المعرف، أو الصورة)
 */
export async function updateTelegramProfile(
  params: UpdateProfileParams,
  sessionString?: string
): Promise<UpdateAccountSettingsResponse> {
  const session = sessionString || getActiveTelegramSession();
  return sendAccountSettingsUpdate({
    sessionString: session,
    firstName: params.firstName,
    lastName: params.lastName,
    about: params.about,
    username: params.username,
    photoBase64: params.photoBase64,
  });
}

/**
 * 3. تحديث أو تعيين أو إلغاء كلمة المرور الثنائية (2FA Password) في تيليجرام
 */
export async function updateTelegramTwoFactorPassword(
  params: UpdateTwoFactorParams,
  sessionString?: string
): Promise<UpdateAccountSettingsResponse> {
  const session = sessionString || getActiveTelegramSession();
  return sendAccountSettingsUpdate({
    sessionString: session,
    currentPassword: params.currentPassword,
    newPassword: params.newPassword,
    hint: params.hint,
    email: params.email,
  });
}

/**
 * 4. تحديث قواعد الخصوصية (Privacy Settings) في تيليجرام
 */
export async function updateTelegramPrivacy(
  params: UpdatePrivacyParams,
  sessionString?: string
): Promise<UpdateAccountSettingsResponse> {
  const session = sessionString || getActiveTelegramSession();
  return sendAccountSettingsUpdate({
    sessionString: session,
    privacyTarget: params.privacyTarget,
    privacyOption: params.privacyOption,
  });
}

/**
 * 5. إرسال طلب التحديث الشامل إلى نقطة النهاية (POST /api/account/settings/update)
 */
export async function sendAccountSettingsUpdate(
  payload: UpdateAccountSettingsPayload
): Promise<UpdateAccountSettingsResponse> {
  try {
    const session = payload.sessionString || getActiveTelegramSession();
    const body = {
      ...payload,
      sessionString: session,
    };

    const res = await fetch('/api/account/settings/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: UpdateAccountSettingsResponse = await res.json().catch(() => ({
      success: false,
      error: 'INVALID_JSON_RESPONSE',
    }));

    return data;
  } catch (err: any) {
    console.error('[accountSync] sendAccountSettingsUpdate error:', err);
    return {
      success: false,
      error: err?.message || 'NETWORK_ERROR',
      message: 'تعذر الاتصال بالخادم لمزامنة الإعدادات',
    };
  }
}
