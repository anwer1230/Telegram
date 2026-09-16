import React from "react";
import {
  LayoutDashboard,
  Brain,
  Repeat,
  Link2,
  Globe,
  Zap,
  Radio,
  MessageSquareCode,
  Sliders,
  GraduationCap,
  ShieldCheck,
  Send,
  Sparkles,
  X,
} from "lucide-react";

export type TabType =
  | "overview"
  | "learning"
  | "rotating"
  | "search_links"
  | "global_search"
  | "advanced_join"
  | "direct_join"
  | "auto_replies"
  | "monitoring"
  | "academic";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  openModal: (modal: string) => void;
  badges: {
    learningSuggestions: number;
    foundLinks: number;
    activeJoins: number;
    directJoinsToday: number;
  };
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openModal,
  badges,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: "overview" as TabType,
      label: "لوحة التحكم الشاملة",
      icon: LayoutDashboard,
      badge: null,
      color: "text-blue-400",
    },
    {
      category: "الوظائف المتقدمة (Advanced Suite)",
      items: [
        {
          id: "learning" as TabType,
          label: "نظام التعلم الذكي",
          icon: Brain,
          badge: badges.learningSuggestions ? `${badges.learningSuggestions} مقترح` : "ذكي",
          badgeColor: "bg-purple-950 text-purple-300 border-purple-800",
          color: "text-purple-400",
        },
        {
          id: "rotating" as TabType,
          label: "النشر الدوري المتسلسل",
          icon: Repeat,
          badge: "دوري",
          badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-800",
          color: "text-emerald-400",
        },
        {
          id: "search_links" as TabType,
          label: "البحث في روابطي",
          icon: Link2,
          badge: `${badges.foundLinks} رابط`,
          badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-800",
          color: "text-cyan-400",
        },
        {
          id: "global_search" as TabType,
          label: "بحث تليجرام الشامل",
          icon: Globe,
          badge: "فوري",
          badgeColor: "bg-blue-950 text-blue-300 border-blue-800",
          color: "text-blue-400",
        },
        {
          id: "advanced_join" as TabType,
          label: "الانضمام المتقدم",
          icon: Zap,
          badge: badges.activeJoins ? `${badges.activeJoins} جارٍ` : "أمان",
          badgeColor: "bg-amber-950 text-amber-300 border-amber-800",
          color: "text-amber-400",
        },
        {
          id: "direct_join" as TabType,
          label: "الانضمام المباشر الدائم",
          icon: Radio,
          badge: "دائم (60s)",
          badgeColor: "bg-rose-950 text-rose-300 border-rose-800",
          color: "text-rose-400",
        },
        {
          id: "auto_replies" as TabType,
          label: "الردود التلقائية",
          icon: MessageSquareCode,
          badge: "مؤتمت",
          badgeColor: "bg-indigo-950 text-indigo-300 border-indigo-800",
          color: "text-indigo-400",
        },
        {
          id: "academic" as TabType,
          label: "الأدوات الأكاديمية والتحليلية",
          icon: GraduationCap,
          badge: "Gemini AI",
          badgeColor: "bg-violet-950 text-violet-300 border-violet-800",
          color: "text-violet-400",
        },
      ],
    },
    {
      category: "الإعدادات والحماية",
      items: [
        {
          id: "monitoring" as TabType,
          label: "إعدادات المراقبة والإرسال",
          icon: Sliders,
          badge: "حماية",
          badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
          color: "text-teal-400",
        },
      ],
    },
  ];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    onCloseMobile?.();
  };

  const sidebarContent = (
    <>
      <div className="p-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-3 mb-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Send className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>تيليجرام برو</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                  v2026.9
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">النظام المتكامل للأتمتة والتعلم</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white active:scale-90 transition-transform"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-4">
          {/* Main Dashboard Link */}
          <button
            id="nav-overview"
            onClick={() => handleSelectTab("overview")}
            className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
              activeTab === "overview"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <span>نظرة عامة والمركز الرئيسي</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
          </button>

          {/* Advanced Suite Group */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>الوظائف المتقدمة</span>
              <Sparkles className="w-3 h-3 text-purple-400" />
            </div>

            <div className="mt-1.5 space-y-1">
              {navItems[1].items?.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      isActive
                        ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border font-normal ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Group */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>الإعدادات والوقاية</span>
            </div>
            <div className="mt-1.5 space-y-1">
              {navItems[2].items?.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      isActive
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-normal ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Account / Session Card in Sidebar Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">MTProto Daemon</div>
              <div className="text-[11px] text-emerald-400 font-medium">متصل وآمن (60s Gap)</div>
            </div>
          </div>
          <button
            onClick={() => {
              openModal("monitoring");
              onCloseMobile?.();
            }}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 active:scale-95 transition-transform"
            title="الإعدادات"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside
        id="mobile-sidebar"
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 border-l border-slate-800 flex flex-col justify-between select-none overflow-y-auto transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        id="main-sidebar"
        className="hidden lg:flex lg:w-72 bg-slate-900/95 border-l border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none overflow-y-auto"
      >
        {sidebarContent}
      </aside>
    </>
  );
};
