import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  X,
  Smile,
  Clock,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import {
  EMOJI_CATEGORIES,
  getRecentEmojis,
  saveRecentEmoji,
} from '../../data/emojiLibrary';
import {
  ANIMATED_TELEGRAM_STICKERS,
  TELEGRAM_CUSTOM_EMOJI_SETS,
  LottieStickerItem,
} from '../../data/lottieStickerData';
import { TELEGRAM_STICKERS } from '../../data/mockTelegramData';
import { LottieSticker } from './LottieSticker';
import { CustomAnimatedEmoji } from './CustomAnimatedEmoji';

interface FullEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectCustomEmoji: (code: string) => void;
  onSelectSticker: (url: string) => void;
  onSelectLottieSticker: (sticker: LottieStickerItem) => void;
  onClose: () => void;
  isArabic: boolean;
}

export const FullEmojiPicker: React.FC<FullEmojiPickerProps> = ({
  onSelectEmoji,
  onSelectCustomEmoji,
  onSelectSticker,
  onSelectLottieSticker,
  onClose,
  isArabic,
}) => {
  const [mainTab, setMainTab] = useState<'emoji' | 'stickers' | 'custom_emoji'>('emoji');
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recents, setRecents] = useState<string[]>(() => getRecentEmojis());

  const handlePickEmoji = (emoji: string) => {
    saveRecentEmoji(emoji);
    setRecents(getRecentEmojis());
    onSelectEmoji(emoji);
  };

  // Filter emojis based on query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return EMOJI_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return EMOJI_CATEGORIES.map((cat) => {
      const matchCat =
        cat.name.toLowerCase().includes(q) || cat.nameAr.includes(q);
      if (matchCat) return cat;
      const matchedEmojis = cat.emojis.filter((emoji) => emoji.includes(q));
      return { ...cat, emojis: matchedEmojis };
    }).filter((cat) => cat.emojis.length > 0);
  }, [searchQuery]);

  return (
    <div
      id="tg-full-emoji-library-panel"
      className="absolute bottom-16 left-2 sm:left-6 rtl:left-auto rtl:right-2 sm:rtl:right-6 z-30 w-[310px] sm:w-[360px] h-[380px] rounded-2xl shadow-2xl border backdrop-blur-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--tg-theme-surface, #1e232a)',
        borderColor: 'var(--tg-theme-border, rgba(255,255,255,0.1))',
        color: 'var(--tg-theme-bubble-in-text, #ffffff)',
      }}
    >
      {/* Header Bar with Search & Close */}
      <div className="p-2.5 border-b border-white/10 flex items-center gap-2 bg-black/15">
        <div className="flex-1 flex items-center gap-2 bg-black/20 rounded-xl px-2.5 py-1.5 border border-white/5 focus-within:border-sky-500/60 transition-colors">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث عن رموز تعبيرية...' : 'Search emojis...'}
            className="bg-transparent text-xs w-full focus:outline-none placeholder:text-gray-500 text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          title={isArabic ? 'إغلاق' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Mode Tabs (Emoji / Stickers / Custom) */}
      <div className="flex border-b border-white/10 text-xs font-bold bg-black/10">
        <button
          onClick={() => {
            setMainTab('emoji');
            setSearchQuery('');
          }}
          className={`flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
            mainTab === 'emoji'
              ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>{isArabic ? 'الرموز' : 'Emojis'}</span>
        </button>

        <button
          onClick={() => {
            setMainTab('stickers');
            setSearchQuery('');
          }}
          className={`flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
            mainTab === 'stickers'
              ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isArabic ? 'الملصقات' : 'Stickers'}</span>
        </button>

        <button
          onClick={() => {
            setMainTab('custom_emoji');
            setSearchQuery('');
          }}
          className={`flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
            mainTab === 'custom_emoji'
              ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>💎</span>
          <span>{isArabic ? 'مخصص' : 'Custom'}</span>
        </button>
      </div>

      {/* Emoji Category Ribbon when in emoji tab */}
      {mainTab === 'emoji' && !searchQuery && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 bg-black/5 overflow-x-auto no-scrollbar">
          {recents.length > 0 && (
            <button
              onClick={() => {
                const el = document.getElementById('emoji-cat-recents');
                el?.scrollIntoView({ behavior: 'smooth' });
                setActiveCategory('recents');
              }}
              className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                activeCategory === 'recents' ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400 hover:bg-white/5'
              }`}
              title={isArabic ? 'المستخدمة حديثاً' : 'Recent'}
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}

          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                const el = document.getElementById(`emoji-cat-${cat.id}`);
                el?.scrollIntoView({ behavior: 'smooth' });
                setActiveCategory(cat.id);
              }}
              className={`p-1.5 rounded-lg text-sm leading-none transition-transform hover:scale-110 shrink-0 ${
                activeCategory === cat.id ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400 hover:bg-white/5'
              }`}
              title={isArabic ? cat.nameAr : cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
        {mainTab === 'emoji' ? (
          <div>
            {/* Recents Section */}
            {!searchQuery && recents.length > 0 && (
              <div id="emoji-cat-recents" className="mb-4">
                <div className="text-[11px] font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>{isArabic ? 'المستخدمة حديثاً' : 'Recently Used'}</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5 text-xl">
                  {recents.map((emoji, idx) => (
                    <button
                      key={`rec-${idx}`}
                      onClick={() => handlePickEmoji(emoji)}
                      className="h-8 flex items-center justify-center rounded-lg hover:bg-white/10 hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorized Emojis */}
            {filteredCategories.map((cat) => (
              <div key={cat.id} id={`emoji-cat-${cat.id}`} className="mb-3.5">
                <div className="text-[11px] font-bold text-sky-400 mb-1.5 flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  <span>{isArabic ? cat.nameAr : cat.name}</span>
                </div>
                <div className="grid grid-cols-8 gap-1 text-xl">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${cat.id}-${idx}`}
                      onClick={() => handlePickEmoji(emoji)}
                      className="h-8 flex items-center justify-center rounded-lg hover:bg-white/10 hover:scale-125 transition-transform"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">
                {isArabic ? 'لم يتم العثور على أي رموز' : 'No matching emojis found'}
              </div>
            )}
          </div>
        ) : mainTab === 'stickers' ? (
          <div className="space-y-4">
            {/* Lottie Animated Stickers */}
            <div>
              <div className="text-[11px] font-bold text-sky-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isArabic
                    ? 'ملصقات Lottie المتحركة الأصلية (60 FPS)'
                    : 'Telegram Animated Stickers (Lottie)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ANIMATED_TELEGRAM_STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => {
                      onSelectLottieSticker(sticker);
                      onClose();
                    }}
                    className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-105 flex flex-col items-center gap-1 border border-white/5 bg-black/15 group/stk"
                    title={`${sticker.name} (${sticker.packName})`}
                  >
                    <LottieSticker
                      lottieData={sticker.lottieData}
                      stickerId={sticker.id}
                      size={60}
                      autoplay={true}
                      loop={true}
                      showBadge={false}
                    />
                    <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover/stk:text-sky-400">
                      {isArabic ? sticker.nameAr : sticker.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Classic Telegram Stickers */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[11px] font-bold text-gray-400 mb-2">
                {isArabic ? 'ملصقات تيليجرام الكلاسيكية' : 'Classic Stickers'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TELEGRAM_STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => {
                      onSelectSticker(sticker.url);
                      onClose();
                    }}
                    className="p-2 rounded-xl hover:bg-white/10 transition-transform hover:scale-105 flex flex-col items-center gap-1"
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-12 h-12 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] text-gray-400">{sticker.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Custom Animated Emoji Packs */
          <div className="space-y-4">
            {TELEGRAM_CUSTOM_EMOJI_SETS.map((set) => (
              <div key={set.packId} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 px-1">
                  <span>{isArabic ? set.packNameAr : set.packName}</span>
                  <span className="text-[9px] text-gray-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full font-normal">
                    Telegram Pack
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 bg-black/10 p-2 rounded-xl border border-white/5">
                  {set.emojis.map((cEmoji) => (
                    <button
                      key={cEmoji.code}
                      onClick={() => {
                        onSelectCustomEmoji(cEmoji.code);
                      }}
                      className="p-1.5 rounded-xl hover:bg-white/15 transition-all hover:scale-125 flex items-center justify-center"
                      title={`${cEmoji.name} - ${cEmoji.code}`}
                    >
                      <CustomAnimatedEmoji code={cEmoji.code} size={26} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FullEmojiPicker;
