import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  AtSign,
  Phone,
  FileText,
  Check,
  RefreshCw,
  Sparkles,
  Palette,
  Type,
  ShieldCheck,
  Info,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import {
  fetchAccountSettingsState,
  sendAccountSettingsUpdate,
  updateTelegramProfile,
  TelegramAccountProfile,
} from '../../services/accountSync';

interface AccountProfileSettingsProps {
  onBack?: () => void;
  onNavigateTo2FA?: () => void;
  onNavigateToPrivacy?: () => void;
}

interface TelegramAccountState {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  phone?: string;
  about?: string;
  avatar?: string;
  isPremium?: boolean;
  isVerified?: boolean;
}

export const AccountProfileSettings: React.FC<AccountProfileSettingsProps> = ({
  onBack,
  onNavigateTo2FA,
  onNavigateToPrivacy,
}) => {
  const {
    currentUser,
    updateAccountProfile,
    settings,
    updateSettings,
    accounts,
    activeAccountId,
    showToast,
  } = useTelegram();

  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active session string
  const activeSession =
    accounts.find((a) => a.id === activeAccountId)?.sessionString ||
    (typeof window !== 'undefined' ? localStorage.getItem('tg_session_string') : null) ||
    '';

  // Remote MTProto state
  const [loadingRemote, setLoadingRemote] = useState<boolean>(true);
  const [remoteAccount, setRemoteAccount] = useState<TelegramAccountState | null>(null);

  // Form states for profile
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [about, setAbout] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Local Appearance Preferences (persisted in localStorage)
  const [themeMode, setThemeMode] = useState<string>(settings.theme || 'dark');
  const [fontSize, setFontSize] = useState<number>(settings.fontSize || 16);
  const [bubbleRadius, setBubbleRadius] = useState<number>(settings.bubbleCornerRadius || 12);

  // 1. Fetch live user data directly from Telegram via accountSync service
  const fetchCurrentUserData = async () => {
    if (!activeSession) {
      // Use local currentUser
      initFromLocalUser();
      setLoadingRemote(false);
      return;
    }

    setLoadingRemote(true);
    try {
      const res = await fetchAccountSettingsState(activeSession);
      if (res.success && res.data?.account) {
        setRemoteAccount(res.data.account);
        setFirstName(res.data.account.firstName || '');
        setLastName(res.data.account.lastName || '');
        setUsername(res.data.account.username ? res.data.account.username.replace(/^@/, '') : '');
        setAbout(res.data.account.about || '');
        if (res.data.account.avatar) {
          setAvatarPreview(res.data.account.avatar);
        }
      } else {
        initFromLocalUser();
      }
    } catch (err) {
      console.warn('[AccountProfileSettings] fetch error:', err);
      initFromLocalUser();
    } finally {
      setLoadingRemote(false);
    }
  };

  const initFromLocalUser = () => {
    const parts = (currentUser.name || '').trim().split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
    setUsername((currentUser.username || '').replace(/^@/, ''));
    setAbout(currentUser.bio || '');
    if (currentUser.avatar) {
      setAvatarPreview(currentUser.avatar);
    }
  };

  useEffect(() => {
    fetchCurrentUserData();
  }, [activeSession]);

  // Sync local appearance state when settings change
  useEffect(() => {
    if (settings.theme) setThemeMode(settings.theme);
    if (settings.fontSize) setFontSize(settings.fontSize);
    if (settings.bubbleCornerRadius !== undefined) setBubbleRadius(settings.bubbleCornerRadius);
  }, [settings.theme, settings.fontSize, settings.bubbleCornerRadius]);

  // 2. Handle Photo Upload & Sync to Telegram using accountSync
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      try {
        showToast(isArabic ? 'جاري رفع الصورة إلى تيليجرام...' : 'Uploading photo to Telegram...', '⏳');
        const resData = await updateTelegramProfile({ photoBase64: base64 }, activeSession);
        if (resData.success) {
          updateAccountProfile({ avatar: base64 });
          showToast(isArabic ? 'تم تحديث الصورة الشخصية في تيليجرام بنجاح' : 'Profile photo updated on Telegram', '✅');
        } else {
          showToast(resData.message || (isArabic ? 'فشل رفع الصورة' : 'Failed to upload photo'), '❌');
        }
      } catch (err: any) {
        showToast(err?.message || 'Upload error', '❌');
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Handle Profile (First Name, Last Name, Bio, Username) Update to Telegram using accountSync
  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    try {
      const resData = await updateTelegramProfile(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          about: about.trim(),
          username: username.trim(),
        },
        activeSession
      );

      if (resData.success) {
        // Update context & local state
        updateAccountProfile({
          name: fullName || currentUser.name,
          bio: about.trim(),
          username: username.trim() ? (username.startsWith('@') ? username : `@${username}`) : undefined,
        });

        showToast(
          isArabic
            ? 'تم حفظ وتحديث البيانات في خوادم تيليجرام بنجاح'
            : 'Profile updated on Telegram servers successfully',
          '✅'
        );
        fetchCurrentUserData();
      } else {
        showToast(resData.message || (isArabic ? 'فشل تحديث البيانات' : 'Update failed'), '❌');
      }
    } catch (e: any) {
      showToast(e?.message || (isArabic ? 'خطأ في الاتصال بالخادم' : 'Connection error'), '❌');
    } finally {
      setSavingProfile(false);
    }
  };

  // 4. Handle Theme & Font updates (strictly in localStorage via updateSettings)
  const handleThemeChange = (newTheme: 'dark' | 'light' | 'night' | 'day') => {
    setThemeMode(newTheme);
    updateSettings({ theme: newTheme });
    showToast(isArabic ? `تم حفظ النمط (${newTheme}) محلياً` : `Theme (${newTheme}) saved locally`, '🎨');
  };

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
    updateSettings({ fontSize: newSize });
  };

  const handleBubbleRadiusChange = (newRadius: number) => {
    setBubbleRadius(newRadius);
    updateSettings({ bubbleCornerRadius: newRadius });
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white select-none overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#2481cc] text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
              title={isArabic ? 'رجوع' : 'Back'}
            >
              <BackIcon className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-white" />
            <span className="font-bold text-base sm:text-lg">
              {isArabic ? 'الملف الشخصي وإعدادات الحساب' : 'Account & Profile Settings'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCurrentUserData}
          disabled={loadingRemote}
          className="p-1.5 rounded-full hover:bg-white/15 transition-colors disabled:opacity-50"
          title={isArabic ? 'تحديث البيانات من تيليجرام' : 'Refresh from Telegram'}
        >
          <RefreshCw className={`w-4 h-4 ${loadingRemote ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Architecture & Persistence Rule Banner */}
      <div className="px-4 py-2.5 bg-[#121c27] border-b border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-200 shrink-0">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">
            {isArabic ? 'هيكل تخزين البيانات: ' : 'Storage Architecture: '}
          </strong>
          <span>
            {isArabic
              ? 'يتم إرسال الاسم، اسم العائلة، البيو، والصورة مباشرة إلى خوادم تيليجرام عبر MTProto API. بينما تظل إعدادات الثيم والخطوط وزوايا الرسائل محفوظة محلياً في المتصفح عبر localStorage.'
              : 'Name, Bio, and Avatar are synced with Telegram servers via MTProto API. Themes, Fonts, and UI styling remain strictly saved in localStorage.'}
          </span>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section 1: Telegram User Profile (Synced with Telegram Servers) */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center text-center shadow-sm">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-cyan-400 mb-3 cursor-pointer group shadow-lg"
          >
            {avatarPreview || currentUser.avatar ? (
              <img
                src={avatarPreview || currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-3xl">
                {firstName ? firstName.charAt(0).toUpperCase() : currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-cyan-400 mb-4 hover:underline flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isArabic ? 'تغيير ومزامنة الصورة مع تيليجرام' : 'Change & Sync Profile Photo'}</span>
          </button>

          {/* Form Fields: First Name, Last Name, Username, Bio */}
          <div className="w-full space-y-3 text-start">
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {isArabic ? 'الاسم الأول (First Name):' : 'First Name:'}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400 transition-colors"
                placeholder={isArabic ? 'الاسم الأول' : 'First name'}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {isArabic ? 'اسم العائلة (Last Name):' : 'Last Name:'}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400 transition-colors"
                placeholder={isArabic ? 'اسم العائلة (اختياري)' : 'Last name (optional)'}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {isArabic ? 'المعرف (@username):' : 'Username (@):'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute start-3 text-cyan-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl ps-7 pe-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400 transition-colors"
                  placeholder="username"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {isArabic ? 'النبذة التعريفية (Bio):' : 'Bio:'}
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={2}
                maxLength={140}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-400 resize-none transition-colors"
                placeholder={
                  isArabic
                    ? 'بضع كلمات عنك (ستظهر للمستخدمين في تيليجرام)...'
                    : 'A few words about yourself (visible to Telegram users)...'
                }
              />
              <div className="text-[10px] text-gray-500 text-end font-mono">
                {about.length}/140
              </div>
            </div>

            {/* Update Button */}
            <button
              type="button"
              onClick={handleUpdateProfile}
              disabled={savingProfile}
              className="w-full py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isArabic ? 'جاري التحديث في خوادم تيليجرام...' : 'Updating on Telegram servers...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isArabic ? 'تحديث البيانات في تيليجرام' : 'Update Profile on Telegram'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Account Security & Verified Info */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-start">
                <div className="text-xs font-mono font-bold text-white">
                  {remoteAccount?.phone || currentUser.phone || (isArabic ? 'غير متوفر' : 'Unavailable')}
                </div>
                <div className="text-[11px] text-gray-400">
                  {isArabic ? 'رقم الهاتف المعتمد في تيليجرام' : 'Telegram Verified Phone'}
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              MTProto Active
            </span>
          </div>

          {onNavigateTo2FA && (
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <div className="text-xs font-bold text-white">
                    {isArabic ? 'التحقق بخطوتين (2FA)' : 'Two-Step Verification'}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {isArabic ? 'حماية الحساب بكلمة مرور إضافية' : 'Protect account with additional password'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateTo2FA}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-colors"
              >
                {isArabic ? 'إدارة' : 'Manage'}
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Local Appearance Preferences (localStorage) */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">
                {isArabic ? 'تخصيص المظهر (تخزين محلي localStorage)' : 'Appearance Settings (localStorage)'}
              </span>
            </div>
            <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
              Local Only
            </span>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 block mb-2 text-start">
              {isArabic ? 'نمط الواجهة (Theme):' : 'Interface Theme:'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'dark', label: isArabic ? 'داكن' : 'Dark', color: '#17212b' },
                { id: 'night', label: isArabic ? 'ليلي' : 'Night', color: '#0f141c' },
                { id: 'day', label: isArabic ? 'نهاري' : 'Day', color: '#3390ec' },
                { id: 'light', label: isArabic ? 'فاتح' : 'Light', color: '#f4f4f5' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleThemeChange(t.id as any)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    themeMode === t.id
                      ? 'border-purple-500 bg-purple-500/15'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border border-white/20 shadow-xs"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-[11px] text-gray-300">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Range */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-gray-300 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isArabic ? 'حجم الخط في المحادثات' : 'Chat Font Size'}</span>
              </span>
              <span className="text-cyan-400 font-mono">{fontSize} px</span>
            </div>
            <input
              type="range"
              min="12"
              max="26"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Bubble Corner Radius */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-gray-300">
                {isArabic ? 'انحناء زوايا فقاعات الرسائل' : 'Bubble Corner Radius'}
              </span>
              <span className="text-cyan-400 font-mono">{bubbleRadius} px</span>
            </div>
            <input
              type="range"
              min="0"
              max="28"
              value={bubbleRadius}
              onChange={(e) => handleBubbleRadiusChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountProfileSettings;
