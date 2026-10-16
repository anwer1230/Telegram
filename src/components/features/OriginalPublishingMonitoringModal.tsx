import { useState, useEffect, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  X,
  Cog,
  ChartBar,
  Rocket,
  Brain,
  Repeat,
  Search,
  Zap,
  Radio,
  ReplyAll,
  Save,
  Send,
  Play,
  Square,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Check,
  RotateCcw
} from 'lucide-react';
import { LearningSystemModal } from './LearningSystemModal';
import { RotatingBroadcastModal } from './RotatingBroadcastModal';
import { AutoJoinModal } from './AutoJoinModal';
import { SavedLinksModal } from './SavedLinksModal';
import { AutoRepliesModal } from './AutoRepliesModal';
import { AccountsManagerModal } from './AccountsManagerModal';

interface AccountTab {
  id: string;
  name: string;
  phone: string;
  username: string;
  color: string;
  role: string;
}

interface OperationLog {
  id: string;
  time: string;
  type: string;
  title: string;
  details?: string;
  status: 'success' | 'warning' | 'info' | 'error';
}

export function OriginalPublishingMonitoringModal({
  onClose,
  onSendToChat,
}: {
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}) {
  // Active sub-modals
  const [activeSubModal, setActiveSubModal] = useState<
    'learning' | 'rotating' | 'links' | 'join_adv' | 'join_instant' | 'auto_replies' | 'accounts' | null
  >(null);

  // Accounts
  const [accounts, setAccounts] = useState<AccountTab[]>([]);
  const [activeAccountId, setActiveAccountId] = useState('');

  // Core Form State
  const [message, setMessage] = useState<string>('');
  const [images, setImages] = useState<{ id: string; name: string; url: string }[]>([]);
  const [sendMode, setSendMode] = useState<'specific' | 'all'>('specific');
  const [groupsText, setGroupsText] = useState<string>('');
  const [watchWordsText, setWatchWordsText] = useState<string>('');
  const [sanitizeMode, setSanitizeMode] = useState<string>('salam');
  const [showSanitizeExplanation, setShowSanitizeExplanation] = useState<boolean>(false);
  const [sendType, setSendType] = useState<'instant' | 'scheduled'>('instant');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(25);
  const [durationHours, setDurationHours] = useState<number>(0);

  // Stats & States
  const [sentCount, setSentCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(true);
  const [isScheduledRunning, setIsScheduledRunning] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Settings, Accounts & Logs
  useEffect(() => {
    // Load accounts
    fetch('/api/telegram/accounts')
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.accounts)) {
          setAccounts(d.accounts);
          if (d.activeId) setActiveAccountId(d.activeId);
          else if (d.accounts.length > 0) setActiveAccountId(d.accounts[0].id);
        }
      })
      .catch(() => {});

    // Load unified settings
    fetch('/api/get_settings')
      .then(r => r.json())
      .then(d => {
        if (d) {
          if (d.message) setMessage(d.message);
          if (Array.isArray(d.groups) && d.groups.length > 0) setGroupsText(d.groups.join('\n'));
          if (Array.isArray(d.watch_words) && d.watch_words.length > 0) setWatchWordsText(d.watch_words.join('\n'));
          if (d.sanitize_mode) setSanitizeMode(d.sanitize_mode);
          if (d.send_type) setSendType(d.send_type);
          if (d.interval_seconds) setIntervalMinutes(Math.round(d.interval_seconds / 60) || 25);
          if (d.schedule_duration_hours !== undefined) setDurationHours(d.schedule_duration_hours);
          if (typeof d.monitoring_active === 'boolean') setIsMonitoringActive(d.monitoring_active);
          if (d.total_sent) setSentCount(d.total_sent);
        }
      })
      .catch(() => {});

    // Load operations logs
    fetch('/api/operations_log')
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.logs)) setLogs(d.logs);
      })
      .catch(() => {});
  }, []);

  // Handlers
  const handleSaveSettings = async () => {
    const groupsList = groupsText.split('\n').map(g => g.trim()).filter(Boolean);
    const watchList = watchWordsText.split('\n').map(w => w.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/save_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          groups: groupsList,
          watch_words: watchList,
          sanitize_mode: sanitizeMode,
          send_type: sendType,
          interval_seconds: intervalMinutes * 60,
          schedule_duration_hours: durationHours,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', text: 'تم حفظ إعدادات المراقبة والإرسال بنجاح ✅' });
        refreshLogs();
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حفظ الإعدادات.' });
    }
  };

  const handleSendNow = async () => {
    if (!message.trim()) {
      setFeedback({ type: 'error', text: 'يرجى كتابة نص الرسالة أولاً.' });
      return;
    }

    const groupsList = groupsText.split('\n').map(g => g.trim()).filter(Boolean);
    if (sendMode === 'specific' && groupsList.length === 0) {
      setFeedback({ type: 'error', text: 'يرجى تحديد مجموعة واحدة على الأقل.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/send_now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          groups: groupsList,
          sanitize_mode: sanitizeMode,
          send_type: sendType,
          images: images.map(i => i.url),
        }),
      });
      const data = await res.json();
      setIsSending(false);
      if (data.success) {
        setSentCount(prev => prev + (data.sentCount || groupsList.length));
        setFeedback({
          type: 'success',
          text: `تم الإرسال بنجاح إلى ${data.sentCount || groupsList.length} مجموعة عبر وضع (${sanitizeMode})!`,
        });
        if (onSendToChat) {
          onSendToChat(`[نشر فوري]: ${message.slice(0, 90)}...`);
        }
        refreshLogs();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setErrorCount(prev => prev + 1);
        setFeedback({ type: 'error', text: data.error || 'حدث خطأ أثناء الإرسال.' });
      }
    } catch {
      setIsSending(false);
      setErrorCount(prev => prev + 1);
      setFeedback({ type: 'error', text: 'تعذر الاتصال بالخادم لإتمام الإرسال.' });
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const res = await fetch('/api/start_monitoring', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsMonitoringActive(true);
        setFeedback({ type: 'success', text: 'تم بدء المراقبة التلقائية على كافة المجموعات والمحادثات 🟢' });
        refreshLogs();
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      //
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const res = await fetch('/api/stop_monitoring', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsMonitoringActive(false);
        setFeedback({ type: 'error', text: 'تم إيقاف المراقبة التلقائية 🛑' });
        refreshLogs();
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      //
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/operations_log/clear', { method: 'POST' });
      setLogs([]);
    } catch {
      //
    }
  };

  const refreshLogs = () => {
    fetch('/api/operations_log')
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.logs)) setLogs(d.logs);
      })
      .catch(() => {});
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImages(prev => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random()}`,
              name: file.name,
              url: reader.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImages(prev => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random()}`,
              name: file.name,
              url: reader.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-[#0b1320] text-[#e2e8f0] border border-cyan-500/30 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0d2137] via-[#102a45] to-[#0f3460] border-b border-cyan-500/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
              <Cog className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                لوحة الإعدادات والإرسال والمراقبة
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono">
                  منظومة النشر الذكية
                </span>
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isMonitoringActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  {isMonitoringActive ? 'المراقبة: نشطة 🟢' : 'المراقبة: متوقفة 🔴'}
                </span>
                <span className="text-slate-500">•</span>
                <span>المجموعات المسجلة: 4</span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-300 font-mono">إجمالي المرسل: {sentCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshLogs}
              title="تحديث البيانات"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2 border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="font-medium">{feedback.text}</span>
          </div>
        )}

        {/* Main Content: Two Columns Layout */}
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[75vh] overflow-y-auto">
          
          {/* LEFT COLUMN: Stats + New Functions (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* 1) إحصائيات الإرسال Card */}
            <div className="bg-[#0f172a]/90 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-cyan-700 to-sky-700 text-white px-4 py-3 flex items-center justify-between">
                <h4 className="text-xs font-bold flex items-center gap-2">
                  <ChartBar className="w-4 h-4" />
                  إحصائيات الإرسال
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/70 border border-cyan-400/40">مباشر</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
                  <div className="text-2xl font-bold font-mono text-emerald-400">{sentCount}</div>
                  <div className="text-xs text-emerald-200 mt-0.5 font-medium">رسائل مرسلة</div>
                </div>
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl">
                  <div className="text-2xl font-bold font-mono text-rose-400">{errorCount}</div>
                  <div className="text-xs text-rose-200 mt-0.5 font-medium">أخطاء</div>
                </div>
              </div>
            </div>

            {/* 2) الوظائف الجديدة Card (Exact match with original index.html) */}
            <div className="bg-[#0f172a]/90 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg">
              <div
                style={{ background: 'linear-gradient(135deg, #1e3c78 0%, #2a5298 100%)' }}
                className="text-white px-4 py-3 flex items-center justify-between"
              >
                <h4 className="text-xs font-bold flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  الوظائف الجديدة والمتقدمة
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 border border-blue-400/30 font-mono">
                  6 خدمات
                </span>
              </div>

              <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {/* 1. نظام التعلم الذكي */}
                <button
                  onClick={() => setActiveSubModal('learning')}
                  className="w-full text-right p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">نظام التعلم الذكي</div>
                      <div className="text-[11px] text-slate-400">تدريب البوت التلقائي</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-400">فتح ←</span>
                </button>

                {/* 2. النشر الدوري المتسلسل */}
                <button
                  onClick={() => setActiveSubModal('rotating')}
                  className="w-full text-right p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/60 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">النشر الدوري (المتسلسل)</div>
                      <div className="text-[11px] text-slate-400">تدوير 5 رسائل بفارق زمني</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-purple-400">فتح ←</span>
                </button>

                {/* 3. البحث في روابطي ومحفوظاتي */}
                <button
                  onClick={() => setActiveSubModal('links')}
                  className="w-full text-right p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">البحث في روابطي ومحفوظاتي</div>
                      <div className="text-[11px] text-slate-400">رسائلي ومجموعاتي المحفوظة</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-cyan-400">فتح ←</span>
                </button>

                {/* 4. الانضمام التلقائي المتقدم */}
                <button
                  onClick={() => setActiveSubModal('join_adv')}
                  className="w-full text-right p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/60 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">الانضمام المتقدم</div>
                      <div className="text-[11px] text-slate-400">استخراج وانضمام جماعي آمن</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-rose-400">فتح ←</span>
                </button>

                {/* 5. الانضمام الفوري الخاص */}
                <button
                  onClick={() => setActiveSubModal('join_instant')}
                  className="w-full text-right p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">الانضمام الفوري الخاص</div>
                      <div className="text-[11px] text-emerald-400 font-medium">يعمل افتراضياً ✅</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400">فتح ←</span>
                </button>

                {/* 6. الردود التلقائية */}
                <button
                  onClick={() => setActiveSubModal('auto_replies')}
                  className="w-full text-right p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/60 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ReplyAll className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">الردود التلقائية الذكية</div>
                      <div className="text-[11px] text-slate-400">قواعد الرد الفوري المخصصة</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-teal-400">فتح ←</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Monitoring & Sending Settings (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#0f172a]/90 border border-emerald-500/35 rounded-2xl overflow-hidden shadow-lg">
              
              {/* Card Header (bg-success text-white) */}
              <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-5 py-3.5 flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2">
                  <Cog className="w-4 h-4" />
                  إعدادات المراقبة والإرسال
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1 border transition-colors ${
                      ttsEnabled
                        ? 'bg-amber-500 text-slate-900 font-bold border-amber-400'
                        : 'bg-emerald-900/60 text-emerald-200 border-emerald-600/50 hover:bg-emerald-800'
                    }`}
                  >
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{ttsEnabled ? 'النطق: مفعّل' : 'نطق صوتي'}</span>
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-4">
                
                {/* 1. نص الرسالة */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200">الرسالة المراد إرسالها:</label>
                    <span className="text-[11px] text-slate-400 font-mono">{message.length} حرف</span>
                  </div>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="اكتب نص الإعلان أو الرسالة الترويجية هنا..."
                    className="w-full bg-slate-900/80 border border-slate-700/90 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
                  />
                </div>

                {/* 2. إضافة صور للرسالة (اختياري) Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    إضافة صور للرسالة (اختياري):
                  </label>
                  
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 mx-auto text-emerald-400 mb-1.5" />
                    <div className="text-xs text-slate-200 font-medium">
                      اضغط لاختيار الصور أو اسحبها وأفلتها هنا
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      يدعم: JPG, PNG, GIF, WebP | الحد الأقصى: 10MB لكل صورة
                    </div>
                  </div>

                  {/* Previews */}
                  {images.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-semibold">
                          الصور المحددة ({images.length}):
                        </span>
                        <button
                          onClick={() => setImages([])}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          مسح الكل
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {images.map(img => (
                          <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setImages(prev => prev.filter(i => i.id !== img.id));
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        ستُرسل الصور مع الرسالة النصية معاً في نفس الرسالة
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. وضع الإرسال (مجموعات محددة / كل المجموعات) */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">وضع الإرسال:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSendMode('specific')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        sendMode === 'specific'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      مجموعات محددة
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMode('all')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        sendMode === 'all'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      كل المجموعات
                    </button>
                  </div>
                </div>

                {/* 4. مجموعات الإرسال */}
                {sendMode === 'specific' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200">
                        مجموعات الإرسال (سطر لكل معرف أو رابط):
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveSubModal('links')}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300"
                      >
                        استعراض المجموعات
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={groupsText}
                      onChange={e => setGroupsText(e.target.value)}
                      placeholder="@group1&#10;@group2&#10;https://t.me/group3"
                      className="w-full bg-slate-900/80 border border-slate-700/90 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-y"
                    />
                    <div className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1">
                      <span>📤</span>
                      <span>هذه المجموعات للإرسال فقط - المراقبة تشمل كامل الحساب تلقائياً.</span>
                    </div>
                  </div>
                )}

                {/* 5. كلمات المراقبة (اختيارية) */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    كلمات المراقبة (اختيارية - سطر لكل كلمة):
                  </label>
                  <textarea
                    rows={2}
                    value={watchWordsText}
                    onChange={e => setWatchWordsText(e.target.value)}
                    placeholder="بحث&#10;أكاديمي&#10;تحويل&#10;تنسيق"
                    className="w-full bg-slate-900/80 border border-slate-700/90 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-y"
                  />
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 space-y-1 mt-1.5">
                    <div className="text-amber-400 font-semibold">⚠️ المراقبة تشمل كامل المجموعات والمحادثات في الحساب</div>
                    <div>🔹 إذا حددت كلمات: سيتم التنبيه عند ورود هذه الكلمات فقط.</div>
                    <div>🔹 إذا تركتها فارغة: سيتم التنبيه لكل الرسائل الجديدة بدون استثناء.</div>
                  </div>
                </div>

                {/* 6. وضع الإرسال عند المجموعات المحمية (sanitizeMode) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      وضع الإرسال عند المجموعات المحمية:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSanitizeExplanation(!showSanitizeExplanation)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>شرح الأوضاع</span>
                      {showSanitizeExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <select
                    value={sanitizeMode}
                    onChange={e => setSanitizeMode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="salam">🤖 ذكي (salam) — أرسل "السلام عليكم" ثم عدّل عند النشاط ✅ افتراضي</option>
                    <option value="skip">⏭️ تخطي — لا ترسل للمجموعات المحمية</option>
                    <option value="smart">🧠 ذكية — ينقّي الرسالة (يحذف روابط/أرقام)</option>
                    <option value="always">🛡️ تنقية — أرسل مع حذف الروابط دائماً</option>
                    <option value="off">🚫 معطّل — أرسل كما هي (خطر حظر)</option>
                  </select>

                  {/* Collapsible Explanation Box */}
                  {showSanitizeExplanation && (
                    <div className="p-3.5 bg-slate-900/90 border border-slate-700 rounded-xl text-[11px] space-y-2 text-slate-300 animate-in fade-in">
                      <div>
                        <strong className="text-emerald-400">🤖 ذكي (salam):</strong> يرسل تحية طبيعية أولاً ثم يعدل الرسالة بذكاء عند تفاعل المجموعة لتفادي أي بوت حظر آلي.
                      </div>
                      <div>
                        <strong className="text-amber-400">⏭️ تخطي:</strong> يفحص المجموعة وإذا كانت مفعلة لميزات مكافحة الروابط يتم تخطيها تلقائياً.
                      </div>
                      <div>
                        <strong className="text-blue-400">🧠 ذكية:</strong> يزيل الروابط ومعرفات التليجرام وأرقام الهواتف ويبقي على النص الترويجي فقط.
                      </div>
                      <div>
                        <strong className="text-purple-400">🛡️ تنقية:</strong> يحذف الروابط دائماً في جميع الحالات.
                      </div>
                      <div>
                        <strong className="text-rose-400">🚫 معطّل:</strong> إرسال النص الأصلي بدون أي تعديل.
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. نوع الإرسال (يدوي / مجدول) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">نوع الإرسال:</label>
                    <select
                      value={sendType}
                      onChange={e => setSendType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="instant">يدوي (إرسال فوري الآن)</option>
                      <option value="scheduled">مجدول (تكرار تلقائي دوري)</option>
                    </select>
                  </div>

                  {sendType === 'scheduled' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">فترة الإرسال (بالدقائق):</label>
                      <input
                        type="number"
                        min={1}
                        value={intervalMinutes}
                        onChange={e => setIntervalMinutes(Number(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-400">الحد الأدنى دقيقة واحدة (الافتراضي 25)</span>
                    </div>
                  )}
                </div>

                {sendType === 'scheduled' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      مدة تشغيل الإرسال المجدول (بالساعات):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={durationHours}
                      onChange={e => setDurationHours(Number(e.target.value) || 0)}
                      className="w-full sm:w-48 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mr-2">0 = بدون حد زمني (يعمل باستمرار)</span>
                  </div>
                )}

                {/* Scheduled Status Bar */}
                {sendType === 'scheduled' && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>الحالة: {isScheduledRunning ? 'الجدولة تعمل حالياً' : 'الجدولة في وضع الاستعداد'}</span>
                    </div>
                    <button
                      onClick={() => setIsScheduledRunning(!isScheduledRunning)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                    >
                      {isScheduledRunning ? 'إيقاف مؤقت' : 'استئناف الإرسال'}
                    </button>
                  </div>
                )}

                {/* Action Buttons (Exact match) */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      حفظ الإعدادات
                    </button>

                    <button
                      type="button"
                      onClick={handleSendNow}
                      disabled={isSending}
                      className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isSending ? 'جاري الإرسال...' : 'إرسال الآن'}
                    </button>
                  </div>

                  {/* Monitoring Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartMonitoring}
                      disabled={isMonitoringActive}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      بدء المراقبة
                    </button>

                    <button
                      type="button"
                      onClick={handleStopMonitoring}
                      disabled={!isMonitoringActive}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      إيقاف المراقبة
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM FULL-WIDTH ROW: سجل العمليات (Operations Log) */}
        <div className="px-5 pb-5 pt-2">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
            
            {/* Log Header */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>سجل العمليات المباشر (Operations Log)</span>
                <span className="text-[10px] text-slate-400">({logs.length} سجل)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshLogs}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  تحديث
                </button>
                <button
                  onClick={handleClearLogs}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  مسح السجل
                </button>
              </div>
            </div>

            {/* Log Container */}
            <div className="p-3 max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
              {logs.length > 0 ? (
                logs.map(log => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span
                        className={`font-bold shrink-0 ${
                          log.status === 'success'
                            ? 'text-emerald-400'
                            : log.status === 'warning'
                            ? 'text-amber-400'
                            : log.status === 'error'
                            ? 'text-rose-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {log.title}
                      </span>
                      {log.details && <span className="text-slate-400 font-sans">{log.details}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-500 font-sans">
                  لا توجد عمليات مسجلة حتى الآن. ستظهر العمليات الحية فور تنفيذها.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#09101d] px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>منظومة تيليجرام المتطورة • إصدار الإرسال والمراقبة التلقائي</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>

      {/* Sub Modals */}
      {activeSubModal === 'learning' && (
        <LearningSystemModal onClose={() => setActiveSubModal(null)} />
      )}
      {activeSubModal === 'rotating' && (
        <RotatingBroadcastModal onClose={() => setActiveSubModal(null)} />
      )}
      {activeSubModal === 'links' && (
        <SavedLinksModal
          onClose={() => setActiveSubModal(null)}
          onSelectMessage={txt => setMessage(txt)}
        />
      )}
      {activeSubModal === 'join_adv' && (
        <AutoJoinModal initialTab="advanced" onClose={() => setActiveSubModal(null)} />
      )}
      {activeSubModal === 'join_instant' && (
        <AutoJoinModal initialTab="instant" onClose={() => setActiveSubModal(null)} />
      )}
      {activeSubModal === 'auto_replies' && (
        <AutoRepliesModal onClose={() => setActiveSubModal(null)} />
      )}
      {activeSubModal === 'accounts' && (
        <AccountsManagerModal onClose={() => setActiveSubModal(null)} />
      )}
    </div>
  );
}
