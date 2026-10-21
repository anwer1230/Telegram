/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Shield, Clock, Lock, Mail, Hand, Laptop, Star, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { PrivacySecuritySettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
  onOpenDevices: () => void;
}

export const PrivacyScreen: React.FC<Props> = ({ onBack, onOpenDevices }) => {
  const [privacy, setPrivacy] = useState<PrivacySecuritySettings>(telegramService.getPrivacySettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const theme = telegramService.getThemeSettings();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const cyclePrivacy = (key: keyof PrivacySecuritySettings, current: string) => {
    const next = current === 'nobody' ? 'contacts' : current === 'contacts' ? 'everyone' : 'nobody';
    const updated = { ...privacy, [key]: next };
    setPrivacy(updated);
    telegramService.savePrivacySettings(updated);
    showToast("تم تحديث إعدادات الخصوصية السحابية المشفرة");
  };

  const getPrivacyLabel = (val: string) => {
    if (val === 'nobody') return 'لا أحد';
    if (val === 'contacts') return 'جهات الاتصال';
    return 'الجميع';
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
          <h1 className="text-xl font-bold text-white">الخصوصية والأمان</h1>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* الأمان Section */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            الأمان
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {/* التحقق بخطوتين */}
            <div 
              onClick={() => {
                const updated = { ...privacy, twoStepAuth: !privacy.twoStepAuth };
                setPrivacy(updated);
                telegramService.savePrivacySettings(updated);
                showToast(updated.twoStepAuth ? "تم تفعيل التحقق بخطوتين 2FA" : "تم تعطيل التحقق بخطوتين");
              }}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="text-xs text-gray-400">{privacy.twoStepAuth ? 'مفعلة' : 'معطلة'}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">التحقق بخطوتين</span>
                <Shield className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* Auto-Delete Messages */}
            <div 
              onClick={() => showToast("خيارات الحذف التلقائي للرسائل بعد 24 ساعة أو أسبوع")}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="text-xs text-gray-400">معطلة</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">Auto-Delete Messages</span>
                <Clock className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* رمز القفل */}
            <div 
              onClick={() => showToast("تم تفعيل رمز القفل للتطبيق بنجاح")}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="text-xs text-gray-400">معطلة</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">رمز القفل</span>
                <Lock className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* بريد تسجيل الدخول */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-gray-300 font-mono">{privacy.loginEmail}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">بريد تسجيل الدخول</span>
                <Mail className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* المستخدمون المحظورون */}
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5">
              <span className="text-xs text-gray-400">لا أحد</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">المستخدمون المحظورون</span>
                <Hand className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* الجلسات النشطة */}
            <div 
              onClick={onOpenDevices}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">۲</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">الجلسات النشطة</span>
                <Laptop className="w-5 h-5 text-teal-400" />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-right pt-1">
            Review the list of devices where you are logged into your Telegram account.
          </p>
        </div>

        {/* الخصوصية Section */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            الخصوصية
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {/* رقم الهاتف */}
            <div 
              onClick={() => cyclePrivacy('phonePrivacy', privacy.phonePrivacy)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-teal-400">{getPrivacyLabel(privacy.phonePrivacy)}</span>
              <span className="text-sm text-gray-200">رقم الهاتف</span>
            </div>

            {/* آخر ظهور ومتصل */}
            <div 
              onClick={() => cyclePrivacy('lastSeenPrivacy', privacy.lastSeenPrivacy)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-teal-400">{getPrivacyLabel(privacy.lastSeenPrivacy)}</span>
              <span className="text-sm text-gray-200">آخر ظهور ومتصل</span>
            </div>

            {/* الصور الشخصية */}
            <div 
              onClick={() => cyclePrivacy('photosPrivacy', privacy.photosPrivacy)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-teal-400">{getPrivacyLabel(privacy.photosPrivacy)}</span>
              <span className="text-sm text-gray-200">الصور الشخصية</span>
            </div>

            {/* الرسائل المحوّلة */}
            <div 
              onClick={() => cyclePrivacy('forwardPrivacy', privacy.forwardPrivacy)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-teal-400">{getPrivacyLabel(privacy.forwardPrivacy)}</span>
              <span className="text-sm text-gray-200">الرسائل المحوّلة</span>
            </div>

            {/* المكالمات */}
            <div 
              onClick={() => cyclePrivacy('callsPrivacy', privacy.callsPrivacy)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-teal-400">{getPrivacyLabel(privacy.callsPrivacy)}</span>
              <span className="text-sm text-gray-200">المكالمات</span>
            </div>

            {/* Voice Messages */}
            <div 
              onClick={() => cyclePrivacy('voiceMessagesPrivacy', privacy.voiceMessagesPrivacy)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-teal-400">{getPrivacyLabel(privacy.voiceMessagesPrivacy)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-200">Voice Messages</span>
                <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
