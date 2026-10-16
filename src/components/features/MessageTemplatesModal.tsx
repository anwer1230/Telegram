import { useState, useEffect, type FormEvent } from 'react';
import {
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Send,
  Sparkles,
  FileText,
  Tag,
  Hash,
  Clock,
  RotateCcw
} from 'lucide-react';

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category?: string;
  shortcut?: string;
  usageCount: number;
  createdAt: string;
}

export function MessageTemplatesModal({
  onClose,
  onSelectTemplate,
}: {
  onClose: () => void;
  onSelectTemplate?: (text: string) => void;
}) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'عام',
    shortcut: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = () => {
    fetch('/api/telegram/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = (template: MessageTemplate) => {
    // Record usage
    fetch(`/api/telegram/templates/use/${template.id}`, { method: 'POST' }).catch(() => {});
    if (onSelectTemplate) {
      onSelectTemplate(template.content);
      onClose();
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({
      title: '',
      content: '',
      category: 'عام',
      shortcut: '',
    });
    setFormError(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (template: MessageTemplate) => {
    setEditId(template.id);
    setFormData({
      title: template.title,
      content: template.content,
      category: template.category || 'عام',
      shortcut: template.shortcut || '',
    });
    setFormError(null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;
    try {
      const res = await fetch(`/api/telegram/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      } else {
        setTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch {
      alert('تعذر حذف القالب');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setFormError('يرجى كتابة عنوان القالب ومحتواه');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/telegram/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId || undefined,
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category.trim() || 'عام',
          shortcut: formData.shortcut.trim() ? (formData.shortcut.startsWith('/') ? formData.shortcut.trim() : `/${formData.shortcut.trim()}`) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        setIsEditing(false);
      } else if (data.error) {
        setFormError(data.error);
      }
    } catch {
      setFormError('حدث خطأ أثناء حفظ القالب');
    } finally {
      setIsSaving(false);
    }
  };

  // Categories list
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category || 'عام')))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.shortcut && t.shortcut.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || (t.category || 'عام') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      dir="rtl"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>إدارة قوالب الرسائل الجاهزة</span>
                <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-mono font-semibold">
                  {templates.length} قوالب
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                حفظ نصوص ورسائل متكررة لاستخدامها بضغطة زر داخل المحادثات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:brightness-105 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>قالب جديد</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isEditing ? (
            /* Edit / Add Form */
            <form onSubmit={handleSave} className="space-y-4 bg-secondary/30 rounded-2xl p-4 border border-border/80">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles size={15} className="text-primary" />
                  {editId ? 'تعديل قالب الرسالة' : 'إنشاء قالب رسالة جديد'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  إلغاء
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                    عنوان القالب (مختصر ومعبر) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: تحية وترحيب رسمي"
                    className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      التصنيف
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9.5 rounded-xl border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="عام">عام</option>
                      <option value="ترحيب">ترحيب</option>
                      <option value="طلبات">طلبات</option>
                      <option value="متابعة">متابعة</option>
                      <option value="أكاديمي">أكاديمي</option>
                      <option value="ختام">ختام</option>
                      <option value="مخصص">مخصص</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      اختصار سريع (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.shortcut}
                      onChange={e => setFormData({ ...formData, shortcut: e.target.value })}
                      placeholder="/welcome"
                      dir="ltr"
                      className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/30 font-mono text-left"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  نص الرسالة الجاهزة *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="اكتب هنا النص المتكرر الذي تود إدراجه بنقرة واحدة داخل المحادثة..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-105 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>حفظ القالب</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search & Categories Bar */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search size={15} className="absolute right-3 top-3 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث في القوالب بالعنوان، النص أو الاختصار..."
                    className="w-full h-9.5 rounded-xl border border-input bg-background pr-9 pl-3 text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-secondary text-secondary-foreground hover:bg-muted'
                      }`}
                    >
                      {cat === 'all' ? 'جميع القوالب' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  جاري تحميل القوالب...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                    <FileText size={24} />
                  </div>
                  <p className="text-xs font-bold text-foreground">لا توجد قوالب مطابقة للبحث</p>
                  <p className="text-[11px] text-muted-foreground">
                    يمكنك إنشاء قالب جديد لحفظ النصوص التي تستخدمها بصفة متكررة
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 transition mt-2 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>إنشاء قالب الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map(template => (
                    <div
                      key={template.id}
                      className="group rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40 hover:shadow-xs transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-foreground">{template.title}</span>
                          {template.category && (
                            <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-semibold text-muted-foreground">
                              {template.category}
                            </span>
                          )}
                          {template.shortcut && (
                            <span className="text-[10px] font-mono bg-sky-500/15 text-sky-600 dark:text-sky-300 px-1.5 py-0.5 rounded font-bold" dir="ltr">
                              {template.shortcut}
                            </span>
                          )}
                        </div>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(template.id, template.content)}
                            title="نسخ النص"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                          >
                            {copiedId === template.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(template)}
                            title="تعديل"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(template.id)}
                            title="حذف"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 p-2.5 rounded-xl border border-border/50">
                        {template.content}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock size={11} />
                          استُخدم {template.usageCount || 0} مرات
                        </span>

                        {onSelectTemplate && (
                          <button
                            type="button"
                            onClick={() => handleUse(template)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-bold text-xs transition cursor-pointer"
                          >
                            <Send size={13} />
                            <span>استخدام في المحادثة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>نصيحة: يمكنك أيضاً إدراج القوالب بضغطة واحدة من زر القوالب بجانب حقل الكتابة.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-muted text-foreground font-semibold text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
