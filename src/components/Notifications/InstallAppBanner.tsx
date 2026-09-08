import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  X,
  Sparkles,
  CheckCircle2,
  Share,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import confetti from 'canvas-confetti';

export const InstallAppBanner: React.FC = () => {
  const { settings, setActiveModal, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed in this session
    const wasDismissed = sessionStorage.getItem('tg_install_banner_dismissed');
    if (!wasDismissed) {
      // Show notification after short delay (like AI Studio notification)
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2481cc', '#4caf50', '#ffb300', '#00bcd4'],
        });
      } catch {}
      showToast(
        isArabic
          ? 'تم تثبيت تطبيق Telegram بنجاح كـ تطبيق رسمي على جهازك!'
          : 'Telegram app installed successfully on your device!',
        '🎉'
      );
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isArabic, showToast]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('tg_install_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);

    // 1. Try Native PWA Install Prompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          try {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.5 },
            });
          } catch {}
          showToast(
            isArabic
              ? 'جاري تثبيت تيليجرام على جهازك...'
              : 'Installing Telegram on your device...',
            '🚀'
          );
          setIsInstalled(true);
          setIsVisible(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // 2. Check if iOS Safari
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos) {
      setShowIosGuide(true);
      setIsInstalling(false);
      return;
    }

    // 3. Fallback: Trigger direct install assistance + Open APK installer modal
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    showToast(
      isArabic
        ? 'تم تفعيل التثبيت المباشر! اختر تثبيت كـ تطبيق أو تحميل حزمة APK الموقعة'
        : 'Direct install activated! Choose standalone app or download signed APK',
      '📱'
    );

    setActiveModal('apk-installer');
    setIsInstalling(false);
    setIsVisible(false);
  };

  if (!isVisible || isInstalled) return null;

  return (
    <>
      {/* Floating AI-Studio Style Install Notification Banner */}
      <div
        id="tg-install-app-notification"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9990] w-[95%] max-w-xl animate-in slide-in-from-top-4 duration-300 pointer-events-auto select-none font-sans"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div
          className="relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-xl border border-white/20 text-white"
          style={{
            backgroundColor: 'rgba(21, 31, 43, 0.96)',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(36, 129, 204, 0.3)',
          }}
        >
          {/* Top Gradient Glowing Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2481cc] via-emerald-400 to-[#1c6fad]" />

          <div className="flex items-start gap-3.5">
            {/* Telegram App Icon with Badge - Multi-color animated gradient matching Login Screen */}
            <div className="relative shrink-0 w-12 h-12 rounded-full tg-multicolor-gradient flex items-center justify-center shadow-lg shadow-sky-500/25">
              <div className="tg-multicolor-glow" />
              <svg className="w-6.5 h-6.5 text-white -translate-x-0.5 relative z-10 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
              </svg>
              {/* Glowing Pulse Ring */}
              <div className="absolute inset-0 rounded-full border border-white/40 animate-pulse pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#151f2b] flex items-center justify-center z-20">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    {isArabic ? 'تثبيت تطبيق تيليجرام الرسمي' : 'Install Official Telegram App'}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#2481cc]/25 text-sky-300 border border-[#2481cc]/40">
                    Telegram_anwer saif (DrKLO Official Build)
                  </span>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleDismiss}
                  className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  title={isArabic ? 'إغلاق' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {isArabic
                  ? 'ثبّت تيليجرام مباشرة كتطبيق على هاتفك أو حاسوبك للوصول الفوري، واستقبال الإشعارات والعمل في الخلفية بشكل فعلي.'
                  : 'Install Telegram directly as a standalone app on your phone or PC for instant access, real notifications, and offline support.'}
              </p>

              {/* Action Buttons Row */}
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                {/* 1. Primary Direct Install Button */}
                <button
                  id="btn-confirm-install-app"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white text-xs font-bold shadow-lg transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isArabic ? 'تثبيت التطبيق الآن' : 'Install App Now'}</span>
                </button>

                {/* 2. Download APK Button */}
                <a
                  href="/api/telegram/apk/download"
                  download="Telegram_Anwer-v12.9.2-release.apk"
                  onClick={() =>
                    showToast(
                      isArabic ? 'بدأ تحميل حزمة APK الموقعة...' : 'Starting APK download...',
                      '📥'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2481cc]/20 hover:bg-[#2481cc]/35 border border-[#2481cc]/40 text-sky-200 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تحميل APK (54.8 MB)' : 'Download APK'}</span>
                </a>

                {/* 3. More options / Keystore specs */}
                <button
                  onClick={() => {
                    setActiveModal('apk-installer');
                    setIsVisible(false);
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'خيارات متقدمة' : 'More Options'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Guide Modal if needed */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-[#17212b] border border-white/10 text-white shadow-2xl space-y-4"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Share className="w-4 h-4 text-sky-400" />
                <span>{isArabic ? 'تثبيت التطبيق على iOS / iPhone' : 'Install on iOS / iPhone'}</span>
              </h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/30 border border-white/5">
                <span className="w-5 h-5 rounded-full bg-[#2481cc] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <span>{isArabic ? 'اضغط على زر المشاركة (Share) أسفل متصفح Safari.' : 'Tap the Share button at the bottom of Safari.'}</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/30 border border-white/5">
                <span className="w-5 h-5 rounded-full bg-[#2481cc] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <span>{isArabic ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).' : 'Scroll down and tap "Add to Home Screen".'}</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/30 border border-white/5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </span>
                <span>{isArabic ? 'اضغط "إضافة" في الزاوية العلوية، وسيظهر تطبيق تيليجرام على شاشتك الرئيسية!' : 'Tap "Add" in the top right to complete installation!'}</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1c6fad] text-white font-bold text-xs shadow-md transition-colors"
            >
              {isArabic ? 'فهمت ذلك' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
