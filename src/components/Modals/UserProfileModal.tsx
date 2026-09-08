import React from 'react';
import {
  X,
  MessageCircle,
  Phone,
  Video,
  Bell,
  BellOff,
  Copy,
  Check,
  BadgeCheck,
  Bot,
  Users,
  Share2,
  Ban,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { Chat } from '../../types';

export const UserProfileModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    selectedProfileUser,
    openPrivateChat,
    setActiveChatId,
    startCall,
    getCommonGroupsForUser,
    settings,
    setViewerMedia,
    showToast,
    blockUser,
  } = useTelegram();

  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);

  if (activeModal !== 'user-profile' || !selectedProfileUser) {
    return null;
  }

  const isArabic = settings.language === 'ar';
  const user = selectedProfileUser;
  const commonGroups: Chat[] = getCommonGroupsForUser(user.id, user.name);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(isArabic ? `تم نسخ ${label}` : `Copied ${label}`, '📋');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenDirectChat = () => {
    openPrivateChat(user.id, user.name, user.avatar, user.username);
    setActiveModal('none');
    showToast(
      isArabic ? `تم فتح محادثة مباشرة مع ${user.name}` : `Opened chat with ${user.name}`,
      '💬'
    );
  };

  const handleViewAvatarFull = () => {
    if (user.avatar) {
      setViewerMedia({
        url: user.avatar,
        title: user.name,
        sender: user.username ? `@${user.username}` : user.name,
        timestamp: user.isOnline ? (isArabic ? 'متصل الآن' : 'Online') : (isArabic ? 'آخر ظهور مؤخراً' : 'Last seen recently'),
      });
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setActiveChatId(groupId);
    setActiveModal('none');
  };

  return (
    <div
      id="tg-user-profile-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setActiveModal('none')}
    >
      <div
        className="relative w-full max-w-md bg-[var(--tg-theme-surface)] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--tg-theme-surface)',
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('none')}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            >
              {isArabic ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <h3 className="font-semibold text-base">
              {isArabic ? 'الملف الشخصي' : 'User Profile'}
            </h3>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 pb-4">
          {/* Main User Card (Avatar + Name + Status) */}
          <div className="p-5 flex flex-col items-center text-center bg-gradient-to-b from-sky-900/20 to-transparent">
            {/* Avatar with click to view */}
            <div className="relative group/avatar cursor-pointer mb-3" onClick={handleViewAvatarFull}>
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-sky-500/30 shadow-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold transition-transform group-hover/avatar:scale-105">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {user.isOnline && (
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-3 border-[var(--tg-theme-surface)] rounded-full ring-2 ring-emerald-400/50" />
              )}
            </div>

            {/* Name + Badges */}
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h2 className="text-xl font-bold text-white tracking-wide">{user.name}</h2>
              {user.isVerified && (
                <span title="موثق"><BadgeCheck className="w-5 h-5 text-sky-400 fill-sky-400/20" /></span>
              )}
              {user.isBot && (
                <span title="Bot"><Bot className="w-4 h-4 text-emerald-400" /></span>
              )}
              {user.isPremium && (
                <span title="Telegram Premium"><Sparkles className="w-4 h-4 text-amber-400" /></span>
              )}
            </div>

            {/* Online Status */}
            <p className="text-xs text-sky-400 font-medium">
              {user.isOnline
                ? isArabic
                  ? 'متصل الآن'
                  : 'online'
                : user.lastSeen || (isArabic ? 'آخر ظهور مؤخراً' : 'last seen recently')}
            </p>

            {/* Primary Action Buttons (Direct Chat, Call, Video, Mute) */}
            <div className="grid grid-cols-4 gap-2 w-full mt-5 px-2">
              {/* Direct Message (محادثة مباشرة) */}
              <button
                id="btn-profile-direct-chat"
                onClick={handleOpenDirectChat}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b3] active:scale-95 text-white transition-all shadow-md shadow-sky-900/30 group"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold truncate">
                  {isArabic ? 'محادثة' : 'Message'}
                </span>
              </button>

              {/* Call */}
              <button
                onClick={() => {
                  startCall(false);
                  setActiveModal('none');
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-200 hover:text-white transition-all group"
              >
                <Phone className="w-5 h-5 group-hover:scale-110 text-emerald-400 transition-transform" />
                <span className="text-[11px] font-medium truncate">
                  {isArabic ? 'اتصال' : 'Call'}
                </span>
              </button>

              {/* Video */}
              <button
                onClick={() => {
                  startCall(true);
                  setActiveModal('none');
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-200 hover:text-white transition-all group"
              >
                <Video className="w-5 h-5 group-hover:scale-110 text-sky-400 transition-transform" />
                <span className="text-[11px] font-medium truncate">
                  {isArabic ? 'فيديو' : 'Video'}
                </span>
              </button>

              {/* Mute */}
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  showToast(
                    isMuted
                      ? isArabic
                        ? 'تم تفعيل الإشعارات'
                        : 'Unmuted notifications'
                      : isArabic
                      ? 'تم كتم الإشعارات'
                      : 'Muted notifications',
                    isMuted ? '🔔' : '🔕'
                  );
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-200 hover:text-white transition-all group"
              >
                {isMuted ? (
                  <BellOff className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                ) : (
                  <Bell className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[11px] font-medium truncate">
                  {isMuted ? (isArabic ? 'مكتوم' : 'Muted') : (isArabic ? 'كتم' : 'Mute')}
                </span>
              </button>
            </div>
          </div>

          {/* User Details & Info (Username, Bio, Phone) */}
          <div className="p-4 space-y-3 text-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              {isArabic ? 'المعلومات' : 'Information'}
            </h4>

            {/* Username / Handle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div>
                <span className="text-xs text-gray-400 block mb-0.5">
                  {isArabic ? 'المعرف (Username)' : 'Username'}
                </span>
                <span className="font-mono text-sky-400 font-semibold">
                  @{user.username || user.name.toLowerCase().replace(/\s+/g, '_')}
                </span>
              </div>
              <button
                onClick={() =>
                  handleCopy(`@${user.username || user.name.toLowerCase().replace(/\s+/g, '_')}`, isArabic ? 'المعرف' : 'username')
                }
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-sky-400 transition-colors"
                title="نسخ المعرف"
              >
                {copiedField === (isArabic ? 'المعرف' : 'username') ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Bio / About */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
              <div>
                <span className="text-xs text-gray-400 block mb-0.5">
                  {isArabic ? 'النبذة التعريفية (Bio)' : 'Bio'}
                </span>
                <p className="text-gray-200 text-xs leading-relaxed">
                  {user.bio || (isArabic ? 'مستخدم نشط على سحابة تيليجرام 🚀' : 'Active Telegram user 🚀')}
                </p>
              </div>
            </div>

            {/* Phone (Optional or default) */}
            {user.phone && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div>
                  <span className="text-xs text-gray-400 block mb-0.5">
                    {isArabic ? 'رقم الهاتف' : 'Phone'}
                  </span>
                  <span className="font-mono text-gray-200 text-xs">{user.phone}</span>
                </div>
                <button
                  onClick={() => handleCopy(user.phone!, isArabic ? 'رقم الهاتف' : 'phone')}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {copiedField === (isArabic ? 'رقم الهاتف' : 'phone') ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Common Groups Section (عدد المجموعات المشتركة مع المستخدم) */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>
                  {isArabic
                    ? `المجموعات المشتركة (${commonGroups.length})`
                    : `Groups in Common (${commonGroups.length})`}
                </span>
              </div>
              <span className="text-[11px] text-emerald-400/90 font-medium">
                {isArabic
                  ? `${commonGroups.length} مجموعات مشتركة مع المستخدم`
                  : `${commonGroups.length} shared groups`}
              </span>
            </div>

            {commonGroups.length > 0 ? (
              <div className="space-y-1.5">
                {commonGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-sky-500/15 border border-white/5 hover:border-sky-500/30 transition-all text-left rtl:text-right group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-cyan-600 to-sky-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {group.avatar ? (
                          <img
                            src={group.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{group.title.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-gray-200 group-hover:text-sky-400 truncate block">
                          {group.title}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate block">
                          {group.type === 'channel'
                            ? (isArabic ? 'قناة تيليجرام' : 'Channel')
                            : (isArabic ? 'مجموعة مشتركة' : 'Group chat')}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-sky-400 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-gray-400">
                {isArabic
                  ? 'لا توجد مجموعات مشتركة أخرى مع هذا المستخدم حالياً'
                  : 'No other common groups found'}
              </div>
            )}
          </div>

          {/* Extra Actions (Share Contact, Block) */}
          <div className="p-4 space-y-1">
            <button
              onClick={() => {
                showToast(isArabic ? 'تم نسخ بطاقة جهة الاتصال' : 'Contact shared', '📤');
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-xs font-medium"
            >
              <Share2 className="w-4 h-4 text-sky-400" />
              <span>{isArabic ? 'مشاركة جهة الاتصال' : 'Share Contact'}</span>
            </button>
            <button
              onClick={() => {
                blockUser(user.id, true);
                setActiveModal('none');
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-xs font-medium"
            >
              <Ban className="w-4 h-4 text-rose-500" />
              <span>{isArabic ? 'حظر المستخدم' : 'Block User'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
