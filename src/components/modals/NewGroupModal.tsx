/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Users, Image as ImageIcon, Check } from 'lucide-react';
import { telegramService } from '../../services/telegramService';

interface Props {
  onClose: () => void;
  onSuccess: (chatId: string) => void;
}

export const NewGroupModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const theme = telegramService.getThemeSettings();

  const handleCreate = () => {
    if (!groupName.trim()) return;
    const newChat = {
      id: 'group_' + Date.now(),
      title: groupName.trim(),
      type: 'group' as const,
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'تم إنشاء المجموعة بنجاح 🎉',
      lastMessageTime: 'الآن',
      unreadCount: 0,
      membersCount: 1,
      folder: 'groups'
    };

    const currentChats = telegramService.getChats();
    currentChats.unshift(newChat);
    localStorage.setItem('tg_chats_v2', JSON.stringify(currentChats));
    
    // Add initial message
    telegramService.sendMessage(newChat.id, `أهلاً بالجميع في مجموعة ${groupName}!`);
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
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold">إنشاء مجموعة جديدة</h2>
          <p className="text-xs text-gray-400">يمكن للمجموعة استيعاب حتى 200,000 عضو مع مشاركة الملفات المشفرة</p>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <label className="text-xs text-teal-400 block mb-1">اسم المجموعة</label>
            <input
              type="text"
              placeholder="اكتب اسم المجموعة..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 rounded-xl text-sm text-right text-white focus:outline-none focus:border-teal-400"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">وصف المجموعة (اختياري)</label>
            <input
              type="text"
              placeholder="وصف مختصر لموضوع المجموعة..."
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 rounded-xl text-sm text-right text-white focus:outline-none"
            />
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
            <span>إنشاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
