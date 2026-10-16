import { useState, useEffect } from 'react';
import { X, Zap, Radio, CheckCircle2, AlertCircle, RefreshCw, Shield, Link2 } from 'lucide-react';

export function AutoJoinModal({
  initialTab = 'advanced',
  onClose,
}: {
  initialTab?: 'advanced' | 'instant';
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'advanced' | 'instant'>(initialTab);
  const [links, setLinks] = useState<string>('https://t.me/academic_share\nhttps://t.me/student_support_sa\n@riyadh_study_group');
  const [delay, setDelay] = useState<number>(3);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Instant join settings
  const [instantEnabled, setInstantEnabled] = useState<boolean>(true);
  const [dailyLimit, setDailyLimit] = useState<number>(8);
  const [instantInterval, setInstantInterval] = useState<number>(120);
  const [joinedToday, setJoinedToday] = useState<number>(3);

  useEffect(() => {
    fetch('/api/instant_join/status')
      .then(r => r.json())
      .then(d => {
        if (d) {
          setInstantEnabled(Boolean(d.enabled));
          if (d.dailyLimit) setDailyLimit(d.dailyLimit);
          if (d.intervalSeconds) setInstantInterval(d.intervalSeconds);
          if (d.joinedTodayCount) setJoinedToday(d.joinedTodayCount);
        }
      })
      .catch(() => {});
  }, []);

  const handleStartAdvancedJoin = async () => {
    if (!links.trim()) {
      setFeedback({ type: 'error', text: 'يرجى إدخال روابط المجموعات أولاً.' });
      return;
    }
    setIsJoining(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auto_join/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links, delay }),
      });
      const data = await res.json();
      setIsJoining(false);
      if (data.success) {
        setFeedback({ type: 'success', text: `تم الانضمام بنجاح إلى ${data.joined} مجموعة.` });
        setJoinedToday(prev => prev + (data.joined || 1));
      }
    } catch {
      setIsJoining(false);
      setFeedback({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم.' });
    }
  };

  const handleExtractLinks = async () => {
    try {
      const res = await fetch('/api/extract_group_links', { method: 'POST' });
      const data = await res.json();
      if (data.links && data.links.length > 0) {
        setLinks(prev => prev + '\n' + data.links.join('\n'));
        setFeedback({ type: 'success', text: `تم استخراج ${data.links.length} روابط مجموعات عامة تلقائياً.` });
      }
    } catch {
      //
    }
  };

  const handleSaveInstant = async () => {
    try {
      await fetch('/api/instant_join/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit, intervalSeconds: instantInterval }),
      });
      setFeedback({ type: 'success', text: 'تم حفظ إعدادات الانضمام الفوري بنجاح.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      //
    }
  };

  const handleToggleInstant = async (enabled: boolean) => {
    setInstantEnabled(enabled);
    try {
      await fetch('/api/instant_join/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    } catch {
      //
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] text-[#e2e8f0] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Tabs */}
        <div className="bg-gradient-to-r from-rose-700 to-red-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              {activeTab === 'advanced' ? <Zap className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {activeTab === 'advanced' ? 'الانضمام التلقائي المتقدم' : 'الانضمام الفوري الخاص'}
              </h3>
              <p className="text-xs text-rose-200">إدارة الانضمام إلى مجموعات تيليجرام بأمان وبدون حظر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('advanced')}
            className={`pb-2.5 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'advanced'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            الانضمام المتقدم بالروابط
          </button>
          <button
            onClick={() => setActiveTab('instant')}
            className={`pb-2.5 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'instant'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            الانضمام الفوري الخاص (تلقائي)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
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

          {activeTab === 'advanced' ? (
            /* Advanced Join Content */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">روابط المجموعات (سطر لكل رابط)</label>
                  <button
                    type="button"
                    onClick={handleExtractLinks}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    استخراج روابط المجموعات تلقائياً
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={links}
                  onChange={e => setLinks(e.target.value)}
                  placeholder="https://t.me/group1&#10;https://t.me/+invite_code&#10;@channel"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="bg-slate-900/50 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">التأخير بين كل انضمام</div>
                  <div className="text-[11px] text-slate-400">لحماية الحساب من قيود التليجرام المؤقتة</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={delay}
                    onChange={e => setDelay(Number(e.target.value) || 1)}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono"
                  />
                  <span className="text-xs text-slate-400">ثواني</span>
                </div>
              </div>

              <button
                onClick={handleStartAdvancedJoin}
                disabled={isJoining}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {isJoining ? 'جاري تنفيذ الانضمام...' : 'بدء الانضمام المتقدم الآن'}
              </button>
            </div>
          ) : (
            /* Instant Join Content */
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  يعمل افتراضياً بشكل دائم مع رسائل المجموعات الواردة. يفحص روابط Telegram العامة، يتخطى القنوات الخاصة
                  وروابط الدعوة، ويرسل إشعاراً إلى الرسائل المحفوظة بعد نجاح الانضمام.
                </span>
              </div>

              {/* Toggle switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/30">
                <div>
                  <strong className="text-xs text-white">تشغيل المراقب التلقائي</strong>
                  <div className="text-[11px] text-slate-400">لا يتم الانضمام إلا إلى المجموعات العامة الموثوقة</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instantEnabled}
                    onChange={e => handleToggleInstant(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-xl space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">الحد خلال 24 ساعة</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={dailyLimit}
                    onChange={e => setDailyLimit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-400">افتراضي محافظ: 8 مجموعات</span>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-xl space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">الفاصل الأدنى بين الانضمامات</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={60}
                      value={instantInterval}
                      onChange={e => setInstantInterval(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <span className="text-xs text-slate-400">ثانية</span>
                  </div>
                  <span className="text-[10px] text-slate-400">يتم احترام FloodWait وإعادة المحاولة</span>
                </div>
              </div>

              {/* Current Status Card */}
              <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">الحالة الحالية اليوم</div>
                  <div className="text-[11px] text-emerald-400">
                    تم الانضمام إلى {joinedToday} مجموعات من أصل {dailyLimit} المحددة
                  </div>
                </div>
                <button
                  onClick={handleSaveInstant}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          )}
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
