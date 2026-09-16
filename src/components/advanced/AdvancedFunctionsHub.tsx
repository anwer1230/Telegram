import React from "react";
import {
  Brain,
  Repeat,
  Link2,
  Globe,
  Zap,
  MessageSquareCode,
  Radio,
  GraduationCap,
  Sliders,
  Sparkles,
  Layers,
} from "lucide-react";

interface AdvancedFunctionsHubProps {
  openModal: (modalId: string) => void;
  statusIndicators?: {
    isRotatingRunning: boolean;
    learningActive: boolean;
    directJoinActive: boolean;
    foundLinksCount: number;
    pendingSuggestions: number;
  };
}

export const AdvancedFunctionsHub: React.FC<AdvancedFunctionsHubProps> = ({
  openModal,
  statusIndicators = {
    isRotatingRunning: false,
    learningActive: true,
    directJoinActive: true,
    foundLinksCount: 18,
    pendingSuggestions: 2,
  },
}) => {
  return (
    <div id="advanced-functions-hub" className="section-card shadow-xl">
      {/* Header matching exact HTML spec */}
      <div className="section-header card-header-violet">
        <div
          className="section-header-icon"
          style={{ background: "rgba(139,92,246,0.2)" }}
        >
          <i className="fas fa-layer-group" style={{ color: "#a78bfa" }}></i>
        </div>
        <div className="flex items-center justify-between w-full">
          <span style={{ color: "#a78bfa", fontSize: "0.92rem", fontWeight: 700 }}>
            الوظائف المتقدمة (Advanced Functions Hub)
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            <span>مركز تحكم رئيسي نشط</span>
          </span>
        </div>
      </div>

      {/* Body with grid cards */}
      <div className="section-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. بطاقة نظام التعلم الذكي */}
          <div className="relative group">
            <button
              id="hub-btn-learning"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("learningModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-brain text-lg" style={{ color: "#60a5fa" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">نظام التعلم الذكي</div>
                  <div className="text-[11px] text-slate-400 font-normal">تدريب المعرفة وقاعدة الردود</div>
                </div>
              </div>
              <span
                id="suggestionsBadge"
                className="text-[11px] px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/80 font-mono"
              >
                {statusIndicators.pendingSuggestions} مقترحات
              </span>
            </button>
          </div>

          {/* 2. بطاقة النشر الدوري */}
          <div className="relative group">
            <button
              id="hub-btn-rotating"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("rotatingModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-sync-alt text-lg" style={{ color: "#34d399" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">النشر الدوري المتسلسل</div>
                  <div className="text-[11px] text-slate-400 font-normal">5 رسائل دورية بالتتابع</div>
                </div>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md border font-normal ${
                  statusIndicators.isRotatingRunning
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {statusIndicators.isRotatingRunning ? "جارٍ الإرسال" : "جاهز"}
              </span>
            </button>
          </div>

          {/* 3. البحث في روابطي */}
          <div className="relative group">
            <button
              id="hub-btn-search-links"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("searchMyLinksModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-link text-lg" style={{ color: "#22d3ee" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">البحث في روابطي</div>
                  <div className="text-[11px] text-slate-400 font-normal">استخراج تدفقي داخل المحادثات</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                {statusIndicators.foundLinksCount} رابط
              </span>
            </button>
          </div>

          {/* 4. بحث تليجرام الشامل والانضمام الفوري */}
          <div className="relative group">
            <button
              id="hub-btn-global-search"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("globalSearchModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-globe text-lg" style={{ color: "#818cf8" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">بحث تليجرام الشامل</div>
                  <div className="text-[11px] text-slate-400 font-normal">MTProto Native + انضمام فوري</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 font-normal">
                خوادم عامة
              </span>
            </button>
          </div>

          {/* 5. الانضمام المتقدم */}
          <div className="relative group">
            <button
              id="hub-btn-advanced-join"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("advancedJoinModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-bolt text-lg" style={{ color: "#fbbf24" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">الانضمام المتقدم</div>
                  <div className="text-[11px] text-slate-400 font-normal">تحكم كامل وتحليل الفشل</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 font-normal">
                حماية FloodWait
              </span>
            </button>
          </div>

          {/* 6. الانضمام المباشر الدائم */}
          <div className="relative group">
            <button
              id="hub-btn-direct-join"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("directJoinModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-satellite-dish text-lg" style={{ color: "#f43f5e" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">الانضمام المباشر (Daemon)</div>
                  <div className="text-[11px] text-slate-400 font-normal">مراقب دائم للرسائل والروابط</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800 font-normal">
                15 / ساعة
              </span>
            </button>
          </div>

          {/* 7. الردود التلقائية */}
          <div className="relative group">
            <button
              id="hub-btn-auto-replies"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("autoRepliesModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-comment-dots text-lg" style={{ color: "#a855f7" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">الردود التلقائية (Auto Replies)</div>
                  <div className="text-[11px] text-slate-400 font-normal">قواعد ومطابقات Regex والخاص/المجموعات</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 font-normal">
                نشط
              </span>
            </button>
          </div>

          {/* 8. الأدوات الأكاديمية والتحليلية */}
          <div className="relative group">
            <button
              id="hub-btn-academic"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("academic_analysis")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-graduation-cap text-lg" style={{ color: "#c084fc" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">الأدوات الأكاديمية (AI Suite)</div>
                  <div className="text-[11px] text-slate-400 font-normal">تحليل المستندات والتحويل لـ Word</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-950 text-violet-300 border border-violet-800 font-normal">
                Gemini
              </span>
            </button>
          </div>

          {/* 9. إعدادات المراقبة والإرسال */}
          <div className="relative group">
            <button
              id="hub-btn-monitoring"
              className="adv-func-btn flex items-center justify-between"
              onClick={() => openModal("monitoringModal")}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-shield-alt text-lg" style={{ color: "#14b8a6" }}></i>
                <div className="text-right">
                  <div className="font-semibold text-slate-100">إعدادات المراقبة والإرسال</div>
                  <div className="text-[11px] text-slate-400 font-normal">أوضاع التنقية (سلام، تخطي، تنقية)</div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800 font-normal">
                حماية متقدمة
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
