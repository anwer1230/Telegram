import React, { useState, useEffect } from 'react';
import {
  Bell,
  Eye,
  Plus,
  Trash2,
  Bookmark,
  Radio,
  Play,
  Square,
  Clock,
  X,
  AlertCircle,
  Share2,
  Sparkles,
  CornerDownLeft,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { notificationsService } from '../../core/NotificationsService';
import { notificationsController } from '../../core/NotificationsController';
import { MonitorAlert } from '../../types';

export const MonitorModal: React.FC = () => {
  const { activeModal, setActiveModal, showToast, jumpToMessage, openPrivateChat, chats, messages } = useTelegram();
  const [keywordsText, setKeywordsText] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [sendToSaved, setSendToSaved] = useState(true);
  const [browserPush, setBrowserPush] = useState(true);

  useEffect(() => {
    // 1. Fetch initial status and hardcoded keywords from backend
    fetch('/api/alerts/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.keywords)) {
          setKeywordsText(data.keywords.join('\n'));
          if (typeof data.monitoringEnabled === 'boolean') {
            setIsMonitoring(data.monitoringEnabled);
            notificationsService.setMonitorConfig({ isEnabled: data.monitoringEnabled });
          }
        }
      })
      .catch(() => {});

    // 2. Fetch historical alerts from backend
    fetch('/api/alerts/history')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.alerts)) {
          data.alerts.forEach((alert: any) => {
            notificationsService.addMonitorAlert({
              id: alert.id,
              keyword: alert.keyword,
              sourceChatId: alert.chatId,
              sourceChatTitle: alert.group,
              senderName: alert.sender,
              messageText: alert.text,
              timestamp: alert.time,
              groupUrl: alert.groupUrl,
              senderUrl: alert.senderUrl,
              messageId: alert.messageId,
              peerId: alert.peerId,
            });
          });
        }
      })
      .catch(() => {});

    const unsub = notificationsService.subscribe(() => {
      setAlerts([...notificationsService.getMonitorAlerts()]);
      setIsMonitoring(notificationsService.getMonitorConfig().isEnabled);
    });
    setAlerts([...notificationsService.getMonitorAlerts()]);
    setIsMonitoring(notificationsService.getMonitorConfig().isEnabled);
    return () => unsub();
  }, []);

  if (activeModal !== ('monitor' as any)) return null;

  const toggleMonitoring = () => {
    const kws = keywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    const nextState = !isMonitoring;
    notificationsService.setMonitorConfig({
      isEnabled: nextState,
      keywords: kws,
      sendAlertsToSavedMessages: sendToSaved,
      browserPushAlerts: browserPush,
    });
    setIsMonitoring(nextState);

    showToast(
      nextState
        ? 'تم تشغيل المراقبة اللحظية للكلمات المفتاحية 👁️'
        : 'تم إيقاف المراقبة مؤقتاً ⏹️',
      '🔔'
    );
  };

  const handleTriggerTestAlert = () => {
    const sampleChat = chats.find((c) => c.type === 'group' || c.type === 'channel') || chats[0];
    const chatId = sampleChat ? sampleChat.id : 'chat_group_crypto';
    const chatTitle = sampleChat ? sampleChat.title : 'مجموعة العمل والمشاريع';
    const chatUsername = sampleChat?.username;
    const currentMsgs = (messages[chatId] || []);
    const sampleMsg = currentMsgs[currentMsgs.length - 1];
    const messageId = sampleMsg ? sampleMsg.id : `msg_test_${Date.now()}`;
    const testKeyword = keywordsText.split('\n')[0] || 'واجب';

    notificationsController.postNotification({
      category: 'keyword_alert',
      title: `🚨 كلمة مراقبة: [${testKeyword}]`,
      body: `💬 الرسالة: السلام عليكم، مطلوب حل ${testKeyword} لمشروع التخرج بشكل عاجل اليوم.\n📍 المصدر: ${chatTitle}`,
      avatar: sampleChat?.avatar,
      chatId: chatId,
      chatTitle: chatTitle,
      chatUsername: chatUsername,
      messageId: messageId,
      senderId: 'user_ahmed_dev',
      senderName: 'أحمد المهندس',
      senderUsername: 'ahmed_dev',
      keyword: testKeyword,
      messageText: `السلام عليكم، مطلوب حل ${testKeyword} لمشروع التخرج بشكل عاجل اليوم.`,
      replyAction: true,
    });

    showToast('تم إرسال إشعار مراقبة تجريبي حي بنجاح 🚨', '🔔');
  };

  return (
    <div
      id="modal-monitor-activity"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl text-[#e8eaf6] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/30 my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        style={{
          background: 'linear-gradient(145deg, #131208, #221e10, #0c0b05)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">وظيفة المراقبة اللحظية</h3>
              <p className="text-[11px] text-amber-300/80">تتبع الكلمات المفتاحية والإرسال للرسائل المحفوظة</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Bar */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
              isMonitoring
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'bg-black/30 border-white/10 text-gray-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isMonitoring ? 'bg-amber-400 animate-ping' : 'bg-gray-500'
                }`}
              />
              <div>
                <span className="font-bold text-xs block text-white">
                  {isMonitoring ? 'المراقبة تعمل في الخلفية الآن' : 'المراقبة متوقفة'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {isMonitoring
                    ? 'يتم فحص كل رسالة واردة وإرسال التنبيهات تلقائياً'
                    : 'انقر على "بدء المراقبة" لتفعيل الفحص اللحظي'}
                </span>
              </div>
            </div>

            <button
              onClick={toggleMonitoring}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                isMonitoring
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-black'
              }`}
            >
              {isMonitoring ? (
                <>
                  <Square className="w-4 h-4" />
                  <span>إيقاف المراقبة</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>بدء المراقبة</span>
                </>
              )}
            </button>
          </div>

          {/* Keywords Config */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
              <span>قائمة الكلمات المفتاحية للمراقبة (كل كلمة في سطر):</span>
              <span className="text-[10px] text-amber-400 font-mono">
                {keywordsText.split('\n').filter(Boolean).length} كلمات
              </span>
            </label>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={4}
              placeholder="اكتب الكلمات المفتاحية هنا..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
            />
          </div>

          {/* Alert Options */}
          <div className="grid grid-cols-2 gap-3">
            <label className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>إرسال للرسائل المحفوظة</span>
              </span>
              <input
                type="checkbox"
                checked={sendToSaved}
                onChange={(e) => setSendToSaved(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>إشعارات فورية (In-App)</span>
              </span>
              <input
                type="checkbox"
                checked={browserPush}
                onChange={(e) => setBrowserPush(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Captured Alerts Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200">
                سجل التنبيهات المكتشفة ({alerts.length}):
              </span>
              {alerts.length > 0 && (
                <button
                  onClick={() => {
                    notificationsService.clearMonitorAlerts();
                    fetch('/api/alerts/clear', { method: 'POST' }).catch(() => {});
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
                >
                  مسح السجل
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-gray-500">
                لم يتم رصد أي رسالة تحتوي على الكلمات المحددة حتى الآن
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          {a.keyword}
                        </span>
                        {a.groupUrl ? (
                          <a
                            href={a.groupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-amber-300 hover:underline flex items-center gap-1"
                          >
                            <span>{a.sourceChatTitle}</span>
                            <Share2 className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-bold text-white">{a.sourceChatTitle}</span>
                        )}
                        {a.senderUrl ? (
                          <a
                            href={a.senderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-[10px]"
                          >
                            ({a.senderName})
                          </a>
                        ) : (
                          <span className="text-gray-400 text-[10px]">({a.senderName})</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{a.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-gray-300 bg-white/5 p-2 rounded-xl border border-white/5">
                      "{a.messageText}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleTriggerTestAlert}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>تجربة إشعار المراقبة الحي (DrKLO) 🚨</span>
          </button>

          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
