import React, { useState, useEffect } from "react";
import {
  X,
  Radio,
  Power,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Satellite,
  Bookmark,
} from "lucide-react";
import { DirectJoinStatus, DirectJoinEvent } from "../../types";

interface DirectLinkJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectLinkJoinModal: React.FC<DirectLinkJoinModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<DirectJoinStatus>({
    enabled: true,
    minInterval: 60,
    maxJoinsPerHour: 15,
    joinsThisHour: 4,
    totalSeenLinks: 1248,
    totalAutoJoined: 312,
    lastJoinedGroup: "https://t.me/saudi_contractors_hub",
    lastJoinTime: "منذ 4 دقائق",
  });
  const [events, setEvents] = useState<DirectJoinEvent[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/direct_join/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch("/api/direct_join/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !status.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus((prev) => ({ ...prev, enabled: data.enabled }));
        showToast(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="directJoinModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>خدمة الانضمام المباشر الدائم (DirectLinkJoinService)</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${
                    status.enabled
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {status.enabled ? "الخدمة تعمل في الخلفية (Daemon Active)" : "الخدمة معطلة"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                مراقب روابط دائم يستمع لجميع الرسائل الواردة وينضم تلقائياً مع حفظ الروابط
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
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2.5 text-xs text-rose-300 flex items-center gap-2">
            <span>{toast}</span>
          </div>
        )}

        {/* Daemon Control Banner */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                status.enabled ? "bg-rose-500 animate-ping" : "bg-slate-600"
              }`}
            />
            <div>
              <div className="text-xs font-bold text-slate-200">
                حالة المراقب: {status.enabled ? "مفعّل - يستمع للرسائل اللحظية" : "متوقف مؤقتاً"}
              </div>
              <div className="text-[11px] text-slate-400">
                الفاصل الأمني: {status.minInterval} ثانية • الحد الأقصى: {status.maxJoinsPerHour} انضماماً / ساعة
              </div>
            </div>
          </div>

          <button
            onClick={handleToggle}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              status.enabled
                ? "bg-rose-600/30 text-rose-300 border border-rose-500/50 hover:bg-rose-600/40"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{status.enabled ? "تعطيل خدمة المراقب" : "تفعيل خدمة المراقب الدائم"}</span>
          </button>
        </div>

        {/* 4 Stats Cards */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">انضمام خلال الساعة</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              {status.joinsThisHour} / {status.maxJoinsPerHour}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">الروابط المفحوصة (Seen)</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {status.totalSeenLinks.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">إجمالي المنضم إليها تلقائياً</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {status.totalAutoJoined.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">آخر انضمام ناجح</div>
            <div className="text-xs font-bold text-amber-400 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {status.lastJoinTime}
            </div>
          </div>
        </div>

        {/* Live Stream Events */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400" />
              <span>سجل الاستماع اللحظي واقتناص الروابط (Live Events Stream)</span>
            </h4>
            <span className="text-[11px] text-slate-400">تحديث فوري عبر Socket.IO</span>
          </div>

          <div className="space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        ev.type === "joined"
                          ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                          : ev.type === "skipped"
                          ? "bg-slate-800 text-slate-400 border-slate-700"
                          : "bg-amber-950 text-amber-300 border-amber-800"
                      }`}
                    >
                      {ev.type === "joined"
                        ? "✅ تم الانضمام"
                        : ev.type === "skipped"
                        ? "⏭️ تم التخطي"
                        : "⏳ فاصل أمان"}
                    </span>
                    <span className="text-slate-300 font-semibold">{ev.sourceChat}</span>
                  </div>
                  <div className="font-mono text-rose-400 text-[11px]">{ev.groupUrl}</div>
                  <div className="text-slate-400 text-[11px]">{ev.note}</div>
                </div>

                <div className="shrink-0 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{ev.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            مستقل تماماً عن المهام المجدولة، يعمل في الخلفية بمجرد اتصال حساب Telethon
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
