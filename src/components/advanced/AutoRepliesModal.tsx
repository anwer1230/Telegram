import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquareCode,
  Plus,
  Trash2,
  Edit2,
  Power,
  Search,
  CheckCircle2,
  Hash,
  Layers,
  Sparkles,
} from "lucide-react";
import { AutoReplyRule, AutoReplyScope, AutoReplyMatchType } from "../../types";

interface AutoRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoRepliesModal: React.FC<AutoRepliesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [replies, setReplies] = useState<AutoReplyRule[]>([]);
  const [triggerInput, setTriggerInput] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [scopeInput, setScopeInput] = useState<AutoReplyScope>("all");
  const [matchTypeInput, setMatchTypeInput] = useState<AutoReplyMatchType>("contains");
  const [filterQuery, setFilterQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchReplies();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReplies = async () => {
    try {
      const res = await fetch("/api/auto_replies");
      const data = await res.json();
      if (data.success) {
        setReplies(data.replies || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerInput.trim() || !replyInput.trim()) return;

    try {
      const res = await fetch("/api/add_auto_reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: triggerInput,
          reply: replyInput,
          scope: scopeInput,
          matchType: matchTypeInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم إضافة قاعدة الرد التلقائي بنجاح");
        setTriggerInput("");
        setReplyInput("");
        fetchReplies();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch("/api/toggle_auto_reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setReplies((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: data.enabled } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/delete_auto_reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم حذف القاعدة");
        fetchReplies();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredReplies = replies.filter(
    (r) =>
      r.trigger.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.reply.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      id="autoRepliesModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <MessageSquareCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>الردود التلقائية (Auto Replies)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  {replies.length} قاعدة نشطة
                </span>
              </div>
              <p className="text-xs text-slate-400">
                إدارة الكلمات المحفزة، نطاق العمل، وأنماط المطابقة (Contains, Exact, Regex)
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
          <div className="bg-purple-500/10 border-b border-purple-500/30 px-6 py-2.5 text-xs text-purple-300 flex items-center gap-2">
            <span>{toast}</span>
          </div>
        )}

        {/* Add New Rule Form */}
        <div className="p-5 bg-slate-950 border-b border-slate-800">
          <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>إنشاء قاعدة رد تلقائي جديدة:</span>
          </h4>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="block text-[11px] text-slate-400 mb-1">الكلمة المحفزة (Trigger / Keyword)</label>
                <input
                  type="text"
                  placeholder="مثال: الأسعار، باقات، تواصل"
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">نطاق العمل (Scope)</label>
                <select
                  value={scopeInput}
                  onChange={(e) => setScopeInput(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">الكل (الخاص والمجموعات)</option>
                  <option value="private">الخاص فقط (Private)</option>
                  <option value="groups">المجموعات فقط (Groups)</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] text-slate-400 mb-1">نوع المطابقة (Match Type)</label>
                <select
                  value={matchTypeInput}
                  onChange={(e) => setMatchTypeInput(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="contains">تحتوي على (Contains)</option>
                  <option value="exact">تطابق تام (Exact Match)</option>
                  <option value="regex">تعبير نمطي (Regex Pattern)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">نص الرد المقابل</label>
              <textarea
                rows={2}
                placeholder="الرسالة التي سيتم إرسالها للعميل تلقائياً فور رصد الكلمة المحفزة..."
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة القاعدة وتفعيلها</span>
            </button>
          </form>
        </div>

        {/* Search filter for rules */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="relative w-72">
            <input
              type="text"
              placeholder="بحث في القواعد والردود..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2" />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            عرض {filteredReplies.length} من {replies.length}
          </span>
        </div>

        {/* Rules List */}
        <div className="p-6 max-h-[48vh] overflow-y-auto space-y-3">
          {filteredReplies.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-all ${
                rule.enabled ? "bg-slate-950/60 border-slate-800" : "bg-slate-950/20 border-slate-800/40 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                      محفز: "{rule.trigger}"
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      النطاق:{" "}
                      {rule.scope === "all"
                        ? "الكل"
                        : rule.scope === "private"
                        ? "الخاص فقط"
                        : "المجموعات فقط"}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      المطابقة:{" "}
                      {rule.matchType === "contains"
                        ? "تحتوي"
                        : rule.matchType === "exact"
                        ? "تطابق تام"
                        : "Regex"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 mt-2">
                    {rule.reply}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-mono">
                    <span>مرات الاستخدام: {rule.usageCount} مرة</span>
                    <span>آخر إرسال: {rule.lastUsed || "غير متوفر"}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.enabled
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                    }`}
                    title={rule.enabled ? "تعطيل القاعدة" : "تفعيل القاعدة"}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                    title="حذف القاعدة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            تستجيب الردود آلياً دون تأخير عبر مستمعي Telethon Events
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
