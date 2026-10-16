import React, { useState } from 'react';
import { useTelegram } from '../../context/TelegramContext';
import { Hash, MessageSquare, X, Plus, Pin, Lock, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { topicsController } from '../../core/messenger/TopicsController';
import { ForumTopic } from '../../types';

const EMOJI_OPTIONS = ['💬', '📢', '🔗', '❓', '💡', '🚀', '🛠️', '🎮', '💎', '📚'];
const COLOR_OPTIONS = [0x2481cc, 0x10b981, 0x8b5cf6, 0xf59e0b, 0xef4444, 0x06b6d4];

export const ForumTopicsModal: React.FC = () => {
  const { activeModal, setActiveModal, activeChat, settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [selectedColor, setSelectedColor] = useState(0x2481cc);

  if (activeModal !== 'forum-topics' || !activeChat) return null;

  const topics = topicsController.getTopics(activeChat.id);

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    topicsController.createTopic(activeChat.id, newTitle.trim(), selectedEmoji, selectedColor);
    showToast(isArabic ? 'تم إنشاء الموضوع بنجاح 🎉' : 'Topic created successfully 🎉', '💬');
    setNewTitle('');
    setIsCreating(false);
  };

  const handleSelectTopic = (topic: ForumTopic) => {
    showToast(
      isArabic ? `تم الانتقال لموضوع: ${topic.title}` : `Switched to topic: ${topic.title}`,
      topic.iconEmoji || '💬'
    );
    setActiveModal('none');
  };

  const handleTogglePin = (e: React.MouseEvent, topicId: number) => {
    e.stopPropagation();
    topicsController.togglePinTopic(activeChat.id, topicId);
    showToast(isArabic ? 'تم تحديث تثبيت الموضوع' : 'Topic pin updated', '📌');
  };

  return (
    <div
      id="forum-topics-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={() => {
        setIsCreating(false);
        setActiveModal('none');
      }}
    >
      <div
        id="forum-topics-modal-container"
        className="w-full max-w-md bg-[var(--tg-theme-bg,#17212b)] text-white rounded-3xl shadow-2xl overflow-hidden border border-[var(--tg-theme-border,rgba(255,255,255,0.08))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tg-theme-border,rgba(255,255,255,0.08))]">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {isCreating ? (
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
            ) : (
              <Hash className="w-5 h-5 text-[#2481cc]" />
            )}
            <h3 className="font-bold text-base">
              {isCreating
                ? isArabic ? 'إنشاء موضوع جديد' : 'New Forum Topic'
                : isArabic ? 'مواضيع المنتدى (Topics)' : 'Forum Topics'}
            </h3>
          </div>
          <button
            id="close-forum-topics-btn"
            onClick={() => {
              setIsCreating(false);
              setActiveModal('none');
            }}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {isCreating ? (
          <form onSubmit={handleCreateTopic} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                {isArabic ? 'عنوان الموضوع' : 'Topic Title'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10">
                  {selectedEmoji}
                </span>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={isArabic ? 'مثال: قسم النقاشات التقنية' : 'e.g., Tech Discussions'}
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2481cc]"
                  autoFocus
                />
              </div>
            </div>

            {/* Emoji Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                {isArabic ? 'رمز الأيقونة' : 'Icon Emoji'}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    type="button"
                    key={em}
                    onClick={() => setSelectedEmoji(em)}
                    className={`p-2 rounded-xl text-lg hover:scale-110 transition-transform ${
                      selectedEmoji === em ? 'bg-[#2481cc]/30 border border-[#2481cc]' : 'bg-white/5'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                {isArabic ? 'لون الموضوع' : 'Color Accent'}
              </label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    type="button"
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: `#${col.toString(16).padStart(6, '0')}` }}
                  >
                    {selectedColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-300"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-5 py-2 rounded-xl bg-[#2481cc] hover:bg-[#1c70b4] disabled:opacity-50 text-white text-xs font-bold transition-all"
              >
                {isArabic ? 'إنشاء الموضوع' : 'Create Topic'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              <div className="text-xs text-gray-400 mb-2 px-1 flex items-center justify-between">
                <span>
                  {isArabic
                    ? `المواضيع في ${activeChat?.title || 'المجموعة'}`
                    : `Topics in ${activeChat?.title || 'Group'}`}
                </span>
                <span className="text-[11px] font-mono text-sky-400">{topics.length} topics</span>
              </div>

              {topics.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-white/5 group"
                  onClick={() => handleSelectTopic(t)}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                    <span className="text-2xl p-2 rounded-xl bg-black/20 group-hover:scale-105 transition-transform">
                      {t.iconEmoji || '💬'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <span className="font-semibold text-sm text-white truncate">{t.title}</span>
                        {t.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 rotate-45 shrink-0" />
                        )}
                        {t.isClosed && (
                          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{t.totalMessages || 0} {isArabic ? 'رسالة' : 'messages'}</span>
                        {t.lastMessage && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{t.lastMessage}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleTogglePin(e, t.id)}
                      title={isArabic ? 'تثبيت/إلغاء تثبيت' : 'Pin/Unpin'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
                    >
                      <Pin className={`w-3.5 h-3.5 ${t.isPinned ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                    {t.unreadCount && t.unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#2481cc] text-white">
                        {t.unreadCount}
                      </span>
                    ) : (
                      <MessageSquare className="w-4 h-4 text-gray-500 group-hover:text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[var(--tg-theme-border,rgba(255,255,255,0.08))] flex justify-between items-center bg-black/10">
              <span className="text-[11px] text-gray-400">
                {isArabic ? 'المنتديات تدعم مسارات نقاش منفصلة' : 'Supergroup forum mode active'}
              </span>
              <button
                id="create-topic-btn"
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-[#2481cc] hover:bg-[#1c70b4] text-white text-xs font-bold rounded-xl transition-transform active:scale-95 shadow-md shadow-sky-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>{isArabic ? 'إنشاء موضوع جديد' : 'New Topic'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
