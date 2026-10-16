import { useState } from 'react';
import { X, Search, Bookmark, Send, Copy, Check, ExternalLink } from 'lucide-react';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  date: string;
}

interface SentMessageItem {
  id: string;
  text: string;
  date: string;
  groupsCount: number;
}

export function SavedLinksModal({
  onClose,
  onSelectMessage,
}: {
  onClose: () => void;
  onSelectMessage?: (text: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'links' | 'messages'>('links');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const savedLinks: LinkItem[] = [
    { id: '1', title: 'مجموعة الأكاديميين والباحثين السعوديين', url: 'https://t.me/saudi_academic', category: 'أكاديمي', date: 'اليوم' },
    { id: '2', title: 'ملتقى طلاب وطالبات جامعة الملك سعود', url: 'https://t.me/riyadh_students', category: 'جامعات', date: 'أمس' },
    { id: '3', title: 'قناة الإعلانات والخدمات الأكاديمية الرسمية', url: 'https://t.me/academic_services_sa', category: 'قنوات', date: 'منذ أسبوع' },
    { id: '4', title: 'مكتبة الرسائل والأطروحات العلمية', url: 'https://t.me/thesis_library', category: 'مراجع', date: 'منذ أسبوعين' },
    { id: '5', title: 'شبكة المترجمين والباحثين العرب', url: 'https://t.me/arab_transcribers', category: 'بحث', date: 'منذ شهر' },
  ];

  const sentMessages: SentMessageItem[] = [
    {
      id: 'm1',
      text: 'السلام عليكم ورحمة الله، يسرنا تقديم خدمات الأبحاث والتحويل الأكاديمي المتخصص بدقة متناهية وسرعة إنجاز.',
      date: 'اليوم 02:45 م',
      groupsCount: 4,
    },
    {
      id: 'm2',
      text: 'نوفر لكم أفضل أدوات تنسيق ملفات PDF إلى Word بدقة عالية مع الجداول والصور بدون أخطاء.',
      date: 'أمس 08:30 م',
      groupsCount: 6,
    },
    {
      id: 'm3',
      text: 'المساعد الأكاديمي لخطط البحث ومراجعة المراجع وفق معايير APA المعتمدة لرسائل الماجستير والدكتوراه.',
      date: '28 فبراير 11:15 ص',
      groupsCount: 8,
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLinks = savedLinks.filter(
    l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMessages = sentMessages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] text-[#e2e8f0] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-700 to-blue-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">البحث في روابطي ومحفوظاتي</h3>
              <p className="text-xs text-cyan-200">الوصول السريع إلى روابط المجموعات والرسائل الإعلانية السابقة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex border-b border-slate-700 gap-3">
            <button
              onClick={() => setActiveTab('links')}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'links'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              روابطي المحفوظة ({savedLinks.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'messages'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              رسائلي المرسلة ({sentMessages.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder={activeTab === 'links' ? 'ابحث في الروابط أو اسم المجموعة...' : 'ابحث في نصوص الرسائل...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {activeTab === 'links' ? (
            filteredLinks.length > 0 ? (
              filteredLinks.map(l => (
                <div
                  key={l.id}
                  className="p-3 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{l.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                        {l.category}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-400/90 flex items-center gap-1">
                      <span>{l.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(l.id, l.url)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                      title="نسخ الرابط"
                    >
                      {copiedId === l.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded-lg transition-colors"
                      title="فتح الرابط"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">لا توجد روابط تطابق بحثك</div>
            )
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map(m => (
              <div
                key={m.id}
                className="p-3.5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/70 rounded-xl space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{m.date}</span>
                  <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50 font-mono">
                    {m.groupsCount} مجموعات
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{m.text}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(m.id, m.text)}
                    className="px-2.5 py-1 text-[11px] bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg inline-flex items-center gap-1 transition-colors"
                  >
                    {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    نسخ النص
                  </button>
                  {onSelectMessage && (
                    <button
                      onClick={() => {
                        onSelectMessage(m.text);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg inline-flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      استخدام هذا النص
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">لا توجد رسائل سابقة تطابق بحثك</div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
