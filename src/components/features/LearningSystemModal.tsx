import { useState, useEffect } from 'react';
import { X, Brain, Plus, Trash2, RefreshCw, CheckCircle2, Shield } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  desc: string;
  keywords: string;
  active: boolean;
}

interface SuggestionItem {
  id: string;
  query: string;
  count: number;
  detectedKeyword: string;
}

interface UnknownRequestItem {
  id: string;
  text: string;
  time: string;
}

export function LearningSystemModal({ onClose }: { onClose: () => void }) {
  const [privateEnabled, setPrivateEnabled] = useState(true);
  const [groupEnabled, setGroupEnabled] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [unknownRequests, setUnknownRequests] = useState<UnknownRequestItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/learning/data')
      .then(r => r.json())
      .then(d => {
        if (d) {
          setPrivateEnabled(Boolean(d.privateEnabled));
          setGroupEnabled(Boolean(d.groupEnabled));
          setServices(d.services || []);
          setSuggestions(d.suggestions || []);
          setUnknownRequests(d.unknownRequests || []);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddService = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/learning/add_service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, desc: newDesc, keywords: newKeywords }),
      });
      const data = await res.json();
      if (data.service) {
        setServices(prev => [...prev, data.service]);
        setNewName('');
        setNewDesc('');
        setNewKeywords('');
        setFeedback('تمت إضافة الخدمة وتدريب البوت عليها بنجاح');
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      //
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await fetch(`/api/learning/service/${id}`, { method: 'DELETE' });
      setServices(prev => prev.filter(s => s.id !== id));
    } catch {
      //
    }
  };

  const handleToggleBot = async (type: 'private' | 'group', enabled: boolean) => {
    if (type === 'private') setPrivateEnabled(enabled);
    if (type === 'group') setGroupEnabled(enabled);
    try {
      await fetch('/api/learning/toggle_bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });
    } catch {
      //
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] text-[#e2e8f0] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">نظام التعلم الذكي</h3>
              <p className="text-xs text-blue-200">تدريب البوت التلقائي، اكتشاف الكلمات وتحسين الردود</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Notification Alert */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 text-xs text-blue-200 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>يقوم النظام بالتعلم من الرسائل والردود لتحسين دقة الردود التلقائية واقتراح تحسينات للخدمات.</span>
          </div>

          {feedback && (
            <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Bot Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
              <span className="text-xs font-semibold">تفعيل البوت للمحادثات الخاصة</span>
              <input
                type="checkbox"
                checked={privateEnabled}
                onChange={e => handleToggleBot('private', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
              <span className="text-xs font-semibold">تفعيل البوت للمجموعات</span>
              <input
                type="checkbox"
                checked={groupEnabled}
                onChange={e => handleToggleBot('group', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Add Service Card */}
          <div className="bg-slate-900/50 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              إضافة خدمة جديدة
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">اسم الخدمة</label>
                <input
                  type="text"
                  placeholder="مثال: التدقيق اللغوي الأكاديمي"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">كلمات مفتاحية (مفصولة بفواصل)</label>
                <input
                  type="text"
                  placeholder="تدقيق, تصحيح, لغوي, رسائل"
                  value={newKeywords}
                  onChange={e => setNewKeywords(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">وصف الخدمة / نص الرد التلقائي</label>
              <textarea
                rows={2}
                placeholder="يقدم فريقنا خدمة تدقيق الأطروحات ومراجعة القواعد والصياغة الأكاديمية..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="text-left">
              <button
                onClick={handleAddService}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                إضافة الخدمة
              </button>
            </div>
          </div>

          {/* Registered Services */}
          <div className="bg-slate-900/50 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">الخدمات المسجلة ({services.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {services.map(s => (
                <div
                  key={s.id}
                  className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-xs text-white flex items-center gap-2">
                      <span>{s.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    {s.desc && <p className="text-[11px] text-slate-300">{s.desc}</p>}
                    {s.keywords && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.keywords.split(',').map((k, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/50">
                            {k.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="حذف الخدمة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions & Unknown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>اقتراحات التعلم</span>
                <RefreshCw className="w-3.5 h-3.5 cursor-pointer text-slate-400 hover:text-white" />
              </div>
              <div className="space-y-1.5 text-[11px]">
                {suggestions.map(sug => (
                  <div key={sug.id} className="p-2 rounded bg-slate-800/50 border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-200">{sug.query}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                      {sug.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>طلبات غير معروفة</span>
                <span className="text-[10px] text-slate-500">تم تسجيلها للمراجعة</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {unknownRequests.map(unk => (
                  <div key={unk.id} className="p-2 rounded bg-slate-800/50 border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-300 truncate max-w-[170px]">{unk.text}</span>
                    <span className="text-[10px] text-slate-500">{unk.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
