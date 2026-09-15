import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Radio,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Send,
  Copy,
  Check,
  Trash2,
  Terminal,
  Activity,
  ShieldCheck,
  Layers,
  Smartphone,
  Eye,
  Info,
  Flame,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { FcmPushPacket } from '../../types';
import { fcmManager } from '../../services/FcmManager';

export const FcmDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const {
    settings,
    fcmDiagnostic,
    requestPushPermission,
    testSimulateFcmPush,
    clearFcmDiagnosticHistory,
    showToast,
    activeChatId,
    currentUser,
    activeAccountId,
    chats,
  } = useTelegram();

  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [copiedToken, setCopiedToken] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [customTitle, setCustomTitle] = useState('Telegram MTProto');
  const [customBody, setCustomBody] = useState('New incoming message notification');
  const [selectedTargetDialog, setSelectedTargetDialog] = useState<string>(activeChatId || (chats[0]?.id || 'chat_durov'));
  const [isSimulating, setIsSimulating] = useState(false);
  const [isEnablingFcm, setIsEnablingFcm] = useState(false);

  const handleEnableFcm = async () => {
    setIsEnablingFcm(true);
    try {
      const res = await fcmManager.requestPermissionAndEnable();
      if (res.success) {
        showToast(
          isArabic
            ? 'تم تفعيل إشعارات الخلفية عبر FCM بنجاح 🔔'
            : 'Background notifications enabled via FCM 🔔',
          '✅'
        );
        requestPushPermission();
      } else {
        showToast(
          isArabic
            ? `تعذر تفعيل الإشعارات: ${res.error || 'تم الرفض'}`
            : `Failed to enable notifications: ${res.error}`,
          '⚠️'
        );
      }
    } finally {
      setIsEnablingFcm(false);
    }
  };

  const handleRealFcmTest = async () => {
    setIsSimulating(true);
    try {
      const res = await fcmManager.sendTestNotification({
        title: customTitle || 'تيليجرام: إشعار الخلفية',
        body: customBody || 'تم استلام الإشعار في الخلفية عبر Firebase Cloud Messaging!',
        chatId: selectedTargetDialog,
      });
      if (res.success) {
        showToast(
          isArabic ? 'تم إرسال إشعار FCM حقيقي في الخلفية' : 'Real FCM background push dispatched',
          '🚀'
        );
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToken = () => {
    if (fcmDiagnostic.token) {
      navigator.clipboard.writeText(fcmDiagnostic.token);
      setCopiedToken(true);
      showToast(isArabic ? 'تم نسخ رمز FCM بنجاح' : 'FCM Token copied to clipboard', '📋');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleTestPush = (mode: 'active' | 'custom' | 'background') => {
    setIsSimulating(true);
    let targetId = activeChatId || 'chat_durov';
    let title = 'Pavel Durov';
    let body = 'Simulated Telegram push notification via FCM';

    if (mode === 'custom') {
      targetId = selectedTargetDialog;
      title = customTitle;
      body = customBody;
    } else if (mode === 'background') {
      // Pick a chat that is NOT currently open
      const otherChat = chats.find((c) => c.id !== activeChatId) || chats[0];
      targetId = otherChat ? otherChat.id : 'chat_other';
      title = otherChat ? otherChat.title : 'External Contact';
      body = 'Background alert received while looking at another chat';
    }

    testSimulateFcmPush({
      dialog_id: targetId,
      title,
      body,
      sender_id: targetId,
      sender_name: title,
    });

    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
      case 'listening':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: isArabic ? 'متصل ونشط' : 'Listening & Active',
          dot: 'bg-emerald-400',
        };
      case 'permission_denied':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          label: isArabic ? 'الإذن مرفوض' : 'Permission Denied',
          dot: 'bg-amber-400',
        };
      case 'unsupported':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          label: isArabic ? 'غير مدعوم' : 'Unsupported',
          dot: 'bg-rose-400',
        };
      default:
        return {
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          label: status,
          dot: 'bg-blue-400',
        };
    }
  };

  const getPacketStatusBadge = (status: FcmPushPacket['status']) => {
    switch (status) {
      case 'alerted':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: isArabic ? 'تم التنبيه بنجاح' : 'Alerted (In-App / Sound)',
          icon: <BellRing className="w-3.5 h-3.5" />,
        };
      case 'suppressed_active_dialog':
        return {
          bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
          label: isArabic ? 'تم التخطي (المحادثة مفتوحة حاليًا)' : 'Suppressed (Active Chat Open)',
          icon: <Eye className="w-3.5 h-3.5" />,
        };
      case 'muted':
        return {
          bg: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
          label: isArabic ? 'مكتوم بواسطة المستخدم' : 'Muted Chat Setting',
          icon: <BellOff className="w-3.5 h-3.5" />,
        };
      case 'background_synced':
        return {
          bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          label: isArabic ? 'معالجة في الخلفية' : 'Background Sync',
          icon: <Activity className="w-3.5 h-3.5" />,
        };
      default:
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          label: status,
          icon: <Info className="w-3.5 h-3.5" />,
        };
    }
  };

  const statusInfo = getStatusBadge(fcmDiagnostic.status);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621] text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#2481cc] text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
            title={isArabic ? 'رجوع' : 'Back'}
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-base">
              {isArabic ? 'تشخيص الإشعارات و Firebase FCM' : 'FCM Push Diagnostics & Logs'}
            </span>
          </div>
        </div>

        <button
          onClick={() => handleTestPush('active')}
          disabled={isSimulating}
          className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isArabic ? 'اختبار سريع' : 'Quick Test'}</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Connection Status Card */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5288c1]" />
              <span className="text-xs font-bold text-[#5288c1] uppercase tracking-wide">
                {isArabic ? 'حالة اتصال الإشعارات' : 'FCM Connection Status'}
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}>
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-ping`} />
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-[#0e1621] p-2.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-gray-400 block">{isArabic ? 'إذن المتصفح' : 'Browser Permission'}</span>
              <span className="font-bold text-white capitalize flex items-center gap-1.5">
                {fcmDiagnostic.permissionState === 'granted' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
                {fcmDiagnostic.permissionState}
              </span>
            </div>

            <div className="bg-[#0e1621] p-2.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-gray-400 block">{isArabic ? 'المحادثة النشطة المرتبطة (dialog_id)' : 'Active Associated dialog_id'}</span>
              <span className="font-mono font-bold text-[#5288c1] truncate block">
                {activeChatId ? activeChatId : isArabic ? 'لا توجد (وضع الخلفية)' : 'None (Inbox Mode)'}
              </span>
            </div>

            <div className="bg-[#0e1621] p-2.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-gray-400 block">{isArabic ? 'معرف المستخدم النشط' : 'Active User ID'}</span>
              <span className="font-mono text-gray-200 truncate block">{currentUser.id}</span>
            </div>

            <div className="bg-[#0e1621] p-2.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-gray-400 block">{isArabic ? 'الحساب النشط' : 'Account Index'}</span>
              <span className="font-mono text-emerald-400 font-bold">#{activeAccountId}</span>
            </div>
          </div>

          {/* FCM Token Display with Copy */}
          <div className="bg-[#0e1621] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-medium">{isArabic ? 'رمز تسجيل FCM للجلسة' : 'Session Push Token'}</span>
              <button
                onClick={copyToken}
                className="text-xs text-[#5288c1] hover:text-white flex items-center gap-1 transition-colors"
              >
                {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedToken ? (isArabic ? 'تم النسخ' : 'Copied') : isArabic ? 'نسخ' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[11px] font-mono text-gray-300 bg-black/30 p-2 rounded-lg break-all select-all">
              {fcmDiagnostic.token || 'fcm_token_generating...'}
            </div>
          </div>

          {/* FCM Project Credentials & Daemon Info */}
          <div className="bg-[#0e1621] p-3 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{isArabic ? 'مشروع Firebase المرتبط' : 'Bound Firebase Project'}</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">telegramclone-de6f2</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>{isArabic ? 'رقم المرسل (Sender ID):' : 'Sender ID:'}</span>
              <span className="font-mono text-gray-200 font-semibold">920850190750</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>{isArabic ? 'خادم الخلفية (Daemon):' : 'Background Daemon:'}</span>
              <span className="font-mono text-emerald-400 font-semibold">/firebase-messaging-sw.js</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleEnableFcm}
              disabled={isEnablingFcm}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <BellRing className={`w-4 h-4 ${isEnablingFcm ? 'animate-spin' : ''}`} />
              <span>
                {isArabic ? 'تفعيل الإشعارات في الخلفية عبر FCM' : 'Enable Background FCM Push'}
              </span>
            </button>

            <button
              onClick={handleRealFcmTest}
              disabled={isSimulating}
              className="flex-1 py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] active:bg-[#195a88] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Zap className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>
                {isArabic ? 'إرسال إشعار FCM حقيقي في الخلفية' : 'Dispatch Real FCM Background Push'}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Push Simulation & Diagnostics Test Box */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-[#5288c1] uppercase tracking-wide">
              {isArabic ? 'أدوات اختبار التوجيه والتنبيه' : 'Push Routing & Delivery Simulation'}
            </span>
          </div>

          <div className="text-xs text-gray-400">
            {isArabic
              ? 'جرّب إرسال حزم إشعارات حقيقية لاختبار منطق توجيه dialog_id، وكتم المحادثة، والتنبيهات المفتوحة.'
              : 'Trigger real push packets to verify dialog_id filtering, active chat suppression, and background notification banners.'}
          </div>

          <div className="space-y-2 pt-1">
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">
                {isArabic ? 'المحادثة المستهدفة (dialog_id)' : 'Target Dialog ID'}
              </label>
              <select
                value={selectedTargetDialog}
                onChange={(e) => setSelectedTargetDialog(e.target.value)}
                className="w-full bg-[#0e1621] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5288c1]"
              >
                {chats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.id}) {c.id === activeChatId ? '• [CURRENT OPEN]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">{isArabic ? 'العنوان' : 'Title'}</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-[#0e1621] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">{isArabic ? 'نص الرسالة' : 'Body'}</label>
                <input
                  type="text"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full bg-[#0e1621] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleTestPush('custom')}
                disabled={isSimulating}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isArabic ? 'إرسال للمحادثة المحددة' : 'Send to Selected Dialog'}</span>
              </button>

              <button
                onClick={() => handleTestPush('background')}
                disabled={isSimulating}
                className="py-2.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isArabic ? 'محاكاة محادثة خلفية' : 'Simulate Background Alert'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Last Received Push Packet Inspector */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#5288c1]" />
              <span className="text-xs font-bold text-[#5288c1] uppercase tracking-wide">
                {isArabic ? 'آخر حزمة إشعار تم استلامها' : 'Last Received Push Packet'}
              </span>
            </div>

            {fcmDiagnostic.lastReceivedPacket && (
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[11px] text-[#5288c1] hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>{showRawJson ? (isArabic ? 'إخفاء JSON' : 'Hide JSON') : isArabic ? 'عرض JSON الخام' : 'View Raw JSON'}</span>
              </button>
            )}
          </div>

          {fcmDiagnostic.lastReceivedPacket ? (
            <div className="space-y-3">
              <div className="bg-[#0e1621] p-3.5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{fcmDiagnostic.lastReceivedPacket.title}</span>
                      <span className="text-[11px] font-normal text-gray-400 font-mono">
                        (dialog_id: {fcmDiagnostic.lastReceivedPacket.dialog_id})
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 mt-1">{fcmDiagnostic.lastReceivedPacket.body}</div>
                  </div>
                  {(() => {
                    const badge = getPacketStatusBadge(fcmDiagnostic.lastReceivedPacket.status);
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Routing Explanation */}
                <div className="bg-white/5 p-2.5 rounded-lg text-xs space-y-1">
                  <span className="text-[11px] font-bold text-amber-400 block">
                    {isArabic ? '📌 قرار توجيه الإشعار (Routing Engine):' : '📌 Routing Engine Decision:'}
                  </span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    {fcmDiagnostic.lastReceivedPacket.routingDecision ||
                      (fcmDiagnostic.lastReceivedPacket.dialog_id === activeChatId
                        ? isArabic
                          ? 'تم إخفاء التنبيه الصوتي لأن المستخدم يشاهد هذه المحادثة مباشرة في نافذة التطبيق.'
                          : 'Suppressed audible alert because the user is currently looking at this active dialog.'
                        : isArabic
                        ? 'تم إطلاق إشعار داخلي وتحديث عداد الرسائل غير المقروءة بنجاح.'
                        : 'Dispatched in-app notification banner & badge updated.')}
                  </p>
                </div>

                <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between pt-1">
                  <span>Packet ID: {fcmDiagnostic.lastReceivedPacket.id}</span>
                  <span>{new Date(fcmDiagnostic.lastReceivedPacket.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {showRawJson && (
                <div className="bg-black/50 p-3 rounded-xl border border-white/5 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(fcmDiagnostic.lastReceivedPacket, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0e1621] p-6 rounded-xl border border-white/5 text-center text-gray-400 text-xs space-y-2">
              <BellOff className="w-8 h-8 mx-auto text-gray-500 opacity-60" />
              <p>{isArabic ? 'لم يتم استقبال أي حزمة إشعارات في هذه الجلسة بعد' : 'No push packets received yet in this session.'}</p>
              <button
                onClick={() => handleTestPush('background')}
                className="text-xs text-[#5288c1] font-bold hover:underline"
              >
                {isArabic ? 'انقر لإرسال حزمة تجريبية الآن' : 'Click here to send a test packet'}
              </button>
            </div>
          )}
        </div>

        {/* 4. History Logs Viewer */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5288c1]" />
              <span className="text-xs font-bold text-[#5288c1] uppercase tracking-wide">
                {isArabic ? 'سجل حزم الإشعارات المستلمة' : 'Push Notification Event Log'}
              </span>
              <span className="text-xs font-mono text-gray-400">({fcmDiagnostic.history.length})</span>
            </div>

            {fcmDiagnostic.history.length > 0 && (
              <button
                onClick={clearFcmDiagnosticHistory}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'مسح السجل' : 'Clear Log'}</span>
              </button>
            )}
          </div>

          {fcmDiagnostic.history.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fcmDiagnostic.history.map((pkt, idx) => {
                const badge = getPacketStatusBadge(pkt.status);
                return (
                  <div
                    key={pkt.id || idx}
                    className="p-3 bg-[#0e1621] rounded-xl border border-white/5 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{pkt.title}</span>
                        <span className="text-[10px] text-gray-400 font-mono">[{pkt.dialog_id}]</span>
                      </div>
                      <div className="text-[11px] text-gray-300 line-clamp-1">{pkt.body}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(pkt.timestamp).toLocaleTimeString()} • {pkt.routingDecision || 'Processed'}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-gray-500">
              {isArabic ? 'لا توجد سجلات سابقة' : 'No history logs available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
