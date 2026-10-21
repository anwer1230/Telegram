/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRight, Search, MoreVertical, Settings as SettingsIcon, Palette, 
  Download, Users, User, MessageCircle, Key, Volume2, HardDrive, 
  Folder, Laptop, BatteryCharging, Globe, Star, Store, Gift, 
  HelpCircle, ChevronLeft, Cloud, ShieldCheck, UserPlus
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { TelegramUser } from '../types/telegram';

interface Props {
  onBack: () => void;
  onOpenAccount: () => void;
  onOpenPlusSettings: () => void;
  onOpenColorTheme: () => void;
  onOpenChatSettings: () => void;
  onOpenPrivacy: () => void;
  onOpenNotifications: () => void;
  onOpenDataStorage: () => void;
  onOpenDevices: () => void;
  onOpenPowerUsage: () => void;
  onOpenLanguage: () => void;
  onOpenCloudStatus: () => void;
  onOpenAddAccount: () => void;
  onOpenChatFolders: () => void;
  onOpenGeneralSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenCacheModal: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  onBack,
  onOpenAccount,
  onOpenPlusSettings,
  onOpenColorTheme,
  onOpenChatSettings,
  onOpenPrivacy,
  onOpenNotifications,
  onOpenDataStorage,
  onOpenDevices,
  onOpenPowerUsage,
  onOpenLanguage,
  onOpenCloudStatus,
  onOpenAddAccount,
  onOpenChatFolders,
  onOpenGeneralSettings,
  onOpenShortcuts,
  onOpenCacheModal
}) => {
  const [currentUser, setCurrentUser] = useState<TelegramUser>(telegramService.getCurrentUser());
  const [accounts, setAccounts] = useState<TelegramUser[]>(telegramService.getAccounts());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const theme = telegramService.getThemeSettings();

  const handleSwitchUser = (userId: string) => {
    const newUser = telegramService.switchAccount(userId);
    setCurrentUser(newUser);
    setAccounts(telegramService.getAccounts());
  };

  const otherAccounts = accounts.filter(a => a.id !== currentUser.id);

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-16">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">الإعدادات</h1>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 hover:bg-black/10 rounded-full text-white transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenCloudStatus}
            className="p-1.5 hover:bg-black/10 rounded-full text-white transition-colors"
            title="سحابة تيليجرام والتشفير"
          >
            <Cloud className="w-5 h-5 text-teal-200" />
          </button>
          <button className="p-1.5 hover:bg-black/10 rounded-full text-white transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="p-3 bg-[#17212b] border-b border-[#242f3d]">
          <input
            type="text"
            placeholder="بحث في الإعدادات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1621] border border-[#242f3d] px-4 py-2 rounded-xl text-sm text-right text-white focus:outline-none focus:border-teal-400"
            autoFocus
          />
        </div>
      )}

      <div className="p-3.5 space-y-3.5 max-w-2xl mx-auto w-full">
        {/* Current Active User Banner */}
        <div 
          onClick={onOpenAccount}
          className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-base font-bold text-gray-100">{currentUser.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-gray-400 dir-ltr">{currentUser.phone}</div>
              <div className="text-xs text-teal-400">@{currentUser.username || 'username'}</div>
            </div>
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-14 h-14 rounded-full object-cover border-2 border-teal-500 shadow-sm"
            />
          </div>
        </div>

        {/* Multi-Accounts Switcher (مطابقة للصورة 2) */}
        <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
          {otherAccounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => handleSwitchUser(acc.id)}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-600/30 text-teal-300">
                  {acc.unreadTotal}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-200">{acc.name}</span>
                <img
                  src={acc.avatar}
                  alt={acc.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#242f3d]"
                />
              </div>
            </div>
          ))}

          <div 
            onClick={onOpenAddAccount}
            className="p-3 flex items-center justify-end gap-2 text-teal-400 hover:bg-white/5 cursor-pointer text-xs font-bold"
          >
            <span>+ إضافة حساب آخر</span>
            <UserPlus className="w-4 h-4" />
          </div>
        </div>

        {/* Plus shortcuts Card (مطابقة للصورة 2) */}
        <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
          <div 
            onClick={onOpenPlusSettings}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">إعدادات بلاس</span>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <SettingsIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div 
            onClick={onOpenColorTheme}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">تلوين النمط</span>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div 
            onClick={onOpenColorTheme}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">تنزيلُ أنماط</span>
              <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* مجموعة الدعم Card */}
        <div className="bg-[#17212b] rounded-2xl border border-[#242f3d]">
          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">مجموعة الدعم</span>
              <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Settings Category (مطابقة للصورة 2 و 3) */}
        <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
          {/* الحساب */}
          <div 
            onClick={onOpenAccount}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">الحساب</span>
                <span className="text-xs text-gray-400">الرقم، اسم المستخدم، النبذة</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* إعدادات المحادثات */}
          <div 
            onClick={onOpenChatSettings}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">إعدادات المحادثات</span>
                <span className="text-xs text-gray-400">خلفية الشاشة، الوضع الليلي، المؤثرات الحركية</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* الخصوصية والأمان */}
          <div 
            onClick={onOpenPrivacy}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">الخصوصية والأمان</span>
                <span className="text-xs text-gray-400">آخر ظهور، الأجهزة، مفاتيح المرور</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* الإشعارات */}
          <div 
            onClick={onOpenNotifications}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">الإشعارات</span>
                <span className="text-xs text-gray-400">الأصوات، المكالمات، الشارات</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* البيانات والتخزين */}
          <div 
            onClick={onOpenDataStorage}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">البيانات والتخزين</span>
                <span className="text-xs text-gray-400">إعدادات تنزيل الوسائط</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* مجلدات المحادثات */}
          <div 
            onClick={onOpenChatFolders}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">مجلدات المحادثات</span>
                <span className="text-xs text-gray-400">فرز المحادثات في مجلدات</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* الإعدادات العامة للويب */}
          <div 
            onClick={onOpenGeneralSettings}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">الإعدادات العامة للويب</span>
                <span className="text-xs text-gray-400">تنسيق الوقت، إرسال بالإنتر، التكبير</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <SettingsIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* الأجهزة */}
          <div 
            onClick={onOpenDevices}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">الأجهزة</span>
                <span className="text-xs text-gray-400">إدارة الأجهزة المتصلة</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-sky-600/20 text-sky-400 flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* توفير الطاقة */}
          <div 
            onClick={onOpenPowerUsage}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">توفير الطاقة</span>
                <span className="text-xs text-gray-400">تقليل استهلاك الطاقة عند انخفاض الشحن</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <BatteryCharging className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* اللغة */}
          <div 
            onClick={onOpenLanguage}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-sm font-semibold text-gray-100 block">اللغة</span>
                <span className="text-xs text-gray-400">العربية</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Premium & Business Services (مطابقة للصورة 3) */}
        <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">Telegram Premium</span>
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Star className="w-4 h-4 fill-purple-400" />
              </div>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">Telegram Business</span>
              <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">Send a Gift</span>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* مساعدة Card (مطابقة للصورة 3) */}
        <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
          <div className="px-4 pt-3 pb-1 text-right">
            <span className="text-xs font-semibold text-teal-400">مساعدة</span>
          </div>

          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">اسأل سؤالاً</span>
              <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* زر السحابة والتشفير المباشر */}
          <div 
            onClick={onOpenCloudStatus}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 bg-teal-950/20"
          >
            <ChevronLeft className="w-4 h-4 text-teal-400" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-sm font-bold text-teal-300 block">ربط سحابة تيليجرام والتشفير</span>
                <span className="text-[11px] text-gray-400">MTProto WSS • API_ID: 34773007</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
