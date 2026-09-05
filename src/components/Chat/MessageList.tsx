import { chatStore } from '../../store/chatStore';
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, Pin, X, Loader2, Shield, Lock, ChevronUp } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { MessageBubble } from './MessageBubble';
import { messagesController } from '../../core/MessagesController';

const PAGE_CHUNK_SIZE = 40;

interface ChatScrollState {
  scrollTop: number;
  scrollHeight: number;
  isNearBottom: boolean;
  anchorMessageId?: string;
  anchorOffsetTop?: number;
  visibleCount: number;
  unreadDividerMaxId?: string;
}

// Persistent scroll state across all chats (replicates DrKLO/Telegram Android RecyclerListView scroll manager)
const chatScrollRegistry = new Map<string, ChatScrollState>();

export const MessageList: React.FC = () => {
  const {
    activeChatId,
    activeChat,
    messages,
    pinMessage,
    settings,
    loadMoreChatMessages,
    isChatLoadingOlder,
    chatHasMoreOlder,
    markChatAsRead,
  } = useTelegram();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_CHUNK_SIZE);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [unreadStreamCount, setUnreadStreamCount] = useState<number>(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [readInboxMaxId, setReadInboxMaxId] = useState<string | undefined>(undefined);

  // Scroll anchor preservation state for upward pagination
  const scrollAnchorRef = useRef<{
    previousScrollHeight: number;
    previousScrollTop: number;
    shouldRestore: boolean;
  }>({
    previousScrollHeight: 0,
    previousScrollTop: 0,
    shouldRestore: false,
  });

  const prevMessagesLengthRef = useRef<number>(0);
  const isUserNearBottomRef = useRef<boolean>(true);
  const activeChatIdRef = useRef<string | null>(activeChatId);
  const isInitialScrollDoneRef = useRef<boolean>(false);

  const currentMessages = (activeChatId && messages[activeChatId]) || [];
  const pinnedMessages = currentMessages.filter((m) => m.isPinned);
  const isArabic = settings.language === 'ar';
  const isLoadingOlder = activeChatId ? Boolean(isChatLoadingOlder[activeChatId]) : false;
  const hasMoreOnServer = activeChatId ? (chatHasMoreOlder[activeChatId] ?? true) : true;

  // Save current scroll position helper
  const saveCurrentScrollState = useCallback((chatId: string | null) => {
    if (!chatId || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < 80;

    let anchorId: string | undefined = undefined;
    let anchorOffset = 0;

    const messageEls = container.querySelectorAll('[data-msg-id]');
    const containerRect = container.getBoundingClientRect();

    for (let i = 0; i < messageEls.length; i++) {
      const el = messageEls[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (rect.bottom > containerRect.top + 10) {
        anchorId = el.getAttribute('data-msg-id') || undefined;
        anchorOffset = rect.top - containerRect.top;
        break;
      }
    }

    chatScrollRegistry.set(chatId, {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      isNearBottom,
      anchorMessageId: anchorId,
      anchorOffsetTop: anchorOffset,
      visibleCount,
      unreadDividerMaxId: readInboxMaxId,
    });
  }, [visibleCount, readInboxMaxId]);  // Handle Chat Switching & Initialization
  // Rule 1: Default on opening chat is ALWAYS scroll completely to the bottom (scrollToBottom)
  // Rule 2: Disable restoring old scroll position across sessions; only restore if returning to same chat in current session
  useEffect(() => {
    const prevChatId = activeChatIdRef.current;
    if (prevChatId && prevChatId !== activeChatId && scrollContainerRef.current) {
      saveCurrentScrollState(prevChatId);
      const container = scrollContainerRef.current;
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      chatStore.saveSessionScrollPosition(prevChatId, container.scrollTop, container.scrollHeight, distance <= 120);
    }
    activeChatIdRef.current = activeChatId;

    if (!activeChatId) return;

    isInitialScrollDoneRef.current = false;
    setShowScrollBottom(false);
    setUnreadStreamCount(0);
    setReadInboxMaxId(undefined);
    prevMessagesLengthRef.current = currentMessages.length;

    // Check if user previously visited this chat in the CURRENT active session
    const sessionState = chatStore.getSessionScrollPosition(activeChatId);

    if (sessionState && !sessionState.isNearBottom && sessionState.scrollTop > 0) {
      // User was intentionally reading higher up during this active session
      setVisibleCount(Math.max(PAGE_CHUNK_SIZE, Math.min(currentMessages.length, 80)));
    } else {
      // Default: ensure chunk covers newest messages
      setVisibleCount(Math.max(PAGE_CHUNK_SIZE, Math.min(currentMessages.length, 60)));
    }

    const performInitialScroll = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;

      // Only restore scroll if returning to the same chat in current session where user was scrolled up
      if (sessionState && !sessionState.isNearBottom && sessionState.scrollTop > 0) {
        if (sessionState.scrollHeight > 0 && container.scrollHeight > 0) {
          const heightDiff = container.scrollHeight - sessionState.scrollHeight;
          container.scrollTop = Math.max(0, sessionState.scrollTop + heightDiff);
        } else {
          container.scrollTop = sessionState.scrollTop;
        }
        isUserNearBottomRef.current = false;
        setShowScrollBottom(true);
      } else {
        // DEFAULT REQUIREMENT: ALWAYS scroll completely to bottom on opening chat!
        container.scrollTop = container.scrollHeight;
        isUserNearBottomRef.current = true;
        setShowScrollBottom(false);
      }
      isInitialScrollDoneRef.current = true;
    };

    // Mark as visited in current session
    chatStore.markChatVisitedInCurrentSession(activeChatId);

    // Multi-pass execution to guarantee bottom scroll after DOM, fonts, and images render
    requestAnimationFrame(performInitialScroll);
    const t1 = setTimeout(performInitialScroll, 30);
    const t2 = setTimeout(performInitialScroll, 120);

    // Auto mark chat history as read upon opening
    markChatAsRead(activeChatId);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      saveCurrentScrollState(activeChatId);
    };
  }, [activeChatId]);

  // Determine slice of messages to display
  const totalMessagesCount = currentMessages.length;
  const startIndex = Math.max(0, totalMessagesCount - visibleCount);
  const visibleMessages = currentMessages.slice(startIndex);
  const hasMoreLocally = startIndex > 0;
  const hasMore = hasMoreLocally || hasMoreOnServer;

  // Load more older messages (both from local memory and from MTProto API stream)
  const handleLoadOlder = useCallback(async () => {
    if (!activeChatId || isLoadingOlder) return;

    if (scrollContainerRef.current) {
      scrollAnchorRef.current = {
        previousScrollHeight: scrollContainerRef.current.scrollHeight,
        previousScrollTop: scrollContainerRef.current.scrollTop,
        shouldRestore: true,
      };
    }

    if (hasMoreLocally) {
      setVisibleCount((prev) => prev + PAGE_CHUNK_SIZE);
    } else if (hasMoreOnServer) {
      const result = await loadMoreChatMessages(activeChatId);
      if (result.loadedCount > 0) {
        setVisibleCount((prev) => prev + result.loadedCount);
      }
    }
  }, [activeChatId, isLoadingOlder, hasMoreLocally, hasMoreOnServer, loadMoreChatMessages]);

  // Restore scroll anchor smoothly without jumping when older messages are loaded
  useLayoutEffect(() => {
    if (scrollAnchorRef.current.shouldRestore && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const heightDifference = container.scrollHeight - scrollAnchorRef.current.previousScrollHeight;
      container.scrollTop = scrollAnchorRef.current.previousScrollTop + heightDifference;
      scrollAnchorRef.current.shouldRestore = false;
    }
  }, [visibleMessages.length]);  // Handle incoming stream updates & outgoing messages with smart auto-scroll
  useEffect(() => {
    const prevCount = prevMessagesLengthRef.current;
    const currentCount = currentMessages.length;
    prevMessagesLengthRef.current = currentCount;

    if (currentCount > prevCount && isInitialScrollDoneRef.current) {
      const addedCount = currentCount - prevCount;
      setVisibleCount((prev) => prev + addedCount);

      const latestMsg = currentMessages[currentMessages.length - 1];
      const isOutgoing = Boolean(latestMsg?.isOutgoing);

      // Smart scroll rule:
      // If user is near bottom (or message is outgoing by current user), scroll down immediately!
      // If user is reading older messages higher up, preserve their scroll position and update unread count.
      if (isUserNearBottomRef.current || isOutgoing) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            isUserNearBottomRef.current = true;
          }
        });
      } else {
        setUnreadStreamCount((prev) => prev + addedCount);
        setShowScrollBottom(true);
      }
    }
  }, [currentMessages.length]);

  // Top Sentinel IntersectionObserver for auto-loading older messages on scroll
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingOlder) {
          handleLoadOlder();
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
        rootMargin: '120px 0px 0px 0px',
      }
    );

    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [handleLoadOlder, hasMore, isLoadingOlder]);

  // Track scroll position to update bottom button & near-bottom state  // Track scroll position to update bottom button & near-bottom state
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceToBottom <= 120;
    isUserNearBottomRef.current = isNearBottom;

    setShowScrollBottom(!isNearBottom);

    if (isNearBottom && unreadStreamCount > 0) {
      setUnreadStreamCount(0);
    }

    if (activeChatId) {
      chatStore.saveSessionScrollPosition(activeChatId, scrollTop, scrollHeight, isNearBottom);
    }

    if (scrollTop < 80 && !isLoadingOlder && hasMore) {
      handleLoadOlder();
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      if (behavior === 'smooth') {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      if (activeChatId) {
        chatStore.saveSessionScrollPosition(
          activeChatId,
          scrollContainerRef.current.scrollHeight,
          scrollContainerRef.current.scrollHeight,
          true
        );
      }
    }
    setUnreadStreamCount(0);
    setShowScrollBottom(false);
    isUserNearBottomRef.current = true;
  };

  // Jump to specific message handler (e.g. from search, reply or keyword alert)
  useEffect(() => {
    const handleScrollToMessage = (e: any) => {
      const detail = e.detail;
      if (!detail || !detail.messageId) return;

      const targetMsgId = detail.messageId;
      const targetIndex = currentMessages.findIndex((m) => m.id === targetMsgId);
      if (targetIndex !== -1 && targetIndex < startIndex) {
        setVisibleCount(totalMessagesCount - targetIndex + 15);
      }

      setHighlightedMessageId(targetMsgId);

      setTimeout(() => {
        const el = document.getElementById(`msg-bubble-container-${targetMsgId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      setTimeout(() => {
        setHighlightedMessageId((prev) => (prev === targetMsgId ? null : prev));
      }, 2500);
    };

    window.addEventListener('tg-scroll-to-message', handleScrollToMessage);
    return () => window.removeEventListener('tg-scroll-to-message', handleScrollToMessage);
  }, [currentMessages, startIndex, totalMessagesCount]);

  // DrKLO MessagesAdapter precise grouping algorithm with unread divider support
  const groupedItems = messagesController.sortAndGroupMessages(visibleMessages, readInboxMaxId);

  return (
    <div id="tg-message-list-root" className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div
          id="tg-pinned-bar"
          className="z-10 px-4 py-2 flex items-center justify-between border-b backdrop-blur-md shadow-xs select-none shrink-0"
          style={{
            backgroundColor: 'var(--tg-theme-surface)',
            borderColor: 'var(--tg-theme-border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Pin className="w-4 h-4 text-[#2481cc] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#2481cc]">
                {isArabic ? 'رسالة مثبتة' : 'Pinned Message'}
              </div>
              <div className="text-xs truncate text-[var(--tg-theme-bubble-in-text)]">
                {pinnedMessages[pinnedMessages.length - 1].text ||
                  pinnedMessages[pinnedMessages.length - 1].senderName}
              </div>
            </div>
          </div>

          <button
            onClick={() => pinMessage(pinnedMessages[pinnedMessages.length - 1].id)}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
            title={isArabic ? 'إلغاء التثبيت' : 'Unpin'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Container */}
      <div
        id="tg-messages-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 space-y-2 tg-wallpaper-pattern overscroll-contain"
        style={{
          backgroundColor: 'var(--tg-theme-chat-bg)',
        }}
      >
        {/* Top Sentinel & Loader for Pagination */}
        <div ref={topSentinelRef} className="h-1 w-full" />

        {/* Top Pagination Status Indicator */}
        {isLoadingOlder && (
          <div className="flex justify-center py-2 select-none animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/50 text-sky-300 backdrop-blur-md border border-sky-500/20 shadow-md">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2481cc]" />
              <span>{isArabic ? 'جاري مزامنة الرسائل السابقة...' : 'Loading earlier messages...'}</span>
            </div>
          </div>
        )}

        {/* Manual Load Earlier Button fallback */}
        {!isLoadingOlder && hasMore && (
          <div className="flex justify-center py-1 select-none">
            <button
              onClick={handleLoadOlder}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تحميل المزيد من الرسائل السابقة' : 'Load earlier messages'}</span>
            </button>
          </div>
        )}

        {/* Chat Origin Encrypted Badge when at the very beginning of history */}
        {!hasMore && groupedItems.length > 0 && (
          <div className="flex flex-col items-center justify-center my-4 select-none animate-in fade-in">
            <div className="p-3.5 rounded-2xl max-w-xs text-center backdrop-blur-md bg-black/40 border border-white/10 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#2481cc]/20 text-[#2481cc] flex items-center justify-center mx-auto mb-1.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-gray-200 mb-0.5">
                {isArabic ? 'بداية سجل المحادثة' : 'Beginning of Chat History'}
              </div>
              <div className="text-[10px] text-gray-400">
                {isArabic
                  ? 'تم تشفير جميع الرسائل بنجاح عبر MTProto 2.0 (Layer 184).'
                  : 'All messages are end-to-end encrypted via MTProto 2.0.'}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {groupedItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6 select-none">
            <div
              className="p-6 rounded-3xl max-w-sm backdrop-blur-md border shadow-lg"
              style={{
                backgroundColor: 'var(--tg-theme-surface)',
                borderColor: 'var(--tg-theme-border)',
              }}
            >
              <div className="w-12 h-12 rounded-full bg-[#2481cc]/20 text-[#2481cc] flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <div className="font-bold text-base mb-1" style={{ color: 'var(--tg-theme-bubble-in-text)' }}>
                {activeChat?.title}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {isArabic
                  ? 'لا توجد رسائل سابقة في هذه المحادثة. ابدأ بالتراسل الآن مع مزامنة سحابية فورية!'
                  : 'No messages yet in this chat. Start messaging now with instant cloud synchronization!'}
              </p>
            </div>
          </div>
        ) : (
          groupedItems.map((item) => {
            if (item.type === 'date_divider') {
              return (
                <div key={item.id} className="flex justify-center my-3 select-none">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/40 text-gray-200 backdrop-blur-md shadow-xs">
                    {item.dateText}
                  </span>
                </div>
              );
            }

            if (item.type === 'unread_divider') {
              return (
                <div key={item.id} className="flex items-center gap-3 my-3 select-none">
                  <div className="flex-1 h-[1px] bg-[#2481cc]/40" />
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#2481cc]/20 text-[#2481cc] border border-[#2481cc]/30 shadow-xs">
                    {item.dateText}
                  </span>
                  <div className="flex-1 h-[1px] bg-[#2481cc]/40" />
                </div>
              );
            }

            if (item.message) {
              const msg = item.message;
              return (
                <div
                  key={item.id}
                  className={`transition-all duration-500 rounded-2xl ${
                    highlightedMessageId === msg.id
                      ? 'ring-2 ring-amber-400 bg-amber-500/20 p-1 shadow-lg shadow-amber-500/20 animate-pulse'
                      : ''
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    grouping={{
                      isGroupStart: item.isGroupStart,
                      isGroupMiddle: item.isGroupMiddle,
                      isGroupEnd: item.isGroupEnd,
                      isSingle: item.isSingle,
                    }}
                  />
                </div>
              );
            }

            return null;
          })
        )}

        <div ref={messagesEndRef} className="h-1 w-full" />
      </div>

      {/* Floating Scroll to Bottom Button with Unread Incoming Stream Badge */}
      {showScrollBottom && (
        <button
          id="tg-scroll-bottom-button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 z-20 h-11 px-3 min-w-[44px] rounded-full bg-[#2481cc] text-white shadow-xl flex items-center justify-center gap-1.5 hover:bg-[#1c6fad] active:scale-95 transition-all animate-in fade-in zoom-in-75 border border-white/20"
          title={isArabic ? 'الانتقال إلى أحدث الرسائل' : 'Scroll to bottom'}
        >
          <ArrowDown className="w-5 h-5" />
          {unreadStreamCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#2481cc] min-w-[18px] text-center shadow-xs">
              {unreadStreamCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
