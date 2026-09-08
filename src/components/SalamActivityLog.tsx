import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Play,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { NotificationCenter } from '../core/NotificationCenter';
import { SalamActivityItem, SalamActivityStatus } from '../types';
import { useTelegram } from '../context/TelegramContext';
import { SalamActivityChart } from './SalamActivityChart';

interface SalamActivityLogProps {
  isOpen?: boolean;
  onClose?: () => void;
  compact?: boolean;
  filterChatId?: string | number;
}

const STORAGE_KEY = 'tg_salam_activity_logs_v2';

export const SalamActivityLog: React.FC<SalamActivityLogProps> = ({
  isOpen = true,
  onClose,
  compact = false,
  filterChatId,
}) => {
  const { setActiveChatId, setActiveModal, chats, showToast } = useTelegram();

  // Logs state
  const [activities, setActivities] = useState<SalamActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  // UI Filter and Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'edited' | 'deleted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.slice(0, 100)));
    } catch {}
  }, [activities]);

  // Fetch from server /api/salam_activities
  const fetchServerActivities = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/salam_activities');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.activities)) {
          setActivities((prev) => {
            const map = new Map<string, SalamActivityItem>();
            // Keep existing and overlay server items
            prev.forEach((item) => map.set(item.id, item));
            json.activities.forEach((item: SalamActivityItem) => map.set(item.id, item));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }
      }
    } catch (err) {
      console.warn('[SalamActivityLog] Failed fetching activities:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Subscribe to NotificationCenter real-time events
  useEffect(() => {
    fetchServerActivities();

    const handleNotification = (id: number | string, account: number, ...args: any[]) => {
      // 1. Direct Salam Activity item from Socket or Server
      if (id === NotificationCenter.salamActivityReceived) {
        const item: SalamActivityItem = args[0];
        if (item && item.id) {
          setActivities((prev) => {
            const next = [item, ...prev.filter((i) => i.id !== item.id)];
            return next.slice(0, 120);
          });
        }
        return;
      }

      // 2. Waiting Interval Started
      if (id === NotificationCenter.smartSenderWaitingIntervalStarted) {
        const chatId = args[0];
        const info = args[1] || {};
        const chatTitle = chats.find((c) => String(c.id) === String(chatId))?.title || `مجموعة ${chatId}`;
        const newItem: SalamActivityItem = {
          id: `salam_${chatId}_${Date.now()}`,
          chatId,
          chatTitle,
          greetingMsgId: info.initialGreetingMsgId,
          status: 'waiting_interaction',
          statusLabel: `في انتظار تفاعل الأعضاء (${info.durationSeconds || 30}ث)`,
          interactionCount: 0,
          requiredInteractions: info.requiredMessages || 3,
          remainingSeconds: info.durationSeconds || 30,
          totalWaitSeconds: info.durationSeconds || 30,
          timestamp: new Date().toISOString(),
          decision: 'pending',
          details: 'تم إرسال "السلام عليكم" وبدء مراقبة ردود الأعضاء لتحديد نشاط المجموعة.',
        };
        setActivities((prev) => [newItem, ...prev.filter((i) => i.chatId !== chatId)]);
      }

      // 3. Waiting Interval Progress / Countdown update
      if (id === NotificationCenter.smartSenderWaitingIntervalProgress) {
        const chatId = args[0];
        const count = args[1] || 0;
        const isActive = args[2];
        const remaining = args[3] || 0;
        const lastMsg = args[4];

        setActivities((prev) => {
          const index = prev.findIndex((i) => String(i.chatId) === String(chatId) && i.status === 'waiting_interaction');
          if (index !== -1) {
            const existing = prev[index];
            const updated: SalamActivityItem = {
              ...existing,
              interactionCount: count,
              remainingSeconds: remaining,
              status: count > existing.interactionCount ? 'interaction_detected' : existing.status,
              statusLabel:
                count >= existing.requiredInteractions
                  ? `اكتمل شرط النشاط (${count}/${existing.requiredInteractions})`
                  : `في انتظار التفاعل (${remaining}ث متبقية | ${count}/${existing.requiredInteractions})`,
              lastMessageSnippet: lastMsg?.message || existing.lastMessageSnippet,
              lastMessageSender: lastMsg?.fromId ? String(lastMsg.fromId) : existing.lastMessageSender,
              details: `تم رصد ${count} تفاعلات من الأعضاء في المجموعة.`,
            };
            const copy = [...prev];
            copy[index] = updated;
            return copy;
          }
          return prev;
        });
      }

      // 4. Interaction Recorded
      if (id === NotificationCenter.salamModeInteractionRecorded) {
        const chatId = args[0];
        const count = args[1] || 0;
        const msg = args[2];
        setActivities((prev) => {
          const index = prev.findIndex((i) => String(i.chatId) === String(chatId));
          if (index !== -1) {
            const existing = prev[index];
            const updated: SalamActivityItem = {
              ...existing,
              interactionCount: count,
              status: 'interaction_detected',
              statusLabel: `تم رصد تفاعل جديد (${count}/${existing.requiredInteractions})`,
              lastMessageSnippet: msg?.message ? String(msg.message).slice(0, 70) : existing.lastMessageSnippet,
              details: `رسالة واردة جديدة: "${(msg?.message || '').slice(0, 40)}"`,
            };
            const copy = [...prev];
            copy[index] = updated;
            return copy;
          }
          return prev;
        });
      }

      // 5. Decision Made (Edit or Delete)
      if (id === NotificationCenter.salamModeDecisionMade) {
        const chatId = args[0];
        const finalAction = args[1]; // 'edit' | 'delete'
        const count = args[2] || 0;
        const result = args[3] || {};

        setActivities((prev) => {
          const index = prev.findIndex((i) => String(i.chatId) === String(chatId));
          if (index !== -1) {
            const existing = prev[index];
            const isEdit = finalAction === 'edit';
            const updated: SalamActivityItem = {
              ...existing,
              status: isEdit ? 'message_edited' : 'message_deleted',
              statusLabel: isEdit ? 'تم تعديل الرسالة بنجاح ✍️' : 'تم حذف رسالة السلام تلقائياً 🗑️',
              interactionCount: count,
              remainingSeconds: 0,
              decision: finalAction,
              details: isEdit
                ? `المجموعة نشطة (${count} تفاعلات >= ${existing.requiredInteractions}). تم استبدال "السلام عليكم" بالرسالة الأصلية بنجاح.`
                : `المجموعة غير نشطة (${count}/${existing.requiredInteractions} تفاعلات). تم سحب الرسالة لتأمين الحساب وتفادي البوتات.`,
            };
            const copy = [...prev];
            copy[index] = updated;
            return copy;
          }
          return prev;
        });
      }
    };

    const nc = NotificationCenter.getGlobalInstance();
    nc.addObserver(handleNotification, NotificationCenter.smartSenderWaitingIntervalStarted);
    nc.addObserver(handleNotification, NotificationCenter.smartSenderWaitingIntervalProgress);
    nc.addObserver(handleNotification, NotificationCenter.salamModeInteractionRecorded);
    nc.addObserver(handleNotification, NotificationCenter.salamModeDecisionMade);
    nc.addObserver(handleNotification, NotificationCenter.salamActivityReceived);

    return () => {
      nc.removeObserver(handleNotification, NotificationCenter.smartSenderWaitingIntervalStarted);
      nc.removeObserver(handleNotification, NotificationCenter.smartSenderWaitingIntervalProgress);
      nc.removeObserver(handleNotification, NotificationCenter.salamModeInteractionRecorded);
      nc.removeObserver(handleNotification, NotificationCenter.salamModeDecisionMade);
      nc.removeObserver(handleNotification, NotificationCenter.salamActivityReceived);
    };
  }, [chats, fetchServerActivities]);

  // Statistics
  const stats = useMemo(() => {
    let waiting = 0;
    let edited = 0;
    let deleted = 0;
    activities.forEach((item) => {
      if (item.status === 'waiting_interaction' || item.status === 'greeting_sent' || item.status === 'interaction_detected') {
        waiting++;
      } else if (item.status === 'message_edited' || item.decision === 'edit') {
        edited++;
      } else if (item.status === 'message_deleted' || item.decision === 'delete') {
        deleted++;
      }
    });
    return {
      total: activities.length,
      waiting,
      edited,
      deleted,
    };
  }, [activities]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      if (filterChatId && String(item.chatId) !== String(filterChatId)) {
        return false;
      }
      if (statusFilter === 'waiting') {
        const isWaiting = item.status === 'waiting_interaction' || item.status === 'greeting_sent' || item.status === 'interaction_detected';
        if (!isWaiting) return false;
      } else if (statusFilter === 'edited') {
        if (item.status !== 'message_edited' && item.decision !== 'edit') return false;
      } else if (statusFilter === 'deleted') {
        if (item.status !== 'message_deleted' && item.decision !== 'delete') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.chatTitle || '').toLowerCase().includes(q);
        const idMatch = String(item.chatId).toLowerCase().includes(q);
        const detailsMatch = (item.details || '').toLowerCase().includes(q);
        return titleMatch || idMatch || detailsMatch;
      }

      return true;
    });
  }, [activities, filterChatId, statusFilter, searchQuery]);

  // Clear logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/salam_activities/clear', { method: 'POST' }).catch(() => {});
    } catch {}
    setActivities([]);
    localStorage.removeItem(STORAGE_KEY);
    showToast('تم مسح سجل نشاط السلام بنجاح', '🗑️');
  };

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy details
  const handleCopyLog = (item: SalamActivityItem) => {
    const text = `[Salam Mode Log]
المجموعة: ${item.chatTitle || item.chatId} (${item.chatId})
الحالة: ${item.statusLabel}
التفاعلات المرصودة: ${item.interactionCount} / ${item.requiredInteractions}
معرف رسالة السلام: ${item.greetingMsgId || 'غير متوفر'}
القرار: ${item.decision || item.status}
التفاصيل: ${item.details || 'لا توجد تفاصيل'}
التاريخ والوقت: ${new Date(item.timestamp).toLocaleString('ar-EG')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast('تم نسخ تفاصيل السجل للحافظة', '📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simulation runner to demonstrate the real-time status in UI
  const handleRunSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const simId1 = `sim_active_${Date.now()}`;
    const simId2 = `sim_inactive_${Date.now()}`;

    // Item 1: Active group (will get edited)
    const activeItem: SalamActivityItem = {
      id: simId1,
      chatId: '-1001889201923',
      chatTitle: 'مجموعة المطورين والتقنية (نشطة)',
      greetingMsgId: Math.floor(1000 + Math.random() * 9000),
      status: 'greeting_sent',
      statusLabel: 'تم إرسال السلام كتمويه أولي 🚀',
      interactionCount: 0,
      requiredInteractions: 3,
      remainingSeconds: 30,
      totalWaitSeconds: 30,
      originalText: '🔥 عرض خاص لجميع خدمات البرمجة والتطوير السحابي',
      details: 'تم إرسال "السلام عليكم" وبدء عداد الـ 30 ثانية الذكي.',
      timestamp: new Date().toISOString(),
      decision: 'pending',
    };

    // Item 2: Inactive group (will get deleted)
    const inactiveItem: SalamActivityItem = {
      id: simId2,
      chatId: '-1001992019481',
      chatTitle: 'جروب الإعلانات العامة (صامتة)',
      greetingMsgId: Math.floor(1000 + Math.random() * 9000),
      status: 'greeting_sent',
      statusLabel: 'تم إرسال السلام كتمويه أولي 🚀',
      interactionCount: 0,
      requiredInteractions: 3,
      remainingSeconds: 30,
      totalWaitSeconds: 30,
      originalText: '📢 إعلان حصري لفرص العمل والتوظيف',
      details: 'تم إرسال "السلام عليكم" وبدء مراقبة الصمت.',
      timestamp: new Date().toISOString(),
      decision: 'pending',
    };

    setActivities((prev) => [activeItem, inactiveItem, ...prev]);
    showToast('🚀 بدأت محاكاة تجريبية حية لوضع السلام (مجموعتان)', '🧪');

    // Simulate Step 1: waiting after 1s
    setTimeout(() => {
      setActivities((prev) =>
        prev.map((i) =>
          i.id === simId1 || i.id === simId2
            ? {
                ...i,
                status: 'waiting_interaction',
                statusLabel: 'في انتظار تفاعل الأعضاء (28ث متبقية)',
                remainingSeconds: 28,
              }
            : i
        )
      );
    }, 1500);

    // Simulate Step 2: Message 1 in active group after 3s
    setTimeout(() => {
      setActivities((prev) =>
        prev.map((i) =>
          i.id === simId1
            ? {
                ...i,
                status: 'interaction_detected',
                statusLabel: 'تفاعل جديد (1/3) ⚡',
                interactionCount: 1,
                remainingSeconds: 24,
                lastMessageSender: 'أحمد علي',
                lastMessageSnippet: 'وعليكم السلام ورحمة الله، مرحباً بك',
                details: 'أحمد علي: "وعليكم السلام ورحمة الله، مرحباً بك"',
              }
            : i.id === simId2
            ? { ...i, remainingSeconds: 24, statusLabel: 'في انتظار تفاعل الأعضاء (24ث متبقية)' }
            : i
        )
      );
    }, 3500);

    // Simulate Step 3: Message 2 in active group after 5s
    setTimeout(() => {
      setActivities((prev) =>
        prev.map((i) =>
          i.id === simId1
            ? {
                ...i,
                status: 'interaction_detected',
                statusLabel: 'تفاعل جديد (2/3) ⚡',
                interactionCount: 2,
                remainingSeconds: 18,
                lastMessageSender: 'خالد محمد',
                lastMessageSnippet: 'أهلاً وسهلاً، كيف نقدر نساعدك؟',
                details: 'خالد محمد: "أهلاً وسهلاً، كيف نقدر نساعدك؟"',
              }
            : i.id === simId2
            ? { ...i, remainingSeconds: 18, statusLabel: 'في انتظار تفاعل الأعضاء (18ث متبقية)' }
            : i
        )
      );
    }, 5500);

    // Simulate Step 4: Message 3 in active group -> THRESHOLD REACHED -> EDIT!
    setTimeout(() => {
      setActivities((prev) =>
        prev.map((i) =>
          i.id === simId1
            ? {
                ...i,
                status: 'message_edited',
                statusLabel: 'تم تعديل الرسالة بنجاح ✍️ (نشطة)',
                interactionCount: 3,
                remainingSeconds: 0,
                decision: 'edit',
                lastMessageSender: 'سارة التقنية',
                lastMessageSnippet: 'تفضل شاركنا استفسارك يا غالي',
                details: 'المجموعة نشطة جداً (3 تفاعلات موثقة). تم تعديل "السلام عليكم" إلى الإعلان الأصلي بنجاح!',
              }
            : i
        )
      );
      showToast('✍️ تم تعديل رسالة السلام في المجموعة النشطة بنجاح', '✅');
    }, 7500);

    // Simulate Step 5: Inactive group countdown ends -> NO INTERACTIONS -> DELETE!
    setTimeout(() => {
      setActivities((prev) =>
        prev.map((i) =>
          i.id === simId2
            ? {
                ...i,
                status: 'message_deleted',
                statusLabel: 'تم حذف رسالة السلام تلقائياً 🗑️ (خاملة)',
                interactionCount: 0,
                remainingSeconds: 0,
                decision: 'delete',
                details: 'لم يرد أي تفاعل خلال فترة الانتظار (0/3). تم حذف الرسالة لحماية حسابك من الإبلاغات أو رصد البوتات.',
              }
            : i
        )
      );
      showToast('🗑️ تم سحب رسالة السلام في المجموعة الصامتة لتأمين الحساب', '🛡️');
      setIsSimulating(false);
    }, 9500);
  };

  if (!isOpen) return null;

  const content = (
    <div className={`flex flex-col h-full bg-[#0e1621] text-white select-none ${compact ? 'p-3' : 'p-4 sm:p-5'}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-[0.95rem] sm:text-base font-bold text-white m-0 flex items-center gap-1.5">
                <span>سجل نشاط وضع السلام</span>
                <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  مباشر وشفاف 100%
                </span>
              </h5>
            </div>
            <p className="text-[0.7rem] text-gray-400 m-0 mt-0.5">
              رصد فوري لرسائل "السلام عليكم"، تفاعلات الأعضاء، وقرار التعديل أو الحذف التلقائي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveModal('telemetry-log')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="فتح سجل بيانات القياس وتشخيص المزامنة (Telemetry Logs)"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="hidden sm:inline">سجل القياس والمزامنة</span>
          </button>
          <button
            type="button"
            onClick={fetchServerActivities}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all active:scale-95"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 shrink-0">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[0.65rem] text-gray-400 block truncate">إجمالي العمليات</span>
            <span className="text-sm sm:text-base font-bold text-white">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-4 h-4 animate-spin" />
          </div>
          <div className="min-w-0">
            <span className="text-[0.65rem] text-amber-300/80 block truncate">قيد المراقبة (30ث)</span>
            <span className="text-sm sm:text-base font-bold text-amber-300">{stats.waiting}</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[0.65rem] text-emerald-300/80 block truncate">تم تعديلها (نشطة)</span>
            <span className="text-sm sm:text-base font-bold text-emerald-300">{stats.edited}</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-rose-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[0.65rem] text-rose-300/80 block truncate">تم حذفها (تأمين)</span>
            <span className="text-sm sm:text-base font-bold text-rose-300">{stats.deleted}</span>
          </div>
        </div>
      </div>

      {/* Daily User Activity Interactive Recharts Chart */}
      <SalamActivityChart activities={activities} />

      {/* Action Bar: Search, Filters, Live Simulation & Clear */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المجموعة أو معرف الدردشة..."
            className="w-full bg-black/40 border border-white/10 rounded-lg pr-8 pl-3 py-1.5 text-[0.75rem] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-medium whitespace-nowrap transition-all border ${
              statusFilter === 'all'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            الكل ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('waiting')}
            className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-medium whitespace-nowrap transition-all border ${
              statusFilter === 'waiting'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            ⏳ قيد الانتظار ({stats.waiting})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('edited')}
            className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-medium whitespace-nowrap transition-all border ${
              statusFilter === 'edited'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            ✍️ تم التعديل ({stats.edited})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('deleted')}
            className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-medium whitespace-nowrap transition-all border ${
              statusFilter === 'deleted'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            🗑️ تم الحذف ({stats.deleted})
          </button>
        </div>

        {/* Buttons: Simulation & Clear */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-lg text-[0.7rem] font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 flex items-center gap-1 transition-all active:scale-95 shadow-sm"
            title="تجربة تفاعلية لمحاكاة مجموعتين (واحدة نشطة والأخرى خاملة)"
          >
            <Sparkles className="w-3 h-3 text-amber-950" />
            <span>{isSimulating ? 'جاري الفحص...' : 'فحص تجريبي حي'}</span>
          </button>

          {activities.length > 0 && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[0.7rem] transition-all"
              title="مسح السجل"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Activity Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-0.5">
        {filteredActivities.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h6 className="text-[0.85rem] font-bold text-white mb-1">لا توجد سجلات نشاط حالياً</h6>
            <p className="text-[0.72rem] text-gray-400 max-w-sm m-0 mb-3">
              يتم تسجيل أنشطة وضع السلام تلقائياً فور بدء إرسال الحملات الذكية، أو يمكنك تشغيل فحص تجريبي حي الآن.
            </p>
            <button
              type="button"
              onClick={handleRunSimulation}
              className="px-3.5 py-1.5 rounded-lg text-[0.75rem] font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تشغيل محاكاة تجريبية حية الآن</span>
            </button>
          </div>
        ) : (
          filteredActivities.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const isWaiting =
              item.status === 'waiting_interaction' ||
              item.status === 'greeting_sent' ||
              item.status === 'interaction_detected';
            const isEdited = item.status === 'message_edited' || item.decision === 'edit';
            const isDeleted = item.status === 'message_deleted' || item.decision === 'delete';

            // Progress percentage
            const required = item.requiredInteractions || 3;
            const current = item.interactionCount || 0;
            const progressPct = Math.min(100, Math.round((current / required) * 100));

            return (
              <div
                key={item.id}
                className={`bg-white/[0.03] hover:bg-white/[0.05] border rounded-xl p-3 sm:p-3.5 transition-all shadow-sm ${
                  isWaiting
                    ? 'border-amber-500/30 bg-amber-500/[0.02]'
                    : isEdited
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                    : isDeleted
                    ? 'border-rose-500/30 bg-rose-500/[0.02]'
                    : 'border-white/10'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[0.82rem] font-bold text-white truncate max-w-[260px] sm:max-w-md">
                        {item.chatTitle || `المجموعة (${item.chatId})`}
                      </span>
                      <span className="text-[0.62rem] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                        {item.chatId}
                      </span>
                    </div>

                    {/* Status Badge & Time */}
                    <div className="flex items-center gap-2 flex-wrap text-[0.7rem]">
                      {isWaiting && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>في انتظار التفاعل ({item.remainingSeconds}ث متبقية)</span>
                        </span>
                      )}
                      {isEdited && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>تم تعديل الرسالة بنجاح (المجموعة نشطة)</span>
                        </span>
                      )}
                      {isDeleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                          <ShieldAlert className="w-3 h-3" />
                          <span>تم حذف رسالة السلام تلقائياً (حماية الحساب)</span>
                        </span>
                      )}

                      <span className="text-[0.65rem] text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLog(item)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="نسخ السجل"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="تفاصيل أكثر"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 3-Stage Workflow Stepper */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] grid grid-cols-3 gap-1.5 text-center">
                  {/* Step 1: Greeting Sent */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-1.5 flex flex-col items-center">
                    <span className="text-[0.62rem] text-gray-400">1. إرسال السلام</span>
                    <span className="text-[0.7rem] font-bold text-cyan-300 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3 text-cyan-400" />
                      <span>تم الإرسال</span>
                    </span>
                    {item.greetingMsgId && (
                      <span className="text-[0.58rem] text-gray-500 font-mono mt-0.5">
                        ID: {item.greetingMsgId}
                      </span>
                    )}
                  </div>

                  {/* Step 2: Waiting & Monitoring */}
                  <div
                    className={`border rounded-lg p-1.5 flex flex-col items-center ${
                      isWaiting
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <span className="text-[0.62rem] text-gray-400">2. رصد التفاعل</span>
                    <span
                      className={`text-[0.7rem] font-bold mt-0.5 ${
                        isWaiting ? 'text-amber-300' : 'text-gray-200'
                      }`}
                    >
                      {current} / {required} تفاعلات
                    </span>
                    <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-500 ${
                          current >= required ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Step 3: Final Decision (Edit or Delete) */}
                  <div
                    className={`border rounded-lg p-1.5 flex flex-col items-center ${
                      isEdited
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isDeleted
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <span className="text-[0.62rem] text-gray-400">3. القرار الذكي</span>
                    {isWaiting ? (
                      <span className="text-[0.68rem] text-amber-300/80 mt-0.5">قيد الانتظار...</span>
                    ) : isEdited ? (
                      <span className="text-[0.7rem] font-bold text-emerald-300 flex items-center gap-1 mt-0.5">
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل للمنشور</span>
                      </span>
                    ) : isDeleted ? (
                      <span className="text-[0.7rem] font-bold text-rose-300 flex items-center gap-1 mt-0.5">
                        <Trash2 className="w-3 h-3" />
                        <span>حذف السلام</span>
                      </span>
                    ) : (
                      <span className="text-[0.68rem] text-gray-400 mt-0.5">معلق</span>
                    )}
                  </div>
                </div>

                {/* Status Explanation Details */}
                <div className="mt-2.5 p-2 rounded-lg bg-black/30 border border-white/5 text-[0.72rem] leading-relaxed text-gray-300 flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {isWaiting && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                    {isEdited && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    {isDeleted && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                    {!isWaiting && !isEdited && !isDeleted && <Radio className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="m-0 font-medium">{item.details || item.statusLabel}</p>
                    {item.lastMessageSnippet && (
                      <div className="mt-1 pt-1 border-t border-white/5 text-[0.68rem] text-cyan-200/90">
                        💬 آخر رسالة رُصدت: {item.lastMessageSender ? `(${item.lastMessageSender}): ` : ''}
                        "{item.lastMessageSnippet}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Audit Log */}
                {isExpanded && (
                  <div className="mt-2.5 p-2.5 bg-black/50 border border-white/10 rounded-xl space-y-2 text-[0.7rem]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
                      <div>
                        <strong className="text-gray-400">معرف رسالة السلام:</strong>{' '}
                        <span className="font-mono text-cyan-300">{item.greetingMsgId || 'غير محدد'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-400">مدة المراقبة:</strong>{' '}
                        <span>{item.totalWaitSeconds || 30} ثانية</span>
                      </div>
                      <div>
                        <strong className="text-gray-400">الحد الأدنى للتفاعل:</strong>{' '}
                        <span>{item.requiredInteractions || 3} رسائل من الأعضاء</span>
                      </div>
                      <div>
                        <strong className="text-gray-400">النتيجة النهائية:</strong>{' '}
                        <span
                          className={`font-bold ${
                            isEdited ? 'text-emerald-300' : isDeleted ? 'text-rose-300' : 'text-amber-300'
                          }`}
                        >
                          {isEdited
                            ? 'المجموعة نشطة -> تم التعديل الفعلي'
                            : isDeleted
                            ? 'المجموعة خاملة -> تم الحذف لحماية الحساب'
                            : 'قيد الانتظار'}
                        </span>
                      </div>
                    </div>

                    {item.originalText && (
                      <div className="pt-1.5 border-t border-white/10">
                        <span className="text-gray-400 font-bold block mb-0.5">نص المنشور الأصلي المستهدف:</span>
                        <div className="bg-black/40 border border-white/5 p-2 rounded text-gray-200 font-sans text-[0.68rem] whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {item.originalText}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChatId(String(item.chatId));
                          if (onClose) onClose();
                        }}
                        className="text-[0.68rem] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                      >
                        <span>فتح المجموعة في التطبيق</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // If compact mode, return content directly
  if (compact) {
    return content;
  }

  // Full Modal presentation
  return (
    <div
      id="salam-activity-log-modal"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[85vh] max-h-[780px] bg-[#0e1621] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
};

export default SalamActivityLog;
