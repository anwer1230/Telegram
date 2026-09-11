import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smile, Sparkles, LayoutGrid, X } from 'lucide-react';
import { INSTANT_QUICK_EMOJIS, getRecentEmojis, saveRecentEmoji } from '../../data/emojiLibrary';

interface EmojiQuickPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onOpenFullPicker: () => void;
  onPreloadFullPicker: () => void;
  isArabic: boolean;
  isFullPickerOpen: boolean;
  disabled?: boolean;
}

export const EmojiQuickPicker: React.FC<EmojiQuickPickerProps> = ({
  onSelectEmoji,
  onOpenFullPicker,
  onPreloadFullPicker,
  isArabic,
  isFullPickerOpen,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [quickList, setQuickList] = useState<string[]>(() => {
    const rec = getRecentEmojis();
    return rec.length >= 6 ? rec.slice(0, 8) : INSTANT_QUICK_EMOJIS.slice(0, 8);
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Refresh quick list when opened
  const handleToggle = useCallback(() => {
    if (isFullPickerOpen) {
      // If full picker is open, toggle closes it or opens quick
      onOpenFullPicker();
      return;
    }
    setIsOpen((prev) => {
      if (!prev) {
        // Refresh quick recents
        const rec = getRecentEmojis();
        setQuickList(rec.length >= 6 ? rec.slice(0, 8) : INSTANT_QUICK_EMOJIS.slice(0, 8));
        onPreloadFullPicker(); // Start preloading heavy library in background
      }
      return !prev;
    });
  }, [isFullPickerOpen, onOpenFullPicker, onPreloadFullPicker]);

  const handlePick = (emoji: string) => {
    saveRecentEmoji(emoji);
    onSelectEmoji(emoji);
    // Keep quick picker open for multi-insert or soft tap
  };

  const handleExpandToFull = () => {
    setIsOpen(false);
    onOpenFullPicker();
  };

  return (
    <div ref={containerRef} className="relative flex items-center shrink-0">
      {/* Lightweight Quick Bar Flyout */}
      {isOpen && !isFullPickerOpen && (
        <div
          id="tg-emoji-quick-bar"
          className="absolute bottom-12 right-0 rtl:right-auto rtl:left-0 z-30 flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border backdrop-blur-xl bg-[#1e232a]/95 border-white/10 animate-in zoom-in-95 duration-150 select-none"
        >
          {/* Instant Quick Emoji Buttons */}
          <div className="flex items-center gap-0.5">
            {quickList.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePick(emoji)}
                className="w-7 h-7 flex items-center justify-center text-lg rounded-xl hover:bg-white/15 hover:scale-125 active:scale-95 transition-all"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

          {/* Expand to Full Library Button */}
          <button
            type="button"
            id="tg-expand-full-emoji-btn"
            onClick={handleExpandToFull}
            onMouseEnter={onPreloadFullPicker}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
            title={isArabic ? 'فتح كافة الرموز والملصقات (المكتبة الكاملة)' : 'Open Full Emoji & Sticker Library'}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">
              {isArabic ? 'المزيد' : 'More'}
            </span>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        id="emoji-quick-picker-btn"
        onClick={handleToggle}
        onMouseEnter={onPreloadFullPicker}
        disabled={disabled}
        className={`p-2 rounded-full transition-all shrink-0 ${
          isOpen || isFullPickerOpen
            ? 'text-amber-400 bg-white/10'
            : 'text-gray-400 hover:text-amber-400 hover:bg-white/5'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        title={
          isArabic
            ? 'الرموز التعبيرية السريعة والمكتبة الكاملة'
            : 'Quick Emojis & Full Library'
        }
      >
        <Smile className="w-5 h-5 transition-transform hover:scale-110 active:scale-95" />
      </button>
    </div>
  );
};
