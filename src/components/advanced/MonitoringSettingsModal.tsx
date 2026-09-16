import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  UploadCloud,
  Image as ImageIcon,
  Shield,
  Clock,
  Eye,
  Save,
  Send,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
} from "lucide-react";
import { MonitoringSettings, SanitizeMode } from "../../types";

interface MonitoringSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonitoringSettingsModal: React.FC<MonitoringSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<MonitoringSettings>({
    textMessage: "🌟 أقوى عروض التسويق والأتمتة الذكية في تليجرام لعام 2026!\n• إدارة ونشر دوري متسلسل في أكثر من 500 مجموعة.\n• ردود ذكية مؤتمتة بالذكاء الاصطناعي على مدار الساعة.\n• أدوات تحليل وتنسيق أكاديمية شاملة.\nتواصل معنا الآن للاستفادة من الخصم الخاص!",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    ],
    sendMode: "selected",
    selectedGroups: [
      "https://t.me/saudi_business_group",
      "https://t.me/gulf_marketing_masters",
      "https://t.me/riyadh_commercial_network",
    ],
    sanitizeMode: "salam",
    sendType: "scheduled",
    scheduleIntervalMinutes: 10,
    workHoursStart: "08:00",
    workHoursEnd: "23:00",
    watchWords: [
      "مطلوب مسوق",
      "نشر إعلانات",
      "بوت تليجرام",
      "تنسيق بحث",
      "إدارة قنوات",
      "زيادة متابعين",
    ],
  });

  const [newWord, setNewWord] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/monitoring/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/monitoring/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast("تم حفظ إعدادات المراقبة والإرسال بنجاح");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunchSend = async () => {
    await handleSave();
    try {
      const res = await fetch("/api/monitoring/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sanitizeMode: settings.sanitizeMode,
          sendMode: settings.sendMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const readers = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((base64Images) => {
        setSettings((prev) => ({
          ...prev,
          images: [...prev.images, ...base64Images],
        }));
        showToast(`تم رفع ${files.length} صورة`);
      });
    }
  };

  const removeImage = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addWatchWord = () => {
    if (!newWord.trim()) return;
    if (settings.watchWords.includes(newWord.trim())) return;
    setSettings((prev) => ({
      ...prev,
      watchWords: [...prev.watchWords, newWord.trim()],
    }));
    setNewWord("");
  };

  const removeWatchWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      watchWords: prev.watchWords.filter((w) => w !== word),
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      id="monitoringModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>إعدادات المراقبة والإرسال (Monitoring & Sending Settings)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  وضع الحماية الذكية
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تكوين أنماط تنقية النصوص ومكافحة حظر البوتات وجدولة الإرسال المتقدم
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
          <div className="bg-teal-500/10 border-b border-teal-500/30 px-6 py-2.5 text-xs text-teal-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{toast}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {/* Message Text & Image Dropzone */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-200">
              نص الإعلان أو الرسالة الترويجية:
            </label>
            <textarea
              rows={4}
              value={settings.textMessage}
              onChange={(e) => setSettings({ ...settings, textMessage: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
            />

            {/* Drag & Drop Zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                منطقة رفع الصور المرفقة (Drag & Drop Images):
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 bg-slate-950/40 text-center hover:border-teal-500 transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-200">
                  اسحب الصور وأفلتها هنا، أو اضغط للاختيار من جهازك
                </div>
                <div className="text-[11px] text-slate-500 mt-1">يدعم JPG, PNG, WebP حتى 10MB</div>
              </div>

              {/* Uploaded Images Preview */}
              {settings.images.length > 0 && (
                <div className="flex items-center gap-3 mt-3 overflow-x-auto pb-2">
                  {settings.images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 shrink-0 group">
                      <img src={img} alt="مرفق" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Send Mode Selection */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">وضع الإرسال (Sending Mode):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                  settings.sendMode === "selected"
                    ? "bg-teal-950/40 border-teal-500/60 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="sendMode"
                  checked={settings.sendMode === "selected"}
                  onChange={() => setSettings({ ...settings, sendMode: "selected" })}
                  className="text-teal-500 focus:ring-teal-400"
                />
                <div>
                  <div className="text-xs font-bold">مجموعات محددة فقط (Target Groups)</div>
                  <div className="text-[11px] text-slate-400">الإرسال للقائمة المحددة بالاسم</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                  settings.sendMode === "all"
                    ? "bg-teal-950/40 border-teal-500/60 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="sendMode"
                  checked={settings.sendMode === "all"}
                  onChange={() => setSettings({ ...settings, sendMode: "all" })}
                  className="text-teal-500 focus:ring-teal-400"
                />
                <div>
                  <div className="text-xs font-bold">جميع المجموعات المشترك بها (All Joined)</div>
                  <div className="text-[11px] text-slate-400">بث شامل لكافة حوارات الحساب</div>
                </div>
              </label>
            </div>
          </div>

          {/* Sanitize Mode in Guarded Groups (وضع الحماية والتنقية الذكية) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-400" />
                <span>وضع الحماية والتنقية في المجموعات المحمية (sanitize_mode):</span>
              </h4>
              <span className="text-[11px] text-teal-400 font-mono">Anti-Ban Engine</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                {
                  id: "salam" as SanitizeMode,
                  title: "🤖 ذكي (salam)",
                  desc: "إرسال تحية ذكية أولاً ثم نص الإعلان لتجنب طرد البوتات الحارسة.",
                },
                {
                  id: "skip" as SanitizeMode,
                  title: "⏭️ تخطي (skip)",
                  desc: "تجاوز المجموعات التي تحتوي على بوتات حماية صارمة مثل Rose و GroupHelp.",
                },
                {
                  id: "sanitize" as SanitizeMode,
                  title: "🧠 ذكية (sanitize)",
                  desc: "تنقية النص المباشر وإزالة الروابط الحساسة والعبارات المحظورة.",
                },
                {
                  id: "purify" as SanitizeMode,
                  title: "🛡️ تنقية (purify)",
                  desc: "استبدال الأحرف الحساسة برمز يونيكود غير قابل للاكتشاف من بوتات الفلترة.",
                },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSettings({ ...settings, sanitizeMode: m.id })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    settings.sanitizeMode === m.id
                      ? "bg-teal-950/40 border-teal-500 text-white shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold mb-1 text-slate-200">{m.title}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule & Working Hours */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">نوع الإرسال والجدولة:</label>
              <select
                value={settings.sendType}
                onChange={(e) => setSettings({ ...settings, sendType: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
              >
                <option value="immediate">إرسال فوري (Immediate)</option>
                <option value="scheduled">إرسال مجدول (Scheduled)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">فاصل التكرار (بالدقائق):</label>
              <input
                type="number"
                min="1"
                value={settings.scheduleIntervalMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, scheduleIntervalMinutes: Math.max(1, Number(e.target.value)) })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">ساعات العمل النشطة:</label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={settings.workHoursStart}
                  onChange={(e) => setSettings({ ...settings, workHoursStart: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="time"
                  value={settings.workHoursEnd}
                  onChange={(e) => setSettings({ ...settings, workHoursEnd: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white"
                />
              </div>
            </div>
          </div>

          {/* Monitored Keywords (الكلمات المراقبة الثابتة watchWords) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-400" />
              <span>الكلمات المراقبة الثابتة (watchWords):</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يرصد الحساب هذه الكلمات والعبارات فور كتابتها في أي مجموعة لاقتناص العملاء والرد عليهم فوراً.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="أضف كلمة مراقبة جديدة (مثال: محتاج مسوق، أبحث عن شريك)..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWatchWord()}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={addWatchWord}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {settings.watchWords.map((word) => (
                <span
                  key={word}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-teal-300 flex items-center gap-1.5 group"
                >
                  <span>{word}</span>
                  <button
                    onClick={() => removeWatchWord(word)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ الإعدادات</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunchSend}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إطلاق الإرسال والتنقية</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
