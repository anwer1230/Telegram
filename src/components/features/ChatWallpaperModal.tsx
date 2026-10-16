import React, { useState } from 'react';
import { X, Check, Image as ImageIcon, Sparkles, RefreshCw, Palette } from 'lucide-react';

export interface WallpaperConfig {
  id: string;
  name: string;
  type: 'pattern' | 'gradient' | 'color' | 'custom_image';
  background: string;
  patternOverlay?: string;
  patternOpacity?: number;
  textColor?: string;
}

export const WALLPAPER_PRESETS: WallpaperConfig[] = [
  {
    id: 'telegram_classic',
    name: 'نمط تيليجرام الكلاسيكي',
    type: 'pattern',
    background: 'hsl(var(--background))',
    patternOverlay: 'doodle',
    patternOpacity: 0.15,
  },
  {
    id: 'telegram_blue',
    name: 'أزرق تيليجرام الرسمي',
    type: 'gradient',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    patternOverlay: 'doodle',
    patternOpacity: 0.12,
  },
  {
    id: 'midnight_stars',
    name: 'سماء ليلية ونجوم',
    type: 'gradient',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
    patternOverlay: 'stars',
    patternOpacity: 0.25,
  },
  {
    id: 'emerald_forest',
    name: 'واحة الزمرد',
    type: 'gradient',
    background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    patternOverlay: 'doodle',
    patternOpacity: 0.12,
  },
  {
    id: 'twilight_sunset',
    name: 'شفق الغروب',
    type: 'gradient',
    background: 'linear-gradient(135deg, #4c1d95 0%, #be185d 100%)',
    patternOverlay: 'doodle',
    patternOpacity: 0.1,
  },
  {
    id: 'desert_sand',
    name: 'رمال الصحراء الدافئة',
    type: 'gradient',
    background: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
    patternOverlay: 'doodle',
    patternOpacity: 0.12,
  },
  {
    id: 'charcoal_dark',
    name: 'فحم داكن فاخر',
    type: 'gradient',
    background: 'linear-gradient(180deg, #111827 0%, #030712 100%)',
    patternOverlay: 'stars',
    patternOpacity: 0.15,
  },
  {
    id: 'solid_neutral',
    name: 'لون خالص افتراضي',
    type: 'color',
    background: 'hsl(var(--background))',
    patternOpacity: 0,
  },
  {
    id: 'ocean_depths',
    name: 'أعماق المحيط',
    type: 'gradient',
    background: 'linear-gradient(135deg, #082f49 0%, #0e7490 100%)',
    patternOverlay: 'doodle',
    patternOpacity: 0.12,
  },
];

interface ChatWallpaperModalProps {
  onClose: () => void;
  currentWallpaper: WallpaperConfig;
  onSelectWallpaper: (wp: WallpaperConfig) => void;
}

export function ChatWallpaperModal({ onClose, currentWallpaper, onSelectWallpaper }: ChatWallpaperModalProps) {
  const [selected, setSelected] = useState<WallpaperConfig>(currentWallpaper);
  const [customColor, setCustomColor] = useState('#1e293b');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [patternOpacity, setPatternOpacity] = useState<number>(selected.patternOpacity ?? 0.15);

  const handleApply = (wp: WallpaperConfig) => {
    const updated = { ...wp, patternOpacity };
    setSelected(updated);
    onSelectWallpaper(updated);
  };

  const handleApplyCustomColor = () => {
    const customWp: WallpaperConfig = {
      id: `custom_color_${Date.now()}`,
      name: 'لون مخصص',
      type: 'color',
      background: customColor,
      patternOverlay: 'doodle',
      patternOpacity,
    };
    setSelected(customWp);
    onSelectWallpaper(customWp);
  };

  const handleApplyCustomImage = () => {
    if (!customImageUrl.trim()) return;
    const customWp: WallpaperConfig = {
      id: `custom_img_${Date.now()}`,
      name: 'صورة مخصصة',
      type: 'custom_image',
      background: `url("${customImageUrl.trim()}") center / cover no-repeat`,
      patternOpacity: 0,
    };
    setSelected(customWp);
    onSelectWallpaper(customWp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">خلفية المحادثة (Chat Wallpaper)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live Preview Box */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2">معاينة مباشرة</label>
            <div
              className="relative h-44 rounded-xl border border-border overflow-hidden flex flex-col justify-between p-4 shadow-inner"
              style={{
                background: selected.background,
              }}
            >
              {/* Pattern Overlay */}
              {selected.patternOverlay && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    opacity: patternOpacity,
                    backgroundImage:
                      selected.patternOverlay === 'stars'
                        ? 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1.5px, transparent 1.5px), radial-gradient(circle at 50% 50%, white 1px, transparent 1px)'
                        : 'linear-gradient(135deg, currentColor 25%, transparent 25%), linear-gradient(225deg, currentColor 25%, transparent 25%), linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(315deg, currentColor 25%, transparent 25%)',
                    backgroundSize: selected.patternOverlay === 'stars' ? '40px 40px' : '28px 28px',
                  }}
                />
              )}

              {/* Sample Messages */}
              <div className="relative z-10 space-y-2">
                <div className="max-w-[70%] bg-card/90 border border-border/80 text-foreground text-xs p-2.5 rounded-2xl rounded-bl-xs shadow-xs">
                  مرحباً بك! هذه معاينة لخلفية المحادثات المختارة.
                </div>
                <div className="mr-auto max-w-[70%] bg-primary text-primary-foreground text-xs p-2.5 rounded-2xl rounded-br-xs shadow-xs text-left">
                  تبدو رائعة ومريحة للعين تماماً! ✨
                </div>
              </div>

              <div className="relative z-10 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-black/40 text-white text-[10px] backdrop-blur-xs font-medium">
                  {selected.name}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Wallpapers Grid */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2.5">
              مجموعة أنماط وخلفيات تيليجرام
            </label>
            <div className="grid grid-cols-3 gap-3">
              {WALLPAPER_PRESETS.map(wp => {
                const isCurrent = selected.id === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleApply(wp)}
                    className={`relative h-20 rounded-xl overflow-hidden border-2 text-right p-2 flex flex-col justify-end transition-all active:scale-98 cursor-pointer ${
                      isCurrent ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-border/70 hover:border-primary/50'
                    }`}
                    style={{ background: wp.background }}
                  >
                    {isCurrent && (
                      <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded truncate max-w-full">
                      {wp.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pattern Opacity Slider */}
          <div className="rounded-xl bg-secondary/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>شفافية النمط / الزخرفة</span>
              <span className="font-mono text-primary">{Math.round(patternOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.02"
              value={patternOpacity}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setPatternOpacity(val);
                const updated = { ...selected, patternOpacity: val };
                setSelected(updated);
                onSelectWallpaper(updated);
              }}
              className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
            />
          </div>

          {/* Custom Solid Color */}
          <div className="rounded-xl border border-border p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-foreground">اختيار لون خالص مخصص</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleApplyCustomColor}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 transition"
              >
                تطبيق
              </button>
            </div>
          </div>

          {/* Custom Image URL */}
          <div className="rounded-xl border border-border p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-foreground">رابط صورة مخصصة من الإنترنت</label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="https://example.com/wallpaper.jpg"
                value={customImageUrl}
                onChange={e => setCustomImageUrl(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleApplyCustomImage}
                disabled={!customImageUrl.trim()}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 disabled:opacity-50 transition"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-card">
          <button
            type="button"
            onClick={() => handleApply(WALLPAPER_PRESETS[0])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw size={13} />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 transition"
          >
            تم والحفظ
          </button>
        </div>
      </div>
    </div>
  );
}
