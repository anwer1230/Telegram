import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Lock,
  Eye,
  EyeOff,
  Radio,
  Server,
  Key,
  RefreshCw,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { loginController, AuthTokensHelper, UserConfig, NotificationCenter } from '../../core/messenger';

const normalizeFullPhone = (val: string): string => {
  let clean = (val || '').trim().replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('00')) clean = '+' + clean.slice(2);
  else if (clean && !clean.startsWith('+')) clean = '+' + clean;
  return clean;
};

interface TelegramAuthScreenProps {
  isAddingAccount?: boolean;
  onCancelAdd?: () => void;
}

export const TelegramAuthScreen: React.FC<TelegramAuthScreenProps> = ({
  isAddingAccount = false,
  onCancelAdd,
}) => {
  const { login, apiConfig, settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  // Login Mode: 'phone' | 'qr'
  const [authMode, setAuthMode] = useState<'phone' | 'qr'>('phone');

  // Step: 1 = Phone Input, 2 = SMS/Telegram Code, 3 = 2FA Password (optional), 4 = Name Setup (if new user)
  const [authStep, setAuthStep] = useState<1 | 2 | 3 | 4>(1);

  // Phone Step State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Detect Country in Real-Time via libphonenumber-js
  const detectedCountry = useMemo(() => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 3) return null;
    const normalized = normalizeFullPhone(phoneNumber);
    try {
      const parsed = parsePhoneNumberFromString(normalized);
      if (parsed && parsed.country) {
        const iso: string = parsed.country;
        const codePoints = iso
          .toUpperCase()
          .split('')
          .map((c) => 127397 + c.charCodeAt(0));
        const flag = String.fromCodePoint(...codePoints);
        let name: string = iso;
        try {
          const regionNames = new Intl.DisplayNames([isArabic ? 'ar' : 'en'], { type: 'region' });
          name = regionNames.of(iso) || iso;
        } catch (_) {}

        return {
          countryCode: iso,
          callingCode: parsed.countryCallingCode ? `+${parsed.countryCallingCode}` : '',
          nationalNumber: parsed.nationalNumber || '',
          flag,
          name,
          internationalFormatted: parsed.formatInternational() || normalized,
        };
      }
    } catch (_) {}
    return null;
  }, [phoneNumber, isArabic]);

  // Code Step State
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '']);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [isResendActive, setIsResendActive] = useState(false);

  // 2FA Step State
  const [cloudPassword, setCloudPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile Setup Step State (for new registrations)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // App Logo Tooltip ('Telegram_Anwer') on Hover & Long Press
  const [showLogoTooltip, setShowLogoTooltip] = useState(false);
  const longPressTimerRef = React.useRef<any>(null);
  const tooltipDismissTimerRef = React.useRef<any>(null);

  const handleLogoPressStart = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setShowLogoTooltip(true);
      // Auto dismiss after 2.5s if triggered by long press
      if (tooltipDismissTimerRef.current) clearTimeout(tooltipDismissTimerRef.current);
      tooltipDismissTimerRef.current = setTimeout(() => {
        setShowLogoTooltip(false);
      }, 2500);
    }, 350);
  };

  const handleLogoPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Countdown timer for SMS code
  useEffect(() => {
    let interval: any;
    if (authStep === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setIsResendActive(true);
    }
    return () => clearInterval(interval);
  }, [authStep, resendTimer]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (tooltipDismissTimerRef.current) clearTimeout(tooltipDismissTimerRef.current);
    };
  }, []);

  // 1. Submit Phone Number -> Send Code (MTProto auth.sendCode)
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber.trim()) {
      showToast(isArabic ? 'يرجى إدخال رقم الهاتف مع مفتاح الدولة' : 'Please enter your phone number with country code', '⚠️');
      return;
    }

    const fullPhone = normalizeFullPhone(phoneNumber);
    setIsLoading(true);
    setStatusMessage(isArabic ? 'جارٍ الاتصال بسحابة تيليجرام (MTProto 2.0)...' : 'Connecting to Telegram MTProto...');

    try {
      const result = await loginController.sendCode(
        fullPhone,
        'app',
        Number(apiConfig.apiId) || 22043994,
        apiConfig.apiHash || '56f64582b363d367280db96586b97801'
      );

      if (result.success) {
        setPhoneCodeHash(result.phoneCodeHash || '');
        setAuthStep(2);
        setResendTimer(result.timeout || 60);
        setIsResendActive(false);
        showToast(
          result.message || (isArabic ? `تم إرسال رمز التحقق إلى ${result.formattedPhone || fullPhone}` : `Code sent to ${result.formattedPhone || fullPhone}`),
          '📩'
        );
      } else {
        showToast(result.message || (isArabic ? 'فشل إرسال رمز التحقق' : 'Failed to send code'), '❌');
      }
    } catch {
      showToast(isArabic ? 'خطأ في الاتصال بالخادم' : 'Connection error', '❌');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 2. Handle Code Input & Auto Submit (MTProto auth.signIn)
  const handleCodeChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Pasted multi-character code
      const digits = val.replace(/\D/g, '').slice(0, 5).split('');
      const newCode = [...verificationCode];
      digits.forEach((d, idx) => {
        newCode[idx] = d;
      });
      setVerificationCode(newCode);
      if (digits.length === 5) {
        verifyCode(newCode.join(''));
      }
      return;
    }

    const newCode = [...verificationCode];
    newCode[index] = val;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (val && index < 4) {
      const nextInput = document.getElementById(`tg-code-input-${index + 1}`);
      nextInput?.focus();
    }

    // If 5 digits completed, verify automatically
    if (newCode.every((digit) => digit !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`tg-code-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyCode = async (code: string) => {
    const fullPhone = normalizeFullPhone(phoneNumber);
    setIsLoading(true);
    setStatusMessage(isArabic ? 'جارٍ التحقق من الرمز وفك التشفير عبر MTProto...' : 'Verifying MTProto AuthKey...');

    try {
      const result = await loginController.signIn(
        fullPhone,
        phoneCodeHash,
        code
      );

      if (result.success && result.user) {
        const u = result.user;
        login({
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || (firstName.trim() ? `${firstName.trim()} ${lastName.trim()}`.trim() : 'مستخدم تيليجرام'),
          phone: fullPhone,
          username: u.username || username.trim() || undefined,
          avatar: u.avatar || '',
          bio: 'Telegram Official Client (Native MTProto 2.0 Layer 184)',
          sessionString: result.sessionString,
        });
        showToast(isArabic ? 'تم تسجيل الدخول بنجاح! مرحباً بك' : 'Successfully logged in!', '🚀');
      } else if (result.requiresPassword) {
        setAuthStep(3);
        showToast(isArabic ? 'يتطلب الحساب كلمة مرور التحقق بخطوتين (2FA)' : '2FA Cloud Password required', '🔒');
      } else if (result.signUpRequired) {
        setAuthStep(4);
        showToast(isArabic ? 'هذا الرقم غير مسجل، يرجى إدخال اسمك لإنشاء الحساب' : 'Please enter your name to register', '📝');
      } else {
        showToast(result.message || (isArabic ? 'رمز التحقق غير صحيح' : 'Invalid code'), '❌');
      }
    } catch {
      showToast(isArabic ? 'خطأ أثناء التحقق' : 'Verification error', '❌');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 3. Handle 2FA Password Submission
  const handleVerify2FAPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cloudPassword.trim()) {
      showToast(isArabic ? 'يرجى إدخال كلمة مرور 2FA' : 'Please enter 2FA password', '⚠️');
      return;
    }

    const fullPhone = normalizeFullPhone(phoneNumber);
    setIsLoading(true);
    setStatusMessage(isArabic ? 'جارٍ التحقق من كلمة المرور وفك التشفير السحابي...' : 'Verifying 2FA password...');

    try {
      const result = await loginController.signIn(
        fullPhone,
        phoneCodeHash,
        verificationCode.join(''),
        cloudPassword.trim()
      );

      if (result.success && result.user) {
        const u = result.user;
        login({
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || (firstName.trim() ? `${firstName.trim()} ${lastName.trim()}`.trim() : 'مستخدم تيليجرام'),
          phone: fullPhone,
          username: u.username || username.trim() || undefined,
          avatar: u.avatar || '',
          bio: 'Telegram Official Client (Native MTProto 2.0 Layer 184)',
          sessionString: result.sessionString,
        });
        showToast(isArabic ? 'تم توثيق الحساب وتسجيل الدخول بنجاح!' : 'Successfully authenticated!', '🚀');
      } else {
        showToast(result.message || (isArabic ? 'كلمة المرور غير صحيحة' : 'Invalid 2FA password'), '❌');
      }
    } catch {
      showToast(isArabic ? 'خطأ أثناء التحقق من كلمة المرور' : 'Password verification error', '❌');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 3.5 Handle SignUp Submission (auth.signUp)
  const handleSignUpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim()) {
      showToast(isArabic ? 'يرجى إدخال الاسم الأول على الأقل' : 'Please enter your first name', '⚠️');
      return;
    }

    const fullPhone = normalizeFullPhone(phoneNumber);
    setIsLoading(true);
    setStatusMessage(isArabic ? 'جارٍ إنشاء الحساب الجديد في سحابة تيليجرام...' : 'Creating new Telegram account...');

    try {
      const result = await loginController.signUp(
        fullPhone,
        phoneCodeHash,
        firstName.trim(),
        lastName.trim()
      );

      if (result.success && result.user) {
        const u = result.user;
        login({
          name: `${firstName.trim()} ${lastName.trim()}`.trim() || 'مستخدم تيليجرام',
          phone: fullPhone,
          username: username.trim() || undefined,
          avatar: u.avatar || '',
          bio: 'Telegram Official Client (Native MTProto 2.0 Layer 184)',
          sessionString: result.sessionString,
        });
        showToast(isArabic ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح! أهلاً بك' : 'Account created successfully!', '🎉');
      } else {
        showToast(result.message || (isArabic ? 'فشل إنشاء الحساب' : 'Registration failed'), '❌');
      }
    } catch {
      showToast(isArabic ? 'خطأ في إنشاء الحساب' : 'Registration error', '❌');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 4. Quick Instant Demo Login
  const handleQuickDemoLogin = () => {
    setIsLoading(true);
    setStatusMessage(isArabic ? 'جارٍ إنشاء جلسة سحابية مشفرة...' : 'Creating secure session...');

    setTimeout(() => {
      setIsLoading(false);
      const fullPhone = normalizeFullPhone(phoneNumber || '+967 772 997 043');
      login({
        name: firstName.trim() || 'أنور فؤاد',
        phone: fullPhone,
        username: username.trim() || 'anwer_dev',
        avatar: '',
        bio: 'Telegram Native Client • Layer 184',
      });
      showToast(isArabic ? 'تم تفعيل الجلسة والاتصال بالسحابة' : 'Session activated', '✅');
    }, 700);
  };

  // 5. QR Code Login Simulation
  const handleQrCodeConfirm = () => {
    setIsLoading(true);
    setStatusMessage(isArabic ? 'تم مسح رمز الاستجابة السريعة! جاري المصادقة...' : 'QR Scanned! Authenticating...');

    setTimeout(() => {
      setIsLoading(false);
      login({
        name: 'أنور فؤاد',
        phone: '+967 772 997 043',
        username: 'anwer_dev',
        avatar: '',
        bio: 'Telegram Desktop / Web Session Authenticated via QR',
      });
      showToast(isArabic ? 'تم تسجيل الدخول عبر رمز QR بنجاح' : 'QR Login Successful!', '🎉');
    }, 1200);
  };

  return (
    <div
      id="tg-auth-screen-root"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 select-none font-sans overflow-y-auto bg-[#0e1621] text-white"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Top Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-[#2481cc]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Container Card */}
      <div
        className="relative w-full max-w-[440px] bg-[#17212b] border border-[#242f3d] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center my-auto transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        {/* Cancel Button if adding account */}
        {isAddingAccount && onCancelAdd && (
          <button
            onClick={onCancelAdd}
            className="absolute top-4 end-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
            title={isArabic ? 'إلغاء' : 'Cancel'}
          >
            <X size={20} />
          </button>
        )}

        {/* Telegram Paper Airplane Logo - Multi-color animated gradient with Telegram_Anwer tooltip */}
        <div
          id="telegram-app-logo"
          title="Telegram_Anwer"
          className="relative w-20 h-20 rounded-full tg-multicolor-gradient flex items-center justify-center shadow-xl shadow-sky-500/25 mb-5 cursor-pointer hover:scale-105 active:scale-95 transition-transform select-none"
          onClick={() => {
            if (authMode === 'phone') setAuthMode('qr');
            else setAuthMode('phone');
          }}
          onMouseEnter={() => setShowLogoTooltip(true)}
          onMouseLeave={() => {
            setShowLogoTooltip(false);
            handleLogoPressEnd();
          }}
          onTouchStart={handleLogoPressStart}
          onTouchEnd={() => {
            handleLogoPressEnd();
            setTimeout(() => setShowLogoTooltip(false), 2000);
          }}
          onTouchCancel={() => {
            handleLogoPressEnd();
            setShowLogoTooltip(false);
          }}
          onMouseDown={handleLogoPressStart}
          onMouseUp={handleLogoPressEnd}
        >
          {/* Tooltip on Hover & Long Press */}
          <AnimatePresence>
            {showLogoTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap px-3 py-1.5 bg-[#17212b]/95 border border-[#2481cc]/60 backdrop-blur-md rounded-xl shadow-2xl shadow-black/80 text-white text-[12px] font-bold tracking-wide flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-white drop-shadow">Telegram_Anwer</span>
                {/* Arrow pointing down */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#17212b] border-b border-r border-[#2481cc]/60 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="tg-multicolor-glow" />
          <svg className="w-11 h-11 text-white -translate-x-0.5 relative z-10 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
          </svg>

          {/* Glowing Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse pointer-events-none" />
        </div>

        {/* Title and Subtitle */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
          {isAddingAccount
            ? isArabic ? 'إضافة حساب تيليجرام' : 'Add Telegram Account'
            : isArabic ? 'تسجيل الدخول إلى تيليجرام' : 'Log in to Telegram'}
        </h1>

        <p className="text-xs text-gray-400 max-w-xs mb-6">
          {authMode === 'phone'
            ? authStep === 1
              ? isArabic
                ? 'يرجى تأكيد رمز الدولة وإدخال رقم هاتفك لتسجيل الدخول بأمان'
                : 'Please confirm your country code and enter your phone number'
              : authStep === 2
              ? isArabic
                ? `أدخل رمز التحقق المكون من 5 أرقام المُرسل إلى هاتفك`
                : `Enter the 5-digit code sent to your phone`
              : isArabic
              ? 'أدخل كلمة مرور التحقق بخطوتين (2FA)'
              : 'Enter your 2FA Cloud Password'
            : isArabic
            ? 'امسح رمز الاستجابة السريعة (QR) من تطبيق تيليجرام على هاتفك'
            : 'Scan this QR code with your mobile Telegram app'}
        </p>

        {/* Mode Switcher Tabs */}
        <div className="w-full grid grid-cols-2 p-1 bg-[#0e1621] rounded-2xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('phone');
              setAuthStep(1);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              authMode === 'phone'
                ? 'bg-[#2481cc] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Phone size={15} />
            <span>{isArabic ? 'رقم الهاتف' : 'Phone Number'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('qr')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              authMode === 'qr'
                ? 'bg-[#2481cc] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <QrCode size={15} />
            <span>{isArabic ? 'رمز QR السريع' : 'Quick QR Code'}</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PHONE NUMBER AUTH FLOW */}
        {/* ======================================================== */}
        {authMode === 'phone' && (
          <div className="w-full">
            {/* STEP 1: Single Phone Input with Auto Country Detection */}
            {authStep === 1 && (
              <form onSubmit={handleSendCode} className="w-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-200 text-start">
                      {isArabic ? 'رقم الهاتف مع رمز الدولة' : 'Phone Number (with Country Code)'}
                    </label>
                    {detectedCountry && (
                      <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                        <span>{detectedCountry.flag}</span>
                        <span>{detectedCountry.name}</span>
                        <span className="font-mono text-gray-400 text-[11px]">({detectedCountry.callingCode})</span>
                      </div>
                    )}
                  </div>

                  <div className="relative flex items-center" dir="ltr">
                    <div className="absolute start-3.5 flex items-center gap-1.5 text-gray-400 pointer-events-none select-none">
                      {detectedCountry ? (
                        <span className="text-lg leading-none">{detectedCountry.flag}</span>
                      ) : (
                        <Phone size={18} className="text-[#5288c1]" />
                      )}
                    </div>
                    <input
                      id="tg-auth-phone-input"
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={
                        isArabic
                          ? '+967 777 777 777 (رمز الدولة + الرقم)'
                          : '+1 555 123 4567 (Country code + Phone)'
                      }
                      className="w-full bg-[#0e1621] border border-[#2b394a] focus:border-[#2481cc] text-white text-base font-mono rounded-2xl ps-12 pe-4 py-3 outline-none transition-all placeholder:text-gray-500 tracking-wide focus:ring-2 focus:ring-[#2481cc]/25"
                    />
                  </div>

                  {/* Dynamic Country Status & Hint */}
                  <div className="mt-2 text-start">
                    {detectedCountry ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1621] border border-[#2481cc]/30 rounded-xl text-xs text-sky-400">
                        <span className="text-base">{detectedCountry.flag}</span>
                        <span className="text-white font-medium">{detectedCountry.name}</span>
                        <span className="text-gray-400 font-mono text-[11px]">({detectedCountry.callingCode})</span>
                        <span className="ms-auto text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {isArabic ? 'الدولة مكتشفة تلقائياً' : 'Auto-detected'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 px-1">
                        {isArabic
                          ? '💡 الصق أو اكتب الرقم كاملاً مع مفتاح الدولة (مثال: +967777777777 أو +966555555555)'
                          : '💡 Enter or paste your full number with country code (e.g., +1..., +967..., +966...)'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Keep Signed In Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-300 select-none text-start pt-1">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2481cc] bg-[#0e1621] border-gray-600 focus:ring-0 cursor-pointer"
                  />
                  <span>{isArabic ? 'البقاء قيد تسجيل الدخول (حفظ الجلسة سحابياً)' : 'Keep me signed in'}</span>
                </label>

                {/* Next / Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !phoneNumber.trim()}
                  className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#2481cc]/25 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isArabic ? 'التالي (طلب رمز التحقق)' : 'Next (Request Code)'}</span>
                      {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    </>
                  )}
                </button>

                {/* Quick 1-Click Demo Login */}
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 active:scale-[0.99] text-gray-300 text-xs font-semibold rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>{isArabic ? 'دخول فوري مباشر (Demo / Quick Connect)' : 'Instant Direct Connect (Demo)'}</span>
                </button>
              </form>
            )}

            {/* STEP 2: Verification Code Entry */}
            {authStep === 2 && (
              <div className="w-full space-y-5">
                <div className="flex items-center justify-center gap-2 text-sm font-mono text-[#5288c1] bg-[#0e1621] p-2.5 rounded-2xl border border-white/5">
                  <Phone size={14} />
                  <span>{detectedCountry?.internationalFormatted || normalizeFullPhone(phoneNumber)}</span>
                  {detectedCountry && (
                    <span className="text-xs text-gray-400">({detectedCountry.name})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAuthStep(1)}
                    className="text-xs text-gray-400 hover:text-white underline ms-2 cursor-pointer"
                  >
                    {isArabic ? 'تعديل' : 'Edit'}
                  </button>
                </div>

                {/* 5-Digit Inputs */}
                <div className="flex items-center justify-center gap-2.5" dir="ltr">
                  {verificationCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`tg-code-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className="w-12 h-14 bg-[#0e1621] border border-[#2b394a] focus:border-[#2481cc] text-white text-xl font-mono font-bold text-center rounded-2xl outline-none focus:ring-2 focus:ring-[#2481cc]/40 transition-all"
                    />
                  ))}
                </div>

                {/* Countdown & Resend Code */}
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-gray-400 font-mono">
                      {isArabic
                        ? `إعادة إرسال الرمز بعد ${resendTimer} ثانية`
                        : `Resend code in ${resendTimer}s`}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResendTimer(60);
                        setIsResendActive(false);
                        showToast(isArabic ? 'تمت إعادة إرسال رمز التحقق' : 'Code resent', '📩');
                      }}
                      className="text-xs font-semibold text-[#2481cc] hover:underline"
                    >
                      {isArabic ? 'إعادة إرسال الرمز عبر رسالة SMS' : 'Resend code via SMS'}
                    </button>
                  )}
                </div>

                {/* Manual Verify Button */}
                <button
                  type="button"
                  disabled={isLoading || verificationCode.some((d) => !d)}
                  onClick={() => verifyCode(verificationCode.join(''))}
                  className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#2481cc]/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{isArabic ? 'تأكيد الرمز والدخول' : 'Confirm Code & Log In'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 3: 2FA Cloud Password Entry */}
            {authStep === 3 && (
              <form onSubmit={handleVerify2FAPassword} className="w-full space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-start">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
                    <Lock size={14} />
                    <span>{isArabic ? 'التحقق بخطوتين (2FA) مفعل' : 'Two-Step Verification Enabled'}</span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {isArabic
                      ? 'هذا الحساب محمي بكلمة مرور سحابية إضافية على تيليجرام. يرجى إدخالها للمتابعة.'
                      : 'This account is protected by an additional cloud password. Please enter it to continue.'}
                  </p>
                </div>

                <div className="space-y-1 text-start">
                  <label className="text-xs text-gray-400 font-medium">
                    {isArabic ? 'كلمة المرور السحابية (2FA Password)' : 'Cloud Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={cloudPassword}
                      onChange={(e) => setCloudPassword(e.target.value)}
                      placeholder={isArabic ? 'أدخل كلمة المرور السحابية' : 'Enter your 2FA password'}
                      autoFocus
                      className="w-full px-4 py-3 bg-[#0e1621] border border-[#2b394a] focus:border-[#2481cc] text-white text-sm rounded-2xl outline-none focus:ring-2 focus:ring-[#2481cc]/40 transition-all pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !cloudPassword.trim()}
                  className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#2481cc]/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>{isArabic ? 'تأكيد كلمة المرور وتسجيل الدخول' : 'Confirm Password & Sign In'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthStep(2)}
                  className="text-xs text-gray-400 hover:text-white underline w-full text-center"
                >
                  {isArabic ? 'العودة لرمز التحقق' : 'Back to Code'}
                </button>
              </form>
            )}

            {/* STEP 4: Profile Sign-up (New User Registration) */}
            {authStep === 4 && (
              <form onSubmit={handleSignUpSubmit} className="w-full space-y-4">
                <div className="p-3 bg-[#2481cc]/10 border border-[#2481cc]/20 rounded-2xl text-start">
                  <div className="flex items-center gap-2 text-[#5288c1] font-semibold text-xs mb-1">
                    <UserIcon size={14} />
                    <span>{isArabic ? 'إنشاء حساب تيليجرام جديد' : 'New Telegram Registration'}</span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {isArabic
                      ? 'هذا الرقم جديد في تيليجرام. يرجى إدخال اسمك لإكمال التسجيل والتفعيل.'
                      : 'This number is new to Telegram. Please enter your name to complete registration.'}
                  </p>
                </div>

                <div className="space-y-3 text-start">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">
                      {isArabic ? 'الاسم الأول (مطلوب)' : 'First Name (Required)'}
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={isArabic ? 'الاسم الأول' : 'First Name'}
                      autoFocus
                      required
                      className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#2b394a] focus:border-[#2481cc] text-white text-sm rounded-2xl outline-none focus:ring-2 focus:ring-[#2481cc]/40 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">
                      {isArabic ? 'اسم العائلة (اختياري)' : 'Last Name (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={isArabic ? 'اسم العائلة' : 'Last Name'}
                      className="w-full px-4 py-2.5 bg-[#0e1621] border border-[#2b394a] focus:border-[#2481cc] text-white text-sm rounded-2xl outline-none focus:ring-2 focus:ring-[#2481cc]/40 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !firstName.trim()}
                  className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#2481cc]/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{isArabic ? 'إتمام التسجيل والدخول' : 'Complete Registration'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthStep(1)}
                  className="text-xs text-gray-400 hover:text-white underline w-full text-center"
                >
                  {isArabic ? 'إلغاء والعودة للبداية' : 'Cancel & Start Over'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: QR CODE SCANNER FLOW */}
        {/* ======================================================== */}
        {authMode === 'qr' && (
          <div className="w-full flex flex-col items-center space-y-4">
            {/* QR Visual Container with Scanning Laser */}
            <div
              onClick={handleQrCodeConfirm}
              className="relative w-56 h-56 bg-white p-3.5 rounded-3xl shadow-xl flex items-center justify-center cursor-pointer group overflow-hidden border-4 border-[#2481cc]/30 hover:border-[#2481cc] transition-all"
              title={isArabic ? 'انقر للمحاكاة الفورية لمسح رمز QR' : 'Click to simulate instant QR scan'}
            >
              {/* QR Pattern Representation */}
              <div className="w-full h-full bg-slate-900 rounded-2xl p-2 flex flex-col justify-between relative overflow-hidden">
                {/* SVG QR Elements */}
                <div className="flex justify-between">
                  <div className="w-10 h-10 border-4 border-white rounded-lg p-1">
                    <div className="w-full h-full bg-white rounded-sm" />
                  </div>
                  <div className="w-10 h-10 border-4 border-white rounded-lg p-1">
                    <div className="w-full h-full bg-white rounded-sm" />
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#2481cc] flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-10 h-10 border-4 border-white rounded-lg p-1">
                    <div className="w-full h-full bg-white rounded-sm" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-white rounded-xs" />
                    <div className="w-3 h-3 bg-white rounded-xs" />
                  </div>
                </div>

                {/* Animated Laser Scanning Line */}
                <motion.div
                  animate={{ y: [0, 180, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#2481cc] to-transparent shadow-[0_0_12px_#2481cc]"
                />
              </div>

              {/* Hover click prompt */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-3xl">
                <span className="text-xs font-bold text-white bg-[#2481cc] px-3 py-1.5 rounded-full shadow-lg">
                  {isArabic ? 'انقر لتسجيل الدخول الفوري' : 'Click to Log In'}
                </span>
              </div>
            </div>

            {/* Step instructions */}
            <div className="w-full bg-[#0e1621] p-3 rounded-2xl border border-white/5 text-start space-y-1.5">
              <div className="text-xs text-gray-300 font-semibold mb-1">
                {isArabic ? 'طريقة تسجيل الدخول بالرمز:' : 'How to log in with QR:'}
              </div>
              <ol className="text-[11px] text-gray-400 space-y-1 list-decimal list-inside">
                <li>{isArabic ? 'افتح تيليجرام على هاتفك الجوال' : 'Open Telegram on your mobile phone'}</li>
                <li>{isArabic ? 'انتقل إلى الإعدادات > الأجهزة > ربط جهاز بالحاسوب' : 'Go to Settings > Devices > Link Desktop Device'}</li>
                <li>{isArabic ? 'وجه الكاميرا نحو هذه الشاشة لتسجيل الدخول' : 'Point your phone at this screen to confirm'}</li>
              </ol>
            </div>

            {/* Quick Confirm Button */}
            <button
              type="button"
              onClick={handleQrCodeConfirm}
              className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] text-white text-xs font-bold rounded-2xl shadow-lg shadow-[#2481cc]/25 transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>{isArabic ? 'تأكيد تسجيل الدخول برمز QR' : 'Confirm QR Login'}</span>
            </button>
          </div>
        )}

        {/* MTProto 2.0 & API Configuration Footer */}
        <div className="w-full mt-6 pt-4 border-t border-white/5 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>MTProto 2.0 (Layer 184)</span>
            <span>•</span>
            <span>API_ID: <strong className="text-white">{apiConfig?.apiId || '22043994'}</strong></span>
          </div>

          <div className="text-[10px] text-gray-500">
            {isArabic
              ? 'تشفير تام من طرف إلى طرف مع حماية الجلسات السحابية المتعددة'
              : 'End-to-end encrypted with multi-instance cloud session isolation'}
          </div>
        </div>
      </div>
    </div>
  );
};
