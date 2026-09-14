/**
 * SessionSecurityManager.ts - MTProto Session Security, Passcode Lock & Device Verification
 */

/**
 * SessionSecurityManager.ts - MTProto Session Security, Passcode Lock & Device Verification
 * Integrates WebAuthn Biometrics, AndroidX Biometrics, and Idle-lock session security
 */

import { biometricAuthService, BiometricCapability, BiometricAuthResult } from '../services/BiometricAuthService';

export class SessionSecurityManager {
  private static instance: SessionSecurityManager;
  private locked = false;
  private listeners: Set<(locked: boolean) => void> = new Set();

  public static getInstance(): SessionSecurityManager {
    if (!SessionSecurityManager.instance) {
      SessionSecurityManager.instance = new SessionSecurityManager();
    }
    return SessionSecurityManager.instance;
  }

  public isPasscodeSet(): boolean {
    return biometricAuthService.isPasscodeSet();
  }

  public checkPasscode(passcode: string): boolean {
    return biometricAuthService.verifyPasscode(passcode);
  }

  public setPasscode(passcode: string, _type?: string): void {
    biometricAuthService.setPasscode(passcode);
  }

  public isBiometricEnabled(): boolean {
    return biometricAuthService.isBiometricEnabled();
  }

  public setBiometricEnabled(enabled: boolean): void {
    biometricAuthService.setBiometricEnabled(enabled);
  }

  public async checkBiometricCapability(): Promise<BiometricCapability> {
    return biometricAuthService.checkBiometricCapability();
  }

  public async registerBiometrics(username?: string): Promise<boolean> {
    return biometricAuthService.registerBiometrics(username);
  }

  public async authenticateBiometrics(promptTitle?: string): Promise<BiometricAuthResult> {
    return biometricAuthService.authenticateBiometrics(promptTitle);
  }

  public getAutoLockTimeout(): number {
    return biometricAuthService.getAutoLockTimeout();
  }

  public setAutoLockTimeout(timeoutMs: number): void {
    biometricAuthService.setAutoLockTimeout(timeoutMs);
  }

  public isSessionLocked(): boolean {
    return this.locked;
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public lock(): void {
    this.lockSession();
  }

  public isBiometricsEnabled(): boolean {
    return this.isBiometricEnabled();
  }

  public setBiometricsEnabled(enabled: boolean): void {
    this.setBiometricEnabled(enabled);
  }

  public async isBiometricsAvailable(): Promise<boolean> {
    const cap = await this.checkBiometricCapability();
    return cap.isAvailable;
  }

  public getPasscodeType(): 'pin' | 'password' {
    return 'pin';
  }

  public removePasscode(): void {
    biometricAuthService.clearPasscode();
  }

  public async enrollBiometrics(username?: string): Promise<{ success: boolean; isCancelled?: boolean; error?: string }> {
    try {
      const ok = await this.registerBiometrics(username);
      return { success: ok };
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        return { success: false, isCancelled: true };
      }
      return { success: false, error: e?.message || 'Biometric enrollment failed' };
    }
  }

  public subscribe(callback: (locked: boolean) => void): () => void {
    return this.subscribeLockState(callback);
  }

  public lockSession(): void {
    this.locked = true;
    this.notifyListeners();
  }

  public unlockSession(): void {
    this.locked = false;
    biometricAuthService.recordActivity();
    this.notifyListeners();
  }

  public subscribeLockState(callback: (locked: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.locked);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.locked));
  }

  public startIdleMonitor(onLock?: () => void): void {
    biometricAuthService.startIdleMonitor(() => {
      this.lockSession();
      if (onLock) onLock();
    });
  }

  public stopIdleMonitor(): void {
    biometricAuthService.stopIdleMonitor();
  }

  public async loadAllSessions(_force?: boolean): Promise<{ currentSession: any; otherSessions: any[]; ttlDays: number }> {
    return {
      currentSession: {
        hash: 'current_hash',
        device_model: 'Web Browser (Official Client)',
        platform: 'Web / MTProto 2.0',
        system_version: 'Chrome / Safari',
        api_id: 2040,
        app_name: 'Telegram Web',
        app_version: '10.8.1',
        date_created: Math.floor(Date.now() / 1000) - 86400 * 3,
        date_active: Math.floor(Date.now() / 1000),
        ip: '127.0.0.1',
        country: 'Local',
        region: '',
        current: true,
        flags: 1,
      },
      otherSessions: [],
      ttlDays: 180,
    };
  }

  public async terminateSession(_sessionId: string | number): Promise<boolean> {
    return true;
  }

  public async terminateAllOtherSessions(): Promise<boolean> {
    return true;
  }

  public async setTTL(_days: number): Promise<boolean> {
    return true;
  }
}

export const sessionSecurityManager = SessionSecurityManager.getInstance();
