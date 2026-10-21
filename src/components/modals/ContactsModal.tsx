/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Contact, UserPlus, Search, Phone, MessageSquare } from 'lucide-react';
import { telegramService } from '../../services/telegramService';

interface Props {
  onClose: () => void;
  onSelectContact: (chatId: string) => void;
}

export const ContactsModal: React.FC<Props> = ({ onClose, onSelectContact }) => {
  const [search, setSearch] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+966 ');

  const theme = telegramService.getThemeSettings();
  const chats = telegramService.getChats().filter(c => c.type === 'user');

  const filteredContacts = chats.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const handleAddContact = () => {
    if (!name.trim() || !phone.trim()) return;
    const newChat = {
      id: 'contact_' + Date.now(),
      title: name.trim(),
      type: 'user' as const,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'تمت إضافة جهة الاتصال إلى السحابة',
      lastMessageTime: 'الآن',
      unreadCount: 0,
      phone: phone.trim(),
      isOnline: true,
      folder: 'personal'
    };

    const currentChats = telegramService.getChats();
    currentChats.unshift(newChat);
    localStorage.setItem('tg_chats_v2', JSON.stringify(currentChats));

    setShowAddContact(false);
    onSelectContact(newChat.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#242f3d] pb-3">
          <button onClick={onClose} className="p-1 hover:bg-black/20 rounded-full text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-100">جهات الاتصال</h2>
            <Contact className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        {/* Add Contact Button */}
        <button
          onClick={() => setShowAddContact(!showAddContact)}
          className="w-full py-2.5 px-4 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة جهة اتصال جديدة</span>
        </button>

        {/* Add Contact Form */}
        {showAddContact && (
          <div className="p-3 bg-[#0e1621] rounded-2xl border border-[#242f3d] space-y-2.5 text-right animate-fade-in">
            <div>
              <label className="text-[11px] text-teal-400 block mb-1">الاسم الكامل</label>
              <input
                type="text"
                placeholder="اسم جهة الاتصال..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#17212b] border border-[#242f3d] py-1.5 px-3 rounded-lg text-xs text-right text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-teal-400 block mb-1">رقم الهاتف</label>
              <input
                type="tel"
                placeholder="+966 5X XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#17212b] border border-[#242f3d] py-1.5 px-3 rounded-lg text-xs text-left dir-ltr text-white focus:outline-none focus:border-teal-400 font-mono"
              />
            </div>
            <button
              onClick={handleAddContact}
              className="w-full py-2 rounded-lg text-white font-bold text-xs shadow"
              style={{ backgroundColor: theme.primaryColor }}
            >
              حفظ ومراسلة في السحابة
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 pl-9 rounded-xl text-xs text-right text-white focus:outline-none focus:border-teal-400"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d] pr-1">
          {filteredContacts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">لا توجد جهات اتصال مطابقة</p>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  onSelectContact(contact.id);
                  onClose();
                }}
                className="py-2.5 px-2 flex items-center justify-between cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
              >
                <button className="p-2 text-teal-400 hover:bg-teal-500/20 rounded-full">
                  <MessageSquare className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-100">{contact.title}</h4>
                    <p className="text-[11px] text-gray-400 dir-ltr">{contact.phone || 'متصل في تيليجرام'}</p>
                  </div>
                  <img
                    src={contact.avatar}
                    alt={contact.title}
                    className="w-10 h-10 rounded-full object-cover border border-[#242f3d]"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
