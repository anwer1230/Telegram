import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Search,
  X,
  Smile,
  Clock,
  Flame,
  LayoutGrid,
  Star,
  Eye,
} from 'lucide-react';
import {
  EMOJI_CATEGORIES,
  getRecentEmojis,
  saveRecentEmoji,
} from '../../data/emojiLibrary';
import {
  TELEGRAM_CUSTOM_EMOJI_SETS,
  LottieStickerItem,
} from '../../data/lottieStickerData';
import {
  OFFICIAL_TELEGRAM_STICKER_PACKS,
  TelegramOfficialSticker,
  TelegramOfficialStickerPack,
} from '../../data/officialTelegramStickerPacks';
import { stickersService } from '../../core/stickers/TelegramStickersService';
import { LottieSticker } from './LottieSticker';
import { CustomAnimatedEmoji } from './CustomAnimatedEmoji';
import { StickerPackModal } from '../Modals/StickerPackModal';

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

  // Stickers state
  const [activeStickerTab, setActiveStickerTab] = useState<string>('recents');
  const [recentStickers, setRecentStickers] = useState<TelegramOfficialSticker[]>(() =>
    stickersService.getRecentStickers()
  );
  const [favoriteStickers, setFavoriteStickers] = useState<TelegramOfficialSticker[]>(() =>
    stickersService.getFavoriteStickers()
  );
  const [previewPack, setPreviewPack] = useState<TelegramOfficialStickerPack | null>(null);

  useEffect(() => {
    const unsub = stickersService.subscribe(() => {
      setRecentStickers(stickersService.getRecentStickers());
      setFavoriteStickers(stickersService.getFavoriteStickers());
    });
    return unsub;
  }, []);

  const handlePickEmoji = (emoji: string) => {
    saveRecentEmoji(emoji);
    setRecents(getRecentEmojis());
    onSelectEmoji(emoji);
  };

  const handlePickOfficialSticker = (sticker: TelegramOfficialSticker) => {
    stickersService.recordStickerUsage(sticker.id);
    if (sticker.format === 'lottie' && sticker.lottieData) {
      onSelectLottieSticker({
        id: sticker.id,
        name: sticker.name,
        nameAr: sticker.nameAr,
        emoji: sticker.emoji,
        category: 'reaction',
        packName: sticker.packName,
        lottieData: sticker.lottieData,
      });
    } else {
      onSelectSticker(sticker.url);
    }
    onClose();
  };

  const handleToggleFavorite = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation();
    stickersService.toggleFavorite(stickerId);
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

  // Filter stickers based on query
  const searchedStickers = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return stickersService.searchStickers(searchQuery);
  }, [searchQuery]);

  return (
    <>
      <div
        id="tg-full-emoji-library-panel"
        className="absolute bottom-16 left-2 sm:left-6 rtl:left-auto rtl:right-2 sm:rtl:right-6 z-30 w-[320px] sm:w-[380px] h-[410px] rounded-2xl shadow-2xl border backdrop-blur-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden select-none"
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
              placeholder={
                mainTab === 'stickers'
                  ? isArabic
                    ? 'بحث في الملصقات...'
                    : 'Search stickers...'
                  : isArabic
                  ? 'بحث عن رموز تعبيرية...'
                  : 'Search emojis...'
              }
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
        <div className="flex items-center border-b border-white/10 bg-black/10 px-2 py-1 gap-1">
          <button
            onClick={() => setMainTab('emoji')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mainTab === 'emoji'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>{isArabic ? 'رموز' : 'Emoji'}</span>
          </button>

          <button
            onClick={() => setMainTab('stickers')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mainTab === 'stickers'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isArabic ? 'ملصقات' : 'Stickers'}</span>
          </button>

          <button
            onClick={() => setMainTab('custom_emoji')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mainTab === 'custom_emoji'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isArabic ? 'مخصصة' : 'Custom'}</span>
          </button>
        </div>

        {/* Stickers Sub-Tabs Navigation (When Stickers tab active) */}
        {mainTab === 'stickers' && !searchQuery && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto no-scrollbar bg-black/20 text-xs">
            <button
              onClick={() => setActiveStickerTab('recents')}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 shrink-0 ${
                activeStickerTab === 'recents'
                  ? 'bg-sky-500/20 text-sky-400 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={isArabic ? 'الأخيرة' : 'Recent'}
            >
              <Clock className="w-3 h-3" />
              <span>{isArabic ? 'الأخيرة' : 'Recent'}</span>
            </button>

            <button
              onClick={() => setActiveStickerTab('favorites')}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 shrink-0 ${
                activeStickerTab === 'favorites'
                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={isArabic ? 'المفضلة' : 'Favorites'}
            >
              <Star className="w-3 h-3" />
              <span>{isArabic ? 'المفضلة' : 'Favorites'}</span>
            </button>

            {OFFICIAL_TELEGRAM_STICKER_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => setActiveStickerTab(pack.id)}
                className={`px-2 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1 ${
                  activeStickerTab === pack.id
                    ? 'bg-sky-500/20 text-sky-400 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{pack.stickers[0]?.emoji || '🏷️'}</span>
                <span className="truncate max-w-[80px]">
                  {isArabic ? pack.titleAr : pack.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          {mainTab === 'emoji' ? (
            <div className="space-y-4">
              {/* Recents */}
              {!searchQuery && recents.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{isArabic ? 'المستخدمة مؤخراً' : 'Recently Used'}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {recents.map((emoji, idx) => (
                      <button
                        key={`${emoji}-${idx}`}
                        onClick={() => handlePickEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorized Emojis */}
              {filteredCategories.map((cat) => (
                <div key={cat.id} id={`emoji-cat-${cat.id}`}>
                  <div className="text-[11px] font-bold text-gray-400 mb-1.5">
                    {isArabic ? cat.nameAr : cat.name}
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {cat.emojis.map((emoji, idx) => (
                      <button
                        key={`${cat.id}-${idx}`}
                        onClick={() => handlePickEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : mainTab === 'stickers' ? (
            <div className="space-y-4">
              {/* If Searching Stickers */}
              {searchedStickers ? (
                <div>
                  <div className="text-[11px] font-bold text-sky-400 mb-2">
                    {isArabic
                      ? `نتائج البحث (${searchedStickers.length})`
                      : `Search Results (${searchedStickers.length})`}
                  </div>
                  {searchedStickers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">
                      {isArabic ? 'لم يتم العثور على ملصقات' : 'No stickers found'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {searchedStickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          onClick={() => handlePickOfficialSticker(sticker)}
                          className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-105 flex flex-col items-center gap-1 border border-white/5 bg-black/15 group relative cursor-pointer"
                        >
                          <button
                            onClick={(e) => handleToggleFavorite(e, sticker.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/40 text-gray-400 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100 z-10"
                            title={isArabic ? 'إضافة إلى المفضلة' : 'Favorite'}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                stickersService.isFavorite(sticker.id)
                                  ? 'fill-amber-400 text-amber-400'
                                  : ''
                              }`}
                            />
                          </button>
                          {sticker.format === 'lottie' && sticker.lottieData ? (
                            <LottieSticker
                              lottieData={sticker.lottieData}
                              stickerId={sticker.id}
                              size={60}
                              autoplay={true}
                              loop={true}
                              showBadge={false}
                            />
                          ) : (
                            <img
                              src={sticker.url}
                              alt={sticker.name}
                              className="w-14 h-14 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover:text-sky-400">
                            {isArabic ? sticker.nameAr : sticker.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeStickerTab === 'recents' ? (
                /* Recent Stickers */
                <div>
                  <div className="text-[11px] font-bold text-sky-400 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'الملصقات الأخيرة' : 'Recent Stickers'}</span>
                    </div>
                  </div>
                  {recentStickers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">
                      {isArabic ? 'لا توجد ملصقات أخيرة' : 'No recent stickers yet'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {recentStickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          onClick={() => handlePickOfficialSticker(sticker)}
                          className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-105 flex flex-col items-center gap-1 border border-white/5 bg-black/15 group relative cursor-pointer"
                        >
                          <button
                            onClick={(e) => handleToggleFavorite(e, sticker.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/40 text-gray-400 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100 z-10"
                            title={isArabic ? 'إضافة إلى المفضلة' : 'Favorite'}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                stickersService.isFavorite(sticker.id)
                                  ? 'fill-amber-400 text-amber-400'
                                  : ''
                              }`}
                            />
                          </button>
                          {sticker.format === 'lottie' && sticker.lottieData ? (
                            <LottieSticker
                              lottieData={sticker.lottieData}
                              stickerId={sticker.id}
                              size={60}
                              autoplay={true}
                              loop={true}
                              showBadge={false}
                            />
                          ) : (
                            <img
                              src={sticker.url}
                              alt={sticker.name}
                              className="w-14 h-14 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover:text-sky-400">
                            {isArabic ? sticker.nameAr : sticker.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeStickerTab === 'favorites' ? (
                /* Favorite Stickers */
                <div>
                  <div className="text-[11px] font-bold text-amber-400 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{isArabic ? 'الملصقات المفضلة' : 'Favorite Stickers'}</span>
                    </div>
                  </div>
                  {favoriteStickers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">
                      {isArabic ? 'لا توجد ملصقات مفضلة حالياً' : 'No favorite stickers yet'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {favoriteStickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          onClick={() => handlePickOfficialSticker(sticker)}
                          className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-105 flex flex-col items-center gap-1 border border-white/5 bg-black/15 group relative cursor-pointer"
                        >
                          <button
                            onClick={(e) => handleToggleFavorite(e, sticker.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/40 text-amber-400 hover:text-gray-400 transition-colors z-10"
                            title={isArabic ? 'إزالة من المفضلة' : 'Unfavorite'}
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                          </button>
                          {sticker.format === 'lottie' && sticker.lottieData ? (
                            <LottieSticker
                              lottieData={sticker.lottieData}
                              stickerId={sticker.id}
                              size={60}
                              autoplay={true}
                              loop={true}
                              showBadge={false}
                            />
                          ) : (
                            <img
                              src={sticker.url}
                              alt={sticker.name}
                              className="w-14 h-14 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover:text-sky-400">
                            {isArabic ? sticker.nameAr : sticker.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Specific Sticker Pack */
                (() => {
                  const targetPack = OFFICIAL_TELEGRAM_STICKER_PACKS.find(
                    (p) => p.id === activeStickerTab
                  );
                  if (!targetPack) return null;
                  return (
                    <div>
                      <div className="text-[11px] font-bold text-sky-400 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isArabic ? targetPack.titleAr : targetPack.title}</span>
                        </div>
                        <button
                          onClick={() => setPreviewPack(targetPack)}
                          className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isArabic ? 'عرض الحزمة' : 'View Pack'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {targetPack.stickers.map((sticker) => (
                          <div
                            key={sticker.id}
                            onClick={() => handlePickOfficialSticker(sticker)}
                            className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-105 flex flex-col items-center gap-1 border border-white/5 bg-black/15 group relative cursor-pointer"
                          >
                            <button
                              onClick={(e) => handleToggleFavorite(e, sticker.id)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/40 text-gray-400 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100 z-10"
                              title={isArabic ? 'إضافة إلى المفضلة' : 'Favorite'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  stickersService.isFavorite(sticker.id)
                                    ? 'fill-amber-400 text-amber-400'
                                    : ''
                                }`}
                              />
                            </button>
                            {sticker.format === 'lottie' && sticker.lottieData ? (
                              <LottieSticker
                                lottieData={sticker.lottieData}
                                stickerId={sticker.id}
                                size={60}
                                autoplay={true}
                                loop={true}
                                showBadge={false}
                              />
                            ) : (
                              <img
                                src={sticker.url}
                                alt={sticker.name}
                                className="w-14 h-14 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover:text-sky-400">
                              {isArabic ? sticker.nameAr : sticker.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          ) : (
            /* Custom Animated Emoji Packs */
            <div className="space-y-4">
              {TELEGRAM_CUSTOM_EMOJI_SETS.map((set) => (
                <div key={set.packId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 px-1">
                    <span>{isArabic ? set.packNameAr : set.packName}</span>
                    <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-full">
                      Telegram Premium
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {set.emojis.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => {
                          onSelectCustomEmoji(item.code);
                          onClose();
                        }}
                        className="p-1.5 rounded-xl hover:bg-white/10 transition-transform hover:scale-115 flex items-center justify-center border border-white/5 bg-black/15 group/emj"
                        title={`${item.code} (${isArabic ? item.nameAr : item.name})`}
                      >
                        <CustomAnimatedEmoji code={item.code} size={28} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pack Preview Modal */}
      <StickerPackModal
        pack={previewPack}
        isOpen={Boolean(previewPack)}
        onClose={() => setPreviewPack(null)}
        onSelectSticker={handlePickOfficialSticker}
        isArabic={isArabic}
      />
    </>
  );
};

export default FullEmojiPicker;

