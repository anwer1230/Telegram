import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Zap,
  Phone,
  UserCheck,
} from 'lucide-react';
import { usePullToRefresh, useEdgeSwipeDrawer } from '../../hooks/useTouchGestures';
import { messagesController } from '../../core/MessagesController';
import { draftSyncService } from '../../services/DraftSyncService';
import { messageCache } from '../../services/IndexedDBMessageCache';
import { Message, Chat, User } from '../../types';
import { List, type RowComponentProps } from 'react-window';
import {
  sqliteSearchIndex,
  type SQLiteMessageHit,
} from '../../services/SQLiteSearchIndex';
import { contactsController } from '../../core/messenger/ContactsController';
import { telegramDB } from '../../utils/sqliteStorage';

interface ChatRowCustomProps {
  sortedChats: Chat[];
  activeChatId: string | null;
}

const ChatRow = React.memo(({
  index,
  style,
  sortedChats,
  activeChatId,
}: RowComponentProps<ChatRowCustomProps>) => {
  const chat = sortedChats[index];
  if (!chat) return <div style={style} />;

  return (
    <div style={style} className="w-full">
      <ChatListItem chat={chat} isActive={activeChatId === chat.id} />
    </div>
  );
});

const renderHighlightedText = (text: string, query: string) => {
  if (!query || !query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <span key={i} className="text-amber-300 font-bold bg-amber-500/25 px-0.5 rounded">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

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
    openPrivateChat,
  } = useTelegram();

  const isArabic = settings.language === 'ar';
  const isSearchMode = isSearchActive || !!searchQuery.trim() || searchFilter !== 'all';
  const isSearching = !!searchQuery.trim();
  const q = searchQuery.toLowerCase().trim();

  const [sqliteMsgHits, setSqliteMsgHits] = useState<SQLiteMessageHit[]>([]);
  const [sqliteContactHits, setSqliteContactHits] = useState<User[]>([]);
  const [sqliteSearchLatency, setSqliteSearchLatency] = useState<number>(0);
  const [sqliteEngineName, setSqliteEngineName] = useState<string>('SQLite WASM (Worker FTS4)');

  const [cloudSearchResults, setCloudSearchResults] = useState<any[]>([]);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);
  const [offlineIndexedMessages, setOfflineIndexedMessages] = useState<Message[]>([]);

  // Prime and synchronize SQLite WASM database with chats, messages & contacts
  useEffect(() => {
    let isCancelled = false;
    const primeIndex = async () => {
      try {
        const contactMap = new Map<string, User>();
        // 1. Gather from ContactsController
        const ccList = contactsController.getContacts();
        ccList.forEach((c) => {
          if (c && c.name) contactMap.set(c.id || c.name, c);
        });

        // 2. Gather from localStorage saved contacts
        try {
          const saved = localStorage.getItem('tg_saved_contacts_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.forEach((c: any) => {
                if (c && c.name) {
                  contactMap.set(c.id || c.name, {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    username: c.username,
                    avatar: c.avatar || '',
                    isOnline: Boolean(c.isOnline),
                    bio: c.bio || '',
                  });
                }
              });
            }
          }
        } catch (_) {}

        // 3. Gather from telegramDB
        try {
          const dbContacts = telegramDB.getContacts();
          dbContacts.forEach((c) => {
            if (c && c.name) contactMap.set(c.id || c.name, c);
          });
        } catch (_) {}

        // 4. Gather from direct private chats
        chats.forEach((chat) => {
          if (chat.type === 'private' && !chat.isSecret) {
            const id = chat.id.replace('chat_', '');
            if (!contactMap.has(id) && !contactMap.has(chat.title)) {
              contactMap.set(id, {
                id: chat.id,
                name: chat.title,
                username: chat.username,
                phone: (chat as any).phone,
                avatar: chat.avatar || '',
                isOnline: Boolean(chat.isOnline),
                bio: chat.description || '',
              });
            }
          }
        });

        if (!isCancelled) {
          await sqliteSearchIndex.syncFromStore(chats, messages, Array.from(contactMap.values()));
          const stats = sqliteSearchIndex.getStats();
          const label = stats.isWorker
            ? (stats.isWasmEngine ? 'SQLite Worker (FTS4)' : 'SQLite Worker (Indexed)')
            : (stats.isWasmEngine ? 'SQLite WASM (FTS4)' : 'SQLite WASM');
          setSqliteEngineName(label);
        }
      } catch (err) {
        console.warn('[Sidebar] Prime SQLite index error:', err);
      }
    };
    primeIndex();
    return () => {
      isCancelled = true;
    };
  }, [chats, messages]);

  // Instant SQLite WASM search for messages and contacts
  useEffect(() => {
    if (!q || q.length < 1) {
      setSqliteMsgHits([]);
      setSqliteContactHits([]);
      setSqliteSearchLatency(0);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const [contactRes, msgRes] = await Promise.all([
          sqliteSearchIndex.searchContacts(q, { limit: 30 }),
          sqliteSearchIndex.searchMessages(q, { limit: 40 }),
        ]);

        if (isMounted) {
          setSqliteContactHits(contactRes.users);
          setSqliteMsgHits(msgRes.hits);
          setSqliteSearchLatency(Math.max(contactRes.latencyMs, msgRes.latencyMs));
          setSqliteEngineName(msgRes.engine);
        }
      } catch (err) {
        console.warn('[Sidebar] SQLite search error:', err);
      }
    }, 40);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    if (!q || q.length < 2) {
      setOfflineIndexedMessages([]);
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const results = await messageCache.searchMessagesOffline(q, { limit: 40 });
        if (isMounted) {
          setOfflineIndexedMessages(results);
        }
      } catch (err) {
        console.warn('[Sidebar] IndexedDB message search error:', err);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [q]);

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

  // Collect all conversations with an unsent draft
  const allChatsWithDrafts = chats.filter((chat) => {
    const d = chat.draft || draftSyncService.getDraftText(chat.id);
    return Boolean(d && d.trim().length > 0);
  });

  // Filter drafts matching current search query (title, handle, or draft text)
  const matchingDraftChats = allChatsWithDrafts.filter((chat) => {
    if (!q) return true;
    const d = chat.draft || draftSyncService.getDraftText(chat.id);
    return (
      chat.title.toLowerCase().includes(q) ||
      chat.username?.toLowerCase().includes(q) ||
      (d && d.toLowerCase().includes(q))
    );
  });

  // Grouped search categories for search overlay
  const matchingChats = chats.filter((chat) => {
    if (!isSearching) return true;
    const d = chat.draft || draftSyncService.getDraftText(chat.id);
    return (
      chat.title.toLowerCase().includes(q) ||
      chat.username?.toLowerCase().includes(q) ||
      chat.lastMessage?.text?.toLowerCase().includes(q) ||
      (d && d.toLowerCase().includes(q))
    );
  });
  const matchingBots = matchingChats.filter((c) => c.type === 'bot');
  const matchingChannelsAndGroups = matchingChats.filter(
    (c) => c.type === 'channel' || c.type === 'group'
  );
  const matchingChannels = matchingChats.filter((c) => c.type === 'channel');
  const matchingGroups = matchingChats.filter((c) => c.type === 'group');
  const matchingPrivateChats = matchingChats.filter(
    (c) => c.type === 'private' || c.type === 'saved' || c.isSecret
  );

  // Search inside all messages (combining in-memory state + IndexedDB MultiEntry token index)
  const matchingMessagesList: {
    chatId: string;
    chatTitle: string;
    chatAvatar: string;
    msgId: string;
    text: string;
    date: string;
  }[] = [];

  if (isSearching) {
    const seenMsgIds = new Set<string>();

    // 1. In-memory messages for active conversations
    Object.entries(messages).forEach(([cId, msgList]) => {
      const parentChat = chats.find((c) => c.id === cId);
      const list = Array.isArray(msgList) ? msgList : [];
      list.forEach((m) => {
        if (m.text && m.text.toLowerCase().includes(q)) {
          seenMsgIds.add(String(m.id));
          matchingMessagesList.push({
            chatId: cId,
            chatTitle: parentChat?.title || m.senderName || 'Chat',
            chatAvatar: parentChat?.avatar || m.senderAvatar || '',
            msgId: m.id,
            text: m.text,
            date: m.timestamp,
          });
        }
      });
    });

    // 2. High-speed IndexedDB token-indexed offline messages across entire history
    for (const m of offlineIndexedMessages) {
      if (!seenMsgIds.has(String(m.id))) {
        seenMsgIds.add(String(m.id));
        const parentChat = chats.find((c) => c.id === m.chatId);
        matchingMessagesList.push({
          chatId: m.chatId,
          chatTitle: parentChat?.title || m.senderName || 'Chat',
          chatAvatar: parentChat?.avatar || m.senderAvatar || '',
          msgId: m.id,
          text: m.text,
          date: m.timestamp,
        });
      }
    }
  }

  // Exact DrKLO MessagesController & DialogsAdapter sorting algorithm
  const sortedChats = messagesController.sortDialogs(
    chats,
    isSearching ? 'all' : activeFolderId,
    searchQuery
  );

  const chatRowProps = useMemo<ChatRowCustomProps>(() => ({
    sortedChats,
    activeChatId,
  }), [sortedChats, activeChatId]);

  const getChatRowKey = useCallback((index: number, data: ChatRowCustomProps) => {
    return data.sortedChats[index]?.id || index;
  }, []);

  const [renderLimit, setRenderLimit] = useState(40);

  useEffect(() => {
    setRenderLimit(40);
  }, [activeFolderId, searchQuery]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 350) {
      if (renderLimit < sortedChats.length) {
        setRenderLimit((prev) => Math.min(prev + 40, sortedChats.length));
      }
    }
  };

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

      {/* Chat List Feed (Virtualized via react-window for peak responsiveness) */}
      <div
        id="conversation-list-container"
        data-conversation-list="true"
        onScroll={isSearchMode ? handleScroll : undefined}
        {...pullHandlers}
        className={`flex-1 min-h-0 ${isSearchMode ? 'overflow-y-auto divide-y divide-white/5 py-1' : 'overflow-hidden'}`}
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

            {/* 5.5 CONTACTS Only Filter (from SQLite WASM FTS4) */}
            {searchFilter === 'contacts' && (
              <div className="space-y-1 p-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isArabic ? 'جهات الاتصال المفهرسة' : 'Indexed Contacts'} ({sqliteContactHits.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sqliteSearchLatency > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        ⚡ {sqliteSearchLatency}ms
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-gray-400">
                      {sqliteEngineName}
                    </span>
                  </div>
                </div>

                {sqliteContactHits.length > 0 ? (
                  <div className="space-y-1">
                    {sqliteContactHits.map((contact) => (
                      <button
                        key={`contact-tab-${contact.id}`}
                        onClick={() => {
                          openPrivateChat(contact.id, contact.name, contact.avatar, contact.username);
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left rtl:text-right flex items-center justify-between gap-3 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {contact.avatar ? (
                              <img
                                src={contact.avatar}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shadow-inner">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {contact.isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#17212b] rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                              {renderHighlightedText(contact.name, q)}
                            </div>
                            <div className="text-xs text-gray-400 truncate flex items-center gap-2">
                              {contact.username && (
                                <span className="text-sky-400 font-mono">
                                  @{contact.username}
                                </span>
                              )}
                              {contact.phone && <span>{contact.phone}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-sky-500/20 text-sky-300 flex items-center gap-1.5 group-hover:bg-sky-500 group-hover:text-white transition-all">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isArabic ? 'محادثة' : 'Chat'}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-gray-500 opacity-50" />
                    <span>{isArabic ? 'لم يتم العثور على جهات اتصال مطابقة' : 'No matching contacts found'}</span>
                  </div>
                )}
              </div>
            )}

            {/* 6. ALL Filter (Categorized view with Drafts at the top) */}
            {searchFilter === 'all' && (
              <>
                {/* SQLite WASM High-Performance Search Performance Badge */}
                {isSearching && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-sky-950/40 via-purple-950/30 to-black/20 border-b border-white/5 text-[10px] text-gray-300 mx-1 mb-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="font-semibold text-white">
                        {isArabic ? 'محرك البحث الفوري' : 'Instant Search'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold text-[9px]">
                        {sqliteEngineName}
                      </span>
                    </div>
                    {sqliteSearchLatency > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        ⚡ {sqliteSearchLatency}ms
                      </span>
                    )}
                  </div>
                )}

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

                {/* SQLite WASM Contacts & People */}
                {sqliteContactHits.length > 0 && (
                  <div className="border-b border-sky-500/20 pb-2 mb-2">
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-sky-400 uppercase tracking-wider bg-sky-500/10 rounded-lg mx-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>
                          {isArabic ? 'جهات الاتصال والأشخاص' : 'Contacts & People'} ({sqliteContactHits.length})
                        </span>
                      </div>
                      <button
                        onClick={() => setSearchFilter('contacts')}
                        className="text-[10px] text-sky-300 hover:text-sky-200 lowercase font-medium hover:underline cursor-pointer"
                      >
                        {isArabic ? 'عرض الكل' : 'View all'}
                      </button>
                    </div>
                    <div className="space-y-0.5 px-1">
                      {sqliteContactHits.slice(0, 5).map((contact) => (
                        <button
                          key={`sqlite-contact-${contact.id}`}
                          onClick={() => {
                            openPrivateChat(contact.id, contact.name, contact.avatar, contact.username);
                          }}
                          className="w-full p-2 rounded-xl hover:bg-white/5 text-left rtl:text-right flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              {contact.avatar ? (
                                <img
                                  src={contact.avatar}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center">
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {contact.isOnline && (
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-[#17212b] rounded-full" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white group-hover:text-sky-300 truncate">
                                {renderHighlightedText(contact.name, q)}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {contact.username ? `@${contact.username}` : (contact.phone || (isArabic ? 'جهة اتصال' : 'Contact'))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                            <MessageSquare className="w-3 h-3" />
                            <span>{isArabic ? 'محادثة' : 'Chat'}</span>
                          </span>
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
                  sqliteContactHits.length === 0 &&
                  sqliteMsgHits.length === 0 &&
                  matchingMessagesList.length === 0 &&
                  cloudSearchResults.length === 0 &&
                  !isSearchingCloud && (
                    <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                      <Globe className="w-8 h-8 text-gray-500 opacity-50" />
                      <span>{isArabic ? 'لم يتم العثور على أي نتائج مطابقة' : 'No matching results found'}</span>
                    </div>
                  )}
              </>
            )}
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            {isArabic ? 'لم يتم العثور على محادثات' : 'No chats found'}
          </div>
        ) : (
          <List
            id="tg-sidebar-virtual-list"
            className="w-full h-full overflow-y-auto overscroll-contain"
            rowCount={sortedChats.length}
            rowHeight={settings.chatListViewMode === 'three_lines' ? 84 : 72}
            rowComponent={ChatRow as any}
            rowProps={chatRowProps}
            rowKey={getChatRowKey}
            overscanCount={6}
          />
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
