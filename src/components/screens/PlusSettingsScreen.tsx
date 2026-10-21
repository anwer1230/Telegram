/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRight, Search, Settings, Users, PlayCircle, MessageSquare, 
  List, Menu, User, Bell, Lock, Grid, Download, ShieldAlert,
  Save, RotateCcw, Check
} from 'lucide-react';
import { telegramService } from '../../services/telegramService';

interface Props {
  onBack: () => void;
  onOpenColorTheme: () => void;
}

export const PlusSettingsScreen: React.FC<Props> = ({ onBack, onOpenColorTheme }) => {
  const theme = telegramService.getThemeSettings();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleBackupSettings = () => {
    showToast("تم حفظ إعدادات بلاس السحابية في مجلد Telegram بنجاح!");
  };

  const handleRestoreSettings = () => {
    showToast("تمت استعادة الإعدادات بنجاح من التخزين السحابي!");
  };

  const items = [
    { title: 'عام', icon: Settings, action: onOpenColorTheme },
    { title: 'المحادثات', icon: Users, action: () => showToast("تم فتح إعدادات المحادثات المتقدمة") },
    { title: 'القصص', icon: PlayCircle, action: () => showToast("إعدادات قصص تيليجرام مفعلة") },
    { title: 'الرسائل', icon: MessageSquare, action: () => showToast("خيارات تحكم الرسائل المتقدمة") },
    { title: 'Topics', icon: List, action: () => showToast("خيارات المواضيع Topics مفعلة") },
    { title: 'درج التصفح', icon: Menu, action: () => showToast("تخصيص بنود وقوائم درج التصفح") },
    { title: 'الملف الشخصي', icon: User, action: () => showToast("تخصيص واجهة الملف الشخصي") },
    { title: 'الإشعارات', icon: Bell, action: () => showToast("إعدادات الإشعارات المخصصة لبلاس") },
    { title: 'الخصوصية والأمان', icon: Lock, action: () => showToast("ميزات حماية إضافية وتشفير متقدم") },
    { title: 'الوسائط المتبادلة', icon: Grid, action: () => showToast("عرض وتصنيف الوسائط المشتركة") },
    { title: 'التحميلات', icon: Download, action: () => showToast("مدير التنزيلات السحابي فائق السرعة") },
    { title: 'Ads', icon: ShieldAlert, action: () => showToast("تم حظر إعلانات القنوات بنجاح") },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3.5 shadow-md transition-colors"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">إعدادات بلاس</h1>
        </div>
        <button className="p-1 hover:bg-black/10 rounded-full">
          <Search className="w-5 h-5 text-white" />
        </button>
      </div>

      {toastMessage && (
        <div className="m-3 p-2.5 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]/60">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={item.action}
              className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="text-sm font-medium text-gray-200">{item.title}</span>
              <Icon className="w-5 h-5 text-teal-400" />
            </div>
          );
        })}

        {/* Backup & Restore matching screenshot bottom */}
        <div className="p-4 bg-[#17212b] space-y-4">
          <div 
            onClick={handleBackupSettings}
            className="cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors text-right"
          >
            <div className="flex items-center justify-end gap-2 text-sm font-semibold text-gray-100">
              <span>حفظ الإعدادات</span>
              <Save className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              مجلد حفظ الإعدادات هي (المفضلات أيضاً) 'Telegram'
            </div>
          </div>

          <div 
            onClick={handleRestoreSettings}
            className="cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors text-right border-t border-[#242f3d] pt-3"
          >
            <div className="flex items-center justify-end gap-2 text-sm font-semibold text-gray-100">
              <span>إستعادة الإعدادات</span>
              <RotateCcw className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              إستعادة الإعدادات من الجهاز أو السحابة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
