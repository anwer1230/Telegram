/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Smile, Phone, Video, Star, MessageSquare } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { PowerUsageSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

export const PowerUsageScreen: React.FC<Props> = ({ onBack }) => {
  const [settings, setSettings] = useState<PowerUsageSettings>(telegramService.getPowerSettings());
  const theme = telegramService.getThemeSettings();

  const updateSetting = (key: keyof PowerUsageSettings, val: any) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    telegramService.savePowerSettings(updated);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-12">
      {/* Top Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Power Usage</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Card 1: وضع توفير الطاقة Slider */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
              settings.powerSavingMode === 'off' ? 'bg-gray-700 text-gray-300' : 'bg-teal-500/20 text-teal-400'
            }`}>
              {settings.powerSavingMode === 'off' ? 'OFF' : 'ON'}
            </span>
            <span className="text-sm font-semibold text-teal-400">وضع توفير الطاقة</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 px-1 pt-2">
            <span>On</span>
            <span className="text-teal-400 font-medium">When below 10% 🔋</span>
            <span>Off</span>
          </div>

          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={settings.powerSavingMode === 'off' ? 0 : settings.powerSavingMode === 'below10' ? 1 : 2}
            onChange={(e) => {
              const val = Number(e.target.value);
              const mode = val === 0 ? 'off' : val === 1 ? 'below10' : 'on';
              updateSetting('powerSavingMode', mode);
            }}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-[#242f3d] rounded-lg"
          />

          <p className="text-xs text-gray-400 text-center pt-2">
            Automatically reduce power usage and animations when your battery is below 10%.
          </p>
        </div>

        {/* Card 2: خيارات توفير الطاقة */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-4">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            خيارات توفير الطاقة
          </span>

          <div className="space-y-4 divide-y divide-[#242f3d]">
            {/* Animated Stickers */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('animatedStickers', !settings.animatedStickers)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.animatedStickers ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">۲/۲</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">Animated Stickers</span>
                <Smile className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Animated Emoji */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('animatedEmoji', !settings.animatedEmoji)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.animatedEmoji ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">۱/۳</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">Animated Emoji</span>
                <Smile className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* التأثيرات في المحادثات */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('chatEffects', !settings.chatEffects)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.chatEffects ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">۲/٦</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">التأثيرات في المحادثات</span>
                <MessageSquare className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Animations in Calls */}
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => updateSetting('animationsInCalls', !settings.animationsInCalls)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.animationsInCalls ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">Animations in Calls</span>
                <Phone className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Autoplay Videos */}
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => updateSetting('autoplayVideos', !settings.autoplayVideos)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.autoplayVideos ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">Autoplay Videos</span>
                <Video className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* تشغيل تلقائي للصور المتحركة */}
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => updateSetting('autoplayGifs', !settings.autoplayGifs)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.autoplayGifs ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">تشغيل تلقائي للصور المتحركة</span>
                <span className="text-xs font-bold border border-gray-400 px-1 rounded text-gray-300">GIF</span>
              </div>
            </div>

            {/* الجسيمات */}
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => updateSetting('particles', !settings.particles)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.particles ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">الجسيمات</span>
                <Star className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Enable Smooth Transitions */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateSetting('enableSmoothTransitions', !settings.enableSmoothTransitions)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.enableSmoothTransitions ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
            <span className="text-sm font-semibold text-gray-100">Enable Smooth Transitions</span>
          </div>
          <p className="text-xs text-gray-400 text-right">
            You can disable animated transitions between different sections of the apps.
          </p>
        </div>
      </div>
    </div>
  );
};
