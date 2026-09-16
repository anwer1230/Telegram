import React, { useState, useEffect } from "react";
import {
  X,
  Repeat,
  Play,
  Square,
  Save,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  ListPlus,
  RefreshCw,
} from "lucide-react";
import { RotatingBroadcastSettings, RotatingBroadcastLog } from "../../types";

interface RotatingBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (isRunning: boolean) => void;
}

export const RotatingBroadcastModal: React.FC<RotatingBroadcastModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [messages, setMessages] = useState<string[]>([
    "🚀 أهلاً بكم! نقدم لكم أفضل خدمات الدعاية والنشر الدوري الذكي في تليجرام مع تقارير حية ومتابعة مستمرة.",
    "💡 هل تريد زيادة مبيعاتك واستقطاب عملاء حقيقيين؟ استكشف الآن باقات التسويق المؤتمتة الخاصة بنا.",
    "🎯 خدمة الردود الذكية تعمل 24/7 للرد على استفسارات عملائك وزيادة نسبة التحويل فورياً.",
    "📚 للباحثين والطلاب: دمجنا لكم المحرك الأكاديمي الذكي لتحليل المستندات وتنسيق الأبحاث بنقرة زر.",
    "⚡ انضم الآن إلى شبكتنا واحصل على استشارة تسويقية مجانية لحسابك وقناتك!",
  ]);
  const [groupsText, setGroupsText] = useState(
    "https://t.me/marketing_saudi_hub\nhttps://t.me/gulf_business_deals\nhttps://t.me/academic_research_arab\nhttps://t.me/tech_startups_mena\nhttps://t.me/ecommerce_growth_arab"
  );
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [logs, setLogs] = useState<RotatingBroadcastLog[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => (c > 1 ? c - 1 : intervalMinutes * 60));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, countdown, intervalMinutes]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/rotating/status");
      const data = await res.json();
      if (data.success && data.settings) {
        setMessages(data.settings.messages || []);
        setGroupsText((data.settings.groups || []).join("\n"));
        setIntervalMinutes(data.settings.interval || 5);
        setIsRunning(data.settings.isRunning || false);
        setCountdown(data.settings.next_send_in || 300);
        setLogs(data.logs || []);
        onStatusChange?.(data.settings.isRunning);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    const groupsList = groupsText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/rotating/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          groups: groupsList,
          interval: intervalMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "تم حفظ إعدادات الإرسال المتسلسل");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStart = async () => {
    await handleSave();
    try {
      const res = await fetch("/api/rotating/start", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsRunning(true);
        setCountdown(intervalMinutes * 60);
        showToast("🔄 تم بدء الإرسال المتسلسل في الخلفية");
        onStatusChange?.(true);
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch("/api/rotating/stop", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsRunning(false);
        showToast("تم إيقاف الإرسال المتسلسل");
        onStatusChange?.(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateMessageText = (index: number, val: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="rotatingModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>النشر الدوري المتسلسل (Rotating Broadcast)</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${
                    isRunning
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {isRunning ? "يعمل في الخلفية (Threaded)" : "متوقف"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                إرسال متتابع لـ 5 نصوص إعلانية مختلفة على المجموعات المستهدفة مع فاصل زمني دقيق
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
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        {/* Live Status Ribbon */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">الإرسال القادم خلال:</span>
              <span className="font-mono text-sm font-bold text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {isRunning ? formatSeconds(countdown) : "--:--"}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              <span>الفاصل الزمني: </span>
              <span className="text-white font-bold">{intervalMinutes} دقائق</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                <span>بدء الإرسال المتسلسل</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Square className="w-3.5 h-3.5" />
                <span>إيقاف الإرسال</span>
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[64vh] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col (7 cols): The 5 Rotating Messages */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200">النصوص الإعلانية المتسلسلة (حتى 5 رسائل)</h4>
                <span className="text-[11px] text-slate-400">يتم تداولها بالتتابع التلقائي</span>
              </div>

              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                    <span className="text-emerald-400">الرسالة رقم {idx + 1}</span>
                    <span>{(messages[idx] || "").length} حرف</span>
                  </div>
                  <textarea
                    rows={2}
                    value={messages[idx] || ""}
                    onChange={(e) => updateMessageText(idx, e.target.value)}
                    placeholder={`اكتب نص الإعلان رقم ${idx + 1}...`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              ))}
            </div>

            {/* Right Col (5 cols): Target Groups & Settings */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  روابط المجموعات المستهدفة (رابط في كل سطر)
                </label>
                <textarea
                  rows={7}
                  value={groupsText}
                  onChange={(e) => setGroupsText(e.target.value)}
                  placeholder="https://t.me/group1&#10;https://t.me/group2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  إجمالي المجموعات المدخلة: {groupsText.split("\n").filter((g) => g.trim()).length}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  الفاصل الزمني بين كل إرسال (بالدقائق)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-400">دقائق بين كل رسالة</span>
                </div>
              </div>

              {/* Real-time Operation Logs */}
              <div>
                <h5 className="text-xs font-bold text-slate-300 mb-2">سجل الإرسال الدوري المباشر</h5>
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-2.5 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">لا توجد عمليات إرسال بعد</div>
                  ) : (
                    logs.map((lg) => (
                      <div
                        key={lg.id}
                        className={`p-1.5 rounded flex items-center justify-between ${
                          lg.status === "success"
                            ? "text-emerald-400 bg-emerald-950/20"
                            : "text-rose-400 bg-rose-950/20"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                          <span>{lg.status === "success" ? "🔄 [متسلسل]" : "❌ [فشل]"}</span>
                          <span>أرسل إلى {lg.group}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{lg.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">إدارة: RotatingSendManager (Python Threading Engine)</span>
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
