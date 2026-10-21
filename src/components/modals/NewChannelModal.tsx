/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Megaphone, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';

interface Props {
  onClose: () => void;
  onSuccess: (chatId: string) => void;
}

export const NewChannelModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const theme = telegramService.getThemeSettings();

  const handleCreate = () => {
    if (!channelName.trim()) return;
    const newChat = {
      id: 'channel_' + Date.now(),
      title: channelName.trim(),
      type: 'channel' as const,
      avatar: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'تم إنشاء القناة بنجاح. أهلاً بكم في البث المباشر 📢',
      lastMessageTime: 'الآن',
      unreadCount: 0,
      membersCount: 1,
      folder: 'channels'
    };

    const currentChats = telegramService.getChats();
    currentChats.unshift(newChat);
    localStorage.setItem('tg_chats_v2', JSON.stringify(currentChats));

    telegramService.sendMessage(newChat.id, `مرحباً بالمشتركين الجدد في قناة ${channelName}!`);
    onSuccess(newChat.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold">إنشاء قناة جديدة</h2>
          <p className="text-xs text-gray-400">القنوات أداة لنشر رسائلك العامة إلى عدد غير محدود من المشتركين</p>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <label className="text-xs text-teal-400 block mb-1">اسم القناة</label>
            <input
              type="text"
              placeholder="اكتب اسم القناة..."
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 rounded-xl text-sm text-right text-white focus:outline-none focus:border-teal-400"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">وصف القناة</label>
            <textarea
              rows={2}
              placeholder="وصف مختصر لمحتوى القناة..."
              value={channelDesc}
              onChange={(e) => setChannelDesc(e.target.value)}
              className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 rounded-xl text-sm text-right text-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#0e1621] border border-[#242f3d]">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                isPublic ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
            <span className="text-xs text-gray-300">
              {isPublic ? 'قناة عامة (يمكن لأي شخص العثور عليها بالبحث)' : 'قناة خاصة (عبر رابط دعوة فقط)'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-1.5"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Check className="w-4 h-4" />
            <span>إنشاء القناة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
