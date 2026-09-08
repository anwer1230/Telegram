/**
 * LoginController.ts - org.telegram.messenger.LoginController / LoginActivity logic
 * Replicated directly from LoginActivity.java & Telegram MTProto auth API
 * Manages full lifecycle of auth.sendCode, auth.signIn, auth.signUp, auth.checkPassword, and error translations.
 */

import { TLRPC } from '../TLRPC';
import { ConnectionsManager } from '../ConnectionsManager';
import { UserConfig } from './UserConfig';
import { AuthTokensHelper } from './AuthTokensHelper';
import { NotificationCenter } from '../NotificationCenter';
import { MessagesController } from '../MessagesController';
import { MessagesStorage } from '../MessagesStorage';

export interface SendCodeResult {
  success: boolean;
  phone: string;
  phoneCodeHash: string;
  timeout: number;
  deliveryType: 'app' | 'sms';
  isRealTelegramMTProto: boolean;
  country?: string;
  countryCallingCode?: string;
  nationalNumber?: string;
  formattedPhone?: string;
  error?: string;
  message?: string;
}

export interface SignInResult {
  success: boolean;
  requiresPassword?: boolean;
  signUpRequired?: boolean;
  user?: any;
  sessionString?: string;
  error?: string;
  message?: string;
}

export class LoginController {
  private static instance: LoginController;
  private currentAccount: number = 0;

  public static getInstance(account: number = 0): LoginController {
    if (!LoginController.instance) {
      LoginController.instance = new LoginController(account);
    }
    return LoginController.instance;
  }

  private constructor(account: number) {
    this.currentAccount = account;
  }

  /**
   * TL_auth_sendCode
   * Sends code request to Telegram cloud MTProto servers
   */
  public async sendCode(
    phoneNumber: string,
    deliveryType: 'app' | 'sms' = 'app',
    apiId: number = 22043994,
    apiHash: string = '56f64582b363d367280db96586b97801'
  ): Promise<SendCodeResult> {
    try {
      const resp = await fetch('/api/telegram/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          deliveryType,
          apiId,
          apiHash,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        return {
          success: true,
          phone: data.phone || phoneNumber,
          phoneCodeHash: data.phoneCodeHash || '',
          timeout: data.timeout || 60,
          deliveryType: data.deliveryType || deliveryType,
          isRealTelegramMTProto: Boolean(data.isRealTelegramMTProto),
          country: data.country,
          countryCallingCode: data.countryCallingCode,
          nationalNumber: data.nationalNumber,
          formattedPhone: data.formattedPhone,
          message: data.message,
        };
      }
      return {
        success: false,
        phone: phoneNumber,
        phoneCodeHash: '',
        timeout: 0,
        deliveryType,
        isRealTelegramMTProto: false,
        error: data.error || 'SEND_CODE_FAILED',
        message: this.translateAuthError(data.error || data.message),
      };
    } catch (e: any) {
      return {
        success: false,
        phone: phoneNumber,
        phoneCodeHash: '',
        timeout: 0,
        deliveryType,
        isRealTelegramMTProto: false,
        error: 'NETWORK_ERROR',
        message: this.translateAuthError('NETWORK_ERROR'),
      };
    }
  }

  /**
   * TL_auth_signIn
   * Verifies SMS / Telegram app code
   */
  public async signIn(
    phoneNumber: string,
    phoneCodeHash: string,
    code: string,
    password?: string
  ): Promise<SignInResult> {
    try {
      const resp = await fetch('/api/telegram/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          phoneCodeHash,
          code,
          password: password || undefined,
        }),
      });
      const data = await resp.json();

      if (data.success && data.user) {
        this.onAuthSuccess(data.user, data.sessionString, data.future_auth_token, data.expires);
        return {
          success: true,
          user: data.user,
          sessionString: data.sessionString,
          message: data.message,
        };
      }

      if (data.requiresPassword) {
        return {
          success: false,
          requiresPassword: true,
          message: data.message || this.translateAuthError('SESSION_PASSWORD_NEEDED'),
        };
      }

      if (data.signUpRequired || data.error === 'PHONE_NUMBER_UNOCCUPIED') {
        return {
          success: false,
          signUpRequired: true,
          message: this.translateAuthError('PHONE_NUMBER_UNOCCUPIED'),
        };
      }

      return {
        success: false,
        error: data.error || 'INVALID_CODE',
        message: this.translateAuthError(data.error || data.message),
      };
    } catch (e: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: this.translateAuthError('NETWORK_ERROR'),
      };
    }
  }

  /**
   * TL_auth_signUp
   * Registers a brand-new user with first & last name
   */
  public async signUp(
    phoneNumber: string,
    phoneCodeHash: string,
    firstName: string,
    lastName: string = ''
  ): Promise<SignInResult> {
    try {
      const resp = await fetch('/api/telegram/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          phoneCodeHash,
          firstName,
          lastName,
        }),
      });
      const data = await resp.json();

      if (data.success && data.user) {
        this.onAuthSuccess(data.user, data.sessionString, data.future_auth_token, data.expires);
        return {
          success: true,
          user: data.user,
          sessionString: data.sessionString,
          message: data.message,
        };
      }

      return {
        success: false,
        error: data.error || 'SIGNUP_FAILED',
        message: this.translateAuthError(data.error || data.message),
      };
    } catch {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: this.translateAuthError('NETWORK_ERROR'),
      };
    }
  }

  /**
   * onAuthSuccess
   * Handles user persistence, storage init, token saving, and UI notifications
   */
  public onAuthSuccess(
    user: any,
    sessionString?: string,
    futureAuthToken?: string,
    expires?: number
  ): void {
    const rawPhone = user.phone || '';
    const userId = String(user.id || '');

    // Check if account already exists in one of the slots (0..MAX_ACCOUNT_COUNT-1)
    let targetAccount = this.currentAccount;
    const existingByPhone = rawPhone ? UserConfig.findAccountByPhone(rawPhone) : -1;
    const existingById = userId ? UserConfig.findAccountByUserId(userId) : -1;
    const foundExisting = existingByPhone !== -1 ? existingByPhone : (existingById !== -1 ? existingById : -1);

    if (foundExisting !== -1) {
      console.log(`[LoginController] Found existing account at index ${foundExisting} for phone ${rawPhone} / ID ${userId}. Reusing existing slot.`);
      targetAccount = foundExisting;
      UserConfig.selectedAccount = targetAccount;
    }

    const account = targetAccount;
    const userConfig = UserConfig.getInstance(account);

    const formattedUser = {
      id: String(user.id || Date.now()),
      name: [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') || user.name || 'مستخدم تيليجرام',
      phone: user.phone || '',
      username: user.username || undefined,
      avatar: user.avatar || '',
      bio: user.bio || 'Telegram Official Client (Native MTProto 2.0 Layer 184)',
      isOnline: true,
      isPremium: Boolean(user.isPremium || user.premium),
    };

    // 1. Save currentUser in UserConfig
    userConfig.setCurrentUser(formattedUser as any);
    userConfig.clientUserId = String(user.id);
    userConfig.isClientActivated = true;
    userConfig.saveConfig();

    // 2. Save future auth token if provided
    if (futureAuthToken) {
      AuthTokensHelper.getInstance().saveFutureAuthToken(account, futureAuthToken, expires || Date.now() / 1000 + 86400 * 30);
    }

    if (sessionString && typeof window !== 'undefined') {
      try {
        localStorage.setItem('tg_session_string', sessionString);
        localStorage.setItem(`tg_session_string_${account}`, sessionString);
        localStorage.setItem('tg_auth_session_active', 'true');
      } catch {}
    }

    // 3. Trigger partial cache invalidation and fresh getDifference sync for established session
    MessagesController.getInstance(account).onUserSessionEstablished(true);

    // 4. Post notifications to notify UI
    NotificationCenter.getInstance(account).postNotificationName(
      NotificationCenter.userFullInfoDidLoad,
      formattedUser.id
    );
    NotificationCenter.getInstance(account).postNotificationName(
      NotificationCenter.updateInterfaces,
      0
    );
    NotificationCenter.getInstance(account).postNotificationName(
      NotificationCenter.dialogsNeedReload
    );
  }

  /**
   * TL_auth_resendCode
   * Re-sends login code via SMS or alternative channel
   */
  public async resendCodeViaSms(
    phoneNumber: string,
    phoneCodeHash: string
  ): Promise<SendCodeResult> {
    try {
      const resp = await fetch('/api/telegram/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          deliveryType: 'sms',
          phoneCodeHash,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        return {
          success: true,
          phone: phoneNumber,
          phoneCodeHash: data.phoneCodeHash || phoneCodeHash,
          timeout: data.timeout || 60,
          deliveryType: 'sms',
          isRealTelegramMTProto: true,
          message: data.message,
        };
      } else {
        return {
          success: false,
          phone: phoneNumber,
          phoneCodeHash,
          timeout: 60,
          deliveryType: 'sms',
          isRealTelegramMTProto: true,
          error: data.error,
          message: this.translateAuthError(data.error),
        };
      }
    } catch (e: any) {
      return {
        success: false,
        phone: phoneNumber,
        phoneCodeHash,
        timeout: 60,
        deliveryType: 'sms',
        isRealTelegramMTProto: false,
        error: e.message,
        message: this.translateAuthError('TELEGRAM_CONNECTION_ERROR'),
      };
    }
  }

  /**
   * TL_account_sendVerifyEmailCode
   * Sends email verification code for 2FA setup or login recovery
   */
  public async sendVerifyEmailCode(
    email: string,
    purpose: any = { _: 'emailVerifyPurposeLogin' }
  ): Promise<{ success: boolean; emailPattern?: string; error?: string; message?: string }> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req: TLRPC.TL_account_sendVerifyEmailCode = {
        _: 'account.sendVerifyEmailCode',
        email,
        purpose,
      };

      const res = await conn.sendRequest<any>(req);
      return {
        success: true,
        emailPattern: res?.email_pattern || email,
        message: 'Email verification code dispatched successfully.',
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        message: this.translateAuthError(e.message),
      };
    }
  }

  /**
   * TL_account_resendPasswordEmail
   * Resends the recovery email for Two-Step Verification
   */
  public async resendPasswordEmail(): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const conn = ConnectionsManager.getInstance(this.currentAccount);
      const req = { _: 'account.resendPasswordEmail' };
      await conn.sendRequest<any>(req);
      return {
        success: true,
        message: 'Two-step verification recovery email sent successfully.',
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        message: this.translateAuthError(e.message),
      };
    }
  }

  /**
   * Translates official Telegram MTProto error strings into user-friendly descriptions
   */
  public translateAuthError(errorStr?: string, isArabic: boolean = true): string {
    if (!errorStr) return isArabic ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred';

    if (errorStr.includes('PHONE_NUMBER_INVALID')) {
      return isArabic
        ? 'رقم الهاتف غير صالح. يرجى التأكد من كتابة الرقم ورمز الدولة بشكل صحيح.'
        : 'The phone number is invalid. Please check the country code and number.';
    }
    if (errorStr.includes('PHONE_CODE_INVALID')) {
      return isArabic
        ? 'رمز التحقق غير صحيح. يرجى التأكد من الرمز وإعادة المحاولة.'
        : 'Invalid verification code. Please try again.';
    }
    if (errorStr.includes('PHONE_CODE_EXPIRED')) {
      return isArabic
        ? 'انتهت صلاحية رمز التحقق. يرجى طلب إرسال رمز جديد.'
        : 'The verification code has expired. Please request a new one.';
    }
    if (errorStr.includes('PASSWORD_HASH_INVALID')) {
      return isArabic
        ? 'كلمة مرور التحقق بخطوتين (2FA) غير صحيحة.'
        : 'Invalid 2FA cloud password. Please try again.';
    }
    if (errorStr.includes('FLOOD_WAIT') || errorStr.includes('PHONE_NUMBER_FLOOD')) {
      return isArabic
        ? 'تم طلب الرموز عدة مرات متتالية. يرجى الانتظار بضع دقائق والمحاولة لاحقاً لحماية حسابك.'
        : 'Too many attempts. Please wait a few minutes before trying again.';
    }
    if (errorStr.includes('PHONE_NUMBER_BANNED')) {
      return isArabic
        ? 'هذا الرقم محظور من استخدام تيليجرام.'
        : 'This phone number is banned from Telegram.';
    }
    if (errorStr.includes('PHONE_NUMBER_UNOCCUPIED')) {
      return isArabic
        ? 'هذا الرقم غير مسجل في تيليجرام بعد. يرجى إدخال اسمك لإنشاء حساب جديد.'
        : 'This number is not registered on Telegram yet. Please enter your name to sign up.';
    }
    if (errorStr.includes('SESSION_PASSWORD_NEEDED')) {
      return isArabic
        ? 'هذا الحساب محمي بكلمة مرور التحقق بخطوتين (2FA).'
        : 'Two-Step Verification password is required.';
    }
    if (errorStr.includes('NETWORK_ERROR') || errorStr.includes('TELEGRAM_CONNECTION_ERROR')) {
      return isArabic
        ? 'تعذر الاتصال بخوادم تيليجرام. يرجى التحقق من اتصالك بالإنترنت.'
        : 'Unable to connect to Telegram servers. Please check your internet connection.';
    }

    return errorStr;
  }
}

export const loginController = LoginController.getInstance(0);
