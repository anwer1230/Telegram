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
  ShieldAlert,
  Ban,
  Send,
  Bell,
  EyeOff,
  Sparkles,
  Zap,
  Search,
  Plus,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io as createSocketIO } from 'socket.io-client';
import { useTelegram } from '../../context/TelegramContext';
import { CapturedLink } from '../../types';
import { validateLinkAsync, validateLinkFastSync, LinkValidationResult } from '../../utils/linkValidator';

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

interface BlacklistRecord {
  id: string;
  pattern: string;
  reason?: string;
  created_at: number;
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

  const [radarStatus, setRadarStatus] = useState<RadarStatus | null>(null);
  const [radarLogs, setRadarLogs] = useState<RadarLogItem[]>([]);
  const [blacklistItems, setBlacklistItems] = useState<BlacklistRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [testUrl, setTestUrl] = useState<string>('');
  const [isSubmittingTest, setIsSubmittingTest] = useState<boolean>(false);
  const [isValidatingSingle, setIsValidatingSingle] = useState<boolean>(false);
  const [singleValidationResult, setSingleValidationResult] = useState<LinkValidationResult | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'logs' | 'captured' | 'blacklist' | 'rules'>('logs');

  // Blacklist form state
  const [newBlacklistPattern, setNewBlacklistPattern] = useState<string>('');
  const [newBlacklistReason, setNewBlacklistReason] = useState<string>('');
  const [isAddingBlacklist, setIsAddingBlacklist] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Individual validating link id map
  const [validatingLinks, setValidatingLinks] = useState<Record<string, boolean>>({});

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes, blacklistRes] = await Promise.all([
        fetch('/api/telegram/radar/status').then((r) => r.json()).catch(() => null),
        fetch('/api/telegram/radar/logs?limit=50').then((r) => r.json()).catch(() => null),
        fetch('/api/telegram/radar/blacklist').then((r) => r.json()).catch(() => null),
      ]);

      if (statusRes && statusRes.success) {
        setRadarStatus(statusRes);
      }
      if (logsRes && logsRes.success && Array.isArray(logsRes.logs)) {
        setRadarLogs(logsRes.logs);
      }
      if (blacklistRes && blacklistRes.success && Array.isArray(blacklistRes.blacklist)) {
        setBlacklistItems(blacklistRes.blacklist);
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
        } else if (data.action === 'skipped_blacklisted') {
          showToast(`⛔ درع الرادار: تم اعتراض رابط محظور بالقائمة السوداء ومنع الانضمام`, 'warning');
        } else if (data.action === 'skipped_inactive') {
          showToast(`❌ درع الرادار: تم تخطي رابط غير نشط أو منتهي الصلاحية`, 'info');
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

  // Handle immediate manual validation without joining
  const handleValidateOnly = async () => {
    const clean = testUrl.trim();
    if (!clean) return;

    setIsValidatingSingle(true);
    setSingleValidationResult(null);

    try {
      const result = await validateLinkAsync(clean);
      setSingleValidationResult(result);
      if (result.isBlacklisted) {
        showToast(`⛔ تنبيه أمان: هذا الرابط محظور بالقائمة السوداء! (${result.reason})`, 'warning');
      } else if (!result.isActive) {
        showToast(`❌ الرابط غير نشط أو منتهي الصلاحية (${result.reason})`, 'info');
      } else {
        showToast(`✅ الرابط سليم ونشط وجاهز (${result.chatTitle || result.reason})`, '✨');
      }
    } catch (err) {
      showToast('خطأ أثناء فحص الرابط', 'error');
    } finally {
      setIsValidatingSingle(false);
    }
  };

  // Handle submitting test link to queue
  const handleTestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testUrl.trim();
    if (!clean) return;

    // Automatic pre-check before enqueuing
    const preCheck = validateLinkFastSync(clean);
    if (preCheck.isBlacklisted) {
      showToast(`⛔ تم المنع: الرابط محظور بالقائمة السوداء (${preCheck.reason})`, 'warning');
      return;
    }

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
        setSingleValidationResult(null);
        setTimeout(fetchRadarData, 1200);
      } else {
        showToast(data.error || 'تعذر إضافة الرابط للرادار', 'error');
      }
    } catch (err: any) {
      showToast('خطأ في إرسال الرابط للرادار', 'error');
    } finally {
      setIsSubmittingTest(false);
    }
  };

  // Add pattern to blacklist
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const pattern = newBlacklistPattern.trim();
    if (!pattern) return;

    setIsAddingBlacklist(true);
    try {
      const res = await fetch('/api/telegram/radar/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          reason: newBlacklistReason.trim() || 'نمط محظور مخصص لحماية الحساب',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🛡️ تم إضافة النمط "${pattern}" إلى درع القائمة السوداء بنجاح`, '✨');
        setNewBlacklistPattern('');
        setNewBlacklistReason('');
        fetchRadarData();
      } else {
        showToast(data.error || 'فشل إضافة النمط', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsAddingBlacklist(false);
    }
  };

  // Delete pattern from blacklist
  const handleDeleteBlacklist = async (id: string, pattern: string) => {
    try {
      const res = await fetch(`/api/telegram/radar/blacklist/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`تمت إزالة النمط "${pattern}" من القائمة السوداء`, 'info');
        setBlacklistItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      showToast('فشل حذف النمط', 'error');
    }
  };

  // Validate single captured link item
  const handleValidateCapturedLink = async (link: CapturedLink) => {
    setValidatingLinks((prev) => ({ ...prev, [link.id]: true }));
    try {
      const res = await validateLinkAsync(link.url);
      if (res.isBlacklisted) {
        showToast(`⛔ رابط محظور بالقائمة السوداء: ${res.reason}`, 'warning');
      } else if (!res.isActive) {
        showToast(`❌ رابط غير نشط أو منتهي: ${res.reason}`, 'info');
      } else {
        showToast(`✅ رابط نشط وسليم: ${res.chatTitle || res.reason}`, '✨');
      }
      fetchRadarData();
    } catch (err) {
      showToast('خطأ في فحص الرابط', 'error');
    } finally {
      setValidatingLinks((prev) => ({ ...prev, [link.id]: false }));
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedUrl(url);
    showToast('تم نسخ الرابط إلى الحافظة', '📋');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (!isOpen) return null;

  const hourlyCount = radarStatus?.hourlyJoins ?? 0;
  const maxPerHour = radarStatus?.maxPerHour ?? 10;
  const remainingInHour = Math.max(0, maxPerHour - hourlyCount);

  // Calculate quick stats
  const blacklistedCount = radarLogs.filter((l) => l.action === 'skipped_blacklisted').length;
  const inactiveCount = radarLogs.filter((l) => l.action === 'skipped_inactive').length;
  const joinedCount = radarLogs.filter((l) => l.action === 'joined').length;

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
                      RADAR GUARD
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-none mt-0.5 font-mono">
                    Link Monitor & Automatic Internal Validation Guard
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

          {/* Automatic Internal Validation Guard Banner */}
          <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-sky-950/40 to-indigo-950/40 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-[12px]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>خطوة الفحص والتحقق الآلي الداخلي (مفعلة تلقائياً):</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded border border-emerald-500/30 font-mono">
                    INTERNAL CHECK ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-gray-300/90 mt-0.5">
                  يفحص الرادار صلاحية كل رابط ونشاطه وتحققه من القائمة السوداء ذاتياً قبل أن يقوم نظام الانضمام بمحاولة الوصول إليه لمنع الحظر.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>ناجح: {joinedCount}</span>
              </span>
              <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                <Ban className="w-3 h-3 text-rose-400" />
                <span>محظور: {blacklistedCount}</span>
              </span>
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>منتهي: {inactiveCount}</span>
              </span>
            </div>
          </div>

          {/* Metrics Ribbon */}
          <div className="p-3.5 bg-[#101928] border-b border-white/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                  <ShieldAlert className="w-3 h-3 text-rose-400" /> درع القائمة السوداء
                </span>
                <span className="text-[13px] font-bold text-rose-300 font-mono mt-0.5">
                  {blacklistItems.length} أنماط محظورة
                </span>
                <span className="text-[9px] text-gray-400">حماية من الاحتيال</span>
              </div>

              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <EyeOff className="w-3 h-3 text-amber-400" /> القنوات الخاصة
                </span>
                <span className="text-[13px] font-bold text-amber-300 mt-0.5">تجاهل تام</span>
                <span className="text-[9px] text-gray-400">عدم الانضمام نهائياً</span>
              </div>
            </div>
          </div>

          {/* Quick Manual Test & Validation Bar */}
          <div className="px-4 py-3 bg-[#111927] border-b border-white/5 space-y-2.5">
            <form onSubmit={handleTestLink} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={testUrl}
                  onChange={(e) => {
                    setTestUrl(e.target.value);
                    if (singleValidationResult) setSingleValidationResult(null);
                  }}
                  placeholder="جرّب فحص رابط تيليجرام (https://t.me/... أو رابط دعوة +)..."
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-[12px] text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                {testUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setTestUrl('');
                      setSingleValidationResult(null);
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Validate Only Button */}
              <button
                type="button"
                onClick={handleValidateOnly}
                disabled={isValidatingSingle || !testUrl.trim()}
                className="px-3.5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 border border-purple-500/30"
                title="فحص فوري للرابط دون إضافته لطابور الانضمام"
              >
                {isValidatingSingle ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>فحص داخلي فوري</span>
              </button>

              {/* Pass to Radar and Join Button */}
              <button
                type="submit"
                disabled={isSubmittingTest || !testUrl.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
                title="تمرير الرابط لطابور الرادار وتطبيق الفحص الآلي ثم الانضمام"
              >
                {isSubmittingTest ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                )}
                <span>تمرير للرادار</span>
              </button>
            </form>

            {/* Live Instant Validation Result Preview Card */}
            {singleValidationResult && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border text-[12px] flex items-start justify-between flex-wrap gap-2 ${
                  singleValidationResult.isBlacklisted
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : !singleValidationResult.isActive
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {singleValidationResult.isBlacklisted ? (
                    <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : !singleValidationResult.isActive ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-2">
                      <span>
                        {singleValidationResult.isBlacklisted
                          ? '⛔ الرابط محظور ومرفوض بالكامل بالقائمة السوداء'
                          : !singleValidationResult.isActive
                          ? '❌ الرابط غير نشط أو منتهي الصلاحية'
                          : '✅ الرابط نشط وسليم ومؤهل للانضمام'}
                      </span>
                      {singleValidationResult.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono">
                          {singleValidationResult.type}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-90">
                      <strong>السبب والتقرير:</strong> {singleValidationResult.reason}
                    </div>
                    {singleValidationResult.chatTitle && (
                      <div className="text-[11px] font-semibold text-white">
                        اسم المجموعة: {singleValidationResult.chatTitle}
                      </div>
                    )}
                    {singleValidationResult.memberCount !== undefined && (
                      <div className="text-[10px] text-gray-300">
                        عدد الأعضاء التقريبي: {singleValidationResult.memberCount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-75 font-mono">
                    {new Date(singleValidationResult.checkedAt).toLocaleTimeString('ar-SA')}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 pt-2.5 bg-[#0e1624] border-b border-white/5 flex items-center gap-4 text-[12px] overflow-x-auto">
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>سجل الرادار والعمليات ({radarLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('captured')}
              className={`pb-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'captured'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>الروابط الملتقطة لحظياً ({capturedLinks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('blacklist')}
              className={`pb-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'blacklist'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>درع القائمة السوداء ({blacklistItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
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
            {/* 1. Radar Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-2.5">
                {radarLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white/[0.02] rounded-2xl border border-white/5">
                    <Radio className="w-10 h-10 text-sky-400/40 mx-auto mb-2 animate-pulse" />
                    <h5 className="font-bold text-[14px] text-gray-200">الرادار نشط وجاهز للالتقاط</h5>
                    <p className="text-[12px] text-gray-400 mt-1 max-w-md mx-auto">
                      يقوم الرادار بمراقبة جميع المحادثات بشكل فوري ومستقل، ويخضع كل رابط لخطوة التحقق الداخلي المباشر قبل الشروع في الانضمام.
                    </p>
                  </div>
                ) : (
                  radarLogs.map((log) => {
                    const isJoined = log.action === 'joined';
                    const isSkippedPrivate = log.action === 'skipped_private_channel';
                    const isSkippedChannel = log.action === 'skipped_channel';
                    const isThrottled = log.action === 'throttled_hour';
                    const isAlready = log.action === 'already_member';
                    const isBlacklisted = log.action === 'skipped_blacklisted';
                    const isInactive = log.action === 'skipped_inactive';

                    let badgeColor = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                    let badgeLabel = 'فحص';
                    let borderColor = 'border-l-gray-500';

                    if (isJoined) {
                      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      badgeLabel = '✅ تم الانضمام فورياً';
                      borderColor = 'border-l-emerald-500';
                    } else if (isBlacklisted) {
                      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                      badgeLabel = '⛔ محظور بالقائمة السوداء (تم المنع)';
                      borderColor = 'border-l-rose-500';
                    } else if (isInactive) {
                      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                      badgeLabel = '❌ رابط غير نشط / منتهي';
                      borderColor = 'border-l-amber-500';
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
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-mono">{dateStr}</span>
                            <button
                              onClick={() => copyToClipboard(log.url)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                              title="نسخ الرابط"
                            >
                              {copiedUrl === log.url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
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

            {/* 2. Captured Links Stream Tab */}
            {activeTab === 'captured' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-[12px] text-gray-300">
                    الروابط التي التقطها الرادار أثناء عمل الجلسة الحالية:
                  </span>
                  <button
                    onClick={clearCapturedLinks}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح السجل</span>
                  </button>
                </div>

                {capturedLinks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 bg-white/[0.02] rounded-xl border border-white/5">
                    <Radio className="w-8 h-8 text-sky-400/30 mx-auto mb-2" />
                    <p className="text-[12px]">لم يتم التقاط روابط في هذه الجلسة حتى الآن.</p>
                  </div>
                ) : (
                  capturedLinks.map((item) => {
                    const isBL = item.isBlacklisted || item.status === 'blacklisted';
                    const isDead = item.status === 'inactive' || item.isActive === false;
                    const isGood = !isBL && !isDead;
                    const isValidating = validatingLinks[item.id];

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-[12px] space-y-2 ${
                          isBL
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : isDead
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {isBL ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <Ban className="w-3 h-3" />
                                <span>محظور بالقائمة السوداء</span>
                              </span>
                            ) : isDead ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>غير نشط / منتهي</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>نشط وسليم</span>
                              </span>
                            )}

                            {item.chat_title && (
                              <span className="font-bold text-white text-[13px]">
                                {item.chat_title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-mono">
                              {item.detectedAt}
                            </span>
                            <button
                              onClick={() => handleValidateCapturedLink(item)}
                              disabled={isValidating}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-sky-300 flex items-center gap-1 border border-white/10"
                              title="إعادة الفحص والتحقق الآن"
                            >
                              <RotateCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
                              <span>فحص</span>
                            </button>
                          </div>
                        </div>

                        <div className="font-mono text-sky-300 text-[11px] break-all select-all">
                          {item.url}
                        </div>

                        {item.validationReason && (
                          <div className="text-[11px] text-gray-300 bg-black/20 p-1.5 rounded border border-white/5">
                            <strong>نتيجة التحقق:</strong> {item.validationReason}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                          <span>المصدر: {item.source_chat || item.sourceChatTitle || 'محادثة'}</span>
                          <span>المرسل: {item.sender || item.sourceSenderName || 'مستخدم'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 3. Blacklist Guard Tab */}
            {activeTab === 'blacklist' && (
              <div className="space-y-4 text-[13px]">
                {/* Add Rule Form */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>إضافة نمط / رابط جديد للقائمة السوداء الداخلية:</span>
                  </div>
                  <form onSubmit={handleAddBlacklist} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newBlacklistPattern}
                        onChange={(e) => setNewBlacklistPattern(e.target.value)}
                        placeholder="النمط (مثال: scam, drainer, t.me/badgroup)"
                        className="sm:col-span-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-[12px] text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 font-mono"
                      />
                      <input
                        type="text"
                        value={newBlacklistReason}
                        onChange={(e) => setNewBlacklistReason(e.target.value)}
                        placeholder="سبب الحظر (مثال: قناة تصيد واحتيال)"
                        className="sm:col-span-2 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-[12px] text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isAddingBlacklist || !newBlacklistPattern.trim()}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-md"
                      >
                        {isAddingBlacklist ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>حظر النمط وتفعيل الحماية</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Blacklist Items List */}
                <div className="space-y-2">
                  <h6 className="font-bold text-gray-200 text-[13px] flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>الأنماط والروابط المحظورة حالياً ({blacklistItems.length}):</span>
                  </h6>

                  {blacklistItems.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 bg-white/[0.02] rounded-xl border border-white/5">
                      لا توجد أنماط بالقائمة السوداء.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {blacklistItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center justify-between gap-3 text-[12px]"
                        >
                          <div className="space-y-0.5">
                            <div className="font-mono text-rose-300 font-bold flex items-center gap-2">
                              <span>{item.pattern}</span>
                            </div>
                            {item.reason && (
                              <div className="text-[11px] text-gray-400">
                                {item.reason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteBlacklist(item.id, item.pattern)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors shrink-0"
                            title="إزالة من القائمة السوداء"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Safety Rules Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-3 text-[13px]">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <h6 className="font-bold text-sky-300 flex items-center gap-2 text-[14px]">
                    <Shield className="w-4 h-4 text-sky-400" />
                    <span>تفاصيل القواعد المطبقة برمجياً في خادم الرادار:</span>
                  </h6>
                  <ul className="space-y-2.5 text-gray-300 pr-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong className="text-emerald-300">الخطوة 0 - الفحص والتحقق الآلي الداخلي:</strong> قبل أن يقوم محرك الانضمام بأي محاولة اتصال بالرابط، يتم فحصه داخلياً عبر درع القائمة السوداء واختبار صلاحية الرابط، لمنع الروابط الاحتيالية أو المنتهية من التأثير على تقييم الحساب.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong className="text-emerald-300">المراقبة المستقلة الدائمة:</strong> يعمل الرادار مباشرة داخل محرك تيليجرام في الخلفية على مستوى السيرفر بدون توقف وبشكل منفصل تماماً عن أي ميزة أخرى.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong className="text-emerald-300">الانضمام الفوري للمجموعات العامة:</strong> فور التقاط رابط مجموعة عامة والتحقق من نشاطه وسلامته، يتم الانضمام فورياً عبر استدعاءات Telegram API المباشرة.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>
                        <strong className="text-emerald-300">إشعار الرسائل الخاصة (المحفوظة):</strong> عند كل انضمام ناجح، يرسل الرادار رسالة تأكيد رسمية مفصلة إلى محادثة الحساب الخاصة (Saved Messages / me) تتضمن اسم المجموعة، الرابط، المصدر، ورقم الانضمام في الساعة.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>
                        <strong className="text-rose-300">تجاهل القنوات الخاصة:</strong> إذا كان الرابط لقناة خاصة أو قناة بث (Broadcast Channel)، يتم تركه وتجاوزه بأمان تام وفقاً للتوجيه الصريح، وتسجيل ذلك في السجل.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>
                        <strong className="text-cyan-300">فاصل زمني دقيقة بين كل انضمام:</strong> يتم فرض انتظار 60 ثانية على الأقل بين كل عملية انضمام وأخرى لمنع التجميد وحظر الحساب.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>
                        <strong className="text-cyan-300">حد أقصى 10 روابط بالساعة:</strong> استعلام SQLite فوري يتحقق من عدد الانضمامات في آخر 60 دقيقة؛ وإذا بلغ 10 انضمامات يتم تعليق العمليات حتى انقضاء الساعة حمايةً للحساب.
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
