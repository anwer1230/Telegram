import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  Share2,
  ShieldCheck,
  Zap,
  Bot,
  Gamepad2,
  Wallet,
  Globe,
  Coins,
  CheckCircle2,
  Play,
  Flame,
  ArrowRight,
  Code,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import confetti from 'canvas-confetti';

interface MiniAppItem {
  id: string;
  name: string;
  nameAr: string;
  botUsername: string;
  category: 'game' | 'utility' | 'crypto' | 'ai';
  icon: string;
  description: string;
  descriptionAr: string;
  url: string;
  starsPrice?: number;
  featured?: boolean;
}

const FEATURED_MINI_APPS: MiniAppItem[] = [
  {
    id: 'app_notcoin',
    name: 'Notcoin Clicker',
    nameAr: 'نوت كوين (Notcoin)',
    botUsername: '@notcoin_bot',
    category: 'crypto',
    icon: '🟡',
    description: 'Tap-to-earn game & Web3 gateway with millions of players.',
    descriptionAr: 'لعبة الضغط للربح وبوابة Web3 الشهيرة على شبكة TON.',
    url: 'https://notcoin.com',
    starsPrice: 0,
    featured: true,
  },
  {
    id: 'app_major',
    name: 'Major Stars & Games',
    nameAr: 'ماجور للنجوم والألعاب',
    botUsername: '@major_official_bot',
    category: 'game',
    icon: '⭐',
    description: 'Compete for Telegram Stars rankings and mini-game bonuses.',
    descriptionAr: 'تنافس في تصنيفات نجوم تيليجرام واكسب مكافآت يومية.',
    url: 'https://telegram.org/blog/stars',
    starsPrice: 50,
    featured: true,
  },
  {
    id: 'app_wallet',
    name: 'TON Space Wallet',
    nameAr: 'محفظة TON الرسمية',
    botUsername: '@wallet',
    category: 'crypto',
    icon: '💎',
    description: 'Non-custodial cryptocurrency wallet built directly into Telegram.',
    descriptionAr: 'المحفظة الرقمية اللامركزية المدمجة في تيليجرام لإدارة وتداول TON.',
    url: 'https://wallet.tg',
    starsPrice: 0,
    featured: true,
  },
  {
    id: 'app_ai_studio',
    name: 'AI Studio Assistant',
    nameAr: 'مساعد AI Studio الذكي',
    botUsername: '@aistudio_bot',
    category: 'ai',
    icon: '🤖',
    description: 'Next-gen Gemini Multimodal Assistant embedded in Telegram.',
    descriptionAr: 'مساعد الذكاء الاصطناعي التوليدي والترجمة الفورية من Google Gemini.',
    url: 'https://ai.google.dev',
    starsPrice: 0,
    featured: true,
  },
  {
    id: 'app_catizen',
    name: 'Catizen Game Center',
    nameAr: 'كاتيزين - مركز ألعاب القطط',
    botUsername: '@catizen_bot',
    category: 'game',
    icon: '🐱',
    description: 'Playful Web3 swipe-and-merge game ecosystem on TON.',
    descriptionAr: 'لعبة دمج القطط التفاعلية مع خيارات الشراء بنجوم تيليجرام.',
    url: 'https://catizen.ai',
    starsPrice: 20,
  },
  {
    id: 'app_blum',
    name: 'Blum Crypto Exchange',
    nameAr: 'منصة بلوم (Blum)',
    botUsername: '@blum_crypto_bot',
    category: 'crypto',
    icon: '🌸',
    description: 'Hybrid trading app combining CEX & DEX inside Telegram WebApps.',
    descriptionAr: 'منصة تداول وربح النقاط المدمجة كتطبيق تيليجرام مصغر.',
    url: 'https://blum.io',
    starsPrice: 0,
  },
];

export interface MiniAppsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const MiniAppsModal: React.FC<MiniAppsModalProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const { activeModal, setActiveModal, currentUser, settings, showToast } = useTelegram();
  const isOpen = propIsOpen !== undefined ? propIsOpen : activeModal === ('mini-apps' as any);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeApp, setActiveApp] = useState<MiniAppItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSimulatingLaunch, setIsSimulatingLaunch] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [userStars, setUserStars] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tg_user_stars_balance');
      return saved ? parseInt(saved, 10) : 350;
    } catch {
      return 350;
    }
  });

  // Simulated WebApp state
  const [gameScore, setGameScore] = useState(0);
  const [mainButtonText, setMainButtonText] = useState('اضغط للربح (TAP TO EARN)');
  const [mainButtonLoading, setMainButtonLoading] = useState(false);

  const isArabic = settings.language === 'ar';

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveApp(null);
    setIsFullscreen(false);
    if (propOnClose) {
      propOnClose();
    } else {
      setActiveModal('none');
    }
  };

  const handleLaunchApp = (app: MiniAppItem) => {
    setIsSimulatingLaunch(true);
    setGameScore(0);
    setMainButtonText(isArabic ? 'اضغط للربح (TAP TO EARN)' : 'TAP TO EARN (+10)');
    setTimeout(() => {
      setActiveApp(app);
      setIsSimulatingLaunch(false);
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    }, 300);
  };

  const handleLaunchCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim().startsWith('http')
      ? customUrlInput.trim()
      : `https://${customUrlInput.trim()}`;

    const customApp: MiniAppItem = {
      id: `custom_${Date.now()}`,
      name: 'Custom WebApp',
      nameAr: 'تطبيق ويب مخصص',
      botUsername: '@webapp_bot',
      category: 'utility',
      icon: '🌐',
      description: url,
      descriptionAr: url,
      url,
      starsPrice: 0,
    };
    handleLaunchApp(customApp);
    setCustomUrlInput('');
  };

  const handleSpendStars = (amount: number, appName: string) => {
    if (userStars < amount) {
      showToast(
        isArabic ? 'رصيدك من نجوم Telegram غير كافٍ!' : 'Insufficient Telegram Stars balance!',
        '⚠️'
      );
      return;
    }
    const newBal = userStars - amount;
    setUserStars(newBal);
    localStorage.setItem('tg_user_stars_balance', String(newBal));
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.5 },
      });
    } catch {}
    showToast(
      isArabic
        ? `تم دفع ${amount} نجمة لـ ${appName} بنجاح! ⭐`
        : `Successfully paid ${amount} Stars to ${appName}! ⭐`,
      '⭐'
    );
  };

  const handleMainButtonClick = () => {
    // Official window.Telegram.WebApp.MainButton simulation
    setGameScore((s) => s + 10);
    setMainButtonLoading(true);
    setTimeout(() => {
      setMainButtonLoading(false);
    }, 150);

    // Haptic feedback simulation
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
  };

  const filteredApps =
    activeCategory === 'all'
      ? FEATURED_MINI_APPS
      : FEATURED_MINI_APPS.filter((a) => a.category === activeCategory);

  return (
    <div
      id="modal-mini-apps"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div
        className={`w-full bg-[#17212b] border border-white/10 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          activeApp && isFullscreen
            ? 'h-[98vh] max-w-5xl'
            : activeApp
            ? 'h-[88vh] max-w-4xl'
            : 'max-h-[88vh] max-w-3xl'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#1e2c3a]/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {activeApp ? (
              <>
                <button
                  onClick={() => setActiveApp(null)}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-sky-400"
                >
                  {isArabic ? '← العودة' : '← Back'}
                </button>
                <div className="text-2xl">{activeApp.icon}</div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <span>{isArabic ? activeApp.nameAr : activeApp.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 font-mono">
                      Telegram.WebApp v7.10
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {activeApp.botUsername}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2481cc] to-sky-400 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isArabic ? 'تطبيقات تليجرام المصغرة (Mini Apps)' : 'Telegram Mini Apps Platform'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {isArabic ? 'منصة ألعاب وبوتات WebApps على شبكة TON' : 'WebApps & Games Ecosystem'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stars Balance Indicator */}
            <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
              <span>⭐</span>
              <span>{userStars}</span>
            </div>

            {activeApp && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title={isFullscreen ? 'Restore' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeApp ? (
          /* Active Mini App Webview Sandbox Container */
          <div className="flex-1 flex flex-col bg-[#0e1621] relative overflow-hidden">
            {/* MiniApp Protocol Bar */}
            <div className="px-3 py-1.5 bg-[#17212b] border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono text-[10px] text-emerald-400 truncate">
                  window.Telegram.WebApp (initData: user_{currentUser.id})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeApp.starsPrice && activeApp.starsPrice > 0 ? (
                  <button
                    onClick={() => handleSpendStars(activeApp.starsPrice!, activeApp.name)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    <span>{isArabic ? 'دفع بالنجوم' : 'Pay with Stars'}</span>
                    <span className="font-mono">({activeApp.starsPrice} ⭐)</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Embedded Live Container / Interactive Sandbox */}
            <div className="flex-1 flex flex-col items-center justify-between p-4 relative overflow-y-auto">
              {/* App Interactive Canvas / Tap-To-Earn Interface */}
              <div className="w-full max-w-md my-auto flex flex-col items-center text-center space-y-4">
                <div
                  onClick={handleMainButtonClick}
                  className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#2481cc] via-sky-400 to-amber-300 flex items-center justify-center text-5xl shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-100 border-4 border-white/20 select-none group"
                >
                  <span className="group-hover:rotate-12 transition-transform">
                    {activeApp.icon}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-white font-mono flex items-center justify-center gap-2">
                    <Coins className="w-6 h-6 text-amber-400 animate-spin" />
                    <span>+{gameScore}</span>
                    <span className="text-xs text-amber-400 font-sans">{isArabic ? 'نقطة' : 'PTS'}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {isArabic ? 'اضغط على الأيقونة أو الزر الرئيسي لكسب النقاط!' : 'Tap the coin or main button to mine points!'}
                  </p>
                </div>

                {/* Session Info Card */}
                <div className="w-full p-3.5 rounded-2xl bg-[#17212b]/80 border border-white/10 text-left rtl:text-right space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{isArabic ? 'المستخدم' : 'Peer'}:</span>
                    <span className="font-bold text-sky-400">{currentUser.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">initData:</span>
                    <span className="font-mono text-[10px] text-emerald-400 truncate max-w-[200px]">
                      query_id=AAH_{Date.now()}&user_id={currentUser.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Theme Params:</span>
                    <span className="font-mono text-[10px] text-gray-300">#17212b (Dark Telegram)</span>
                  </div>
                </div>

                <a
                  href={activeApp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 underline underline-offset-4"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'فتح الرابط في متصفح خارجي' : 'Open in External Browser'}</span>
                </a>
              </div>

              {/* Official Telegram WebApp MainButton at the bottom */}
              <div className="w-full max-w-md pt-3">
                <button
                  id="telegram-webapp-main-button"
                  onClick={handleMainButtonClick}
                  disabled={mainButtonLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#2481cc] hover:bg-[#1c70b4] text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  {mainButtonLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 fill-white" />
                  )}
                  <span>{mainButtonText}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Mini Apps Directory Catalog */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Custom URL Launcher Bar */}
            <form onSubmit={handleLaunchCustomUrl} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'أدخل رابط أي بوت أو تطبيق ويب تيليجرام (https://...)'
                      : 'Launch any Telegram WebApp URL (https://...)'
                  }
                  className="w-full bg-[#1e2c3a] border border-white/10 rounded-2xl py-2.5 px-9 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={!customUrlInput.trim()}
                className="px-4 py-2.5 rounded-2xl bg-[#2481cc] hover:bg-[#1c70b4] disabled:opacity-50 text-white font-bold text-xs shrink-0 transition-colors"
              >
                {isArabic ? 'تشغيل' : 'Launch'}
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: isArabic ? 'الكل' : 'All', icon: Sparkles },
                { id: 'game', label: isArabic ? 'ألعاب' : 'Games', icon: Gamepad2 },
                { id: 'crypto', label: isArabic ? 'Web3 & TON' : 'Web3 & TON', icon: Wallet },
                { id: 'ai', label: isArabic ? 'ذكاء اصطناعي' : 'AI Bots', icon: Bot },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      isActive
                        ? 'bg-[#2481cc] text-white shadow-md'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Apps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleLaunchApp(app)}
                  className="p-3.5 rounded-2xl bg-[#1e2c3a]/50 hover:bg-[#1e2c3a] border border-white/5 hover:border-sky-500/30 transition-all cursor-pointer flex items-start gap-3.5 group relative"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-black/40 to-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    {app.icon}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors truncate">
                        {isArabic ? app.nameAr : app.name}
                      </div>
                      {app.starsPrice && app.starsPrice > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {app.starsPrice} ⭐
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                          FREE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                      {isArabic ? app.descriptionAr : app.description}
                    </p>
                    <div className="text-[10px] text-sky-400 font-mono flex items-center gap-1 pt-0.5">
                      <Zap className="w-3 h-3 text-sky-400" />
                      <span>{app.botUsername}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
