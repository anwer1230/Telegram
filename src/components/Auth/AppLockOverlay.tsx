import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Fingerprint, Delete, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { sessionSecurityManager } from '../../core/SessionSecurityManager';
import { useTelegram } from '../../context/TelegramContext';

export const AppLockOverlay: React.FC = () => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [isLocked, setIsLocked] = useState<boolean>(() => sessionSecurityManager.isLocked());
  const [pin, setPin] = useState<string>('');
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState<boolean>(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState<boolean>(() => sessionSecurityManager.isBiometricsEnabled());
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [authStatusMessage, setAuthStatusMessage] = useState<string>('');
  const [isVerifyingBiometrics, setIsVerifyingBiometrics] = useState<boolean>(false);

  const hasAutoPromptedBiometricsRef = useRef<boolean>(false);

  // Subscribe to SessionSecurityManager lock state changes
  useEffect(() => {
    const unsubscribe = sessionSecurityManager.subscribe((locked) => {
      setIsLocked(locked);
      if (locked) {
        setPin('');
        setErrorShake(false);
        setAuthStatusMessage('');
        setIsBiometricsEnabled(sessionSecurityManager.isBiometricsEnabled());
      } else {
        hasAutoPromptedBiometricsRef.current = false;
      }
    });

    // Check biometrics availability
    sessionSecurityManager.isBiometricsAvailable().then((avail) => {
      setIsBiometricsAvailable(avail);
    });

    return () => unsubscribe();
  }, []);

  // Biometric authentication handler
  const handleTriggerBiometrics = useCallback(async () => {
    if (isVerifyingBiometrics) return;

    setIsVerifyingBiometrics(true);
    setAuthStatusMessage(
      isArabic
        ? 'يرجى لمس مستشعر البصمة أو النظر إلى الكاميرا...'
        : 'Touch fingerprint sensor or look at camera...'
    );

    try {
      const result = await sessionSecurityManager.authenticateBiometrics();
      if (result.success) {
        setAuthStatusMessage(isArabic ? 'تم التحقق بنجاح!' : 'Biometrics verified!');
        // Success state handled by subscriber setIsLocked(false)
      } else if (result.isCancelled) {
        setAuthStatusMessage(
          isArabic
            ? 'تم إلغاء المصادقة الحيوية. أدخل رمز القفل للمتابعة.'
            : 'Biometric verification cancelled. Enter passcode to continue.'
        );
      } else {
        setAuthStatusMessage(result.error || (isArabic ? 'فشل التعرف على البصمة' : 'Biometric recognition failed'));
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 500);
      }
    } catch (err: any) {
      setAuthStatusMessage(err.message || (isArabic ? 'خطأ في المصادقة الحيوية' : 'Biometric error'));
    } finally {
      setIsVerifyingBiometrics(false);
    }
  }, [isArabic, isVerifyingBiometrics]);

  // Automatically prompt biometrics once when overlay appears (if biometrics is enabled)
  useEffect(() => {
    if (isLocked && isBiometricsEnabled && !hasAutoPromptedBiometricsRef.current) {
      hasAutoPromptedBiometricsRef.current = true;
      // Slight delay for seamless UI appearance
      const timer = setTimeout(() => {
        handleTriggerBiometrics();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLocked, isBiometricsEnabled, handleTriggerBiometrics]);

  // Handle PIN verification
  const handleDigitPress = useCallback(
    async (digit: string) => {
      if (pin.length >= 6) return;
      const nextPin = pin + digit;
      setPin(nextPin);

      // Check automatically on 4 digits or when user inputs
      if (nextPin.length === 4) {
        const isValid = await sessionSecurityManager.checkPasscode(nextPin);
        if (!isValid) {
          setErrorShake(true);
          setAuthStatusMessage(isArabic ? 'رمز القفل غير صحيح' : 'Incorrect passcode');
          setTimeout(() => {
            setPin('');
            setErrorShake(false);
          }, 600);
        } else {
          setAuthStatusMessage(isArabic ? 'تم إلغاء القفل بنجاح' : 'Passcode accepted');
        }
      }
    },
    [pin, isArabic]
  );

  const handleDeleteDigit = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setErrorShake(false);
  }, []);

  // Physical keyboard listener
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteDigit();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          const valid = sessionSecurityManager.checkPasscode(pin);
          if (valid) {
            sessionSecurityManager.unlockSession();
          } else {
            setErrorShake(true);
            setTimeout(() => {
              setPin('');
              setErrorShake(false);
            }, 600);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, handleDigitPress, handleDeleteDigit]);

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="tg-app-lock-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? 'شاشة قفل تيليجرام' : 'Telegram Lock Screen'}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[99999] bg-[#0e1621] text-white flex flex-col items-center justify-between p-6 select-none overflow-hidden"
      >
        {/* Top Header / Brand Lock Icon */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-14">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 20, stiffness: 260 }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#17212b] border border-white/10 shadow-2xl flex items-center justify-center text-[#5288c1] relative mb-6"
          >
            <div className="absolute inset-0 rounded-3xl bg-[#5288c1]/10 animate-pulse pointer-events-none" />
            <Lock className="w-10 h-10 sm:w-12 sm:h-12" />
          </motion.div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            {isArabic ? 'تيليجرام مقفل' : 'Telegram is Locked'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 text-center max-w-xs leading-relaxed">
            {isArabic
              ? 'أدخل رمز المرور أو استخدم البصمة لإلغاء القفل بعد فترة الخمول'
              : 'Enter passcode or use biometrics to resume your secure session'}
          </p>

          {/* Passcode Dots Indicator */}
          <motion.div
            animate={errorShake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 mt-8"
          >
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-[#5288c1] border-[#5288c1] scale-110 shadow-md shadow-[#5288c1]/50'
                    : 'border-gray-600 bg-white/5'
                }`}
              />
            ))}
          </motion.div>

          {/* Status / Feedback Message */}
          {authStatusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 max-w-xs text-center flex items-center gap-2"
            >
              {errorShake ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-[#5288c1] shrink-0" />
              )}
              <span className="truncate">{authStatusMessage}</span>
            </motion.div>
          )}
        </div>

        {/* Numeric Keypad & Biometrics Action */}
        <div className="w-full max-w-xs flex flex-col items-center gap-3 pb-6 sm:pb-10">
          <div className="grid grid-cols-3 gap-3.5 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigitPress(String(num))}
                className="h-16 rounded-full bg-[#17212b]/80 hover:bg-[#1f2d3d] active:bg-[#25374a] active:scale-95 transition-all text-xl font-semibold text-white flex items-center justify-center border border-white/5 shadow-md select-none"
              >
                {num}
              </button>
            ))}

            {/* Bottom Row: Biometrics button (or spacer), 0, Backspace */}
            {isBiometricsEnabled || isBiometricsAvailable ? (
              <button
                type="button"
                onClick={handleTriggerBiometrics}
                disabled={isVerifyingBiometrics}
                aria-label={isArabic ? 'فتح بالبصمة' : 'Unlock with biometrics'}
                className="h-16 rounded-full bg-[#17212b]/90 hover:bg-[#5288c1]/20 active:scale-95 transition-all flex items-center justify-center text-[#5288c1] hover:text-white border border-[#5288c1]/30 shadow-md"
                title={isArabic ? 'إلغاء القفل بالبصمة (WebAuthn)' : 'Unlock with Biometrics (WebAuthn)'}
              >
                <Fingerprint className={`w-7 h-7 ${isVerifyingBiometrics ? 'animate-pulse text-cyan-400' : ''}`} />
              </button>
            ) : (
              <div className="h-16" />
            )}

            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              className="h-16 rounded-full bg-[#17212b]/80 hover:bg-[#1f2d3d] active:bg-[#25374a] active:scale-95 transition-all text-xl font-semibold text-white flex items-center justify-center border border-white/5 shadow-md select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDeleteDigit}
              aria-label={isArabic ? 'مسح رقم' : 'Delete digit'}
              className="h-16 rounded-full bg-[#17212b]/60 hover:bg-[#1f2d3d] active:scale-95 transition-all flex items-center justify-center text-gray-400 hover:text-white border border-white/5 select-none"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Biometric Pill Trigger */}
          {(isBiometricsEnabled || isBiometricsAvailable) && (
            <button
              type="button"
              onClick={handleTriggerBiometrics}
              disabled={isVerifyingBiometrics}
              className="mt-2 w-full py-3 px-4 rounded-2xl bg-[#5288c1]/15 hover:bg-[#5288c1]/25 active:scale-98 transition-all border border-[#5288c1]/30 text-[#5288c1] text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              <span>
                {isArabic
                  ? 'إلغاء القفل عبر بصمة الإصبع / Face ID (WebAuthn)'
                  : 'Unlock with Biometrics / Face ID (WebAuthn)'}
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
