import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Clock,
  Ban,
  MonitorSmartphone,
  Phone,
  Eye,
  Camera,
  Share2,
  PhoneCall,
  Mic,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Trash2,
  UserX,
  Plus,
  Laptop,
  Smartphone,
  Globe,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import {
  privacyController,
  PrivacyTarget,
  PrivacyOption,
  PrivacySettingsState,
} from '../../core/messenger/PrivacySettingsController';
import { sessionSecurityManager } from '../../core/SessionSecurityManager';
import { TLRPC } from '../../core/TLRPC';

interface SubViewProps {
  onBack: () => void;
}

// ==========================================
// 1. PRIVACY CONTROL VIEW (e.g. Phone Number, Last Seen, Photos, Calls)
// ==========================================
export const PrivacyControlView: React.FC<SubViewProps & { target: PrivacyTarget }> = ({
  onBack,
  target,
}) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [currentOption, setCurrentOption] = useState<PrivacyOption>(
    privacyController.getState()[target] || 'everybody'
  );
  const [p2pOption, setP2pOption] = useState<'everybody' | 'contacts' | 'nobody'>('contacts');

  const titles: Record<PrivacyTarget, { ar: string; en: string; descAr: string; descEn: string }> = {
    phone_number: {
      ar: 'رقم الهاتف',
      en: 'Phone Number',
      descAr: 'من يمكنه رؤية رقم هاتفي؟',
      descEn: 'Who can see my phone number?',
    },
    last_seen: {
      ar: 'آخر ظهور ومتصل',
      en: 'Last Seen & Online',
      descAr: 'من يمكنه رؤية وقت آخر ظهور لي وحالتي متصل؟',
      descEn: 'Who can see my Last Seen time?',
    },
    profile_photos: {
      ar: 'الصور الشخصية',
      en: 'Profile Photos',
      descAr: 'من يمكنه رؤية صورة وتفاصيل ملفي الشخصي؟',
      descEn: 'Who can see my profile photos?',
    },
    forwards: {
      ar: 'الرسائل المحوّلة',
      en: 'Forwarded Messages',
      descAr: 'من يمكنه إضافة رابط لحسابي عند تحويل رسائلي؟',
      descEn: 'Who can add a link to my account when forwarding my messages?',
    },
    calls: {
      ar: 'المكالمات',
      en: 'Calls',
      descAr: 'من يمكنه الاتصال بي عبر تيليجرام؟',
      descEn: 'Who can call me?',
    },
    voice_messages: {
      ar: 'الرسائل الصوتية',
      en: 'Voice Messages',
      descAr: 'من يمكنه إرسال رسائل صوتية ومرئية إلي؟',
      descEn: 'Who can send me voice messages?',
    },
    bio: {
      ar: 'نبذة عني',
      en: 'Bio',
      descAr: 'من يمكنه قراءة النبذة التعريفية في ملفي؟',
      descEn: 'Who can see my bio?',
    },
  };

  const info = titles[target] || titles.phone_number;

  const handleSelectOption = async (opt: PrivacyOption) => {
    setCurrentOption(opt);
    try {
      await privacyController.setPrivacy(target, opt);
      showToast(isArabic ? 'تم تحديث إعدادات الخصوصية في سيرفر تيليجرام' : 'Privacy settings synced with Telegram', '🔒');
    } catch (e: any) {
      showToast(e?.message || (isArabic ? 'فشل تحديث الخصوصية' : 'Failed to set privacy'), '❌');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="font-bold text-sm tracking-wide">{isArabic ? info.ar : info.en}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-xs font-bold text-[#5288c1] uppercase px-1">
          {isArabic ? info.descAr : info.descEn}
        </div>

        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <RadioItem
            label={isArabic ? 'الجميع' : 'Everybody'}
            selected={currentOption === 'everybody'}
            onClick={() => handleSelectOption('everybody')}
          />
          <RadioItem
            label={isArabic ? 'جهات اتصالي' : 'My Contacts'}
            selected={currentOption === 'contacts'}
            onClick={() => handleSelectOption('contacts')}
          />
          <RadioItem
            label={isArabic ? 'لا أحد' : 'Nobody'}
            selected={currentOption === 'nobody'}
            onClick={() => handleSelectOption('nobody')}
          />
        </div>

        {target === 'calls' && (
          <>
            <div className="text-xs font-bold text-[#5288c1] uppercase px-1 pt-2">
              {isArabic ? 'مكالمات الند للند (Peer-to-Peer)' : 'Peer-to-Peer Calls'}
            </div>
            <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              <RadioItem
                label={isArabic ? 'الجميع' : 'Everybody'}
                selected={p2pOption === 'everybody'}
                onClick={() => setP2pOption('everybody')}
              />
              <RadioItem
                label={isArabic ? 'جهات اتصالي' : 'My Contacts'}
                selected={p2pOption === 'contacts'}
                onClick={() => setP2pOption('contacts')}
              />
              <RadioItem
                label={isArabic ? 'لا أحد' : 'Nobody'}
                selected={p2pOption === 'nobody'}
                onClick={() => setP2pOption('nobody')}
              />
            </div>
            <p className="text-[11px] text-gray-400 px-2 leading-relaxed">
              {isArabic
                ? 'استخدام الند للند يحسن جودة الصوت ولكنه يكشف عنوان IP الخاص بك للطرف الآخر.'
                : 'Disabling Peer-to-Peer relays all calls through Telegram servers to prevent revealing your IP address.'}
            </p>
          </>
        )}

        <div className="text-xs font-bold text-[#5288c1] uppercase px-1 pt-2">
          {isArabic ? 'الاستثناءات الإضافية' : 'Add Exceptions'}
        </div>
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div
            onClick={() => showToast(isArabic ? 'قائمة السماح دائماً' : 'Always Allow list', '👥')}
            className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
          >
            <span className="text-xs font-medium text-white">{isArabic ? 'السماح دائماً' : 'Always Allow'}</span>
            <span className="text-xs text-gray-400 font-mono">{isArabic ? 'إضافة مستخدمين' : 'Add users'}</span>
          </div>
          <div
            onClick={() => showToast(isArabic ? 'قائمة عدم السماح أبداً' : 'Never Allow list', '🚫')}
            className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
          >
            <span className="text-xs font-medium text-white">{isArabic ? 'عدم السماح أبداً' : 'Never Allow'}</span>
            <span className="text-xs text-gray-400 font-mono">{isArabic ? 'إضافة مستخدمين' : 'Add users'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. PASSCODE LOCK VIEW (PasscodeActivity.java)
// ==========================================
export const PasscodeLockView: React.FC<SubViewProps> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [state, setState] = useState(privacyController.getState());
  const [isEnabled, setIsEnabled] = useState(state.passcodeEnabled || sessionSecurityManager.isPasscodeSet());
  const [passcodeType, setPasscodeType] = useState<'pin' | 'password'>(state.passcodeType || sessionSecurityManager.getPasscodeType());
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState<'view' | 'enter' | 'confirm'>('view');
  const [autoLockSeconds, setAutoLockSeconds] = useState<number>(() => sessionSecurityManager.getAutoLockTimeout());
  const [unlockBiometrics, setUnlockBiometrics] = useState<boolean>(() => sessionSecurityManager.isBiometricsEnabled());

  const handleSavePasscode = async () => {
    if (passcode !== confirmPasscode) {
      showToast(isArabic ? 'رمز القفل غير متطابق' : 'Passcodes do not match', '❌');
      return;
    }
    if (passcode.length < 4) {
      showToast(isArabic ? 'يجب أن يكون 4 أرقام على الأقل' : 'Must be at least 4 digits', '⚠️');
      return;
    }
    await sessionSecurityManager.setPasscode(passcode, passcodeType);
    privacyController.setPasscode(passcode, passcodeType);
    setIsEnabled(true);
    setStep('view');
    showToast(isArabic ? 'تم تفعيل رمز القفل بنجاح' : 'Passcode Lock enabled', '🔒');
  };

  const handleDisablePasscode = () => {
    sessionSecurityManager.removePasscode();
    privacyController.setPasscode('', 'pin');
    setIsEnabled(false);
    showToast(isArabic ? 'تم تعطيل رمز القفل' : 'Passcode Lock disabled', '🔓');
  };

  const handleToggleBiometrics = async () => {
    if (!unlockBiometrics) {
      showToast(isArabic ? 'جاري التحقق من بصمة الجهاز...' : 'Verifying device biometrics...', '🔐');
      const res = await sessionSecurityManager.enrollBiometrics();
      if (res.success) {
        setUnlockBiometrics(true);
        showToast(isArabic ? 'تم تفعيل إلغاء القفل بالبصمة بنجاح' : 'Biometric unlock enabled', '✨');
      } else if (res.isCancelled) {
        showToast(isArabic ? 'تم إلغاء تسجيل البصمة' : 'Biometric setup cancelled', 'ℹ️');
      } else {
        showToast(res.error || (isArabic ? 'فشل تفعيل البصمة' : 'Failed to enable biometrics'), '⚠️');
      }
    } else {
      sessionSecurityManager.setBiometricsEnabled(false);
      setUnlockBiometrics(false);
      showToast(isArabic ? 'تم تعطيل إلغاء القفل بالبصمة' : 'Biometric unlock disabled', '🔓');
    }
  };

  const handleCycleAutoLock = () => {
    const options = [60, 300, 900, 3600, 0];
    const currentIndex = options.indexOf(autoLockSeconds);
    const nextTimeout = options[(currentIndex + 1) % options.length];
    sessionSecurityManager.setAutoLockTimeout(nextTimeout);
    setAutoLockSeconds(nextTimeout);
    showToast(isArabic ? 'تم تحديث وقت القفل التلقائي' : 'Auto-lock timer updated', '⏱️');
  };

  const getAutoLockDisplay = (seconds: number) => {
    if (seconds === 60) return isArabic ? 'بعد دقيقة واحدة' : 'in 1 minute';
    if (seconds === 300) return isArabic ? 'بعد 5 دقائق' : 'in 5 minutes';
    if (seconds === 900) return isArabic ? 'بعد 15 دقيقة' : 'in 15 minutes';
    if (seconds === 3600) return isArabic ? 'بعد ساعة واحدة' : 'in 1 hour';
    return isArabic ? 'معطّل' : 'Disabled';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step !== 'view') setStep('view');
              else onBack();
            }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="font-bold text-sm tracking-wide">{isArabic ? 'رمز القفل' : 'Passcode Lock'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {step === 'view' && (
          <>
            <div className="p-6 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#5288c1]/20 flex items-center justify-center text-[#5288c1] mb-3">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {isEnabled
                  ? isArabic
                    ? 'رمز القفل مفعّل'
                    : 'Passcode Lock is On'
                  : isArabic
                  ? 'قفل التطبيق برمز حماية'
                  : 'Protect App with Passcode'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                {isArabic
                  ? 'عند تفعيل رمز القفل، ستظهر أيقونة قفل أعلى قائمة المحادثات لقفل التطبيق فورياً.'
                  : 'When a passcode is set, a lock icon appears above your chats list. Tap it to lock your app.'}
              </p>
            </div>

            <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              <div
                onClick={() => {
                  if (isEnabled) {
                    handleDisablePasscode();
                  } else {
                    setPasscode('');
                    setConfirmPasscode('');
                    setStep('enter');
                  }
                }}
                className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
              >
                <span className="text-sm font-medium text-white">
                  {isArabic ? 'تفعيل رمز القفل' : 'Passcode Lock'}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {isEnabled ? (isArabic ? 'مفعّل' : 'On') : isArabic ? 'معطل' : 'Off'}
                </span>
              </div>

              {isEnabled && (
                <>
                  <div
                    onClick={() => {
                      setPasscode('');
                      setConfirmPasscode('');
                      setStep('enter');
                    }}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-medium text-white">
                      {isArabic ? 'تغيير رمز القفل' : 'Change Passcode'}
                    </span>
                  </div>

                  <div
                    onClick={handleCycleAutoLock}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-medium text-white">
                      {isArabic ? 'القفل التلقائي' : 'Auto-lock'}
                    </span>
                    <span className="text-xs text-[#5288c1] font-mono">
                      {getAutoLockDisplay(autoLockSeconds)}
                    </span>
                  </div>

                  <div
                    onClick={handleToggleBiometrics}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[#5288c1]" />
                      <span className="text-xs font-medium text-white">
                        {isArabic ? 'إلغاء القفل ببصمة الإصبع / Face ID' : 'Unlock with Biometrics (WebAuthn)'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={unlockBiometrics}
                      onChange={() => {}}
                      className="accent-[#5288c1] w-4 h-4 cursor-pointer pointer-events-none"
                    />
                  </div>

                  <div
                    onClick={() => {
                      sessionSecurityManager.lock();
                      onBack();
                    }}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-red-500/10 cursor-pointer transition-colors text-red-400 border-t border-white/5"
                  >
                    <span className="text-xs font-medium">
                      {isArabic ? 'قفل التطبيق الآن' : 'Lock App Now'}
                    </span>
                    <Lock className="w-4 h-4" />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {step === 'enter' && (
          <div className="p-5 bg-[#17212b] rounded-2xl border border-white/10 space-y-4 text-center">
            <div className="text-sm font-bold text-white">
              {isArabic ? 'أدخل رمز القفل المكون من 4 أرقام' : 'Enter a 4-digit Passcode'}
            </div>
            <input
              type="password"
              maxLength={6}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              className="w-40 mx-auto bg-[#242f3d] border border-white/10 rounded-xl py-3 text-center text-xl font-mono tracking-widest text-white outline-none focus:border-[#5288c1]"
            />
            <button
              disabled={passcode.length < 4}
              onClick={() => setStep('confirm')}
              className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
            >
              {isArabic ? 'التالي' : 'Next'}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-5 bg-[#17212b] rounded-2xl border border-white/10 space-y-4 text-center">
            <div className="text-sm font-bold text-white">
              {isArabic ? 'أعد إدخال رمز القفل للتأكيد' : 'Re-enter your passcode'}
            </div>
            <input
              type="password"
              maxLength={6}
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              className="w-40 mx-auto bg-[#242f3d] border border-white/10 rounded-xl py-3 text-center text-xl font-mono tracking-widest text-white outline-none focus:border-[#5288c1]"
            />
            <button
              disabled={confirmPasscode.length < 4}
              onClick={handleSavePasscode}
              className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
            >
              {isArabic ? 'حفظ وتأكيد' : 'Confirm and Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. AUTO-DELETE TIMER VIEW (AutoDeleteTimerActivity.java)
// ==========================================
export const AutoDeleteView: React.FC<SubViewProps> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [period, setPeriod] = useState<number>(privacyController.getState().autoDeletePeriod);

  const handleSelectPeriod = (sec: number) => {
    setPeriod(sec);
    privacyController.setAutoDeletePeriod(sec);
    showToast(isArabic ? 'تم تعيين مؤقت الحذف التلقائي' : 'Auto-delete timer updated', '⏱️');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="font-bold text-sm tracking-wide">
            {isArabic ? 'الحذف التلقائي للرسائل' : 'Auto-Delete Messages'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-6 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {isArabic ? 'مؤقت التدمير الذاتي للمحادثات' : 'Self-Destruct Messages Timer'}
          </h3>
          <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
            {isArabic
              ? 'سيتم حذف الرسائل الجديدة تلقائياً في كل المحادثات التي تبدأها بعد المدة المحددة.'
              : 'Automatically delete messages for everyone in all new chats you start after a set period of time.'}
          </p>
        </div>

        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <RadioItem
            label={isArabic ? 'معطل' : 'Off'}
            selected={period === 0}
            onClick={() => handleSelectPeriod(0)}
          />
          <RadioItem
            label={isArabic ? 'بعد يوم واحد (24 ساعة)' : 'After 1 day'}
            selected={period === 86400}
            onClick={() => handleSelectPeriod(86400)}
          />
          <RadioItem
            label={isArabic ? 'بعد أسبوع واحد' : 'After 1 week'}
            selected={period === 604800}
            onClick={() => handleSelectPeriod(604800)}
          />
          <RadioItem
            label={isArabic ? 'بعد شهر واحد' : 'After 1 month'}
            selected={period === 2592000}
            onClick={() => handleSelectPeriod(2592000)}
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. ACTIVE SESSIONS / DEVICES VIEW (SessionsActivity.java)
// ==========================================
export const SessionsView: React.FC<SubViewProps> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [sessions, setSessions] = useState<TLRPC.TL_authorization[]>([]);
  const [ttlDays, setTtlDays] = useState<number>(180);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<TLRPC.TL_authorization | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showConfirmTerminateAll, setShowConfirmTerminateAll] = useState<boolean>(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const state = await sessionSecurityManager.loadAllSessions(true);
      const combined: TLRPC.TL_authorization[] = [];
      if (state.currentSession) combined.push(state.currentSession);
      if (state.otherSessions) combined.push(...state.otherSessions);
      setSessions(combined);
      setTtlDays(state.ttlDays || 180);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const currentSession = sessions.find((s) => s.current || (s.flags & 1) !== 0) || sessions[0];
  const otherSessions = sessions.filter((s) => s !== currentSession);

  const handleTerminateSession = async (hash: number | string) => {
    await sessionSecurityManager.terminateSession(hash);
    await privacyController.terminateSession(hash);
    setSessions((prev) => prev.filter((s) => String(s.hash) !== String(hash)));
    setSelectedSession(null);
    showToast(isArabic ? 'تم إنهاء الجلسة بنجاح' : 'Session terminated successfully', '🗑️');
  };

  const handleTerminateAllOther = async () => {
    setShowConfirmTerminateAll(false);
    await sessionSecurityManager.terminateAllOtherSessions();
    await privacyController.terminateAllOtherSessions();
    setSessions(currentSession ? [currentSession] : []);
    showToast(isArabic ? 'تم إنهاء جميع الجلسات الأخرى بنجاح' : 'All other sessions terminated successfully', '🔒');
  };

  const handleSetTTL = async (days: number) => {
    setTtlDays(days);
    await sessionSecurityManager.setTTL(days);
    showToast(
      isArabic
        ? `سيتم إنهاء الجلسات تلقائياً بعد ${days >= 30 ? days / 30 + ' أشهر' : days + ' يوماً'}`
        : `Sessions will auto-terminate after ${days} days`,
      '⏱️'
    );
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return isArabic ? 'غير معروف' : 'Unknown';
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="font-bold text-sm tracking-wide">{isArabic ? 'الأجهزة والجلسات النشطة' : 'Devices & Active Sessions'}</div>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="text-xs text-[#5288c1] hover:text-[#649ed6] font-semibold px-2 py-1 rounded transition-colors"
        >
          {loading ? (isArabic ? 'جاري التحديث...' : 'Updating...') : (isArabic ? 'تحديث' : 'Refresh')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Link Desktop Device / QR Code Button */}
        <button
          onClick={() => setShowQrModal(true)}
          className="w-full p-4 bg-gradient-to-r from-[#2481cc]/20 to-[#5288c1]/10 hover:from-[#2481cc]/30 hover:to-[#5288c1]/20 border border-[#2481cc]/30 rounded-2xl flex items-center justify-between gap-3 text-left transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#2481cc] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#2481cc]/20">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {isArabic ? 'ربط جهاز سطح المكتب (QR)' : 'Link Desktop Device (QR)'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {isArabic ? 'امسح الرمز من تطبيق تيليجرام على الكمبيوتر' : 'Scan QR code from Telegram Desktop'}
              </div>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-400 shrink-0 ${isArabic ? 'rotate-180' : ''}`} />
        </button>

        {/* Current Session */}
        <div>
          <div className="text-xs font-bold text-[#5288c1] uppercase px-1 mb-2">
            {isArabic ? 'هذا الجهاز (الجلسة الحالية)' : 'This Device (Current Session)'}
          </div>
          {currentSession && (
            <div
              onClick={() => setSelectedSession(currentSession)}
              className="p-4 bg-[#17212b] rounded-2xl border border-emerald-500/40 hover:border-emerald-500/60 cursor-pointer flex items-start gap-3.5 transition-all shadow-md shadow-black/20"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white truncate">{currentSession.device_model}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                    {isArabic ? 'متصل الآن' : 'online'}
                  </span>
                </div>
                <div className="text-xs text-gray-300 mt-0.5">{currentSession.app_name} {currentSession.app_version}</div>
                <div className="text-[11px] text-gray-400 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>{currentSession.ip}</span>
                  <span>•</span>
                  <span>{currentSession.country || 'Egypt'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terminate All Button */}
        {otherSessions.length > 0 && (
          <button
            onClick={() => setShowConfirmTerminateAll(true)}
            className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isArabic ? 'إنهاء جميع الجلسات الأخرى' : 'Terminate All Other Sessions'}</span>
          </button>
        )}

        {/* Auto-Terminate Inactive Sessions (TTL) */}
        <div>
          <div className="text-xs font-bold text-[#5288c1] uppercase px-1 mb-2">
            {isArabic ? 'الإنهاء التلقائي للجلسات غير النشطة' : 'Auto-Terminate Inactive Sessions'}
          </div>
          <div className="bg-[#17212b] rounded-2xl border border-white/10 p-3.5 space-y-2">
            <div className="text-xs text-gray-400 leading-relaxed">
              {isArabic
                ? 'إذا لم تقم بتسجيل الدخول من جهاز آخر خلال هذه المدة، فسيتم تسجيل الخروج منه تلقائياً لحماية حسابك.'
                : 'If a device is inactive for this duration, it will be automatically logged out.'}
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: isArabic ? 'أسبوع' : '1 Week', days: 7 },
                { label: isArabic ? 'شهر' : '1 Month', days: 30 },
                { label: isArabic ? '3 أشهر' : '3 Months', days: 90 },
                { label: isArabic ? '6 أشهر' : '6 Months', days: 180 },
              ].map((item) => (
                <button
                  key={item.days}
                  onClick={() => handleSetTTL(item.days)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    ttlDays === item.days
                      ? 'bg-[#5288c1] text-white shadow-md shadow-[#5288c1]/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Other Active Sessions */}
        <div>
          <div className="text-xs font-bold text-[#5288c1] uppercase px-1 mb-2">
            {isArabic ? `الجلسات النشطة الأخرى (${otherSessions.length})` : `Other Active Sessions (${otherSessions.length})`}
          </div>

          {otherSessions.length === 0 ? (
            <div className="p-8 text-center bg-[#17212b]/60 rounded-2xl border border-white/5 text-gray-400">
              <ShieldCheck className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
              <div className="text-xs font-bold text-gray-300">
                {isArabic ? 'لا توجد جلسات أخرى نشطة' : 'No other active sessions'}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {isArabic ? 'أنت مسجل الدخول فقط من هذا الجهاز حالياً.' : 'You are currently only logged in on this device.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {otherSessions.map((session) => (
                <div
                  key={session.hash}
                  onClick={() => setSelectedSession(session)}
                  className="p-4 flex items-start justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      {session.platform === 'Web' ? (
                        <Globe className="w-5 h-5" />
                      ) : session.platform === 'Windows' ? (
                        <Laptop className="w-5 h-5" />
                      ) : (
                        <Smartphone className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{session.device_model}</div>
                      <div className="text-[11px] text-gray-300 mt-0.5">{session.app_name} • {session.platform}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {session.ip} • {session.country || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {isArabic ? 'آخر نشاط: ' : 'Active: '}
                        {formatDate(session.date_active)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTerminateSession(session.hash);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 shrink-0 transition-colors"
                  >
                    {isArabic ? 'إنهاء' : 'Terminate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5288c1]/20 text-[#5288c1] flex items-center justify-center shrink-0">
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedSession.device_model}</h4>
                <div className="text-xs text-gray-400">{selectedSession.app_name} {selectedSession.app_version}</div>
              </div>
            </div>

            <div className="bg-black/30 rounded-xl p-3 space-y-2 text-xs divide-y divide-white/5 font-mono">
              <div className="flex justify-between py-1 text-gray-300">
                <span className="text-gray-500 font-sans">{isArabic ? 'النظام:' : 'OS:'}</span>
                <span>{selectedSession.system_version || selectedSession.platform}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-300">
                <span className="text-gray-500 font-sans">{isArabic ? 'عنوان IP:' : 'IP Address:'}</span>
                <span>{selectedSession.ip}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-300">
                <span className="text-gray-500 font-sans">{isArabic ? 'الموقع الجغرافي:' : 'Location:'}</span>
                <span>{selectedSession.country || 'Egypt'}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-300">
                <span className="text-gray-500 font-sans">{isArabic ? 'تاريخ الإنشاء:' : 'Created:'}</span>
                <span>{formatDate(selectedSession.date_created)}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-300">
                <span className="text-gray-500 font-sans">{isArabic ? 'آخر نشاط:' : 'Last Active:'}</span>
                <span>{formatDate(selectedSession.date_active)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSession(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
              {!selectedSession.current && (
                <button
                  onClick={() => handleTerminateSession(selectedSession.hash)}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-bold text-white transition-colors"
                >
                  {isArabic ? 'إنهاء هذه الجلسة' : 'Terminate Session'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Terminate All Modal */}
      {showConfirmTerminateAll && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-rose-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-white">
                {isArabic ? 'إنهاء جميع الجلسات الأخرى؟' : 'Terminate all other sessions?'}
              </h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {isArabic
                  ? 'سيتم تسجيل الخروج فوراً من جميع الأجهزة والمتصفحات الأخرى باستثناء هذا الجهاز.'
                  : 'You will be logged out from all other devices and web browsers.'}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmTerminateAll(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleTerminateAllOther}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-bold text-white transition-colors"
              >
                {isArabic ? 'إنهاء الكل' : 'Terminate All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Scanner / Link Desktop Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 text-center">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">
                {isArabic ? 'ربط جهاز تيليجرام للكمبيوتر' : 'Link Telegram Desktop'}
              </h4>
              <button onClick={() => setShowQrModal(false)} className="text-gray-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-inner">
              {/* QR Code SVG */}
              <div className="w-40 h-40 bg-[#0e1621] rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden">
                <div className="grid grid-cols-5 gap-1.5 w-full h-full p-1 opacity-90">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${
                        i % 2 === 0 || i % 7 === 0 ? 'bg-[#5288c1]' : 'bg-white'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-[#2481cc] border-2 border-white flex items-center justify-center shadow-lg">
                    <Laptop className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1 text-left rtl:text-right px-2">
              <div>1. {isArabic ? 'افتح Telegram Desktop على جهازك.' : 'Open Telegram Desktop on your PC.'}</div>
              <div>2. {isArabic ? 'انتقل إلى الإعدادات > الأجهزة > ربط جهاز.' : 'Go to Settings > Devices > Link Desktop.'}</div>
              <div>3. {isArabic ? 'وجّه كاميرا هاتفك نحو هذا الرمز للمصادقة.' : 'Scan this QR code to login instantly.'}</div>
            </div>

            <button
              onClick={() => {
                setShowQrModal(false);
                showToast(isArabic ? 'تم تفعيل الاتصال برمز الاستجابة السريعة' : 'QR Auth Active', '📱');
              }}
              className="w-full py-2.5 bg-[#5288c1] hover:bg-[#4375aa] rounded-xl text-xs font-bold text-white transition-colors"
            >
              {isArabic ? 'تم الفهم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. BLOCKED USERS VIEW (BlockedUsersActivity.java)
// ==========================================
export const BlockedUsersView: React.FC<SubViewProps> = ({ onBack }) => {
  const { settings, showToast, blockUser } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [blockedList, setBlockedList] = useState<TLRPC.TL_contactBlocked[]>(
    privacyController.getState().blockedUsers
  );

  const handleUnblock = async (userId: string | number) => {
    await blockUser(String(userId), false);
    setBlockedList([...privacyController.getState().blockedUsers]);
  };

  const handleBlockDemo = async () => {
    const randomId = Math.floor(Math.random() * 90000) + 10000;
    await blockUser(String(randomId), true);
    setBlockedList([...privacyController.getState().blockedUsers]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="font-bold text-sm tracking-wide">
            {isArabic ? 'المستخدمون المحظورون' : 'Blocked Users'}
          </div>
        </div>
        <button
          onClick={handleBlockDemo}
          className="text-xs bg-[#5288c1] hover:bg-[#4375aa] px-3 py-1.5 rounded-lg text-white font-bold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isArabic ? 'حظر مستخدم' : 'Block User'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {blockedList.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center text-gray-400">
            <UserX className="w-12 h-12 text-gray-600 mb-2" />
            <div className="text-sm font-semibold">{isArabic ? 'لا يوجد مستخدمون محظورون' : 'No blocked users'}</div>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              {isArabic
                ? 'المستخدمون المحظورون لن يتمكنوا من مراسلتك أو الاتصال بك أو رؤية وقت آخر ظهور لك.'
                : 'Blocked users will not be able to send you messages or see your profile information.'}
            </p>
          </div>
        ) : (
          <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
            {blockedList.map((item) => (
              <div key={item.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                    ID
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">User #{item.user_id}</div>
                    <div className="text-[10px] text-gray-500">
                      {isArabic ? 'محظور منذ فترة' : 'Blocked contact'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(item.user_id)}
                  className="text-xs text-[#5288c1] hover:underline font-semibold"
                >
                  {isArabic ? 'إلغاء الحظر' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-Component: Radio Row
const RadioItem: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <div
    onClick={onClick}
    className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
  >
    <span className="text-xs font-medium text-white">{label}</span>
    <div
      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
        selected ? 'border-[#5288c1] bg-[#5288c1]' : 'border-gray-500'
      }`}
    >
      {selected && <Check className="w-3 h-3 text-white stroke-[3]" />}
    </div>
  </div>
);
