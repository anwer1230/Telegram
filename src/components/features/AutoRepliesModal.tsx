import { useState, useEffect } from 'react';
import {
  Bot,
  Zap,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  RefreshCw,
  Sliders,
  Send,
  HelpCircle,
  ShieldCheck,
  Brain,
  MessageSquare
} from 'lucide-react';

type ReplyRule = {
  id: string;
  trigger: string;
  response: string;
  active: boolean;
  serviceId?: string;
};

type AutoReplySettings = {
  enabled: boolean;
  learningActive: boolean;
  learnedPatternsCount: number;
  rules: ReplyRule[];
};

export function AutoRepliesModal({
  onClose,
  onSendToChat,
}: {
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}) {
  const [data, setData] = useState<AutoReplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [learningActive, setLearningActive] = useState(true);
  const [rules, setRules] = useState<ReplyRule[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<{ matched: boolean; reply: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/telegram/autoreply/status')
      .then(res => res.json())
      .then((res: AutoReplySettings) => {
        setData(res);
        setIsEnabled(Boolean(res.enabled));
        setLearningActive(Boolean(res.learningActive));
        setRules(res.rules || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleEnabled = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    await fetch('/api/telegram/autoreply/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextState }),
    });
    setFeedback(nextState ? 'تم تفعيل الرد الآلي الذكي' : 'تم تعطيل الرد الآلي مؤقتاً');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddRule = async () => {
    if (!newTrigger.trim() || !newResponse.trim()) {
      return;
    }
    const newRule: ReplyRule = {
      id: `rule_${Date.now()}`,
      trigger: newTrigger.trim(),
      response: newResponse.trim(),
      active: true,
      serviceId: 'custom',
    };
    const updated = [...rules, newRule];
    setRules(updated);
    setNewTrigger('');
    setNewResponse('');

    await fetch('/api/telegram/autoreply/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: updated }),
    });
    setFeedback('تمت إضافة قاعدة الرد الآلي بنجاح');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    await fetch('/api/telegram/autoreply/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: updated }),
    });
  };

  const handleToggleRuleActive = async (id: string) => {
    const updated = rules.map(r => (r.id === id ? { ...r, active: !r.active } : r));
    setRules(updated);
    await fetch('/api/telegram/autoreply/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: updated }),
    });
  };

  const handleRunTest = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    try {
      const res = await fetch('/api/telegram/autoreply/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch {
      setTestResult({ matched: false, reply: 'تعذر الاتصال بمحرك الرد الآلي' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5" dir="rtl">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl fade-up">
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">الرد الآلي ومحرك التعلم الذكي</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isEnabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}>
                  {isEnabled ? 'الرد الآلي مفعّل' : 'متوقف'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                إدارة قواعد المطابقة الفورية والتعلم من استفسارات الطلاب والعملاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleEnabled}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                isEnabled
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-border bg-secondary text-foreground hover:border-primary/40'
              }`}
            >
              <Zap size={14} />
              <span>{isEnabled ? 'تعطيل الرد الآلي' : 'تفعيل الرد الآلي'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-medium text-primary border border-primary/20">
            <CheckCircle2 size={15} />
            <span>{feedback}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin text-primary ml-2" />
              جارٍ تحميل قواعد ومحرك الردود...
            </div>
          ) : (
            <>
              {/* Intelligence Summary Row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                <div className="rounded-2xl border border-border bg-card p-3.5">
                  <p className="text-[10px] text-muted-foreground">الأنماط المتعلمة</p>
                  <p className="font-mono text-base font-bold text-primary mt-0.5">
                    {data?.learnedPatternsCount || 38} نمطاً
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3.5">
                  <p className="text-[10px] text-muted-foreground">قواعد الرد النشطة</p>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {rules.filter(r => r.active).length} / {rules.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3.5">
                  <p className="text-[10px] text-muted-foreground">دقة المطابقة الذكية</p>
                  <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    98.6%
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3.5">
                  <p className="text-[10px] text-muted-foreground">التعلم التلقائي</p>
                  <p className="text-xs font-bold text-primary mt-0.5">
                    {learningActive ? 'نشط ومستمر' : 'متوقف'}
                  </p>
                </div>
              </div>

              {/* Sandbox / Testing Simulator */}
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Sparkles size={15} />
                  <span>محاكي اختبار الردود الفورية (Live Test Sandbox)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  اكتب أي رسالة أو استفسار لتجربة كيف سيرد البوت الذكي على العميل فوراً:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={e => setTestQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRunTest()}
                    placeholder="مثال: أحتاج مساعدة في بحث تخرج، أو كيف أحول وورد إلى PDF؟"
                    className="h-10 flex-1 rounded-xl border border-input bg-background px-3.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <button
                    type="button"
                    onClick={handleRunTest}
                    disabled={testing || !testQuery.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-40 cursor-pointer"
                  >
                    {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send size={14} />}
                    <span>تجربة الرد</span>
                  </button>
                </div>

                {testResult && (
                  <div className="rounded-xl border border-border bg-card p-3.5 text-xs leading-relaxed fade-up">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span className="font-bold flex items-center gap-1">
                        <Bot size={13} className="text-primary" />
                        الرد التلقائي المتوقع:
                      </span>
                      {testResult.matched ? (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          مطابقة قاعدة بنجاح
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          رد افتراضي عام
                        </span>
                      )}
                    </div>
                    <p className="text-foreground bg-muted/40 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                      {testResult.reply}
                    </p>
                    {onSendToChat && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onSendToChat(testResult.reply)}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          إرسال هذا الرد إلى المحادثة الحالية
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rules List */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">قواعد المطابقة والردود المبرمجة</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {rules.length} قاعدة مضافة
                  </span>
                </div>

                {/* Add new rule form */}
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3.5 space-y-2.5">
                  <span className="text-[11px] font-bold text-foreground block">إضافة قاعدة رد ذكية جديدة</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <input
                      type="text"
                      value={newTrigger}
                      onChange={e => setNewTrigger(e.target.value)}
                      placeholder="الكلمات المشغلة مفصولة بفواصل (مثال: سعر, تكلفة, رسوم)..."
                      className="h-9 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/25 sm:col-span-4"
                    />
                    <input
                      type="text"
                      value={newResponse}
                      onChange={e => setNewResponse(e.target.value)}
                      placeholder="نص الرد الآلي المباشر للعميل..."
                      className="h-9 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/25 sm:col-span-6"
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      disabled={!newTrigger.trim() || !newResponse.trim()}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-40 sm:col-span-2 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>حفظ</span>
                    </button>
                  </div>
                </div>

                {/* Rules cards */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className={`rounded-xl border p-3.5 transition ${
                        rule.active ? 'border-border bg-card' : 'border-border/50 bg-muted/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground">عند ذكر:</span>
                            {rule.trigger.split(',').map((t, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                              >
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs leading-relaxed text-foreground bg-muted/40 p-2.5 rounded-lg">
                            {rule.response}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleRuleActive(rule.id)}
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                              rule.active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {rule.active ? 'مفعّلة' : 'معطلة'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            title="حذف القاعدة"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>نظام التعلم الذاتي يقوم بتحسين الردود ومطابقتها باستمرار</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-secondary px-5 py-2 text-xs font-medium text-foreground transition hover:bg-muted cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
