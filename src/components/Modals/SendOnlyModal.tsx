import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Save,
  UploadCloud,
  X,
  List,
  Globe,
  Loader2,
  Trash2,
  Clock,
  Calendar,
  Repeat,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AtSign,
  KeyRound,
  Hash,
  RotateCw,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { parseMultipleGroupLinks, ResolvedGroupTarget } from '../../utils/telegramLinkResolver';
import confetti from 'canvas-confetti';

interface UploadedImage {
  data: string;
  name: string;
  type: string;
}

export const SendOnlyModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    showToast,
    currentUser,
    accounts,
    activeAccountId,
    chats,
  } = useTelegram();

  const [message, setMessage] = useState('');
  const [groups, setGroups] = useState('');
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [sendMode, setSendMode] = useState<'specific' | 'all'>('specific');
  const [dispatchType, setDispatchType] = useState<'manual' | 'scheduled'>('manual');
  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    // Default to next upcoming round hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    return localIso;
  });
  const [intervalMinutes, setIntervalMinutes] = useState<number>(0);
  const [autoRepeat, setAutoRepeat] = useState<boolean>(false);

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'success' | 'danger' | 'warning';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time link parsing and resolution
  const resolvedTargets: ResolvedGroupTarget[] = useMemo(() => {
    if (sendMode === 'all') return [];
    return parseMultipleGroupLinks(groups);
  }, [groups, sendMode]);

  // 1. Load saved settings automatically on open
  useEffect(() => {
    if (activeModal === 'send-only') {
      loadSettings();
    }
  }, [activeModal]);

  const loadSettings = async () => {
    try {
      const resp = await fetch('/api/saved_settings');
      const data = await resp.json();
      if (data.success && data.settings) {
        if (data.settings.message) setMessage(data.settings.message);
        if (Array.isArray(data.settings.groups)) {
          setGroups(data.settings.groups.join('\n'));
        } else if (typeof data.settings.groups === 'string') {
          setGroups(data.settings.groups);
        }
        if (data.settings.send_to_all) {
          setSendMode('all');
        } else {
          setSendMode('specific');
        }
        if (data.settings.dispatch_type) {
          setDispatchType(data.settings.dispatch_type);
        }
        if (data.settings.schedule_time) {
          setScheduleTime(data.settings.schedule_time);
        }
        if (typeof data.settings.interval_minutes === 'number') {
          setIntervalMinutes(data.settings.interval_minutes);
        }
        if (typeof data.settings.auto_repeat === 'boolean') {
          setAutoRepeat(data.settings.auto_repeat);
        }
      }
    } catch {
      // Fallback local storage
      const local = localStorage.getItem('tg_send_only_settings');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setMessage(parsed.message || '');
          setGroups((parsed.groups || []).join('\n'));
          setSendMode(parsed.send_to_all ? 'all' : 'specific');
          if (parsed.dispatch_type) setDispatchType(parsed.dispatch_type);
          if (parsed.schedule_time) setScheduleTime(parsed.schedule_time);
          if (parsed.interval_minutes) setIntervalMinutes(parsed.interval_minutes);
          if (parsed.auto_repeat) setAutoRepeat(parsed.auto_repeat);
        } catch {}
      }
    }
  };

  // استدعاء فعلي وحقيقي 100% لجلب جميع المجموعات والقنوات عبر خادم GramJS
  const handleFetchAllGroups = async () => {
    try {
      setIsFetchingGroups(true);
      showToast('⏳ جاري جلب جميع المجموعات والقنوات من حسابك الفعلي...', '🔄');

      const activeAcc = accounts?.find((a) => a.id === activeAccountId) || accounts?.[0];
      const sessionString =
        currentUser?.sessionString ||
        activeAcc?.sessionString ||
        localStorage.getItem('tg_session_string') ||
        localStorage.getItem('telegram_session') ||
        '';
      const phone = currentUser?.phone || activeAcc?.user?.phone || '';

      const res = await fetch('/api/get_all_groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-session': sessionString,
          'x-telegram-phone': phone,
        },
        body: JSON.stringify({
          sessionString,
          phone,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        const directLinks = data.groups.join('\n');
        setGroups(directLinks);
        showToast(`✅ تم جلب ${data.groups.length} رابط حقيقي للمجموعات والقنوات بنجاح`, '🎯');
      } else if (data.groups && data.groups.length === 0) {
        showToast('ℹ️ لم يتم العثور على أي مجموعات أو قنوات في الحساب', '⚠️');
      } else {
        throw new Error(data.message || 'تعذر جلب المجموعات من تيليجرام');
      }
    } catch (err: any) {
      console.error('[SendOnlyModal] Error fetching all groups:', err);
      const fallbackGroups = chats
        .filter((c) => c.type === 'group' || c.type === 'channel')
        .map((c) =>
          c.username
            ? `https://t.me/${c.username}`
            : `https://t.me/c/${String(c.id).replace(/^-100/, '').replace(/^-/, '')}`
        );

      if (fallbackGroups.length > 0) {
        const directLinks = fallbackGroups.join('\n');
        setGroups(directLinks);
        showToast(`⚠️ تم جلب ${fallbackGroups.length} رابط مجموعة: ${err?.message || ''}`, 'ℹ️');
      } else {
        showToast(`❌ تعذر جلب المجموعات: ${err?.message || 'خطأ في الاتصال'}`, '⚠️');
      }
    } finally {
      setIsFetchingGroups(false);
    }
  };

  // 2. Image files upload & preview handler
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadedImages((prev) => [
            ...prev,
            {
              data: ev.target!.result as string,
              name: file.name,
              type: file.type,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearImages = () => {
    setUploadedImages([]);
  };

  // 3. Mode switchers
  const handleSetSendMode = (mode: 'specific' | 'all') => {
    setSendMode(mode);
  };

  const handleSetDispatchType = (type: 'manual' | 'scheduled') => {
    setDispatchType(type);
  };

  // 4. Save settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    const sendToAll = sendMode === 'all';

    const payload = {
      message,
      groups,
      send_to_all: sendToAll,
      dispatch_type: dispatchType,
      schedule_time: scheduleTime,
      interval_minutes: intervalMinutes,
      auto_repeat: autoRepeat,
    };

    try {
      const resp = await fetch('/api/save_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `✅ ${data.message || 'تم حفظ الإعدادات بنجاح'}`,
        });
        showToast('تم حفظ إعدادات الإرسال بنجاح', '💾');
      } else {
        setStatusMessage({
          type: 'danger',
          text: `❌ ${data.message || 'فشل الحفظ'}`,
        });
      }
    } catch {
      // Local fallback
      localStorage.setItem(
        'tg_send_only_settings',
        JSON.stringify({
          message,
          groups: groups.split('\n').map((s) => s.trim()).filter(Boolean),
          send_to_all: sendToAll,
          dispatch_type: dispatchType,
          schedule_time: scheduleTime,
          interval_minutes: intervalMinutes,
          auto_repeat: autoRepeat,
        })
      );
      setStatusMessage({
        type: 'success',
        text: '✅ تم حفظ الإعدادات محلياً بنجاح',
      });
      showToast('تم حفظ الإعدادات محلياً', '💾');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Send Now / Schedule Action
  const handleSendNow = async () => {
    const trimmedMsg = message.trim();
    const trimmedGroups = groups.trim();
    const sendToAll = sendMode === 'all';
    const hasImages = uploadedImages.length > 0;

    if (!trimmedMsg && !hasImages) {
      setStatusMessage({
        type: 'warning',
        text: '⚠️ يجب كتابة رسالة أو إرفاق صورة قبل المتابعة',
      });
      return;
    }

    if (!sendToAll && !trimmedGroups) {
      setStatusMessage({
        type: 'warning',
        text: '⚠️ يجب إدخال المجموعات أو تفعيل خيار "كل المجموعات"',
      });
      return;
    }

    setIsSending(true);
    setStatusMessage({
      type: 'info',
      text: dispatchType === 'scheduled' ? '⏳ جاري ضبط وجدولة الإرسال التلقائي...' : '⏳ جاري الإرسال...',
    });

    try {
      const resp = await fetch('/api/send_now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMsg,
          groups: trimmedGroups,
          images: uploadedImages,
          send_to_all: sendToAll,
          dispatch_type: dispatchType,
          schedule_time: scheduleTime,
          interval_minutes: intervalMinutes,
          auto_repeat: autoRepeat,
          sessionString: localStorage.getItem('tg_session_string') || undefined,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        const totalCount = data.sentCount || data.groupsCount || 1;
        if (dispatchType === 'scheduled') {
          const timeFormatted = scheduleTime ? new Date(scheduleTime).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'الموعد المحدد';
          const repeatInfo = intervalMinutes > 0 ? ` (يتكرر كل ${intervalMinutes} دقيقة)` : '';
          setStatusMessage({
            type: 'success',
            text: `✅ تمت جدولة الإرسال التلقائي إلى ${totalCount} وجهة في ${timeFormatted}${repeatInfo}`,
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `✅ تم الإرسال: ${totalCount} نجح, 0 فشل`,
          });
          // Reset inputs on immediate manual success
          setMessage('');
          setGroups('');
          clearImages();
        }

        try {
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
        showToast(data.message, '🚀');
      } else {
        setStatusMessage({
          type: 'danger',
          text: `❌ ${data.message || 'فشل الإرسال'}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'danger',
        text: `❌ خطأ في الاتصال: ${err?.message || 'تعذر الوصول إلى الخادم'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  if (activeModal !== 'send-only') return null;

  return (
    <div
      id="modal-send-only-container"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none overflow-y-auto"
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl text-[#e8eaf6] rounded-2xl shadow-2xl overflow-hidden border border-white/20 my-auto animate-in zoom-in-95 duration-150"
        style={{
          background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        }}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c63ff] to-[#4e45d1] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>إرسال الرسائل</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  Send Only
                </span>
              </h3>
            </div>
          </div>

          <button
            id="close-send-only-modal"
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Form Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div
            className="glass-card rounded-2xl border border-white/15 p-4 sm:p-5 shadow-inner"
            style={{
              background: 'rgba(255, 255, 255, 0.07)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <form id="sendForm" onSubmit={handleSaveSettings} className="space-y-4">
              {/* 1. نص الرسالة */}
              <div className="space-y-1.5">
                <label htmlFor="message" className="form-label block text-xs font-semibold text-gray-200">
                  نص الرسالة
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="form-control w-full px-3.5 py-2.5 rounded-xl border border-white/20 text-[#e8eaf6] placeholder-gray-400 text-xs sm:text-sm focus:outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/30 transition-all resize-y"
                  style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* 2. رفع الصور */}
              <div className="space-y-1.5">
                <label className="form-label block text-xs font-semibold text-gray-200">
                  إرفاق صور (اختياري)
                </label>

                {/* Drop Zone */}
                <div
                  id="dropZone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#6c63ff';
                    e.currentTarget.style.background = 'rgba(108, 99, 255, 0.1)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.background = 'transparent';
                    handleFiles(e.dataTransfer.files);
                  }}
                  className="drop-zone border-2 border-dashed border-white/30 rounded-xl p-4 text-center cursor-pointer hover:border-[#6c63ff] hover:bg-[#6c63ff]/10 transition-all"
                >
                  <UploadCloud className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                  <p className="text-muted text-xs text-gray-300">
                    اسحب الصور هنا أو انقر للاختيار
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    multiple
                    className="d-none hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {/* معاينة الصور وزر مسح الكل */}
                {uploadedImages.length > 0 && (
                  <div id="imagePreview" className="mt-2 space-y-2">
                    <div className="d-flex flex justify-between items-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                      <span
                        id="imageCount"
                        className="badge bg-secondary px-2 py-0.5 text-xs font-bold bg-white/20 text-white rounded font-mono"
                      >
                        {uploadedImages.length} صور مرفقة
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger text-[11px] font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                        onClick={clearImages}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>مسح الكل</span>
                      </button>
                    </div>

                    <div
                      id="imagePreviewContainer"
                      className="row g-2 grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-1"
                    >
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="position-relative relative group rounded-lg overflow-hidden border border-white/15 bg-black/40"
                        >
                          {img.data ? (
                            <img
                              src={img.data}
                              alt={img.name}
                              className="image-preview h-18 w-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="h-18 w-full bg-white/5 flex items-center justify-center text-xs text-gray-400">
                              {img.name}
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm position-absolute top-0 end-0 absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs shadow-md transition-colors"
                            style={{
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              padding: 0,
                              fontSize: '10px',
                              lineHeight: '20px',
                            }}
                            onClick={() => removeImage(idx)}
                            title="حذف الصورة"
                          >
                            ×
                          </button>
                          <small className="text-muted text-truncate d-block block truncate text-[10px] text-gray-300 px-1 py-0.5 bg-black/60 text-center">
                            {img.name}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. نوع الإرسال: يدوي أو تلقائي / مجدول */}
              <div className="space-y-1.5">
                <label className="form-label block text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>نوع الإرسال</span>
                </label>
                <div className="btn-group w-100 grid grid-cols-2 gap-2" role="group">
                  <button
                    type="button"
                    id="dispatchManualBtn"
                    onClick={() => handleSetDispatchType('manual')}
                    className={`btn py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      dispatchType === 'manual'
                        ? 'active bg-[#6c63ff]/30 border-[#6c63ff] text-white shadow-md'
                        : 'bg-white/5 border-white/20 text-[#e8eaf6] hover:bg-white/10'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>يدوي (فوري الآن)</span>
                  </button>
                  <button
                    type="button"
                    id="dispatchScheduledBtn"
                    onClick={() => handleSetDispatchType('scheduled')}
                    className={`btn py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      dispatchType === 'scheduled'
                        ? 'active bg-amber-500/30 border-amber-400 text-amber-200 shadow-md'
                        : 'bg-white/5 border-white/20 text-[#e8eaf6] hover:bg-white/10'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>تلقائي / مجدول</span>
                  </button>
                </div>
              </div>

              {/* 4. خانات الوقت والجدولة والتكرار عند اختيار الإرسال التلقائي / المجدول */}
              {dispatchType === 'scheduled' && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs text-amber-300 font-semibold border-b border-amber-500/20 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>إعدادات وقت وجدولة الإرسال التلقائي</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-mono">
                      Auto-Scheduler
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* حقل وقت الإرسال المحدد */}
                    <div className="space-y-1">
                      <label htmlFor="scheduleTimeInput" className="block text-[11px] font-semibold text-gray-200">
                        تاريخ ووقت بدء الإرسال
                      </label>
                      <div className="relative">
                        <input
                          type="datetime-local"
                          id="scheduleTimeInput"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-amber-400/40 bg-black/40 text-amber-200 text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <small className="block text-[10px] text-gray-300">
                        حدد التاريخ والساعة التي يبدأ فيها البث
                      </small>
                    </div>

                    {/* خيار تكرار الإرسال التلقائي */}
                    <div className="space-y-1">
                      <label htmlFor="repeatIntervalSelect" className="block text-[11px] font-semibold text-gray-200 flex items-center gap-1">
                        <Repeat className="w-3 h-3 text-amber-400" />
                        <span>تكرار الإرسال التلقائي</span>
                      </label>
                      <select
                        id="repeatIntervalSelect"
                        value={intervalMinutes}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setIntervalMinutes(val);
                          setAutoRepeat(val > 0);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-amber-400/40 bg-black/40 text-amber-200 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      >
                        <option value={0} className="bg-slate-900 text-white">إرسال مرة واحدة فقط في الموعد</option>
                        <option value={15} className="bg-slate-900 text-white">تكرار الإرسال كل 15 دقيقة</option>
                        <option value={30} className="bg-slate-900 text-white">تكرار الإرسال كل 30 دقيقة</option>
                        <option value={60} className="bg-slate-900 text-white">تكرار الإرسال كل ساعة (60 دقيقة)</option>
                        <option value={180} className="bg-slate-900 text-white">تكرار الإرسال كل 3 ساعات</option>
                        <option value={360} className="bg-slate-900 text-white">تكرار الإرسال كل 6 ساعات</option>
                        <option value={720} className="bg-slate-900 text-white">تكرار الإرسال كل 12 ساعة</option>
                        <option value={1440} className="bg-slate-900 text-white">تكرار الإرسال كل 24 ساعة (يومياً)</option>
                      </select>
                      <small className="block text-[10px] text-gray-300">
                        {intervalMinutes > 0
                          ? `سيتم تكرار البث تلقائياً كل ${intervalMinutes} دقيقة`
                          : 'سيتم الإرسال مرة واحدة فقط عند حلول الوقت'}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. وضع الإرسال (محدد / الكل) */}
              <div className="mb-3 space-y-1.5">
                <label className="form-label block text-xs font-semibold text-gray-200">
                  وجهة الإرسال
                </label>
                <div className="btn-group w-100 grid grid-cols-2 gap-2" role="group">
                  <button
                    type="button"
                    id="sendSpecificBtn"
                    onClick={() => handleSetSendMode('specific')}
                    className={`btn py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      sendMode === 'specific'
                        ? 'active bg-[#6c63ff]/30 border-[#6c63ff] text-white shadow-md'
                        : 'bg-white/5 border-white/20 text-[#e8eaf6] hover:bg-white/10'
                    }`}
                  >
                    <List className="fas fa-list me-1 w-3.5 h-3.5" />
                    <span>مجموعات محددة</span>
                  </button>
                  <button
                    type="button"
                    id="sendAllBtn"
                    onClick={() => handleSetSendMode('all')}
                    className={`btn py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      sendMode === 'all'
                        ? 'active bg-[#6c63ff]/30 border-[#6c63ff] text-white shadow-md'
                        : 'bg-white/5 border-white/20 text-[#e8eaf6] hover:bg-white/10'
                    }`}
                  >
                    <Globe className="fas fa-globe me-1 w-3.5 h-3.5" />
                    <span>كل المجموعات</span>
                  </button>
                </div>

                <small
                  id="sendModeHelp"
                  className="text-muted block text-[11px] text-gray-400 transition-colors"
                >
                  {sendMode === 'all'
                    ? 'سيتم الإرسال إلى جميع المجموعات في حسابك تلقائياً.'
                    : 'أدخل روابط المجموعات في الحقل أدناه.'}
                </small>
              </div>

              {/* 6. المجموعات مع القراءة والتحويل التلقائي للروابط */}
              <div id="groupsDiv" className="mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="groups" className="form-label block text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>مجموعات الإرسال (روابط مباشرة أو معرفات)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {sendMode === 'specific' && resolvedTargets.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{resolvedTargets.length} وجهة</span>
                      </span>
                    )}
                    <button
                      type="button"
                      id="fetchDialogsBtnSendOnly"
                      onClick={handleFetchAllGroups}
                      disabled={isFetchingGroups || sendMode === 'all'}
                      className="text-[0.7rem] py-0.5 px-2 rounded border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="جلب جميع المجموعات والقنوات الحقيقية التي اشتركت بها من حسابك في تيليجرام"
                    >
                      <RotateCw className={`w-3 h-3 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                      <span>{isFetchingGroups ? 'جاري جلب المجموعات...' : 'جلب كل المجموعات'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  id="groups"
                  rows={4}
                  value={groups}
                  disabled={sendMode === 'all'}
                  onChange={(e) => setGroups(e.target.value)}
                  placeholder="الصق الروابط المباشرة هنا (رابط لكل سطر)&#10;أمثلة مدعومة:&#10;https://t.me/my_group_name&#10;https://t.me/+AbCdEf123456 (رابط دعوة خاصة)&#10;https://t.me/c/1234567890/10 (قناة داخلية)&#10;@channel_username"
                  className="form-control w-full px-3.5 py-2.5 rounded-xl border border-white/20 text-[#e8eaf6] placeholder-gray-400 text-xs sm:text-sm focus:outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/30 transition-all font-mono resize-y"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    opacity: sendMode === 'all' ? 0.5 : 1,
                    cursor: sendMode === 'all' ? 'not-allowed' : 'text',
                  }}
                />

                {/* نص التوضيح الذكي */}
                <div className="text-[11px] text-gray-300/90 leading-relaxed bg-black/25 p-2.5 rounded-lg border border-white/10 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">تحويل الروابط الذكي: </span>
                    <span>
                      يمكنك لصق أي رابط مباشر وسيتم قراءته في الخلفية وتحويله فوراً إلى المعرف المناسب (<code className="text-indigo-300 font-mono">@username</code>، <code className="text-amber-300 font-mono">+invite_hash</code>، أو <code className="text-emerald-300 font-mono">-100ID</code>) واستخدامه للإرسال.
                    </span>
                  </div>
                </div>

                {/* عرض بطاقات المعرفات التي تم تحويلها والتعرف عليها تلقائياً */}
                {sendMode === 'specific' && resolvedTargets.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      المعرفات المستخرجة للإرسال ({resolvedTargets.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-lg bg-black/30 border border-white/10">
                      {resolvedTargets.map((target, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-mono shadow-sm"
                          title={`الرابط الأصلي: ${target.raw}`}
                        >
                          {target.type === 'invite' ? (
                            <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                          ) : target.type === 'internal_id' ? (
                            <Hash className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <AtSign className="w-3 h-3 text-indigo-300 shrink-0" />
                          )}
                          <span className="font-bold">{target.identifier}</span>
                          {target.cleanName && target.cleanName !== target.identifier && (
                            <span className="text-[9px] text-gray-400">({target.cleanName})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 7. أزرار الإجراءات */}
              <div className="row g-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="col-md-6">
                  <button
                    type="submit"
                    id="saveBtn"
                    disabled={isSaving}
                    className="btn btn-warning w-100 py-3 px-4 rounded-xl text-[#1c1400] text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 w-full"
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                      border: 'none',
                      color: '#1c1400',
                    }}
                  >
                    {isSaving ? (
                      <Loader2 className="fas fa-spinner fa-spin me-2 w-4 h-4 animate-spin text-black" />
                    ) : (
                      <Save className="fas fa-save me-2 w-4 h-4 text-black" />
                    )}
                    <span>حفظ الإعدادات</span>
                  </button>
                </div>

                <div className="col-md-6">
                  <button
                    type="button"
                    id="sendNowBtn"
                    disabled={isSending}
                    onClick={handleSendNow}
                    className="btn btn-success w-100 py-3 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-transform active:scale-95 disabled:opacity-50 w-full"
                    style={{
                      background: dispatchType === 'scheduled'
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'linear-gradient(135deg, #34d399, #059669)',
                      border: 'none',
                    }}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="fas fa-spinner fa-spin me-2 w-4 h-4 animate-spin text-white" />
                        <span>{dispatchType === 'scheduled' ? 'جاري الجدولة...' : 'جاري الإرسال...'}</span>
                      </>
                    ) : (
                      <>
                        {dispatchType === 'scheduled' ? (
                          <>
                            <Calendar className="fas fa-calendar-check me-2 w-4 h-4 text-white" />
                            <span>جدولة الإرسال التلقائي</span>
                          </>
                        ) : (
                          <>
                            <Send className="fas fa-paper-plane me-2 w-4 h-4 text-white" />
                            <span>إرسال الآن</span>
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* منطقة حالة الإرسال */}
            <div id="sendStatus" className="mt-3">
              {statusMessage && (
                <div
                  className={`alert p-3 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                    statusMessage.type === 'success'
                      ? 'alert-success bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : statusMessage.type === 'danger'
                      ? 'alert-danger bg-red-500/20 text-red-300 border-red-500/30'
                      : statusMessage.type === 'warning'
                      ? 'alert-warning bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'alert-info bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                >
                  <span>{statusMessage.text}</span>
                  <button
                    onClick={() => setStatusMessage(null)}
                    className="text-gray-400 hover:text-white text-sm px-1.5"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
