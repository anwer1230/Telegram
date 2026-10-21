/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRight, Clock, Keyboard, ZoomIn, ExternalLink, 
  Volume2, Play, Check, Command
} from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { GeneralWebSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
  onOpenShortcuts: () => void;
}

export const GeneralSettingsScreen: React.FC<Props> = ({ onBack, onOpenShortcuts }) => {
  const [settings, setSettings] = useState<GeneralWebSettings>(telegramService.getGeneralSettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const theme = telegramService.getThemeSettings();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const updateSetting = (key: keyof GeneralWebSettings, val: any) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    telegramService.saveGeneralSettings(updated);
    showToast("تم حفظ الإعدادات العامة");
  };

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
          <h1 className="text-xl font-bold text-white">الإعدادات العامة (Web Settings)</h1>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* تنسيق الوقت وإرسال الرسائل */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            المراسلة والوقت
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {/* تنسيق الوقت */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => updateSetting('timeFormat', '12h')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                    settings.timeFormat === '12h' ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  12 ساعة
                </button>
                <button
                  onClick={() => updateSetting('timeFormat', '24h')}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                    settings.timeFormat === '24h' ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  24 ساعة
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">تنسيق الوقت</span>
                <Clock className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* إرسال الرسالة عبر Enter */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('sendByEnter', !settings.sendByEnter)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.sendByEnter ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>

              <div className="text-right">
                <span className="text-sm text-gray-200 block">إرسال بالضغط على Enter</span>
                <span className="text-xs text-gray-400">
                  {settings.sendByEnter ? 'Enter للإرسال، Shift + Enter لسطر جديد' : 'Ctrl + Enter للإرسال'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* عرض الواجهة */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            عرض الواجهة والتكبير
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {/* مقياس التكبير Zoom */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                {[90, 100, 110, 120].map((zoom) => (
                  <button
                    key={zoom}
                    onClick={() => updateSetting('interfaceZoom', zoom)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      settings.interfaceZoom === zoom ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {zoom}%
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">حجم الواجهة (Zoom)</span>
                <ZoomIn className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* التمرير السلس */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('smoothScrolling', !settings.smoothScrolling)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.smoothScrolling ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <span className="text-sm text-gray-200">التمرير السلس للرسائل</span>
            </div>

            {/* فتح الروابط في نافذة جديدة */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('openLinksInNewTab', !settings.openLinksInNewTab)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.openLinksInNewTab ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">فتح الروابط في تبويب جديد</span>
                <ExternalLink className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* مؤثرات الصوت */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('soundEffects', !settings.soundEffects)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.soundEffects ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">أصوات إرسال واستلام الرسائل</span>
                <Volume2 className="w-5 h-5 text-teal-400" />
              </div>
            </div>
          </div>
        </div>

        {/* اختصارات لوحة المفاتيح */}
        <div 
          onClick={onOpenShortcuts}
          className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        >
          <span className="text-xs text-teal-400 font-medium">عرض الاختصارات</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-200">اختصارات لوحة المفاتيح (Shortcuts)</span>
            <Command className="w-5 h-5 text-teal-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
