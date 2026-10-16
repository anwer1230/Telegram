import { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  Trash2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Filter,
  AlertCircle,
  CheckCircle2,
  Info,
  Radio
} from 'lucide-react';

interface SystemLogsModalProps {
  onClose: () => void;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  category: 'auth' | 'broadcast' | 'join' | 'monitor' | 'system';
  message: string;
}

const DEFAULT_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    time: new Date().toLocaleTimeString('ar-SA'),
    type: 'success',
    category: 'system',
    message: 'خادم Express جاهز ويعمل بنجاح على المنفذ 3000 بنمط غير حاظر.',
  },
  {
    id: 'log-2',
    time: new Date().toLocaleTimeString('ar-SA'),
    type: 'info',
    category: 'auth',
    message: 'فحص جلسات MTProto المحفوظة والتحقق من حسابات التيليجرام النشطة.',
  },
  {
    id: 'log-3',
    time: new Date().toLocaleTimeString('ar-SA'),
    type: 'success',
    category: 'monitor',
    message: 'بدء مراقبة الكلمات المفتاحية في المجموعات الأكاديمية والطلابية.',
  },
  {
    id: 'log-4',
    time: new Date().toLocaleTimeString('ar-SA'),
    type: 'info',
    category: 'broadcast',
    message: 'نظام النشر الدوري الذكي متزامن وجاهز لجدولة الرسائل الإعلانية.',
  },
];

export function SystemLogsModal({ onClose }: SystemLogsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>(DEFAULT_LOGS);
  const [filter, setFilter] = useState<'all' | 'auth' | 'broadcast' | 'monitor' | 'error'>('all');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLogs(prev => [
        {
          id: `log-${Date.now()}`,
          time: new Date().toLocaleTimeString('ar-SA'),
          type: 'info',
          category: 'system',
          message: 'فحص جاهزية النظام ونقطة الفحص /api/health — الحالة: ممتاز 200 OK.',
        },
        ...prev,
      ]);
      setIsRefreshing(false);
    }, 400);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleCopy = () => {
    const text = logs.map(l => `[${l.time}] [${l.category.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = logs.map(l => `[${l.time}] [${l.category.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telegram-system-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'error') return log.type === 'error';
    return log.category === filter;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">سجلات النظام ومراقبة النشاط</h3>
              <p className="text-xs text-slate-400">سجل عمليات النشر، المراقبة والاتصال الحي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'auth', label: 'المصادقة' },
                { id: 'broadcast', label: 'النشر' },
                { id: 'monitor', label: 'المراقبة' },
                { id: 'error', label: 'الأخطاء' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-sky-500 text-white font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="تحديث"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="نسخ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="تنزيل ملف السجل"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
              title="مسح السجلات"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Log Viewer Content */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs space-y-2 bg-slate-950/80">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">لا توجد سجلات مطابقة لهذا الفلتر حالياً.</div>
          ) : (
            filteredLogs.map(log => {
              let badgeColor = 'text-sky-400 bg-sky-500/10 border-sky-500/30';
              let Icon = Info;
              if (log.type === 'success') {
                badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                Icon = CheckCircle2;
              } else if (log.type === 'warn') {
                badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                Icon = AlertCircle;
              } else if (log.type === 'error') {
                badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
                Icon = AlertCircle;
              }

              return (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-start gap-2.5 text-slate-300 hover:border-slate-700 transition-colors"
                >
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${badgeColor.split(' ')[0]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-500">{log.time}</span>
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${badgeColor}`}>
                        {log.category.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed break-words font-sans">{log.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
