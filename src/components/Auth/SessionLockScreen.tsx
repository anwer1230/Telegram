/**
 * SessionLockScreen.tsx
 * Secure Session Lock Screen with Biometric Unlock (WebAuthn / AndroidX Biometrics) & Passcode PIN
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Lock, ShieldCheck, Delete, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { biometricAuthService, BiometricCapability } from '../../services/BiometricAuthService';
import { useTelegram } from '../../context/TelegramContext';

interface SessionLockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const SessionLockScreen: React.FC<SessionLockScreenProps> = ({ isLocked, onUnlock }) => {
  const { settings, currentUser } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [capability, setCapability] = useState<BiometricCapability | null>(null);

  useEffect(() => {
    biometricAuthService.checkBiometricCapability().then(setCapability);
  }, []);

  // Automatically prompt for biometrics when the screen becomes locked
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setErrorMsg(null);
      setIsSuccess(false);

      // Trigger biometrics automatically after a brief 400ms entrance
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isLocked]);

  const handleBiometricUnlock = useCallback(async () => {
    if (isAuthenticating || isSuccess) return;
    setIsAuthenticating(true);
    setErrorMsg(null);

    try {
      const result = await biometricAuthService.authenticateBiometrics(
        isArabic ? 'فتح قفل تيليجرام' : 'Unlock Telegram'
      );

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsAuthenticating(false);
          onUnlock();
        }, 300);
      } else {
        setIsAuthenticating(false);
        if (result.error && !result.error.includes('cancelled')) {
          setErrorMsg(isArabic ? 'فشل التعرف على البصمة. يرجى إدخال رمز PIN' : 'Biometric verification failed. Use PIN');
        }
      }
    } catch (err) {
      setIsAuthenticating(false);
      setErrorMsg(isArabic ? 'حدث خطأ أثناء المصادقة البيومترية' : 'Biometric authentication error');
    }
  }, [isAuthenticating, isSuccess, isArabic, onUnlock]);

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg(null);

    if (newPin.length === 4) {
      // Validate PIN
      const isValid = biometricAuthService.verifyPasscode(newPin);
      if (isValid) {
        setIsSuccess(true);
        setTimeout(() => {
          onUnlock();
        }, 300);
      } else {
        setErrorMsg(isArabic ? 'رمز المرور غير صحيح' : 'Wrong passcode');
        setTimeout(() => {
          setPin('');
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  // Physical keyboard support
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleBiometricUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, handleBiometricUnlock]);

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="tg-session-lock-screen"
        role="dialog"
        aria-modal="true"
        aria-label="Telegram Lock Screen"
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[9999] bg-[#0e1621]/95 flex flex-col items-center justify-center p-6 text-white select-none overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.92, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full max-w-sm flex flex-col items-center text-center space-y-6"
        >
          {/* Lock Icon & Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#2481cc] to-[#3ca0f0] p-1 shadow-2xl shadow-sky-500/30 flex items-center justify-center">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#182533] flex items-center justify-center text-3xl font-bold text-sky-400">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'TG'}
                </div>
              )}
            </div>

            <motion.div
              animate={isSuccess ? { scale: [1, 1.2, 1], backgroundColor: '#10b981' } : {}}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#2481cc] border-3 border-[#0e1621] flex items-center justify-center shadow-lg"
            >
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <Lock className="w-4 h-4 text-white" />
              )}
            </motion.div>
          </div>

          {/* Heading and Info */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {isArabic ? 'تيليجرام مقفل' : 'Telegram is Locked'}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs">
              {isArabic
                ? 'تم قفل الجلسة تلقائياً للحفاظ على خصوصيتك وأمان بياناتك'
                : 'Session locked after idle period to protect your chats and data'}
            </p>
          </div>

          {/* Biometric Prompt Button */}
          <div className="w-full flex flex-col items-center">
            <motion.button
              id="tg-biometric-unlock-btn"
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleBiometricUnlock}
              disabled={isAuthenticating || isSuccess}
              className={`relative px-6 py-3.5 rounded-2xl flex items-center gap-3 font-semibold text-sm shadow-xl transition-all cursor-pointer border ${
                isSuccess
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-[#2481cc]/20 hover:bg-[#2481cc]/30 border-sky-500/40 text-sky-300 hover:text-white'
              }`}
            >
              <div className="relative">
                <Fingerprint
                  className={`w-6 h-6 ${
                    isAuthenticating ? 'animate-pulse text-sky-400' : 'text-sky-300'
                  }`}
                />
                {isAuthenticating && (
                  <span className="absolute -inset-1 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                )}
              </div>
              <span>
                {isSuccess
                  ? (isArabic ? 'تم التحقق بنجاح' : 'Unlocked Successfully')
                  : isAuthenticating
                  ? (isArabic ? 'جاري التحقق من البصمة...' : 'Verifying Biometrics...')
                  : (isArabic ? 'فتح القفل بالبصمة / Face ID' : 'Unlock with Biometrics')}
              </span>
            </motion.button>

            {capability && (
              <span className="text-[11px] text-gray-400 mt-2 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>{capability.label}</span>
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-white/10" />
            <span>{isArabic ? 'أو أدخل رمز PIN' : 'Or enter PIN'}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 4-PIN Dots Indicator */}
          <div className="flex items-center gap-4 py-1">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <motion.div
                  key={idx}
                  animate={
                    errorMsg
                      ? { x: [-6, 6, -4, 4, 0] }
                      : isFilled
                      ? { scale: [1, 1.25, 1] }
                      : {}
                  }
                  transition={{ duration: 0.25 }}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    isFilled
                      ? 'bg-sky-400 border-sky-400 shadow-lg shadow-sky-400/50'
                      : 'border-gray-500 bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-xs text-rose-400 font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Passcode Number Pad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <motion.button
                key={digit}
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => handleKeyPress(digit)}
                className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-[#2481cc] text-xl font-bold text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5 mx-auto shadow-md"
              >
                {digit}
              </motion.button>
            ))}

            {/* Empty or Quick Biometric Icon */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={handleBiometricUnlock}
              title={isArabic ? 'فتح بالبصمة' : 'Biometric scan'}
              className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-sky-400 flex items-center justify-center transition-colors cursor-pointer border border-white/5 mx-auto"
            >
              <Fingerprint className="w-7 h-7" />
            </motion.button>

            {/* Zero Digit */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => handleKeyPress('0')}
              className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-[#2481cc] text-xl font-bold text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5 mx-auto shadow-md"
            >
              0
            </motion.button>

            {/* Delete button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={handleDelete}
              disabled={pin.length === 0}
              className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer border border-white/5 mx-auto"
            >
              <Delete className="w-6 h-6" />
            </motion.button>
          </div>

          <div className="text-[11px] text-gray-500 pt-2">
            {isArabic ? 'الرمز الافتراضي: 1234 (يمكن تغييره من الإعدادات)' : 'Default PIN: 1234 (customizable in Privacy)'}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
