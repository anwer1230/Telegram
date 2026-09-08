import React, { useState, useEffect, useCallback } from 'react';
import { Send, ShieldAlert, Lock, Info, Mic } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { ChatHeader } from './ChatHeader';
import { VoicePlaybackTopBar } from './VoicePlaybackTopBar';
import { PinnedMessageBar } from './PinnedMessageBar';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { RestrictedContentModal } from '../Modals/RestrictedContentModal';
import { ChatSpeechRecognition } from './ChatSpeechRecognition';

export const ChatView: React.FC = () => {
  const { activeChat, activeChatId, settings, sendMessage, showToast } = useTelegram();
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false);
  const [isSpeechDictationOpen, setIsSpeechDictationOpen] = useState(false);

  const isArabic = settings.language === 'ar';

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

  if (!activeChatId || !activeChat) {
    return (
      <div
        id="tg-chat-empty-view"
        className="flex-1 hidden md:flex flex-col items-center justify-center p-6 text-center select-none tg-wallpaper-pattern"
        style={{
          backgroundColor: 'var(--tg-theme-chat-bg)',
        }}
      >
        <div
          className="p-8 rounded-3xl max-w-md backdrop-blur-md border shadow-xl flex flex-col items-center gap-3"
          style={{
            backgroundColor: 'var(--tg-theme-surface)',
            borderColor: 'var(--tg-theme-border)',
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#2481cc]/20 text-[#2481cc] flex items-center justify-center">
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
        </div>
      </div>
    );
  }

  if (activeChat.isRestricted) {
    return (
      <div
        id="tg-chat-view"
        className="flex-1 flex flex-col h-full overflow-hidden min-w-0"
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
      </div>
    );
  }

  return (
    <div
      id="tg-chat-view"
      className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative"
      style={{
        fontSize: `${settings.fontSize}px`,
      }}
    >
      <ChatHeader />
      <VoicePlaybackTopBar />
      <PinnedMessageBar />
      <MessageList />

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

      <ChatInput />
    </div>
  );
};
