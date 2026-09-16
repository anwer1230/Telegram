import React, { useState, useEffect } from "react";
import {
  X,
  Link2,
  Search,
  Download,
  Copy,
  Zap,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  ExternalLink,
} from "lucide-react";
import { DiscoveredLink, SearchLinksProgress } from "../../types";

interface SearchMyLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferToAutoJoin?: (links: string[]) => void;
}

export const SearchMyLinksModal: React.FC<SearchMyLinksModalProps> = ({
  isOpen,
  onClose,
  onTransferToAutoJoin,
}) => {
  const [keyword, setKeyword] = useState("تسويق");
  const [depth, setDepth] = useState<"fast" | "medium" | "full">("medium");
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<SearchLinksProgress>({
    isScanning: false,
    currentChat: "مجموعة التسويق العقاري الخليجي",
    scannedCount: 142,
    totalFound: 18,
    keyword: "تسويق",
    depth: "medium",
  });
  const [links, setLinks] = useState<DiscoveredLink[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/search_my_links/status");
      const data = await res.json();
      if (data.success) {
        setProgress(data.progress);
        setLinks(data.links || []);
        setIsScanning(data.progress.isScanning);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/search_my_links/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, depth }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("بدأ محرك فحص المحادثات المتدفق");
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopScan = async () => {
    try {
      const res = await fetch("/api/search_my_links/stop", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsScanning(false);
        showToast("تم إيقاف الفحص");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l))
    );
  };

  const selectAll = (checked: boolean) => {
    setLinks((prev) => prev.map((l) => ({ ...l, selected: checked })));
  };

  const selectedLinks = links.filter((l) => l.selected);

  const copySelected = () => {
    const urls = selectedLinks.map((l) => l.url).join("\n");
    if (!urls) {
      showToast("يرجى تحديد روابط أولاً");
      return;
    }
    navigator.clipboard.writeText(urls);
    showToast(`تم نسخ ${selectedLinks.length} رابط إلى الحافظة`);
  };

  const exportCSV = () => {
    const header = "ID,Title,URL,Dialog,Members,DateFound\n";
    const rows = links
      .map(
        (l) =>
          `"${l.id}","${l.title.replace(/"/g, '""')}","${l.url}","${l.dialogTitle.replace(/"/g, '""')}","${l.membersCount || 0}","${l.dateFound}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `telegram_links_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير ملف CSV بنجاح");
  };

  const exportTXT = () => {
    const text = links.map((l) => l.url).join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `links_list_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير ملف TXT بنجاح");
  };

  const transferToAdvancedJoin = () => {
    const targetUrls = selectedLinks.length > 0 ? selectedLinks.map((l) => l.url) : links.map((l) => l.url);
    if (targetUrls.length === 0) {
      showToast("لا توجد روابط لنقلها");
      return;
    }
    onTransferToAutoJoin?.(targetUrls);
    showToast(`تم نقل ${targetUrls.length} رابط إلى أداة الانضمام المتقدم`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="searchMyLinksModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>البحث في روابطي (Search My Links)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  {links.length} رابط مكتشف
                </span>
              </div>
              <p className="text-xs text-slate-400">
                فحص الرسائل وتدفق استخراج روابط t.me و joinchat المطابقة للكلمات المفتاحية
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
          <div className="bg-cyan-500/10 border-b border-cyan-500/30 px-6 py-2.5 text-xs text-cyan-300 flex items-center gap-2">
            <span>{toast}</span>
          </div>
        )}

        {/* Filters and Controls Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4">
            <div className="relative">
              <input
                type="text"
                placeholder="الكلمة المفتاحية (مثال: تسويق، استثمار)..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">عمق الفحص:</label>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="fast">سريع (30 يوماً الأخيرة - Fast)</option>
              <option value="medium">متوسط (180 يوماً - Medium)</option>
              <option value="full">شامل (3650 يوماً - Full Historic)</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2 justify-end">
            {!isScanning ? (
              <button
                onClick={handleStartScan}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Search className="w-3.5 h-3.5" />
                <span>بدء الفحص المتدفق</span>
              </button>
            ) : (
              <button
                onClick={handleStopScan}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md animate-pulse"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>إيقاف الفحص</span>
              </button>
            )}
          </div>
        </div>

        {/* Streaming Progress Bar */}
        <div className="bg-slate-900/80 px-6 py-2 border-b border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>المحادثة الجاري فحصها:</span>
            <span className="text-cyan-300 font-semibold">{progress.currentChat}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>تم مسح: {progress.scannedCount} محادثة</span>
            <span className="text-cyan-400 font-bold">عُثر على: {links.length} رابط</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectAll(true)}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              تحديد الكل
            </button>
            <button
              onClick={() => selectAll(false)}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              إلغاء التحديد
            </button>
            <span className="text-xs text-slate-500">({selectedLinks.length} محدد)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copySelected}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ المحدد</span>
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={exportTXT}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير TXT</span>
            </button>
            <button
              onClick={transferToAdvancedJoin}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>نقل إلى الانضمام المتقدم بنقرة واحدة</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">عنوان المجموعة / القناة</th>
                <th className="p-3">الرابط المكتشف</th>
                <th className="p-3">مصدر المحادثة</th>
                <th className="p-3">الأعضاء المقدرين</th>
                <th className="p-3">تاريخ الاستخراج</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {links.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    item.selected ? "bg-cyan-950/20" : ""
                  }`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={item.selected || false}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{item.title}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-cyan-400">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <span>{item.url}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </td>
                  <td className="p-3 text-slate-400">{item.dialogTitle}</td>
                  <td className="p-3 font-mono text-slate-300">
                    {item.membersCount ? item.membersCount.toLocaleString() : "غير محدد"}
                  </td>
                  <td className="p-3 text-slate-500">{item.dateFound}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            محرك البحث المتدفق: Telethon `client.iter_dialogs()` + Smart Regex
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
