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
import {
  MessageSkeletonRow,
  MessageThreadSkeleton,
  generateHistoryFetchSkeletons,
  SKELETON_HEIGHTS,
  type SkeletonVariant,
} from './MessageSkeleton';
import { messagesController } from '../../core/MessagesController';
import { getTelegramEpoch } from '../../utils/dateUtils';
import {
  List as VariableSizeList,
  List as FixedSizeList,
  List,
  type ListImperativeAPI,
  type RowComponentProps,
} from 'react-window';

// React-Window Virtualization: exports VariableSizeList and FixedSizeList adapters
export { VariableSizeList, FixedSizeList };

interface GroupedItem {
  type: 'message' | 'date_divider' | 'unread_divider' | 'origin_badge' | 'skeleton';
  id: string;
  message?: any;
  dateText?: string;
  isGroupStart?: boolean;
  isGroupMiddle?: boolean;
  isGroupEnd?: boolean;
  isSingle?: boolean;
  skeletonVariant?: SkeletonVariant;
  estimatedHeight?: number;
}

/**
 * High-performance deterministic row height calculator for react-window.
 * Accurately calculates height in O(1) time without triggering ResizeObserver re-renders.
 */
function estimateItemHeight(item?: GroupedItem): number {
  if (!item) return 64;
  if (item.type === 'date_divider') return 40;
  if (item.type === 'unread_divider') return 34;
  if (item.type === 'origin_badge') return 116;
  if (item.type === 'skeleton') {
    return item.estimatedHeight || (item.skeletonVariant ? SKELETON_HEIGHTS[item.skeletonVariant] : 72);
  }

  const msg = item.message;
  if (!msg) return 60;

  let height = 8; // py-1 padding (4px top + 4px bottom)

  // Sender Name (in groups/channels)
  if (!msg.isOutgoing && msg.senderName) {
    height += 20;
  }
  // Forwarded Header
  if (msg.forwardedFrom) {
    height += 24;
  }
  // Reply Quote
  if (msg.replyTo) {
    height += 38;
  }

  // Media attachments
  if (msg.media) {
    if (msg.media.type === 'photo' || msg.media.type === 'video') {
      height += 220;
    } else if (msg.media.type === 'voice' || msg.media.type === 'audio') {
      height += 72;
    } else if (msg.media.type === 'sticker') {
      height += 140;
    } else if (msg.media.type === 'document' || msg.media.type === 'file') {
      height += 68;
    } else if (msg.media.type === 'poll') {
      const answersCount = msg.media.pollData?.answers?.length || 3;
      height += 80 + answersCount * 36;
    }
  }

  // Link preview card
  if (msg.linkPreview) {
    height += 110;
  }

  // Text content calculation
  if (msg.text) {
    const rawLines = msg.text.split('\n');
    let totalLines = 0;
    for (const line of rawLines) {
      totalLines += Math.max(1, Math.ceil((line.length || 1) / 34));
    }
    height += Math.max(34, totalLines * 22 + 16);
  } else if (!msg.media) {
    height += 44;
  }

  // Reactions row
  if (msg.reactions && Object.keys(msg.reactions).length > 0) {
    height += 28;
  }

  return Math.min(Math.max(48, height), 800);
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

    if (item.type === 'skeleton' && item.skeletonVariant) {
      return (
        <div style={style}>
          <MessageSkeletonRow variant={item.skeletonVariant} />
        </div>
      );
    }

    if (item.message) {
      const msg = item.message;
      return (
        <div
          style={style}
          data-msg-id={msg.id}
          dir="ltr"
          className="px-2 sm:px-4 py-0.5 w-full"
        >
          <div
            id={`msg-bubble-container-${msg.id}`}
            className={`transition-all duration-300 rounded-2xl w-full ${
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
  },
  (prevProps, nextProps) => {
    if (prevProps.index !== nextProps.index) return false;
    const prevStyle: any = prevProps.style;
    const nextStyle: any = nextProps.style;
    if (
      prevStyle?.top !== nextStyle?.top ||
      prevStyle?.height !== nextStyle?.height ||
      prevStyle?.transform !== nextStyle?.transform
    ) {
      return false;
    }
    const prevItem = prevProps.items[prevProps.index];
    const nextItem = nextProps.items[nextProps.index];
    if (prevItem !== nextItem) {
      if (!prevItem || !nextItem) return false;
      if (prevItem.id !== nextItem.id || prevItem.type !== nextItem.type) return false;
      if (prevItem.message !== nextItem.message) return false;
    }
    const prevMsgId = prevItem?.message?.id;
    const nextMsgId = nextItem?.message?.id;
    if (prevMsgId && nextMsgId) {
      const prevHighlighted = prevProps.highlightedMessageId === prevMsgId;
      const nextHighlighted = nextProps.highlightedMessageId === nextMsgId;
      if (prevHighlighted !== nextHighlighted) return false;
    }
    return true;
  }
) as unknown as React.ComponentType<RowComponentProps<MessageRowCustomProps>>;

export interface MessageListProps {
  messages?: any[];
  hidePinnedBar?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages: propMessages,
  hidePinnedBar = false,
}) => {
  const {
    activeChatId,
    activeChat,
    messages: contextMessages,
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
  const lastVisitedChatIdRef = useRef<string | null>(null);
  const isInitialScrollDoneRef = useRef<boolean>(false);
  const lastVisibleIndexRef = useRef<number>(-1);
  const lastScrollSaveTimeRef = useRef<number>(0);

  const currentMessages = useMemo(() => {
    const raw = propMessages || ((activeChatId && contextMessages[activeChatId]) || []);
    if (!raw.length || !activeChatId) return [];

    // Filter strictly by activeChatId to prevent any cross-chat message overlap
    const cleanActiveId = activeChatId.replace(/^chat_/, '');
    const chatFiltered = raw.filter((m) => {
      if (!m) return false;
      const mChatId = String(m.chatId || '').replace(/^chat_/, '');
      const mPeerId = String(m.peerId || '').replace(/^chat_/, '');
      if (mChatId && mChatId === cleanActiveId) return true;
      if (mPeerId && mPeerId === cleanActiveId) return true;
      if (m.chatId === activeChatId) return true;
      return !mChatId && !mPeerId && propMessages !== undefined;
    });

    // Deduplicate messages by unique ID to prevent duplicate rendering and overlap
    const map = new Map<string, any>();
    for (const m of chatFiltered) {
      if (!m || m.id === undefined || m.id === null) continue;
      const key = String(m.id);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, m);
      } else {
        map.set(key, { ...existing, ...m });
      }
    }

    // Sort strictly ascending by date (oldest first, newest last) using specific message ID
    return Array.from(map.values()).sort((a, b) => {
      const epochA = getTelegramEpoch(a);
      const epochB = getTelegramEpoch(b);
      if (epochA !== epochB) return epochA - epochB;
      const numA = Number(String(a.id).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
    });
  }, [activeChatId, propMessages, contextMessages]);

  const currentMessagesRef = useRef(currentMessages);
  currentMessagesRef.current = currentMessages;

  const pinnedMessages = useMemo(() => {
    const rawPinned = currentMessages.filter((m) => Boolean(m.isPinned));
    if (!rawPinned.length) return [];

    // Deduplicate pinned messages by specific message ID to prevent duplicate rendering and overlap
    const map = new Map<string, any>();
    for (const m of rawPinned) {
      if (!m || m.id === undefined || m.id === null) continue;
      const key = String(m.id);
      if (!map.has(key)) {
        map.set(key, m);
      }
    }

    // Sort strictly ascending by date (oldest first, newest last) using specific message ID
    return Array.from(map.values()).sort((a, b) => {
      const epochA = getTelegramEpoch(a);
      const epochB = getTelegramEpoch(b);
      if (epochA !== epochB) return epochA - epochB;
      const numA = Number(String(a.id).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
    });
  }, [currentMessages]);

  const isArabic = settings.language === 'ar';
  const isLoadingOlder = activeChatId ? Boolean(isChatLoadingOlder[activeChatId]) : false;
  const hasMoreOnServer = activeChatId ? (chatHasMoreOlder[activeChatId] ?? true) : true;

  // Dynamic skeletons generated on-the-fly during message history fetch
  const olderSkeletons = useMemo<GroupedItem[]>(() => {
    if (!isLoadingOlder) return [];
    return generateHistoryFetchSkeletons('older') as GroupedItem[];
  }, [isLoadingOlder]);

  // Sort and group messages into renderable rows, injecting dynamic skeleton placeholders during older history fetches
  const groupedItems = useMemo<GroupedItem[]>(() => {
    if (!currentMessages || currentMessages.length === 0) {
      if (isLoadingOlder) {
        return olderSkeletons;
      }
      return [];
    }

    const baseItems = messagesController.sortAndGroupMessages(currentMessages, readInboxMaxId) as GroupedItem[];
    const items: GroupedItem[] = [];

    if (isLoadingOlder && olderSkeletons.length > 0) {
      items.push(...olderSkeletons);
    } else if (!hasMoreOnServer && baseItems.length > 0) {
      items.push({
        type: 'origin_badge',
        id: 'origin_encrypted_badge',
      });
    }

    items.push(...baseItems);

    // Deduplicate all grouped items by unique specific ID to prevent duplicate rendering and overlap in virtualized rows
    const seenIds = new Set<string>();
    const uniqueGrouped: GroupedItem[] = [];
    for (const it of items) {
      const uniqueKey = it.id ? String(it.id) : (it.message?.id ? `msg_${it.message.id}` : `idx_${uniqueGrouped.length}`);
      if (seenIds.has(uniqueKey)) continue;
      seenIds.add(uniqueKey);
      uniqueGrouped.push(it);
    }

    return uniqueGrouped;
  }, [currentMessages, readInboxMaxId, hasMoreOnServer, isLoadingOlder, olderSkeletons]);

  const groupedItemsRef = useRef(groupedItems);
  groupedItemsRef.current = groupedItems;

  // Deterministic O(1) row height calculator eliminating ResizeObserver state recalculation storms
  const getRowHeight = useCallback((index: number) => {
    return estimateItemHeight(groupedItemsRef.current[index]);
  }, []);

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

  const messageIdToIndexMapRef = useRef(messageIdToIndexMap);
  messageIdToIndexMapRef.current = messageIdToIndexMap;

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

  // Restore scroll anchor smoothly without jumping when older messages or skeletons are prepended
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
  }, [groupedItems.length]);

  // Scroll to bottom helper - stabilized against message state changes
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    const items = groupedItemsRef.current;
    if (items.length === 0) return;
    const lastIndex = items.length - 1;

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
      const msgs = currentMessagesRef.current;
      const latestMsgId = msgs[msgs.length - 1]?.id;
      chatStore.saveLastReadPosition(activeChatId, {
        lastReadMessageId: latestMsgId,
        scrollTop: el.scrollHeight,
        scrollHeight: el.scrollHeight,
        isNearBottom: true,
      });
    }
  }, [activeChatId]);

  // Performs official Telegram scroll restoration upon opening or receiving messages
  const performInitialScroll = useCallback(() => {
    const el = listRef.current?.element;
    const items = groupedItemsRef.current;
    const idMap = messageIdToIndexMapRef.current;
    if (!el || items.length === 0 || !activeChatId) return;

    const savedPos = chatStore.getLastReadPosition(activeChatId);
    const savedNumericPos = chatStore.getScrollPosition(activeChatId);

    // Rule 1: If never opened before (neither in lastReadPositions nor ScrollPositions), immediately scroll to bottom
    if (!savedPos && savedNumericPos === undefined) {
      listRef.current?.scrollToRow({
        index: items.length - 1,
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
        index: items.length - 1,
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
      let targetIndex = idMap.get(targetMsgId);
      if (targetIndex === undefined) {
        // Fallback linear search
        targetIndex = items.findIndex((item) => String(item.message?.id) === targetMsgId);
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
        index: items.length - 1,
        align: 'end',
        behavior: 'instant',
      });
      el.scrollTop = el.scrollHeight;
      isUserNearBottomRef.current = true;
      setShowScrollBottom(false);
    }

    isInitialScrollDoneRef.current = true;
  }, [activeChatId]);

  // Handle activeChatId switching & scroll restoration without re-triggering loops
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    if (!activeChatId) return;

    // Reset view flags and mark read ONLY when activeChatId changes to a new chat
    if (lastVisitedChatIdRef.current !== activeChatId) {
      lastVisitedChatIdRef.current = activeChatId;
      isInitialScrollDoneRef.current = false;
      setShowScrollBottom(false);
      setUnreadStreamCount(0);
      setReadInboxMaxId(undefined);
      prevMessagesLengthRef.current = currentMessagesRef.current.length;

      chatStore.markChatVisitedInCurrentSession(activeChatId);
      markChatAsRead(activeChatId);
    }

    // When items become available, perform the initial scroll cleanly
    if (groupedItems.length > 0 && !isInitialScrollDoneRef.current) {
      const raf = requestAnimationFrame(() => {
        performInitialScroll();
      });
      const t = setTimeout(() => {
        performInitialScroll();
      }, 50);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      };
    }
  }, [activeChatId, groupedItems.length, performInitialScroll, markChatAsRead]);

  // Save read position when unmounting or switching chats (NOT on every message receive!)
  useEffect(() => {
    return () => {
      const el = listRef.current?.element;
      const currentChatId = activeChatIdRef.current;
      const items = groupedItemsRef.current;
      const msgs = currentMessagesRef.current;
      if (el && currentChatId) {
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNear = distance <= 140;
        let lastMsgId: string | undefined = undefined;
        if (isNear && msgs.length > 0) {
          lastMsgId = msgs[msgs.length - 1]?.id;
        } else if (lastVisibleIndexRef.current >= 0 && lastVisibleIndexRef.current < items.length) {
          for (let i = lastVisibleIndexRef.current; i >= 0; i--) {
            if (items[i]?.message?.id) {
              lastMsgId = items[i].message.id;
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
  }, [activeChatId]);

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
      const now = Date.now();
      // Throttle chatStore updates to at most once every 120ms during rapid scrolling
      if (now - lastScrollSaveTimeRef.current > 120 || isNearBottom) {
        lastScrollSaveTimeRef.current = now;

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
    const item = data.items[index];
    if (!item) return index;
    if (item.type === 'message' && item.message?.id !== undefined && item.message?.id !== null) {
      return `msg_${item.message.id}`;
    }
    return item.id ? String(item.id) : index;
  }, []);

  return (
    <div id="tg-message-list-root" key={activeChatId || 'empty'} className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Pinned Messages Bar */}
      {!hidePinnedBar && pinnedMessages.length > 0 && (
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

      {/* Loading or Empty State */}
      {groupedItems.length === 0 ? (
        activeChatId && (!currentMessages.length || isLoadingOlder) ? (
          <div
            id="tg-messages-skeleton-area"
            className="flex-1 w-full h-full overflow-hidden select-none tg-wallpaper-pattern"
            style={{
              backgroundColor: 'var(--tg-theme-chat-bg)',
            }}
          >
            <MessageThreadSkeleton count={7} />
          </div>
        ) : (
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
        )
      ) : (
        /* Virtualized Message Feed Container powered by react-window VariableSizeList with O(1) dynamic row heights */
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
          rowHeight={getRowHeight}
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
