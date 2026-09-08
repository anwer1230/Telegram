import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Play,
  Square,
  Clock,
  MessageSquare,
  Users,
  Settings,
  List,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  RefreshCw,
  Save,
  Check,
  Send,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { notificationsService } from '../../core/NotificationsService';
import { RotatingSendLog } from '../../types';
import { MESSAGE_DRAFTS } from './SenderModal';

export const ScheduledRotatorModal: React.FC = () => {
  const { activeModal, setActiveModal, chats, showToast } = useTelegram();

  const [messages, setMessages] = useState<string[]>(() => MESSAGE_DRAFTS.map((d) => d.text));
  const [selectedMsgTab, setSelectedMsgTab] = useState(0);
  const [rawGroups, setRawGroups] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [durationHours, setDurationHours] = useState(0);
  const [isPersistent, setIsPersistent] = useState(true);

  const [isActive, setIsActive] = useState(false);
  const [nextSendIn, setNextSendIn] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [logs, setLogs] = useState<RotatingSendLog[]>([]);

  // Filter group dialogs from chats
  const groupChats = chats.filter((c) => c.type === 'group' || c.type === 'channel');

  // Synchronize state from service
  useEffect(() => {
    const syncFromService = () => {
      const cfg = notificationsService.getRotatingConfig();
      const status = notificationsService.getRotatingStatus();
      setMessages([...cfg.messages]);
      setRawGroups(cfg.groups.join('\n'));
      setIntervalMinutes(cfg.intervalMinutes);
      setIsPersistent(Boolean(cfg.isPersistent));
      setIsActive(status.active);
      setNextSendIn(status.next_send_in);
      setCurrentIndex(status.current_index);
      setTotalSent(status.total_sent);
      setLogs([...notificationsService.getRotatingLogs()]);
    };

    syncFromService();
    const unsub = notificationsService.subscribe(syncFromService);

    // Live countdown interval ticker
    const timer = setInterval(() => {
      const status = notificationsService.getRotatingStatus();
      setNextSendIn(status.next_send_in);
      setIsActive(status.active);
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  if (activeModal !== 'scheduled-rotator') return null;

  const handleMessageChange = (index: number, val: string) => {
    const next = [...messages];
    next[index] = val;
    setMessages(next);
  };

  const handleSaveSettings = () => {
    const groups = rawGroups
      .split('\n')
      .map((g) => g.trim())
      .filter(Boolean);

    notificationsService.saveRotatingConfig({
      messages,
      groups,
      intervalMinutes,
      isPersistent,
    });
    fetch('/api/rotating/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        groups,
        interval_minutes: intervalMinutes,
        is_persistent: isPersistent,
      }),
    }).catch(() => {});
    showToast('تم حفظ إعدادات النشر الدوري بنجاح 💾', '✨');
  };

  const handleStart = () => {
    const groups = rawGroups
      .split('\n')
      .map((g) => g.trim())
      .filter(Boolean);

    try {
      notificationsService.startRotating(messages, groups, intervalMinutes, durationHours);
      showToast('تم بدء النشر الدوري المجدول بنجاح 🔄', '🚀');
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء بدء النشر الدوري', '⚠️');
    }
  };

  const handleStop = () => {
    notificationsService.stopRotating();
    fetch('/api/rotating/stop', { method: 'POST' }).catch(() => {});
    showToast('تم إيقاف النشر الدوري ⏹️', 'ℹ️');
  };

  const handleImportGroups = () => {
    const imported = groupChats.map((c) => c.username ? `@${c.username}` : c.id);
    const combined = Array.from(new Set([...rawGroups.split('\n').filter(Boolean), ...imported]));
    setRawGroups(combined.join('\n'));
    showToast(`تم استيراد ${imported.length} مجموعة من محادثاتك الحالية 👥`, '✨');
  };

  const formatCountdown = (secs: number | null) => {
    if (secs === null || secs === undefined) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="modal-scheduled-rotator-activity"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl text-[#e8eaf6] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/30 my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        style={{
          background: 'linear-gradient(145deg, #181102, #291a04, #0f0b02)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <RotateCw className={`w-5 h-5 ${isActive ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">النشر الدوري المجدول (Scheduled Rotator)</h3>
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-full font-mono ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {isActive ? 'نشط 🟢' : 'متوقف ⏹️'}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80">تدوير تلقائي حتى 5 قوالب رسائل بفواصل زمنية منتظمة لمنع الحظر</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-gray-300">الدورة القادمة بعد:</span>
              <span className="font-mono font-bold text-amber-300 text-sm">{formatCountdown(nextSendIn)}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-gray-300">إجمالي المرسل:</span>
              <span className="font-mono font-bold text-white">{totalSent}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isActive ? (
              <button
                onClick={handleStop}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 transition-all text-xs shadow-sm"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>إيقاف النشر</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-4 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold flex items-center gap-1.5 transition-all text-xs shadow-md"
              >
                <Play className="w-3 h-3 fill-black" />
                <span>بدء التدوير الآن</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Rotating Messages Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>قوالب الرسائل المدورة (حتى 5 رسائل بالتناوب):</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {messages.filter((m) => m.trim().length > 0).length} / 5 جاهزة
              </span>
            </div>

            {/* Message selector tabs */}
            <div className="flex gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
              {[0, 1, 2, 3, 4].map((idx) => {
                const hasText = messages[idx]?.trim().length > 0;
                const isSelected = selectedMsgTab === idx;
                const isCurrent = isActive && currentIndex % Math.max(1, messages.filter((m) => m.trim()).length) === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedMsgTab(idx)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-amber-500 text-black shadow'
                        : hasText
                        ? 'bg-white/10 text-gray-200 hover:bg-white/15'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span>رسالة {idx + 1}</span>
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                    {hasText && !isSelected && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>

            {/* Active Message Textarea */}
            <div className="relative">
              <textarea
                value={messages[selectedMsgTab] || ''}
                onChange={(e) => handleMessageChange(selectedMsgTab, e.target.value)}
                rows={4}
                placeholder={`اكتب نص الرسالة رقم ${selectedMsgTab + 1} التي سيتم تدويرها...`}
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none font-sans"
              />
              <span className="absolute bottom-2.5 left-3 text-[10px] text-gray-400 font-mono">
                {messages[selectedMsgTab]?.length || 0} حرف
              </span>
            </div>
          </div>

          {/* Target Groups & Interval Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Groups List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>المجموعات المستهدفة:</span>
                </span>
                <button
                  onClick={handleImportGroups}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold transition-colors"
                >
                  + استيراد محادثاتي
                </button>
              </div>
              <textarea
                value={rawGroups}
                onChange={(e) => setRawGroups(e.target.value)}
                rows={4}
                placeholder="ضع معرفات أو روابط المجموعات (كل مجموعة بسطر):
@tech_group
https://t.me/marketing_sa
chat_123456"
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
              />
            </div>

            {/* Interval & Persistence Controls */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>الفاصل الزمني بين الجولات:</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 3, 5, 10, 15, 30, 60, 120].map((min) => (
                    <button
                      key={min}
                      onClick={() => setIntervalMinutes(min)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        intervalMinutes === min
                          ? 'bg-amber-500 text-black shadow font-extrabold'
                          : 'bg-black/40 border border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {min} د
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Hours Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>مدة التشغيل التلقائي:</span>
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { h: 0, label: 'مستمر' },
                    { h: 1, label: '1 س' },
                    { h: 2, label: '2 س' },
                    { h: 6, label: '6 س' },
                    { h: 24, label: '24 س' },
                  ].map((item) => (
                    <button
                      key={item.h}
                      onClick={() => setDurationHours(item.h)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        durationHours === item.h
                          ? 'bg-amber-500 text-black shadow font-extrabold'
                          : 'bg-black/40 border border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-200 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>الاستمرارية الدائمة (تلقائي)</span>
                </span>
                <input
                  type="checkbox"
                  checked={isPersistent}
                  onChange={(e) => setIsPersistent(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
              </label>

              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/10 shadow"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>حفظ الإعدادات الحالية</span>
              </button>
            </div>
          </div>

          {/* Execution History / Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-amber-400" />
                <span>سجل النشر المباشر ({logs.length}):</span>
              </span>
              {logs.length > 0 && (
                <button
                  onClick={() => notificationsService.clearRotatingLogs()}
                  className="text-[10px] text-gray-400 hover:text-rose-400 transition-colors"
                >
                  مسح السجل
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 text-center text-gray-500 text-xs">
                  لا توجد عمليات نشر حتى الآن، اضغط "بدء التدوير الآن" لإطلاق النشر الآلي
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      log.status === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                      <span className="font-bold text-white">[{log.group}]</span>
                      <span className="text-gray-300">رسالة #{log.messageIndex}</span>
                    </div>
                    <span className="text-[10px] font-bold">
                      {log.status === 'success' ? 'تم الإرسال ✓' : log.info || 'فشل ✕'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            {rawGroups.split('\n').filter(Boolean).length} مجموعة مستهدفة • فواصل أمان 2 ثانية
          </div>
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
