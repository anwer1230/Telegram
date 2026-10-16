import { useState, useEffect } from 'react';
import {
  Radio,
  Send,
  Cog,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Shield
} from 'lucide-react';

interface CapturedEvent {
  id: string;
  group: string;
  sender: string;
  text: string;
  keyword: string;
  time: string;
}

export function LiveMonitoringQuickBar({
  onOpenFullModal,
  onSendNow,
  onReplyInChat,
  currentDraft = '',
}: {
  onOpenFullModal: () => void;
  onSendNow?: (text: string) => void;
  onReplyInChat?: (text: string) => void;
  currentDraft?: string;
}) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [events, setEvents] = useState<CapturedEvent[]>([]);
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeGroupsCount, setActiveGroupsCount] = useState<number>(4);

  // Poll monitoring status
  useEffect(() => {
    fetch('/api/telegram/monitoring/status')
      .then(r => r.json())
      .then(d => {
        if (d) {
          if (typeof d.active === 'boolean') setIsMonitoring(d.active);
          if (Array.isArray(d.capturedEvents)) setEvents(d.capturedEvents);
          if (Array.isArray(d.groups)) setActiveGroupsCount(d.groups.length);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleMonitoring = async () => {
    const nextState = !isMonitoring;
    setIsMonitoring(nextState);
    try {
      if (nextState) {
        await fetch('/api/start_monitoring', { method: 'POST' });
        setSentSuccess('تم بدء المراقبة التلقائية الحية 🟢');
      } else {
        await fetch('/api/stop_monitoring', { method: 'POST' });
        setSentSuccess('تم إيقاف المراقبة الحية 🛑');
      }
      setTimeout(() => setSentSuccess(null), 3000);
    } catch {
      //
    }
  };

  const handleQuickBroadcast = async () => {
    setIsSending(true);
    const textToSend =
      currentDraft.trim() ||
      'السلام عليكم ورحمة الله، يسرنا تقديم خدمات الأبحاث والتحويل وتنسيق الملفات الأكاديمية بدقة متناهية 🌸';

    try {
      const res = await fetch('/api/send_now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();
      setIsSending(false);
      if (data.success) {
        setSentSuccess(`تم الإرسال الفوري بنجاح إلى ${data.sentCount || activeGroupsCount} مجموعات مستهدفة!`);
        if (onSendNow) {
          onSendNow(textToSend);
        }
        setTimeout(() => setSentSuccess(null), 4000);
      }
    } catch {
      setIsSending(false);
      setSentSuccess('حدث خطأ أثناء الإرسال.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[820px] mb-2" dir="rtl">
      <div className="rounded-2xl border border-primary/25 bg-card/95 shadow-md backdrop-blur-md overflow-hidden transition-all">
        {/* Top Mini Bar */}
        <div className="px-3.5 py-2 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent flex items-center justify-between gap-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span>الإرسال والمراقبة الحية</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                ({activeGroupsCount} مجموعات نشطة)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Toggle Monitoring */}
            <button
              type="button"
              onClick={handleToggleMonitoring}
              title={isMonitoring ? 'إيقاف المراقبة' : 'بدء المراقبة'}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                isMonitoring
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              {isMonitoring ? <Play size={10} className="fill-current" /> : <Square size={10} className="fill-current" />}
              <span>{isMonitoring ? 'المراقبة تعمل' : 'متوقفة'}</span>
            </button>

            {/* Quick Broadcast Button */}
            <button
              type="button"
              onClick={handleQuickBroadcast}
              disabled={isSending}
              className="px-2.5 py-0.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1 hover:brightness-105 transition active:scale-95 disabled:opacity-50"
            >
              <Send size={10} />
              <span>{isSending ? 'جاري الإرسال...' : 'إرسال فوري للمجموعات'}</span>
            </button>

            {/* Open Full Settings Modal */}
            <button
              type="button"
              onClick={onOpenFullModal}
              title="فتح لوحة الإعدادات والإرسال والمراقبة الأصلية"
              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
            >
              <Cog size={15} />
            </button>

            {/* Collapse / Expand */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {sentSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>{sentSuccess}</span>
          </div>
        )}

        {/* Collapsible Area with Captured Keyword Alerts */}
        {isExpanded && (
          <div className="p-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span className="font-bold flex items-center gap-1 text-primary">
                <Sparkles size={11} />
                تنبيهات الكلمات المفتاحية المرصودة من المجموعات:
              </span>
              <button
                type="button"
                onClick={onOpenFullModal}
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                <span>لوحة التحكم الكاملة</span>
                <ExternalLink size={10} />
              </button>
            </div>

            {events.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {events.slice(0, 3).map(evt => (
                  <div
                    key={evt.id}
                    className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 border border-border/60 flex items-start justify-between gap-2 text-[11px] transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{evt.sender}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{evt.group}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          كلمة: {evt.keyword}
                        </span>
                        <span className="text-[9px] text-muted-foreground mr-auto">{evt.time}</span>
                      </div>
                      <p className="text-muted-foreground text-[10px] truncate leading-tight">{evt.text}</p>
                    </div>

                    {onReplyInChat && (
                      <button
                        type="button"
                        onClick={() =>
                          onReplyInChat(
                            `أهلاً وسهلاً بك @${evt.sender} بخصوص طلبك في (${evt.group}): يسرنا تقديم المساعدة الأكاديمية الفورية.`
                          )
                        }
                        className="px-2 py-1 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <MessageSquare size={11} />
                        <span>رد فوري</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-[10px] text-muted-foreground">
                المراقبة نشطة وتترصد الكلمات المفتاحية في كافة المجموعات تلقائياً.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
