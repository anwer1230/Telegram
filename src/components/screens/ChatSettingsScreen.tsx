/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, MoreVertical, Image as ImageIcon, Palette, Moon, Sun, Brush, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { PlusThemeSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

export const ChatSettingsScreen: React.FC<Props> = ({ onBack }) => {
  const [theme, setTheme] = useState<PlusThemeSettings>(telegramService.getThemeSettings());
  const [fontSize, setFontSize] = useState(theme.messageFontSize || 16);
  const [cornerRoundness, setCornerRoundness] = useState(theme.messageRadius || 10);
  const [activeBg, setActiveBg] = useState(theme.chatBackground || 'doodle-green');

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    const updated = { ...theme, messageFontSize: val };
    setTheme(updated);
    telegramService.saveThemeSettings(updated);
  };

  const handleCornerChange = (val: number) => {
    setCornerRoundness(val);
    const updated = { ...theme, messageRadius: val };
    setTheme(updated);
    telegramService.saveThemeSettings(updated);
  };

  const handleBgSelect = (bg: PlusThemeSettings['chatBackground'], color: string) => {
    setActiveBg(bg);
    const updated = { ...theme, chatBackground: bg, primaryColor: color };
    setTheme(updated);
    telegramService.saveThemeSettings(updated);
  };

  const toggleDarkMode = () => {
    const updated = { ...theme, isDarkMode: !theme.isDarkMode };
    setTheme(updated);
    telegramService.saveThemeSettings(updated);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-12">
      {/* Top Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md transition-colors"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">إعدادات المحادثات</h1>
        </div>
        <button className="p-1 hover:bg-black/10 rounded-full">
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Card 1: تنزيل ومشاركة الأنماط */}
        <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
          <div className="p-4 text-right cursor-pointer hover:bg-white/5 transition-colors">
            <span className="text-sm font-medium text-gray-200">تنزيل أنماطٍ جديدة</span>
          </div>
          <div className="p-4 text-right cursor-pointer hover:bg-white/5 transition-colors">
            <span className="text-sm font-medium text-gray-200">مشاركة أنماطك</span>
          </div>
        </div>

        {/* Card 2: حجم خط الرسائل مع المعاينة الحية */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-teal-400">{fontSize}</span>
            <span className="text-xs font-semibold text-teal-400">حجم خط الرسائل</span>
          </div>

          <input
            type="range"
            min="12"
            max="26"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-[#242f3d] rounded-lg"
          />

          {/* المعاينة الحية المطابقة تماماً للصورة 8 */}
          <div className="rounded-xl overflow-hidden p-4 relative telegram-doodle-bg border border-teal-900/40">
            {/* رسالة قادمة (معاينة نمط تيليجرام ويب) */}
            <div className="flex flex-col items-start max-w-[85%] mb-3">
              <div 
                className="bg-[#182533] text-white p-3 shadow-md relative"
                style={{ 
                  borderRadius: `${cornerRoundness}px`,
                  fontSize: `${fontSize}px` 
                }}
              >
                <div className="border-r-2 border-teal-500 pr-2 mb-1">
                  <span className="text-xs font-bold text-teal-400 block">Telegram Support</span>
                </div>
                <div className="text-gray-100">
                  صباح الخير! ✋<br />
                  كيف تجد سرعة التزامن والتشفير السحابي؟
                </div>
                <div className="text-[10px] text-gray-400 text-left mt-1">3:07 م</div>
              </div>
            </div>

            {/* رسالة صادرة */}
            <div className="flex flex-col items-end max-w-[85%] mr-auto">
              <div 
                className="p-3 shadow-md relative text-white"
                style={{ 
                  backgroundColor: theme.primaryColor,
                  borderRadius: `${cornerRoundness}px`,
                  fontSize: `${fontSize}px` 
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex-shrink-0" />
                  <span>ممتازة جداً وتعمل بسلاسة فائقة ☁️✨</span>
                </div>
                <div className="flex items-center justify-start gap-1 text-[10px] text-teal-100/80 mt-1">
                  <span>3:22 م</span>
                  <span>✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* تغيير الخلفية ولون الاسم */}
          <div className="divide-y divide-[#242f3d] pt-2">
            <div className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-teal-400" />
              </div>
              <span className="text-sm font-medium text-gray-200">تغيير خلفية المحادثة</span>
            </div>

            <div className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-teal-400" />
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">ريم</span>
              </div>
              <span className="text-sm font-medium text-gray-200">تغيير لون الاسم</span>
            </div>
          </div>
        </div>

        {/* Card 4: لون النمط */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-4">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            لون النمط
          </span>

          {/* مستطيلات المعاينة المصغرة من الصورة 8 */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'doodle-green', color: '#00897b', label: 'كلاسيك أخضر', style: 'bg-emerald-900 border-teal-400' },
              { id: 'doodle-light-green', color: '#4caf50', label: 'أخضر عشبي', style: 'bg-green-800' },
              { id: 'doodle-blue', color: '#0088cc', label: 'أزرق', style: 'bg-sky-900' },
              { id: 'doodle-purple', color: '#8e44ad', label: 'بنفسجي', style: 'bg-purple-900' },
              { id: 'math', color: '#009688', label: 'رسومي', style: 'bg-teal-950' },
            ].map((themeItem) => (
              <div
                key={themeItem.id}
                onClick={() => handleBgSelect(themeItem.id as any, themeItem.color)}
                className={`h-24 rounded-xl cursor-pointer p-1.5 flex flex-col justify-between border-2 transition-all ${
                  activeBg === themeItem.id ? 'border-teal-400 scale-105 shadow-md shadow-teal-500/20' : 'border-transparent opacity-80 hover:opacity-100'
                } ${themeItem.style}`}
              >
                <div className="w-full h-4 bg-white/40 rounded-full" />
                <div className="w-3/4 h-4 bg-white/30 rounded-full mr-auto" />
                <div className="w-full h-4 bg-white/20 rounded-full" />
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#242f3d] pt-2">
            <div 
              onClick={toggleDarkMode}
              className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl"
            >
              <div className="flex items-center gap-2">
                {theme.isDarkMode ? <Moon className="w-5 h-5 text-teal-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
              </div>
              <span className="text-sm font-medium text-gray-200">
                {theme.isDarkMode ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl">
              <Brush className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-gray-200">Browse Themes</span>
            </div>
          </div>
        </div>

        {/* Card 5: زوايا الرسالة */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-teal-400">{cornerRoundness}</span>
            <span className="text-xs font-semibold text-teal-400">زوايا الرسالة</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            value={cornerRoundness}
            onChange={(e) => handleCornerChange(Number(e.target.value))}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-[#242f3d] rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
