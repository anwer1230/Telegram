/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleBackupSettings = () => {
    try {
      const backupData = {
        app: "Telegram Web Plus",
        version: "13.0.2",
        exportedAt: new Date().toISOString(),
        theme: telegramService.getThemeSettings(),
        folders: telegramService.getFolders(),
        generalSettings: telegramService.getGeneralSettings(),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Telegram_Plus_Settings_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("تم تصدير وحفظ ملف إعدادات بلاس بنجاح!");
    } catch (e) {
      showToast("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.theme) {
          telegramService.saveThemeSettings(parsed.theme);
        }
        if (parsed.folders && Array.isArray(parsed.folders)) {
          localStorage.setItem('tg_folders_v2', JSON.stringify(parsed.folders));
        }
        if (parsed.generalSettings) {
          telegramService.saveGeneralSettings(parsed.generalSettings);
        }
        showToast("تمت استعادة الإعدادات بنجاح! جاري التحديث...");
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        showToast("الملف المحدد غير صالح للإعدادات");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const items = [
    { title: 'عام (الألوان والتخصيص)', icon: Settings, action: onOpenColorTheme },
    { title: 'المحادثات', icon: Users, action: () => showToast("خيارات المحادثات المتقدمة مفعلة") },
    { title: 'القصص', icon: PlayCircle, action: () => showToast("قصص تيليجرام مفعلة تلقائياً") },
    { title: 'الرسائل', icon: MessageSquare, action: () => showToast("خيارات تحكم الرسائل المتقدمة مفعلة") },
    { title: 'Topics', icon: List, action: () => showToast("خيارات المواضيع مفعلة") },
    { title: 'درج التصفح', icon: Menu, action: () => showToast("تخصيص بنود وقوائم درج التصفح") },
    { title: 'الملف الشخصي', icon: User, action: () => showToast("تخصيص واجهة الملف الشخصي") },
    { title: 'الإشعارات', icon: Bell, action: () => showToast("إعدادات الإشعارات المخصصة لبلاس") },
    { title: 'الخصوصية والأمان', icon: Lock, action: () => showToast("ميزات حماية إضافية وتشفير متقدم") },
    { title: 'الوسائط المتبادلة', icon: Grid, action: () => showToast("عرض وتصنيف الوسائط المشتركة") },
    { title: 'التحميلات', icon: Download, action: () => showToast("مدير التنزيلات السحابي فائق السرعة") },
    { title: 'Ads', icon: ShieldAlert, action: () => showToast("تم حظر إعلانات القنوات تلقائياً") },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white">
      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

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
              تصدير ملف JSON للإعدادات إلى جهازك أو السحابة
            </div>
          </div>

          <div 
            onClick={handleRestoreClick}
            className="cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors text-right border-t border-[#242f3d] pt-3"
          >
            <div className="flex items-center justify-end gap-2 text-sm font-semibold text-gray-100">
              <span>إستعادة الإعدادات</span>
              <RotateCcw className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              استيراد الإعدادات من ملف JSON محفوظ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
