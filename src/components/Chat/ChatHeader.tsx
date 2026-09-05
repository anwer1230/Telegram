import React, { useState } from 'react';
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
  Database,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { ChatInfoManager } from '../../core/ChatInfoManager';
import { GroupActionsHelper } from '../../core/GroupActionsHelper';

export const ChatHeader: React.FC = () => {
  const {
    activeChat,
    setActiveChatId,
    startCall,
    isRightPanelOpen,
    setIsRightPanelOpen,
    setActiveModal,
    typingChatId,
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
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'leave' | 'clear' | 'delete';
    title: string;
    description: string;
    confirmText?: string;
    action: () => void;
  } | null>(null);

  if (!activeChat) return null;

  const isSavedMessages = activeChat.type === 'saved';
  const isArabic = settings.language === 'ar';

  const subtitleInfo = ChatInfoManager.getInstance().getSubtitle(activeChat, settings.language || 'ar');

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
    return subtitleInfo.subtitleText;
  };

  const handleShareChat = () => {
    const chatUrl = activeChat.username
      ? `https://t.me/${activeChat.username}`
      : `https://t.me/c/${activeChat.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(chatUrl);
      showToast(isArabic ? 'تم نسخ رابط المحادثة إلى الحافظة' : 'Chat link copied to clipboard', '🔗');
    } else {
      showToast(chatUrl, '🔗');
    }
  };

  const handleLeaveWithHelper = () => {
    const alertConfig = GroupActionsHelper.getLeaveConfirmationConfig(activeChat, settings.language || 'ar');
    setConfirmDialog({
      type: 'leave',
      title: alertConfig.title,
      description: alertConfig.message,
      confirmText: alertConfig.confirmText,
      action: async () => {
        await GroupActionsHelper.leaveChatOrChannel(
          0,
          activeChat,
          () => {
            leaveGroup(activeChat.id);
          },
          (err) => {
            leaveGroup(activeChat.id);
          }
        );
      },
    });
  };

  return (
    <div
      id="tg-chat-header"
      className="h-14 px-3 flex items-center justify-between border-b select-none shrink-0 z-10"
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
          className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-200 rounded-full"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>

        {/* Avatar */}
        <div
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold text-base cursor-pointer shrink-0 shadow-sm"
        >
          {isSavedMessages ? (
            <div className="w-full h-full bg-[#2481cc] flex items-center justify-center">
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
          </div>
          <div className="text-xs text-sky-400/90 truncate font-medium">
            {typingChatId === activeChat.id ? (
              <span className="text-[#2481cc] font-medium flex items-center gap-1.5 animate-pulse">
                <span>{isArabic ? 'يكتب الآن...' : 'typing...'}</span>
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

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute right-0 rtl:right-auto rtl:left-0 top-10 w-56 bg-[#17212b] border border-[#2b394a] rounded-2xl shadow-2xl py-1.5 z-50 text-xs font-semibold text-gray-200 animate-in fade-in zoom-in-95"
              onClick={() => setIsDropdownOpen(false)}
            >
              {/* menu_search: Search in Chat */}
              <button
                onClick={() => setActiveModal('search-messages' as any)}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
              >
                <Search className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{isArabic ? 'البحث في المحادثة' : 'Search in Chat'}</span>
              </button>

              {/* menu_mute: Mute / Unmute notifications */}
              <button
                onClick={() => toggleMuteChat(activeChat.id)}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
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

              {/* menu_share: Share chat or invite link */}
              <button
                onClick={handleShareChat}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
              >
                <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{isArabic ? 'مشاركة الرابط' : 'Share Link'}</span>
              </button>

              {/* Export Chat */}
              <button
                onClick={() => setActiveModal('export-chat')}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
              >
                <Download className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{isArabic ? 'تصدير سجل المحادثة' : 'Export Chat History'}</span>
              </button>

              {/* Mini Apps */}
              <button
                onClick={() => setActiveModal('mini-apps')}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isArabic ? 'تطبيقات وألعاب (Mini Apps)' : 'Telegram Mini Apps'}</span>
              </button>

              {/* IndexedDB Cache Status */}
              <button
                onClick={async () => {
                  const count = await messageCache.getCachedMessageCount(activeChat.id);
                  showToast(
                    isArabic
                      ? `تم تخزين ${count} رسالة محلياً في IndexedDB بدون استهلاك شبكة`
                      : `IndexedDB: ${count} cached messages offline`,
                    '💾'
                  );
                }}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
              >
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isArabic ? 'التخزين المؤقت المحلي (IndexedDB)' : 'Local Cache (IndexedDB)'}</span>
              </button>

              <div className="h-px bg-white/10 my-1" />

              {/* menu_clear_history: Clear messages / Delete messages */}
              <button
                onClick={() => {
                  setConfirmDialog({
                    type: 'clear',
                    title: isArabic ? 'مسح سجل الرسائل' : 'Clear Chat History',
                    description: isArabic
                      ? 'هل تريد بالتأكيد تفريغ ومسح جميع الرسائل من هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.'
                      : 'Are you sure you want to clear all history from this chat?',
                    confirmText: isArabic ? 'مسح السجل' : 'Clear History',
                    action: () => clearChatHistory(activeChat.id),
                  });
                }}
                className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-amber-400 hover:text-amber-300"
              >
                <Eraser className="w-4 h-4 shrink-0" />
                <span>{isArabic ? 'مسح السجل' : 'Clear History'}</span>
              </button>

              {/* menu_leave: Leave group / channel option with GroupActionsHelper */}
              {(activeChat.type === 'group' || activeChat.type === 'channel') && (
                <button
                  onClick={handleLeaveWithHelper}
                  className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-rose-400 hover:text-rose-300"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>
                    {activeChat.type === 'channel'
                      ? isArabic ? 'مغادرة القناة' : 'Leave Channel'
                      : isArabic ? 'مغادرة المجموعة' : 'Leave Group'}
                  </span>
                </button>
              )}

              {/* Delete group permanently */}
              {activeChat.type === 'group' && (
                <button
                  onClick={() => {
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
                  className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>{isArabic ? 'حذف المجموعة نهائياً' : 'Delete Group'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
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
