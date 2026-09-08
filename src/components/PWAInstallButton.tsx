import React, { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle2, Share, X, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallButtonProps {
  className?: string;
  isArabic?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  isArabic = true,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isJustInstalled, setIsJustInstalled] = useState<boolean>(false);
  const [showToastMessage, setShowToastMessage] = useState<string | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  // 1. Initial standalone & device detection
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        (typeof window !== 'undefined' &&
          (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
            document.referrer.includes('android-app://'))) ||
        false;
      setIsStandalone(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleModeChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleModeChange);
    }

    // Detect iOS devices (iPhone, iPad, iPod)
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Capture beforeinstallprompt for Android Chrome & Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // App installed event listener
    const handleAppInstalled = () => {
      setIsJustInstalled(true);
      setDeferredPrompt(null);
      setShowToastMessage(
        isArabic
          ? 'تم تثبيت التطبيق بنجاح! أصبح متوفراً على شاشتك الرئيسية.'
          : 'App installed successfully! Now available on your home screen.'
      );
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleModeChange);
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isArabic]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!showToastMessage) return;
    const timer = setTimeout(() => {
      setShowToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [showToastMessage]);

  // Android (Chrome): Trigger native prompt directly without fake "installing" state
  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      // 1. Direct call to deferredPrompt.prompt()
      await deferredPrompt.prompt();

      // 2. Await user choice
      const choiceResult = await deferredPrompt.userChoice;

      // 3. If accepted, hide button by marking as installed and clear deferredPrompt
      if (choiceResult.outcome === 'accepted') {
        setIsJustInstalled(true);
        setDeferredPrompt(null);
        setShowToastMessage(
          isArabic
            ? 'تم تثبيت التطبيق بنجاح! شكراً لك.'
            : 'Installation completed successfully!'
        );
      }
    } catch (err) {
      console.error('[PWAInstallButton] Error during prompt():', err);
    }
  }, [deferredPrompt, isArabic]);

  // CASE A: App was just installed during this session -> Hide install button
  if (isJustInstalled && !isStandalone) {
    return (
      <>
        {showToastMessage && (
          <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 rounded-2xl bg-[#1E1E2E]/95 border border-[#22C55E]/50 text-white px-4 py-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <p className="text-xs font-semibold">{showToastMessage}</p>
            <button
              onClick={() => setShowToastMessage(null)}
              className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </>
    );
  }

  // CASE B: App is running in standalone mode (already installed)
  if (isStandalone) {
    return (
      <div className="relative inline-flex items-center">
        <div
          className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8A2BE2]/15 to-[#FF69B4]/15 border border-[#8A2BE2]/40 px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span>{isArabic ? 'تطبيق الويب مثبت (PWA)' : 'PWA Installed'}</span>
        </div>
      </div>
    );
  }

  // CASE C: iOS (Safari) - Do NOT show standard install button, show instructional prompt
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setShowIOSGuide(true);
            setShowToastMessage(
              isArabic
                ? 'اضغط على زر المشاركة (Share)، ثم اختر إضافة إلى الشاشة الرئيسية (Add to Home Screen)'
                : 'Tap Share, then choose Add to Home Screen'
            );
          }}
          className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all ${className}`}
          title={isArabic ? 'تعليمات التثبيت على آيفون' : 'Install Guide for iOS'}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <Share className="w-4 h-4 text-white" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#22C55E] border border-white" />
          </div>
          <span>{isArabic ? 'إضافة للشاشة الرئيسية (iOS)' : 'Add to Home Screen'}</span>
        </button>

        {/* Floating Toast Notification on iOS */}
        {showToastMessage && (
          <div className="fixed bottom-5 right-5 z-[99999] max-w-sm flex items-start gap-3 rounded-2xl bg-[#1E1E2E]/95 border border-[#8A2BE2]/60 text-white px-4 py-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
            <Info className="w-5 h-5 text-[#FF69B4] shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-[#FF69B4] mb-0.5">{isArabic ? 'تثبيت على آيفون / آيباد' : 'Install on iOS'}</p>
              <p className="text-gray-200">{showToastMessage}</p>
            </div>
            <button
              onClick={() => setShowToastMessage(null)}
              className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Full Interactive iOS Instructions Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
            <div
              className="w-full max-w-sm rounded-2xl bg-[#1E1E2E] border border-[#8A2BE2]/40 p-6 shadow-2xl text-right rtl:text-right"
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] flex items-center justify-center text-white shadow-sm">
                    <Share className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isArabic ? 'تثبيت التطبيق على آيفون (iOS)' : 'Install on iPhone (iOS)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-gray-200">
                <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#8A2BE2]/40 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="leading-relaxed">
                    {isArabic ? (
                      <>
                        اضغط على زر <strong className="text-[#FF69B4]">المشاركة (Share <Share className="inline w-3.5 h-3.5 text-[#FF69B4]" />)</strong> في أسفل شريط متصفح سفاري.
                      </>
                    ) : (
                      <>
                        Tap the <strong>Share</strong> button at the bottom of Safari.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#22C55E]/40 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="leading-relaxed">
                    {isArabic ? (
                      <>
                        مرر لأسفل في القائمة واختر <strong className="text-[#22C55E]">إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                      </>
                    ) : (
                      <>
                        Scroll down and select <strong>Add to Home Screen</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] py-2.5 text-xs font-bold text-white hover:brightness-110 transition shadow-lg"
              >
                {isArabic ? 'حسناً، فهمت ذلك' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // CASE D: Android (Chrome) & Desktop - deferredPrompt is ready
  if (deferredPrompt) {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all ${className}`}
          title={isArabic ? 'تثبيت التطبيق على جهازك' : 'Install App'}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-white" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-[#22C55E] border border-white" />
          </div>
          <span>{isArabic ? 'تثبيت التطبيق' : 'Install App'}</span>
        </button>

        {/* Floating Toast */}
        {showToastMessage && (
          <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 rounded-2xl bg-[#1E1E2E]/95 border border-[#22C55E]/50 text-white px-4 py-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <p className="text-xs font-semibold">{showToastMessage}</p>
            <button
              onClick={() => setShowToastMessage(null)}
              className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback if not installable or not detected yet
  return null;
};

export default PWAInstallButton;

