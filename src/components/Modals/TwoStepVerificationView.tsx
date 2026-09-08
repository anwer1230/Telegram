import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  HelpCircle,
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTelegram } from '../../context/TelegramContext';
import {
  twoStepController,
  TwoStepState,
} from '../../core/messenger/TwoStepVerificationController';

interface TwoStepVerificationViewProps {
  onBack: () => void;
}

type Step =
  | 'overview'
  | 'enter_current_password'
  | 'set_new_password'
  | 'confirm_password'
  | 'enter_hint'
  | 'enter_email'
  | 'confirm_email_code'
  | 'reset_warning';

export const TwoStepVerificationView: React.FC<TwoStepVerificationViewProps> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [twoStepState, setTwoStepState] = useState<TwoStepState>(twoStepController.getState());
  const [currentStep, setCurrentStep] = useState<Step>('overview');
  const [loading, setLoading] = useState(false);

  // Form Inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [timerCount, setTimerCount] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [pendingAction, setPendingAction] = useState<'change' | 'disable' | 'set'>('set');

  // Load state on mount
  useEffect(() => {
    twoStepController.getPassword().then((res) => {
      setTwoStepState(twoStepController.getState());
    });
  }, []);

  // Countdown timer for email code
  useEffect(() => {
    let interval: any;
    if (currentStep === 'confirm_email_code' && timerCount > 0) {
      interval = setInterval(() => {
        setTimerCount((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, timerCount]);

  const handleStartSetup = () => {
    setNewPassword('');
    setConfirmPassword('');
    setHint('');
    setRecoveryEmail('');
    setErrorMessage('');
    setCurrentStep('set_new_password');
  };

  const handleStartChange = () => {
    setCurrentPassword('');
    setErrorMessage('');
    setPendingAction('change');
    setCurrentStep('enter_current_password');
  };

  const handleStartDisable = () => {
    setCurrentPassword('');
    setErrorMessage('');
    setPendingAction('disable');
    setCurrentStep('enter_current_password');
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      setErrorMessage(isArabic ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter current password');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      if (pendingAction === 'disable') {
        await twoStepController.updatePasswordSettings({
          currentPassword,
          newPassword: '',
        });
        setTwoStepState(twoStepController.getState());
        showToast(isArabic ? 'تم إلغاء كلمة المرور الثنائية' : '2FA Password disabled', '🔓');
        setCurrentStep('overview');
      } else {
        setNewPassword('');
        setConfirmPassword('');
        setHint('');
        setRecoveryEmail('');
        setCurrentStep('set_new_password');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isArabic ? 'كلمة المرور غير صحيحة' : 'Invalid current password'));
    } finally {
      setLoading(false);
    }
  };

  const handleNextFromNewPassword = () => {
    if (newPassword.length < 4) {
      setErrorMessage(isArabic ? 'يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل' : 'Password must be at least 4 characters');
      return;
    }
    setErrorMessage('');
    setCurrentStep('confirm_password');
  };

  const handleNextFromConfirmPassword = () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage(isArabic ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match (PasswordDoNotMatch)');
      return;
    }
    setErrorMessage('');
    setCurrentStep('enter_hint');
  };

  const handleNextFromHint = () => {
    if (hint && hint.toLowerCase() === newPassword.toLowerCase()) {
      setErrorMessage(isArabic ? 'لا يمكن أن يكون التلميح مطابقاً لكلمة المرور' : 'Hint cannot be the same as password');
      return;
    }
    setErrorMessage('');
    setCurrentStep('enter_email');
  };

  const handleSavePasswordAndEmail = async (skipEmail: boolean = false) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const emailToSet = skipEmail ? '' : recoveryEmail.trim();
      const result = await twoStepController.updatePasswordSettings({
        currentPassword: pendingAction === 'change' ? currentPassword : '',
        newPassword,
        hint,
        email: emailToSet,
      });

      setLoading(false);
      setTwoStepState(twoStepController.getState());

      if (result.needEmailConfirm && emailToSet) {
        setTimerCount(60);
        setCurrentStep('confirm_email_code');
      } else {
        showToast(isArabic ? 'تم تفعيل كلمة المرور الثنائية بنجاح' : 'Two-Step Verification activated successfully', '🔒');
        setCurrentStep('overview');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || (isArabic ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error updating password settings'));
    }
  };

  const handleConfirmEmailCode = async () => {
    if (emailCode.length < 6) {
      setErrorMessage(isArabic ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام' : 'Please enter 6-digit code');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      await twoStepController.confirmEmailCode(emailCode);
      setLoading(false);
      setTwoStepState(twoStepController.getState());
      showToast(isArabic ? 'تم تأكيد البريد الإلكتروني وتفعيل التحقق بنجاح' : 'Email confirmed and 2FA active', '✅');
      setCurrentStep('overview');
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || (isArabic ? 'رمز التحقق غير صحيح' : 'Invalid confirmation code'));
    }
  };

  const handleResendCode = async () => {
    if (timerCount > 0) return;
    setIsResending(true);
    try {
      await twoStepController.resendEmailCode();
      setTimerCount(60);
      showToast(isArabic ? 'تمت إعادة إرسال الرمز للبريد' : 'Verification code resent', '📧');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentStep === 'overview') {
                onBack();
              } else {
                setCurrentStep('overview');
              }
            }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="font-bold text-sm tracking-wide">
            {isArabic ? 'التحقق بخطوتين' : 'Two-Step Verification'}
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step: Overview */}
        {currentStep === 'overview' && (
          <div className="space-y-4">
            <div className="p-6 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#5288c1]/20 flex items-center justify-center text-[#5288c1] mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {twoStepState.hasPassword
                  ? isArabic
                    ? 'التحقق بخطوتين مفعّل'
                    : 'Two-Step Verification is Active'
                  : isArabic
                  ? 'عيّن كلمة مرور إضافية'
                  : 'Set Additional Password'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                {isArabic
                  ? 'ستُطلب كلمة المرور هذه بالإضافة إلى رمز الرسائل القصيرة عند تسجيل الدخول على أي جهاز جديد.'
                  : 'You have two-step verification enabled. You will need to enter this password when logging in on a new device.'}
              </p>
            </div>

            {twoStepState.hasPassword ? (
              <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
                <div
                  onClick={handleStartChange}
                  className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm font-medium">{isArabic ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                  </div>
                </div>

                <div
                  onClick={handleStartDisable}
                  className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors text-rose-400"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5" />
                    <span className="text-sm font-medium">{isArabic ? 'إيقاف كلمة المرور' : 'Turn Off Password'}</span>
                  </div>
                </div>

                {twoStepState.hint && (
                  <div className="px-4 py-3.5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-400">{isArabic ? 'التلميح الحالي:' : 'Current Hint:'}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-300">{twoStepState.hint}</span>
                  </div>
                )}

                {twoStepState.emailPattern && (
                  <div className="px-4 py-3.5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-teal-400" />
                      <span className="text-xs text-gray-400">{isArabic ? 'بريد الاسترجاع:' : 'Recovery Email:'}</span>
                    </div>
                    <span className="text-xs font-mono text-teal-300">{twoStepState.emailPattern}</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleStartSetup}
                className="w-full py-3.5 bg-[#5288c1] hover:bg-[#4375aa] text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isArabic ? 'تعيين كلمة مرور' : 'Set Password'}</span>
              </button>
            )}
          </div>
        )}

        {/* Step: Enter Current Password */}
        {currentStep === 'enter_current_password' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs text-gray-400">
                {isArabic
                  ? 'يرجى إدخال كلمة المرور السحابية الحالية للمتابعة:'
                  : 'Please enter your current cloud password to proceed:'}
              </div>

              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCurrentPassword()}
                  placeholder={isArabic ? 'كلمة المرور الحالية' : 'Current Password'}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#5288c1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute left-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && <div className="text-xs text-rose-400 font-medium">{errorMessage}</div>}

              <button
                disabled={loading}
                onClick={handleVerifyCurrentPassword}
                className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isArabic ? 'تأكيد' : 'Continue'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Set New Password */}
        {currentStep === 'set_new_password' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs text-gray-300 font-semibold">
                {isArabic ? 'أدخل كلمة المرور الجديدة:' : 'Enter your new password:'}
              </div>

              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextFromNewPassword()}
                  placeholder={isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#5288c1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute left-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && <div className="text-xs text-rose-400 font-medium">{errorMessage}</div>}

              <button
                onClick={handleNextFromNewPassword}
                className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] text-white text-sm font-bold rounded-xl transition-all shadow-md"
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm Password */}
        {currentStep === 'confirm_password' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs text-gray-300 font-semibold">
                {isArabic ? 'أعد إدخال كلمة المرور للتأكيد:' : 'Re-enter your password:'}
              </div>

              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextFromConfirmPassword()}
                  placeholder={isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#5288c1]"
                />
              </div>

              {errorMessage && <div className="text-xs text-rose-400 font-medium">{errorMessage}</div>}

              <button
                onClick={handleNextFromConfirmPassword}
                className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] text-white text-sm font-bold rounded-xl transition-all shadow-md"
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Enter Hint */}
        {currentStep === 'enter_hint' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs text-gray-300 font-semibold">
                {isArabic ? 'أنشئ تلميحاً لكلمة المرور (اختياري):' : 'Create a hint for your password:'}
              </div>

              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNextFromHint()}
                placeholder={isArabic ? 'تلميح كلمة المرور' : 'Password Hint'}
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#5288c1]"
              />

              {errorMessage && <div className="text-xs text-rose-400 font-medium">{errorMessage}</div>}

              <button
                onClick={handleNextFromHint}
                className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] text-white text-sm font-bold rounded-xl transition-all shadow-md"
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Enter Recovery Email */}
        {currentStep === 'enter_email' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                <Mail className="w-4 h-4" />
                <span>{isArabic ? 'البريد الإلكتروني للاسترجاع' : 'Recovery Email'}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {isArabic
                  ? 'أدخل بريدك الإلكتروني لتتمكن من استعادة كلمة المرور في حال نسيانها عبر رمز تحقق يُرسل إليك.'
                  : 'Please add your valid email. It is the only way to recover a forgotten password.'}
              </p>

              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#5288c1]"
              />

              {errorMessage && <div className="text-xs text-rose-400 font-medium">{errorMessage}</div>}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  disabled={loading || !recoveryEmail.includes('@')}
                  onClick={() => handleSavePasswordAndEmail(false)}
                  className="w-full py-3 bg-[#5288c1] hover:bg-[#4375aa] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{isArabic ? 'حفظ ومتابعة التأكيد' : 'Save and Verify'}</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleSavePasswordAndEmail(true)}
                  className="w-full py-2.5 text-xs text-gray-400 hover:text-rose-300 transition-colors"
                >
                  {isArabic ? 'تخطي البريد (غير مستحسن)' : 'Skip Email (Not Recommended)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Confirm Email Code */}
        {currentStep === 'confirm_email_code' && (
          <div className="space-y-4">
            <div className="p-5 bg-[#17212b] rounded-2xl border border-white/10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {isArabic ? 'تحقق من بريدك الإلكتروني' : 'Verification Code'}
                </h4>
                <p className="text-xs text-gray-400">
                  {isArabic
                    ? `أرسلنا رمز تحقق إلى ${recoveryEmail}`
                    : `We have sent a 6-digit verification code to ${recoveryEmail}`}
                </p>
              </div>

              <input
                type="text"
                maxLength={6}
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-48 mx-auto bg-[#242f3d] border border-white/10 rounded-xl py-3 text-center text-lg font-mono tracking-widest text-white outline-none focus:border-teal-400"
              />

              {errorMessage && <div className="text-xs text-rose-400 font-medium">{errorMessage}</div>}

              <button
                disabled={loading || emailCode.length < 6}
                onClick={handleConfirmEmailCode}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{isArabic ? 'تأكيد الرمز' : 'Confirm Code'}</span>
              </button>

              <div className="pt-2">
                {timerCount > 0 ? (
                  <div className="text-xs text-gray-500 font-mono flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isArabic ? `إعادة الإرسال بعد ${timerCount} ثانية` : `Resend in ${timerCount}s`}</span>
                  </div>
                ) : (
                  <button
                    disabled={isResending}
                    onClick={handleResendCode}
                    className="text-xs text-teal-400 hover:underline font-semibold"
                  >
                    {isArabic ? 'إعادة إرسال الرمز' : 'Resend code'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
