import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import QRCode from 'qrcode';
import {
  Phone,
  QrCode,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  X,
  MoreVertical,
  ChevronRight,
  Search,
  Moon,
  Sun,
  Delete,
  HelpCircle,
  RotateCw,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { loginController } from '../../core/messenger';

const normalizeFullPhone = (val: string): string => {
  let clean = (val || '').trim().replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('00')) clean = '+' + clean.slice(2);
  else if (clean && !clean.startsWith('+')) clean = '+' + clean;
  return clean;
};

interface CountryItem {
  nameAr: string;
  nameEn: string;
  code: string;
  callingCode: string;
  flag: string;
}

const COUNTRIES_LIST: CountryItem[] = [
  { nameAr: 'اليمن', nameEn: 'Yemen', code: 'YE', callingCode: '+967', flag: '🇾🇪' },
  { nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', code: 'SA', callingCode: '+966', flag: '🇸🇦' },
  { nameAr: 'مصر', nameEn: 'Egypt', code: 'EG', callingCode: '+20', flag: '🇪🇬' },
  { nameAr: 'الإمارات العربية المتحدة', nameEn: 'United Arab Emirates', code: 'AE', callingCode: '+971', flag: '🇦🇪' },
  { nameAr: 'العراق', nameEn: 'Iraq', code: 'IQ', callingCode: '+964', flag: '🇮🇶' },
  { nameAr: 'الأردن', nameEn: 'Jordan', code: 'JO', callingCode: '+962', flag: '🇯🇴' },
  { nameAr: 'سوريا', nameEn: 'Syria', code: 'SY', callingCode: '+963', flag: '🇸🇾' },
  { nameAr: 'الكويت', nameEn: 'Kuwait', code: 'KW', callingCode: '+965', flag: '🇰🇼' },
  { nameAr: 'عمان', nameEn: 'Oman', code: 'OM', callingCode: '+968', flag: '🇴🇲' },
  { nameAr: 'قطر', nameEn: 'Qatar', code: 'QA', callingCode: '+974', flag: '🇶🇦' },
  { nameAr: 'البحرين', nameEn: 'Bahrain', code: 'BH', callingCode: '+973', flag: '🇧🇭' },
  { nameAr: 'لبنان', nameEn: 'Lebanon', code: 'LB', callingCode: '+961', flag: '🇱🇧' },
  { nameAr: 'فلسطين', nameEn: 'Palestine', code: 'PS', callingCode: '+970', flag: '🇵🇸' },
  { nameAr: 'السودان', nameEn: 'Sudan', code: 'SD', callingCode: '+249', flag: '🇸🇩' },
  { nameAr: 'ليبيا', nameEn: 'Libya', code: 'LY', callingCode: '+218', flag: '🇱🇾' },
  { nameAr: 'تونس', nameEn: 'Tunisia', code: 'TN', callingCode: '+216', flag: '🇹🇳' },
  { nameAr: 'الجزائر', nameEn: 'Algeria', code: 'DZ', callingCode: '+213', flag: '🇩🇿' },
  { nameAr: 'المغرب', nameEn: 'Morocco', code: 'MA', callingCode: '+212', flag: '🇲🇦' },
  { nameAr: 'موريتانيا', nameEn: 'Mauritania', code: 'MR', callingCode: '+222', flag: '🇲🇷' },
  { nameAr: 'الصومال', nameEn: 'Somalia', code: 'SO', callingCode: '+252', flag: '🇸🇴' },
  { nameAr: 'تركيا', nameEn: 'Turkey', code: 'TR', callingCode: '+90', flag: '🇹🇷' },
  { nameAr: 'الولايات المتحدة', nameEn: 'United States', code: 'US', callingCode: '+1', flag: '🇺🇸' },
  { nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom', code: 'GB', callingCode: '+44', flag: '🇬🇧' },
  { nameAr: 'ألمانيا', nameEn: 'Germany', code: 'DE', callingCode: '+49', flag: '🇩🇪' },
  { nameAr: 'فرنسا', nameEn: 'France', code: 'FR', callingCode: '+33', flag: '🇫🇷' },
  { nameAr: 'روسيا', nameEn: 'Russia', code: 'RU', callingCode: '+7', flag: '🇷🇺' },
  { nameAr: 'كندا', nameEn: 'Canada', code: 'CA', callingCode: '+1', flag: '🇨🇦' },
  { nameAr: 'ماليزيا', nameEn: 'Malaysia', code: 'MY', callingCode: '+60', flag: '🇲🇾' },
  { nameAr: 'إندونيسيا', nameEn: 'Indonesia', code: 'ID', callingCode: '+62', flag: '🇮🇩' },
  { nameAr: 'الهند', nameEn: 'India', code: 'IN', callingCode: '+91', flag: '🇮🇳' },
  { nameAr: 'الصين', nameEn: 'China', code: 'CN', callingCode: '+86', flag: '🇨🇳' },
  { nameAr: 'إسبانيا', nameEn: 'Spain', code: 'ES', callingCode: '+34', flag: '🇪🇸' },
  { nameAr: 'إيطاليا', nameEn: 'Italy', code: 'IT', callingCode: '+39', flag: '🇮🇹' },
  { nameAr: 'البرازيل', nameEn: 'Brazil', code: 'BR', callingCode: '+55', flag: '🇧🇷' },
];

const CAROUSEL_SLIDES = [
  {
    titleAr: 'تيليجرام',
    titleEn: 'Telegram',
    descAr: 'تطبيق المراسلة الأسرع في العالم. إنه مجاني وآمن.',
    descEn: "The world's fastest messaging app. It is free and secure.",
  },
  {
    titleAr: 'سريع',
    titleEn: 'Fast',
    descAr: 'تيليجرام يوصل الرسائل أسرع من أي تطبيق آخر.',
    descEn: 'Telegram delivers messages faster than any other application.',
  },
  {
    titleAr: 'مجاني',
    titleEn: 'Free',
    descAr: 'تيليجرام مجاني للأبد. لا إعلانات. لا اشتراكات.',
    descEn: 'Telegram is free forever. No ads. No subscription fees.',
  },
  {
    titleAr: 'قوي',
    titleEn: 'Powerful',
    descAr: 'لا توجد أي قيود على أحجام وسائطك ومحادثاتك.',
    descEn: 'Telegram has no limits on the size of your media and chats.',
  },
  {
    titleAr: 'آمن',
    titleEn: 'Secure',
    descAr: 'يحافظ تيليجرام على رسائلك آمنة من هجمات المخترقين.',
    descEn: 'Telegram keeps your messages safe from hacker attacks.',
  },
  {
    titleAr: 'تخزين سحابي',
    titleEn: 'Cloud-Based',
    descAr: 'تيليجرام يتيح لك الوصول لرسائلك من أجهزة متعددة.',
    descEn: 'Telegram lets you access your messages from multiple devices.',
  },
];

const NUMPAD_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '', letters: '', isEmpty: true },
  { digit: '0', letters: '+', isZeroPlus: true },
  { digit: 'backspace', letters: '', isBackspace: true },
];

/**
 * Illustrated Telegram Cloud graphic with soft messaging icons
 * exactly matching Screenshot 1.
 */
const TelegramCloudGraphic: React.FC = () => (
  <div className="relative w-64 h-44 sm:w-72 sm:h-48 mx-auto my-6 flex items-center justify-center select-none">
    <svg
      viewBox="0 0 280 180"
      className="w-full h-full drop-shadow-md"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cloud-gradient" x1="20" y1="20" x2="260" y2="182" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AB0EB" />
          <stop offset="1" stopColor="#1E96D3" />
        </linearGradient>
      </defs>
      {/* Cloud Main Organic Shape */}
      <path
        d="M216 154H70C42 154 20 131.5 20 104C20 78 40 57 66 54.5C72.5 31 93.5 14 118 14C144 14 165.5 31.5 171.5 56C176 54 181 53 186 53C207 53 224 70 224 91C224 92.5 223.8 94 223.5 95.5C243.5 98.5 259 115.5 259 136.5C259 158 241.5 175 220 175H70"
        fill="url(#cloud-gradient)"
      />
      {/* 1. Camera (center-left) */}
      <g transform="translate(108, 48) scale(1.15)" fill="#ffffff" opacity="0.4">
        <path d="M4 11C4 8.79 5.79 7 8 7H9.5L11.2 4.5H16.8L18.5 7H20C22.21 7 24 8.79 24 11V19C24 21.21 22.21 23 20 23H8C5.79 23 4 21.21 4 19V11Z" />
        <circle cx="14" cy="15" r="4.5" fill="#1E96D3" />
        <circle cx="14" cy="15" r="2.5" fill="#ffffff" />
      </g>
      {/* 2. Video camera (bottom-left) */}
      <g transform="translate(82, 98) scale(1.15)" fill="#ffffff" opacity="0.4">
        <rect x="2" y="5" width="16" height="13" rx="3.5" />
        <path d="M19 8.5L25 5V18L19 14.5V8.5Z" />
      </g>
      {/* 3. Smiley face (center) */}
      <g transform="translate(140, 84) scale(1.25)" stroke="#ffffff" strokeWidth="2.4" fill="none" opacity="0.4">
        <circle cx="14" cy="14" r="11" />
        <circle cx="10" cy="11" r="1.3" fill="#ffffff" stroke="none" />
        <circle cx="18" cy="11" r="1.3" fill="#ffffff" stroke="none" />
        <path d="M9 16C10.5 19 14 20 15 20C16 20 19.5 19 21 16" strokeLinecap="round" />
      </g>
      {/* 4. Speech bubble with chat dots (top-right) */}
      <g transform="translate(148, 30) scale(1.1)" fill="#ffffff" opacity="0.4">
        <path d="M4 4C4 1.79 5.79 0 8 0H18C20.21 0 22 1.79 22 4V12C22 14.21 20.21 16 18 16H10L5 19V16H8C5.79 16 4 14.21 4 12V4Z" />
        <circle cx="9" cy="8" r="1.2" fill="#1E96D3" />
        <circle cx="13" cy="8" r="1.2" fill="#1E96D3" />
        <circle cx="17" cy="8" r="1.2" fill="#1E96D3" />
      </g>
      {/* 5. Pencil (bottom-right) */}
      <g transform="translate(182, 92) rotate(35) scale(1.1)" fill="#ffffff" opacity="0.4">
        <path d="M2 3L14 3L18 0L20 2L16 6L16 18L14 20L2 20C0.9 20 0 19.1 0 18L0 5C0 3.9 0.9 3 2 3Z" />
      </g>
    </svg>
  </div>
);

interface TelegramAuthScreenProps {
  isAddingAccount?: boolean;
  onCancelAdd?: () => void;
}

export const TelegramAuthScreen: React.FC<TelegramAuthScreenProps> = ({
  isAddingAccount = false,
  onCancelAdd,
}) => {
  const { login, apiConfig, settings, showToast, setActiveModal } = useTelegram();
  const [isArabic, setIsArabic] = useState<boolean>(settings.language === 'ar');

  // Dark/Light Theme State for Auth Screen
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Active Screen View: 'intro' | 'phone' | 'qr'
  const [currentView, setCurrentView] = useState<'intro' | 'phone' | 'qr'>(() => {
    return isAddingAccount ? 'phone' : 'intro';
  });

  // Carousel Slide Index (0 to 5, default to 5 "Cloud Storage" like Screenshot 1)
  const [activeSlide, setActiveSlide] = useState<number>(5);

  // Auth Step: 1 = Phone Input, 2 = SMS Code, 3 = 2FA Password, 4 = Sign-up Name
  const [authStep, setAuthStep] = useState<1 | 2 | 3 | 4>(1);

  // Phone Step State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES_LIST[0]); // Yemen default
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [compatibilityMode, setCompatibilityMode] = useState(false);

  // Three dots more options popover
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Confirmation Dialog ("هل هذا هو الرقم الصحيح؟" - Screenshot 4)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Code Step State
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '']);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [isResendActive, setIsResendActive] = useState(false);

  // 2FA Step State
  const [cloudPassword, setCloudPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile Setup Step State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmedSuccess, setIsConfirmedSuccess] = useState(false);

  // Close more menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMoreMenuOpen]);

  // Real-time Country detection as user enters digits
  useEffect(() => {
    if (!phoneNumber) return;
    const clean = normalizeFullPhone(phoneNumber);
    const matched = COUNTRIES_LIST.find((c) => clean.startsWith(c.callingCode));
    if (matched && matched.code !== selectedCountry.code) {
      setSelectedCountry(matched);
    }
  }, [phoneNumber, selectedCountry.code]);

  // Code resend timer countdown
  useEffect(() => {
    let interval: any;
    if (authStep === 2 && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    } else if (resendTimer === 0) {
      setIsResendActive(true);
    }
    return () => clearInterval(interval);
  }, [authStep, resendTimer]);

  // Filtered countries for search modal
  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return COUNTRIES_LIST;
    const q = countrySearchQuery.toLowerCase().trim();
    return COUNTRIES_LIST.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearchQuery]);

  // Numpad button click handler
  const handleNumpadPress = (key: typeof NUMPAD_KEYS[0]) => {
    if (key.isEmpty) return;

    if (key.isBackspace) {
      if (authStep === 1) {
        setPhoneNumber((prev) => prev.slice(0, -1));
      } else if (authStep === 2) {
        // Find last filled code index and clear it
        const next = [...verificationCode];
        for (let i = 4; i >= 0; i--) {
          if (next[i]) {
            next[i] = '';
            break;
          }
        }
        setVerificationCode(next);
      }
      return;
    }

    const val = key.isZeroPlus ? '0' : key.digit;

    if (authStep === 1) {
      setPhoneNumber((prev) => prev + val);
    } else if (authStep === 2) {
      // Find first empty code slot
      const next = [...verificationCode];
      const emptyIdx = next.findIndex((d) => !d);
      if (emptyIdx !== -1) {
        next[emptyIdx] = val;
        setVerificationCode(next);
        if (emptyIdx === 4 && next.every((d) => d !== '')) {
          verifyCode(next.join(''));
        }
      }
    }
  };

  // Open confirmation modal when clicking the arrow button on phone screen
  const handleProceedPhone = () => {
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 6) {
      showToast(
        isArabic ? 'يرجى إدخال رقم هاتف صالح' : 'Please enter a valid phone number',
        '⚠️'
      );
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // 1. Submit Phone Number -> Send Code (MTProto auth.sendCode)
  const handleSendCode = async () => {
    setIsConfirmModalOpen(false);
    setIsLoading(true);
    setIsConfirmedSuccess(true);

    const fullPhone = normalizeFullPhone(phoneNumber);

    try {
      const result = await loginController.sendCode(
        fullPhone,
        'app',
        Number(apiConfig.apiId) || 34773007,
        apiConfig.apiHash || '2a6b16abed75c3f6898ee79e9237fd25'
      );

      if (result.success) {
        setPhoneCodeHash(result.phoneCodeHash || '');
        setAuthStep(2);
        setResendTimer(result.timeout || 60);
        setIsResendActive(false);
        showToast(
          result.message || (isArabic ? `تم إرسال رمز التحقق إلى ${fullPhone}` : `Code sent to ${fullPhone}`),
          '📩'
        );
      } else {
        showToast(result.message || (isArabic ? 'فشل إرسال رمز التحقق' : 'Failed to send code'), '❌');
        setIsConfirmedSuccess(false);
      }
    } catch {
      showToast(isArabic ? 'خطأ في الاتصال بالخادم' : 'Connection error', '❌');
      setIsConfirmedSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify SMS Code
  const verifyCode = async (code: string) => {
    const fullPhone = normalizeFullPhone(phoneNumber);
    setIsLoading(true);

    try {
      const result = await loginController.signIn(fullPhone, phoneCodeHash, code);

      if (result.success && result.user) {
        const u = result.user;
        login({
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || (firstName.trim() ? `${firstName.trim()} ${lastName.trim()}`.trim() : 'مستخدم تيليجرام'),
          phone: fullPhone,
          username: u.username || undefined,
          avatar: u.avatar || '',
          bio: 'Telegram MTProto Layer 184 Authenticated Session',
          sessionString: result.sessionString,
        });
        showToast(isArabic ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!', '🎉');
      } else if (result.requiresPassword) {
        setAuthStep(3);
        showToast(isArabic ? 'هذا الحساب محمي بالتحقق بخطوتين (2FA)' : '2FA Password Required', '🔐');
      } else if (result.signUpRequired) {
        setAuthStep(4);
        showToast(isArabic ? 'حساب جديد، يرجى إدخال اسمك' : 'New account, enter your name', '👤');
      } else {
        showToast(result.message || (isArabic ? 'رمز التحقق غير صحيح' : 'Invalid code'), '❌');
        setVerificationCode(['', '', '', '', '']);
      }
    } catch {
      showToast(isArabic ? 'خطأ أثناء التحقق' : 'Verification error', '❌');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify 2FA Password
  const handleVerify2FAPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudPassword.trim()) return;

    setIsLoading(true);
    const fullPhone = normalizeFullPhone(phoneNumber);

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
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'مستخدم تيليجرام',
          phone: fullPhone,
          username: u.username || undefined,
          avatar: u.avatar || '',
          bio: 'Telegram MTProto Layer 184 Authenticated Session',
          sessionString: result.sessionString,
        });
        showToast(isArabic ? 'تم تأكيد كلمة المرور وتسجيل الدخول!' : '2FA Verified Successfully!', '🎉');
      } else {
        showToast(result.message || (isArabic ? 'كلمة المرور غير صحيحة' : 'Incorrect password'), '❌');
      }
    } catch {
      showToast(isArabic ? 'خطأ في التحقق من كلمة المرور' : 'Password verification error', '❌');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Sign-up Name
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    setIsLoading(true);
    const fullPhone = normalizeFullPhone(phoneNumber);

    try {
      const result = await loginController.signUp(fullPhone, phoneCodeHash, firstName.trim(), lastName.trim());
      if (result.success && result.user) {
        const u = result.user;
        login({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone: fullPhone,
          username: u.username || undefined,
          avatar: '',
          bio: 'New Telegram Account',
          sessionString: result.sessionString,
        });
        showToast(isArabic ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح!' : 'Account created successfully!', '🎉');
      } else {
        showToast(result.message || (isArabic ? 'فشل إنشاء الحساب' : 'Failed to sign up'), '❌');
      }
    } catch {
      showToast(isArabic ? 'خطأ في إنشاء الحساب' : 'Sign up error', '❌');
    } finally {
      setIsLoading(false);
    }
  };

  // QR Code Generation state
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrSessionId, setQrSessionId] = useState<string>('');

  const loadQrCode = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/auth/qr/export', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.token) {
        const tgLink = `tg://login?token=${data.token}`;
        const url = await QRCode.toDataURL(tgLink, {
          width: 260,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrCodeUrl(url);
        setQrSessionId(data.sessionId || data.token);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (currentView === 'qr') {
      loadQrCode();
    }
  }, [currentView, loadQrCode]);

  return (
    <div
      id="tg-official-auth-root"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto select-none font-sans transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0e1621] text-white' : 'bg-white text-gray-900'
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* ======================================================== */}
      {/* SCREEN 1: WELCOME INTRO & CAROUSEL (Screenshot 1) */}
      {/* ======================================================== */}
      {currentView === 'intro' && (
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200">
          {/* Top Right: Theme Toggle Icon (Moon/Stars) */}
          <div className="flex items-center justify-end w-full pt-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-sky-500 transition-colors"
              title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6 fill-current" />}
            </button>
          </div>

          {/* Center Content: Animated Cloud Graphic, Title, Description, Dots */}
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
            {/* Illustrated Telegram Cloud with inside icons */}
            <TelegramCloudGraphic />

            {/* Slide Title */}
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight mb-2">
              {isArabic ? CAROUSEL_SLIDES[activeSlide].titleAr : CAROUSEL_SLIDES[activeSlide].titleEn}
            </h1>

            {/* Slide Description */}
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
              {isArabic ? CAROUSEL_SLIDES[activeSlide].descAr : CAROUSEL_SLIDES[activeSlide].descEn}
            </p>

            {/* Carousel Pagination Dots (6 Dots) */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {CAROUSEL_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`transition-all rounded-full ${
                    activeSlide === idx
                      ? 'w-2 h-2 bg-[#3390ec]'
                      : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Area: Language Switch Link & Start Messaging Pill Button */}
          <div className="w-full flex flex-col items-center gap-4 pb-4">
            {/* Language Toggle Link */}
            <button
              onClick={() => setIsArabic(!isArabic)}
              className="text-sm font-semibold text-[#3390ec] hover:underline transition-colors"
            >
              {isArabic ? 'Continue in English' : 'المتابعة باللغة العربية'}
            </button>

            {/* Start Messaging Main Button */}
            <button
              id="tg-start-messaging-btn"
              onClick={() => {
                setCurrentView('phone');
                setPhoneNumber(selectedCountry.callingCode);
              }}
              className="w-full py-3.5 px-6 rounded-full font-bold text-white text-base shadow-lg bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#249bd4] hover:to-[#1e8bc2] active:scale-[0.99] transition-all cursor-pointer"
            >
              {isArabic ? 'بدء المراسلة' : 'Start Messaging'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 2: PHONE NUMBER ENTRY SCREEN (Screenshot 2) */}
      {/* ======================================================== */}
      {currentView === 'phone' && authStep === 1 && (
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar: Back Arrow & Three Dots More Menu */}
          <div className="flex items-center justify-between w-full h-12 relative">
            <button
              onClick={() => {
                if (isAddingAccount && onCancelAdd) onCancelAdd();
                else setCurrentView('intro');
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
              title={isArabic ? 'رجوع' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>

            {/* Three Dots More Menu (Screenshot 3) */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
                title={isArabic ? 'خيارات إضافية' : 'More options'}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Popover Menu matching Screenshot 3 */}
              <AnimatePresence>
                {isMoreMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute end-0 top-11 w-64 rounded-2xl shadow-2xl py-2 z-50 border bg-white dark:bg-[#1f2c3a] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    {/* Item 1: Proxy Settings */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setActiveModal('api-config' as any);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium text-start"
                    >
                      <span className="truncate">{isArabic ? 'إعدادات الخادم الوسيط' : 'Proxy Settings'}</span>
                      <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300 shrink-0 ms-2" />
                    </button>

                    {/* Item 2: Log in by QR code */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setCurrentView('qr');
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium text-start"
                    >
                      <span className="truncate">{isArabic ? 'تسجيل الدخول برمز QR' : 'Log in by QR code'}</span>
                      <QrCode className="w-5 h-5 text-gray-600 dark:text-gray-300 shrink-0 ms-2" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center Form: Title, Subtitle, Country Box, Phone Box, Compatibility Mode */}
          <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto my-auto text-center">
            {/* Title */}
            <h1 className="text-2xl font-bold mb-2">
              {isArabic ? 'رقم هاتفك' : 'Your phone number'}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 px-4 leading-relaxed">
              {isArabic
                ? 'يرجى تأكيد مفتاح بلدك وإدخال رقم هاتفك.'
                : 'Please confirm your country code and enter your phone number.'}
            </p>

            {/* 1. Country Selector Box */}
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              className="w-full mb-4 px-4 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#17212b] hover:border-[#3390ec] flex items-center justify-between text-start transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">{selectedCountry.flag}</span>
                <span className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">
                  {isArabic ? selectedCountry.nameAr : selectedCountry.nameEn}
                </span>
                <span className="text-xs text-gray-400 font-mono">({selectedCountry.callingCode})</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 rtl:rotate-180 shrink-0" />
            </button>

            {/* 2. Floating Label Phone Input Box */}
            <div className="relative w-full mb-4">
              <div className="relative rounded-xl border-2 border-[#3390ec] bg-white dark:bg-[#17212b] px-4 py-3 text-start flex items-center">
                {/* Floating Label Cutout on Top */}
                <span className="absolute -top-2.5 start-3 px-1 text-[11px] font-semibold text-[#3390ec] bg-white dark:bg-[#17212b]">
                  {isArabic ? 'رقم الهاتف' : 'Phone number'}
                </span>
                <span className="text-base font-bold text-gray-800 dark:text-gray-100 me-1.5 select-none font-mono">
                  +
                </span>
                <input
                  id="tg-official-phone-input"
                  type="tel"
                  autoFocus
                  dir="ltr"
                  value={phoneNumber.replace(/^\+/, '')}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^\d]/g, '');
                    setPhoneNumber(cleanVal ? `+${cleanVal}` : '');
                  }}
                  placeholder=""
                  className="w-full bg-transparent text-base font-bold text-gray-900 dark:text-white font-mono outline-none tracking-wide"
                />
              </div>
            </div>

            {/* 3. Compatibility Mode Checkbox */}
            <div className="flex items-center justify-start gap-2 mb-6 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={compatibilityMode}
                  onChange={(e) => setCompatibilityMode(e.target.checked)}
                  className="w-4 h-4 rounded text-[#3390ec] border-gray-300 dark:border-gray-600 focus:ring-0 cursor-pointer"
                />
                <span>Compatibility mode</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    isArabic
                      ? 'وضع التوافق يتيح استخدام بروتوكول بديل للاتصال بشبكة تيليجرام'
                      : 'Compatibility mode uses an alternative transport for restricted networks',
                    'ℹ️'
                  )
                }
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floating Action Button (Arrow / Checkmark FAB - Screenshot 2 & 4) */}
          <div className="w-full max-w-sm mx-auto flex justify-start mb-3">
            <button
              id="tg-auth-next-fab"
              onClick={handleProceedPhone}
              disabled={isLoading || !phoneNumber.replace(/\D/g, '').length}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all cursor-pointer ${
                isConfirmedSuccess
                  ? 'bg-emerald-500'
                  : 'bg-[#3390ec] hover:bg-[#2884df] active:scale-95 disabled:opacity-50'
              }`}
              title={isArabic ? 'متابعة' : 'Continue'}
            >
              {isLoading ? (
                <RotateCw className="w-6 h-6 animate-spin text-white" />
              ) : isConfirmedSuccess ? (
                <Check className="w-7 h-7 text-white stroke-[3]" />
              ) : (
                <ArrowRight className="w-6 h-6 rtl:rotate-180" />
              )}
            </button>
          </div>

          {/* Bottom On-Screen Numpad matching Screenshot 2 exactly */}
          <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-2 pb-2">
            {NUMPAD_KEYS.map((k, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleNumpadPress(k)}
                disabled={k.isEmpty}
                className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all select-none ${
                  k.isEmpty
                    ? 'invisible'
                    : 'bg-[#f4f4f5] dark:bg-[#232e3c] hover:bg-[#e4e4e7] dark:hover:bg-[#2c394b] active:scale-95 text-gray-800 dark:text-gray-100 shadow-sm cursor-pointer'
                }`}
              >
                {k.isBackspace ? (
                  <Delete className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                ) : (
                  <>
                    <span className="text-xl font-bold leading-tight">{k.digit}</span>
                    {k.letters && (
                      <span className="text-[10px] text-gray-400 font-semibold tracking-wider">
                        {k.letters}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 4: CONFIRMATION DIALOG (Screenshot 4) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white dark:bg-[#17212b] rounded-3xl p-6 shadow-2xl max-w-xs w-full text-start border border-black/5 dark:border-white/10"
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                {isArabic ? 'هل هذا هو الرقم الصحيح؟' : 'Is this the correct number?'}
              </h2>

              <p className="text-lg font-bold text-[#3390ec] font-mono tracking-wider mb-6" dir="ltr">
                {normalizeFullPhone(phoneNumber)}
              </p>

              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="text-sm font-bold text-[#3390ec] hover:underline cursor-pointer"
                >
                  {isArabic ? 'تعديل' : 'Edit'}
                </button>
                <button
                  onClick={handleSendCode}
                  className="text-sm font-bold text-[#3390ec] hover:underline cursor-pointer"
                >
                  {isArabic ? 'نعم' : 'Yes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* COUNTRY SELECTION MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#17212b] animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="font-bold text-base">
                {isArabic ? 'اختر الدولة' : 'Select Country'}
              </span>
              <button
                onClick={() => setIsCountryModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative flex items-center bg-gray-100 dark:bg-[#0e1621] rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 me-2" />
                <input
                  type="text"
                  autoFocus
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  placeholder={isArabic ? 'البحث عن دولة أو رمز...' : 'Search country or code...'}
                  className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Countries List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setPhoneNumber(c.callingCode);
                    setIsCountryModalOpen(false);
                    setCountrySearchQuery('');
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-start"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.flag}</span>
                    <span className="text-sm font-medium">{isArabic ? c.nameAr : c.nameEn}</span>
                  </div>
                  <span className="text-sm font-mono text-gray-400">{c.callingCode}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* STEP 2: VERIFICATION CODE INPUT */}
      {/* ======================================================== */}
      {currentView === 'phone' && authStep === 2 && (
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between w-full h-12">
            <button
              onClick={() => {
                setAuthStep(1);
                setIsConfirmedSuccess(false);
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <span className="font-bold text-sm">{normalizeFullPhone(phoneNumber)}</span>
            <div className="w-9" />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto my-auto text-center">
            <h1 className="text-2xl font-bold mb-2">
              {normalizeFullPhone(phoneNumber)}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-8 px-4 leading-relaxed">
              {isArabic
                ? 'أرسلنا الرمز إلى تطبيق تيليجرام على أجهزتك الأخرى.'
                : "We've sent the code to the Telegram app on your other device."}
            </p>

            {/* 5 Code Boxes */}
            <div className="flex items-center justify-center gap-3 mb-6" dir="ltr">
              {verificationCode.map((digit, idx) => (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold font-mono border-2 transition-all ${
                    digit
                      ? 'border-[#3390ec] text-gray-900 dark:text-white bg-[#3390ec]/5'
                      : 'border-gray-300 dark:border-gray-700 text-gray-400'
                  }`}
                >
                  {digit || ''}
                </div>
              ))}
            </div>

            {/* Resend Countdown */}
            <div className="text-center mb-4">
              {resendTimer > 0 ? (
                <p className="text-xs text-gray-400 font-mono">
                  {isArabic ? `إعادة الإرسال بعد ${resendTimer} ثانية` : `Resend code in ${resendTimer}s`}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setResendTimer(60);
                    setIsResendActive(false);
                    showToast(isArabic ? 'تمت إعادة إرسال الرمز' : 'Code resent', '📩');
                  }}
                  className="text-xs font-semibold text-[#3390ec] hover:underline"
                >
                  {isArabic ? 'إرسال الرمز عبر رسالة SMS' : 'Send code via SMS'}
                </button>
              )}
            </div>
          </div>

          {/* On-screen numpad for code entry */}
          <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-2 pb-2">
            {NUMPAD_KEYS.map((k, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleNumpadPress(k)}
                disabled={k.isEmpty}
                className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all select-none ${
                  k.isEmpty
                    ? 'invisible'
                    : 'bg-[#f4f4f5] dark:bg-[#232e3c] hover:bg-[#e4e4e7] dark:hover:bg-[#2c394b] active:scale-95 text-gray-800 dark:text-gray-100 shadow-sm cursor-pointer'
                }`}
              >
                {k.isBackspace ? (
                  <Delete className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                ) : (
                  <>
                    <span className="text-xl font-bold leading-tight">{k.digit}</span>
                    {k.letters && (
                      <span className="text-[10px] text-gray-400 font-semibold tracking-wider">
                        {k.letters}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: 2FA PASSWORD INPUT */}
      {/* ======================================================== */}
      {currentView === 'phone' && authStep === 3 && (
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-center p-6 sm:p-8 animate-in fade-in">
          <form onSubmit={handleVerify2FAPassword} className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-[#3390ec]/15 text-[#3390ec] flex items-center justify-center mx-auto mb-2">
              <Lock className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold">
              {isArabic ? 'التحقق بخطوتين' : 'Two-Step Verification'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              {isArabic
                ? 'حسابك محمي بكلمة مرور سحابية إضافية. يرجى إدخالها.'
                : 'Your account is protected by an additional cloud password. Please enter it.'}
            </p>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={cloudPassword}
                onChange={(e) => setCloudPassword(e.target.value)}
                placeholder={isArabic ? 'كلمة المرور' : 'Password'}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#17212b] text-base outline-none focus:border-[#3390ec]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !cloudPassword.trim()}
              className="w-full py-3.5 rounded-full font-bold text-white bg-[#3390ec] hover:bg-[#2884df] transition-all disabled:opacity-50"
            >
              {isLoading ? '...' : isArabic ? 'تأكيد ودخول' : 'Confirm'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: SIGN UP PROFILE (New Users) */}
      {/* ======================================================== */}
      {currentView === 'phone' && authStep === 4 && (
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-center p-6 sm:p-8 animate-in fade-in">
          <form onSubmit={handleSignUpSubmit} className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-[#3390ec]/15 text-[#3390ec] flex items-center justify-center mx-auto mb-2">
              <UserIcon className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold">
              {isArabic ? 'معلومات حسابك' : 'Your Information'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              {isArabic
                ? 'أدخل اسمك وصورة لملفك الشخصي على تيليجرام.'
                : 'Enter your name and profile info to finish setup.'}
            </p>

            <input
              type="text"
              required
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={isArabic ? 'الاسم الأول (مطلوب)' : 'First Name (required)'}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#17212b] text-base outline-none focus:border-[#3390ec]"
            />

            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={isArabic ? 'اسم العائلة (اختياري)' : 'Last Name (optional)'}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#17212b] text-base outline-none focus:border-[#3390ec]"
            />

            <button
              type="submit"
              disabled={isLoading || !firstName.trim()}
              className="w-full py-3.5 rounded-full font-bold text-white bg-[#3390ec] hover:bg-[#2884df] transition-all disabled:opacity-50"
            >
              {isLoading ? '...' : isArabic ? 'إنهاء والتسجيل' : 'Finish'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* QR CODE LOGIN SCREEN */}
      {/* ======================================================== */}
      {currentView === 'qr' && (
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-between p-6 sm:p-8 animate-in fade-in">
          <div className="flex items-center justify-between w-full h-12">
            <button
              onClick={() => setCurrentView('phone')}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <span className="font-bold text-sm">
              {isArabic ? 'تسجيل الدخول برمز QR' : 'Log in by QR code'}
            </span>
            <div className="w-9" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
            {qrCodeUrl ? (
              <div className="p-4 bg-white rounded-3xl shadow-xl border border-gray-200 mb-6">
                <img src={qrCodeUrl} alt="QR Code" className="w-56 h-56" />
              </div>
            ) : (
              <div className="w-56 h-56 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse flex items-center justify-center mb-6">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            )}

            <h2 className="text-xl font-bold mb-3">
              {isArabic ? 'تسجيل الدخول السريع عبر QR' : 'Log in to Telegram by QR Code'}
            </h2>

            <ol className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs space-y-1.5 text-start px-2 mb-6">
              <li>1. {isArabic ? 'افتح تطبيق تيليجرام على هاتفك' : 'Open Telegram on your phone'}</li>
              <li>
                2. {isArabic ? 'اذهب إلى الإعدادات > الأجهزة > ربط جهاز' : 'Go to Settings > Devices > Link Desktop Device'}
              </li>
              <li>3. {isArabic ? 'وجه كاميرا هاتفك نحو هذا الرمز' : 'Point your phone at this screen to confirm'}</li>
            </ol>
          </div>

          <div className="w-full pb-4">
            <button
              onClick={() => setCurrentView('phone')}
              className="w-full py-3.5 rounded-full font-bold text-[#3390ec] hover:bg-[#3390ec]/10 transition-colors"
            >
              {isArabic ? 'تسجيل الدخول برقم الهاتف' : 'Log in by phone number'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
