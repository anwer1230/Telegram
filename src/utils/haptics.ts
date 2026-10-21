/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Real mobile tactile & haptic feedback matching Telegram Android & Web
 */
export function hapticFeedback(type: 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'selection') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'selection':
        // Crisp tick on selecting an item / clicking button
        navigator.vibrate(8);
        break;
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'success':
        // Double tap for success / login / message sent
        navigator.vibrate([15, 40, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        // Triple rumble on error
        navigator.vibrate([40, 60, 40, 60, 50]);
        break;
    }
  } catch (e) {
    // Ignore unsupported devices / user interaction policy
  }
}
