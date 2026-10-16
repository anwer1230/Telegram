import { useState, useEffect } from 'react';
import {
  Eye,
  Search,
  Tag,
  Plus,
  X,
  Radio,
  Volume2,
  VolumeX,
  RefreshCw,
  Bell,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
  Users
} from 'lucide-react';

type CapturedEvent = {
  id: string;
  group: string;
  sender: string;
  text: string;
  keyword: string;
  time: string;
};

type MonitoringSettings = {
  active: boolean;
  watchWords: string[];
  groups: string[];
  soundAlert: boolean;
  autoReplyTrigger: boolean;
  capturedEvents: CapturedEvent[];
};

export function GroupMonitoringModal({
  onClose,
  onOpenAutoReplies,
  onReplyInChat,
}: {
  onClose: () => void;
  onOpenAutoReplies?: () => void;
  onReplyInChat?: (text: string) => void;
}) {
  const [data, setData] = useState<MonitoringSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [watchWords, setWatchWords] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [events, setEvents] = useState<CapturedEvent[]>([]);
  const [soundAlert, setSoundAlert] = useState(true);
  const [autoReplyTrigger, setAutoReplyTrigger] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/telegram/monitoring/status')
      .then(res => res.json())
      .then((res: MonitoringSettings) => {
        setData(res);
        setIsActive(Boolean(res.active));
        setWatchWords(res.watchWords || []);
        setEvents(res.capturedEvents || []);
        setSoundAlert(Boolean(res.soundAlert));
        setAutoReplyTrigger(Boolean(res.autoReplyTrigger));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleMonitoring = async () => {
    const nextState = !isActive;
    setIsActive(nextState);
    try {
      await fetch('/api/telegram/monitoring/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });
      setFeedback(nextState ? 'تم تفعيل المراقبة الحية بنجاح' : 'تم إيقاف المراقبة الحية');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      // rollback
      setIsActive(!nextState);
    }
  };

  const handleAddWord = async () => {
    const clean = newWordInput.trim();
    if (!clean) return;
    if (!watchWords.includes(clean)) {
      const updated = [...watchWords, clean];
      setWatchWords(updated);
      await fetch('/api/telegram/monitoring/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchWords: updated }),
      });
    }
    setNewWordInput('');
  };

  const handleRemoveWord = async (word: string) => {
    const updated = watchWords.filter(w => w !== word);
    setWatchWords(updated);
    await fetch('/api/telegram/monitoring/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchWords: updated }),
    });
  };

  const handleAddPresetCategory = (words: string[]) => {
    const newWords = Array.from(new Set([...watchWords, ...words]));
    setWatchWords(newWords);
    void fetch('/api/telegram/monitoring/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchWords: newWords }),
    });
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5" dir="rtl">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl fade-up">
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
              <Eye size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">مراقبة المجموعات والكلمات المفتاحية</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground'}`} />
                  {isActive ? 'المراقبة نشطة' : 'المراقبة متوقفة'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                رصد فوري لطلبات العملاء والطلاب والكلمات الدلالية في المجموعات النشطة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMonitoring}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-border bg-secondary text-foreground hover:border-primary/40'
              }`}
            >
              <Radio size={14} className={isActive ? 'animate-pulse' : ''} />
              <span>{isActive ? 'إيقاف المراقبة' : 'بدء المراقبة'}</span>
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
              جارٍ تحميل إعدادات المراقبة الحية...
            </div>
          ) : (
            <>
              {/* Watch Words Section */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-foreground">الكلمات المفتاحية المراقبة (Watch Words)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground">إضافة حزمة:</span>
                    <button
                      type="button"
                      onClick={() => handleAddPresetCategory(['بحث', 'ماجستير', 'دكتوراه', 'أكاديمي', 'خطة'])}
                      className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    >
                      + أكاديمي
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetCategory(['تحويل', 'pdf', 'word', 'تنسيق', 'جداول'])}
                      className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground transition hover:bg-muted cursor-pointer"
                    >
                      + تحويل
                    </button>
                  </div>
                </div>

                {/* Input for new keyword */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={e => setNewWordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddWord()}
                    placeholder="أدخل كلمة مفتاحية جديدة للرصد الفوري (مثال: تلخيص، تدقيق، ترجمة)..."
                    className="h-10 flex-1 rounded-xl border border-input bg-background px-3.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <button
                    type="button"
                    onClick={handleAddWord}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-105 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>إضافة</span>
                  </button>
                </div>

                {/* Keywords Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {watchWords.map(word => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300"
                    >
                      <span>#{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWord(word)}
                        className="text-amber-600 hover:text-destructive cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {watchWords.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">لا توجد كلمات مفتاحية مضافة حالياً.</p>
                  )}
                </div>
              </div>

              {/* Controls Bar: Sound, Auto-Reply, Groups */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 text-xs">
                    {soundAlert ? <Volume2 size={16} className="text-primary" /> : <VolumeX size={16} className="text-muted-foreground" />}
                    <span>تنبيهات صوتية فورية</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundAlert(!soundAlert)}
                    className={`h-6 w-11 rounded-full p-0.5 transition cursor-pointer ${
                      soundAlert ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-card shadow-sm transition ${soundAlert ? '-translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Zap size={16} className="text-amber-500" />
                    <span>إشعار محرك الرد الآلي</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoReplyTrigger(!autoReplyTrigger)}
                    className={`h-6 w-11 rounded-full p-0.5 transition cursor-pointer ${
                      autoReplyTrigger ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-card shadow-sm transition ${autoReplyTrigger ? '-translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Users size={16} className="text-primary" />
                    <span>المجموعات المراقبة</span>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-mono font-bold text-foreground">
                    {data?.groups?.length || 3} مجموعات
                  </span>
                </div>
              </div>

              {/* Live Captured Events Feed */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">سجل الأحداث والرسائل الملتقطة مؤخراً</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {events.length} إشعار مسجل
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-border bg-muted/20 p-3 transition hover:border-primary/30"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{event.sender}</span>
                          <span className="font-mono text-[10px] text-primary" dir="ltr">{event.group}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            #{event.keyword}
                          </span>
                          <span className="font-mono text-[10px]">{event.time}</span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-foreground bg-card/60 p-2.5 rounded-lg border border-border/50">
                        {event.text}
                      </p>

                      <div className="mt-2.5 flex items-center justify-end gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleCopyText(event.id, event.text)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Copy size={12} />
                          <span>{copiedId === event.id ? 'تم النسخ' : 'نسخ النص'}</span>
                        </button>
                        {onReplyInChat && (
                          <button
                            type="button"
                            onClick={() => onReplyInChat(`رد بخصوص طلبك في ${event.group}: يسعدنا مساعدتك في خدماتنا الأكاديمية والتحويل.`)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-bold text-primary hover:bg-primary hover:text-primary-foreground transition cursor-pointer"
                          >
                            <MessageSquare size={12} />
                            <span>رد فوري في المحادثة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {events.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      لا توجد رسائل ملتقطة حتى الآن. عند ذكر أي من الكلمات المفتاحية ستظهر هنا فوراً.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>المراقبة تعمل في الخلفية دون استهلاك موارد إضافية</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAutoReplies && (
              <button
                type="button"
                onClick={onOpenAutoReplies}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
              >
                <Zap size={14} />
                <span>إعداد الرد الآلي للكلمات</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-medium text-foreground transition hover:bg-muted cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
