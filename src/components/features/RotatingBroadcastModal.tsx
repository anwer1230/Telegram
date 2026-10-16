import { useState, useEffect } from 'react';
import { X, RefreshCw, Play, Square, Save, Clock, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export function RotatingBroadcastModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<string[]>([
    'السلام عليكم ورحمة الله، يسرنا تقديم خدمات الأبحاث والتحويل الأكاديمي المتخصص 📚✨',
    'نوفر لكم أفضل أدوات تنسيق ملفات PDF إلى Word بدقة عالية مع الجداول والصور 📄🔄',
    'تحليل استبيانات واستخراج جداول البيانات إلى Excel مع التقارير الإحصائية 📊🎯',
    'المساعد الأكاديمي لخطط البحث ومراجعة المراجع وفق معايير APA المعتمدة 🎓',
    'تواصلوا معنا عبر القناة الرسمية للاستفسار والطلب الفوري 🚀',
  ]);
  const [groups, setGroups] = useState<string>('@saudi_academic\n@riyadh_students\n@gulf_research\n@arab_transcribers');
  const [interval, setIntervalVal] = useState<number>(5);
  const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(300);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/rotating/status')
      .then(r => r.json())
      .then(d => {
        if (d) {
          setIsRunning(Boolean(d.running));
          if (Array.isArray(d.messages) && d.messages.length > 0) setMessages(d.messages);
          if (Array.isArray(d.groups) && d.groups.length > 0) setGroups(d.groups.join('\n'));
          if (d.interval) setIntervalVal(d.interval);
          if (d.intervalUnit) setIntervalUnit(d.intervalUnit);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 300));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, countdown]);

  const handlePreset = (val: number, unit: 'seconds' | 'minutes' | 'hours') => {
    setIntervalVal(val);
    setIntervalUnit(unit);
  };

  const handleSave = async () => {
    const groupList = groups.split('\n').map(g => g.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/rotating/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.filter(Boolean),
          groups: groupList,
          interval,
          intervalUnit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', text: 'تم حفظ إعدادات النشر الدوري بنجاح.' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حفظ الإعدادات.' });
    }
  };

  const handleToggle = async (start: boolean) => {
    try {
      const res = await fetch('/api/rotating/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ running: start }),
      });
      const data = await res.json();
      setIsRunning(Boolean(data.running));
      if (start) {
        setFeedback({ type: 'success', text: 'تم تشغيل النشر الدوري المتسلسل بنجاح.' });
      } else {
        setFeedback({ type: 'success', text: 'تم إيقاف النشر الدوري.' });
      }
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ type: 'error', text: 'حدث خطأ أثناء تغيير الحالة.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] text-[#e2e8f0] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-base">النشر الدوري (المتسلسل)</h3>
              <p className="text-xs text-purple-200">تدوير حتى 5 رسائل بالتناوب مع مؤقت زمني ذكي</p>
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
          {/* Explanation Alert */}
          <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-3.5 text-xs text-purple-200 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              أرسل حتى 5 رسائل بالتناوب — يرسل الرسالة 1 ثم ينتظر الفاصل المحدد، ثم يرسل الرسالة 2 وهكذا في حلقة مستمرة.
            </span>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Messages Sequence (Up to 5) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">نصوص الرسائل الخمس المتعاقبة:</label>
            {[0, 1, 2, 3, 4].map(idx => (
              <div key={idx} className="relative">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                  الرسالة {idx + 1}
                </span>
                <textarea
                  rows={2}
                  value={messages[idx] || ''}
                  onChange={e => {
                    const newArr = [...messages];
                    newArr[idx] = e.target.value;
                    setMessages(newArr);
                  }}
                  placeholder={`اكتب نص الرسالة رقم ${idx + 1}...`}
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pt-7 pb-2 px-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            ))}
          </div>

          {/* Groups Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">المجموعات المستهدفة (سطر لكل مجموعة):</label>
            <textarea
              rows={3}
              value={groups}
              onChange={e => setGroups(e.target.value)}
              placeholder="@saudi_academic&#10;@riyadh_students&#10;@gulf_research"
              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Interval Setting */}
          <div className="bg-slate-900/50 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                فترة الفاصل الزمني بين الرسائل
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={e => setIntervalVal(Number(e.target.value) || 1)}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center"
                />
                <select
                  value={intervalUnit}
                  onChange={e => setIntervalUnit(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  <option value="seconds">ثواني</option>
                  <option value="minutes">دقائق</option>
                  <option value="hours">ساعات</option>
                </select>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handlePreset(30, 'seconds')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                30 ثانية
              </button>
              <button
                type="button"
                onClick={() => handlePreset(1, 'minutes')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                دقيقة
              </button>
              <button
                type="button"
                onClick={() => handlePreset(5, 'minutes')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-purple-900/50 text-purple-300 border border-purple-700"
              >
                5 دقائق
              </button>
              <button
                type="button"
                onClick={() => handlePreset(15, 'minutes')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                15 دقيقة
              </button>
              <button
                type="button"
                onClick={() => handlePreset(30, 'minutes')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                30 دقيقة
              </button>
              <button
                type="button"
                onClick={() => handlePreset(1, 'hours')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                ساعة
              </button>
              <button
                type="button"
                onClick={() => handlePreset(3, 'hours')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                3 ساعات
              </button>
            </div>

            {/* Countdown / State Card */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-semibold text-slate-200">
                  {isRunning ? 'النشر الدوري يعمل حالياً' : 'النشر الدوري متوقف'}
                </span>
              </div>
              {isRunning && (
                <div className="text-xs font-mono text-purple-300">
                  الإرسال القادم بعد: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </button>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={() => handleToggle(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-4 h-4" />
                بدء النشر الدوري
              </button>
            ) : (
              <button
                onClick={() => handleToggle(false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-4 h-4" />
                إيقاف
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
