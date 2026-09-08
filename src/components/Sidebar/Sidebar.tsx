import React, { useState, useEffect, useMemo } from 'react';
import { List as FixedSizeList, type RowComponentProps } from 'react-window';
import { useTelegram } from '../../context/TelegramContext';
import { ChatListHeader } from './ChatListHeader';
import { FolderBar } from './FolderBar';
import { ChatListItem } from './ChatListItem';
import { StoriesBar } from './StoriesBar';
import {
  Bot,
  Radio,
  Users,
  MessageSquare,
  Globe,
  Edit3,
  RefreshCw,
  Plus,
  Lock,
  Megaphone,
} from 'lucide-react';
import { usePullToRefresh, useEdgeSwipeDrawer } from '../../hooks/useTouchGestures';
import { messagesController } from '../../core/MessagesController';
import { draftSyncService } from '../../services/DraftSyncService';
import { Chat } from '../../types';

interface ChatRowCustomProps {
  sortedChats: Chat[];
  activeChatId: string | null;
}

const ChatRow = React.memo(({ index, style, sortedChats, activeChatId }: RowComponentProps<ChatRowCustomProps>) => {
  const chat = sortedChats[index];
  if (!chat) return <div style={style} />;
  return (
    <div style={style}>
      <ChatListItem chat={chat} isActive={activeChatId === chat.id} />
    </div>
  );
});

export const Sidebar: React.FC = () => {
  const {
    chats,
    messages,
    activeChatId,
    setActiveChatId,
    activeFolderId,
    folders,
    searchQuery,
    setSearchQuery,
    searchFilter,
    setSearchFilter,
    isSearchActive,
    setIsSearchActive,
    settings,
    setIsDrawerOpen,
    setActiveModal,
    syncCloudData,
    refreshDialogs,
    isSyncing,
    showToast,
    searchTelegramGlobal,
  } = useTelegram();

  const isArabic = settings.language === 'ar';
  const isSearchMode = isSearchActive || !!searchQuery.trim() || searchFilter !== 'all';
  const isSearching = !!searchQuery.trim();
  const q = searchQuery.toLowerCase().trim();

  const [cloudSearchResults, setCloudSearchResults] = useState<any[]>([]);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) {
      setCloudSearchResults([]);
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearchingCloud(true);
      try {
        const results = await searchTelegramGlobal(q);
        if (isMounted) {
          setCloudSearchResults(results);
        }
      } catch (err) {
        console.error('Cloud search error:', err);
      } finally {
        if (isMounted) {
          setIsSearchingCloud(false);
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [q, searchTelegramGlobal]);

  // Edge Swipe to open drawer (DrKLO gesture)
  useEdgeSwipeDrawer(() => {
    setIsDrawerOpen(true);
  }, isArabic);

  // Pull to refresh cloud sync
  const { pullProgress, isRefreshing, pullHandlers } = usePullToRefresh(async () => {
    try {
      await refreshDialogs();
      showToast(isArabic ? 'تم تحديث المحادثات' : 'Conversations refreshed', '🔄');
    } catch {
      showToast(isArabic ? 'فشل تحديث المحادثات' : 'Refresh failed', '⚠️');
    }
  });

  // Collect all conversations with an unsent draft (memoized)
  const allChatsWithDrafts = useMemo(() => {
    return chats.filter((chat) => {
      const d = chat.draft || draftSyncService.getDraftText(chat.id);
      return Boolean(d && d.trim().length > 0);
    });
  }, [chats]);

  // Filter drafts matching current search query (memoized)
  const matchingDraftChats = useMemo(() => {
    return allChatsWithDrafts.filter((chat) => {
      if (!q) return true;
      const d = chat.draft || draftSyncService.getDraftText(chat.id);
      return (
        chat.title.toLowerCase().includes(q) ||
        chat.username?.toLowerCase().includes(q) ||
        (d && d.toLowerCase().includes(q))
      );
    });
  }, [allChatsWithDrafts, q]);

  // Grouped search categories for search overlay (memoized)
  const matchingChats = useMemo(() => {
    if (!isSearching) return [];
    return chats.filter((chat) => {
      const d = chat.draft || draftSyncService.getDraftText(chat.id);
      return (
        chat.title.toLowerCase().includes(q) ||
        chat.username?.toLowerCase().includes(q) ||
        chat.lastMessage?.text?.toLowerCase().includes(q) ||
        (d && d.toLowerCase().includes(q))
      );
    });
  }, [chats, isSearching, q]);

  const matchingBots = useMemo(() => matchingChats.filter((c) => c.type === 'bot'), [matchingChats]);
  const matchingChannelsAndGroups = useMemo(
    () => matchingChats.filter((c) => c.type === 'channel' || c.type === 'group'),
    [matchingChats]
  );
  const matchingChannels = useMemo(() => matchingChats.filter((c) => c.type === 'channel'), [matchingChats]);
  const matchingGroups = useMemo(() => matchingChats.filter((c) => c.type === 'group'), [matchingChats]);
  const matchingPrivateChats = useMemo(
    () => matchingChats.filter((c) => c.type === 'private' || c.type === 'saved' || c.isSecret),
    [matchingChats]
  );

  // Search inside all messages (memoized with cap to keep UI ultra-responsive)
  const matchingMessagesList = useMemo(() => {
    if (!isSearching) return [];
    const results: {
      chatId: string;
      chatTitle: string;
      chatAvatar: string;
      msgId: string;
      text: string;
      date: string;
    }[] = [];

    const chatMap = new Map(chats.map((c) => [c.id, c]));
    for (const [cId, msgList] of Object.entries(messages)) {
      const parentChat = chatMap.get(cId);
      const list = Array.isArray(msgList) ? msgList : [];
      for (const m of list) {
        if (m.text && m.text.toLowerCase().includes(q)) {
          results.push({
            chatId: cId,
            chatTitle: parentChat?.title || m.senderName || 'Chat',
            chatAvatar: parentChat?.avatar || m.senderAvatar || '',
            msgId: m.id,
            text: m.text,
            date: m.timestamp,
          });
          if (results.length >= 25) break;
        }
      }
      if (results.length >= 25) break;
    }
    return results;
  }, [isSearching, chats, messages, q]);

  // Exact DrKLO MessagesController & DialogsAdapter sorting algorithm (memoized)
  const sortedChats = useMemo(() => {
    return messagesController.sortDialogs(
      chats,
      isSearching ? 'all' : activeFolderId,
      searchQuery
    );
  }, [chats, isSearching, activeFolderId, searchQuery]);

  const isThreeLines = settings.chatListViewMode === 'three_lines';
  const chatRowHeight = isThreeLines ? 88 : 72;

  return (
    <div
      id="tg-sidebar"
      className={`relative w-full md:w-80 lg:w-96 flex flex-col h-full border-r select-none shrink-0 ${
        activeChatId ? 'hidden md:flex' : 'flex'
      }`}
      style={{
        backgroundColor: 'var(--tg-theme-sidebar)',
        borderColor: 'var(--tg-theme-border)',
      }}
    >
      {/* Header & Search */}
      <ChatListHeader />

      {/* Cloud Sync Activity Indicator Bar */}
      {isSyncing && (
        <div className="flex items-center justify-center gap-2 py-1 px-3 bg-sky-500/15 border-b border-sky-500/20 text-sky-400 text-xs font-semibold animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{isArabic ? 'جاري المزامنة مع سحابة تيليجرام...' : 'Updating Telegram cloud...'}</span>
        </div>
      )}

      {/* Stories Bar (2026 Telegram Stories Engine) */}
      {!isSearchMode && <StoriesBar />}

      {/* Folders Tab Bar - Only when not in search mode */}
      {!isSearchMode && <FolderBar />}

      {/* Pull-to-refresh Visual Indicator (Telegram Android Spinner) */}
      {(pullProgress > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center py-2 bg-black/20 border-b border-white/5 transition-all overflow-hidden"
          style={{ height: `${Math.max(pullProgress * 44, isRefreshing ? 40 : 0)}px` }}
        >
          <div className="w-8 h-8 rounded-full bg-[#2481cc] text-white flex items-center justify-center shadow-lg">
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${pullProgress * 360}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Chat List Scrollable Feed */}
      <div
        id="conversation-list-container"
        data-conversation-list="true"
        {...pullHandlers}
        className={`flex-1 divide-y divide-white/5 py-1 ${
          !isSearchMode && sortedChats.length > 25 ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}
      >
        {isSearchMode ? (
          <div className="space-y-3 p-1">
            {/* 1. Dedicated DRAFTS Filter Tab */}
            {searchFilter === 'drafts' && (
              <div>
                <div className="flex items-center justify-between px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl mx-1 mb-2 text-rose-300">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold">
                      {isArabic ? 'المسودات غير المرسلة' : 'Unsent Message Drafts'}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                      {matchingDraftChats.length}
                    </span>
                  </div>
                  {q && (
                    <span className="text-[10px] text-gray-400">
                      {isArabic ? `بحث: "${q}"` : `Filter: "${q}"`}
                    </span>
                  )}
                </div>

                {matchingDraftChats.length > 0 ? (
                  matchingDraftChats.map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-200">
                        {isArabic ? 'لا توجد مسودات غير مرسلة' : 'No unsent drafts'}
                      </p>
                      <p className="text-gray-400 max-w-xs text-[11px] leading-relaxed">
                        {q
                          ? (isArabic ? 'لا توجد مسودات مطابقة لكلمة البحث الحالية.' : 'No drafts match your search query.')
                          : (isArabic
                              ? 'أي رسالة تبدأ بكتابتها في أي محادثة دون إرسالها ستُحفظ تلقائياً وتظهر هنا لتستأنف الكتابة لاحقاً.'
                              : 'Any message you start typing in a chat without sending will automatically appear here.')}
                      </p>
                    </div>
                    {q ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-xs transition-colors cursor-pointer"
                      >
                        {isArabic ? 'مسح كلمة البحث' : 'Clear search query'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSearchFilter('all')}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs transition-colors cursor-pointer"
                      >
                        {isArabic ? 'عرض كل المحادثات' : 'Show all chats'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. CHANNELS Only Filter */}
            {searchFilter === 'channels' && (
              <div>
                {matchingChannels.length > 0 ? (
                  matchingChannels.map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">
                    {isArabic ? 'لا توجد قنوات مطابقة' : 'No channels found'}
                  </div>
                )}
              </div>
            )}

            {/* 3. GROUPS Only Filter */}
            {searchFilter === 'groups' && (
              <div>
                {matchingGroups.length > 0 ? (
                  matchingGroups.map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">
                    {isArabic ? 'لا توجد مجموعات مطابقة' : 'No groups found'}
                  </div>
                )}
              </div>
            )}

            {/* 4. BOTS Only Filter */}
            {searchFilter === 'bots' && (
              <div>
                {matchingBots.length > 0 ? (
                  matchingBots.map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">
                    {isArabic ? 'لا توجد بوتات مطابقة' : 'No bots found'}
                  </div>
                )}
              </div>
            )}

            {/* 5. DIRECT/PRIVATE Only Filter */}
            {searchFilter === 'private' && (
              <div>
                {matchingPrivateChats.length > 0 ? (
                  matchingPrivateChats.map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">
                    {isArabic ? 'لا توجد محادثات خاصة مطابقة' : 'No direct chats found'}
                  </div>
                )}
              </div>
            )}

            {/* 6. ALL Filter (Categorized view with Drafts at the top) */}
            {searchFilter === 'all' && (
              <>
                {/* Drafts Category in All View */}
                {matchingDraftChats.length > 0 && (
                  <div className="border-b border-rose-500/20 pb-2 mb-2">
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 rounded-lg mx-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          {isArabic ? 'المسودات غير المرسلة' : 'Unsent Drafts'} ({matchingDraftChats.length})
                        </span>
                      </div>
                      <button
                        onClick={() => setSearchFilter('drafts')}
                        className="text-[10px] text-rose-300 hover:text-rose-200 lowercase font-medium hover:underline cursor-pointer"
                      >
                        {isArabic ? 'تصفية فقط' : 'Filter only'}
                      </button>
                    </div>
                    {matchingDraftChats.map((chat) => (
                      <ChatListItem key={`draft-${chat.id}`} chat={chat} isActive={activeChatId === chat.id} />
                    ))}
                  </div>
                )}

                {/* Bots Category */}
                {matchingBots.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                      <Bot className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'البوتات (Bots)' : 'Bots'}</span>
                    </div>
                    {matchingBots.map((chat) => (
                      <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                    ))}
                  </div>
                )}

                {/* Channels & Groups Category */}
                {matchingChannelsAndGroups.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'القنوات والمجموعات' : 'Channels & Groups'}</span>
                    </div>
                    {matchingChannelsAndGroups.map((chat) => (
                      <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                    ))}
                  </div>
                )}

                {/* Private & Saved Messages */}
                {matchingPrivateChats.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'المحادثات المباشرة' : 'Chats & Contacts'}</span>
                    </div>
                    {matchingPrivateChats.map((chat) => (
                      <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
                    ))}
                  </div>
                )}

                {/* Matching Messages */}
                {matchingMessagesList.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'الرسائل المطابقة' : 'Matching Messages'} ({matchingMessagesList.length})</span>
                    </div>
                    <div className="space-y-1 px-1">
                      {matchingMessagesList.slice(0, 8).map((m) => (
                        <button
                          key={m.msgId}
                          onClick={() => {
                            setActiveChatId(m.chatId);
                          }}
                          className="w-full p-2 rounded-xl hover:bg-white/5 text-left rtl:text-right flex items-start gap-2.5 transition-colors"
                        >
                          {m.chatAvatar ? (
                            <img
                              src={m.chatAvatar}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#2481cc] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {m.chatTitle.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-sky-400 truncate">{m.chatTitle}</span>
                              <span className="text-[10px] text-gray-500">{m.date}</span>
                            </div>
                            <p className="text-xs text-gray-300 truncate mt-0.5">{m.text}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real MTProto Telegram Global Cloud Search Results */}
                {isSearching && (
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'بحث عالمي سحابي (Telegram Cloud)' : 'Global Cloud Search'}</span>
                      </div>
                      {isSearchingCloud && (
                        <span className="text-[10px] text-gray-400 animate-pulse">
                          {isArabic ? 'جاري البحث...' : 'Searching...'}
                        </span>
                      )}
                    </div>
                    {cloudSearchResults.length > 0 ? (
                      <div className="space-y-1 px-1 mt-1">
                        {cloudSearchResults.map((m) => (
                          <button
                            key={`cloud-${m.id}`}
                            onClick={() => {
                              setActiveChatId(m.chatId);
                            }}
                            className="w-full p-2 rounded-xl hover:bg-sky-500/10 text-left rtl:text-right flex items-start gap-2.5 transition-colors border border-transparent hover:border-sky-500/20"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#2481cc] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {m.chatTitle.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-sky-300 truncate">{m.chatTitle}</span>
                                <span className="text-[10px] text-gray-500">{m.timestamp || m.date}</span>
                              </div>
                              <p className="text-xs text-gray-300 truncate mt-0.5">{m.text}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      !isSearchingCloud && (
                        <div className="px-3 py-2 text-[11px] text-gray-500 italic">
                          {isArabic ? 'لا توجد رسائل سحابية إضافية' : 'No global cloud messages found'}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Empty State */}
                {matchingDraftChats.length === 0 &&
                  matchingChats.length === 0 &&
                  matchingMessagesList.length === 0 &&
                  cloudSearchResults.length === 0 &&
                  !isSearchingCloud && (
                    <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                      <Globe className="w-8 h-8 text-gray-500 opacity-50" />
                      <span>{isArabic ? 'لم يتم العثور على أي نتائج مطابقة في سحابة تيليجرام' : 'No matching results found in Telegram cloud'}</span>
                    </div>
                  )}
              </>
            )}
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            {isArabic ? 'لم يتم العثور على محادثات' : 'No chats found'}
          </div>
        ) : sortedChats.length > 25 ? (
          <FixedSizeList
            id="conversation-list-virtual"
            className="flex-1 w-full h-full overflow-y-auto divide-y divide-white/5"
            rowCount={sortedChats.length}
            rowHeight={chatRowHeight}
            rowComponent={ChatRow as any}
            rowProps={{ sortedChats, activeChatId }}
            overscanCount={6}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          sortedChats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} />
          ))
        )}
      </div>

      {/* Floating Action Button (FAB) - Classic Telegram Android Pencil / New Chat */}
      <button
        id="tg-fab-new-chat"
        onClick={() => setActiveModal('new-chat')}
        className="absolute bottom-5 right-5 rtl:right-auto rtl:left-5 w-14 h-14 rounded-full bg-[#2481cc] hover:bg-[#1f70b3] active:scale-90 text-white flex items-center justify-center shadow-2xl shadow-sky-950/80 transition-all duration-200 z-30 group cursor-pointer"
        title={isArabic ? 'محادثة جديدة' : 'New Message'}
        style={{
          boxShadow: '0 8px 24px rgba(36, 129, 204, 0.45), 0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <Edit3 className="w-6 h-6 group-hover:rotate-12 transition-transform duration-200" />
      </button>
    </div>
  );
};
