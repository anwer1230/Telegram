/**
 * PrivacySettingsController.ts
 * 
 * Implementation of org.telegram.messenger Privacy and Security management
 * Corresponds to PrivacySettingsActivity / PrivacyActivity and SessionsActivity
 * in DrKLO/Telegram Android.
 */

import { TLRPC } from '../TLRPC';
import { ConnectionsManager } from '../ConnectionsManager';
import { NotificationCenter } from '../NotificationCenter';
import { MessagesController } from '../MessagesController';

export type PrivacyTarget =
  | 'phone_number'
  | 'last_seen'
  | 'profile_photos'
  | 'forwards'
  | 'calls'
  | 'voice_messages'
  | 'bio';

export type PrivacyOption = 'everybody' | 'contacts' | 'nobody';

export interface PrivacySettingsState {
  // Security
  twoStepEnabled: boolean;
  autoDeletePeriod: number; // 0 = Off, 86400 = 1 day, 604800 = 1 week, 2592000 = 1 month
  passcodeEnabled: boolean;
  passcodeType: 'pin' | 'password';
  passcodeHash?: string;
  loginEmail: string;
  blockedUsersCount: number;
  activeSessionsCount: number;

  // Privacy
  phoneNumber: PrivacyOption;
  lastSeen: PrivacyOption;
  profilePhotos: PrivacyOption;
  forwards: PrivacyOption;
  calls: PrivacyOption;
  voiceMessages: PrivacyOption;
  bio: PrivacyOption;

  // Sessions
  sessions: TLRPC.TL_authorization[];
  blockedUsers: TLRPC.TL_contactBlocked[];
}

const STORAGE_KEY_PRIVACY = 'tg_privacy_settings_';

export class PrivacySettingsController {
  private static instances: Map<number, PrivacySettingsController> = new Map();
  private currentAccount: number = 0;

  private state: PrivacySettingsState = {
    twoStepEnabled: false,
    autoDeletePeriod: 0,
    passcodeEnabled: false,
    passcodeType: 'pin',
    loginEmail: '',
    blockedUsersCount: 0,
    activeSessionsCount: 0,
    phoneNumber: 'everybody',
    lastSeen: 'everybody',
    profilePhotos: 'everybody',
    forwards: 'everybody',
    calls: 'everybody',
    voiceMessages: 'everybody',
    bio: 'everybody',
    sessions: [],
    blockedUsers: [],
  };

  public static getInstance(account: number = 0): PrivacySettingsController {
    let instance = PrivacySettingsController.instances.get(account);
    if (!instance) {
      instance = new PrivacySettingsController(account);
      PrivacySettingsController.instances.set(account, instance);
    }
    return instance;
  }

  constructor(account: number) {
    this.currentAccount = account;
    this.loadState();
  }

  public updateRuleFromRemote(target: PrivacyTarget, option: PrivacyOption) {
    this.state[target] = option;
    this.saveState();
    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.updateInterfaces,
      0x0008
    );
  }

  public async loadPrivacySettings(): Promise<PrivacySettingsState> {
    const activeSession = typeof window !== 'undefined' ? (localStorage.getItem('tg_session_string') || '') : '';
    try {
      const resp = await fetch(`/api/telegram/account/privacy?sessionString=${encodeURIComponent(activeSession)}`);
      const data = await resp.json().catch(() => ({}));
      if (data && data.success && data.settings) {
        const s = data.settings;
        if (s.phoneNumber) this.state.phoneNumber = s.phoneNumber;
        if (s.lastSeen) this.state.lastSeen = s.lastSeen;
        if (s.profilePhotos) this.state.profilePhotos = s.profilePhotos;
        if (s.forwards) this.state.forwards = s.forwards;
        if (s.calls) this.state.calls = s.calls;
        if (s.voiceMessages) this.state.voiceMessages = s.voiceMessages;
        if (s.bio) this.state.bio = s.bio;
        this.saveState();
        NotificationCenter.getInstance(this.currentAccount).postNotificationName(
          NotificationCenter.updateInterfaces,
          0x0008
        );
      }
    } catch (_) {}
    return { ...this.state };
  }

  private loadState() {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PRIVACY}${this.currentAccount}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      }
    } catch {
      // ignore
    }
  }

  private saveState() {
    try {
      localStorage.setItem(`${STORAGE_KEY_PRIVACY}${this.currentAccount}`, JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  public getState(): PrivacySettingsState {
    return { ...this.state };
  }

  /**
   * Fetches privacy rules for a key (account.getPrivacy)
   */
  public async getPrivacy(target: PrivacyTarget): Promise<PrivacyOption> {
    return this.state[target] || 'everybody';
  }

  /**
   * Updates privacy rule for a key (account.setPrivacy)
   */
  public async setPrivacy(target: PrivacyTarget, option: PrivacyOption): Promise<boolean> {
    this.state[target] = option;
    this.saveState();

    const conn = ConnectionsManager.getInstance(this.currentAccount);
    const keyMap: Record<PrivacyTarget, TLRPC.PrivacyKey> = {
      phone_number: { _: 'privacyKeyPhoneNumber' },
      last_seen: { _: 'privacyKeyStatusTimestamp' },
      profile_photos: { _: 'privacyKeyProfilePhoto' },
      forwards: { _: 'privacyKeyForwards' },
      calls: { _: 'privacyKeyPhoneCall' },
      voice_messages: { _: 'privacyKeyVoiceMessages' },
      bio: { _: 'privacyKeyStatusTimestamp' },
    };

    const rule: TLRPC.PrivacyRule =
      option === 'everybody'
        ? { _: 'privacyValueAllowAll' }
        : option === 'contacts'
        ? { _: 'privacyValueAllowContacts' }
        : { _: 'privacyValueDisallowAll' };

    const req: any = {
      _: 'account.setPrivacy',
      key: keyMap[target],
      rules: [rule],
    };

    const res = await conn.sendRequest<any>(req);
    if (res) {
      MessagesController.getInstance(this.currentAccount).processUpdates(res, false);
    }

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.updateInterfaces,
      0x0008
    );

    return true;
  }

  /**
   * Loads active authorizations (account.getAuthorizations)
   */
  public async loadAuthorizations(): Promise<TLRPC.TL_authorization[]> {
    const conn = ConnectionsManager.getInstance(this.currentAccount);
    const req: any = {
      _: 'account.getAuthorizations',
    };

    const res = await conn.sendRequest<TLRPC.TL_account_authorizations>(req);
    if (res && res.authorizations) {
      this.state.sessions = res.authorizations;
      this.state.activeSessionsCount = res.authorizations.length;
      this.saveState();
    }
    return this.state.sessions;
  }

  /**
   * Terminates specific session (account.resetAuthorization)
   */
  public async terminateSession(hash: number | string): Promise<boolean> {
    const conn = ConnectionsManager.getInstance(this.currentAccount);
    const req: any = {
      _: 'account.resetAuthorization',
      hash,
    };
    await conn.sendRequest(req);

    this.state.sessions = this.state.sessions.filter((s) => String(s.hash) !== String(hash));
    this.state.activeSessionsCount = this.state.sessions.length;
    this.saveState();

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.updateInterfaces,
      0x0008
    );
    return true;
  }

  /**
   * Terminates all other sessions except current (account.resetAuthorizations)
   */
  public async terminateAllOtherSessions(): Promise<boolean> {
    const conn = ConnectionsManager.getInstance(this.currentAccount);
    const req: TLRPC.TL_account_resetAuthorizations = {
      _: 'account.resetAuthorizations',
    };
    await conn.sendRequest(req);

    this.state.sessions = this.state.sessions.filter((s) => s.current);
    this.state.activeSessionsCount = this.state.sessions.length;
    this.saveState();

    NotificationCenter.getInstance(this.currentAccount).postNotificationName(
      NotificationCenter.updateInterfaces,
      0x0008
    );
    return true;
  }

  /**
   * Passcode lock management
   */
  public setPasscode(passcode: string, type: 'pin' | 'password'): void {
    if (!passcode) {
      this.state.passcodeEnabled = false;
      this.state.passcodeHash = undefined;
    } else {
      this.state.passcodeEnabled = true;
      this.state.passcodeType = type;
      this.state.passcodeHash = btoa(passcode);
    }
    this.saveState();
  }

  /**
   * Auto-delete timer
   */
  public setAutoDeletePeriod(period: number): void {
    this.state.autoDeletePeriod = period;
    this.saveState();
  }

  /**
   * Block / Unblock user
   */
  public async blockUser(userId: string | number): Promise<void> {
    if (!this.state.blockedUsers.some((u) => String(u.user_id) === String(userId))) {
      this.state.blockedUsers.push({
        _: 'contactBlocked',
        user_id: userId,
        date: Math.floor(Date.now() / 1000),
      });
      this.state.blockedUsersCount = this.state.blockedUsers.length;
      this.saveState();
    }
  }

  public async unblockUser(userId: string | number): Promise<void> {
    this.state.blockedUsers = this.state.blockedUsers.filter((u) => String(u.user_id) !== String(userId));
    this.state.blockedUsersCount = this.state.blockedUsers.length;
    this.saveState();
  }
}

export const privacyController = PrivacySettingsController.getInstance(0);
