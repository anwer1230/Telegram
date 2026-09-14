import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  BadgeCheck,
  Bookmark,
  Bot,
  Megaphone,
  Users,
  PanelRight,
  Download,
  Sparkles,
  Lock,
  ShieldCheck,
  Layers,
  LogOut,
  Trash2,
  Eraser,
  AlertTriangle,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Flag,
  Info,
  Database,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { ChatInfoManager } from '../../core/ChatInfoManager';
import { GroupActionsHelper } from '../../core/GroupActionsHelper';
import { ChatReportModal } from '../Modals/ChatReportModal';
import { ClearChatModal } from '../Modals/ClearChatModal';
import { LeaveChatModal } from '../Modals/LeaveChatModal';

export const ChatHeader: React.FC = () => {
  const {
    activeChat,
    setActiveChatId,
    startCall,
    isRightPanelOpen,
    setIsRightPanelOpen,
    setActiveModal,
    typingChatId,
    typingStatus,
    onlineCounts,
    settings,
    leaveGroup,
    deleteGroupMessages,
    deleteGroup,
    clearChatHistory,
    toggleMuteChat,
    showToast,
    messageCache,
  } = useTelegram();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'leave' | 'clear' | 'delete';
    title: string;
    description: string;
    confirmText?: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!activeChat) return null;

  const isSavedMessages = activeChat.type === 'saved';
  const isArabic = settings.language === 'ar';

  const chatOnline = (activeChat?.id && onlineCounts?.[activeChat.id]) ?? activeChat?.onlineCount ?? 0;
  const activeTyping = activeChat?.id ? typingStatus?.[activeChat.id] : null;
  const isTyping = Boolean((activeChat && typingChatId === activeChat.id) || activeTyping);

  const getSubtitle = () => {
    if (isSavedMessages) {
      return isArabic ? 'مساحتك السحابية الخاصة' : 'Personal Cloud Storage';
    }
    if (activeChat.type === 'bot') {
      return isArabic ? 'بوت' : 'bot';
    }
    if (activeChat.type === 'private') {
      return isArabic ? 'متصل الآن' : 'online';
    }

    const count = activeChat.memberCount || (activeChat as any).participants_count || 1;
    const formattedMembers = ChatInfoManager.formatNumber(count);
    const formattedOnline = ChatInfoManager.formatNumber(chatOnline);

    if (activeChat.type === 'channel') {
      if (chatOnline > 0) {
        return isArabic
          ? `${formattedMembers} مشترك، ${formattedOnline} متصل`
          : `${formattedMembers} subscribers, ${formattedOnline} online`;
      }
      return isArabic ? `${formattedMembers} مشترك` : `${formattedMembers} subscribers`;
    }

    // Group / Supergroup
    if (chatOnline > 0) {
      return isArabic
        ? `${formattedMembers} عضو، ${formattedOnline} متصل`
        : `${formattedMembers} members, ${formattedOnline} online`;
    }
    return isArabic ? `${formattedMembers} عضو` : `${formattedMembers} members`;
  };

  const getChatUrl = () => {
    if (activeChat.username) {
      return `https://t.me/${activeChat.username}`;
    }
    if (activeChat.inviteHash) {
      return `https://t.me/+${activeChat.inviteHash}`;
    }
    const cleanId = String(activeChat.id).replace(/^chat_/, '');
    return `https://t.me/c/${cleanId}`;
  };

  const handleCopyLink = async () => {
    const chatUrl = getChatUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(chatUrl);
      }
      showToast(
        isArabic
          ? 'تم نسخ رابط المحادثة إلى الحافظة بنجاح 🔗'
          : 'Chat link copied to clipboard 🔗',
        '📋'
      );
    } catch {
      showToast(chatUrl, '📋');
    }
  };

  const handleShareChat = async () => {
    const chatUrl = getChatUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: activeChat.title,
          text: isArabic ? `انضم إلى ${activeChat.title} على تيليجرام` : `Join ${activeChat.title} on Telegram`,
          url: chatUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    handleCopyLink();
  };

  const handleLeaveConfirm = async () => {
    await GroupActionsHelper.leaveChatOrChannel(
      0,
      activeChat,
      () => {
        leaveGroup(activeChat.id);
      },
      () => {
        leaveGroup(activeChat.id);
      }
    );
  };

  return (
    <div
      id="tg-chat-header"
      className="h-14 px-3 flex items-center justify-between border-b select-none shrink-0 z-10 transition-colors"
      style={{
        backgroundColor: 'var(--tg-theme-surface)',
        borderColor: 'var(--tg-theme-border)',
      }}
    >
      {/* Left side: Back on mobile + Avatar + Title & Status */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Back button for mobile view */}
        <button
          id="tg-header-back-button"
          onClick={() => setActiveChatId(null)}
          className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-200 rounded-full focus:outline-none"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>

        {/* Avatar */}
        <div
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-[#8A2BE2] to-[#FF69B4] text-white font-bold text-base cursor-pointer shrink-0 shadow-sm transition-transform active:scale-95"
        >
          {isSavedMessages ? (
            <div className="w-full h-full bg-[#8A2BE2] flex items-center justify-center">
              <Bookmark className="w-5 h-5 fill-white text-white" />
            </div>
          ) : activeChat.avatar ? (
            <img
              src={activeChat.avatar}
              alt={activeChat.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{activeChat.title.charAt(0).toUpperCase()}</span>
          )}

          {activeChat.type === 'private' && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--tg-theme-surface)] rounded-full" />
          )}
        </div>

        {/* Title & Subtitle */}
        <div
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className="min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1">
            {activeChat.isSecret && (
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span
              className={`font-bold text-sm truncate ${
                activeChat.isSecret ? 'text-emerald-400' : ''
              }`}
              style={{
                color: activeChat.isSecret ? '#34d399' : 'var(--tg-theme-bubble-in-text)',
              }}
            >
              {activeChat.title}
            </span>
            {activeChat.isVerified && (
              <BadgeCheck className="w-4 h-4 text-[#2481cc] shrink-0 fill-[#2481cc]/20" />
            )}
            {(activeChat.type === 'group' || activeChat.type === 'supergroup') && chatOnline > 0 && (
              <span className="text-xs font-normal text-emerald-400/90 ml-1 rtl:mr-1 shrink-0">
                ({chatOnline} {isArabic ? 'متصل' : 'online'})
              </span>
            )}
          </div>
          <div className="text-xs text-sky-400/90 truncate font-medium">
            {isTyping ? (
              <span className="text-[#2481cc] font-medium flex items-center gap-1.5 animate-pulse">
                <span className="inline-flex gap-0.5 items-center">
                  <span className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-bounce" />
                </span>
                <span>
                  {activeTyping?.action === 'record_audio'
                    ? (isArabic ? 'يسجل رسالة صوتية...' : 'recording voice message...')
                    : (isArabic ? 'جاري الكتابة...' : 'typing...')}
                </span>
              </span>
            ) : activeChat.isSecret ? (
              <span className="text-emerald-300 font-mono text-[11px]">
                🔒 E2EE Secret Chat {activeChat.ttlSeconds ? `(${activeChat.ttlSeconds}s TTL)` : ''}
              </span>
            ) : (
              getSubtitle()
            )}
          </div>
        </div>
      </div>

      {/* Right side action icons */}
      <div className="flex items-center gap-1 text-gray-400">
        {activeChat.isSecret && (
          <button
            id="tg-secret-chat-info-btn"
            onClick={() => setActiveModal('secret-chat-info' as any)}
            className="p-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-400/30 transition-colors"
            title="إعدادات التشفير التام والمؤقت الذاتي"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {activeChat.type === 'group' && (
          <>
            <button
              id="tg-group-topics-btn"
              onClick={() => setActiveModal('forum-topics' as any)}
              className="p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-400/20 transition-colors"
              title={isArabic ? 'مواضيع المنتدى (Topics)' : 'Forum Topics'}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              id="tg-group-admin-btn"
              onClick={() => setActiveModal('group-admin' as any)}
              className="p-2 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-400/20 transition-colors"
              title="إدارة المجموعة والصلاحيات (TLRPC)"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </>
        )}

        {!isSavedMessages && activeChat.type !== 'channel' && (
          <>
            <button
              id="tg-start-audio-call"
              onClick={() => startCall(false)}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 hover:text-white transition-colors"
              title={isArabic ? 'مكالمة صوتية مشفرة' : 'Encrypted Voice Call'}
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              id="tg-start-video-call"
              onClick={() => startCall(true)}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 hover:text-white transition-colors"
              title={isArabic ? 'مكالمة فيديو مشفرة' : 'Encrypted Video Call'}
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Telegram Web K Search in chat button */}
        <button
          id="tg-header-search-btn"
          onClick={() => setActiveModal('search-messages' as any)}
          className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 hover:text-white transition-colors"
          title={isArabic ? 'البحث في المحادثة' : 'Search in chat'}
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          id="tg-toggle-right-panel"
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className={`p-2 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors ${
            isRightPanelOpen ? 'text-[#2481cc] bg-white/5' : 'hover:text-white'
          }`}
          title={isArabic ? 'معلومات المحادثة' : 'Chat Info'}
        >
          <PanelRight className="w-4 h-4" />
        </button>

        {/* More Options Dropdown matching Telegram Web K exactly */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`p-2 rounded-full hover:bg-white/10 active:bg-white/15 hover:text-white transition-colors ${
              isDropdownOpen ? 'bg-white/10 text-white' : ''
            }`}
            title={isArabic ? 'المزيد من الخيارات' : 'More options'}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute right-0 rtl:right-auto rtl:left-0 top-11 w-60 bg-[#17212b] border border-[#2b394a] rounded-2xl shadow-2xl py-1.5 z-50 text-xs font-semibold text-gray-200 animate-in fade-in zoom-in-95"
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              {/* 1. Chat Info */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsRightPanelOpen(true);
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  {activeChat.type === 'channel'
                    ? isArabic ? 'معلومات القناة' : 'Channel Info'
                    : activeChat.type === 'group' || activeChat.type === 'supergroup'
                    ? isArabic ? 'معلومات المجموعة' : 'Group Info'
                    : isArabic ? 'معلومات المحادثة' : 'Chat Info'}
                </span>
              </button>

              {/* 2. Mute / Unmute notifications */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  toggleMuteChat(activeChat.id);
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                {activeChat.isMuted ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isArabic ? 'إلغاء كتم الإشعارات' : 'Unmute Notifications'}</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{isArabic ? 'كتم الإشعارات' : 'Mute Notifications'}</span>
                  </>
                )}
              </button>

              {/* 3. Search in Chat */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setActiveModal('search-messages' as any);
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                <Search className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{isArabic ? 'البحث في المحادثة' : 'Search in Chat'}</span>
              </button>

              {/* 4. Copy Link */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleCopyLink();
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{isArabic ? 'نسخ الرابط' : 'Copy Link'}</span>
              </button>

              {/* 5. Share Link */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleShareChat();
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{isArabic ? 'مشاركة الرابط' : 'Share Link'}</span>
              </button>

              {/* 6. Export Chat History */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setActiveModal('export-chat');
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{isArabic ? 'تصدير سجل المحادثة' : 'Export Chat History'}</span>
              </button>

              {/* Mini Apps */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setActiveModal('mini-apps');
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isArabic ? 'تطبيقات وألعاب (Mini Apps)' : 'Telegram Mini Apps'}</span>
              </button>

              {/* Divider */}
              <div className="h-px bg-white/10 my-1" />

              {/* 7. Clear History (مسح السجل) */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsClearModalOpen(true);
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Eraser className="w-4 h-4 shrink-0" />
                <span>{isArabic ? 'مسح السجل' : 'Clear History'}</span>
              </button>

              {/* 8. Report (الإبلاغ) */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-sky-400 hover:text-sky-300 transition-colors"
              >
                <Flag className="w-4 h-4 shrink-0" />
                <span>{isArabic ? 'إبلاغ' : 'Report'}</span>
              </button>

              {/* 9. Leave Group / Leave Channel */}
              {(activeChat.type === 'group' || activeChat.type === 'supergroup' || activeChat.type === 'channel') && (
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsLeaveModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0 rtl:rotate-180" />
                  <span>
                    {activeChat.type === 'channel'
                      ? isArabic ? 'مغادرة القناة' : 'Leave Channel'
                      : isArabic ? 'مغادرة المجموعة' : 'Leave Group'}
                  </span>
                </button>
              )}

              {/* 10. Delete Group Permanently (for admins/owners) */}
              {(activeChat.type === 'group' || activeChat.type === 'supergroup') && (
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setConfirmDialog({
                      type: 'delete',
                      title: isArabic ? 'حذف المجموعة نهائياً' : 'Delete Group Permanently',
                      description: isArabic
                        ? `سيتم حذف المجموعة "${activeChat.title}" نهائياً من خوادم تيليجرام وسجل جميع الأعضاء.`
                        : `Permanently delete group "${activeChat.title}" for all members.`,
                      confirmText: isArabic ? 'حذف نهائي' : 'Delete',
                      action: () => deleteGroup(activeChat.id),
                    });
                  }}
                  className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-red-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>{isArabic ? 'حذف المجموعة نهائياً' : 'Delete Group'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Chat Confirmation Modal */}
      <ClearChatModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        chatId={activeChat.id}
        chatTitle={activeChat.title}
        chatType={activeChat.type as any}
        onConfirm={(alsoForOthers) => {
          clearChatHistory(activeChat.id);
          if (alsoForOthers && (activeChat.type === 'group' || activeChat.type === 'supergroup')) {
            deleteGroupMessages?.(activeChat.id);
          }
        }}
      />

      {/* Report Chat Modal */}
      <ChatReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        chatId={activeChat.id}
        chatTitle={activeChat.title}
        chatType={activeChat.type as any}
      />

      {/* Leave Group / Channel Modal */}
      <LeaveChatModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        chatId={activeChat.id}
        chatTitle={activeChat.title}
        chatType={activeChat.type as any}
        onConfirm={handleLeaveConfirm}
      />

      {/* Generic Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 rounded-xl transition-colors"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition-colors"
              >
                {confirmDialog.confirmText || (isArabic ? 'تأكيد الإجراء' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
