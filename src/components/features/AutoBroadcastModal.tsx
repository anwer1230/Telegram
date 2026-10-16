import { useState, useEffect } from 'react';
import {
  Megaphone,
  Clock,
  Send,
  Users,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Link2,
  Sliders,
  Play,
  Pause,
  Layers,
  Check
} from 'lucide-react';

type BroadcastSettings = {
  message: string;
  sendType: string;
  intervalMinutes: number;
  durationHours: number;
  sanitizeMode: string;
  groups: string[];
  lastSentTime: string;
  totalSentCount: number;
  isScheduledRunning: boolean;
  activeAccount?: {
    id: string;
    name: string;
    phone: string;
    username: string;
    role: string;
  };
};

export function AutoBroadcastModal({
  onClose,
  onOpenAccounts,
  onSendDirectToChat,
}: {
  onClose: () => void;
  onOpenAccounts?: () => void;
  onSendDirectToChat?: (text: string) => void;
}) {
  const [data, setData] = useState<BroadcastSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sendType, setSendType] = useState<'instant' | 'scheduled' | 'rotating'>('instant');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [durationHours, setDurationHours] = useState(6);
  const [sanitizeMode, setSanitizeMode] = useState('salam');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    fetch('/api/telegram/broadcast/status')
      .then(res => res.json())
      .then((res: BroadcastSettings) => {
        setData(res);
        setMessage(res.message || '');
        setSelectedGroups(res.groups || []);
        setIntervalMinutes(res.intervalMinutes || 30);
        setDurationHours(res.durationHours || 6);
        setSanitizeMode(res.sanitizeMode || 'salam');
        setIsScheduled(Boolean(res.isScheduledRunning));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSendNow = async () => {
    if (!message.trim()) {
      setFeedback({ type: 'error', text: 'يرجى كتابة نص الرسالة الإعلانية أولاً.' });
      return;
    }
    if (selectedGroups.length === 0) {
      setFeedback({ type: 'error', text: 'يرجى تحديد مجموعة واحدة على الأقل للنشر.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/telegram/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          groups: selectedGroups,
          sendType: 'instant',
        }),
      });
      const result = await response.json();
      if (result.success) {
        setFeedback({
          type: 'success',
          text: `تم النشر الفوري بنجاح إلى ${result.sentCount} مجموعة مستهدفة!`,
        });
        if (data) {
          setData({
            ...data,
            totalSentCount: (data.totalSentCount || 0) + selectedGroups.length,
            lastSentTime: new Date().toISOString(),
          });
        }
      } else {
        setFeedback({ type: 'error', text: result.error || 'تعذر إتمام عملية النشر' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم أثناء النشر' });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleSchedule = async () => {
    const nextState = !isScheduled;
    setIsScheduled(nextState);
    await fetch('/api/telegram/broadcast/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sendType: 'scheduled',
        intervalMinutes,
        durationHours,
        sanitizeMode,
        groups: selectedGroups,
        isScheduledRunning: nextState,
      }),
    });
    setFeedback({
      type: 'success',
      text: nextState
        ? `تم بدء جدولة النشر التلقائي كل ${intervalMinutes} دقيقة.`
        : 'تم إيقاف الجدولة التلقائية مؤقتاً.',
    });
  };

  const handleAddGroup = () => {
    const clean = newGroupInput.trim();
    if (!clean) return;
    const formatted = clean.startsWith('@') || clean.startsWith('http') ? clean : `@${clean}`;
    if (!selectedGroups.includes(formatted)) {
      setSelectedGroups([...selectedGroups, formatted]);
    }
    setNewGroupInput('');
  };

  const handleRemoveGroup = (group: string) => {
    setSelectedGroups(selectedGroups.filter(g => g !== group));
  };

  const handleInsertTemplate = (type: 'academic' | 'format' | 'welcome') => {
    if (type === 'academic') {
      setMessage('🌟 خدمات المساعد الأكاديمي والبحوث الطلابية:\n- إعداد خطط البحث وعناوين الرسائل الجامعية.\n- توثيق وتنسيق المراجع وفق معايير APA.\n- تلخيص الأوراق العلمية وصياغة الاستبيانات بدقة.\nللتواصل والاستفسار المباشر يرجى مراسلتنا.');
    } else if (type === 'format') {
      setMessage('📑 خدمات تحويل وتنسيق الملفات الآلية المتقدمة:\n- تحويل PDF إلى مستند Word منسق وقابل للتعديل.\n- استخراج الجداول وتحويلها إلى جداول بيانات Excel.\n- تجهيز عروض تقديمية PowerPoint باحترافية.\nخدمة سريعة ودقيقة على مدار الساعة.');
    } else {
      setMessage('السلام عليكم ورحمة الله، مرحباً بكم جميعاً أعضاء المجموعة الأعزاء 🌹\nيسعدنا خدمتكم في مختلف الخدمات التقنية والأكاديمية، نتمنى لكم يوماً موفقاً!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5" dir="rtl">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl fade-up">
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Megaphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">إدارة النشر التلقائي المتقدم</h2>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  نظام رئيسي مدمج
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                إرسال ونشر الرسائل الإعلانية في المجموعات والقنوات مع الجدولة الذكية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin text-primary ml-2" />
              جارٍ تحميل إعدادات النشر...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feedback Banner */}
              {feedback && (
                <div
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-medium shadow-sm ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.text}</span>
                  </div>
                  <button type="button" onClick={() => setFeedback(null)} className="text-sm font-bold">
                    ×
                  </button>
                </div>
              )}

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-1.5">
                <button
                  type="button"
                  onClick={() => setSendType('instant')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
                    sendType === 'instant'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Send size={15} />
                  <span>نشر فوري الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSendType('scheduled')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
                    sendType === 'scheduled'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock size={15} />
                  <span>جدولة دورية تلقائية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSendType('rotating')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
                    sendType === 'rotating'
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers size={15} />
                  <span>تدوير وتوزيع متعدد</span>
                </button>
              </div>

              {/* Grid: Composer & Groups */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left: Message Composer */}
                <div className="space-y-4 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">محتوى الرسالة الإعلانية</label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">نماذج سريعة:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate('academic')}
                        className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      >
                        أكاديمي
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate('format')}
                        className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground transition hover:bg-muted cursor-pointer"
                      >
                        تحويل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate('welcome')}
                        className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground transition hover:bg-muted cursor-pointer"
                      >
                        ترحيب
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={7}
                      placeholder="اكتب رسالتك الإعلانية هنا مع دعم التنسيقات والروابط والأيقونات..."
                      className="w-full resize-none rounded-2xl border border-input bg-background p-4 text-xs leading-relaxed outline-none transition focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{message.length} حرف</span>
                    </div>
                  </div>

                  {/* Message Preview in Telegram */}
                  <div className="rounded-2xl border border-border bg-muted/20 p-3.5">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles size={13} className="text-primary" />
                        معاينة المظهر في تيليجرام
                      </span>
                      {onSendDirectToChat && (
                        <button
                          type="button"
                          onClick={() => onSendDirectToChat(message)}
                          disabled={!message.trim()}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-40"
                        >
                          إرسال للمحادثة النشطة الآن
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-relaxed text-foreground shadow-xs">
                      {message.trim() ? (
                        <p className="whitespace-pre-wrap">{message}</p>
                      ) : (
                        <p className="text-muted-foreground italic">اكتب نص الرسالة أعلاه لمشاهدة المعاينة الفورية...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Target Groups & Schedule Settings */}
                <div className="space-y-4 lg:col-span-5">
                  {/* Target Groups */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        <span className="text-xs font-bold">المجموعات والقنوات المستهدفة</span>
                      </div>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-mono font-bold text-foreground">
                        {selectedGroups.length} محددة
                      </span>
                    </div>

                    {/* Add Group input */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={newGroupInput}
                        onChange={e => setNewGroupInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                        placeholder="@group_username"
                        className="h-9 flex-1 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleAddGroup}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-105 cursor-pointer"
                      >
                        إضافة
                      </button>
                    </div>

                    {/* Groups chips */}
                    <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto py-1">
                      {selectedGroups.map(group => (
                        <span
                          key={group}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-foreground"
                          dir="ltr"
                        >
                          <span>{group}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(group)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {selectedGroups.length === 0 && (
                        <p className="text-[11px] text-muted-foreground py-3 text-center w-full">
                          لم يتم تحديد مجموعات بعد. أضف أسماء المجموعات أعلاه.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timing & Interval settings */}
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Sliders size={15} className="text-primary" />
                      <span>خيارات التوقيت والحماية</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">الفاصل الزمني</label>
                        <select
                          value={intervalMinutes}
                          onChange={e => setIntervalMinutes(Number(e.target.value))}
                          className="h-9 w-full rounded-xl border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                        >
                          <option value={15}>كل 15 دقيقة</option>
                          <option value={30}>كل 30 دقيقة</option>
                          <option value={45}>كل 45 دقيقة</option>
                          <option value={60}>كل ساعة</option>
                          <option value={120}>كل ساعتين</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">مدة الجدولة</label>
                        <select
                          value={durationHours}
                          onChange={e => setDurationHours(Number(e.target.value))}
                          className="h-9 w-full rounded-xl border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                        >
                          <option value={2}>لمدة ساعتين</option>
                          <option value={4}>لمدة 4 ساعات</option>
                          <option value={6}>لمدة 6 ساعات</option>
                          <option value={12}>لمدة 12 ساعة</option>
                          <option value={24}>لمدة يوم كامل</option>
                        </select>
                      </div>
                    </div>

                    {/* Anti-spam & Sanitize */}
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-2.5 text-[11px]">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        نظام الحماية وتفادي الحظر
                      </span>
                      <span className="font-bold text-primary">مفعّل تلقائياً</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-muted/30 p-3 sm:grid-cols-4 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">إجمالي الرسائل المنشورة</p>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">{data?.totalSentCount || 184}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">المجموعات النشطة</p>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">{selectedGroups.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">حالة الجدولة</p>
                  <p className={`text-xs font-bold mt-0.5 ${isScheduled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {isScheduled ? 'نشطة ومجدولة' : 'متوقفة'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">آخر عملية نشر</p>
                  <p className="text-[11px] font-medium text-foreground mt-0.5">
                    {data?.lastSentTime ? new Date(data.lastSentTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : 'اليوم'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-none items-center justify-between border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="text-xs text-muted-foreground">
            {isScheduled ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Clock size={14} />
                الجدولة مستمرة كل {intervalMinutes} دقيقة
              </span>
            ) : (
              <span>جاهز للنشر الفوري عبر الحساب الرئيسي</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSchedule}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                isScheduled
                  ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white'
                  : 'border-border bg-secondary text-foreground hover:border-primary/40'
              }`}
            >
              {isScheduled ? <Pause size={14} /> : <Play size={14} />}
              <span>{isScheduled ? 'إيقاف الجدولة' : 'بدء الجدولة'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendNow}
              disabled={isSending || !message.trim() || selectedGroups.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جارٍ النشر...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>نشر فوري الآن ({selectedGroups.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
