import React, { useState, useRef, useEffect } from "react";
import {
  GraduationCap,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Presentation,
  AlignLeft,
  Sparkles,
  Bell,
  RefreshCw,
  Zap,
  Menu,
} from "lucide-react";
import { LiveEventNotification } from "../hooks/useTelegramEvents";

interface HeaderProps {
  openModal: (modalName: string) => void;
  notifications: LiveEventNotification[];
  clearNotifications: () => void;
  onQuickJoin: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  openModal,
  notifications,
  clearNotifications,
  onQuickJoin,
  onToggleMobileMenu,
}) => {
  const [academicDropdownOpen, setAcademicDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAcademicDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      id="main-header"
      className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20"
    >
      {/* Right side (RTL): Mobile Hamburger & Status */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-transform"
            aria-label="فتح القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="hidden xs:inline">خادم تيليجرام:</span>
          <span>متصل بنشاط</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span>الحساب:</span>
          <span className="text-slate-200 font-mono font-medium">+966 50 *** 8921</span>
        </div>
      </div>

      {/* Left side (RTL): Actions & Academic Tools Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Academic Tools Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-academic-dropdown"
            onClick={() => setAcademicDropdownOpen(!academicDropdownOpen)}
            className="min-h-[44px] flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-800/50 hover:to-indigo-800/50 text-purple-200 text-xs font-medium border border-purple-700/50 transition-all shadow-sm active:scale-95"
          >
            <GraduationCap className="w-4 h-4 text-purple-400" />
            <span className="font-semibold hidden sm:inline">الأدوات الأكاديمية</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${academicDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {academicDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>الأجنحة الأكاديمية (Suite)</span>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                </div>
              </div>

              <button
                onClick={() => {
                  setAcademicDropdownOpen(false);
                  openModal("academic_analysis");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-800/80 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">التحليل الأكاديمي الذكي (AI)</div>
                  <div className="text-[11px] text-slate-400">ملخصات ومفاهيم وأسئلة امتحانية</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setAcademicDropdownOpen(false);
                  openModal("doc_formatter");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-800/80 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">محول PDF إلى Word (DOCX)</div>
                  <div className="text-[11px] text-slate-400">استخراج قابل للتحرير بدقة تامة</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setAcademicDropdownOpen(false);
                  openModal("doc_formatter");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-800/80 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">HTML إلى Word / Excel</div>
                  <div className="text-[11px] text-slate-400">تحويل الجداول والعروض التقديمية</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setAcademicDropdownOpen(false);
                  openModal("doc_formatter");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-slate-800/80 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">منسق المستندات والخطوط الأكاديمية</div>
                  <div className="text-[11px] text-slate-400">Simplified Arabic وهندسة الهوامش</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Quick Join Trigger Button */}
        <button
          onClick={onQuickJoin}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all active:scale-95"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">انضمام فوري</span>
        </button>

        {/* Live Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition-all active:scale-95 relative"
            title="الإشعارات الحية"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">الأحداث اللحظية (Socket/SSE)</span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[11px] text-purple-400 hover:underline"
                  >
                    مسح السجل
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    لا توجد أحداث جديدة في قائمة الانتظار
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-right"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-semibold text-purple-300">{n.title}</span>
                        <span>{n.timestamp}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
