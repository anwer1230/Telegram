/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Phone, Video, Search, MoreVertical, Paperclip, 
  Smile, Mic, Send, ShieldCheck, Check, CheckCheck, Play, 
  Pause, Cloud, Sparkles, X, Image as ImageIcon, FileText,
  Pin, Reply, Trash2, Copy, ChevronUp, ChevronDown, User,
  Volume2, FastForward
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { ChatItem, ChatMessage } from '../types/telegram';
import { CallModal } from './modals/CallModal';
import { ChatProfileDrawer } from './ChatProfileDrawer';

interface Props {
  chat: ChatItem;
  onBack: () => void;
  onOpenCloudStatus: () => void;
}

const EMOJI_CATEGORIES = [
  { name: 'وجوه ومشاعر', emojis: ['👍', '❤️', '🔥', '👏', '😂', '🎉', '🤩', '🙏', '✨', '☕', '🌹', '🤍', '😍', '🥰', '😎', '🥳', '🤔', '🙌', '💯', '⚡'] },
  { name: 'إيماءات وتحايا', emojis: ['👋', '👌', '✌️', '🤝', '💪', '🫡', '🤙', '🫰', '👀', '💡', '🌟', '🚀', '⭐', '🎈', '🎁', '🏆', '💎', '🎯', '📍', '🪄'] },
];

const TELEGRAM_STICKERS = [
  { id: 's1', name: 'Thumbs Up Duck', url: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=160&auto=format&fit=crop&q=80', emoji: '🦆' },
  { id: 's2', name: 'Cool Cat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=160&auto=format&fit=crop&q=80', emoji: '🐱' },
  { id: 's3', name: 'Rocket Launch', url: 'https://images.unsplash.com/photo-1517976487502-53b93f773489?w=160&auto=format&fit=crop&q=80', emoji: '🚀' },
  { id: 's4', name: 'Happy Doggo', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=160&auto=format&fit=crop&q=80', emoji: '🐶' },
  { id: 's5', name: 'Coffee Cup', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=160&auto=format&fit=crop&q=80', emoji: '☕' },
  { id: 's6', name: 'Celebration Fireworks', url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=160&auto=format&fit=crop&q=80', emoji: '🎆' },
];

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '👏', '😮', '🎉', '⚡', '💯'];

export const ChatRoom: React.FC<Props> = ({ chat, onBack, onOpenCloudStatus }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(telegramService.getMessages(chat.id));
  const [inputText, setInputText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'stickers'>('emoji');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const [isInCall, setIsInCall] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // In-Chat Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Reply State
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Copied alert notification
  const [copyNotice, setCopyNotice] = useState(false);

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

  const pinnedMessage = telegramService.getPinnedMessage(chat.id);

  useEffect(() => {
    const unsubscribe = telegramService.subscribe(() => {
      setMessages(telegramService.getMessages(chat.id));
    });
    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    if (!chatSearchQuery.trim()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatSearchQuery]);

  // Clean up audio & recording on unmount
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

  // In-chat search filter
  useEffect(() => {
    if (!chatSearchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const matched = messages
      .filter((m) => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
      .map((m) => m.id);
    setSearchMatches(matched);
    setCurrentMatchIndex(matched.length > 0 ? 0 : 0);

    if (matched.length > 0) {
      const el = document.getElementById(`msg-${matched[0]}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [chatSearchQuery, messages]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(next);
    const el = document.getElementById(`msg-${searchMatches[next]}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prev);
    const el = document.getElementById(`msg-${searchMatches[prev]}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

        await telegramService.sendMessage(
          chat.id,
          `رسالة صوتية مسجلة (${recordingSeconds} ثانية) 🎙️`,
          'voice',
          audioUrl,
          replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : undefined
        );
        setReplyingTo(null);
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      // Fallback
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
      telegramService.sendMessage(
        chat.id,
        `رسالة صوتية (${recordingSeconds} ثانية) 🎙️`,
        'voice',
        undefined,
        replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : undefined
      );
      setReplyingTo(null);
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
    setShowPicker(false);
    const reply = replyingTo 
      ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } 
      : undefined;
    setReplyingTo(null);
    await telegramService.sendMessage(chat.id, text, undefined, undefined, reply);
  };

  const handleSendSticker = async (stickerUrl: string) => {
    setShowPicker(false);
    await telegramService.sendMessage(
      chat.id,
      '',
      'sticker',
      stickerUrl,
      replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : undefined
    );
    setReplyingTo(null);
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
        dataUrl,
        replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : undefined
      );
      setReplyingTo(null);
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
        dataUrl,
        replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : undefined
      );
      setReplyingTo(null);
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
      audio.playbackRate = audioSpeed;
      activeAudioRef.current = audio;
      setPlayingVoiceId(msgId);
      audio.play().catch(e => console.log('Audio playback error:', e));
      audio.onended = () => setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => setPlayingVoiceId(null), 3000);
    }
  };

  const toggleSpeed = () => {
    const newSpeed = audioSpeed === 1 ? 2 : 1;
    setAudioSpeed(newSpeed);
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = newSpeed;
    }
  };

  const handleReaction = (msgId: string, emoji: string) => {
    telegramService.addReaction(chat.id, msgId, emoji);
  };

  const handlePin = (msgId: string) => {
    if (chat.pinnedMessageId === msgId) {
      telegramService.unpinMessage(chat.id);
    } else {
      telegramService.pinMessage(chat.id, msgId);
    }
  };

  const handleDelete = (msgId: string) => {
    telegramService.deleteMessage(chat.id, msgId);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2000);
  };

  const scrollToPinned = () => {
    if (pinnedMessage) {
      const el = document.getElementById(`msg-${pinnedMessage.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('bg-white/20');
      setTimeout(() => el?.classList.remove('bg-white/20'), 1500);
    }
  };

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#0e1621] text-white relative">
      {/* Main Chat Column */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-[#0e1621] relative">
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

        {/* Copy Notice Toast */}
        {copyNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#17212b] border border-teal-500/50 text-white text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم نسخ نص الرسالة إلى الحافظة</span>
          </div>
        )}

        {/* Telegram Web Header (Height: 56px) */}
        <div 
          className="h-14 flex items-center justify-between px-3.5 shadow-md z-10 transition-colors flex-shrink-0"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {/* Right side (RTL): Back arrow + Avatar + Title (Clickable to open profile) */}
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0 pr-1"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="p-1 hover:bg-black/10 rounded-full transition-colors md:hidden text-white"
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="relative flex-shrink-0">
              <img
                src={chat.avatar}
                alt={chat.title}
                className="w-10 h-10 rounded-full object-cover border border-white/20 group-hover:scale-105 transition-transform"
              />
              {chat.isOnline && (
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full" />
              )}
            </div>

            <div className="text-right min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                  {chat.title}
                </h2>
                {chat.isVerified && <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />}
              </div>
              <p className="text-[11px] text-teal-100 truncate">
                {chat.type === 'saved' 
                  ? 'سحابة التخزين الرسمية (غير محدودة)' 
                  : chat.membersCount 
                  ? `${chat.membersCount.toLocaleString('ar-SA')} عضواً` 
                  : chat.isOnline 
                  ? 'متصل الآن' 
                  : 'آخر ظهور مؤخراً'}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 text-white flex-shrink-0">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-1.5 rounded-full transition-colors ${
                isSearchOpen ? 'bg-black/20 text-white' : 'hover:bg-black/10 text-white/90'
              }`}
              title="بحث في الرسائل"
            >
              <Search className="w-5 h-5" />
            </button>

            <button 
              onClick={onOpenCloudStatus}
              className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white/90" 
              title="حالة التشفير والسحابة (MTProto)"
            >
              <Cloud className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsInCall(true)}
              className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white/90"
              title="بدء مكالمة صوتية مشفرة"
            >
              <Phone className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsInCall(true)}
              className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white/90 hidden sm:flex"
              title="مكالمة فيديو"
            >
              <Video className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`p-1.5 rounded-full transition-colors ${
                isProfileOpen ? 'bg-black/20 text-white' : 'hover:bg-black/10 text-white/90'
              }`}
              title="معلومات المحادثة والملف الشخصي"
            >
              <User className="w-5 h-5" />
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-white/90"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMoreMenu && (
                <div 
                  className="absolute left-0 mt-2 w-48 bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl p-1.5 z-40 text-right animate-fade-in text-xs space-y-1"
                  dir="rtl"
                >
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 flex items-center justify-between text-gray-200"
                  >
                    <span>عرض المعلومات</span>
                    <User className="w-4 h-4 text-teal-400" />
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      telegramService.toggleMuteChat(chat.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-white/10 flex items-center justify-between text-gray-200"
                  >
                    <span>{chat.isMuted ? 'إلغاء الكتم' : 'كتم الإشعارات'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      telegramService.clearChatHistory(chat.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 flex items-center justify-between"
                  >
                    <span>مسح الرسائل</span>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Message Bar (Official Web K/A Parity) */}
        {pinnedMessage && (
          <div 
            onClick={scrollToPinned}
            className="bg-[#17212b]/95 backdrop-blur-xs px-4 py-2 border-b border-[#242f3d] flex items-center justify-between cursor-pointer hover:bg-[#1e2a37] transition-colors select-none text-right z-10"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-1 self-stretch rounded-full flex-shrink-0" 
                style={{ backgroundColor: theme.primaryColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                  <Pin className="w-3.5 h-3.5 rotate-45" />
                  <span>رسالة مثبتة</span>
                </div>
                <p className="text-xs text-gray-300 truncate">
                  {pinnedMessage.text || 'رسالة وسائط مثبتة'}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                telegramService.unpinMessage(chat.id);
              }}
              className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
              title="إلغاء التثبيت"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* In-Chat Search Bar */}
        {isSearchOpen && (
          <div className="bg-[#17212b] border-b border-[#242f3d] px-4 py-2 flex items-center justify-between gap-3 animate-fade-in z-10 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="بحث في محادثة هذا الشخص..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="flex-1 bg-[#0e1621] border border-[#242f3d] rounded-xl px-3 py-1.5 text-white text-right focus:outline-none focus:border-teal-400 text-xs"
                autoFocus
              />
              {searchMatches.length > 0 && (
                <span className="text-[11px] text-gray-400 font-mono whitespace-nowrap">
                  {currentMatchIndex + 1} من {searchMatches.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              <button 
                onClick={handlePrevMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30"
                title="السابق"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMatch}
                disabled={searchMatches.length === 0}
                className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30"
                title="التالي"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setChatSearchQuery('');
                }}
                className="p-1 hover:bg-white/10 rounded-full hover:text-white"
                title="إغلاق البحث"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Cloud Encryption Notice */}
        <div className="bg-[#17212b]/80 py-1 px-4 text-center border-b border-[#242f3d]/60 flex items-center justify-center gap-1.5 text-[11px] text-teal-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>محادثة مشفرة سحابياً عبر TELEGRAM_API_ID: 34773007 وتشفير AES-256</span>
        </div>

        {/* Messages Stream with Telegram Wallpaper Pattern */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 telegram-doodle-bg">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
              <div className="w-14 h-14 rounded-full bg-[#17212b] border border-[#242f3d] flex items-center justify-center text-teal-400">
                <Smile className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-gray-300">لا توجد رسائل سابقة في هذه المحادثة</p>
              <p className="text-xs text-gray-500">أرسل رسالة للبدء، محادثاتك محمية ومزامنة سحابياً فورياً</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.isOutgoing;
              const isSticker = msg.mediaType === 'sticker';

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} group relative transition-colors rounded-2xl p-0.5`}
                >
                  {/* Floating Action Toolbar on Message Hover (Official Web K/A Parity) */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 ${
                    isMe ? 'left-2' : 'right-2'
                  } z-20 flex items-center gap-0.5 bg-[#17212b] border border-[#242f3d] shadow-xl rounded-full px-2 py-1 text-xs`}>
                    {/* Quick Reaction Icons */}
                    <div className="flex items-center gap-1 border-l border-[#242f3d] pl-1 ml-1">
                      {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="hover:scale-125 transition-transform px-0.5 text-xs"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                      title="رد"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handlePin(msg.id)}
                      className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                      title={chat.pinnedMessageId === msg.id ? 'إلغاء التثبيت' : 'تثبيت الرسالة'}
                    >
                      <Pin className={`w-3.5 h-3.5 rotate-45 ${chat.pinnedMessageId === msg.id ? 'text-teal-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleCopyText(msg.text)}
                      className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                      title="نسخ النص"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="p-1 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400"
                      title="حذف الرسالة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Message Bubble Body */}
                  {isSticker ? (
                    /* Telegram Sticker rendering (transparent without bubble) */
                    <div className="p-1 max-w-[180px] sm:max-w-[220px]">
                      <img 
                        src={msg.mediaUrl} 
                        alt="Sticker" 
                        className="w-40 h-40 object-cover rounded-2xl shadow-lg hover:scale-105 transition-transform" 
                      />
                      <div className="flex items-center justify-end gap-1 text-[10px] text-white/70 mt-1">
                        <span className="font-mono">{msg.timestamp}</span>
                        {isMe && <CheckCheck className="w-3 h-3 text-cyan-300 inline" />}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-3 max-w-[85%] sm:max-w-md shadow-md relative transition-all ${
                        isMe 
                          ? 'text-white rounded-2xl rounded-tr-xs' 
                          : 'bg-[#182533] text-gray-100 rounded-2xl rounded-tl-xs'
                      }`}
                      style={{
                        backgroundColor: isMe ? theme.primaryColor : undefined,
                        borderRadius: `${theme.messageRadius || 12}px`,
                        fontSize: `${theme.messageFontSize || 15}px`,
                      }}
                    >
                      {/* Sender tag if incoming and group */}
                      {!isMe && chat.type !== 'user' && (
                        <span className="text-xs font-bold text-teal-400 block mb-1">
                          {msg.senderName}
                        </span>
                      )}

                      {/* Reply preview inside bubble */}
                      {msg.replyTo && (
                        <div className="mb-2 p-1.5 pr-2.5 rounded-lg bg-black/25 border-r-2 border-teal-300 text-right text-xs">
                          <span className="font-bold text-teal-300 block text-[11px]">{msg.replyTo.sender}</span>
                          <span className="text-gray-300 line-clamp-1 text-[11px]">{msg.replyTo.text}</span>
                        </div>
                      )}

                      {/* Media Image if present */}
                      {msg.mediaType === 'photo' && msg.mediaUrl && (
                        <div className="rounded-xl overflow-hidden mb-2 shadow-sm">
                          <img 
                            src={msg.mediaUrl} 
                            alt="Uploaded media" 
                            className="w-full max-h-72 object-cover rounded-xl" 
                          />
                        </div>
                      )}

                      {/* Voice player if present (Waveform Parity) */}
                      {msg.mediaType === 'voice' && (
                        <div className="flex items-center gap-3 my-1 bg-black/20 p-2.5 rounded-xl border border-white/10">
                          <button
                            onClick={() => handlePlayVoice(msg.id, msg.mediaUrl)}
                            className="w-10 h-10 rounded-full bg-white text-teal-800 flex items-center justify-center shadow-md transition-transform active:scale-95 flex-shrink-0"
                          >
                            {playingVoiceId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>

                          <div className="flex-1 space-y-1">
                            {/* Realistic Telegram Waveform Bars */}
                            <div className="flex items-center gap-0.5 h-6">
                              {[8, 14, 22, 12, 18, 24, 16, 20, 10, 15, 22, 18, 12, 16, 24, 14, 18, 10, 8, 16].map((h, i) => (
                                <div
                                  key={i}
                                  className={`w-1 rounded-full transition-all duration-300 ${
                                    playingVoiceId === msg.id && i % 3 === 0 ? 'bg-cyan-300 animate-pulse' : 'bg-white/60'
                                  }`}
                                  style={{ height: `${h}px` }}
                                />
                              ))}
                            </div>

                            <div className="flex justify-between text-[10px] opacity-80 font-mono">
                              <span>0:0{recordingSeconds || 8}</span>
                              <button 
                                onClick={toggleSpeed}
                                className="px-1.5 py-0.2 bg-white/20 rounded hover:bg-white/30 text-white font-bold"
                              >
                                {audioSpeed}X
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Text Content */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap leading-relaxed text-right">{msg.text}</p>
                      )}

                      {/* Footer: Time + Status checkmarks */}
                      <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 mt-1 pt-0.5 select-none">
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
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Bar Preview (Docked above input) */}
        {replyingTo && (
          <div className="bg-[#17212b] border-t border-[#242f3d] px-4 py-2 flex items-center justify-between text-right animate-fade-in">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-1 self-stretch rounded-full flex-shrink-0" 
                style={{ backgroundColor: theme.primaryColor }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-teal-400 block">
                  الرد على {replyingTo.senderName}
                </span>
                <p className="text-xs text-gray-300 truncate">
                  {replyingTo.text || 'وسائط مرفقة'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Multi-Tab Emoji & Sticker Picker */}
        {showPicker && (
          <div className="bg-[#17212b] border-t border-[#242f3d] p-3 animate-fade-in text-right">
            {/* Tab switchers: Emojis / Stickers */}
            <div className="flex items-center gap-2 mb-3 border-b border-[#242f3d] pb-2 text-xs font-semibold">
              <button
                onClick={() => setPickerTab('emoji')}
                className={`px-3 py-1 rounded-xl transition-colors ${
                  pickerTab === 'emoji' ? 'bg-teal-500/20 text-teal-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                😃 الرموز التعبيرية
              </button>
              <button
                onClick={() => setPickerTab('stickers')}
                className={`px-3 py-1 rounded-xl transition-colors ${
                  pickerTab === 'stickers' ? 'bg-teal-500/20 text-teal-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                🎭 الملصقات المتحركة
              </button>
            </div>

            {pickerTab === 'emoji' ? (
              <div className="max-h-48 overflow-y-auto space-y-3">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <div key={idx}>
                    <span className="text-[11px] text-gray-400 block mb-1.5">{cat.name}</span>
                    <div className="flex flex-wrap gap-2">
                      {cat.emojis.map((em) => (
                        <button
                          key={em}
                          onClick={() => setInputText((prev) => prev + em)}
                          className="text-2xl hover:scale-125 transition-transform p-1"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto grid grid-cols-3 sm:grid-cols-6 gap-3">
                {TELEGRAM_STICKERS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleSendSticker(st.url)}
                    className="p-1.5 rounded-xl hover:bg-white/10 transition-transform hover:scale-105 flex flex-col items-center gap-1 group"
                  >
                    <img src={st.url} alt={st.name} className="w-16 h-16 object-cover rounded-xl shadow" />
                    <span className="text-[10px] text-gray-400 group-hover:text-teal-400">{st.emoji} {st.name}</span>
                  </button>
                ))}
              </div>
            )}
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
              <span className="font-medium">صورة أو فيديو</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-gray-300 hover:text-teal-400 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="font-medium">ملف أو مستند سحابي</span>
            </button>
          </div>
        )}

        {/* Docked Input Bar (Official Web K Layout) */}
        <div className="p-2.5 bg-[#17212b] border-t border-[#242f3d] flex items-center gap-2 select-none">
          {/* Emoji / Sticker Button */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={`p-2 rounded-full transition-colors ${
              showPicker ? 'text-teal-400 bg-white/10' : 'text-gray-400 hover:text-white'
            }`}
            title="الرموز التعبيرية والملصقات"
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
            title="إرفاق ملفات"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Send / Mic Button */}
          {inputText.trim() ? (
            <button
              onClick={handleSendMessage}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-90"
              style={{ backgroundColor: theme.primaryColor }}
              title="إرسال"
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          ) : isRecordingVoice ? (
            <button
              onClick={stopAndSendVoiceRecording}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-md transition-transform active:scale-90 animate-bounce"
              title="إيقاف وإرسال التسجيل الصوتي"
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

      {/* Official Telegram Web Right-Side Info Drawer */}
      {isProfileOpen && (
        <ChatProfileDrawer
          chat={chat}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onSearchInChat={() => {
            setIsProfileOpen(false);
            setIsSearchOpen(true);
          }}
          onClearHistory={() => {
            telegramService.clearChatHistory(chat.id);
            setMessages([]);
          }}
        />
      )}
    </div>
  );
};
