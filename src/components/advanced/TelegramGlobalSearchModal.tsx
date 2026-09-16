import React, { useState, useEffect } from "react";
import {
  X,
  Globe,
  Search,
  Users,
  CheckCircle,
  Zap,
  Bookmark,
  ExternalLink,
  MessageCircle,
  Radio,
  Bot,
  Layers,
} from "lucide-react";
import { TelegramGlobalResult } from "../../types";

interface TelegramGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramGlobalSearchModal: React.FC<TelegramGlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "group" | "channel" | "bot">("all");
  const [results, setResults] = useState<TelegramGlobalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleSearch();
    }
  }, [isOpen, filterType]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search_telegram_global?q=${encodeURIComponent(query)}&filter=${filterType}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (item: TelegramGlobalResult) => {
    try {
      const res = await fetch("/api/telegram_quick_join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, title: item.title }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${data.message}`);
        setResults((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, alreadyJoined: true } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="globalSearchModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>بحث تليجرام الشامل والانضمام الفوري</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                  MTProto Native Search
                </span>
              </div>
              <p className="text-xs text-slate-400">
                البحث في كامل خوادم تيليجرام العالمية (SearchGlobalRequest & Contacts)
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
            <span>{toast}</span>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="ابحث عن مجموعات، قنوات، أو بوتات في كامل خوادم تيليجرام..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shrink-0"
            >
              <span>بحث شامل</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 ml-2">تصفية النتائج:</span>
            {[
              { id: "all", label: "الكل", icon: Layers },
              { id: "group", label: "مجموعات (Groups)", icon: Users },
              { id: "channel", label: "قنوات (Channels)", icon: Radio },
              { id: "bot", label: "بوتات (Bots)", icon: Bot },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    filterType === tab.id
                      ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <span className="animate-pulse">جاري الاستعلام من خوادم تيليجرام MTProto...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              لا توجد نتائج تطابق بحثك
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                      {item.title}
                    </h4>
                    {item.isVerified && (
                      <span className="text-blue-400" title="موثقة من تيليجرام">
                        <CheckCircle className="w-3.5 h-3.5 fill-blue-500/20 text-blue-400" />
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                        item.type === "group"
                          ? "bg-purple-950/80 text-purple-300 border-purple-800"
                          : item.type === "channel"
                          ? "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                          : "bg-amber-950/80 text-amber-300 border-amber-800"
                      }`}
                    >
                      {item.type === "group" ? "مجموعة" : item.type === "channel" ? "قناة" : "بوت"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{item.description}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-mono">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{item.membersCount.toLocaleString()} عضو</span>
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 font-sans"
                    >
                      <span>@{item.username}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Quick Join Button */}
                <div className="shrink-0 flex items-center gap-2">
                  {item.alreadyJoined ? (
                    <div className="px-3.5 py-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                      <span>منضم مسبقاً ومحفوظ</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleQuickJoin(item)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-blue-500/20 active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>انضمام فوري وحفظ</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            بروتوكول الانضمام الفوري: يُحفظ الرابط مباشرة في "الرسائل المحفوظة" لتوثيق السجل
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
