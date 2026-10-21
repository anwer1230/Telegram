/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Search, Lock, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { LanguageSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

const LANGUAGES = [
  { code: 'ar', name: 'العربية', native: 'Arabic' },
  { code: 'eo', name: 'Esperanto', native: 'Esperanto' },
  { code: 'eu', name: 'Euskara', native: 'Basque' },
  { code: 'gl', name: 'Galego', native: 'Galician' },
  { code: 'bg', name: 'Български', native: 'Bulgarian' },
  { code: 'ur', name: 'اُردو', native: 'Urdu' },
  { code: 'hi', name: 'अंग्रेज़ी', native: 'Hindi' },
  { code: 'zh', name: '廣東話', native: 'Cantonese' },
  { code: 'ja', name: '日本語', native: 'Japanese' },
  { code: 'en', name: 'English', native: 'English' },
];

export const LanguageScreen: React.FC<Props> = ({ onBack }) => {
  const [langSettings, setLangSettings] = useState<LanguageSettings>(telegramService.getLanguageSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const theme = telegramService.getThemeSettings();

  const handleSelectLang = (code: string) => {
    const updated = { ...langSettings, selectedLanguage: code };
    setLangSettings(updated);
    telegramService.saveLanguageSettings(updated);
    setToastMessage(`تم تغيير لغة التطبيق إلى ${LANGUAGES.find(l => l.code === code)?.name}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updateSetting = (key: keyof LanguageSettings, val: boolean) => {
    const updated = { ...langSettings, [key]: val };
    setLangSettings(updated);
    telegramService.saveLanguageSettings(updated);
  };

  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.native.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-12">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">اللغة</h1>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/20 text-white placeholder-white/70 px-3 py-1 rounded-full text-xs w-32 focus:w-44 transition-all focus:outline-none"
          />
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* ترجمة الرسائل */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            ترجمة الرسائل
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('showTranslateButton', !langSettings.showTranslateButton)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  langSettings.showTranslateButton ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <span className="text-sm text-gray-200">إظهار زر الترجمة</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('translateEntireChats', !langSettings.translateEntireChats)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    langSettings.translateEntireChats ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-sm text-gray-200">ترجمة المحادثات بأكملها</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-right pt-1">
            سيظهر زر «الترجمة» عند الضغط مرة واحدة على رسالة نصيّة.
          </p>
        </div>

        {/* قائمة اللغات */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            اللغة
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {filteredLanguages.map((lang) => {
              const isSelected = langSettings.selectedLanguage === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLang(lang.code)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-950/20' : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-teal-400' : 'border-gray-500'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-100 block">{lang.name}</span>
                    <span className="text-xs text-gray-400">{lang.native}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
