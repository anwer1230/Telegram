import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  User,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { PrivateAutoReplyRule } from '../../types';
import { backgroundSyncService } from '../../core/BackgroundSyncService';

export const AutoResponderModal: React.FC = () => {
  const { activeModal, setActiveModal, showToast } = useTelegram();
  const [rules, setRules] = useState<PrivateAutoReplyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New rule input fields
  const [keyword, setKeyword] = useState('');
  const [reply, setReply] = useState('');

  // Editing rule state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editReply, setEditReply] = useState('');

  // Fetch all saved private auto-replies from SQLite
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auto-replies/private/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.rules)) {
        setRules(data.rules);
        backgroundSyncService.syncFromPrivateAutoReplies(data.rules);
      }
    } catch (err) {
      console.error('Error fetching private auto-replies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeModal === ('auto-responder' as any)) {
      loadRules();
    }
  }, [activeModal, loadRules]);

  if (activeModal !== ('auto-responder' as any)) return null;

  // 1. Add new private auto reply
  const handleAddRule = async () => {
    const trimmedKeyword = keyword.trim();
    const trimmedReply = reply.trim();

    if (!trimmedKeyword || !trimmedReply) {
      showToast('يرجى كتابة الكلمة المفتاحية والرد المطلوب أولاً', '⚠️');
      return;
    }

    // Prevent duplicate keyword
    const isDuplicate = rules.some(
      (r) => r.keyword.trim().toLowerCase() === trimmedKeyword.toLowerCase()
    );
    if (isDuplicate) {
      showToast('هذه الكلمة المفتاحية موجودة مسبقاً في القواعد', '⚠️');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auto-replies/private/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: trimmedKeyword,
          reply: trimmedReply,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.rule) {
        const updatedRules = [...rules, data.rule];
        setRules(updatedRules);
        backgroundSyncService.syncFromPrivateAutoReplies(updatedRules);
        setKeyword('');
        setReply('');
        showToast('تمت إضافة قاعدة الرد التلقائي وحفظها بنجاح ✨', '✅');
      } else {
        showToast(data.message || 'تعذر إضافة القاعدة', '❌');
      }
    } catch (err: any) {
      showToast('خطأ في الاتصال بالخادم', '❌');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Toggle active state
  const handleToggle = async (id: string) => {
    // Optimistic UI update
    const optimisticRules = rules.map((r) =>
      r.id === id ? { ...r, is_active: !r.is_active } : r
    );
    setRules(optimisticRules);
    backgroundSyncService.syncFromPrivateAutoReplies(optimisticRules);

    try {
      const res = await fetch('/api/auto-replies/private/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success && data.rule) {
        const finalRules = rules.map((r) =>
          r.id === id ? { ...r, is_active: Boolean(data.rule.is_active) } : r
        );
        setRules(finalRules);
        backgroundSyncService.syncFromPrivateAutoReplies(finalRules);
      } else {
        loadRules();
      }
    } catch (err) {
      loadRules();
    }
  };

  // 3. Delete rule
  const handleDelete = async (id: string) => {
    // Optimistic delete
    const filteredRules = rules.filter((r) => r.id !== id);
    setRules(filteredRules);
    backgroundSyncService.syncFromPrivateAutoReplies(filteredRules);

    try {
      const res = await fetch('/api/auto-replies/private/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('تم حذف قاعدة الرد بنجاح', '🗑️');
      } else {
        showToast(data.message || 'تعذر حذف القاعدة', '❌');
        loadRules();
      }
    } catch (err) {
      showToast('خطأ أثناء حذف القاعدة', '❌');
      loadRules();
    }
  };

  // 4. Start edit mode
  const handleStartEdit = (rule: PrivateAutoReplyRule) => {
    setEditingId(rule.id);
    setEditKeyword(rule.keyword);
    setEditReply(rule.reply);
  };

  // 5. Cancel edit mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditKeyword('');
    setEditReply('');
  };

  // 6. Save edit
  const handleSaveEdit = async (id: string) => {
    const trimmedKeyword = editKeyword.trim();
    const trimmedReply = editReply.trim();

    if (!trimmedKeyword || !trimmedReply) {
      showToast('يرجى ملء الكلمة المفتاحية ونص الرد', '⚠️');
      return;
    }

    // Check duplicate if changing keyword
    const isDuplicate = rules.some(
      (r) => r.id !== id && r.keyword.trim().toLowerCase() === trimmedKeyword.toLowerCase()
    );
    if (isDuplicate) {
      showToast('هذه الكلمة المفتاحية مستخدمة بالفعل في قاعدة أخرى', '⚠️');
      return;
    }

    try {
      const res = await fetch('/api/auto-replies/private/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          keyword: trimmedKeyword,
          reply: trimmedReply,
        }),
      });
      const data = await res.json();
      if (data.success && data.rule) {
        const updatedRules = rules.map((r) =>
          r.id === id ? { ...r, keyword: trimmedKeyword, reply: trimmedReply } : r
        );
        setRules(updatedRules);
        backgroundSyncService.syncFromPrivateAutoReplies(updatedRules);
        handleCancelEdit();
        showToast('تم حفظ التعديل بنجاح ✨', '✅');
      } else {
        showToast(data.message || 'فشل تعديل القاعدة', '❌');
      }
    } catch (err) {
      showToast('خطأ في تعديل القاعدة', '❌');
    }
  };

  return (
    <div
      id="modal-auto-responder-activity"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl text-[#e8eaf6] rounded-3xl shadow-2xl overflow-hidden border border-cyan-500/30 my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        style={{
          background: 'linear-gradient(145deg, #051419, #0a2530, #030d11)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">الردود التلقائية</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                  <User className="w-3 h-3 text-cyan-400" />
                  المحادثات الخاصة فقط
                </span>
              </div>
              <p className="text-[11px] text-cyan-300/80">
                نظام ردود مستقل ومحفوظ بشكل دائم في SQLite للمحادثات الخاصة حصراً
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadRules}
              disabled={loading}
              title="تحديث القائمة"
              className="p-2 rounded-xl text-gray-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => setActiveModal('none')}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Strict Rule Notice */}
        <div className="px-4 py-2.5 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center gap-2 text-[11px] text-cyan-300">
          <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>
            هذه الوظيفة <strong>مستقلة تماماً</strong> وتعمل فقط عند استلام رسائل في <strong>المحادثات الخاصة (Private Chats)</strong>، ولا تستجيب في المجموعات أو القنوات إطلاقاً.
          </span>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Add New Rule Form */}
          <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>إضافة قاعدة رد تلقائي جديدة:</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-300 font-medium block">
                الكلمة أو الجملة المفتاحية:
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="مثال: السلام عليكم، كم السعر، الاستفسار، متوفر..."
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-300 font-medium block">
                نص الرد التلقائي:
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="اكتب نص الرد التلقائي الذي سيتم إرساله للمستخدم في الخاص..."
                className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleAddRule}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-md hover:shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'جاري الإضافة...' : 'إضافة'}</span>
              </button>
            </div>
          </div>

          {/* Saved Rules List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200">
                قواعد الردود المحفوظة ({rules.length}):
              </span>
              <span className="text-[10px] text-gray-400">
                حفظ دائم في قاعدة بيانات SQLite
              </span>
            </div>

            {loading && rules.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>جاري تحميل القواعد...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-gray-400 space-y-1">
                <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                <p>لا توجد قواعد ردود تلقائية محفوظة حالياً.</p>
                <p className="text-[10px] text-gray-500">أدخل الكلمة المفتاحية ونص الرد أعلاه واضغط على زر "إضافة".</p>
              </div>
            ) : (
              rules.map((rule) => {
                const isEditing = editingId === rule.id;

                if (isEditing) {
                  return (
                    <div
                      key={rule.id}
                      className="p-4 rounded-2xl border border-cyan-400/50 bg-black/70 space-y-3 animate-in fade-in-50"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                        <span>تعديل قاعدة الرد:</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-gray-300 block">الكلمة المفتاحية:</label>
                        <input
                          type="text"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          className="w-full bg-black/80 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-gray-300 block">نص الرد:</label>
                        <textarea
                          value={editReply}
                          onChange={(e) => setEditReply(e.target.value)}
                          rows={2}
                          className="w-full bg-black/80 border border-cyan-500/40 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={() => handleSaveEdit(rule.id)}
                          className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>حفظ التعديل</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      rule.is_active
                        ? 'bg-black/40 border-cyan-500/25 hover:border-cyan-500/45'
                        : 'bg-black/20 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
                          {rule.keyword}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-cyan-400" />
                          خاص
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle switch */}
                        <button
                          onClick={() => handleToggle(rule.id)}
                          title={rule.is_active ? 'تعطيل القاعدة' : 'تفعيل القاعدة'}
                          className="p-1 text-gray-400 hover:text-cyan-300 transition-colors"
                        >
                          {rule.is_active ? (
                            <ToggleRight className="w-6 h-6 text-cyan-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => handleStartEdit(rule)}
                          title="تعديل"
                          className="p-1 text-gray-400 hover:text-cyan-300 transition-colors rounded-lg hover:bg-white/5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(rule.id)}
                          title="حذف"
                          className="p-1 text-gray-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                      <span className="text-[10px] text-gray-400 block mb-0.5">نص الرد:</span>
                      {rule.reply}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            {rules.filter((r) => r.is_active).length} قاعدة نشطة من إجمالي {rules.length}
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
