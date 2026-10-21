import React, { useState } from 'react';
import {
  Palette,
  X,
  Check,
  Share2,
  Copy,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import confetti from 'canvas-confetti';

interface ThemePreset {
  id: string;
  name: string;
  nameAr: string;
  accent: string;
  surface: string;
  background: string;
  bubbleIn: string;
  bubbleOut: string;
  isDark: boolean;
}

const PRESET_THEMES: ThemePreset[] = [
  {
    id: 'theme_classic_dark',
    name: 'Telegram Dark (Official)',
    nameAr: 'تيليجرام الليلي (الرسمي)',
    accent: '#2481cc',
    surface: '#17212b',
    background: '#0e1621',
    bubbleIn: '#182533',
    bubbleOut: '#2b5278',
    isDark: true,
  },
  {
    id: 'theme_emerald_drklo',
    name: 'Emerald Matrix (DrKLO)',
    nameAr: 'الزمرد الأخضر (DrKLO)',
    accent: '#10b981',
    surface: '#064e3b',
    background: '#022c22',
    bubbleIn: '#064e3b',
    bubbleOut: '#047857',
    isDark: true,
  },
  {
    id: 'theme_midnight_purple',
    name: 'Midnight Stars & TON',
    nameAr: 'بنفسجي منتصف الليل والنجوم',
    accent: '#8b5cf6',
    surface: '#1e1b4b',
    background: '#0f0e26',
    bubbleIn: '#2e1065',
    bubbleOut: '#6b21a8',
    isDark: true,
  },
  {
    id: 'theme_gold_luxury',
    name: 'Telegram Gold Stars',
    nameAr: 'الذهبي الفاخر (Telegram Gold)',
    accent: '#f59e0b',
    surface: '#1c1917',
    background: '#0c0a09',
    bubbleIn: '#292524',
    bubbleOut: '#78350f',
    isDark: true,
  },
  {
    id: 'theme_arctic_light',
    name: 'Arctic Light Sky',
    nameAr: 'النهاري السماوي (Arctic Light)',
    accent: '#0284c7',
    surface: '#ffffff',
    background: '#f0f9ff',
    bubbleIn: '#ffffff',
    bubbleOut: '#e0f2fe',
    isDark: false,
  },
];

interface ThemeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeEditorModal: React.FC<ThemeEditorModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [accentColor, setAccentColor] = useState<string>(settings.accentColor || '#2481cc');
  const [bubbleRadius, setBubbleRadius] = useState<number>(settings.bubbleCornerRadius || 16);
  const [fontSize, setFontSize] = useState<number>(settings.fontSize || 16);
  const [activePreset, setActivePreset] = useState<string>('theme_classic_dark');
  const [themeLink, setThemeLink] = useState<string>('');

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ThemePreset) => {
    setActivePreset(preset.id);
    setAccentColor(preset.accent);
    updateSettings({
      accentColor: preset.accent,
      theme: preset.isDark ? 'dark' : 'light',
    });

    document.documentElement.style.setProperty('--tg-theme-accent', preset.accent);
    document.documentElement.style.setProperty('--tg-theme-surface', preset.surface);
    document.documentElement.style.setProperty('--tg-theme-sidebar', preset.surface);
    document.documentElement.style.setProperty('--tg-theme-bg', preset.background);
    document.documentElement.style.setProperty('--tg-theme-chat-bg', preset.background);
    document.documentElement.style.setProperty('--tg-theme-bubble-in', preset.bubbleIn);
    document.documentElement.style.setProperty('--tg-theme-bubble-out', preset.bubbleOut);

    showToast(
      isArabic ? `تم تطبيق نمط "${preset.nameAr}" بنجاح!` : `Theme "${preset.name}" applied!`,
      '🎨'
    );
  };

  const handleCustomAccent = (color: string) => {
    setAccentColor(color);
    updateSettings({ accentColor: color });
    document.documentElement.style.setProperty('--tg-theme-accent', color);
  };

  const handleSaveAndShareTheme = () => {
    const slug = `theme_${Date.now().toString(36)}`;
    const link = `https://t.me/addtheme/${slug}`;
    setThemeLink(link);

    try {
      navigator.clipboard.writeText(link);
    } catch {}

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    showToast(
      isArabic
        ? 'تم نسخ رابط النمط السحابي (t.me/addtheme/...) للمشاركة!'
        : 'Cloud theme link copied to clipboard!',
      '✨'
    );
  };

  return (
    <div
      id="modal-telegram-theme-editor"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-xl bg-[#17212b] border border-white/10 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#1e2c3a]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isArabic ? 'محرر ومصمم الثيمات (Theme Editor)' : 'Theme Editor & Cloud Styler'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {isArabic ? 'DrKLO ThemeEngine & t.me/addtheme' : 'Custom colors, typography & sharing'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-[#0e1621] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-white/5">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>{isArabic ? 'معاينة النمط المباشرة' : 'Live Chat Theme Preview'}</span>
              </span>
              <span className="font-mono text-[10px] text-gray-500">10:42 AM</span>
            </div>

            {/* Incoming Bubble */}
            <div className="flex justify-start">
              <div
                className="max-w-[80%] p-3 rounded-2xl text-xs text-white shadow"
                style={{
                  backgroundColor: '#182533',
                  borderRadius: `${bubbleRadius}px`,
                }}
              >
                <div className="font-bold text-[11px] text-[#5288c1] mb-0.5">Durov</div>
                <div>{isArabic ? 'هذا مظهر مخصص لمحادثات تيليجرام!' : 'This is how your custom Telegram theme looks!'}</div>
              </div>
            </div>

            {/* Outgoing Bubble */}
            <div className="flex justify-end">
              <div
                className="max-w-[80%] p-3 rounded-2xl text-xs text-white shadow"
                style={{
                  backgroundColor: accentColor,
                  borderRadius: `${bubbleRadius}px`,
                }}
              >
                <div>{isArabic ? 'رائع جداً! الألوان متناسقة وفورية.' : 'Awesome! Realtime theme color updates.'}</div>
                <div className="text-[10px] text-white/70 text-right rtl:text-left mt-1">✓✓ 10:43 AM</div>
              </div>
            </div>
          </div>

          {/* Color Palettes / Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300">
              {isArabic ? 'الأنماط الجاهزة (Presets)' : 'Official Theme Presets'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_THEMES.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-3 rounded-2xl border text-left rtl:text-right transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#2481cc]/20 border-sky-400 shadow-md'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full shrink-0 border border-white/20 shadow"
                        style={{ backgroundColor: preset.accent }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {isArabic ? preset.nameAr : preset.name}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Accent Color Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300">
              {isArabic ? 'لون التمييز المخصص (Accent Color)' : 'Custom Accent Color'}
            </label>
            <div className="flex items-center gap-3">
              {['#2481cc', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => handleCustomAccent(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      accentColor === c ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                )
              )}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleCustomAccent(e.target.value)}
                className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0"
                title="Choose custom HEX color"
              />
            </div>
          </div>

          {/* Bubble Corner Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span className="font-bold">{isArabic ? 'انحناء زوايا الرسائل' : 'Message Corner Radius'}</span>
              <span className="font-mono text-sky-400">{bubbleRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={bubbleRadius}
              onChange={(e) => {
                const val = Number(e.target.value);
                setBubbleRadius(val);
                updateSettings({ bubbleCornerRadius: val });
              }}
              className="w-full accent-[#2481cc]"
            />
          </div>

          {/* Share Theme Link Banner if generated */}
          {themeLink && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 text-xs text-emerald-300 font-mono truncate">
                {themeLink}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(themeLink);
                  showToast(isArabic ? 'تم النسخ!' : 'Copied!', '📋');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isArabic ? 'نسخ' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#1e2c3a]/80 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => handleApplyPreset(PRESET_THEMES[0])}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isArabic ? 'استعادة الافتراضي' : 'Reset'}</span>
          </button>

          <button
            onClick={handleSaveAndShareTheme}
            className="px-5 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1c6fad] text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>{isArabic ? 'حفظ ومشاركة النمط (t.me/addtheme)' : 'Export & Share Cloud Theme'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
