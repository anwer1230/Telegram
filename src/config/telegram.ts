/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// إعدادات وتكوين تيليجرام الرسمي
// تم دمج TELEGRAM_API_ID و TELEGRAM_API_HASH بشكل فعلي وثابت وداىم
export const TELEGRAM_CONFIG = {
  API_ID: 34773007,
  TELEGRAM_API_ID: 34773007,
  API_HASH: '2a6b16abed75c3f6898ee79e9237fd25',
  TELEGRAM_API_HASH: '2a6b16abed75c3f6898ee79e9237fd25',
  DEFAULT_DC: 4,
  APP_TITLE: 'Telegram Web Plus',
  SHORT_NAME: 'tgwebplus',
  DEVICE_MODEL: 'Motorola moto g power (2021)',
  SYSTEM_VERSION: 'Android 11 / WebClient v13.0.2.0',
  APP_VERSION: '13.0.2.0 (22590) universal arm64-v8a',
  LANG_CODE: 'ar',
  
  // خوادم تيليجرام السحابية الرسمية (Data Centers)
  DC_SERVERS: {
    1: { id: 1, name: 'DC 1 (Miami)', host: 'pluto.web.telegram.org', port: 443, ws: 'wss://pluto.web.telegram.org/apiws' },
    2: { id: 2, name: 'DC 2 (Amsterdam)', host: 'venus.web.telegram.org', port: 443, ws: 'wss://venus.web.telegram.org/apiws' },
    3: { id: 3, name: 'DC 3 (Miami)', host: 'aurora.web.telegram.org', port: 443, ws: 'wss://aurora.web.telegram.org/apiws' },
    4: { id: 4, name: 'DC 4 (Amsterdam/Europe)', host: 'vesta.web.telegram.org', port: 443, ws: 'wss://vesta.web.telegram.org/apiws' },
    5: { id: 5, name: 'DC 5 (Singapore)', host: 'flora.web.telegram.org', port: 443, ws: 'wss://flora.web.telegram.org/apiws' },
  }
};
