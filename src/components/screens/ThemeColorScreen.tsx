/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { PlusThemeSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

const PRESET_COLORS = [
  '#00897b', // Teal / Default Plus
  '#0088cc', // Classic Telegram Blue
  '#2aabee', // Sky Blue
  '#8e44ad', // Purple
  '#e91e63', // Pink
  '#e67e22', // Orange
  '#27ae60', // Emerald Green
  '#34495e', // Slate Navy
];

export const ThemeColorScreen: React.FC<Props> = ({ onBack }) => {
  const [theme, setTheme] = useState<PlusThemeSettings>(telegramService.getThemeSettings());
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTogglePlus = () => {
    const updated = { ...theme, isPlusEnabled: !theme.isPlusEnabled };
    setTheme(updated);
    telegramService.saveThemeSettings(updated);
  };

  const handleSelectColor = (color: string) => {
    const updated = {
      ...theme,
      primaryColor: color,
      interfacePrimary: color,
      dialogTitleColor: color,
      nameColor: color
    };
    setTheme(updated);
    telegramService.saveThemeSettings(updated);
  };

  const handleSaveTheme = () => {
    telegramService.saveThemeSettings(theme);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-4 py-3.5 shadow-md transition-colors"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">تلوين النمط</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#17212b]">
        {/* تشغيل نمط بلاس */}
        <div className="flex items-center justify-between p-4 bg-[#17212b]">
          <span className="text-base text-gray-200">تشغيل نمط بلاس</span>
          <button
            onClick={handleTogglePlus}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              theme.isPlusEnabled ? 'justify-end' : 'justify-start bg-gray-600'
            }`}
            style={{ backgroundColor: theme.isPlusEnabled ? theme.primaryColor : undefined }}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>

        {/* عام */}
        <div className="p-4 bg-[#0e1621]">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
            عام
          </span>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-base text-gray-200">لون الأساسي للنمط</span>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => handleSelectColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                  style={{
                    backgroundColor: c,
                    borderColor: theme.primaryColor === c ? '#ffffff' : 'transparent',
                  }}
                >
                  {theme.primaryColor === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* الواجهات */}
        <div className="p-4 bg-[#17212b]">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
            الواجهات
          </span>
          <div className="mt-2 divide-y divide-[#242f3d]/60">
            {[
              { id: '1', title: '1 الواجهة الرئيسية' },
              { id: '2', title: '2 واجهة الدردشة' },
              { id: '3', title: '3 واجهة جهات الإتصال' },
              { id: '4', title: '4 درج التصفح' },
              { id: '5', title: '5 الملف الشخصي' },
              { id: '6', title: '6 الإعدادات/واجهة تلوين النمط' },
            ].map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors px-1"
                onClick={() => handleSelectColor(theme.primaryColor)}
              >
                <span className="text-sm text-gray-300">{item.title}</span>
                <div 
                  className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: theme.primaryColor }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* نافذة الحوار */}
        <div className="p-4 bg-[#0e1621]">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
            نافذة الحوار
          </span>
          <div className="mt-2 divide-y divide-[#242f3d]/60">
            <div className="py-3 flex items-center justify-between">
              <span className="text-sm text-gray-300">لون العناوين والأزرار</span>
              <div 
                className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: theme.dialogTitleColor }}
              />
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-sm text-gray-300">لون خلفية نافذة الحوار</span>
              <div 
                className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: theme.dialogBgColor }}
              />
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-sm text-gray-300">لون نص النافذة الحوار</span>
              <div 
                className="w-6 h-6 rounded-full border border-white/20 shadow-sm bg-black"
              />
            </div>
          </div>
        </div>

        {/* الأنماط */}
        <div className="p-4 bg-[#17212b]">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
            الأنماط
          </span>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={handleSaveTheme}
              className="w-full py-3 rounded-xl font-medium text-white transition-all shadow-md flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>تم حفظ وتطبيق النمط بنجاح!</span>
                </>
              ) : (
                <span>حفظ النمط الحالي</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
