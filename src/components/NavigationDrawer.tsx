/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  UserPlus, User, Users, Megaphone, Contact, Folder, 
  Bookmark, Phone, Settings, PlusCircle, Layers, Palette, 
  Paintbrush, HelpCircle, ListFilter, CheckCircle, ChevronDown,
  Cloud
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { TelegramUser } from '../types/telegram';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenColorTheme: () => void;
  onOpenPlusSettings: () => void;
  onOpenAddAccount: () => void;
  onOpenCloudStatus: () => void;
  onOpenChatFolders: () => void;
  onOpenNewGroup: () => void;
  onOpenNewChannel: () => void;
  onOpenContacts: () => void;
}

export const NavigationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectChat,
  onOpenSettings,
  onOpenProfile,
  onOpenColorTheme,
  onOpenPlusSettings,
  onOpenAddAccount,
  onOpenCloudStatus,
  onOpenChatFolders,
  onOpenNewGroup,
  onOpenNewChannel,
  onOpenContacts
}) => {
  if (!isOpen) return null;

  const user = telegramService.getCurrentUser();
  const theme = telegramService.getThemeSettings();

  const handleSavedMessages = () => {
    onSelectChat('saved_messages');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content matching Screenshot 1 */}
      <div 
        className="relative w-80 max-w-[85vw] h-full bg-[#17212b] text-white flex flex-col shadow-2xl z-10 overflow-hidden animate-slide-in-right"
        dir="rtl"
      >
        {/* Header with User Info matching Screenshot 1 */}
        <div 
          className="p-5 pb-4 flex flex-col justify-end text-white shadow-md relative"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/60 shadow-md"
              />
              <div className="absolute bottom-0 left-0 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <button 
              onClick={onOpenCloudStatus}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              title="سحابة تيليجرام والتشفير"
            >
              <Cloud className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-white leading-tight">{user.name}</h2>
              <p className="text-xs text-white/80 dir-ltr text-right mt-0.5">{user.phone}</p>
            </div>
            <button 
              onClick={onOpenProfile}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-white/90" />
            </button>
          </div>
        </div>

        {/* Menu items list matching Screenshot 1 */}
        <div className="flex-1 overflow-y-auto py-2 divide-y divide-[#242f3d]/50 text-right">
          {/* Section 1 */}
          <div className="py-1">
            <button
              onClick={() => { onOpenAddAccount(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">إضافة حساب</span>
              <UserPlus className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenProfile(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">My Profile</span>
              <User className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenNewGroup(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">مجموعة جديدة</span>
              <Users className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenNewChannel(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">قناة جديدة</span>
              <Megaphone className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenContacts(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">جهات الاتصال</span>
              <Contact className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenChatFolders(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">مجلدات المحادثات</span>
              <Folder className="w-5 h-5 text-gray-400" />
            </button>

            {/* الرسائل المحفوظة (سحابة التخزين) */}
            <button
              onClick={handleSavedMessages}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right bg-teal-500/5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded font-mono">سحابي</span>
                <span className="text-sm font-medium text-teal-300">الرسائل المحفوظة</span>
              </div>
              <Bookmark className="w-5 h-5 text-teal-400" />
            </button>

            <button
              onClick={onClose}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">المكالمات</span>
              <Phone className="w-5 h-5 text-gray-400" />
            </button>

            {/* الإعدادات */}
            <button
              onClick={() => { onOpenSettings(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">الإعدادات</span>
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Section 2 (إعدادات بلاس والتخصيص من الصورة 1) */}
          <div className="py-1">
            <button
              onClick={() => { onOpenPlusSettings(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">إعدادات بلاس</span>
              <PlusCircle className="w-5 h-5 text-teal-400" />
            </button>

            <button
              onClick={onClose}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">التصنيفات</span>
              <Layers className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenColorTheme(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">تنزيلُ أنماط</span>
              <Palette className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => { onOpenColorTheme(); onClose(); }}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">تلوين النمط</span>
              <Paintbrush className="w-5 h-5 text-teal-400" />
            </button>

            <button
              onClick={onClose}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">مجموعة الدعم</span>
              <HelpCircle className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={onClose}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-right"
            >
              <span className="text-sm font-medium text-gray-200">عدادات المحادثات</span>
              <ListFilter className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Footer matching bottom of Screenshot 1 */}
        <div className="p-3 bg-[#0e1621] border-t border-[#242f3d] text-center">
          <p className="text-xs text-gray-400 font-medium">تيليجرام للأندرويد</p>
          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
            v13.0.2.0 (22590) universal arm64-v8a
          </p>
        </div>
      </div>
    </div>
  );
};
