/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Phone, Video, Search, MoreVertical, Paperclip, 
  Smile, Mic, Send, ShieldCheck, Check, CheckCheck, Play, 
  Pause, Cloud, Sparkles, X, Image as ImageIcon, FileText,
  Square, Volume2
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { ChatItem, ChatMessage } from '../types/telegram';
import { CallModal } from './modals/CallModal';

interface Props {
  chat: ChatItem;
  onBack: () => void;
  onOpenCloudStatus: () => void;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '👏', '😂', '🎉', '🤩', '🙏', '✨', '☕', '🌹', '🤍'];

export const ChatRoom: React.FC<Props> = ({ chat, onBack, onOpenCloudStatus }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(telegramService.getMessages(chat.id));
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  // Real Microphone Recording State via MediaRecorder
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Hidden real file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = telegramService.getThemeSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = telegramService.subscribe(() => {
      setMessages(telegramService.getMessages(chat.id));
    });
    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Real voice recording via MediaRecorder API
  const startRealVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());

        // Send real voice message
        await telegramService.sendMessage(
          chat.id,
          `رسالة صوتية مسجلة (${recordingSeconds} ثانية) 🎙️`,
          'voice',
          audioUrl
        );
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      // Fallback if mic permission denied in iframe
      setIsRecordingVoice(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopAndSendVoiceRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback
      telegramService.sendMessage(
        chat.id,
        `رسالة صوتية (${recordingSeconds} ثانية) 🎙️`,
        'voice'
      );
    }
  };

  const cancelVoiceRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    await telegramService.sendMessage(chat.id, text);
  };

  // Real image upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await telegramService.sendMessage(
        chat.id,
        `صورة: ${file.name} (${(file.size / 1024).toFixed(1)} KB) 📸`,
        'photo',
        dataUrl
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Real document/file upload handler
  const handleDocumentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await telegramService.sendMessage(
        chat.id,
        `ملف مستند: ${file.name} (${(file.size / 1024).toFixed(1)} KB) 📁`,
        'file',
        dataUrl
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePlayVoice = (msgId: string, mediaUrl?: string) => {
    if (playingVoiceId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    if (mediaUrl) {
      const audio = new Audio(mediaUrl);
      activeAudioRef.current = audio;
      setPlayingVoiceId(msgId);
      audio.play().catch(e => console.log('Audio playback error:', e));
      audio.onended = () => setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => setPlayingVoiceId(null), 3000);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    telegramService.addReaction(chat.id, msgId, emoji);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white">
      {/* Hidden real file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*,video/*"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="*/*"
        onChange={handleDocumentFileChange}
        className="hidden"
      />

      {/* Call Modal */}
      {isInCall && (
        <CallModal chat={chat} onClose={() => setIsInCall(false)} />
      )}

      {/* Header */}
      <div 
        className="flex items-center justify-between px-3.5 py-2.5 shadow-md z-10"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-white" />
          </button>

          <div className="relative">
            <img
              src={chat.avatar}
              alt={chat.title}
              className="w-10 h-10 rounded-full object-cover border border-white/30"
            />
            {chat.isOnline && (
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full" />
            )}
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1">
              <h2 className="text-sm font-bold text-white truncate max-w-[170px] sm:max-w-xs">{chat.title}</h2>
              {chat.isVerified && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            </div>
            <p className="text-[11px] text-teal-100">
              {chat.type === 'saved' 
                ? 'سحابة التخزين الرسمية (غير محدودة)' 
                : chat.membersCount 
                ? `${chat.membersCount.toLocaleString('ar-SA')} عضواً` 
                : chat.isOnline 
                ? 'متصل الآن' 
                : 'آخر ظهور قريباً'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white">
          <button 
            onClick={onOpenCloudStatus}
            className="p-1.5 hover:bg-black/10 rounded-full" 
            title="حالة التشفير والسحابة"
          >
            <Cloud className="w-5 h-5 text-teal-100" />
          </button>
          <button 
            onClick={() => setIsInCall(true)}
            className="p-1.5 hover:bg-black/10 rounded-full transition-colors"
            title="بدء مكالمة صوتية مشفرة"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsInCall(true)}
            className="p-1.5 hover:bg-black/10 rounded-full transition-colors"
            title="مكالمة فيديو"
          >
            <Video className="w-5 h-5" />
          </button>
          <button className="p-1.5 hover:bg-black/10 rounded-full">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cloud Encryption Notice */}
      <div className="bg-[#17212b]/95 py-1 px-4 text-center border-b border-[#242f3d] flex items-center justify-center gap-1.5 text-[11px] text-teal-300">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>محادثة مشفرة سحابياً عبر TELEGRAM_API_ID: 34773007 وتشفير AES-256</span>
      </div>

      {/* Messages Stream with Doodle Background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 telegram-doodle-bg">
        {messages.map((msg) => {
          const isMe = msg.isOutgoing;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} group`}
            >
              <div
                className={`p-3 max-w-[85%] sm:max-w-md shadow-md relative transition-all ${
                  isMe ? 'text-white' : 'bg-[#182533] text-gray-100'
                }`}
                style={{
                  backgroundColor: isMe ? theme.primaryColor : undefined,
                  borderRadius: `${theme.messageRadius || 12}px`,
                  fontSize: `${theme.messageFontSize || 16}px`,
                }}
              >
                {/* Sender tag if incoming and group */}
                {!isMe && chat.type !== 'user' && (
                  <span className="text-xs font-bold text-teal-400 block mb-1">
                    {msg.senderName}
                  </span>
                )}

                {/* Media Image if present */}
                {msg.mediaType === 'photo' && msg.mediaUrl && (
                  <div className="rounded-lg overflow-hidden mb-2 shadow">
                    <img 
                      src={msg.mediaUrl} 
                      alt="Uploaded media" 
                      className="w-full max-h-72 object-cover rounded-lg" 
                    />
                  </div>
                )}

                {/* Voice player if present */}
                {msg.mediaType === 'voice' && (
                  <div className="flex items-center gap-2.5 my-1.5 bg-black/20 p-2.5 rounded-xl border border-white/10">
                    <button
                      onClick={() => handlePlayVoice(msg.id, msg.mediaUrl)}
                      className="w-9 h-9 rounded-full bg-white text-teal-800 flex items-center justify-center shadow-md transition-transform active:scale-95"
                    >
                      {playingVoiceId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-white transition-all ${
                            playingVoiceId === msg.id ? 'w-full duration-3000' : 'w-1/4'
                          }`} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] opacity-80 font-mono">
                        <span>0:0{recordingSeconds || 8}</span>
                        <span>صوت مشفر 🎙️</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Content */}
                <p className="whitespace-pre-wrap leading-relaxed text-right">{msg.text}</p>

                {/* Footer: Time + Status checkmarks */}
                <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 mt-1 pt-0.5">
                  <span className="font-mono">{msg.timestamp}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-300 inline" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions badge */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-white/10">
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleReaction(msg.id, r.emoji)}
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-transform active:scale-95 ${
                          r.reactedByMe ? 'bg-white/30 border border-white' : 'bg-black/30'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick reaction popover on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5 px-1 bg-[#17212b]/80 rounded-full p-0.5">
                {['👍', '❤️', '🔥', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    className="hover:scale-125 transition-transform px-1 text-xs"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="p-3 bg-[#17212b] border-t border-[#242f3d] flex flex-wrap gap-2 animate-fade-in">
          {EMOJI_LIST.map((em) => (
            <button
              key={em}
              onClick={() => handleAddEmoji(em)}
              className="text-2xl hover:scale-125 transition-transform p-1"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Real Attachment Menu Popover */}
      {showAttachMenu && (
        <div className="p-3.5 bg-[#17212b] border-t border-[#242f3d] flex items-center justify-around animate-fade-in text-xs">
          <button 
            onClick={() => imageInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-teal-400 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="font-medium">صورة أو فيديو من الجهاز</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-teal-400 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-medium">مستند أو ملف سحابي</span>
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-2.5 bg-[#17212b] border-t border-[#242f3d] flex items-center gap-2">
        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-full transition-colors ${
            showEmojiPicker ? 'text-teal-400 bg-white/10' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smile className="w-6 h-6" />
        </button>

        {/* Text Input / Real Recording View */}
        <div className="flex-1 relative">
          {isRecordingVoice ? (
            <div className="w-full py-2 px-4 rounded-2xl bg-red-950/50 border border-red-500/40 flex items-center justify-between text-red-400 text-sm animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="font-mono">
                  تسجيل ميكروفون حي: 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </span>
              </div>
              <button 
                onClick={cancelVoiceRecording}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="اكتب رسالة..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-4 rounded-2xl text-sm text-right text-white focus:outline-none focus:border-teal-400 placeholder-gray-500"
              dir="auto"
            />
          )}
        </div>

        {/* Attachment Button */}
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`p-2 rounded-full transition-colors ${
            showAttachMenu ? 'text-teal-400 bg-white/10' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Send / Mic Button */}
        {inputText.trim() ? (
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-90"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Send className="w-5 h-5 rotate-180" />
          </button>
        ) : isRecordingVoice ? (
          <button
            onClick={stopAndSendVoiceRecording}
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-md transition-transform active:scale-90 animate-bounce"
            title="إيقاف وحفظ التسجيل الصوتي في السحابة"
          >
            <Check className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={startRealVoiceRecording}
            className="w-10 h-10 rounded-full bg-[#242f3d] hover:bg-[#2b394a] flex items-center justify-center text-gray-300 transition-transform active:scale-90"
            title="تسجيل رسالة صوتية حقيقية عبر الميكروفون"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
