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
  FileText,
  ShieldCheck,
  Send,
  Sparkles,
  X,
  LucideIcon,
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
  | "academic"
  | "doc_formatter"
  | "monitoring";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  openModal: (modal: string) => void;
  badges?: {
    learningSuggestions?: number;
    foundLinks?: number;
    activeJoins?: number;
    directJoinsToday?: number;
  };
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  id: TabType;
  label: string;
  icon: LucideIcon;
  faIcon: string;
  badge?: string | null;
  badgeColor?: string;
  color: string;
  iconColorHex: string;
  bgColor: string;
  borderColor: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openModal,
  badges = {
    learningSuggestions: 0,
    foundLinks: 0,
    activeJoins: 0,
    directJoinsToday: 0,
  },
  mobileOpen = false,
  onCloseMobile,
}) => {
  const advancedSuiteItems: NavItemConfig[] = [
    {
      id: "learning",
      label: "نظام التعلم الذكي",
      icon: Brain,
      faIcon: "fas fa-brain",
      badge: (badges?.learningSuggestions ?? 0) > 0 ? `${badges.learningSuggestions} مقترح` : "ذكي",
      badgeColor: "bg-purple-950/80 text-purple-300 border-purple-800/80",
      color: "text-purple-400",
      iconColorHex: "#a855f7",
      bgColor: "bg-purple-500/15",
      borderColor: "border-purple-500/30",
    },
    {
      id: "rotating",
      label: "النشر الدوري المتسلسل",
      icon: Repeat,
      faIcon: "fas fa-sync-alt",
      badge: "دوري",
      badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
      color: "text-emerald-400",
      iconColorHex: "#34d399",
      bgColor: "bg-emerald-500/15",
      borderColor: "border-emerald-500/30",
    },
    {
      id: "search_links",
      label: "البحث في روابطي",
      icon: Link2,
      faIcon: "fas fa-link",
      badge: `${badges?.foundLinks ?? 0} رابط`,
      badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-800/80",
      color: "text-cyan-400",
      iconColorHex: "#22d3ee",
      bgColor: "bg-cyan-500/15",
      borderColor: "border-cyan-500/30",
    },
    {
      id: "global_search",
      label: "بحث تليجرام الشامل",
      icon: Globe,
      faIcon: "fas fa-globe",
      badge: "فوري",
      badgeColor: "bg-blue-950/80 text-blue-300 border-blue-800/80",
      color: "text-blue-400",
      iconColorHex: "#818cf8",
      bgColor: "bg-blue-500/15",
      borderColor: "border-blue-500/30",
    },
    {
      id: "advanced_join",
      label: "الانضمام المتقدم",
      icon: Zap,
      faIcon: "fas fa-bolt",
      badge: (badges?.activeJoins ?? 0) > 0 ? `${badges.activeJoins} جارٍ` : "أمان",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800/80",
      color: "text-amber-400",
      iconColorHex: "#fbbf24",
      bgColor: "bg-amber-500/15",
      borderColor: "border-amber-500/30",
    },
    {
      id: "direct_join",
      label: "الانضمام المباشر الدائم",
      icon: Radio,
      faIcon: "fas fa-satellite-dish",
      badge: "دائم (60s)",
      badgeColor: "bg-rose-950/80 text-rose-300 border-rose-800/80",
      color: "text-rose-400",
      iconColorHex: "#f43f5e",
      bgColor: "bg-rose-500/15",
      borderColor: "border-rose-500/30",
    },
    {
      id: "auto_replies",
      label: "الردود التلقائية",
      icon: MessageSquareCode,
      faIcon: "fas fa-comment-dots",
      badge: "مؤتمت",
      badgeColor: "bg-indigo-950/80 text-indigo-300 border-indigo-800/80",
      color: "text-indigo-400",
      iconColorHex: "#a855f7",
      bgColor: "bg-indigo-500/15",
      borderColor: "border-indigo-500/30",
    },
    {
      id: "academic",
      label: "الأدوات الأكاديمية والتحليل",
      icon: GraduationCap,
      faIcon: "fas fa-graduation-cap",
      badge: "Gemini AI",
      badgeColor: "bg-violet-950/80 text-violet-300 border-violet-800/80",
      color: "text-violet-400",
      iconColorHex: "#c084fc",
      bgColor: "bg-violet-500/15",
      borderColor: "border-violet-500/30",
    },
    {
      id: "doc_formatter",
      label: "منسق المستندات والخطوط",
      icon: FileText,
      faIcon: "fas fa-file-word",
      badge: "Simplified",
      badgeColor: "bg-sky-950/80 text-sky-300 border-sky-800/80",
      color: "text-sky-400",
      iconColorHex: "#38bdf8",
      bgColor: "bg-sky-500/15",
      borderColor: "border-sky-500/30",
    },
  ];

  const settingsItems: NavItemConfig[] = [
    {
      id: "monitoring",
      label: "إعدادات المراقبة والإرسال",
      icon: Sliders,
      faIcon: "fas fa-shield-alt",
      badge: "حماية",
      badgeColor: "bg-teal-950/80 text-teal-300 border-teal-800/80",
      color: "text-teal-400",
      iconColorHex: "#14b8a6",
      bgColor: "bg-teal-500/15",
      borderColor: "border-teal-500/30",
    },
  ];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    onCloseMobile?.();
  };

  const renderNavButton = (item: NavItemConfig) => {
    const IconComponent = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        id={`nav-${item.id}`}
        onClick={() => handleSelectTab(item.id)}
        className={`w-full min-h-[46px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
          isActive
            ? "bg-slate-800/95 text-white border border-slate-700 shadow-md ring-1 ring-purple-500/30"
            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Guaranteed visible icon container with fixed 32x32px and shrink-0 */}
          <div
            className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center shrink-0 border transition-transform ${item.bgColor} ${item.borderColor}`}
          >
            {/* FontAwesome class matching AdvancedFunctionsHub with Lucide fallback */}
            <i
              className={`${item.faIcon} text-sm shrink-0`}
              style={{ color: item.iconColorHex }}
              aria-hidden="true"
            />
          </div>
          <div className="text-right min-w-0 flex-1">
            <span className="truncate block font-semibold text-xs text-slate-100">
              {item.label}
            </span>
          </div>
        </div>
        {item.badge && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md border font-normal shrink-0 mr-1.5 ${item.badgeColor}`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2.5 py-3 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
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
              className="md:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white active:scale-90 transition-transform"
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
            className={`w-full min-h-[46px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
              activeTab === "overview"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <i className="fas fa-th-large text-sm shrink-0 text-blue-400" aria-hidden="true" />
              </div>
              <span className="truncate block font-semibold text-xs text-slate-100">
                لوحة التحكم الشاملة
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0 mr-1.5"></span>
          </button>

          {/* Advanced Suite Group */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>الوظائف المتقدمة (Advanced Suite)</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            </div>

            <div className="mt-1.5 space-y-1">
              {advancedSuiteItems.map(renderNavButton)}
            </div>
          </div>

          {/* Settings Group */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>الإعدادات والوقاية</span>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            </div>
            <div className="mt-1.5 space-y-1">
              {settingsItems.map(renderNavButton)}
            </div>
          </div>
        </nav>
      </div>

      {/* Account / Session Card in Sidebar Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/50 shrink-0">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              <i className="fas fa-shield-alt text-xs" />
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
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 active:scale-95 transition-transform"
            title="الإعدادات"
          >
            <Sliders className="w-4 h-4 shrink-0" size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside
        id="mobile-sidebar"
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 border-l border-slate-800 flex flex-col justify-between select-none overflow-hidden transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar: Visible on md: (768px+) and larger */}
      <aside
        id="main-sidebar"
        className="hidden md:flex md:w-64 lg:w-72 bg-slate-900/95 border-l border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none overflow-hidden"
      >
        {sidebarContent}
      </aside>
    </>
  );
};
