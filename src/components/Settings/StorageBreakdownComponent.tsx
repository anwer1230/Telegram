import React, { useState, useEffect, useMemo } from 'react';
import {
  Image,
  FileText,
  Sparkles,
  Trash2,
  PieChart,
  Check,
  RefreshCw,
  HardDrive,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTelegram } from '../../context/TelegramContext';
import { cacheByChatsController } from '../../core/messenger/CacheByChatsController';

export interface StorageCategoryItem {
  id: 'media' | 'documents' | 'stickers';
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  sizeMB: number;
  itemCount: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
}

const STORAGE_STORAGE_KEY = 'telegram_cache_breakdown_v1';

const INITIAL_CACHE_DATA: Record<'media' | 'documents' | 'stickers', { sizeMB: number; itemCount: number }> = {
  media: { sizeMB: 284.5, itemCount: 1420 },
  documents: { sizeMB: 136.2, itemCount: 184 },
  stickers: { sizeMB: 71.9, itemCount: 650 },
};

export const StorageBreakdownComponent: React.FC<{
  onCacheCleared?: (clearedMB: number) => void;
}> = ({ onCacheCleared }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  // State for cache amounts
  const [cacheData, setCacheData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return INITIAL_CACHE_DATA;
  });

  // Selected categories to clear
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({
    media: true,
    documents: true,
    stickers: true,
  });

  const [isClearing, setIsClearing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STORAGE_KEY, JSON.stringify(cacheData));
    } catch (_) {}
  }, [cacheData]);

  const categories: StorageCategoryItem[] = useMemo(
    () => [
      {
        id: 'media',
        nameEn: 'Media (Photos & Videos)',
        nameAr: 'الوسائط (الصور ومقاطع الفيديو)',
        descEn: 'Photos, videos, voice notes & video messages',
        descAr: 'الصور، مقاطع الفيديو، والرسائل الصوتية والمرئية',
        sizeMB: cacheData.media.sizeMB,
        itemCount: cacheData.media.itemCount,
        color: '#38bdf8', // sky-400
        bgColor: 'bg-sky-500/15',
        borderColor: 'border-sky-500/30',
        icon: Image,
      },
      {
        id: 'documents',
        nameEn: 'Documents & Files',
        nameAr: 'المستندات والملفات',
        descEn: 'PDFs, spreadsheets, archives & audio tracks',
        descAr: 'ملفات PDF، الجداول، الأرشيفات والمقاطع الصوتية',
        sizeMB: cacheData.documents.sizeMB,
        itemCount: cacheData.documents.itemCount,
        color: '#34d399', // emerald-400
        bgColor: 'bg-emerald-500/15',
        borderColor: 'border-emerald-500/30',
        icon: FileText,
      },
      {
        id: 'stickers',
        nameEn: 'Stickers & Animations',
        nameAr: 'الملصقات والرسوم المتحركة',
        descEn: 'Sticker packs, Lottie animations & custom emojis',
        descAr: 'حزم الملصقات، رسوم Lottie والرموز التعبيرية',
        sizeMB: cacheData.stickers.sizeMB,
        itemCount: cacheData.stickers.itemCount,
        color: '#fbbf24', // amber-400
        bgColor: 'bg-amber-500/15',
        borderColor: 'border-amber-500/30',
        icon: Sparkles,
      },
    ],
    [cacheData]
  );

  const totalCacheMB = useMemo(() => {
    return Number((cacheData.media.sizeMB + cacheData.documents.sizeMB + cacheData.stickers.sizeMB).toFixed(1));
  }, [cacheData]);

  const selectedTotalMB = useMemo(() => {
    let total = 0;
    if (selectedCategories.media) total += cacheData.media.sizeMB;
    if (selectedCategories.documents) total += cacheData.documents.sizeMB;
    if (selectedCategories.stickers) total += cacheData.stickers.sizeMB;
    return Number(total.toFixed(1));
  }, [cacheData, selectedCategories]);

  const toggleCategorySelection = (catId: string) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedCategories).every(Boolean);
    setSelectedCategories({
      media: !allSelected,
      documents: !allSelected,
      stickers: !allSelected,
    });
  };

  // Clear selected or single category
  const handleClearCache = (targetCategory?: 'media' | 'documents' | 'stickers') => {
    if (totalCacheMB === 0) {
      showToast(isArabic ? 'الذاكرة المؤقتة فارغة بالفعل' : 'Cache is already clean', '✨');
      return;
    }

    setIsClearing(true);

    setTimeout(() => {
      let cleared = 0;
      setCacheData((prev: any) => {
        const next = { ...prev };
        if (targetCategory) {
          cleared = next[targetCategory].sizeMB;
          next[targetCategory] = { sizeMB: 0, itemCount: 0 };
        } else {
          if (selectedCategories.media) {
            cleared += next.media.sizeMB;
            next.media = { sizeMB: 0, itemCount: 0 };
          }
          if (selectedCategories.documents) {
            cleared += next.documents.sizeMB;
            next.documents = { sizeMB: 0, itemCount: 0 };
          }
          if (selectedCategories.stickers) {
            cleared += next.stickers.sizeMB;
            next.stickers = { sizeMB: 0, itemCount: 0 };
          }
        }
        return next;
      });

      // Synchronize with cacheByChatsController
      try {
        if (!targetCategory || targetCategory === 'media') {
          const chats = cacheByChatsController.getCacheUsageList();
          for (const c of chats) {
            cacheByChatsController.clearChatMediaType(c.chatId, 'photos');
            cacheByChatsController.clearChatMediaType(c.chatId, 'videos');
            cacheByChatsController.clearChatMediaType(c.chatId, 'audio');
          }
        }
        if (!targetCategory || targetCategory === 'documents') {
          const chats = cacheByChatsController.getCacheUsageList();
          for (const c of chats) {
            cacheByChatsController.clearChatMediaType(c.chatId, 'documents');
          }
        }
      } catch (_) {}

      setIsClearing(false);

      const clearedFixed = cleared.toFixed(1);
      if (onCacheCleared) {
        onCacheCleared(cleared);
      }

      showToast(
        isArabic
          ? `تم تنظيف ${clearedFixed} ميغابايت من ذاكرة التخزين بنجاح`
          : `Cleared ${clearedFixed} MB from Telegram cache`,
        '🧹'
      );
    }, 450);
  };

  // Restore simulated demo cache
  const handleResetDemoCache = () => {
    setCacheData(INITIAL_CACHE_DATA);
    setSelectedCategories({ media: true, documents: true, stickers: true });
    showToast(
      isArabic ? 'تمت استعادة تقديرات ذاكرة التخزين المؤقت' : 'Cache estimations recalculated',
      '🔄'
    );
  };

  return (
    <div className="bg-[#17212b] rounded-2xl border border-white/10 overflow-hidden shadow-lg space-y-4 p-4.5">
      {/* Header with Title and Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#2481cc]/20 text-[#38bdf8] border border-[#2481cc]/30">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {isArabic ? 'توزيع ذاكرة التخزين المؤقت' : 'Visual Storage Breakdown'}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {isArabic ? 'الذاكرة المؤقتة' : 'Cache'}
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              {isArabic
                ? 'استهلاك الوسائط والمستندات والملصقات المحفوظة محلياً'
                : 'Cache usage for media, documents, and stickers'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono font-extrabold text-[#38bdf8]">
            {totalCacheMB.toFixed(1)} MB
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">
            {isArabic ? 'إجمالي الذاكرة' : 'Total Cached'}
          </div>
        </div>
      </div>

      {/* Visual Segmented Progress Bar */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-[#0e1621] rounded-full overflow-hidden flex border border-white/10 p-0.5 relative">
          {totalCacheMB > 0 ? (
            categories.map((cat) => {
              const pct = totalCacheMB > 0 ? (cat.sizeMB / totalCacheMB) * 100 : 0;
              if (pct <= 0) return null;

              return (
                <motion.div
                  key={cat.id}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  onMouseEnter={() => setActiveTooltip(cat.id)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="h-full rounded-sm cursor-pointer transition-opacity hover:opacity-90 relative"
                  style={{ backgroundColor: cat.color }}
                  title={`${isArabic ? cat.nameAr : cat.nameEn}: ${cat.sizeMB.toFixed(1)} MB (${pct.toFixed(0)}%)`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-emerald-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-400">
              {isArabic ? 'الذاكرة المؤقتة نظيفة 0.0 MB' : 'Clean Cache (0.0 MB)'}
            </div>
          )}
        </div>

        {/* Legend Pills */}
        <div className="flex items-center justify-between text-[11px] pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {categories.map((cat) => {
              const pct = totalCacheMB > 0 ? Math.round((cat.sizeMB / totalCacheMB) * 100) : 0;
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategorySelection(cat.id)}
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-gray-300 font-medium">
                    {cat.id === 'media'
                      ? isArabic ? 'الوسائط' : 'Media'
                      : cat.id === 'documents'
                      ? isArabic ? 'المستندات' : 'Documents'
                      : isArabic ? 'الملصقات' : 'Stickers'}
                  </span>
                  <span className="text-gray-500 font-mono text-[10px]">
                    {cat.sizeMB.toFixed(1)} MB ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          {totalCacheMB === 0 ? (
            <button
              onClick={handleResetDemoCache}
              className="text-[10px] text-[#38bdf8] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {isArabic ? 'إعادة الحساب' : 'Recalculate'}
            </button>
          ) : (
            <button
              onClick={handleSelectAll}
              className="text-[10px] text-gray-400 hover:text-white transition-colors"
            >
              {Object.values(selectedCategories).every(Boolean)
                ? isArabic ? 'إلغاء تحديد الكل' : 'Deselect All'
                : isArabic ? 'تحديد الكل' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Breakdown Items List */}
      <div className="space-y-2 pt-1">
        {categories.map((cat) => {
          const isSelected = !!selectedCategories[cat.id];
          const Icon = cat.icon;
          const isClean = cat.sizeMB <= 0;

          return (
            <div
              key={cat.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                isClean
                  ? 'bg-white/[0.02] border-white/5 opacity-60'
                  : isSelected
                  ? 'bg-white/[0.05] border-white/15'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              {/* Category checkbox & info */}
              <div
                onClick={() => !isClean && toggleCategorySelection(cat.id)}
                className={`flex items-center gap-3 min-w-0 cursor-pointer flex-1 ${
                  isClean ? 'cursor-default' : ''
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    isSelected && !isClean
                      ? 'bg-[#2481cc] border-[#2481cc] text-white'
                      : 'border-gray-500 bg-transparent text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>

                <div className={`p-2 rounded-xl ${cat.bgColor} border ${cat.borderColor} shrink-0`}>
                  <Icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {isArabic ? cat.nameAr : cat.nameEn}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ({cat.itemCount} {isArabic ? 'عنصر' : 'items'})
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {isArabic ? cat.descAr : cat.descEn}
                  </p>
                </div>
              </div>

              {/* Size & single clear button */}
              <div className="flex items-center gap-2.5 shrink-0 pl-2">
                <span className="text-xs font-mono font-bold text-gray-200">
                  {cat.sizeMB.toFixed(1)} MB
                </span>
                {!isClean && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCache(cat.id);
                    }}
                    title={isArabic ? 'مسح هذا القسم فقط' : 'Clear this category'}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Clear Cache Action Button */}
      <div className="pt-2">
        <button
          onClick={() => handleClearCache()}
          disabled={isClearing || totalCacheMB === 0 || selectedTotalMB === 0}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
            totalCacheMB === 0
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
              : selectedTotalMB === 0
              ? 'bg-white/10 text-gray-400 cursor-not-allowed'
              : 'bg-[#2481cc] hover:bg-[#2072b5] active:scale-[0.99] text-white shadow-[#2481cc]/25'
          }`}
        >
          {isClearing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>{isArabic ? 'جارٍ تنظيف الذاكرة المؤقتة...' : 'Clearing cache...'}</span>
            </>
          ) : totalCacheMB === 0 ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isArabic ? 'الذاكرة المؤقتة فارغة تماماً (0.0 MB)' : 'Cache is Clean (0.0 MB)'}</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 text-white" />
              <span>
                {selectedTotalMB === totalCacheMB
                  ? isArabic
                    ? `مسح ذاكرة التخزين المؤقت (${totalCacheMB.toFixed(1)} MB)`
                    : `Clear Cache (${totalCacheMB.toFixed(1)} MB)`
                  : isArabic
                  ? `مسح الأقسام المحددة (${selectedTotalMB.toFixed(1)} MB)`
                  : `Clear Selected Cache (${selectedTotalMB.toFixed(1)} MB)`}
              </span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-gray-500 mt-2">
          {isArabic
            ? 'لن يتم حذف رسائلك من خوادم تيليجرام. سيتم إعادة تنزيل الوسائط عند فتحها.'
            : 'Your chats will remain saved in cloud. Media will re-download when needed.'}
        </p>
      </div>
    </div>
  );
};
