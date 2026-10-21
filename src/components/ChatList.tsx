/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Menu, Search, Cloud, Pin, Check, CheckCheck, 
  MessageSquarePlus, ShieldCheck, Sparkles, Filter, X,
  Users, Megaphone, Contact
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { ChatItem } from '../types/telegram';

interface Props {
  chats: ChatItem[];
  selectedChatId: string | null;
  onSelectChat: (chat: ChatItem) => void;
  onOpenDrawer: () => void;
  onOpenCloudStatus: () => void;
  onOpenNewGroup: () => void;
  onOpenNewChannel: () => void;
  onOpenContacts: () => void;
}

const TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'personal', label: 'شخصي' },
  { id: 'groups', label: 'مجموعات' },
  { id: 'channels', label: 'قنوات' },
  { id: 'bots', label: 'بوتات' },
  { id: 'unread', label: 'غير مقروءة' },
  { id: 'saved', label: 'المحفوظة' },
];

export const ChatList: React.FC<Props> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onOpenDrawer,
  onOpenCloudStatus,
  onOpenNewGroup,
  onOpenNewChannel,
  onOpenContacts
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const theme = telegramService.getThemeSettings();

  const filteredChats = chats.filter((chat) => {
    // Search query filter
    if (searchQuery.trim()) {
      const matchTitle = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMsg = chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchTitle && !matchMsg) return false;
    }

    // Tab filter
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return chat.type === 'user';
    if (activeTab === 'groups') return chat.type === 'group';
    if (activeTab === 'channels') return chat.type === 'channel';
    if (activeTab === 'bots') return chat.type === 'bot';
    if (activeTab === 'unread') return chat.unreadCount > 0;
    if (activeTab === 'saved') return chat.type === 'saved';
    return true;
  });

  return (
    <div className="flex flex-col h-full w-full bg-[#17212b] border-l border-[#242f3d] select-none relative">
      {/* Top Header Bar matching Screenshot 2 */}
      <div 
        className="flex items-center justify-between px-4 py-3 shadow-md transition-colors"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDrawer}
            className="p-1 hover:bg-black/10 rounded-full transition-colors text-white"
            title="القائمة الجانبية"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-wide text-white">تيليجرام</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCloudStatus}
            className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white relative"
            title="حالة سحابة تيليجرام والتشفير"
          >
            <Cloud className="w-5 h-5 text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-teal-800" />
          </button>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white"
            title="بحث"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Real-time search bar */}
      {isSearchOpen && (
        <div className="p-2.5 bg-[#0e1621] border-b border-[#242f3d] flex items-center gap-2 animate-fade-in">
          <input
            type="text"
            placeholder="بحث في الرسائل والمحادثات السحابية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-[#17212b] border border-[#242f3d] text-white text-xs py-2 px-3 rounded-xl focus:outline-none focus:border-teal-400 text-right"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchQuery('');
              setIsSearchOpen(false);
            }}
            className="p-1.5 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs matching Telegram Web folders */}
      <div className="flex items-center overflow-x-auto scrollbar-none bg-[#17212b] border-b border-[#242f3d] px-2 text-xs font-semibold">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                isActive ? 'text-teal-400 font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: theme.primaryColor }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]/60">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs space-y-2">
            <p>لا توجد محادثات في هذا القسم</p>
            <p className="text-[11px] text-gray-500">انقر على زر + بالأسفل لإنشاء محادثة، مجموعة أو قناة جديدة</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors relative ${
                  isSelected ? 'bg-[#242f3d]' : 'hover:bg-white/5'
                }`}
              >
                {/* Right side: Avatar and online indicator */}
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={chat.avatar}
                      alt={chat.title}
                      className="w-12 h-12 rounded-full object-cover border border-[#242f3d]"
                    />
                    {chat.isOnline && (
                      <span className="absolute bottom-0 left-0 w-3 h-3 bg-emerald-400 border-2 border-[#17212b] rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-gray-400 font-mono">
                        {chat.lastMessageTime}
                      </span>
                      <div className="flex items-center gap-1 truncate max-w-[170px]">
                        {chat.isVerified && <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                        <h3 className="text-sm font-bold text-gray-100 truncate">{chat.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {chat.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-gray-400 rotate-45" />
                        )}
                        {chat.unreadCount > 0 && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 truncate max-w-[190px]">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Menu Backdrop */}
      {showFabMenu && (
        <div
          onClick={() => setShowFabMenu(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] transition-opacity"
        />
      )}

      {/* Floating Action Popup Menu (New Group / New Channel / Contacts) */}
      {showFabMenu && (
        <div 
          className="absolute bottom-20 left-4 z-40 bg-[#17212b] border border-teal-500/40 rounded-2xl shadow-2xl p-2 w-56 space-y-1 animate-fade-in text-right"
          dir="rtl"
        >
          {/* New Group */}
          <button
            onClick={() => {
              setShowFabMenu(false);
              onOpenNewGroup();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-100 block">مجموعة جديدة</span>
                <span className="text-[10px] text-gray-400">حتى 200,000 عضو</span>
              </div>
            </div>
          </button>

          {/* New Channel */}
          <button
            onClick={() => {
              setShowFabMenu(false);
              onOpenNewChannel();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-100 block">قناة جديدة</span>
                <span className="text-[10px] text-gray-400">نشر لملايين المتابعين</span>
              </div>
            </div>
          </button>

          {/* Contacts / New Chat */}
          <button
            onClick={() => {
              setShowFabMenu(false);
              onOpenContacts();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Contact className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-100 block">محادثة جديدة</span>
                <span className="text-[10px] text-gray-400">جهات الاتصال السحابية</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Floating Action Button (FAB) matching User Screenshot */}
      <button
        onClick={() => setShowFabMenu(!showFabMenu)}
        className="absolute bottom-5 left-5 w-13 h-13 rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-95 hover:scale-105 z-30"
        style={{ backgroundColor: theme.primaryColor }}
        title="إنشاء مجموعة أو قناة أو محادثة جديدة"
      >
        <MessageSquarePlus className={`w-6 h-6 transition-transform duration-200 ${showFabMenu ? 'rotate-45' : ''}`} />
      </button>
    </div>
  );
};
