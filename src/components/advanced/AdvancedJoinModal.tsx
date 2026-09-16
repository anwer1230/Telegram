import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Square,
  LogOut,
  CheckCircle2,
  BookmarkCheck,
  AlertTriangle,
  BarChart3,
  ShieldAlert,
  Clock,
  RefreshCw,
} from "lucide-react";
import { AdvancedJoinStats, FailureBreakdown, AutoJoinLog, AutoJoinStatus } from "../../types";

interface AdvancedJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingUrls?: string[];
}

export const AdvancedJoinModal: React.FC<AdvancedJoinModalProps> = ({
  isOpen,
  onClose,
  incomingUrls,
}) => {
  const [status, setStatus] = useState<AutoJoinStatus>("idle");
  const [urlsText, setUrlsText] = useState("");
  const [stats, setStats] = useState<AdvancedJoinStats>({
    success: 24,
    alreadyJoined: 11,
    failed: 5,
    total: 40,
    currentProgressPercent: 87,
    remaining: 5,
  });
  const [failureBreakdown, setFailureBreakdown] = useState<FailureBreakdown>({
    floodWait: 2,
    floodWaitSeconds: 45,
    expiredLink: 1,
    closedGroup: 1,
    adminApproval: 1,
  });
  const [logs, setLogs] = useState<AutoJoinLog[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (incomingUrls && incomingUrls.length > 0) {
      setUrlsText(incomingUrls.join("\n"));
    }
  }, [incomingUrls]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/auto_join/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (data.stats) setStats(data.stats);
        if (data.breakdown) setFailureBreakdown(data.breakdown);
        if (data.urlsText && !urlsText) setUrlsText(data.urlsText);
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStart = async () => {
    try {
      const res = await fetch("/api/auto_join/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlsText }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("running");
        showToast("⚡ تم بدء معالجة قائمة الانضمام المتقدم");
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetch("/api/auto_join/pause", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("paused");
        showToast("تم إيقاف الانضمام مؤقتاً");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch("/api/auto_join/resume", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("running");
        showToast("تم استئناف عملية الانضمام");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch("/api/auto_join/stop", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("stopped");
        showToast("تم إيقاف الانضمام نهائياً");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="advancedJoinModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>الانضمام المتقدم (Advanced Auto-Join)</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${
                    status === "running"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                      : status === "paused"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {status === "running"
                    ? "جارٍ المعالجة"
                    : status === "paused"
                    ? "إيقاف مؤقت"
                    : status === "stopped"
                    ? "متوقف"
                    : "جاهز"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                إدارة الانضمام للمجموعات مع حماية الفواصل الزمنية وتحليل أسباب الرفض بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-300 flex items-center gap-2">
            <span>{toast}</span>
          </div>
        )}

        {/* Operational Controls Toolbar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {status !== "running" && status !== "paused" && (
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                <span>بدء الانضمام المتقدم</span>
              </button>
            )}

            {status === "running" && (
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>إيقاف مؤقت</span>
              </button>
            )}

            {status === "paused" && (
              <button
                onClick={handleResume}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استئناف العمل</span>
              </button>
            )}

            {(status === "running" || status === "paused") && (
              <button
                onClick={handleStop}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Square className="w-3.5 h-3.5" />
                <span>إيقاف نهائي</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج يدوي</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            المتبقي في القائمة: <span className="text-amber-400 font-bold">{stats.remaining}</span> روابط
          </div>
        </div>

        {/* Progress Bar (شريط التقدم الحي والمتحرك) */}
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>نسبة إنجاز القائمة (Progress):</span>
            <span className="font-mono text-amber-400 font-bold">{stats.currentProgressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500 relative"
              style={{ width: `${stats.currentProgressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_infinite]"></div>
            </div>
          </div>
        </div>

        {/* 4 Colored Stat Boxes (4 صناديق إحصائيات ملونة) */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. نجح (Success) */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-emerald-400">✅ نجح (Success)</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{stats.success}</div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400/60" />
          </div>

          {/* 2. منضم مسبقاً (Already Joined) */}
          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-sky-400">📌 منضم مسبقاً</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{stats.alreadyJoined}</div>
            </div>
            <BookmarkCheck className="w-6 h-6 text-sky-400/60" />
          </div>

          {/* 3. فشل (Failed) */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-rose-400">❌ فشل (Failed)</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{stats.failed}</div>
            </div>
            <AlertTriangle className="w-6 h-6 text-rose-400/60" />
          </div>

          {/* 4. الإجمالي (Total) */}
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-purple-400">📊 الإجمالي (Total)</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{stats.total}</div>
            </div>
            <BarChart3 className="w-6 h-6 text-purple-400/60" />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* URLs Text Area (6 cols) */}
            <div className="md:col-span-6 space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                قائمة الروابط المراد الانضمام إليها (رابط لكل سطر):
              </label>
              <textarea
                rows={8}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder="https://t.me/example_group_1&#10;https://t.me/example_group_2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <div className="text-[11px] text-slate-400">
                فاصل الأمان الافتراضي: 10 ثوانٍ بين كل عملية لضمان سلامة الحساب.
              </div>
            </div>

            {/* Failure Breakdown (6 cols) */}
            <div className="md:col-span-6 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>تحليل أسباب الفشل (Fail Breakdown):</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">حظر مؤقت (FloodWait):</span>
                  <span className="font-mono text-rose-400 font-bold">
                    {failureBreakdown.floodWait} (ينتهي خلال {failureBreakdown.floodWaitSeconds}s)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">رابط منتهي أو محذوف:</span>
                  <span className="font-mono text-rose-400 font-bold">{failureBreakdown.expiredLink}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">مجموعة مغلقة / خاصة:</span>
                  <span className="font-mono text-rose-400 font-bold">{failureBreakdown.closedGroup}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">طلب موافقة المشرف (Admin Approval):</span>
                  <span className="font-mono text-amber-400 font-bold">{failureBreakdown.adminApproval}</span>
                </div>
              </div>

              {/* Real-time Join Log */}
              <div className="pt-2">
                <h5 className="text-xs font-bold text-slate-400 mb-1.5">آخر أحداث الانضمام:</h5>
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 max-h-28 overflow-y-auto space-y-1 font-mono text-[10px]">
                  {logs.map((lg) => (
                    <div
                      key={lg.id}
                      className={`p-1 rounded flex items-center justify-between ${
                        lg.status === "success"
                          ? "text-emerald-400 bg-emerald-950/20"
                          : lg.status === "already_joined"
                          ? "text-sky-400 bg-sky-950/20"
                          : "text-rose-400 bg-rose-950/20"
                      }`}
                    >
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{lg.url}</span>
                      <span className="shrink-0">{lg.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            الحماية: خوارزمية تخفيف الضغط والانتظار التلقائي عند استلام كود FloodWait
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
