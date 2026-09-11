/**
 * BiometricAuthService.ts
 * Integrates WebAuthn API (Fingerprint, Touch ID, Face ID, Windows Hello)
 * and androidx.biometric bridge for secure session unlocking after idle periods.
 */

export interface BiometricCapability {
  isAvailable: boolean;
  hasWebAuthn: boolean;
  hasAndroidBridge: boolean;
  authenticatorType: 'webauthn' | 'android_biometric' | 'passcode_only';
  label: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  isCancelled?: boolean;
  method?: 'webauthn' | 'android_biometric' | 'passcode';
}

const CREDENTIAL_ID_KEY = 'tg_biometric_credential_id';
const PASSCODE_STORAGE_KEY = 'tg_app_lock_passcode';
const AUTO_LOCK_TIMEOUT_KEY = 'tg_auto_lock_timeout_ms';
const BIOMETRIC_ENABLED_KEY = 'tg_biometric_unlock_enabled';

// Default auto-lock idle timeout: 2 minutes (120,000 ms)
export const DEFAULT_IDLE_TIMEOUT = 2 * 60 * 1000;

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private isEnrolled = false;
  private idleTimer: any = null;
  private lastActivityTimestamp = Date.now();
  private onIdleLockCallback: (() => void) | null = null;
  private isListeningForActivity = false;

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Detect biometric capabilities across WebAuthn & androidx.biometric bridge
   */
  public async checkBiometricCapability(): Promise<BiometricCapability> {
    // 1. Check existing AndroidX Biometric Bridge (if running in Telegram Android / WebView wrapper)
    const androidBridge = (window as any).AndroidBiometrics ||
      (window as any).Android?.biometric ||
      (window as any).TelegramAndroidBridge;

    if (androidBridge && typeof androidBridge.canAuthenticate === 'function') {
      try {
        const canAuth = androidBridge.canAuthenticate();
        if (canAuth) {
          return {
            isAvailable: true,
            hasWebAuthn: false,
            hasAndroidBridge: true,
            authenticatorType: 'android_biometric',
            label: 'Android Biometrics (androidx.biometric)',
          };
        }
      } catch (e) {
        console.warn('[BiometricAuth] Android bridge check error:', e);
      }
    }

    // 2. Check Browser WebAuthn API (Fingerprint, Touch ID, Face ID, Windows Hello)
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const isPlatformAvailable =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (isPlatformAvailable) {
          return {
            isAvailable: true,
            hasWebAuthn: true,
            hasAndroidBridge: false,
            authenticatorType: 'webauthn',
            label: 'Biometric Authenticator (Touch ID / Face ID / Fingerprint)',
          };
        }
      } catch (err) {
        console.warn('[BiometricAuth] WebAuthn platform authenticator check error:', err);
      }
    }

    return {
      isAvailable: false,
      hasWebAuthn: typeof window !== 'undefined' && !!window.PublicKeyCredential,
      hasAndroidBridge: false,
      authenticatorType: 'passcode_only',
      label: 'Passcode / PIN Only',
    };
  }

  /**
   * Register/enroll biometrics using WebAuthn credential creation
   */
  public async registerBiometrics(username = 'telegram_user'): Promise<boolean> {
    const capability = await this.checkBiometricCapability();

    if (capability.hasAndroidBridge) {
      this.isEnrolled = true;
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    }

    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = (await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'Telegram Web Client',
              id: window.location.hostname || 'localhost',
            },
            user: {
              id: userId,
              name: username,
              displayName: 'Telegram Account',
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 }, // ES256
              { type: 'public-key', alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'preferred',
              requireResidentKey: false,
            },
            timeout: 60000,
            attestation: 'none',
          },
        })) as PublicKeyCredential;

        if (credential) {
          const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem(CREDENTIAL_ID_KEY, rawId);
          localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
          this.isEnrolled = true;
          return true;
        }
      } catch (err: any) {
        // If user cancelled or already enrolled, consider enabled if requested
        console.info('[BiometricAuth] WebAuthn enrollment note:', err?.message || err);
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        return true;
      }
    }

    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  }

  /**
   * Prompt biometric authentication (WebAuthn or androidx.biometric)
   */
  public async authenticateBiometrics(promptTitle = 'Unlock Telegram'): Promise<BiometricAuthResult> {
    const capability = await this.checkBiometricCapability();

    // 1. Android Bridge Check
    const androidBridge = (window as any).AndroidBiometrics ||
      (window as any).Android?.biometric ||
      (window as any).TelegramAndroidBridge;

    if (androidBridge && typeof androidBridge.authenticate === 'function') {
      return new Promise<BiometricAuthResult>((resolve) => {
        const callbackName = '__tg_biometric_cb_' + Date.now();
        (window as any)[callbackName] = (success: boolean, errorMsg?: string) => {
          delete (window as any)[callbackName];
          resolve({
            success,
            error: errorMsg,
            method: 'android_biometric',
          });
        };

        try {
          androidBridge.authenticate(promptTitle, callbackName);
        } catch (e: any) {
          resolve({
            success: false,
            error: e?.message || 'Android biometric prompt error',
            method: 'android_biometric',
          });
        }
      });
    }

    // 2. WebAuthn Prompt
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const storedRawId = localStorage.getItem(CREDENTIAL_ID_KEY);
        const allowCredentials: PublicKeyCredentialDescriptor[] = [];

        if (storedRawId) {
          try {
            const rawBytes = Uint8Array.from(atob(storedRawId), (c) => c.charCodeAt(0));
            allowCredentials.push({
              id: rawBytes.buffer,
              type: 'public-key',
              transports: ['internal'],
            });
          } catch (_) {}
        }

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname || 'localhost',
            allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
            userVerification: 'preferred',
            timeout: 60000,
          },
        });

        if (assertion) {
          return { success: true, method: 'webauthn' };
        }
      } catch (err: any) {
        console.warn('[BiometricAuth] WebAuthn get error:', err);
        // If credential not found or cancelled
        if (err?.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Authentication cancelled or permission denied',
            method: 'webauthn',
          };
        }
        const isCancelled = err?.name === 'NotAllowedError' || err?.message?.toLowerCase()?.includes('cancel');
        return {
          success: false,
          error: err?.message || 'Biometric authentication failed',
          isCancelled,
          method: 'webauthn',
        };
      }
    }

    return {
      success: false,
      error: 'Biometric hardware unavailable. Please use PIN.',
      method: 'passcode',
    };
  }

  /**
   * Passcode PIN verification fallback
   */
  public verifyPasscode(enteredPin: string): boolean {
    const storedPin = localStorage.getItem(PASSCODE_STORAGE_KEY) || '1234';
    return enteredPin.trim() === storedPin.trim();
  }

  public setPasscode(newPin: string): void {
    localStorage.setItem(PASSCODE_STORAGE_KEY, newPin.trim());
  }

  public clearPasscode(): void {
    localStorage.removeItem(PASSCODE_STORAGE_KEY);
  }

  public isPasscodeSet(): boolean {
    return !!localStorage.getItem(PASSCODE_STORAGE_KEY);
  }

  public isBiometricEnabled(): boolean {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) !== 'false';
  }

  public setBiometricEnabled(enabled: boolean): void {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  public getAutoLockTimeout(): number {
    const val = localStorage.getItem(AUTO_LOCK_TIMEOUT_KEY);
    return val ? parseInt(val, 10) : DEFAULT_IDLE_TIMEOUT;
  }

  public setAutoLockTimeout(timeoutMs: number): void {
    localStorage.setItem(AUTO_LOCK_TIMEOUT_KEY, String(timeoutMs));
  }

  /**
   * Idle Tracker: monitors user activity across mouse, touch, keyboard, scroll, and tab visibility
   */
  public startIdleMonitor(onLock: () => void): void {
    this.onIdleLockCallback = onLock;
    this.lastActivityTimestamp = Date.now();

    if (this.isListeningForActivity) return;
    this.isListeningForActivity = true;

    const handleUserActivity = () => {
      this.lastActivityTimestamp = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('mousedown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    // Handle tab visibility changes (e.g. user leaves tab or locks screen)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeout = this.getAutoLockTimeout();
        if (timeout > 0 && Date.now() - this.lastActivityTimestamp >= timeout) {
          if (this.onIdleLockCallback) {
            this.onIdleLockCallback();
          }
        }
      }
    });

    // Periodic check interval
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.idleTimer = setInterval(() => {
      const timeout = this.getAutoLockTimeout();
      // If timeout <= 0, auto-lock is disabled
      if (timeout > 0 && Date.now() - this.lastActivityTimestamp >= timeout) {
        if (this.onIdleLockCallback) {
          this.onIdleLockCallback();
        }
      }
    }, 5000);
  }

  public stopIdleMonitor(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  public recordActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }
}

export const biometricAuthService = BiometricAuthService.getInstance();
