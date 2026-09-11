import React from 'react';
import {
  Bookmark,
  Check,
  CheckCheck,
  VolumeX,
  Volume2,
  Pin,
  BadgeCheck,
  Bot,
  Megaphone,
  Users,
  Archive,
  Trash2,
  MailCheck,
  ShieldAlert,
  Edit3,
} from 'lucide-react';
import { Chat } from '../../types';
import { chatStore, PartialSyncIcon } from '../../store/chatStore';
import { useTelegram } from '../../context/TelegramContext';
import { useLongPress, useChatSwipeActions } from '../../hooks/useTouchGestures';
import { formatChatListTime } from '../../utils/dateUtils';
import { draftSyncService } from '../../services/DraftSyncService';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
}

/**
 * ChatListItem - Replicates Telegram Android (DrKLO ItemTouchHelper & Swipe Actions)
 */
const ChatListItemComponent: React.FC<ChatListItemProps> = ({ chat, isActive }) => {
  const {
    setActiveChatId,
    setChatContextMenu,
    togglePinChat,
    toggleArchiveChat,
    toggleMuteChat,
    markChatReadUnread,
    deleteChat,
    settings,
    showToast,
  } = useTelegram();

  const isSavedMessages = chat.type === 'saved';
  const isRtl = settings.language === 'ar';
  const effectiveDraft = chat.draft || draftSyncService.getDraftText(chat.id);

  const renderStatusCheck = (status?: string) => {
    if (!status) return null;
    if (chat.lastMessage && !chatStore.isMessageVerified(chat.id, chat.lastMessage.id) && chatStore.getSyncStatus(chat.id) === 'partial') {
      return (
        <span title="Locally cached — Pending cloud verification (partial)">
          <PartialSyncIcon className="w-3.5 h-3.5 text-amber-400" />
        </span>
      );
    }
    if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-[#4fae4e]" />;
    if (status === 'delivered' || status === 'sent') return <Check className="w-3.5 h-3.5 text-gray-400" />;
    return null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatContextMenu({
      chatId: chat.id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const longPressHandlers = useLongPress(
    (e) => {
      const touch = 'touches' in e ? e.touches[0] || (e as any).changedTouches?.[0] : e;
      setChatContextMenu({
        chatId: chat.id,
        x: touch ? touch.clientX : window.innerWidth / 2,
        y: touch ? touch.clientY : window.innerHeight / 2,
      });
    },
    () => {
      setActiveChatId(chat.id);
    },
    450
  );

  const { offset, isDragging, touchHandlers, resetOffset } = useChatSwipeActions({
    onArchive: () => {
      toggleArchiveChat(chat.id);
    },
    onPin: () => {
      togglePinChat(chat.id);
    },
    onMute: () => {
      toggleMuteChat(chat.id);
    },
    onDelete: () => {
      deleteChat(chat.id);
    },
    isRtl,
  });

  const isThreeLines = settings.chatListViewMode === 'three_lines';

  return (
    <div className="relative overflow-hidden w-full select-none bg-[var(--tg-theme-surface)]">
      {/* Background Swipe Actions (Revealed under the item during touch swipe) */}
      <div className="absolute inset-0 flex items-center justify-between px-4 z-0 pointer-events-auto">
        {/* Left Action (Pin / Mute) */}
        <div
          className={`flex items-center gap-2 text-white text-xs font-bold transition-transform ${
            offset > 20 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinChat(chat.id);
              resetOffset();
            }}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title={chat.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
          >
            <Pin className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMuteChat(chat.id);
              resetOffset();
            }}
            className="w-10 h-10 rounded-full bg-sky-600 hover:bg-sky-700 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title={chat.isMuted ? 'إلغاء الكتم' : 'كتم'}
          >
            {chat.isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Right Action (Archive / Read / Delete) */}
        <div
          className={`flex items-center gap-2 text-white text-xs font-bold transition-transform ${
            offset < -20 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              markChatReadUnread(chat.id);
              resetOffset();
            }}
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title="تحديد كمقروء / غير مقروء"
          >
            <MailCheck className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteChat(chat.id);
              resetOffset();
            }}
            className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title="حذف المحادثة"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Foreground Swipeable Chat Card */}
      <div
        id={`chat-item-${chat.id}`}
        onContextMenu={handleContextMenu}
        {...longPressHandlers}
        {...touchHandlers}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          backgroundColor: isActive ? 'rgba(36, 129, 204, 0.12)' : 'var(--tg-theme-surface)',
        }}
        className={`relative z-10 group flex items-center gap-3 px-3 cursor-pointer select-none transition-colors duration-100 min-h-[72px] ${
          isThreeLines ? 'py-3' : 'py-2'
        } ${
          isActive
            ? 'border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#2481cc]'
            : 'hover:bg-white/5 active:bg-white/10'
        }`}
      >
        {/* Avatar / Icon (DrKLO DialogCell 54dp x 54dp) */}
        <div
          className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold shadow-sm ${
            isThreeLines ? 'w-[56px] h-[56px] text-xl' : 'w-[54px] h-[54px] text-lg'
          }`}
        >
          {isSavedMessages ? (
            <div className="w-full h-full bg-[#2481cc] flex items-center justify-center">
              <Bookmark className="w-6 h-6 fill-white text-white" />
            </div>
          ) : (
            <>
              <span className="select-none">{chat.title.charAt(0).toUpperCase()}</span>
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  alt={chat.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
            </>
          )}

          {chat.type === 'private' && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[var(--tg-theme-bg)] rounded-full" />
          )}

          {chat.isRestricted && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-600 rounded-full border border-black/50 flex items-center justify-center shadow">
              <ShieldAlert className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>

        {/* Chat Details (DrKLO DialogCell 16sp title, 15sp message, 12sp time) */}
        <div className="flex-1 min-w-0">
          {/* Top Row: Title + Verification + Restricted + Time */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-semibold text-[16px] leading-tight truncate" style={{ color: 'var(--tg-theme-bubble-in-text)' }}>
                {chat.title}
              </span>
              {chat.isVerified && (
                <BadgeCheck className="w-4 h-4 text-[#2481cc] shrink-0 fill-[#2481cc]/20" />
              )}
              {chat.isRestricted && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold shrink-0">
                  {isRtl ? 'محتوى مقيد' : 'Restricted'}
                </span>
              )}
              {chat.type === 'bot' && (
                <Bot className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              {chat.type === 'channel' && !chat.isVerified && (
                <Megaphone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              {chat.type === 'group' && (
                <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              {chat.isMuted && (
                <VolumeX className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-0.5 rtl:ml-0 rtl:mr-0.5" />
              )}
            </div>

            <span className={`text-[12px] shrink-0 whitespace-nowrap font-mono ${effectiveDraft ? 'text-[#e53935] font-medium' : 'text-gray-400'}`}>
              {effectiveDraft
                ? chat.draftTimestamp || (settings.language === 'ar' ? 'مسودة' : 'Draft')
                : chat.lastMessage
                ? formatChatListTime(chat.lastMessage.rawDate || chat.lastMessage.epoch || chat.lastMessage.date) || chat.lastMessage.timestamp
                : ''}
            </span>
          </div>

          {/* 3-Lines Mode Middle Row (Sender info / Channel handle / Group badge) */}
          {isThreeLines && (
            <div className="flex items-center gap-1 min-w-0 text-xs text-sky-400 font-medium truncate mb-0.5">
              {chat.lastMessage?.senderName && !chat.lastMessage.isOutgoing && chat.type !== 'private' ? (
                <span className="truncate">
                  {chat.lastMessage.senderName}
                </span>
              ) : chat.username ? (
                <span className="text-gray-400 font-mono text-[11px] truncate">
                  @{chat.username}
                </span>
              ) : (
                <span className="text-gray-400 text-[11px] truncate">
                  {chat.type === 'channel' ? (isRtl ? 'قناة تيليجرام' : 'Telegram Channel') : (isRtl ? 'محادثة' : 'Chat')}
                </span>
              )}
            </div>
          )}

          {/* Bottom Row: Last Message Snippet OR Draft + Status + Unread / Pin */}
          <div className="flex items-center justify-between gap-2">
            {effectiveDraft ? (
              <div className="flex items-center gap-1 min-w-0 text-[15px] truncate">
                <Edit3 className="w-3.5 h-3.5 text-[#e53935] shrink-0" />
                <span className="text-[#e53935] font-semibold shrink-0">
                  {settings.language === 'ar' ? 'مسودة:' : 'Draft:'}
                </span>
                <span className="text-gray-300 truncate font-normal">
                  {effectiveDraft}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 min-w-0 text-[15px] text-gray-400 truncate">
                {chat.lastMessage?.isOutgoing && renderStatusCheck(chat.lastMessage.status)}
                {!isThreeLines && chat.lastMessage?.senderName && !chat.lastMessage.isOutgoing && chat.type !== 'private' && (
                  <span className="font-medium text-sky-400/90 truncate">
                    {chat.lastMessage.senderName}:
                  </span>
                )}
                <span className={`truncate ${isThreeLines ? 'line-clamp-2' : ''}`}>
                  {chat.lastMessage?.text || (settings.language === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {chat.isPinned && (
                <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 -rotate-45" />
              )}
              {chat.unreadCount > 0 && (
                <span
                  id={`chat-unread-badge-${chat.id}`}
                  className={`min-w-[20px] h-[20px] text-[11px] font-bold px-1.5 flex items-center justify-center rounded-full ${
                    chat.isMuted ? 'bg-gray-600 text-gray-200' : 'bg-[#2481cc] text-white shadow-sm'
                  }`}
                >
                  {chat.unreadCount > 999 ? '999+' : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatListItem = React.memo(ChatListItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.isPinned === nextProps.chat.isPinned &&
    prevProps.chat.isMuted === nextProps.chat.isMuted &&
    prevProps.chat.title === nextProps.chat.title &&
    prevProps.chat.avatar === nextProps.chat.avatar &&
    prevProps.chat.draft === nextProps.chat.draft &&
    prevProps.chat.lastMessage?.id === nextProps.chat.lastMessage?.id &&
    prevProps.chat.lastMessage?.text === nextProps.chat.lastMessage?.text &&
    prevProps.chat.lastMessage?.status === nextProps.chat.lastMessage?.status &&
    prevProps.chat.lastMessage?.timestamp === nextProps.chat.lastMessage?.timestamp
  );
});
