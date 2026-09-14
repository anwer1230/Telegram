/**
 * StickerPackModal.tsx
 *
 * Official Telegram Web Sticker Pack Preview & Installation Dialog
 * Displays pack details, animated 60FPS sticker grid, and installation controls
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Share2, Sparkles, Download, Trash2 } from 'lucide-react';
import {
  TelegramOfficialStickerPack,
  TelegramOfficialSticker,
  OFFICIAL_TELEGRAM_STICKER_PACKS,
} from '../../data/officialTelegramStickerPacks';
import { stickersService } from '../../core/stickers/TelegramStickersService';
import { LottieSticker } from '../Chat/LottieSticker';

interface StickerPackModalProps {
  pack: TelegramOfficialStickerPack | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: TelegramOfficialSticker) => void;
  isArabic?: boolean;
}

export const StickerPackModal: React.FC<StickerPackModalProps> = ({
  pack,
  isOpen,
  onClose,
  onSelectSticker,
  isArabic = false,
}) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pack) {
      setIsInstalled(stickersService.isPackInstalled(pack.id));
    }
  }, [pack, isOpen]);

  if (!isOpen || !pack) return null;

  const handleToggleInstall = () => {
    if (isInstalled) {
      stickersService.uninstallPack(pack.id);
      setIsInstalled(false);
    } else {
      stickersService.installPack(pack.id);
      setIsInstalled(true);
    }
  };

  const handleShare = () => {
    const link = `https://t.me/addstickers/${pack.shortName}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--tg-theme-surface, #1e293b)',
          borderColor: 'var(--tg-theme-border, rgba(255,255,255,0.1))',
          color: 'var(--tg-theme-text, #fff)',
        }}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#2481cc] to-[#1c6fad] text-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="truncate">
              <h3 className="font-bold text-sm truncate">
                {isArabic ? pack.titleAr : pack.title}
              </h3>
              <p className="text-[11px] opacity-80 truncate">
                @{pack.shortName} • {pack.stickers.length} {isArabic ? 'ملصق' : 'stickers'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pack Info Banner */}
        <div className="px-4 py-3 border-b border-white/10 bg-black/10 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-300 line-clamp-2">
            {isArabic ? pack.descriptionAr : pack.description}
          </div>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors shrink-0 flex items-center gap-1 text-[11px]"
            title={isArabic ? 'نسخ رابط الحزمة' : 'Share pack link'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'مشاركة' : 'Share')}</span>
          </button>
        </div>

        {/* Stickers Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-4 gap-3 no-scrollbar">
          {pack.stickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => {
                onSelectSticker(sticker);
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-white/10 border border-white/5 bg-black/20 flex flex-col items-center justify-center gap-1 group transition-all hover:scale-105 cursor-pointer relative"
              title={`${sticker.name} (${sticker.emoji})`}
            >
              <div className="w-14 h-14 flex items-center justify-center">
                {sticker.format === 'lottie' && sticker.lottieData ? (
                  <LottieSticker
                    lottieData={sticker.lottieData}
                    stickerId={sticker.id}
                    size={56}
                    autoplay={true}
                    loop={true}
                    showBadge={false}
                  />
                ) : (
                  <img
                    src={sticker.url}
                    alt={sticker.name}
                    className="w-14 h-14 object-contain pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <span className="text-[10px] text-gray-400 group-hover:text-sky-400 truncate max-w-full">
                {sticker.emoji}
              </span>
            </button>
          ))}
        </div>

        {/* Action Footer */}
        <div className="p-3 border-t border-white/10 bg-black/20 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400 font-mono">
            {pack.installedCount.toLocaleString()} {isArabic ? 'تثبيت' : 'installs'}
          </span>
          <button
            onClick={handleToggleInstall}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isInstalled
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                : 'bg-[#2481cc] hover:bg-[#1c6fad] text-white'
            }`}
          >
            {isInstalled ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'إزالة الحزمة' : 'Remove Pack'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{isArabic ? 'إضافة الملصقات' : 'Add Stickers'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
