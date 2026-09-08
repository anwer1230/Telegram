import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  AtSign,
  Phone,
  Lock,
  Shield,
  Key,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  LogOut,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

interface AccountSettingsViewProps {
  onBack: () => void;
  onNavigateTo2FA?: () => void;
  onNavigateToPrivacy?: () => void;
}

interface AccountServerState {
  account?: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    username: string;
    phone: string;
    about: string;
    avatar?: string;
    isPremium: boolean;
    isVerified: boolean;
  };
  twoFactor?: {
    hasPassword: boolean;
    hint: string;
    hasRecovery: boolean;
    emailPattern: string;
  };
  privacy?: Record<string, 'everybody' | 'contacts' | 'nobody'>;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  onBack,
  onNavigateTo2FA,
  onNavigateToPrivacy,
}) => {
  const { currentUser, updateAccountProfile, settings, accounts, activeAccountId, logout, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active session string
  const activeSession =
    accounts.find((a) => a.id === activeAccountId)?.sessionString ||
    (typeof window !== 'undefined' ? localStorage.getItem('tg_session_string') : null) ||
    '';

  // Remote state from Telegram
  const [loadingRemote, setLoadingRemote] = useState<boolean>(true);
  const [remoteState, setRemoteState] = useState<AccountServerState | null>(null);

  // Form states (Profile)
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [about, setAbout] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Form states (2FA Password)
  const [show2FASection, setShow2FASection] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordHint, setPasswordHint] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  // Form states (Privacy Fast Toggle)
  const [privacyBio, setPrivacyBio] = useState<'everybody' | 'contacts' | 'nobody'>('everybody');
  const [privacyPhone, setPrivacyPhone] = useState<'everybody' | 'contacts' | 'nobody'>('contacts');
  const [privacyLastSeen, setPrivacyLastSeen] = useState<'everybody' | 'contacts' | 'nobody'>('everybody');
  const [savingPrivacy, setSavingPrivacy] = useState<boolean>(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Load account state from Telegram server (GET /api/account/settings/state)
  const fetchTelegramSettings = async () => {
    if (!activeSession) {
      setLoadingRemote(false);
      return;
    }
    setLoadingRemote(true);
    try {
      const resp = await fetch(`/api/account/settings/state?sessionString=${encodeURIComponent(activeSession)}`);
      const data = await resp.json().catch(() => ({}));
      if (data && data.success) {
        setRemoteState(data);
        if (data.account) {
          setFirstName(data.account.firstName || '');
          setLastName(data.account.lastName || '');
          setUsername(data.account.username ? data.account.username.replace(/^@/, '') : '');
          setAbout(data.account.about || '');
          if (data.account.avatar) {
            setAvatarPreview(data.account.avatar);
          }
        }
        if (data.privacy) {
          if (data.privacy.bio) setPrivacyBio(data.privacy.bio);
          if (data.privacy.phoneNumber) setPrivacyPhone(data.privacy.phoneNumber);
          if (data.privacy.lastSeen) setPrivacyLastSeen(data.privacy.lastSeen);
        }
      } else {
        // Fallback to local currentUser
        const parts = (currentUser.name || '').trim().split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
        setUsername((currentUser.username || '').replace(/^@/, ''));
        setAbout(currentUser.bio || '');
      }
    } catch (err) {
      console.warn('[AccountSettingsView] fetch error:', err);
      const parts = (currentUser.name || '').trim().split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
      setUsername((currentUser.username || '').replace(/^@/, ''));
      setAbout(currentUser.bio || '');
    } finally {
      setLoadingRemote(false);
    }
  };

  useEffect(() => {
    fetchTelegramSettings();
  }, [activeSession]);

  // Handle Photo selection & upload directly to Telegram
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      // Auto-sync photo to Telegram
      try {
        showToast(isArabic ? 'جاري رفع الصورة إلى تيليجرام...' : 'Uploading photo to Telegram...', '⏳');
        const resp = await fetch('/api/account/settings/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionString: activeSession,
            photoBase64: base64,
          }),
        });
        const resData = await resp.json().catch(() => ({}));
        if (resData.success) {
          updateAccountProfile({ avatar: base64 });
          showToast(isArabic ? 'تم تحديث الصورة الشخصية في تيليجرام بنجاح' : 'Profile photo updated on Telegram', '✅');
        } else {
          showToast(resData.message || (isArabic ? 'فشل رفع الصورة الشخصية' : 'Failed to upload photo'), '❌');
        }
      } catch (err: any) {
        showToast(err?.message || 'Upload error', '❌');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Profile (Name, Bio, Username) to Telegram Server
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    try {
      const resp = await fetch('/api/account/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionString: activeSession,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          about: about.trim(),
          username: username.trim(),
        }),
      });
      const resData = await resp.json().catch(() => ({}));
      if (resData.success) {
        updateAccountProfile({
          name: fullName || currentUser.name,
          bio: about.trim(),
          username: username.trim() ? (username.startsWith('@') ? username : `@${username}`) : undefined,
        });
        showToast(isArabic ? 'تمت مزامنة الملف الشخصي مع خوادم تيليجرام' : 'Profile synced with Telegram servers', '✅');
        fetchTelegramSettings();
      } else {
        showToast(resData.message || (isArabic ? 'فشل تحديث البيانات' : 'Update failed'), '❌');
      }
    } catch (e: any) {
      showToast(e?.message || (isArabic ? 'خطأ في الاتصال بالخادم' : 'Connection error'), '❌');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save 2FA Password to Telegram Server
  const handleSave2FAPassword = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      showToast(isArabic ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', '⚠️');
      return;
    }
    setSavingPassword(true);
    try {
      const resp = await fetch('/api/account/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionString: activeSession,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword,
          hint: passwordHint || undefined,
        }),
      });
      const resData = await resp.json().catch(() => ({}));
      if (resData.success) {
        showToast(
          isArabic
            ? newPassword === ''
              ? 'تم إلغاء كلمة المرور الثنائية بنجاح'
              : 'تم تعيين كلمة المرور الثنائية في تيليجرام بنجاح'
            : '2FA Password updated on Telegram',
          '🔐'
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordHint('');
        setShow2FASection(false);
        fetchTelegramSettings();
      } else {
        showToast(resData.message || (isArabic ? 'فشل تحديث كلمة المرور الثنائية' : 'Failed to update 2FA password'), '❌');
      }
    } catch (e: any) {
      showToast(e?.message || 'Error updating 2FA', '❌');
    } finally {
      setSavingPassword(false);
    }
  };

  // Save Privacy Option to Telegram Server
  const handleUpdatePrivacy = async (target: string, option: 'everybody' | 'contacts' | 'nobody') => {
    setSavingPrivacy(true);
    try {
      const resp = await fetch('/api/account/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionString: activeSession,
          privacyTarget: target,
          privacyOption: option,
        }),
      });
      const resData = await resp.json().catch(() => ({}));
      if (resData.success) {
        if (target === 'bio') setPrivacyBio(option);
        if (target === 'phoneNumber') setPrivacyPhone(option);
        if (target === 'lastSeen') setPrivacyLastSeen(option);
        showToast(isArabic ? 'تم تحديث الخصوصية في تيليجرام' : 'Privacy updated on Telegram', '🛡️');
      } else {
        showToast(resData.message || (isArabic ? 'فشل تحديث الخصوصية' : 'Failed to update privacy'), '❌');
      }
    } catch (e: any) {
      showToast(e?.message || 'Privacy error', '❌');
    } finally {
      setSavingPrivacy(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#2481cc] text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
            title={isArabic ? 'رجوع' : 'Back'}
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-white" />
            <span className="font-bold text-lg">{isArabic ? 'إعدادات الحساب والمزامنة' : 'Account Settings & Sync'}</span>
          </div>
        </div>

        <button
          onClick={fetchTelegramSettings}
          disabled={loadingRemote}
          className="p-1.5 rounded-full hover:bg-white/15 transition-colors disabled:opacity-50"
          title={isArabic ? 'تحديث البيانات من تيليجرام' : 'Refresh from Telegram'}
        >
          <RefreshCw className={`w-4 h-4 ${loadingRemote ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Synchronized vs Local Storage Clarification Banner */}
      <div className="px-4 py-2.5 bg-[#121c27] border-b border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-200 shrink-0">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">قواعد مزامنة البيانات: </strong>
          <span>
            تتم مزامنة <strong>الاسم، النبذة (Bio)، الصورة الشخصية، وكلمة المرور الثنائية</strong> مباشرة مع خوادم تيليجرام الرسمية.
            بينما تبقى إعدادات الواجهة (مثل الثيم، الخطوط، والأيقونات) محفوظة محلياً في المتصفح.
          </span>
        </div>
      </div>

      {/* Main Form Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Card & Avatar */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center text-center">
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
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
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
            <span>{isArabic ? 'تغيير الصورة الشخصية ومزامنتها مع تيليجرام' : 'Change & Sync Profile Photo'}</span>
          </button>

          {/* Form Fields: First Name, Last Name, Bio */}
          <div className="w-full space-y-2.5 text-right">
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {isArabic ? 'الاسم الأول (First Name):' : 'First Name:'}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
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
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                placeholder={isArabic ? 'اسم العائلة (اختياري)' : 'Last name (optional)'}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {isArabic ? 'المعرف (@username):' : 'Username:'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3 text-cyan-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl pr-7 pl-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-400"
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
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-400 resize-none"
                placeholder={isArabic ? 'بضع كلمات عنك (ستظهر للجميع في تيليجرام)...' : 'A few words about yourself...'}
              />
              <div className="text-[10px] text-gray-500 text-left font-mono">
                {about.length}/140
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isArabic ? 'جاري الحفظ في خوادم تيليجرام...' : 'Saving to Telegram...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isArabic ? 'حفظ ومزامنة الاسم والبيو في تيليجرام' : 'Save & Sync to Telegram'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Account Info Details List */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white">{currentUser.phone || 'غير متوفر'}</div>
                <div className="text-[11px] text-gray-400">{isArabic ? 'رقم الهاتف المعتمد في تيليجرام' : 'Official Phone'}</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              MTProto Verified
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {remoteState?.twoFactor?.hasPassword ? (
                    <span className="text-emerald-400">مفعلة (كلمة مرور نشطة)</span>
                  ) : (
                    <span className="text-gray-400">معطلة (غير مفعلة)</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400">
                  {isArabic ? 'التحقق بخطوتين (2-Step Verification)' : 'Two-Step Verification'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShow2FASection(!show2FASection)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center gap-1 transition-all"
            >
              <span>{remoteState?.twoFactor?.hasPassword ? 'تعديل أو إلغاء' : 'تعيين كلمة مرور'}</span>
              {show2FASection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2FA Section (Expandable) */}
        {show2FASection && (
          <div className="p-4 bg-[#14202d] rounded-2xl border border-cyan-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">إعداد كلمة المرور الثنائية (2FA Password)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-gray-400 hover:text-white p-1"
                title="إظهار/إخفاء كلمة المرور"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {remoteState?.twoFactor?.hasPassword && (
              <div>
                <label className="text-[11px] font-bold text-amber-300 block mb-1">
                  كلمة المرور الحالية (مطلوبة للتعديل):
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1">
                كلمة المرور الجديدة (اتركها فارغة لإلغاء القفل):
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                placeholder="كلمة مرور جديدة قوية"
              />
            </div>

            {newPassword && (
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  تأكيد كلمة المرور الجديدة:
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  placeholder="أعد إدخال كلمة المرور"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1">
                تلميح كلمة المرور (Hint):
              </label>
              <input
                type="text"
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                placeholder="تلميح لتذكر كلمة المرور"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleSave2FAPassword}
                disabled={savingPassword}
                className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري تطبيق التغيير في تيليجرام...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ إعدادات كلمة المرور</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShow2FASection(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Telegram Privacy Fast Control */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">إعدادات الخصوصية المتزامنة مع تيليجرام</span>
            </div>
            {onNavigateToPrivacy && (
              <button
                type="button"
                onClick={onNavigateToPrivacy}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                المزيد من الخصوصية
              </button>
            )}
          </div>

          {/* Privacy: Bio */}
          <div className="flex items-center justify-between text-xs py-1.5 border-t border-white/5">
            <div>
              <span className="font-semibold text-white block">من يمكنه رؤية النبذة الشخصية (Bio)</span>
              <span className="text-[10px] text-gray-400">يتم تطبيقه فوراً عبر account.setPrivacy</span>
            </div>
            <select
              value={privacyBio}
              onChange={(e) => handleUpdatePrivacy('bio', e.target.value as any)}
              disabled={savingPrivacy}
              className="bg-[#242f3d] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
            >
              <option value="everybody">الجميع (Everybody)</option>
              <option value="contacts">جهات الاتصال (My Contacts)</option>
              <option value="nobody">لا أحد (Nobody)</option>
            </select>
          </div>

          {/* Privacy: Phone Number */}
          <div className="flex items-center justify-between text-xs py-1.5 border-t border-white/5">
            <div>
              <span className="font-semibold text-white block">من يمكنه رؤية رقم هاتفي</span>
              <span className="text-[10px] text-gray-400">حماية رقم الهاتف من المتطفلين</span>
            </div>
            <select
              value={privacyPhone}
              onChange={(e) => handleUpdatePrivacy('phoneNumber', e.target.value as any)}
              disabled={savingPrivacy}
              className="bg-[#242f3d] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
            >
              <option value="everybody">الجميع (Everybody)</option>
              <option value="contacts">جهات الاتصال (My Contacts)</option>
              <option value="nobody">لا أحد (Nobody)</option>
            </select>
          </div>

          {/* Privacy: Last Seen */}
          <div className="flex items-center justify-between text-xs py-1.5 border-t border-white/5">
            <div>
              <span className="font-semibold text-white block">آخر ظهور والحالة (Last Seen)</span>
              <span className="text-[10px] text-gray-400">إظهار أو إخفاء توقيت تواجدك</span>
            </div>
            <select
              value={privacyLastSeen}
              onChange={(e) => handleUpdatePrivacy('lastSeen', e.target.value as any)}
              disabled={savingPrivacy}
              className="bg-[#242f3d] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
            >
              <option value="everybody">الجميع (Everybody)</option>
              <option value="contacts">جهات الاتصال (My Contacts)</option>
              <option value="nobody">لا أحد (Nobody)</option>
            </select>
          </div>
        </div>

        {/* Log Out Button */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full p-3.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-2xl flex items-center justify-center gap-2 text-red-400 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isArabic ? 'تسجيل الخروج من الحساب' : 'Log Out of Account'}</span>
        </button>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-xs bg-[#17212b] border border-[#2b394a] rounded-2xl p-5 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {isArabic ? 'تسجيل الخروج؟' : 'Log Out?'}
                </h4>
                <p className="text-xs text-gray-400">
                  {isArabic
                    ? `هل أنت متأكد من رغبتك في تسجيل الخروج من حساب (${currentUser.name})؟`
                    : `Are you sure you want to log out of (${currentUser.name})?`}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
                >
                  {isArabic ? 'تأكيد الخروج' : 'Log Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsView;
