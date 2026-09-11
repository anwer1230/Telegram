import React, { useState } from 'react';
import {
  X,
  Megaphone,
  Users,
  BadgeCheck,
  Check,
  Sparkles,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { Chat } from '../../types';
import { notificationsController } from '../../core/NotificationsController';
import { SecureSessionStorage } from '../../utils/SecureSessionStorage';

export interface InviteModalData {
  id: string;
  type: 'channel' | 'group' | 'private';
  title: string;
  username?: string;
  avatar: string;
  memberCount?: number;
  onlineCount?: number;
  description?: string;
  isVerified?: boolean;
  inviteHash?: string;
}

export const JoinInviteModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    chats,
    setActiveChatId,
    showToast,
    settings,
    currentUser,
    syncInitializationRoutine,
  } = useTelegram();

  const [inviteData, setInviteData] = useState<InviteModalData | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Read preview data from window event or modal state
  React.useEffect(() => {
    const handleOpenInvite = (e: CustomEvent<InviteModalData>) => {
      setInviteData(e.detail);
      setActiveModal('new-chat' as any); // Or use custom identifier
    };

    window.addEventListener('tg-open-invite' as any, handleOpenInvite);
    return () => window.removeEventListener('tg-open-invite' as any, handleOpenInvite);
  }, [setActiveModal]);

  if (!inviteData) return null;

  const isArabic = settings.language === 'ar';
  const isAlreadyMember = chats.some((c) => c.id === inviteData.id || c.username === inviteData.username);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      // استخراج الجلسة ورقم الهاتف الحقيقي من التخزين الآمن
      const sessionString = SecureSessionStorage.getItem<string>('tg_session_string')
        || localStorage.getItem('tg_session_string')
        || localStorage.getItem('telegram_session_string')
        || '';
      const phone = SecureSessionStorage.getItem<string>('tg_phone')
        || localStorage.getItem('tg_phone')
        || localStorage.getItem('telegram_phone')
        || currentUser?.phone
        || '';

      if (!sessionString || !phone) {
        showToast(isArabic ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first', '❌');
        setIsJoining(false);
        return;
      }

      const res = await fetch('/api/telegram/links/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteInfo: inviteData,
          sessionString,
          phone,
          hash: (inviteData as any)?.hash || inviteData?.inviteHash,
          channelId: inviteData.id,
          type: inviteData.type || 'public',
        }),
      });

      if (!res.ok) {
        // التحقق الصارم من حالة الاستجابة ومنع إطلاق أي أحداث نجاح وهمية
        let errorMessage = isArabic ? 'فشل الانضمام' : 'Failed to join';
        try {
          const errorData = await res.json();
          if (res.status === 401 || errorData.error === 'AUTH_KEY_UNREGISTERED') {
            errorMessage = isArabic ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first';
          } else if (res.status === 410 || errorData.error === 'INVITE_HASH_EXPIRED') {
            errorMessage = isArabic ? 'رابط الدعوة منتهي الصلاحية' : 'Invite link expired';
          } else if (res.status === 429 || errorData.error === 'FLOOD_WAIT') {
            errorMessage = isArabic
              ? `الانتظار ${errorData.seconds || 60} ثانية قبل المحاولة مرة أخرى`
              : `Wait ${errorData.seconds || 60}s before retrying`;
          } else {
            errorMessage = errorData.message || errorData.error || (isArabic ? 'حدث خطأ أثناء الانضمام' : 'Failed to join');
          }
        } catch {
          errorMessage = isArabic ? 'حدث خطأ في الاتصال بالخادم' : 'Server connection error';
        }
        showToast(errorMessage, '❌');
        return; // منع إطلاق حدث tg-joined-chat نهائياً عند الفشل
      }

      const data = await res.json();

      // التأكد الصارم من أن الخادم أعاد نجاحاً فعلياً وبيانات المحادثة المنضم إليها
      if (data && data.success && data.joinedChat) {
        // إطلاق حدث الانضمام لتحديث الواجهة
        const customEvent = new CustomEvent('tg-joined-chat', { detail: data.joinedChat });
        window.dispatchEvent(customEvent);

        // استدعاء المزامنة السحابية الفورية من خوادم تيليجرام (messages.getDialogs)
        try {
          if (syncInitializationRoutine) {
            await syncInitializationRoutine(phone, sessionString);
          }
        } catch (syncErr) {
          console.warn('[JoinInviteModal] Cloud sync warning:', syncErr);
        }

        notificationsController.postNotification({
          category: 'channel_post',
          title: isArabic ? 'تم الانضمام بنجاح 🎉' : 'Joined Successfully 🎉',
          body: data.joinedChat.title || inviteData.title,
          avatar: data.joinedChat.avatar || inviteData.avatar,
          chatId: data.joinedChat.id || inviteData.id,
        });

        showToast(
          isArabic
            ? `تم الانضمام إلى ${data.joinedChat.title} بنجاح!`
            : `Joined "${data.joinedChat.title}" successfully!`,
          '✅'
        );
        setInviteData(null);
      } else {
        // حالة استجابة غير ناجحة
        showToast(data?.message || data?.error || (isArabic ? 'فشل الانضمام' : 'Failed to join'), '❌');
      }
    } catch {
      showToast(isArabic ? 'حدث خطأ في الاتصال بالخادم' : 'Server connection error', '❌');
    } finally {
      setIsJoining(false);
    }
  };

  const handleOpenExisting = () => {
    const existing = chats.find((c) => c.id === inviteData.id || c.username === inviteData.username);
    if (existing) {
      setActiveChatId(existing.id);
    }
    setInviteData(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        id="tg-invite-backdrop"
        onClick={() => setInviteData(null)}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div
        id="tg-invite-modal"
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border z-10 animate-in zoom-in-95 duration-150 flex flex-col p-6 text-center"
        style={{
          backgroundColor: 'var(--tg-theme-surface)',
          borderColor: 'var(--tg-theme-border)',
          color: 'var(--tg-theme-bubble-in-text)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => setInviteData(null)}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="mx-auto w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-[#2481cc]/30 shadow-lg relative flex items-center justify-center bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-3xl">
          {inviteData.avatar ? (
            <img
              src={inviteData.avatar}
              alt={inviteData.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{inviteData.title.charAt(0)}</span>
          )}
        </div>

        {/* Title */}
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <h3 className="font-bold text-lg leading-tight truncate">{inviteData.title}</h3>
          {inviteData.isVerified && (
            <BadgeCheck className="w-5 h-5 text-[#2481cc] fill-[#2481cc]/20 shrink-0" />
          )}
        </div>

        {/* Username / Subtitle */}
        <div className="text-xs text-sky-400 font-mono mb-2">
          {inviteData.username ? `@${inviteData.username}` : 't.me/+' + (inviteData.inviteHash || 'invite')}
        </div>

        {/* Stats: Member Count */}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 mb-4 font-medium">
          {inviteData.type === 'channel' ? (
            <span className="flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5 text-sky-400" />
              <span>{(inviteData.memberCount || 12500).toLocaleString()} {isArabic ? 'مشترك' : 'subscribers'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{(inviteData.memberCount || 840).toLocaleString()} {isArabic ? 'عضو' : 'members'}</span>
              {inviteData.onlineCount && (
                <span className="text-emerald-400">({inviteData.onlineCount} {isArabic ? 'متصل' : 'online'})</span>
              )}
            </span>
          )}
        </div>

        {/* Description */}
        {inviteData.description && (
          <div className="p-3 rounded-2xl bg-black/15 border border-white/5 text-xs text-gray-300 mb-6 leading-relaxed text-left rtl:text-right max-h-28 overflow-y-auto">
            {inviteData.description}
          </div>
        )}

        {/* Action Button */}
        {isAlreadyMember ? (
          <button
            onClick={handleOpenExisting}
            className="w-full py-3 rounded-2xl bg-[#2481cc] hover:bg-[#1c6fad] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <span>{isArabic ? 'فتح المحادثة' : 'Open Chat'}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled={isJoining}
            onClick={handleJoin}
            className="w-full py-3 rounded-2xl bg-[#2481cc] hover:bg-[#1c6fad] disabled:opacity-50 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            {isJoining ? (
              <span>{isArabic ? 'جارٍ الانضمام...' : 'Joining...'}</span>
            ) : (
              <>
                <span>
                  {inviteData.type === 'channel'
                    ? isArabic ? 'الانضمام إلى القناة' : 'Join Channel'
                    : isArabic ? 'الانضمام إلى المجموعة' : 'Join Group'}
                </span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
