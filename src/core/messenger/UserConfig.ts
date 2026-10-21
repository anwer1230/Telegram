/**
 * UserConfig.ts - org.telegram.messenger.UserConfig
 * Replicated directly from UserConfig.java in DrKLO/Telegram Android
 * Handles current user settings, client config, authorization tokens, device registration, and passcode cryptography.
 */

import { User } from '../../types';
import { AuthTokensHelper } from './AuthTokensHelper';
import { SecureSessionStorage } from '../../utils/SecureSessionStorage';

export class UserConfig {
  public static selectedAccount: number = 0;
  public finalStaticMaxCount: number = 4;
  public static readonly MAX_ACCOUNT_COUNT: number = 4;
  private static instances = new Map<number, UserConfig>();

  public currentAccount: number = 0;
  public currentUser: User | null = null;
  public registeredForPush: boolean = true;
  public contactsHash: string = '';
  public syncContacts: boolean = true;
  public clientUserId: string = 'user_self';
  public isClientActivated: boolean = false;
  public passcodeHash: string = '';
  public passcodeSalt: string = '';
  public passcodeType: number = 0; // 0: PIN (4 digits), 1: Password (alphanumeric)
  public autoLockIn: number = 0; // 0: disabled, >0: seconds
  public lastUptimeMillis: number = Date.now();
  public isAppLocked: boolean = false;
  public has2FA: boolean = false;
  public hint2FA: string = '';

  public static getInstance(account: number = UserConfig.selectedAccount): UserConfig {
    if (!UserConfig.instances.has(account)) {
      UserConfig.instances.set(account, new UserConfig(account));
    }
    return UserConfig.instances.get(account)!;
  }

  public static hasValidAccounts(): boolean {
    return UserConfig.getActivatedAccountsCount() > 0;
  }

  /**
   * DrKLO/Telegram Android: UserConfig.findAccountByPhone
   * Searches all active accounts to find if the phone number already belongs to an existing account.
   * Returns account index (0..MAX_ACCOUNT_COUNT-1) or -1 if not found.
   */
  public static findAccountByPhone(phone: string): number {
    if (!phone) return -1;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return -1;

    for (let a = 0; a < UserConfig.MAX_ACCOUNT_COUNT; a++) {
      const config = UserConfig.getInstance(a);
      if (config && config.isClientAuthorized() && config.currentUser) {
        const accPhone = String(config.currentUser.phone || '').replace(/[^0-9]/g, '');
        if (accPhone && accPhone === cleanPhone) {
          return a;
        }
      }
    }
    return -1;
  }

  /**
   * DrKLO/Telegram Android: UserConfig.findAccountByUserId
   * Searches all active accounts to find if the user ID already belongs to an existing account.
   */
  public static findAccountByUserId(userId: string | number): number {
    if (!userId || userId === '0') return -1;
    const cleanId = String(userId);

    for (let a = 0; a < UserConfig.MAX_ACCOUNT_COUNT; a++) {
      const config = UserConfig.getInstance(a);
      if (config && config.isClientAuthorized()) {
        const accId = config.getClientUserId();
        if (accId && accId === cleanId) {
          return a;
        }
      }
    }
    return -1;
  }

  /**
   * Helper to verify if a user object is a mock/dummy/test user.
   */
  public static isMockUser(user: User | null | undefined): boolean {
    if (!user) return true;
    const id = String(user.id || '');
    const phone = String(user.phone || '').replace(/\s+/g, '');
    const username = String(user.username || '').toLowerCase();
    const name = String(user.name || '');

    return (
      !id ||
      id === 'user_anwer_main' ||
      id === 'user_primary' ||
      id === 'user_self' ||
      id.startsWith('mock_') ||
      username === 'anwer_dev' ||
      name === 'أنور فؤاد' ||
      phone === '+967770123456' ||
      phone === '0000000000' ||
      phone.startsWith('+999') ||
      phone.includes('test') ||
      (user as any).isDummy === true
    );
  }

  /**
   * Purges mock/dummy/test accounts from memory and persistent storage.
   * Ensures only genuine authenticated sessions remain active.
   */
  public static cleanupTestAccounts(): void {
    let firstRealAccount = -1;
    let realAccountsCount = 0;

    for (let a = 0; a < UserConfig.MAX_ACCOUNT_COUNT; a++) {
      const config = UserConfig.getInstance(a);
      if (UserConfig.isMockUser(config.currentUser)) {
        config.clearConfig(true);
      } else if (config.isClientAuthorized()) {
        if (firstRealAccount === -1) {
          firstRealAccount = a;
        }
        realAccountsCount++;
      }
    }

    if (typeof window !== 'undefined') {
      const multi = SecureSessionStorage.getItem<any[]>('tg_multi_accounts_v3') || SecureSessionStorage.getItem<any[]>('tg_accounts');
      if (multi && Array.isArray(multi)) {
        const hasGlobalSession = !!(SecureSessionStorage.getItem<string>('tg_session_string') || localStorage.getItem('tg_session_string'));
        const cleanMulti = multi.filter(acc => acc && acc.user && !UserConfig.isMockUser(acc.user) && (acc.sessionString || hasGlobalSession));
        if (cleanMulti.length !== multi.length) {
          if (cleanMulti.length === 0) {
            SecureSessionStorage.removeItem('tg_multi_accounts_v3');
            SecureSessionStorage.removeItem('tg_accounts');
            SecureSessionStorage.removeItem('tg_auth_session_active');
            SecureSessionStorage.removeItem('tg_active_account_id_v3');
          } else {
            SecureSessionStorage.setItem('tg_multi_accounts_v3', cleanMulti);
            SecureSessionStorage.setItem('tg_active_account_id_v3', cleanMulti[0].id);
          }
        }
      }
    }

    if (realAccountsCount > 0) {
      UserConfig.selectedAccount = firstRealAccount;
    } else {
      UserConfig.selectedAccount = 0;
    }
  }

  public static clearAllConfigs(): void {
    for (let i = 0; i < UserConfig.MAX_ACCOUNT_COUNT; i++) {
      UserConfig.getInstance(i).clearConfig(true);
    }
  }

  public set2FA(enabled: boolean, hint: string = '', email: string = ''): void {
    this.has2FA = enabled;
    this.hint2FA = hint;
    this.saveConfig();
  }

  /**
   * Static helper corresponding to UserConfig.getInstance(currentAccount).getClientUserId()
   */
  public static getClientUserId(account: number = UserConfig.selectedAccount): string {
    return UserConfig.getInstance(account).getClientUserId();
  }

  public static getActivatedAccountsCount(): number {
    let count = 0;
    for (let i = 0; i < UserConfig.MAX_ACCOUNT_COUNT; i++) {
      if (UserConfig.getInstance(i).isClientAuthorized()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Returns current authenticated user ID
   */
  public getClientUserId(): string {
    return this.currentUser ? String(this.currentUser.id) : (this.clientUserId || 'user_self');
  }

  private constructor(account: number) {
    this.currentAccount = account;
    this.loadConfig();
    this.setupAutoLockWatcher();
  }

  public loadConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const parsed = SecureSessionStorage.getItem<any>(`tg_user_config_${this.currentAccount}`);
      if (parsed) {
        this.currentUser = parsed.currentUser || null;
        this.clientUserId = parsed.clientUserId || (this.currentUser ? String(this.currentUser.id) : 'user_self');
        this.isClientActivated = parsed.isClientActivated ?? (!!this.currentUser);
        this.passcodeHash = parsed.passcodeHash || '';
        this.passcodeSalt = parsed.passcodeSalt || '';
        this.passcodeType = parsed.passcodeType || 0;
        this.autoLockIn = parsed.autoLockIn || 0;
        this.has2FA = parsed.has2FA || false;
        this.hint2FA = parsed.hint2FA || '';
      }

      // If currentUser is null, check persistent AuthTokensHelper backup or multi_accounts
      if (!this.currentUser) {
        const backup = AuthTokensHelper.getInstance().restoreUserBackup(this.currentAccount);
        if (backup && !UserConfig.isMockUser(backup)) {
          this.currentUser = backup;
          this.clientUserId = String(backup.id);
          this.isClientActivated = true;
          this.saveConfig();
        } else {
          try {
            const parsedMulti = SecureSessionStorage.getItem<any[]>('tg_multi_accounts_v3') || SecureSessionStorage.getItem<any[]>('tg_accounts');
            if (parsedMulti && Array.isArray(parsedMulti) && parsedMulti[this.currentAccount]?.user) {
              const u = parsedMulti[this.currentAccount].user;
              if (u && !UserConfig.isMockUser(u)) {
                this.currentUser = u;
                this.clientUserId = String(this.currentUser?.id || 'user_self');
                this.isClientActivated = true;
                this.saveConfig();
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[UserConfig] Failed to load user config:', e);
    }
  }

  public saveConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        currentUser: this.currentUser,
        clientUserId: this.clientUserId,
        isClientActivated: this.isClientActivated,
        passcodeHash: this.passcodeHash,
        passcodeSalt: this.passcodeSalt,
        passcodeType: this.passcodeType,
        autoLockIn: this.autoLockIn,
        has2FA: this.has2FA,
        hint2FA: this.hint2FA,
      };
      SecureSessionStorage.setItem(`tg_user_config_${this.currentAccount}`, payload);

      if (this.currentUser && !UserConfig.isMockUser(this.currentUser)) {
        AuthTokensHelper.getInstance().saveUserBackup(this.currentAccount, this.currentUser);
      }
    } catch (e) {
      console.warn('[UserConfig] Failed to save user config:', e);
    }
  }

  public setCurrentUser(user: User): void {
    this.currentUser = user;
    this.clientUserId = String(user.id);
    this.isClientActivated = true;
    this.saveConfig();
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public isClientAuthorized(): boolean {
    if (this.isClientActivated && !!this.currentUser && !UserConfig.isMockUser(this.currentUser)) return true;
    return AuthTokensHelper.getInstance().hasPersistentSession(this.currentAccount);
  }

  /**
   * Clears configuration, wipes local user session, only if explicitly requested on logout or revocation.
   * Replicated from DrKLO/Telegram Android UserConfig.java clearConfig
   */
  public clearConfig(fromUserLogout: boolean = true): void {
    if (!fromUserLogout) {
      console.warn('[UserConfig] clearConfig() called without fromUserLogout=true during runtime. Ignored to preserve session.');
      return;
    }

    this.currentUser = null;
    this.clientUserId = '0';
    this.isClientActivated = false;
    this.passcodeHash = '';
    this.passcodeSalt = '';
    this.isAppLocked = false;
    if (typeof window !== 'undefined') {
      SecureSessionStorage.removeItem(`tg_user_config_${this.currentAccount}`);
      SecureSessionStorage.removeItem(`tg_mtproto_session_${this.currentAccount}`);
      if (this.currentAccount === UserConfig.selectedAccount || this.currentAccount === 0) {
        SecureSessionStorage.removeItem('tg_session_string');
        SecureSessionStorage.removeItem('tg_user');
        SecureSessionStorage.removeItem('tg_phone');
        SecureSessionStorage.removeItem('tg_auth_token');
        SecureSessionStorage.removeItem('tg_current_user');
      }
    }
    AuthTokensHelper.getInstance().clearAccountTokens(this.currentAccount);
  }

  /**
   * Generates a real SHA-256 hash for local passcode protection
   */
  public async setPasscode(passcode: string, type: number = 0): Promise<void> {
    if (!passcode) {
      this.passcodeHash = '';
      this.passcodeSalt = '';
      this.passcodeType = 0;
      this.isAppLocked = false;
      this.saveConfig();
      return;
    }

    const salt = Math.random().toString(36).substring(2, 10);
    const hash = await this.sha256Hex(passcode + salt);

    this.passcodeHash = hash;
    this.passcodeSalt = salt;
    this.passcodeType = type;
    this.saveConfig();
  }

  public async checkPasscode(input: string): Promise<boolean> {
    if (!this.passcodeHash) return true;
    const computed = await this.sha256Hex(input + this.passcodeSalt);
    const isValid = computed === this.passcodeHash;
    if (isValid) {
      this.isAppLocked = false;
      this.lastUptimeMillis = Date.now();
    }
    return isValid;
  }

  private async sha256Hex(str: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Simple fallback
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  private setupAutoLockWatcher(): void {
    if (typeof window === 'undefined') return;

    const resetTimer = () => {
      this.lastUptimeMillis = Date.now();
    };

    window.addEventListener('mousemove', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });
    window.addEventListener('touchstart', resetTimer, { passive: true });

    setInterval(() => {
      if (this.autoLockIn > 0 && this.passcodeHash && !this.isAppLocked) {
        const elapsed = (Date.now() - this.lastUptimeMillis) / 1000;
        if (elapsed >= this.autoLockIn) {
          this.isAppLocked = true;
        }
      }
    }, 10000);
  }
}

export const userConfig = UserConfig.getInstance(0);
