/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Phone, AtSign, Cake, Megaphone, Bot, UserPlus, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { TelegramUser } from '../../types/telegram';

interface Props {
  onBack: () => void;
  onSwitchAccount: (userId: string) => void;
  onOpenAddAccount: () => void;
}

export const AccountScreen: React.FC<Props> = ({ onBack, onSwitchAccount, onOpenAddAccount }) => {
  const [user, setUser] = useState<TelegramUser>(telegramService.getCurrentUser());
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio);
  const [username, setUsername] = useState(user.username);
  const [birthday, setBirthday] = useState(user.birthday || '15 مايو 1996');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const theme = telegramService.getThemeSettings();
  const accounts = telegramService.getAccounts().filter(a => a.id !== user.id);

  const handleSave = () => {
    setIsSaving(true);
    const updated = telegramService.updateProfile({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      bio,
      username,
      birthday
    });
    setUser(updated);
    setIsSaving(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-10">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">الحساب</h1>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>حفظ</span>
        </button>
      </div>

      {saveToast && (
        <div className="m-4 p-3 bg-emerald-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg">
          تم تحديث معلومات الحساب ومزامنتها مع سحابة تيليجرام
        </div>
      )}

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Card 1: اسمك */}
        <div className="bg-[#17212b] rounded-2xl p-4 shadow-sm border border-[#242f3d]">
          <span className="text-xs font-semibold block mb-2" style={{ color: theme.primaryColor }}>
            اسمك
          </span>
          <div className="space-y-3">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="الاسم الأول"
              className="w-full bg-transparent border-b border-[#242f3d] py-1.5 text-base text-gray-100 focus:outline-none focus:border-teal-500 text-right"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="اسم العائلة"
              className="w-full bg-transparent py-1.5 text-base text-gray-100 focus:outline-none text-right"
            />
          </div>
        </div>

        {/* Card 2: النبذة */}
        <div className="bg-[#17212b] rounded-2xl p-4 shadow-sm border border-[#242f3d]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">70</span>
            <span className="text-xs font-semibold text-gray-400">النبذة</span>
          </div>
          <input
            type="text"
            value={bio}
            maxLength={70}
            onChange={(e) => setBio(e.target.value)}
            placeholder="بضع كلمات عنك."
            className="w-full bg-transparent text-sm text-gray-200 focus:outline-none text-right"
          />
          <p className="text-xs text-gray-400 mt-2 text-right">
            يمكنك كتابة نبذة تعريفية قصيرة تظهر للآخرين في ملفك الشخصي.
          </p>
        </div>

        {/* Card 3: معلوماتك */}
        <div className="bg-[#17212b] rounded-2xl p-4 shadow-sm border border-[#242f3d]">
          <span className="text-xs font-semibold block mb-3 text-right" style={{ color: theme.primaryColor }}>
            معلوماتك
          </span>

          <div className="space-y-4 divide-y divide-[#242f3d]">
            {/* Phone */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-right">
                <div className="text-base font-semibold text-gray-100 dir-ltr">{user.phone}</div>
                <div className="text-xs text-gray-400">انقر لتغيير رقم الهاتف</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between pt-3">
              <div className="text-right flex-1 ml-4">
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="إضافة اسم المستخدم"
                  className="bg-transparent text-sm text-gray-100 focus:outline-none text-right w-full"
                />
                <div className="text-xs text-gray-400">@{username || 'user'}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <AtSign className="w-5 h-5" />
              </div>
            </div>

            {/* Birthday */}
            <div className="flex items-center justify-between pt-3">
              <div className="text-right flex-1 ml-4">
                <input 
                  type="text"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  placeholder="إضافة تاريخ الميلاد"
                  className="bg-transparent text-sm text-gray-100 focus:outline-none text-right w-full"
                />
              </div>
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Cake className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-400 text-right">
            Only your contacts can see your birthday. <span className="text-teal-400 cursor-pointer">Change &gt;</span>
          </div>
        </div>

        {/* Card 4: Channels & Bot */}
        <div className="bg-[#17212b] rounded-2xl p-4 shadow-sm border border-[#242f3d] space-y-4">
          <div className="flex items-center justify-between">
            <button className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30">
              Add
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-200">Personal channel</span>
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#242f3d] pt-3">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
              NEW
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-200">المحادثة الآلية</span>
              <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-right">
            يمكنك إضافة بوت للرد على الرسائل نيابة عنك.
          </p>
        </div>

        {/* Card 5: إضافة حساب وقائمة الحسابات */}
        <div className="bg-[#17212b] rounded-2xl p-4 shadow-sm border border-[#242f3d]">
          <div 
            onClick={onOpenAddAccount}
            className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold" style={{ color: theme.primaryColor }}>
              إضافة حساب
            </span>
          </div>

          {/* Accounts switcher matching screenshot */}
          <div className="mt-3 divide-y divide-[#242f3d]">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => onSwitchAccount(acc.id)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-teal-600/30 text-teal-300 font-bold px-2 py-0.5 rounded-full">
                    {acc.unreadTotal}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-200 font-medium">{acc.name}</span>
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#242f3d]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
