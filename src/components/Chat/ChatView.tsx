import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ShieldAlert, Lock, Info, Mic } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { ChatHeader } from './ChatHeader';
import { VoicePlaybackTopBar } from './VoicePlaybackTopBar';
import { PinnedMessageBar } from './PinnedMessageBar';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { RestrictedContentModal } from '../Modals/RestrictedContentModal';
import { ChatSpeechRecognition } from './ChatSpeechRecognition';
import { getTelegramEpoch } from '../../utils/dateUtils';

export const ChatView: React.FC = () => {
  const { activeChat, activeChatId, messages, settings, sendMessage, showToast, typingStatus, typingChatId } = useTelegram();
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false);
  const [isSpeechDictationOpen, setIsSpeechDictationOpen] = useState(false);

  const isArabic = settings.language === 'ar';
  const prevChatIdRef = useRef<string | null>(activeChatId);

  // Ensure all message collections are sorted by date in ascending order,
  // using specific message ID to prevent duplicate rendering and overlap
  const currentMessages = useMemo(() => {
    const raw = (activeChatId && messages[activeChatId]) || [];
    if (!raw.length || !activeChatId) return [];

    // Filter strictly by activeChatId to prevent any cross-chat message overlap
    const cleanActiveId = activeChatId.replace(/^chat_/, '');
    const chatFiltered = raw.filter((m) => {
      if (!m) return false;
      const mChatId = String(m.chatId || '').replace(/^chat_/, '');
      const mPeerId = String(m.peerId || '').replace(/^chat_/, '');
      if (mChatId && mChatId === cleanActiveId) return true;
      if (mPeerId && mPeerId === cleanActiveId) return true;
      return m.chatId === activeChatId;
    });

    // Deduplicate messages by unique ID to prevent duplicate rendering and overlap
    const map = new Map<string, any>();
    for (const m of chatFiltered) {
      if (!m || m.id === undefined || m.id === null) continue;
      const key = String(m.id);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, m);
      } else {
        map.set(key, { ...existing, ...m });
      }
    }

    // Sort strictly ascending by date (oldest first, newest last) using specific message ID
    return Array.from(map.values()).sort((a, b) => {
      const epochA = getTelegramEpoch(a);
      const epochB = getTelegramEpoch(b);
      if (epochA !== epochB) return epochA - epochB;
      const numA = Number(String(a.id).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
    });
  }, [activeChatId, messages]);

  // Track transition direction for natural native sliding
  useEffect(() => {
    prevChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Listen to external toggle events from ChatInput
  useEffect(() => {
    const handleToggle = () => {
      setIsSpeechDictationOpen((prev) => !prev);
    };
    window.addEventListener('tg_toggle_dictation', handleToggle);
    return () => window.removeEventListener('tg_toggle_dictation', handleToggle);
  }, []);

  const handleSendDictatedText = useCallback((text: string) => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    showToast(isArabic ? 'تم إرسال الرسالة الصوتية بنجاح 🚀' : 'Dictated message sent 🚀', '🎙️');
  }, [sendMessage, showToast, isArabic]);

  const handleInsertDictatedText = useCallback((text: string) => {
    if (!text.trim()) return;
    window.dispatchEvent(new CustomEvent('tg_dictation_insert', { detail: text.trim() }));
    showToast(isArabic ? 'تم إدراج النص في صندوق الكتابة ✍️' : 'Text inserted into input ✍️', '📝');
  }, [showToast, isArabic]);

  return (
    <div
      id="tg-chat-view-container"
      className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 relative ${
        !activeChatId ? 'hidden md:flex' : 'flex'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!activeChatId || !activeChat ? (
          <motion.div
            key="tg-chat-empty-view"
            id="tg-chat-empty-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none tg-wallpaper-pattern h-full w-full"
            style={{
              backgroundColor: 'var(--tg-theme-chat-bg)',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              className="p-8 rounded-3xl max-w-md backdrop-blur-md border shadow-xl flex flex-col items-center gap-3"
              style={{
                backgroundColor: 'var(--tg-theme-surface)',
                borderColor: 'var(--tg-theme-border)',
              }}
            >
              <div className="w-16 h-16 rounded-full bg-[#2481cc]/20 text-[#2481cc] flex items-center justify-center shadow-inner">
                <Send className="w-8 h-8 ml-1 rtl:ml-0 rtl:mr-1" />
              </div>
              <div className="font-bold text-lg" style={{ color: 'var(--tg-theme-bubble-in-text)' }}>
                {isArabic ? 'تيليجرام ويب' : 'Telegram Web Client'}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {isArabic
                  ? 'اختر محادثة من القائمة للبدء بالتراسل، الاستماع للتسجيلات الصوتية، ومشاركة الملفات مع تشفير كامل عبر بروتوكول MTProto 2.0.'
                  : 'Select a chat to start messaging, listen to voice notes, and share files with full MTProto 2.0 end-to-end encryption.'}
              </p>
            </motion.div>
          </motion.div>
        ) : activeChat.isRestricted ? (
          <motion.div
            key={`tg-chat-restricted-${activeChatId}`}
            id="tg-chat-view-restricted"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="flex-1 flex flex-col h-full overflow-hidden min-w-0 w-full"
            style={{
              fontSize: `${settings.fontSize}px`,
            }}
          >
            <ChatHeader />

            {/* Restricted Chat Placeholder (Replicates Official Telegram Client) */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none tg-wallpaper-pattern bg-[var(--tg-theme-chat-bg)]">
              <div className="p-8 rounded-3xl max-w-md bg-[#17212b]/95 backdrop-blur-md border border-red-500/30 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg">
                  <ShieldAlert className="w-11 h-11" />
                </div>

                <div className="space-y-1.5">
                  <div className="font-bold text-xl text-white">
                    {isArabic ? 'غير مُتاحة' : 'Unavailable'}
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    {activeChat.title}
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-xs text-gray-200 leading-relaxed space-y-2">
                  <p>
                    {activeChat.restrictionReason ||
                      (isArabic
                        ? 'لا يمكن عرض هذه المجموعة بسبب استخدامها لنشر محتوى إباحي في السابق.'
                        : 'This channel or group is blocked because it was used to spread restricted content.')}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-red-400 font-semibold pt-1 border-t border-white/5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'حظر امتثال لشروط الخدمة وقوانين النشر' : 'Restricted by Terms of Service'}</span>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => setIsRestrictedModalOpen(true)}
                    className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] active:bg-[#195a88] text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    <span>{isArabic ? 'عرض تفاصيل الحظر والالتماس' : 'View Details & Appeal'}</span>
                  </button>
                </div>
              </div>
            </div>

            <RestrictedContentModal
              isOpen={isRestrictedModalOpen}
              onClose={() => setIsRestrictedModalOpen(false)}
              reason={activeChat.restrictionReason}
              chatTitle={activeChat.title}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`tg-chat-view-${activeChatId}`}
            id="tg-chat-view"
            initial={{
              opacity: 0,
              x: isArabic ? -24 : 24,
              scale: 0.995,
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: isArabic ? 18 : -18,
              scale: 0.995,
            }}
            transition={{
              duration: 0.22,
              ease: [0.25, 1, 0.5, 1], // Telegram Android native cubic-bezier
            }}
            className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative w-full"
            style={{
              fontSize: `${settings.fontSize}px`,
            }}
          >
            <ChatHeader />
            <VoicePlaybackTopBar />
            <PinnedMessageBar />
            <MessageList key={activeChatId || 'no_chat'} messages={currentMessages} hidePinnedBar={true} />

            {/* Floating Quick Dictation Launcher (Visible when dictation is closed) */}
            {!isSpeechDictationOpen && (
              <button
                type="button"
                onClick={() => setIsSpeechDictationOpen(true)}
                className="absolute bottom-20 left-4 z-20 px-3 py-1.5 rounded-full bg-[#17212b]/95 hover:bg-[#1f2d3d] border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 group select-none"
                title={isArabic ? 'إملاء الرسائل بالصوت مباشرة (Web Speech API)' : 'Voice Dictate messages'}
              >
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/30">
                  <Mic className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <span>{isArabic ? 'إملاء صوتي' : 'Dictate'}</span>
              </button>
            )}

            {/* Web Speech API Live Voice Dictation Interface */}
            <ChatSpeechRecognition
              isOpen={isSpeechDictationOpen}
              onClose={() => setIsSpeechDictationOpen(false)}
              onSendText={handleSendDictatedText}
              onInsertText={handleInsertDictatedText}
              chatTitle={activeChat.title}
            />

            {/* Live Chat Typing Status Bar */}
            <AnimatePresence>
              {Boolean(typingChatId === activeChatId || (activeChatId && typingStatus?.[activeChatId])) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 py-1.5 text-xs text-[#2481cc] flex items-center gap-2 bg-[var(--tg-theme-surface)]/90 backdrop-blur-md border-t border-[var(--tg-theme-border)]/40 shrink-0 select-none"
                >
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-bounce" />
                  </div>
                  <span>
                    {typingStatus?.[activeChatId!]?.action === 'record_audio'
                      ? (isArabic ? 'يسجل رسالة صوتية...' : 'recording voice message...')
                      : (isArabic ? 'جاري الكتابة...' : 'typing...')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <ChatInput />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
