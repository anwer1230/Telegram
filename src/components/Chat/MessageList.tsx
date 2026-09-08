import { chatStore } from '../../store/chatStore';
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useDeferredValue,
  startTransition,
  type ReactElement,
} from 'react';
import { ArrowDown, Pin, X, Loader2, Shield, Lock } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { MessageBubble } from './MessageBubble';
import { messagesController } from '../../core/MessagesController';
import {
  List as VariableSizeList,
  List as FixedSizeList,
  List,
  useDynamicRowHeight,
  type ListImperativeAPI,
  type RowComponentProps,
} from 'react-window';

// React-Window Virtualization: exports VariableSizeList and FixedSizeList adapters
export { VariableSizeList, FixedSizeList };

interface GroupedItem {
  type: 'message' | 'date_divider' | 'unread_divider' | 'origin_badge';
  id: string;
  message?: any;
  dateText?: string;
  isGroupStart?: boolean;
  isGroupMiddle?: boolean;
  isGroupEnd?: boolean;
  isSingle?: boolean;
}

interface MessageRowCustomProps {
  items: GroupedItem[];
  highlightedMessageId: string | null;
}

const MessageRow = React.memo(({
  index,
  style,
  items,
  highlightedMessageId,
}: RowComponentProps<MessageRowCustomProps>) => {
  const item = items[index];
  if (!item) return <div style={style} />;

    if (item.type === 'origin_badge') {
      return (
        <div style={style} className="px-3 sm:px-6 py-2 select-none">
          <div className="flex flex-col items-center justify-center my-3 select-none animate-in fade-in">
            <div className="p-3.5 rounded-2xl max-w-xs text-center backdrop-blur-md bg-black/40 border border-white/10 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#2481cc]/20 text-[#2481cc] flex items-center justify-center mx-auto mb-1.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-gray-200 mb-0.5">
                بداية سجل المحادثة
              </div>
              <div className="text-[10px] text-gray-400">
                تم تشفير جميع الرسائل بنجاح عبر MTProto 2.0 (Layer 184).
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (item.type === 'date_divider') {
      return (
        <div style={style} className="px-3 sm:px-6 py-1.5 flex justify-center select-none">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/40 text-gray-200 backdrop-blur-md shadow-xs">
            {item.dateText}
          </span>
        </div>
      );
    }

    if (item.type === 'unread_divider') {
      return (
        <div style={style} className="px-3 sm:px-6 py-1.5 flex items-center gap-3 select-none">
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
          style={style}
          data-msg-id={msg.id}
          className="px-3 sm:px-6 py-1"
        >
          <div
            id={`msg-bubble-container-${msg.id}`}
            className={`transition-all duration-300 rounded-2xl ${
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
        </div>
      );
    }

    return <div style={style} />;
}) as unknown as React.ComponentType<RowComponentProps<MessageRowCustomProps>>;

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

  const listRef = useRef<ListImperativeAPI | null>(null);

  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  // Defer showScrollBottom state to avoid locking the main rendering thread while user scrolls rapidly
  const deferredShowScrollBottom = useDeferredValue(showScrollBottom);
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
  const lastVisibleIndexRef = useRef<number>(-1);

  const currentMessages = useMemo(() => {
    return (activeChatId && messages[activeChatId]) || [];
  }, [activeChatId, messages]);

  const pinnedMessages = useMemo(() => {
    return currentMessages.filter((m) => m.isPinned);
  }, [currentMessages]);

  const isArabic = settings.language === 'ar';
  const isLoadingOlder = activeChatId ? Boolean(isChatLoadingOlder[activeChatId]) : false;
  const hasMoreOnServer = activeChatId ? (chatHasMoreOlder[activeChatId] ?? true) : true;

  // Dynamic row height cache for react-window with per-chat cache key
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: 64,
    key: activeChatId || 'default',
  });

  // Sort and group messages into renderable rows
  const groupedItems = useMemo<GroupedItem[]>(() => {
    if (!currentMessages || currentMessages.length === 0) return [];
    const baseItems = messagesController.sortAndGroupMessages(currentMessages, readInboxMaxId) as GroupedItem[];
    if (!hasMoreOnServer && baseItems.length > 0) {
      return [
        {
          type: 'origin_badge',
          id: 'origin_encrypted_badge',
        },
        ...baseItems,
      ];
    }
    return baseItems;
  }, [currentMessages, readInboxMaxId, hasMoreOnServer]);

  // Map: Message ID -> Index in groupedItems (mandatory for virtualized lists to locate message positions)
  const messageIdToIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < groupedItems.length; i++) {
      const item = groupedItems[i];
      if (item?.message?.id !== undefined && item?.message?.id !== null) {
        map.set(String(item.message.id), i);
      }
    }
    return map;
  }, [groupedItems]);

  // Load more older messages from MTProto API stream
  const handleLoadOlder = useCallback(async () => {
    if (!activeChatId || isLoadingOlder || !hasMoreOnServer) return;

    const el = listRef.current?.element;
    if (el) {
      scrollAnchorRef.current = {
        previousScrollHeight: el.scrollHeight,
        previousScrollTop: el.scrollTop,
        shouldRestore: true,
      };
    }

    await loadMoreChatMessages(activeChatId);
  }, [activeChatId, isLoadingOlder, hasMoreOnServer, loadMoreChatMessages]);

  // Restore scroll anchor smoothly without jumping when older messages are prepended
  useLayoutEffect(() => {
    if (scrollAnchorRef.current.shouldRestore) {
      const el = listRef.current?.element;
      if (el) {
        const heightDifference = el.scrollHeight - scrollAnchorRef.current.previousScrollHeight;
        if (heightDifference > 0) {
          el.scrollTop = scrollAnchorRef.current.previousScrollTop + heightDifference;
        }
      }
      scrollAnchorRef.current.shouldRestore = false;
    }
  }, [currentMessages.length]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    if (groupedItems.length === 0) return;
    const lastIndex = groupedItems.length - 1;

    listRef.current?.scrollToRow({
      index: lastIndex,
      align: 'end',
      behavior: behavior === 'smooth' ? 'smooth' : 'instant',
    });

    const el = listRef.current?.element;
    if (el) {
      if (behavior === 'smooth') {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }

    setUnreadStreamCount(0);
    setShowScrollBottom(false);
    isUserNearBottomRef.current = true;

    if (activeChatId && el) {
      const latestMsgId = currentMessages[currentMessages.length - 1]?.id;
      chatStore.saveLastReadPosition(activeChatId, {
        lastReadMessageId: latestMsgId,
        scrollTop: el.scrollHeight,
        scrollHeight: el.scrollHeight,
        isNearBottom: true,
      });
    }
  }, [groupedItems.length, activeChatId, currentMessages]);

  // Performs official Telegram scroll restoration upon opening or receiving messages
  const performInitialScroll = useCallback(() => {
    const el = listRef.current?.element;
    if (!el || groupedItems.length === 0 || !activeChatId) return;

    const savedPos = chatStore.getLastReadPosition(activeChatId);
    const savedNumericPos = chatStore.getScrollPosition(activeChatId);

    // Rule 1: If never opened before (neither in lastReadPositions nor ScrollPositions), immediately scroll to bottom
    if (!savedPos && savedNumericPos === undefined) {
      listRef.current?.scrollToRow({
        index: groupedItems.length - 1,
        align: 'end',
        behavior: 'instant',
      });
      el.scrollTop = el.scrollHeight;
      isUserNearBottomRef.current = true;
      setShowScrollBottom(false);
      isInitialScrollDoneRef.current = true;
      return;
    }

    // Rule 2: If user was previously at bottom, scroll directly to bottom
    if (savedPos?.isNearBottom) {
      listRef.current?.scrollToRow({
        index: groupedItems.length - 1,
        align: 'end',
        behavior: 'instant',
      });
      el.scrollTop = el.scrollHeight;
      isUserNearBottomRef.current = true;
      setShowScrollBottom(false);
      isInitialScrollDoneRef.current = true;
      return;
    }

    // Rule 3: Use Message ID -> Index map to scroll to exact message
    const targetMsgId = savedPos?.lastReadMessageId || (savedNumericPos ? String(savedNumericPos) : undefined);
    if (targetMsgId) {
      let targetIndex = messageIdToIndexMap.get(targetMsgId);
      if (targetIndex === undefined) {
        // Fallback linear search
        targetIndex = groupedItems.findIndex((item) => String(item.message?.id) === targetMsgId);
      }

      if (targetIndex !== undefined && targetIndex !== -1) {
        listRef.current?.scrollToRow({
          index: targetIndex,
          align: 'center',
          behavior: 'instant',
        });
        isUserNearBottomRef.current = false;
        setShowScrollBottom(true);
        isInitialScrollDoneRef.current = true;
        return;
      }
    }

    // Rule 4: If lastReadMessageId is not found (or earlier), use preserved scrollTop
    if (savedPos && savedPos.scrollTop > 0) {
      if (savedPos.scrollHeight > 0 && el.scrollHeight > 0) {
        const heightDiff = el.scrollHeight - savedPos.scrollHeight;
        el.scrollTop = Math.max(80, savedPos.scrollTop + (heightDiff > 0 ? heightDiff : 0));
      } else {
        el.scrollTop = savedPos.scrollTop;
      }
      isUserNearBottomRef.current = false;
      setShowScrollBottom(true);
    } else {
      // STRICT RULE: NEVER jump to top or scrollTop = 0! Default to bottom
      listRef.current?.scrollToRow({
        index: groupedItems.length - 1,
        align: 'end',
        behavior: 'instant',
      });
      el.scrollTop = el.scrollHeight;
      isUserNearBottomRef.current = true;
      setShowScrollBottom(false);
    }

    isInitialScrollDoneRef.current = true;
  }, [activeChatId, groupedItems, messageIdToIndexMap]);

  // Handle activeChatId switching & scroll restoration
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    if (!activeChatId) return;

    isInitialScrollDoneRef.current = false;
    setShowScrollBottom(false);
    setUnreadStreamCount(0);
    setReadInboxMaxId(undefined);
    prevMessagesLengthRef.current = currentMessages.length;

    chatStore.markChatVisitedInCurrentSession(activeChatId);
    markChatAsRead(activeChatId);

    if (groupedItems.length > 0) {
      requestAnimationFrame(performInitialScroll);
      const t1 = setTimeout(performInitialScroll, 40);
      const t2 = setTimeout(performInitialScroll, 120);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeChatId, markChatAsRead, performInitialScroll, groupedItems.length, currentMessages.length]);

  // Trigger initial scroll as soon as messages are hydrated from IndexedDB / SQLite
  useLayoutEffect(() => {
    if (!activeChatId || groupedItems.length === 0) return;
    if (!isInitialScrollDoneRef.current) {
      performInitialScroll();
      requestAnimationFrame(performInitialScroll);
      const timer = setTimeout(performInitialScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [activeChatId, groupedItems.length, performInitialScroll]);

  // Save read position when unmounting or switching chats
  useEffect(() => {
    return () => {
      const el = listRef.current?.element;
      const currentChatId = activeChatIdRef.current;
      if (el && currentChatId) {
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNear = distance <= 140;
        let lastMsgId: string | undefined = undefined;
        if (isNear && currentMessages.length > 0) {
          lastMsgId = currentMessages[currentMessages.length - 1]?.id;
        } else if (lastVisibleIndexRef.current >= 0 && lastVisibleIndexRef.current < groupedItems.length) {
          for (let i = lastVisibleIndexRef.current; i >= 0; i--) {
            if (groupedItems[i]?.message?.id) {
              lastMsgId = groupedItems[i].message.id;
              break;
            }
          }
        }
        chatStore.saveLastReadPosition(currentChatId, {
          lastReadMessageId: lastMsgId,
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          isNearBottom: isNear,
        });
      }
    };
  }, [groupedItems, currentMessages]);

  // Handle incoming stream updates & outgoing messages with smart auto-scroll
  useEffect(() => {
    const prevCount = prevMessagesLengthRef.current;
    const currentCount = currentMessages.length;
    prevMessagesLengthRef.current = currentCount;

    if (currentCount > prevCount && isInitialScrollDoneRef.current) {
      const addedCount = currentCount - prevCount;
      const latestMsg = currentMessages[currentMessages.length - 1];
      const isOutgoing = Boolean(latestMsg?.isOutgoing);

      if (isUserNearBottomRef.current || isOutgoing) {
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      } else {
        setUnreadStreamCount((prev) => prev + addedCount);
        setShowScrollBottom(true);
      }
    }
  }, [currentMessages.length, scrollToBottom]);

  // Handle scroll events from the virtualized container
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceToBottom <= 140;
    isUserNearBottomRef.current = isNearBottom;

    startTransition(() => {
      setShowScrollBottom(!isNearBottom);
    });

    if (isNearBottom && unreadStreamCount > 0) {
      setUnreadStreamCount(0);
    }

    // Guard against spurious early mount scroll events where scrollTop is 0 before initial positioning
    if (!isInitialScrollDoneRef.current) {
      return;
    }

    if (activeChatId) {
      let lastReadMsgId: string | undefined = undefined;
      if (isNearBottom && currentMessages.length > 0) {
        lastReadMsgId = currentMessages[currentMessages.length - 1]?.id;
      } else if (lastVisibleIndexRef.current >= 0 && lastVisibleIndexRef.current < groupedItems.length) {
        for (let i = lastVisibleIndexRef.current; i >= 0; i--) {
          if (groupedItems[i]?.message?.id) {
            lastReadMsgId = groupedItems[i].message.id;
            break;
          }
        }
      }

      chatStore.saveLastReadPosition(activeChatId, {
        lastReadMessageId: lastReadMsgId,
        scrollTop,
        scrollHeight,
        isNearBottom,
      });

      if (lastReadMsgId) {
        const numId = Number(lastReadMsgId);
        chatStore.setScrollPosition(activeChatId, !isNaN(numId) ? numId : scrollTop);
      }
    }

    if (scrollTop < 80 && !isLoadingOlder && hasMoreOnServer) {
      handleLoadOlder();
    }
  }, [activeChatId, unreadStreamCount, isLoadingOlder, hasMoreOnServer, handleLoadOlder, currentMessages, groupedItems]);

  // Virtualized row rendering window callback
  const handleRowsRendered = useCallback((
    visibleRows: { startIndex: number; stopIndex: number }
  ) => {
    lastVisibleIndexRef.current = visibleRows.stopIndex;

    // Live update position as user scrolls past messages
    if (activeChatId && !isUserNearBottomRef.current) {
      let visibleMsgId: string | undefined = undefined;
      for (let i = Math.min(visibleRows.stopIndex, groupedItems.length - 1); i >= visibleRows.startIndex; i--) {
        if (groupedItems[i]?.message?.id) {
          visibleMsgId = groupedItems[i].message.id;
          break;
        }
      }
      if (visibleMsgId) {
        const el = listRef.current?.element;
        chatStore.saveLastReadPosition(activeChatId, {
          lastReadMessageId: visibleMsgId,
          scrollTop: el?.scrollTop ?? 0,
          scrollHeight: el?.scrollHeight ?? 0,
          isNearBottom: false,
        });
      }
    }

    if (visibleRows.startIndex <= 2 && !isLoadingOlder && hasMoreOnServer) {
      handleLoadOlder();
    }
  }, [activeChatId, groupedItems, isLoadingOlder, hasMoreOnServer, handleLoadOlder]);

  // Jump to specific message handler (search, reply, pin)
  useEffect(() => {
    const handleScrollToMessage = (e: any) => {
      const detail = e.detail;
      if (!detail || !detail.messageId) return;

      const targetMsgId = detail.messageId;
      const targetIndex = groupedItems.findIndex((m) => m.message?.id === targetMsgId);
      if (targetIndex !== -1) {
        listRef.current?.scrollToRow({
          index: targetIndex,
          align: 'center',
          behavior: 'smooth',
        });

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
      }
    };

    window.addEventListener('tg-scroll-to-message', handleScrollToMessage);
    return () => window.removeEventListener('tg-scroll-to-message', handleScrollToMessage);
  }, [groupedItems]);

  const rowProps = useMemo<MessageRowCustomProps>(() => ({
    items: groupedItems,
    highlightedMessageId,
  }), [groupedItems, highlightedMessageId]);

  const getRowKey = useCallback((index: number, data: MessageRowCustomProps) => {
    return data.items[index]?.id || index;
  }, []);

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

      {/* Floating Top Loading Indicator */}
      {isLoadingOlder && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 select-none animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/70 text-sky-300 backdrop-blur-md border border-sky-500/30 shadow-lg">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2481cc]" />
            <span>{isArabic ? 'جاري مزامنة الرسائل السابقة...' : 'Loading earlier messages...'}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {groupedItems.length === 0 ? (
        <div
          id="tg-messages-empty-area"
          className="flex-1 w-full h-full flex items-center justify-center text-center p-6 select-none tg-wallpaper-pattern"
          style={{
            backgroundColor: 'var(--tg-theme-chat-bg)',
          }}
        >
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
        /* Virtualized Message Feed Container powered by react-window VariableSizeList */
        <VariableSizeList
          id="tg-messages-scroll-area"
          listRef={listRef}
          className="flex-1 w-full h-full overflow-y-auto tg-wallpaper-pattern overscroll-contain"
          style={{
            backgroundColor: 'var(--tg-theme-chat-bg)',
            height: '100%',
            width: '100%',
          }}
          rowCount={groupedItems.length}
          rowHeight={dynamicRowHeight}
          rowComponent={MessageRow as any}
          rowProps={rowProps}
          rowKey={getRowKey}
          overscanCount={8}
          onScroll={handleScroll}
          onRowsRendered={handleRowsRendered}
        />
      )}

      {/* Floating Scroll to Bottom Button with Unread Incoming Stream Badge */}
      {deferredShowScrollBottom && (
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
