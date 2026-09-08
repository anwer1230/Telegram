import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Bell,
  Image as ImageIcon,
  FileText,
  Music,
  Mic,
  Link,
  Users,
  Shield,
  BadgeCheck,
  Bookmark,
  Share2,
  Download,
  Phone,
  Video,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export const ChatInfoPanel: React.FC = () => {
  const {
    activeChat,
    isRightPanelOpen,
    setIsRightPanelOpen,
    messages,
    activeChatId,
    setViewerMedia,
    setActiveModal,
    startCall,
    openUserProfile,
    currentUser,
    settings,
  } = useTelegram();

  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'files' | 'voice' | 'links' | 'members'>('media');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const isArabic = settings.language === 'ar';

  // Gemini AI Chat Summarizer State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    text: string;
    count: number;
    timestamp: string;
  } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    setSummaryData(null);
    setSummaryError(null);
    setIsSummarizing(false);
  }, [activeChatId]);

  const handleCopySummary = async () => {
    if (!summaryData?.text) return;
    try {
      await navigator.clipboard.writeText(summaryData.text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (_) {}
  };

  const handleSummarizeChat = async () => {
    if (isSummarizing || !activeChat) return;
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const currentMessages = (activeChatId && messages[activeChatId]) || [];
      const last100 = currentMessages.slice(-100);
      const payloadMessages = last100.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        text: m.text,
        timestamp: m.timestamp,
        out: m.out || m.isOutgoing,
        media: m.media ? { type: m.media.type } : undefined,
      }));

      const res = await fetch('/api/telegram/chat/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat.id,
          chatTitle: activeChat.title,
          messages: payloadMessages,
          language: settings.language || 'ar',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to generate summary');
      }

      setSummaryData({
        text: data.summary,
        count: data.messageCount || payloadMessages.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setIsSummaryExpanded(true);
    } catch (err: any) {
      console.error('[ChatInfoPanel] Summarize error:', err);
      setSummaryError(err.message || 'حدث خطأ أثناء تلخيص المحادثة بواسطة الذكاء الاصطناعي');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Real Group Members State (GramJS MTProto backed)
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!activeChat || activeChat.type !== 'group') return;
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const sessionString = localStorage.getItem('tg_session_string') || localStorage.getItem('telegram_session') || '';
      const phone = localStorage.getItem('tg_phone') || '';
      const res = await fetch('/api/telegram/group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat.id,
          sessionString,
          phone,
          limit: 200,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setMembers(data.members);
      } else {
        setMembersError(data.message || (isArabic ? 'تعذر جلب قائمة أعضاء المجموعة من تيليجرام' : 'Failed to fetch members'));
      }
    } catch (err: any) {
      setMembersError(err?.message || (isArabic ? 'حدث خطأ في الاتصال بالخادم' : 'Server connection error'));
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeMediaTab === 'members' && activeChat?.type === 'group') {
      fetchMembers();
    }
  }, [activeMediaTab, activeChat?.id, isArabic]);

  if (!isRightPanelOpen || !activeChat) return null;

  const currentMessages = (activeChatId && messages[activeChatId]) || [];
  const photoMessages = currentMessages.filter((m) => m.media?.type === 'photo' && m.media?.url);
  const fileMessages = currentMessages.filter((m) => m.media?.type === 'document');
  const voiceMessages = currentMessages.filter((m) => m.media?.type === 'voice');

  const isSavedMessages = activeChat.type === 'saved';

  return (
    <div
      id="tg-right-info-panel"
      className="fixed inset-0 z-40 md:relative md:w-80 md:inset-auto md:z-10 border-l flex flex-col h-full select-none shrink-0 animate-in slide-in-from-right duration-200 rtl:slide-in-from-left rtl:border-l-0 rtl:border-r"
      style={{
        backgroundColor: 'var(--tg-theme-surface)',
        borderColor: 'var(--tg-theme-border)',
      }}
    >
      {/* Header */}
      <div className="h-14 px-3 border-b flex items-center justify-between border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            id="tg-close-right-panel-mobile"
            onClick={() => setIsRightPanelOpen(false)}
            className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
            title={isArabic ? 'رجوع' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <span className="font-bold text-sm">
            {isArabic ? 'معلومات المحادثة' : 'User Info'}
          </span>
        </div>
        <button
          onClick={() => setIsRightPanelOpen(false)}
          className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Overview */}
      <div className="p-4 flex flex-col items-center text-center border-b border-white/10">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-3 bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
          {isSavedMessages ? (
            <Bookmark className="w-10 h-10 fill-white text-white" />
          ) : activeChat.avatar ? (
            <img
              src={activeChat.avatar}
              alt={activeChat.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{activeChat.title.charAt(0)}</span>
          )}
        </div>

        <div className="flex items-center gap-1 font-bold text-base">
          <span>{activeChat.title}</span>
          {activeChat.isVerified && (
            <BadgeCheck className="w-4 h-4 text-[#2481cc] fill-[#2481cc]/20" />
          )}
        </div>

        {activeChat.username && (
          <div className="text-xs text-sky-400 font-mono mt-0.5">
            @{activeChat.username}
          </div>
        )}

        {activeChat.description && (
          <p className="text-xs text-gray-400 mt-2 px-2 leading-relaxed">
            {activeChat.description}
          </p>
        )}

        {/* Action Buttons: Voice / Video Call & Export Chat */}
        <div className="flex items-center gap-2 mt-4 w-full justify-center">
          <button
            onClick={() => startCall(false)}
            className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isArabic ? 'صوتي' : 'Call'}</span>
          </button>
          <button
            onClick={() => startCall(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Video className="w-3.5 h-3.5 text-sky-400" />
            <span>{isArabic ? 'فيديو' : 'Video'}</span>
          </button>
          <button
            onClick={() => setActiveModal('export-chat')}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            title={isArabic ? 'تصدير السجل' : 'Export Chat'}
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        {/* Summarize Chat Button (Gemini API) */}
        <div className="w-full mt-3">
          <button
            id="tg-summarize-chat-btn"
            onClick={handleSummarizeChat}
            disabled={isSummarizing}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-sky-600/20 hover:from-purple-600/30 hover:via-indigo-600/30 hover:to-sky-600/30 border border-purple-500/30 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            title={isArabic ? 'تلخيص آخر 100 رسالة عبر الذكاء الاصطناعي Gemini' : 'Summarize last 100 messages with Gemini AI'}
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-purple-300">
                  {isArabic ? 'جاري التلخيص عبر Gemini...' : 'Summarizing with Gemini...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  {isArabic ? 'تلخيص المحادثة' : 'Summarize Chat'}
                </span>
                <span className="text-[10px] bg-purple-500/25 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/20 font-mono">
                  Gemini AI
                </span>
              </>
            )}
          </button>
        </div>

        {/* Error Feedback */}
        {summaryError && (
          <div
            id="tg-summary-error-box"
            className="w-full mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] text-rose-300 flex items-start gap-2 text-start"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p>{summaryError}</p>
              <button
                onClick={() => setSummaryError(null)}
                className="mt-1 text-[10px] text-rose-400 hover:underline cursor-pointer"
              >
                {isArabic ? 'إغلاق' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        {/* AI Summary Display Card */}
        {summaryData && (
          <div
            id="tg-gemini-summary-card"
            className="w-full mt-3 rounded-xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-black/50 overflow-hidden text-xs text-start animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="p-2.5 bg-purple-900/25 border-b border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="font-bold text-[11px] text-purple-200 truncate">
                  {isArabic ? 'ملخص Gemini الذكي' : 'Gemini AI Summary'}
                </span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono shrink-0">
                  {summaryData.count} {isArabic ? 'رسالة' : 'msgs'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopySummary}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title={isArabic ? 'نسخ الملخص' : 'Copy Summary'}
                >
                  {copiedSummary ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={handleSummarizeChat}
                  disabled={isSummarizing}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title={isArabic ? 'إعادة التلخيص' : 'Regenerate'}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title={isSummaryExpanded ? (isArabic ? 'تصغير' : 'Collapse') : (isArabic ? 'توسيع' : 'Expand')}
                >
                  {isSummaryExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setSummaryData(null)}
                  className="p-1 text-gray-400 hover:text-rose-400 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title={isArabic ? 'إغلاق' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {isSummaryExpanded && (
              <div className="p-3 max-h-64 overflow-y-auto leading-relaxed text-gray-200 text-[11px] whitespace-pre-wrap select-text space-y-1">
                {summaryData.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications Switch */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold">
            {isArabic ? 'الإشعارات' : 'Notifications'}
          </span>
        </div>
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
            notificationsEnabled ? 'bg-[#2481cc]' : 'bg-gray-600'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              notificationsEnabled ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Shared Media Tabs */}
      <div className="flex border-b border-white/10 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveMediaTab('media')}
          className={`flex-1 py-2 px-2 text-center whitespace-nowrap transition-colors ${
            activeMediaTab === 'media'
              ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isArabic ? `الوسائط (${photoMessages.length})` : `Media (${photoMessages.length})`}
        </button>
        <button
          onClick={() => setActiveMediaTab('files')}
          className={`flex-1 py-2 px-2 text-center whitespace-nowrap transition-colors ${
            activeMediaTab === 'files'
              ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isArabic ? `الملفات (${fileMessages.length})` : `Files (${fileMessages.length})`}
        </button>
        <button
          onClick={() => setActiveMediaTab('voice')}
          className={`flex-1 py-2 px-2 text-center whitespace-nowrap transition-colors ${
            activeMediaTab === 'voice'
              ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isArabic ? `صوتيات (${voiceMessages.length})` : `Audio (${voiceMessages.length})`}
        </button>
        {activeChat.type === 'group' && (
          <button
            onClick={() => setActiveMediaTab('members')}
            className={`flex-1 py-2 px-2 text-center whitespace-nowrap transition-colors ${
              activeMediaTab === 'members'
                ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isArabic
              ? members.length > 0
                ? `الأعضاء (${members.length})`
                : 'الأعضاء'
              : members.length > 0
                ? `Members (${members.length})`
                : 'Members'}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeMediaTab === 'media' && (
          <div>
            {photoMessages.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-6">
                {isArabic ? 'لا توجد وسائط مشاركة' : 'No shared media'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {photoMessages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() =>
                      setViewerMedia({
                        url: m.media!.url!,
                        title: m.text || activeChat.title,
                        sender: m.senderName,
                        timestamp: m.timestamp,
                      })
                    }
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
                  >
                    <img
                      src={m.media!.url}
                      alt="shared media"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeMediaTab === 'files' && (
          <div className="space-y-2">
            {fileMessages.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-6">
                {isArabic ? 'لا توجد ملفات مشاركة' : 'No shared files'}
              </div>
            ) : (
              fileMessages.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-black/15 hover:bg-black/25 text-xs"
                >
                  <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {m.media?.fileName || m.text || 'Document.pdf'}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {m.media?.fileSize || '1.2 MB'} • {m.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeMediaTab === 'voice' && (
          <div className="space-y-2">
            {voiceMessages.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-6">
                {isArabic ? 'لا توجد رسائل صوتية' : 'No voice notes'}
              </div>
            ) : (
              voiceMessages.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-black/15 text-xs"
                >
                  <Mic className="w-5 h-5 text-sky-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">
                      {isArabic ? 'رسالة صوتية' : 'Voice message'} ({m.media?.duration || 20}s)
                    </div>
                    <div className="text-[10px] text-gray-400">{m.timestamp}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeMediaTab === 'members' && activeChat.type === 'group' && (
          <div className="space-y-2">
            {isLoadingMembers ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2.5">
                <div className="w-6 h-6 border-2 border-[#2481cc] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">
                  {isArabic ? 'جاري جلب الأعضاء الحقيقيين من تيليجرام...' : 'Fetching members from Telegram...'}
                </span>
              </div>
            ) : membersError ? (
              <div className="p-3 text-center text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2 my-2">
                <p>{membersError}</p>
                <button
                  onClick={fetchMembers}
                  className="px-3 py-1 text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded font-medium transition-colors"
                >
                  {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8">
                {isArabic ? 'لا يوجد أعضاء متوفرون حالياً' : 'No members found'}
              </div>
            ) : (
              members.map((member) => {
                const isCurrentUser = String(member.id) === String(currentUser?.id);
                const roleBadge = member.role === 'owner' ? (
                  <span className="text-[10px] text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded font-medium">
                    {member.rank || (isArabic ? 'المنشئ' : 'Owner')}
                  </span>
                ) : member.role === 'admin' ? (
                  <span className="text-[10px] text-sky-400 bg-sky-400/15 px-1.5 py-0.5 rounded font-medium">
                    {member.rank || (isArabic ? 'مشرف' : 'Admin')}
                  </span>
                ) : member.rank ? (
                  <span className="text-[10px] text-gray-400 bg-white/10 px-1 rounded">
                    {member.rank}
                  </span>
                ) : null;

                return (
                  <div
                    key={member.id}
                    onClick={() => {
                      openUserProfile({
                        id: member.id,
                        name: member.name,
                        username: member.username,
                        avatar: member.avatar,
                        bio: member.bio || '',
                        phone: member.phone || '',
                        isVerified: member.isVerified,
                        isPremium: member.isPremium,
                        isOnline: member.isOnline,
                        sourceChatId: activeChat.id,
                        sourceChatTitle: activeChat.title,
                      });
                    }}
                    className="flex items-center gap-2.5 p-2 text-xs rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{(member.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center gap-1.5 truncate">
                        <span className="truncate">{member.name}</span>
                        {isCurrentUser && (
                          <span className="text-[11px] text-gray-400 font-normal">
                            ({isArabic ? 'أنت' : 'You'})
                          </span>
                        )}
                        {roleBadge}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {member.isOnline ? (
                          <span className="text-emerald-400 font-medium">
                            {isArabic ? 'متصل الآن' : 'online'}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            {member.lastSeen || (isArabic ? 'آخر ظهور قريباً' : 'last seen recently')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
