import React, { useState, useEffect } from "react";
import {
  X,
  Brain,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { LearningSettings, LearningService, UnknownInquiry, LearningSuggestion } from "../../types";

interface SmartLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded?: () => void;
}

export const SmartLearningModal: React.FC<SmartLearningModalProps> = ({
  isOpen,
  onClose,
  onServiceAdded,
}) => {
  const [activeTab, setActiveTab] = useState<"knowledge" | "unknown" | "suggestions" | "settings">("knowledge");
  const [settings, setSettings] = useState<LearningSettings>({
    active_private: true,
    active_group: true,
    reply_in_groups: true,
  });
  const [services, setServices] = useState<LearningService[]>([]);
  const [unknownInquiries, setUnknownInquiries] = useState<UnknownInquiry[]>([]);
  const [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Service Form State
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServiceKeywords, setNewServiceKeywords] = useState("");

  // Training Form State
  const [trainingAnswer, setTrainingAnswer] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchServices();
      fetchUnknown();
      fetchSuggestions();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/learning/status");
      const data = await res.json();
      if (data.success) {
        setSettings({
          active_private: data.active_private,
          active_group: data.active_group,
          reply_in_groups: data.reply_in_groups,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/learning/services");
      const data = await res.json();
      if (data.success) setServices(data.services || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnknown = async () => {
    try {
      const res = await fetch("/api/learning/unknown");
      const data = await res.json();
      if (data.success) setUnknownInquiries(data.unknownInquiries || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/learning/suggestions");
      const data = await res.json();
      if (data.success) setSuggestions(data.suggestions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSetting = async (key: keyof LearningSettings) => {
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal }));
    try {
      await fetch("/api/learning/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newVal }),
      });
      showToast("تم تحديث إعدادات نظام التعلم");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/learning/add_service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServiceName,
          description: newServiceDesc,
          keywords: newServiceKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "تم إضافة الخدمة بنجاح");
        setNewServiceName("");
        setNewServiceDesc("");
        setNewServiceKeywords("");
        fetchServices();
        onServiceAdded?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/learning/service/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("تم حذف الخدمة من قاعدة المعرفة");
        fetchServices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrainInquiry = async (id: string) => {
    const ans = trainingAnswer[id];
    if (!ans || !ans.trim()) return;

    try {
      const res = await fetch("/api/learning/train_unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, answer: ans }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم تدريب البوت بنجاح وإضافة المعرفة");
        fetchUnknown();
        fetchServices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="learningModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>نظام التعلم الذكي (Smart Learning System)</span>
                <span
                  id="suggestionsBadge"
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40"
                >
                  {suggestions.length} اقتراحات ذكية
                </span>
              </div>
              <p className="text-xs text-slate-400">إدارة وتدريب المعرفة الذكية والرد الآلي في المحادثات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all ${
              activeTab === "knowledge"
                ? "bg-slate-900 text-purple-300 border-t-2 border-purple-500 border-x border-slate-700/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>قاعدة المعرفة والخدمات ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("unknown")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all ${
              activeTab === "unknown"
                ? "bg-slate-900 text-purple-300 border-t-2 border-purple-500 border-x border-slate-700/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>الطلبات غير المفهومة ({unknownInquiries.filter((u) => !u.resolved).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all ${
              activeTab === "suggestions"
                ? "bg-slate-900 text-purple-300 border-t-2 border-purple-500 border-x border-slate-700/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>المقترحات الذكية ({suggestions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-slate-900 text-purple-300 border-t-2 border-purple-500 border-x border-slate-700/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>مفاتيح التبديل والتفعيل (Toggles)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          {/* TAB 1: Knowledge Base */}
          {activeTab === "knowledge" && (
            <div className="space-y-6">
              {/* Add Service Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>إضافة خدمة جديدة إلى عقل البوت</span>
                </h4>
                <form onSubmit={handleAddService} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">اسم الخدمة</label>
                      <input
                        type="text"
                        placeholder="مثال: باقات النشر الإعلاني VIP"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        الكلمات المفتاحية (مفصولة بفواصل)
                      </label>
                      <input
                        type="text"
                        placeholder="تسويق, إعلانات, نشر, قنوات"
                        value={newServiceKeywords}
                        onChange={(e) => setNewServiceKeywords(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">وصف وتفاصيل الخدمة</label>
                    <textarea
                      rows={2}
                      placeholder="الشرح الذي سيعتمد عليه البوت لصياغة إجاباته للعملاء..."
                      value={newServiceDesc}
                      onChange={(e) => setNewServiceDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>حفظ الخدمة في قاعدة المعرفة</span>
                  </button>
                </form>
              </div>

              {/* Services List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300">الخدمات المدربة حالياً ({services.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-100">{srv.name}</h5>
                          <button
                            onClick={() => handleDeleteService(srv.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{srv.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                        {srv.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/50"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Unknown Inquiries */}
          {activeTab === "unknown" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs text-blue-200 leading-relaxed">
                هذه الرسائل وردت من العملاء والمجموعات ولم يجد البوت لها رداً مباشراً في قاعدة المعرفة. يمكنك كتابة
                الإجابة وتدريب البوت عليها ليجيب بها تلقائياً في المستقبل.
              </div>

              <div className="space-y-3">
                {unknownInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className={`p-4 rounded-xl border transition-all ${
                      inq.resolved
                        ? "bg-slate-950/30 border-slate-800/60 opacity-60"
                        : "bg-slate-900 border-amber-500/30 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>سؤال غير مدرب:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{inq.source} • {inq.timestamp}</span>
                    </div>

                    <p className="text-xs text-white font-medium mb-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      "{inq.question}"
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="اكتب الإجابة النموذجية للبوت هنا..."
                        defaultValue={inq.suggestedAnswer || ""}
                        onChange={(e) =>
                          setTrainingAnswer((prev) => ({ ...prev, [inq.id]: e.target.value }))
                        }
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => handleTrainInquiry(inq.id)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        <span>تدريب البوت الآن</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Smart Suggestions */}
          {activeTab === "suggestions" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200">
                اقتراحات مولدة آلياً للمحادثات الجارية بناءً على تحليل استفسارات العملاء ودرجة الثقة.
              </div>

              {suggestions.map((sug) => (
                <div key={sug.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300">{sug.client_name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ثقة {Math.round(sug.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-300">سؤال العميل: </span>
                    {sug.query}
                  </div>
                  <div className="text-xs text-emerald-200 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-800/30">
                    <span className="font-semibold text-emerald-300">الرد الذكي المقترح: </span>
                    {sug.recommended_reply}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Toggles Settings */}
          {activeTab === "settings" && (
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-200 mb-2">مفاتيح تفعيل الرد الذكي</h4>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-100">تفعيل الرد الذكي في المحادثات الخاصة</div>
                  <div className="text-[11px] text-slate-400">الرد الفوري على رسائل العملاء المباشرة</div>
                </div>
                <button
                  onClick={() => toggleSetting("active_private")}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    settings.active_private ? "bg-purple-600" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.active_private ? "-translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-100">تفعيل الرد الذكي في المجموعات</div>
                  <div className="text-[11px] text-slate-400">الاستماع للأسئلة في مجموعات العمل والرد عليها</div>
                </div>
                <button
                  onClick={() => toggleSetting("active_group")}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    settings.active_group ? "bg-purple-600" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.active_group ? "-translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-100">الرد المباشر داخل المجموعة (Reply In Groups)</div>
                  <div className="text-[11px] text-slate-400">عمل منشن/اقتباس للرسالة الأصلية أثناء الرد</div>
                </div>
                <button
                  onClick={() => toggleSetting("reply_in_groups")}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    settings.reply_in_groups ? "bg-purple-600" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.reply_in_groups ? "-translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">المعالج: Python/Flask + Telethon Knowledge Engine</span>
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
