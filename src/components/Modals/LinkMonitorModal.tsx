import React, { useState, useEffect } from 'react';
import {
  Radio,
  Link as LinkIcon,
  RotateCw,
  Trash2,
  Calendar,
  Globe,
  User,
  Users,
  Hash,
  ArrowRight,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogIn,
  Shield,
  ShieldCheck,
  Send,
  Bell,
  EyeOff,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io as createSocketIO } from 'socket.io-client';
import { useTelegram } from '../../context/TelegramContext';
import { CapturedLink } from '../../types';

interface LinkMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RadarLogItem {
  id: string;
  url: string;
  type: string;
  action: string;
  chat_title?: string;
  chat_id?: string;
  source_chat_id?: string;
  source_chat_title?: string;
  sender_name?: string;
  saved_message_sent?: boolean | number;
  details?: string;
  created_at: number;
}

interface RadarStatus {
  enabled: boolean;
  isProcessing: boolean;
  queueLength: number;
  hourlyJoins: number;
  maxPerHour: number;
  cooldownSeconds: number;
  lastJoinTime: number;
  rules: {
    interval: string;
    maxPerHour: string;
    target: string;
    skip: string;
    notification: string;
  };
}

export const LinkMonitorModal: React.FC<LinkMonitorModalProps> = ({ isOpen, onClose }) => {
  const {
    capturedLinks,
    autoJoinLinksEnabled,
    toggleAutoJoinLinks,
    clearCapturedLinks,
    showToast,
    joinChatByInviteLink,
  } = useTelegram();

  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [radarStatus, setRadarStatus] = useState<RadarStatus | null>(null);
  const [radarLogs, setRadarLogs] = useState<RadarLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [testUrl, setTestUrl] = useState<string>('');
  const [isSubmittingTest, setIsSubmittingTest] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'logs' | 'captured' | 'rules'>('logs');

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes] = await Promise.all([
        fetch('/api/telegram/radar/status').then((r) => r.json()).catch(() => null),
        fetch('/api/telegram/radar/logs?limit=50').then((r) => r.json()).catch(() => null),
      ]);

      if (statusRes && statusRes.success) {
        setRadarStatus(statusRes);
      }
      if (logsRes && logsRes.success && Array.isArray(logsRes.logs)) {
        setRadarLogs(logsRes.logs);
      }
      setLastUpdate(new Date().toLocaleTimeString('ar-SA'));
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchRadarData();

    const interval = setInterval(fetchRadarData, 12000);

    // Socket listener for real-time updates
    let socket: any = null;
    try {
      socket = createSocketIO(window.location.origin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });

      const handleRadarUpdate = (data: any) => {
        fetchRadarData();
        if (data.action === 'joined') {
          showToast(`🚀 رادار الروابط: تم الانضمام لمجموعة ${data.chatTitle || ''}`, '✨');
        } else if (data.action === 'skipped_private_channel' || data.action === 'skipped_channel') {
          showToast(`🛡️ رادار الروابط: تم تخطي القناة الخاصة بنجاح`, 'info');
        } else if (data.action === 'throttled_hour') {
          showToast(`⚠️ رادار الروابط: تم الوصول للحد الأقصى (10 بالساعة)`, 'warning');
        }
      };

      socket.on('link_radar_update', handleRadarUpdate);
    } catch (_) {}

    return () => {
      clearInterval(interval);
      if (socket) {
        try {
          socket.disconnect();
        } catch (_) {}
      }
    };
  }, [isOpen]);

  const handleTestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testUrl.trim();
    if (!clean) return;

    setIsSubmittingTest(true);
    try {
      const res = await fetch('/api/telegram/radar/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('📡 تم تمرير الرابط إلى رادار الفحص والانضمام التلقائي', '✨');
        setTestUrl('');
        setTimeout(fetchRadarData, 1500);
      } else {
        showToast(data.error || 'تعذر إضافة الرابط للرادار', 'error');
      }
    } catch (err: any) {
      showToast('خطأ في إرسال الرابط للرادار', 'error');
    } finally {
      setIsSubmittingTest(false);
    }
  };

  if (!isOpen) return null;

  const hourlyCount = radarStatus?.hourlyJoins ?? 0;
  const maxPerHour = radarStatus?.maxPerHour ?? 10;
  const remainingInHour = Math.max(0, maxPerHour - hourlyCount);

  return (
    <AnimatePresence>
      <div
        id="modal-link-monitor-view"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto"
        dir="rtl"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-4xl text-[#e8eaf6] rounded-2xl shadow-2xl overflow-hidden border border-white/10 my-auto flex flex-col max-h-[94vh]"
          style={{
            background: '#0c1322',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 bg-[#121c30]">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg p-2 text-[#e8eaf6] text-[0.8rem] flex items-center transition-all"
                title="رجوع"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[1rem] font-bold text-white leading-tight flex items-center gap-2">
                    <span>رادار المراقبة والانضمام الفوري</span>
                    <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-mono">
                      RADAR
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-none mt-0.5 font-mono">
                    Link Monitor & Auto-Join Radar • الخلفية المستمرة
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>شغال دائماً في الخلفية</span>
              </span>
              <button
                onClick={fetchRadarData}
                disabled={loading}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                title="تحديث البيانات"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Description & Rules Banner */}
          <div className="p-4 bg-gradient-to-r from-sky-950/40 via-[#101b30] to-cyan-950/30 border-b border-white/5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-[12px] leading-relaxed text-gray-300">
                <strong className="text-sky-300 font-bold">طريقة العمل والقواعد الصارمة:</strong>
                <span className="block mt-1 text-gray-300/90">
                  الرادار يراقب بشكل مستقل وتلقائي جميع الروابط الواردة في أي محادثة (مجموعات، قنوات، ومحادثات خاصة).
                  إذا كان الرابط <strong className="text-emerald-400">مجموعة عامة</strong> ينضم إليها فورياً ويرسل إشعار الانضمام إلى <strong className="text-sky-300">الرسائل المحفوظة (me)</strong>.
                  وإن كان رابط <strong className="text-amber-400">قناة خاصة</strong> يتجاهله تلقائياً ويتركه دون انضمام.
                  مع تطبيق فاصل زمني <strong className="text-cyan-300">دقيقة كاملة</strong> بين كل انضمام، وبحد أقصى <strong className="text-cyan-300">10 روابط في الساعة الواحدة</strong> لحماية الحساب.
                </span>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-white/10">
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" /> فاصل الانضمام
                </span>
                <span className="text-[14px] font-bold text-sky-300 font-mono mt-0.5">1 دقيقة كاملة</span>
                <span className="text-[9px] text-gray-400">بين كل عملية وأخرى</span>
              </div>

              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" /> حد الساعة الحالية
                </span>
                <span className="text-[14px] font-bold text-emerald-300 font-mono mt-0.5">
                  {hourlyCount} / {maxPerHour}
                </span>
                <span className="text-[9px] text-gray-400">
                  {remainingInHour > 0 ? `متبقي ${remainingInHour} انضمام` : 'اكتمل حد الساعة'}
                </span>
              </div>

              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Bell className="w-3 h-3 text-amber-400" /> وجهة الإشعار
                </span>
                <span className="text-[13px] font-bold text-amber-300 mt-0.5">الرسائل المحفوظة</span>
                <span className="text-[9px] text-gray-400">إشعار مفصل فوري</span>
              </div>

              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <EyeOff className="w-3 h-3 text-rose-400" /> القنوات الخاصة
                </span>
                <span className="text-[13px] font-bold text-rose-300 mt-0.5">تجاهل تام</span>
                <span className="text-[9px] text-gray-400">عدم الانضمام نهائياً</span>
              </div>
            </div>
          </div>

          {/* Quick Manual Test Bar */}
          <div className="px-4 py-3 bg-[#111927] border-b border-white/5">
            <form onSubmit={handleTestLink} className="flex items-center gap-2">
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="جرّب فحص رابط تيليجرام يدوياً (https://t.me/... أو رابط دعوة +)..."
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-[12px] text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="submit"
                disabled={isSubmittingTest || !testUrl.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
              >
                {isSubmittingTest ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                )}
                <span>فحص في الرادار</span>
              </button>
            </form>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 pt-2.5 bg-[#0e1624] border-b border-white/5 flex items-center gap-4 text-[12px]">
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>سجل الرادار والعمليات ({radarLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>قواعد الأمان والحدود</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'logs' && (
              <div className="space-y-2.5">
                {radarLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white/[0.02] rounded-2xl border border-white/5">
                    <Radio className="w-10 h-10 text-sky-400/40 mx-auto mb-2 animate-pulse" />
                    <h5 className="font-bold text-[14px] text-gray-200">الرادار نشط وجاهز للالتقاط</h5>
                    <p className="text-[12px] text-gray-400 mt-1 max-w-md mx-auto">
                      يقوم الرادار بمراقبة جميع المحادثات بشكل فوري ومستقل. بمجرد ظهور أي رابط في أي محادثة سيتم فحصه وتنفيذه وتدوينه هنا فورياً.
                    </p>
                  </div>
                ) : (
                  radarLogs.map((log) => {
                    const isJoined = log.action === 'joined';
                    const isSkippedPrivate = log.action === 'skipped_private_channel';
                    const isSkippedChannel = log.action === 'skipped_channel';
                    const isThrottled = log.action === 'throttled_hour';
                    const isAlready = log.action === 'already_member';

                    let badgeColor = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                    let badgeLabel = 'فحص';
                    let borderColor = 'border-l-gray-500';

                    if (isJoined) {
                      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      badgeLabel = '✅ تم الانضمام فورياً';
                      borderColor = 'border-l-emerald-500';
                    } else if (isSkippedPrivate) {
                      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                      badgeLabel = '🛑 قناة خاصة (تم التخطي)';
                      borderColor = 'border-l-rose-500';
                    } else if (isSkippedChannel) {
                      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                      badgeLabel = '🛑 قناة (تم التخطي)';
                      borderColor = 'border-l-amber-500';
                    } else if (isThrottled) {
                      badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                      badgeLabel = '⏳ حد الساعة (10 انضمامات)';
                      borderColor = 'border-l-purple-500';
                    } else if (isAlready) {
                      badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                      badgeLabel = '📌 منضم مسبقاً';
                      borderColor = 'border-l-blue-500';
                    }

                    const dateStr = log.created_at
                      ? new Date(log.created_at).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 border-l-4 ${borderColor} transition-all space-y-1.5`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                            {log.chat_title && (
                              <span className="font-bold text-[13px] text-white flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-sky-400" />
                                <span>{log.chat_title}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{dateStr}</span>
                        </div>

                        <div className="text-[11px] font-mono text-sky-300 break-all select-all">
                          {log.url}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                          {log.source_chat_title && (
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3 text-gray-500" />
                              <span>المصدر: {log.source_chat_title}</span>
                            </span>
                          )}
                          {log.sender_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-500" />
                              <span>المرسل: {log.sender_name}</span>
                            </span>
                          )}
                          {log.saved_message_sent && (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <Bell className="w-3 h-3" />
                              <span>أُرسل إشعار للرسائل المحفوظة</span>
                            </span>
                          )}
                        </div>

                        {log.details && (
                          <div className="text-[11px] text-gray-400 pt-0.5 border-t border-white/5">
                            {log.details}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-3 text-[13px]">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <h6 className="font-bold text-sky-300 flex items-center gap-2 text-[14px]">
                    <Shield className="w-4 h-4 text-sky-400" />
                    <span>تفاصيل القواعد المطبقة برمجياً في خادم الرادار:</span>
                  </h6>
                  <ul className="space-y-2 text-gray-300 pr-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>المراقبة المستقلة الدائمة:</strong> يعمل الرادار مباشرة داخل محرك تيليجرام في الخلفية على مستوى السيرفر بدون توقف وبشكل منفصل تماماً عن أي ميزة أخرى.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>الانضمام الفوري للمجموعات العامة:</strong> فور التقاط رابط مجموعة عامة، يتم التحقق منه والانضمام إليه فورياً عبر استدعاءات Telegram API المباشرة.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>إشعار الرسائل الخاصة (المحفوظة):</strong> عند كل انضمام ناجح، يرسل الرادار رسالة تأكيد رسمية مفصلة إلى محادثة الحساب الخاصة (Saved Messages / me) تتضمن اسم المجموعة، الرابط، المصدر، ورقم الانضمام في الساعة.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>
                        <strong>تجاهل القنوات الخاصة:</strong> إذا كان الرابط لقناة خاصة أو قناة بث (Broadcast Channel)، يتم تركه وتجاوزه بأمان تام وفقاً للتوجيه الصريح، وتسجيل ذلك في السجل.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>
                        <strong>فاصل زمني دقيقة بين كل انضمام:</strong> يتم فرض انتظار 60 ثانية على الأقل بين كل عملية انضمام وأخرى لمنع التجميد وحظر الحساب.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>
                        <strong>حد أقصى 10 روابط بالساعة:</strong> استعلام SQLite فوري يتحقق من عدد الانضمامات في آخر 60 دقيقة؛ وإذا بلغ 10 انضمامات يتم تعليق العمليات حتى انقضاء الساعة حمايةً للحساب.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
