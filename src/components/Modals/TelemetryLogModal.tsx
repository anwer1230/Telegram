import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  Shield,
  Zap,
  Info,
  Database,
  ArrowDownUp,
  LogIn,
  DownloadCloud,
  FileText,
  KeyRound,
} from 'lucide-react';
import {
  TelemetryEvent,
  getTelemetryLogs,
  clearTelemetryLogs,
  measureServerLatency,
  isTelemetryEnabled,
  setTelemetryEnabled,
  MAX_TELEMETRY_LOGS,
} from '../../utils/telemetry';
import {
  backupTelemetryToIndexedDB,
  getArchivedTelemetryLogs,
  clearArchivedTelemetryLogs,
} from '../../utils/telemetryIndexedDB';
import { useTelegram } from '../../context/TelegramContext';
import { AppUpdateController } from '../../core/messenger/AppUpdateController';

interface TelemetryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelemetryLogModal: React.FC<TelemetryLogModalProps> = ({ isOpen, onClose }) => {
  const { logout, showToast, setActiveModal } = useTelegram();
  const [logs, setLogs] = useState<TelemetryEvent[]>(() => getTelemetryLogs());
  const [archivedCount, setArchivedCount] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'network' | 'latency' | 'sync'>('all');
  // Sort order: default to 'asc' (oldest to newest) as required
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copied, setCopied] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [lastPingResult, setLastPingResult] = useState<{ clientMs: number; serverMs?: number } | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() => isTelemetryEnabled());
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [authKeyDetected, setAuthKeyDetected] = useState<boolean>(false);

  // Reload logs and sync with IndexedDB archive if present
  const refreshLogs = useCallback(async () => {
    const activeLogs = getTelemetryLogs();
    setEnabled(isTelemetryEnabled());

    try {
      const archived = await getArchivedTelemetryLogs();
      setArchivedCount(archived.length);

      // Merge and deduplicate by id
      const combinedMap = new Map<string, TelemetryEvent>();
      archived.forEach((item) => combinedMap.set(item.id, item));
      activeLogs.forEach((item) => combinedMap.set(item.id, item));

      const merged = Array.from(combinedMap.values());
      setLogs(merged.length > 0 ? merged : activeLogs);

      // Check for AUTH_KEY_UNREGISTERED
      const hasAuthKeyErr = merged.some(
        (l) => l.reason?.includes('AUTH_KEY_UNREGISTERED') || JSON.stringify(l.details || {}).includes('AUTH_KEY_UNREGISTERED')
      );
      setAuthKeyDetected(hasAuthKeyErr);
    } catch {
      setLogs(activeLogs);
    }
  }, []);

  // Subscribe to live telemetry update events
  useEffect(() => {
    if (!isOpen) return;
    refreshLogs();

    const handleUpdate = () => {
      refreshLogs();
    };
    const handleStatus = (e: any) => {
      if (typeof e?.detail?.enabled === 'boolean') {
        setEnabled(e.detail.enabled);
      }
    };

    window.addEventListener('tg_telemetry_updated', handleUpdate);
    window.addEventListener('tg_telemetry_status_changed', handleStatus);

    return () => {
      window.removeEventListener('tg_telemetry_updated', handleUpdate);
      window.removeEventListener('tg_telemetry_status_changed', handleStatus);
    };
  }, [isOpen, refreshLogs]);

  // Check if we need to auto-persist when events >= 50
  useEffect(() => {
    if (logs.length >= 50) {
      backupTelemetryToIndexedDB(logs).then((res) => {
        setArchivedCount(res.count);
      }).catch(() => {});
    }
  }, [logs.length]);

  // Filter and sort logs (Default: Chronological oldest to newest)
  const processedLogs = useMemo(() => {
    let list = [...logs];
    if (categoryFilter !== 'all') {
      list = list.filter((l) => l.category === categoryFilter);
    }

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [logs, categoryFilter, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    let networkCount = 0;
    let latencyCount = 0;
    let syncErrorCount = 0;
    let avgLatency = 0;
    let latencySum = 0;
    let latencyEvents = 0;

    logs.forEach((l) => {
      if (l.category === 'network') networkCount++;
      if (l.category === 'latency') {
        latencyCount++;
        if (typeof l.durationMs === 'number') {
          latencySum += l.durationMs;
          latencyEvents++;
        }
      }
      if (l.category === 'sync' && l.type === 'sync_error') syncErrorCount++;
    });

    avgLatency = latencyEvents > 0 ? Math.round(latencySum / latencyEvents) : 0;

    return {
      total: logs.length,
      networkCount,
      latencyCount,
      syncErrorCount,
      avgLatency,
    };
  }, [logs]);

  // Ping Trigger
  const handleRunPing = async () => {
    if (isPinging) return;
    setIsPinging(true);
    try {
      const res = await measureServerLatency(4);
      if (res.success) {
        setLastPingResult({ clientMs: res.clientRoundTripMs, serverMs: res.serverDurationMs });
      }
    } finally {
      setIsPinging(false);
      refreshLogs();
    }
  };

  // Copy Logs to Clipboard ("نسخ التقرير" / Copy Report)
  const handleCopyReport = () => {
    try {
      const payload = {
        title: 'Telegram Web Client - Telemetry Diagnostic Report',
        exportedAt: new Date().toISOString(),
        chronologicalOrder: sortOrder === 'asc' ? 'Oldest to Newest (الأقدم إلى الأحدث)' : 'Newest to Oldest',
        summary: {
          totalRecordedEvents: logs.length,
          archivedInIndexedDB: logs.length >= 50,
          hasAuthKeyUnregistered: authKeyDetected,
          networkCount: stats.networkCount,
          latencyCount: stats.latencyCount,
          syncErrorCount: stats.syncErrorCount,
          averageLatencyMs: stats.avgLatency,
          browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
        events: processedLogs.map((evt, idx) => ({
          orderNumber: idx + 1,
          id: evt.id,
          timestamp: evt.timestamp,
          formattedDateTime: new Date(evt.timestamp).toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
          }),
          category: evt.category,
          type: evt.type,
          reason: evt.reason || null,
          durationMs: evt.durationMs ?? null,
          serverDurationMs: evt.serverDurationMs ?? null,
          details: evt.details || {},
        })),
      };

      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      showToast('تم نسخ تقرير القياس الشامل بصيغة JSON بنجاح', '📋');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('[Telemetry] Copy report failed:', err);
      showToast('تعذر نسخ التقرير للحافظة', '⚠️');
    }
  };

  // Manual trigger to archive / backup
  const handleArchiveNow = async () => {
    setIsArchiving(true);
    try {
      const res = await backupTelemetryToIndexedDB(logs);
      setArchivedCount(res.count);
      showToast(`تم تخزين نسخة احتياطية من ${res.count} حدثاً في ${res.storage === 'indexedDB' ? 'IndexedDB' : 'JSON محلي'}`, '💾');
    } catch {
      showToast('فشل التخزين الاحتياطي', '⚠️');
    } finally {
      setIsArchiving(false);
    }
  };

  // Clear Logs
  const handleClear = async () => {
    clearTelemetryLogs();
    await clearArchivedTelemetryLogs();
    setLogs([]);
    setArchivedCount(0);
    setAuthKeyDetected(false);
    showToast('تم مسح جميع سجلات القياس والأرشيف', '🗑️');
  };

  // Toggle Enable
  const handleToggleEnable = () => {
    const next = !enabled;
    setTelemetryEnabled(next);
    setEnabled(next);
  };

  // Handle Action for AUTH_KEY_UNREGISTERED
  const handleResolveAuthKey = () => {
    onClose();
    // Prompt user to re-login by logging out the invalidated session
    logout();
    showToast('تم إنهاء الجلسة الملغاة، يرجى تسجيل الدخول مرة أخرى لتجديد المفتاح', '🔑');
  };

  // Handle Check for App Update
  const handleCheckUpdate = () => {
    AppUpdateController.getInstance().checkAppUpdate(true);
    showToast('جاري التحقق من وجود تحديثات رسمية للتطبيق...', '🔄');
  };

  if (!isOpen) return null;

  return (
    <div
      id="telemetry-log-modal-overlay"
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="telemetry-log-modal-container"
        className="w-full max-w-4xl h-[90vh] max-h-[850px] bg-[#0e1621] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white select-none overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#17212b] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white m-0 flex items-center gap-1.5">
                  <span>سجل بيانات القياس وتشخيص المزامنة</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    Telemetry & Diagnostics
                  </span>
                </h3>
              </div>
              <p className="text-xs text-gray-400 m-0 mt-0.5">
                مراقبة أداء الشبكة، زمن استجابة الخادم (Latency)، وتشخيص أسباب بطء أو توقف المزامنة بدقة زمنية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Enable/Disable Toggle */}
            <button
              type="button"
              onClick={handleToggleEnable}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                enabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
              title={enabled ? 'التتبع مفعل حالياً' : 'التتبع معطل'}
            >
              <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              <span>{enabled ? 'التتبع نشط' : 'معطل'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Persistence Rules Badge */}
        <div className="px-5 py-2 bg-[#121c27] border-b border-cyan-500/20 flex flex-wrap items-center justify-between text-[11px] text-cyan-200 gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>أمان وخصوصية 100%:</strong> لا يتم تسجيل محتوى الرسائل أو البيانات الحساسة. يتم الحفظ محلياً فقط.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>{logs.length > 50 ? `IndexedDB Backup: ${logs.length} أحداث` : `الذاكرة المؤقتة: ${logs.length}/50`}</span>
            </span>
          </div>
        </div>

        {/* Actionable Error Banner for AUTH_KEY_UNREGISTERED */}
        {authKeyDetected && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200 shrink-0 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">تم رصد خطأ إلغاء جلسة التوثيق (AUTH_KEY_UNREGISTERED): </span>
                <span className="text-amber-100/90">
                  تم إلغاء أو انتهاء صلاحية جلسة تيليجرام من الخادم، مما يوقف استلام الرسائل الجديدة والمزامنة التلقائية.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResolveAuthKey}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 flex items-center gap-1.5 transition-all shadow-sm"
                title="تسجيل الخروج وإعادة الدخول لتوليد مفتاح توثيق جديد"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>إعادة تسجيل الدخول الآن</span>
              </button>
              <button
                type="button"
                onClick={handleCheckUpdate}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 flex items-center gap-1.5 transition-all"
                title="التحقق من وجود تحديث للتطبيق"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>فحص التحديثات</span>
              </button>
            </div>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 shrink-0 bg-[#0e1621]">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-gray-400 block truncate">إجمالي الأحداث المحفوظة</span>
              <span className="text-base font-bold text-white font-mono">{stats.total}</span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-blue-300/80 block truncate">متوسط الاستجابة (Ping)</span>
              <span className="text-base font-bold text-blue-300 font-mono">
                {stats.avgLatency > 0 ? `${stats.avgLatency}ms` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-emerald-300/80 block truncate">حالة الاتصال بالمتصفح</span>
              <span className="text-sm font-bold text-emerald-300">
                {typeof navigator !== 'undefined' && navigator.onLine ? 'متصل (Online)' : 'منقطع (Offline)'}
              </span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-rose-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-rose-300/80 block truncate">أخطاء المزامنة</span>
              <span className="text-base font-bold text-rose-300 font-mono">{stats.syncErrorCount}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 border-y border-white/[0.08] bg-[#131b26] flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Filter Pills & Sort Control */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                categoryFilter === 'all'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              الكل ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('network')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                categoryFilter === 'network'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              الاتصال ({stats.networkCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('latency')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                categoryFilter === 'latency'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              الاستجابة ({stats.latencyCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('sync')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                categoryFilter === 'sync'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              المزامنة ({logs.filter((l) => l.category === 'sync').length})
            </button>

            {/* Sort Toggle (Chronological) */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.03] hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1 transition-all mr-1"
              title={sortOrder === 'asc' ? 'الترتيب الحالي: من الأقدم إلى الأحدث (انقر للعكس)' : 'الترتيب الحالي: من الأحدث إلى الأقدم (انقر للعكس)'}
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>{sortOrder === 'asc' ? 'الترتيب: من الأقدم إلى الأحدث' : 'الترتيب: من الأحدث إلى الأقدم'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunPing}
              disabled={isPinging}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
              title="إجراء فحص فوري لزمن الاستجابة مع الخادم"
            >
              <Zap className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'جاري الفحص...' : 'قياس الاستجابة (Ping)'}</span>
            </button>

            {/* Copy Report Button (نسخ التقرير) */}
            <button
              type="button"
              onClick={handleCopyReport}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-sm"
              title="تصدير ونسخ التقرير الشامل مع البيانات الزمنية بصيغة JSON"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ التقرير'}</span>
            </button>

            {/* Manual Backup Trigger */}
            <button
              type="button"
              onClick={handleArchiveNow}
              disabled={logs.length === 0 || isArchiving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-40"
              title="تخزين نسخة احتياطية محلية في IndexedDB"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isArchiving ? 'جاري الحفظ...' : 'نسخ احتياطي'}</span>
            </button>

            <button
              type="button"
              onClick={refreshLogs}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-all"
                title="مسح السجل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Guide Banner */}
        <div className="px-5 py-2.5 bg-cyan-950/30 border-b border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-200 shrink-0">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">كيف تكتشف سبب تعليق "جاري المزامنة"؟ </span>
            <span>
              إذا ظهرت أخطاء مثل <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">AUTH_KEY_UNREGISTERED</code> فهذا يعني إلغاء الجلسة من تيليجرام ويمكنك حلها مباشرة بالنقر على زر إعادة تسجيل الدخول أعلاه.
              إذا ظهر <code className="bg-black/40 px-1 py-0.5 rounded text-rose-300 font-mono">FLOOD_WAIT</code> فهناك حظر مؤقت.
              وإذا كان <code className="bg-black/40 px-1 py-0.5 rounded text-blue-300 font-mono">Ping</code> مرتفعاً جداً فالمشكلة في بطء أو انقطاع الاتصال.
            </span>
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {processedLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white/[0.01] border border-dashed border-white/10 rounded-xl">
              <Activity className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-sm font-semibold text-gray-300 mb-1">لا توجد أحداث مسجلة حالياً</p>
              <p className="text-xs text-gray-500 max-w-sm mb-3">
                اضغط على زر "قياس الاستجابة (Ping)" لاختبار زمن الاتصال وتسجيل أول حدث قياس فوراً.
              </p>
              <button
                type="button"
                onClick={handleRunPing}
                className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 flex items-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>إجراء فحص Ping الآن</span>
              </button>
            </div>
          ) : (
            processedLogs.map((item, index) => {
              const isNetwork = item.category === 'network';
              const isLatency = item.category === 'latency';
              const isSyncError = item.type === 'sync_error';
              const isSyncSuccess = item.type === 'sync_success';
              const isOnline = item.type === 'network_online';
              const isOffline = item.type === 'network_offline';
              const isAuthKeyErr = item.reason?.includes('AUTH_KEY_UNREGISTERED') || JSON.stringify(item.details || {}).includes('AUTH_KEY_UNREGISTERED');

              // Format date & time precisely (date and time)
              const dateObj = new Date(item.timestamp);
              const formattedDate = dateObj.toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3,
              });

              return (
                <div
                  key={item.id || index}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isAuthKeyErr
                      ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-sm'
                      : isSyncError || isOffline
                      ? 'bg-rose-500/[0.05] border-rose-500/30'
                      : isOnline || isSyncSuccess
                      ? 'bg-emerald-500/[0.05] border-emerald-500/30'
                      : isLatency
                      ? 'bg-blue-500/[0.05] border-blue-500/30'
                      : 'bg-white/[0.02] border-white/10'
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isAuthKeyErr
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : isSyncError || isOffline
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isOnline || isSyncSuccess
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isAuthKeyErr ? (
                        <KeyRound className="w-4 h-4" />
                      ) : isOffline ? (
                        <WifiOff className="w-4 h-4" />
                      ) : isOnline ? (
                        <Wifi className="w-4 h-4" />
                      ) : isSyncError ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isSyncSuccess ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                            isAuthKeyErr
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : isSyncError
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : isOnline || isSyncSuccess
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          }`}
                        >
                          {item.type}
                        </span>

                        {item.reason && (
                          <span className={`font-semibold ${isAuthKeyErr ? 'text-amber-200' : 'text-gray-200'}`}>
                            {item.reason}
                          </span>
                        )}

                        {/* Actionable button directly on AUTH_KEY_UNREGISTERED item */}
                        {isAuthKeyErr && (
                          <button
                            type="button"
                            onClick={handleResolveAuthKey}
                            className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
                            title="إعادة تسجيل الدخول الآن"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>تجديد الجلسة</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                        {/* Precise Date */}
                        <span className="text-gray-300 font-medium">
                          {formattedDate}
                        </span>
                        <span className="text-gray-600">•</span>
                        {/* Precise Time */}
                        <span className="text-cyan-300 font-mono">
                          {formattedTime}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="font-mono text-[10px] text-gray-500">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right metrics / duration */}
                  <div className="flex items-center gap-2 shrink-0 pr-11 sm:pr-0">
                    {typeof item.durationMs === 'number' && (
                      <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-cyan-300 flex items-center gap-1">
                        <span className="text-gray-400 text-[10px]">Client:</span>
                        <span className="font-bold">{item.durationMs}ms</span>
                      </div>
                    )}

                    {typeof item.serverDurationMs === 'number' && (
                      <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-emerald-300 flex items-center gap-1">
                        <span className="text-gray-400 text-[10px]">Server:</span>
                        <span className="font-bold">{item.serverDurationMs}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#17212b] flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>
              {logs.length > 50 ? (
                <span className="text-cyan-300 font-semibold">
                  يتم حفظ السجل تلقائياً في IndexedDB مع نسخة احتياطية JSON لحفظ أكثر من 50 حدثاً بأمان.
                </span>
              ) : (
                <span>
                  يتم الاحتفاظ بالأحداث محلياً، وعند تجاوز <strong>50 حدثاً</strong> يتم التخزين الاحتياطي التلقائي في IndexedDB.
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelemetryLogModal;
