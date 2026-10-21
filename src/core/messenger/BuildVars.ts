/**
 * BuildVars.ts - Telegram Android Build Configuration & Version Information
 * 
 * Replicated directly from DrKLO/Telegram Android:
 * org.telegram.messenger.BuildVars.java
 */

export class BuildVars {
  public static readonly DEBUG_VERSION = false;
  public static readonly DEBUG_PRIVATE_VERSION = false;
  public static readonly IS_STANDALONE = true; // Direct APK / Web standalone OTA distribution
  public static readonly LOGS_ENABLED = true;

  // Build versions
  public static readonly BUILD_VERSION = 110409;
  public static readonly BUILD_VERSION_STRING = '11.4.0';
  public static readonly BUILD_DATE = '2026-08-30';
  
  // Package and API credentials
  public static readonly APPLICATION_ID = 'org.telegram.messenger.web';
  public static readonly PLAY_MARKET_PACKAGE_NAME = 'org.telegram.messenger';
  public static readonly APP_ID = 34773007;
  public static readonly APP_HASH = '2a6b16abed75c3f6898ee79e9237fd25';
  public static readonly SMS_HASH = 'tg_sms_hash_prod';

  // API update channels
  public static readonly UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Hours
  public static readonly GCM_SENDER_ID = '760348033672';

  /**
   * Compares two semantic version strings (e.g. "11.5.0" vs "11.4.0")
   * Returns true if remoteVersion > currentVersion
   */
  public static isNewVersion(remoteVersion: string, currentVersion: string = BuildVars.BUILD_VERSION_STRING): boolean {
    if (!remoteVersion || !currentVersion) return false;
    try {
      const cleanRemote = remoteVersion.replace(/^v/i, '').trim();
      const cleanCurrent = currentVersion.replace(/^v/i, '').trim();

      const rParts = cleanRemote.split('.').map((p) => parseInt(p, 10) || 0);
      const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);

      const maxLen = Math.max(rParts.length, cParts.length);
      for (let i = 0; i < maxLen; i++) {
        const r = rParts[i] ?? 0;
        const c = cParts[i] ?? 0;
        if (r > c) return true;
        if (r < c) return false;
      }
      return false;
    } catch {
      return remoteVersion !== currentVersion;
    }
  }
}
