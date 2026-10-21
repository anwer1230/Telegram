/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Menu, Search, Cloud, Pin, Check, CheckCheck, 
  MessageSquarePlus, ShieldCheck, Sparkles, Filter, X
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { ChatItem } from '../types/telegram';

interface Props {
  chats: ChatItem[];
  selectedChatId: string | null;
  onSelectChat: (chat: ChatItem) => void;
  onOpenDrawer: () => void;
  onOpenCloudStatus: () => void;
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
  onOpenCloudStatus
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    <div className="flex flex-col h-full bg-[#17212b] text-white border-l border-[#242f3d]">
      {/* Header matching Telegram Plus Messenger */}
      <div 
        className="px-4 py-3 shadow-md z-10 transition-colors"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenDrawer}
              className="p-1 hover:bg-black/10 rounded-full transition-colors text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white tracking-wide">Telegram</h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenCloudStatus}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors"
              title="السحابة الرسمية والتشفير"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cloud className="w-4 h-4" />
              <span className="hidden sm:inline">سحابي</span>
            </button>

            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1.5 hover:bg-black/10 rounded-full text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar inside header when open */}
        {isSearchOpen && (
          <div className="mt-2.5 flex items-center gap-2 bg-black/20 rounded-xl px-3 py-1.5 animate-fade-in">
            <Search className="w-4 h-4 text-white/70" />
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent flex-1 text-sm text-white placeholder-white/60 focus:outline-none text-right"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Categories Tabs (التبويبات العلوية لبلاس) */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none pb-0.5 text-xs font-semibold">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-teal-800 shadow font-bold'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat list items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]/60">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <Filter className="w-8 h-8 mx-auto text-gray-500" />
            <p className="text-sm">لا توجد محادثات في هذا التبويب</p>
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

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => onSelectChat(chats[0])}
        className="fixed bottom-5 left-5 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform active:scale-95 hover:scale-105 z-20 sm:relative sm:bottom-auto sm:left-auto sm:hidden"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>
    </div>
  );
};
