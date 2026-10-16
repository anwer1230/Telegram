import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Bell,
  X,
  Share,
  PlusSquare,
  Loader2,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallModal({ isOpen, onClose }: PWAInstallModalProps) {
  const {
    isInstallable,
    isInstalled,
    isInstalling,
    installStatus,
    setInstallStatus,
    isIOS,
    isAndroid,
    isInIframe,
    install,
    deferredPrompt,
  } = usePWAInstall();

  const [installStep, setInstallStep] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);

  if (!isOpen) return null;

  const handleStartInstall = async () => {
    setInstallStep('preparing');
    setProgress(20);

    // Step 1: Prep
    const t1 = setTimeout(() => {
      setProgress(55);
      setInstallStep('registering');
    }, 400);

    // Step 2: Invoke native prompt
    if (deferredPrompt) {
      setTimeout(async () => {
        setProgress(85);
        setInstallStep('prompting');
        const res = await install();
        if (res.success) {
          setProgress(100);
          setInstallStep('completed');
        } else {
          setProgress(0);
          setInstallStep('idle');
        }
      }, 700);
    } else {
      // If prompt isn't natively captured (e.g. inside AI Studio iframe or browser hasn't fired it yet)
      setTimeout(() => {
        setProgress(100);
        setInstallStep('guidance');
      }, 800);
    }
  };

  const handleOpenStandalone = () => {
    // Open outside iframe in new tab for direct browser installation
    window.open(window.location.href, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
      data-testid="pwa-install-modal"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          data-testid="pwa-close-btn"
          className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          aria-label="إغلاق النافذة"
        >
          <X size={16} />
        </button>

        {/* Header App Info */}
        <div className="flex items-center gap-4 border-b border-border/60 pb-5">
          <div className="relative">
            <img
              src="/icons/icon-192.png"
              alt="Telegram Web Pro"
              className="h-16 w-16 rounded-2xl object-cover shadow-md border border-primary/20"
              onError={e => {
                // Fallback to app logo or local svg
                (e.currentTarget as HTMLImageElement).src = '/icons/app-logo.png';
              }}
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
              <ShieldCheck size={12} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Telegram Web Pro</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                PWA
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">تطبيق تيليجرام الرسمي المتقدم للهاتف</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              جاهز للتثبيت الفعلي على جهازك
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="py-5 space-y-4">
          {/* Status: Already Installed */}
          {isInstalled || installStep === 'completed' ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  تم تثبيت التطبيق بنجاح على هاتفك!
                </h3>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  أصبح بإمكانك الآن فتح التطبيق مباشرة من الشاشة الرئيسية لجهازك بدون أي متصفح، مع كامل المزايا وسرعة الاستجابة.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                حسناً، تم
              </button>
            </div>
          ) : installStep === 'preparing' || installStep === 'registering' || installStep === 'prompting' ? (
            /* Status: Installing Progress */
            <div className="rounded-2xl bg-secondary/50 border border-border/80 p-5 text-center space-y-4">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Loader2 size={26} className="animate-spin text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">جاري التثبيت على الهاتف...</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {installStep === 'preparing' && 'جاري تحضير ملفات التطبيق وقواعد البيانات السريعة...'}
                  {installStep === 'registering' && 'جاري تسجيل Service Worker في نظام هاتفك...'}
                  {installStep === 'prompting' && 'يرجى النقر على "تثبيت" في نافذة الهاتف الظاهرة...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            /* Status: Idle / Info Screen */
            <>
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-2.5 text-right">
                <div className="flex items-start gap-2.5 rounded-xl bg-secondary/40 p-2.5 border border-border/50">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
                    <Smartphone size={15} />
                  </div>
                  <div>
                    <strong className="block text-[11px] font-bold text-foreground">أيقونة مستقلة</strong>
                    <small className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                      يظهر على شاشة الهاتف الرئيسية كأي تطبيق
                    </small>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-secondary/40 p-2.5 border border-border/50">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Zap size={15} />
                  </div>
                  <div>
                    <strong className="block text-[11px] font-bold text-foreground">سرعة فائقة</strong>
                    <small className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                      تحميل فوري وتخزين مؤقت بدون استهلاك بيانات
                    </small>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-secondary/40 p-2.5 border border-border/50">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Bell size={15} />
                  </div>
                  <div>
                    <strong className="block text-[11px] font-bold text-foreground">إشعارات الهاتف</strong>
                    <small className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                      تنبيهات فورية بالرسائل والمكالمات
                    </small>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-secondary/40 p-2.5 border border-border/50">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-500">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <strong className="block text-[11px] font-bold text-foreground">بدون أشرطة متصفح</strong>
                    <small className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                      تجربة ملء الشاشة طبق الأصل لتطبيق تيليجرام
                    </small>
                  </div>
                </div>
              </div>

              {/* In-Iframe / AI Studio Notice */}
              {isInIframe && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-200">
                  <Info size={16} className="shrink-0 text-blue-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-[11px]">ملاحظة لتثبيت التطبيق على هاتفك:</p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-normal">
                      لأن المعاينة تعمل داخل إطار (Iframe)، يفضل فتح التطبيق في المتصفح الرئيسي للهاتف ليتمكن النظام من التثبيت المباشر بنقرة واحدة.
                    </p>
                  </div>
                </div>
              )}

              {/* iOS Safari Instructions Accordion/Card */}
              {isIOS && (
                <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3.5 space-y-2 text-right">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Smartphone size={14} className="text-primary" />
                    طريقة التثبيت على أجهزة iPhone / iPad (Safari):
                  </p>
                  <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pr-4">
                    <li>
                      اضغط على زر <strong className="text-foreground">المشاركة (Share) <Share size={12} className="inline mx-1" /></strong> في شريط متصفح Safari بالأسفل.
                    </li>
                    <li>
                      مرر للأسفل واختر <strong className="text-foreground">إضافة إلى الشاشة الرئيسية (Add to Home Screen) <PlusSquare size={12} className="inline mx-1" /></strong>.
                    </li>
                    <li>
                      اضغط على <strong className="text-foreground">إضافة (Add)</strong> في أعلى الزاوية، وسيظهر التطبيق فوراً على شاشتك!
                    </li>
                  </ol>
                </div>
              )}

              {/* Install Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleStartInstall}
                  data-testid="pwa-install-btn"
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-5 py-3.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.99] transition cursor-pointer"
                >
                  <Download size={18} />
                  <span>تثبيت التطبيق على الجوال الآن (PWA)</span>
                </button>

                {isInIframe && (
                  <button
                    type="button"
                    onClick={handleOpenStandalone}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>فتح في متصفح الهاتف للتثبيت التلقائي</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="border-t border-border/50 pt-3 text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            تطبيق ويب تقدمي خفيف، آمن 100%، ولا يستهلك مساحة التخزين.
          </p>
        </div>
      </div>
    </div>
  );
}
