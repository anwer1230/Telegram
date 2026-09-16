import React, { useState, useEffect } from "react";
import { Sidebar, TabType } from "./components/Sidebar";
import { Header } from "./components/Header";
import { AdvancedFunctionsHub } from "./components/advanced/AdvancedFunctionsHub";
import { SmartLearningModal } from "./components/advanced/SmartLearningModal";
import { RotatingBroadcastModal } from "./components/advanced/RotatingBroadcastModal";
import { SearchMyLinksModal } from "./components/advanced/SearchMyLinksModal";
import { TelegramGlobalSearchModal } from "./components/advanced/TelegramGlobalSearchModal";
import { AdvancedJoinModal } from "./components/advanced/AdvancedJoinModal";
import { DirectLinkJoinModal } from "./components/advanced/DirectLinkJoinModal";
import { AutoRepliesModal } from "./components/advanced/AutoRepliesModal";
import { MonitoringSettingsModal } from "./components/advanced/MonitoringSettingsModal";
import { AcademicAnalysisModal } from "./components/academic/AcademicAnalysisModal";
import { DocumentFormatterModal } from "./components/academic/DocumentFormatterModal";
import { useTelegramEvents } from "./hooks/useTelegramEvents";
import {
  Activity,
  Radio,
  Send,
  Users,
  ShieldCheck,
  Zap,
  Repeat,
  Sparkles,
  Bot,
  Brain,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Bookmark,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Cross-modal data transfer
  const [transferredUrls, setTransferredUrls] = useState<string[]>([]);

  // Indicators & Live Status
  const [isRotatingRunning, setIsRotatingRunning] = useState(false);
  const [learningActive, setLearningActive] = useState(true);
  const [directJoinActive, setDirectJoinActive] = useState(true);
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(3);
  const [foundLinksCount, setFoundLinksCount] = useState(18);

  // Real-time Telegram Events Hook
  const {
    notifications,
    recentEvents,
    clearNotifications,
    systemMetrics,
  } = useTelegramEvents();

  // Polling backend status on load
  useEffect(() => {
    fetchInitialStatus();
  }, []);

  const fetchInitialStatus = async () => {
    try {
      const [rotRes, learnRes, dirRes, linksRes] = await Promise.all([
        fetch("/api/rotating/status").then((r) => r.json()).catch(() => null),
        fetch("/api/learning/status").then((r) => r.json()).catch(() => null),
        fetch("/api/direct_join/status").then((r) => r.json()).catch(() => null),
        fetch("/api/search_my_links/status").then((r) => r.json()).catch(() => null),
      ]);

      if (rotRes?.success && rotRes.settings) {
        setIsRotatingRunning(rotRes.settings.isRunning);
      }
      if (learnRes?.success) {
        setLearningActive(learnRes.active_private || learnRes.active_group);
      }
      if (dirRes?.success && dirRes.status) {
        setDirectJoinActive(dirRes.status.enabled);
      }
      if (linksRes?.success && linksRes.links) {
        setFoundLinksCount(linksRes.links.length);
      }
    } catch (e) {
      console.error("Error fetching system initial status", e);
    }
  };

  const handleOpenModal = (modalName: string) => {
    // Normalize modal names
    if (modalName === "learning" || modalName === "learningModal") {
      setActiveModal("learningModal");
    } else if (modalName === "rotating" || modalName === "rotatingModal") {
      setActiveModal("rotatingModal");
    } else if (modalName === "search_links" || modalName === "searchMyLinksModal") {
      setActiveModal("searchMyLinksModal");
    } else if (
      modalName === "global_search" ||
      modalName === "globalSearchModal" ||
      modalName === "quick_join"
    ) {
      setActiveModal("globalSearchModal");
    } else if (modalName === "advanced_join" || modalName === "advancedJoinModal") {
      setActiveModal("advancedJoinModal");
    } else if (modalName === "direct_join" || modalName === "directJoinModal") {
      setActiveModal("directJoinModal");
    } else if (modalName === "auto_replies" || modalName === "autoRepliesModal") {
      setActiveModal("autoRepliesModal");
    } else if (modalName === "monitoring" || modalName === "monitoringModal") {
      setActiveModal("monitoringModal");
    } else if (
      modalName === "academic" ||
      modalName === "academic_analysis" ||
      modalName === "academicAnalysis"
    ) {
      setActiveModal("academicAnalysis");
    } else if (
      modalName === "doc_formatter" ||
      modalName === "documentFormatter"
    ) {
      setActiveModal("documentFormatter");
    } else {
      setActiveModal(modalName);
    }
  };

  const handleTransferToAutoJoin = (urls: string[]) => {
    setTransferredUrls(urls);
    setActiveModal("advancedJoinModal");
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-purple-600 selection:text-white" dir="rtl">
      {/* Right Sidebar (RTL Navigation) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== "overview") {
            handleOpenModal(tab);
          }
        }}
        openModal={handleOpenModal}
        badges={{
          learningSuggestions: pendingSuggestionsCount,
          foundLinks: foundLinksCount,
          activeJoins: 5,
          directJoinsToday: 14,
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          openModal={handleOpenModal}
          notifications={notifications}
          clearNotifications={clearNotifications}
          onQuickJoin={() => handleOpenModal("globalSearchModal")}
        />

        {/* Dashboard Scrollable Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Top Performance & Telethon Account Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400">إجمالي القنوات والمجموعات</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">428</div>
                <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span>+14 اليوم عبر الانضمام المباشر</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400">حالة النشر الدوري المتسلسل</span>
                <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isRotatingRunning ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
                  <span>{isRotatingRunning ? "يعمل في الخلفية (Threaded)" : "متوقف / جاهز"}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">5 نصوص ترويجية بالتتابع</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Repeat className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400">نظام التعلم والرد الذكي</span>
                <div className="text-2xl font-bold font-mono text-purple-300 mt-1">99.4%</div>
                <div className="text-[11px] text-purple-400 mt-0.5 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  <span>{pendingSuggestionsCount} اقتراحات ذكية جديدة</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Brain className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400">مراقب الروابط الدائم (Daemon)</span>
                <div className="text-base font-bold text-rose-400 mt-1 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>نشط (فاصل 60 ثانية)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">حماية من حظر FloodWait</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Radio className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs font-bold text-slate-300 px-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>إجراءات سريعة:</span>
            </span>
            <button
              onClick={() => handleOpenModal("rotatingModal")}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>إعداد النشر الدوري</span>
            </button>
            <button
              onClick={() => handleOpenModal("globalSearchModal")}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث تيليجرام الشامل والانضمام</span>
            </button>
            <button
              onClick={() => handleOpenModal("searchMyLinksModal")}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>استخراج الروابط من رسائلي</span>
            </button>
            <button
              onClick={() => handleOpenModal("learningModal")}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>تدريب عقل البوت</span>
            </button>
            <button
              onClick={() => handleOpenModal("academicAnalysis")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>الأدوات الأكاديمية (Gemini)</span>
            </button>
          </div>

          {/* Section 1: Advanced Functions Hub (The exact HTML/CSS grid specified by the user) */}
          <section id="section-hub">
            <AdvancedFunctionsHub
              openModal={handleOpenModal}
              statusIndicators={{
                isRotatingRunning,
                learningActive,
                directJoinActive,
                foundLinksCount,
                pendingSuggestions: pendingSuggestionsCount,
              }}
            />
          </section>

          {/* Live Activity Stream & Real-time Daemon Log Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Events Stream (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">شريط النشاط اللحظي المباشر</h3>
                    <p className="text-[11px] text-slate-400">تدفق أحداث Telethon و Socket.IO في الوقت الفعلي</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>متدفق</span>
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    جاري استقبال الأحداث اللحظية من الخادم...
                  </div>
                ) : (
                  recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            evt.type === "success"
                              ? "bg-emerald-400"
                              : evt.type === "warning"
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          }`}
                        />
                        <div>
                          <div className="font-semibold text-slate-200">{evt.title}</div>
                          <div className="text-[11px] text-slate-400">{evt.message}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 mr-2">{evt.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Status & Daemon Guard Details (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">حالة الخوادم والأمان (System Health)</h3>
                    <p className="text-[11px] text-slate-400">تطبيق معايير حظر FloodWait والتنقية</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">بروتوكول الاتصال (Telethon MTProto):</span>
                  <span className="font-semibold text-emerald-400 font-mono">متصل وموثق</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">المعالج الخلفي (Thread Engine):</span>
                  <span className="font-semibold text-slate-200 font-mono">Python 3.11 + Flask/SocketIO</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">حماية الفواصل الزمنية (Flood Interval):</span>
                  <span className="font-semibold text-amber-400 font-mono">60 ثانية دنيا</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">المحرك الأكاديمي والتحليلي:</span>
                  <span className="font-semibold text-purple-400 font-mono">Gemini 2.5 Pro Engine</span>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-[11px] text-purple-300 leading-relaxed">
                  💡 تم دمج كافة الأنظمة والوظائف العشر وتفعيل الاتصال المزدوج بين واجهة React 19 وخوادم الأتمتة.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODALS LAYER */}
      {/* 1. Smart Learning Modal */}
      <SmartLearningModal
        isOpen={activeModal === "learningModal"}
        onClose={() => setActiveModal(null)}
        onServiceAdded={() => setPendingSuggestionsCount((c) => Math.max(0, c - 1))}
      />

      {/* 2. Rotating Broadcast Modal */}
      <RotatingBroadcastModal
        isOpen={activeModal === "rotatingModal"}
        onClose={() => setActiveModal(null)}
        onStatusChange={(running) => setIsRotatingRunning(running)}
      />

      {/* 3. Search My Links Modal */}
      <SearchMyLinksModal
        isOpen={activeModal === "searchMyLinksModal"}
        onClose={() => setActiveModal(null)}
        onTransferToAutoJoin={handleTransferToAutoJoin}
      />

      {/* 4. Telegram Global Search Modal */}
      <TelegramGlobalSearchModal
        isOpen={activeModal === "globalSearchModal"}
        onClose={() => setActiveModal(null)}
      />

      {/* 5. Advanced Join Modal */}
      <AdvancedJoinModal
        isOpen={activeModal === "advancedJoinModal"}
        onClose={() => setActiveModal(null)}
        incomingUrls={transferredUrls}
      />

      {/* 6. Direct Link Join Modal */}
      <DirectLinkJoinModal
        isOpen={activeModal === "directJoinModal"}
        onClose={() => setActiveModal(null)}
      />

      {/* 7. Auto Replies Modal */}
      <AutoRepliesModal
        isOpen={activeModal === "autoRepliesModal"}
        onClose={() => setActiveModal(null)}
      />

      {/* 8. Monitoring & Sending Settings Modal */}
      <MonitoringSettingsModal
        isOpen={activeModal === "monitoringModal"}
        onClose={() => setActiveModal(null)}
      />

      {/* 9. Academic Analysis Modal */}
      <AcademicAnalysisModal
        isOpen={activeModal === "academicAnalysis"}
        onClose={() => setActiveModal(null)}
      />

      {/* 10. Document Formatter Modal */}
      <DocumentFormatterModal
        isOpen={activeModal === "documentFormatter"}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
