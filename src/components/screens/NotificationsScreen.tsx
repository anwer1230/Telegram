/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, User, Users, Megaphone, PlayCircle, Heart, Bell } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { NotificationSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

export const NotificationsScreen: React.FC<Props> = ({ onBack }) => {
  const [notify, setNotify] = useState<NotificationSettings>(telegramService.getNotificationSettings());
  const theme = telegramService.getThemeSettings();

  const updateSetting = (key: keyof NotificationSettings, val: boolean) => {
    const updated = { ...notify, [key]: val };
    setNotify(updated);
    telegramService.saveNotificationSettings(updated);
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
          <h1 className="text-xl font-bold text-white">الإشعارات والأصوات</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* إظهار الإشعارات من */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            إظهار الإشعارات من
          </span>

          <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between">
            <button
              onClick={() => updateSetting('showFromAllAccounts', !notify.showFromAllAccounts)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                notify.showFromAllAccounts ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
            <span className="text-sm font-semibold text-gray-200">كل الحسابات</span>
          </div>

          <p className="text-xs text-gray-400 text-right">
            عطّل هذا الخيار إذا كنت تريد استلام الإشعارات فقط من الحساب الذي تستخدمه حالياً.
          </p>
        </div>

        {/* إشعارات المحادثات */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            إشعارات المحادثات
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {/* المحادثات الخاصة */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('privateChats', !notify.privateChats)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notify.privateChats ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-gray-200 block">المحادثات الخاصة</span>
                  <span className="text-xs text-gray-400">انقر للتغيير</span>
                </div>
                <User className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* المجموعات */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('groups', !notify.groups)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notify.groups ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-gray-200 block">المجموعات</span>
                  <span className="text-xs text-gray-400">انقر للتغيير</span>
                </div>
                <Users className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* القنوات */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('channels', !notify.channels)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notify.channels ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-gray-200 block">القنوات</span>
                  <span className="text-xs text-gray-400">انقر للتغيير</span>
                </div>
                <Megaphone className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Stories */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('stories', !notify.stories)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notify.stories ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-gray-200 block">Stories</span>
                  <span className="text-xs text-gray-400">انقر للتغيير</span>
                </div>
                <PlayCircle className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Reactions */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => updateSetting('reactions', !notify.reactions)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notify.reactions ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-gray-200 block">Reactions</span>
                  <span className="text-xs text-gray-400">Messages, Stories</span>
                </div>
                <Heart className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>

        {/* المكالمات الصوتية */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            المكالمات الصوتية
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-teal-400">افتراضي</span>
              <span className="text-sm text-gray-200">الاهتزاز</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-teal-400">افتراضي</span>
              <span className="text-sm text-gray-200">"نغمة الرنين"</span>
            </div>
          </div>
        </div>

        {/* شارة عداد الرسائل */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            شارة عدّاد الرسائل
          </span>

          <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between">
            <button
              onClick={() => updateSetting('showBadgeCounter', !notify.showBadgeCounter)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                notify.showBadgeCounter ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
            <span className="text-sm text-gray-200">إظهار أيقونة الشارة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
