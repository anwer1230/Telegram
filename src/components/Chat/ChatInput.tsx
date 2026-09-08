import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Square,
  X,
  Image,
  FileText,
  BarChart2,
  Check,
  Trash2,
  Share2,
  CornerDownRight,
  Edit3,
  Lock,
  ShieldAlert,
  Bot,
  Cloud,
  CheckCircle2,
  Sparkles,
  Bell,
  BellOff,
  Megaphone,
  ExternalLink,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { AudioRecorder } from '../../utils/audioRecorder';
import { MessageMedia, LinkPreviewData } from '../../types';
import { POPULAR_REACTIONS, TELEGRAM_STICKERS } from '../../data/mockTelegramData';
import {
  ANIMATED_TELEGRAM_STICKERS,
  TELEGRAM_CUSTOM_EMOJI_SETS,
  LottieStickerItem,
} from '../../data/lottieStickerData';
import { LottieSticker } from './LottieSticker';
import { CustomAnimatedEmoji } from './CustomAnimatedEmoji';
import { extractLinkPreview } from '../../utils/linkParser';
import { messagesController } from '../../core/MessagesController';
import { ChatObject } from '../../core/ChatObject';
import { UserObject } from '../../core/UserObject';
import { NotificationCenter } from '../../core/NotificationCenter';
import { draftSyncService } from '../../services/DraftSyncService';
import confetti from 'canvas-confetti';

export const ChatInput: React.FC = () => {
  const {
    activeChat,
    activeChatId,
    sendMessage,
    sendMediaMessage,
    editMessageText,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    selectedMessageIds,
    clearSelectedMessages,
    deleteSelectedMessages,
    setForwardingMessage,
    setActiveModal,
    messages,
    settings,
    solveChatCaptcha,
    setChatDraft,
    toggleMuteChat,
    showToast,
  } = useTelegram();

  const [text, setText] = useState(() => {
    if (activeChatId) {
      const persistedDraft = draftSyncService.getDraftText(activeChatId);
      if (persistedDraft) return persistedDraft;
    }
    return activeChat?.draft || '';
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordLocked, setIsRecordLocked] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'custom_emoji' | 'stickers'>('stickers');
  const [isSolvingCaptcha, setIsSolvingCaptcha] = useState(false);
  const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentChatIdRef = useRef<string | null>(activeChatId);
  const touchMicStartRef = useRef<{ x: number; y: number } | null>(null);
  const isMicHoldingRef = useRef(false);

  const isArabic = settings.language === 'ar';
  const isMultiSelectMode = selectedMessageIds.length > 0;
  const isBotFather = activeChat?.username?.toLowerCase() === 'botfather';
  const isSavedMessages = activeChat?.type === 'saved';

  // Evaluate TLRPC permissions & ChatObject moderation rights
  const permissionCheck = React.useMemo(() => {
    if (!activeChat) return { canSend: true, reason: undefined, errorCode: undefined };
    
    // Check ChatObject legal notice first
    const notice = ChatObject.getRestrictedNotice(activeChat, isArabic);
    if (notice.restricted) {
      return {
        canSend: false,
        reason: notice.message,
        errorCode: 'CHAT_WRITE_FORBIDDEN' as const,
      };
    }
    
    return messagesController.canSendMessages(activeChat);
  }, [activeChat, isArabic]);

  // Live extracted link preview
  const livePreview: LinkPreviewData | null =
    text && !dismissedPreviewUrl ? extractLinkPreview(text) : null;

  const botFatherCommands = [
    { cmd: '/newbot', desc: isArabic ? 'إنشاء بوت جديد' : 'Create new bot' },
    { cmd: '/mybots', desc: isArabic ? 'إدارة البوتات' : 'Manage bots' },
    { cmd: '/token', desc: isArabic ? 'عرض التوكن' : 'Get API token' },
    { cmd: '/setcommands', desc: isArabic ? 'تعيين الأوامر' : 'Set commands' },
    { cmd: '/help', desc: isArabic ? 'دليل الأوامر' : 'Help & manual' },
  ];

  // Sync draft state across conversation switches and restore cursor position
  useEffect(() => {
    const prevChatId = currentChatIdRef.current;
    if (prevChatId && prevChatId !== activeChatId && !editingMessage) {
      const cursorPos = textareaRef.current ? textareaRef.current.selectionStart : undefined;
      draftSyncService.saveDraft(prevChatId, text, { cursorPosition: cursorPos, immediate: true });
      setChatDraft(prevChatId, text);
    }
    currentChatIdRef.current = activeChatId;

    if (!editingMessage) {
      const persistedDraft = activeChatId ? draftSyncService.getDraft(activeChatId) : null;
      const initialText = persistedDraft ? persistedDraft.text : (activeChat?.draft || '');
      setText(initialText);

      // Restore cursor position if available
      if (persistedDraft?.cursorPosition !== undefined) {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            try {
              textareaRef.current.setSelectionRange(
                persistedDraft.cursorPosition!,
                persistedDraft.cursorPosition!
              );
            } catch (_) {}
          }
        });
      }
    }
    setDismissedPreviewUrl(null);
  }, [activeChatId]);

  // Real-time listener for cross-tab / cross-session draft sync
  useEffect(() => {
    const unsubscribe = draftSyncService.subscribe((chatId, draft) => {
      if (chatId === activeChatId && !editingMessage) {
        const currentVal = textareaRef.current?.value ?? text;
        const incomingText = draft?.text || '';
        if (currentVal !== incomingText) {
          setText(incomingText);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeChatId, editingMessage, text]);

  // Flush pending draft writes on unmount
  useEffect(() => {
    return () => {
      draftSyncService.flushPendingWrites();
    };
  }, []);

  // Real-time NotificationCenter listener (chatInfoDidLoad & updateInterfaces)
  const [, setInterfaceVersion] = useState(0);
  useEffect(() => {
    const center = NotificationCenter.getInstance();
    const handleUpdate = () => {
      setInterfaceVersion((v) => v + 1);
    };

    center.addObserver(handleUpdate, NotificationCenter.chatInfoDidLoad);
    center.addObserver(handleUpdate, NotificationCenter.updateInterfaces);

    return () => {
      center.removeObserver(handleUpdate, NotificationCenter.chatInfoDidLoad);
      center.removeObserver(handleUpdate, NotificationCenter.updateInterfaces);
    };
  }, []);

  // Sync editing message text into input
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      if (textareaRef.current) textareaRef.current.focus();
    }
  }, [editingMessage]);

  const updateTextAndDraft = (newVal: string) => {
    setText(newVal);
    if (!editingMessage && activeChatId) {
      const cursorPos = textareaRef.current ? textareaRef.current.selectionStart : undefined;
      draftSyncService.saveDraft(activeChatId, newVal, { cursorPosition: cursorPos });
      setChatDraft(activeChatId, newVal);
    }
  };

  // Listen to Web Speech API dictation insertion
  useEffect(() => {
    const handleDictationInsert = (e: any) => {
      const speechText = e.detail;
      if (speechText) {
        setText((prev) => {
          const updated = prev && prev.trim() ? `${prev.trim()} ${speechText}` : speechText;
          if (activeChatId) {
            draftSyncService.saveDraft(activeChatId, updated);
            setChatDraft(activeChatId, updated);
          }
          return updated;
        });
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 80);
      }
    };

    window.addEventListener('tg_dictation_insert', handleDictationInsert);
    return () => window.removeEventListener('tg_dictation_insert', handleDictationInsert);
  }, [activeChatId, setChatDraft]);

  const handleBlur = () => {
    if (activeChatId && !editingMessage) {
      const cursorPos = textareaRef.current ? textareaRef.current.selectionStart : undefined;
      draftSyncService.saveDraft(activeChatId, text, { cursorPosition: cursorPos, immediate: true });
    }
  };

  const handleSend = () => {
    if (editingMessage) {
      editMessageText(editingMessage.id, text);
      setText('');
      return;
    }

    if (!text.trim()) return;

    if (!permissionCheck.canSend) {
      showToast(permissionCheck.reason || 'لا يمكنك الكتابة في هذه المحادثة', '⚠️');
      return;
    }

    if (activeChatId) {
      draftSyncService.clearDraft(activeChatId);
      setChatDraft(activeChatId, '');
      messagesController.recordMessageSent(activeChatId);
    }
    sendMessage(text);
    setText('');
    setDismissedPreviewUrl(null);
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
  };

  const handleSelectBotCommand = (cmd: string) => {
    sendMessage(cmd);
  };

  const handleCaptchaChoice = async (option: string) => {
    if (!activeChatId) return;
    setIsSolvingCaptcha(true);
    await solveChatCaptcha(activeChatId, option);
    setIsSolvingCaptcha(false);
  };

  const handleChannelJoin = () => {
    if (!activeChat) return;
    try {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#2481cc', '#4caf50', '#ffb300', '#9c27b0'],
      });
    } catch {}

    const customEvent = new CustomEvent('tg-joined-chat', {
      detail: {
        ...activeChat,
        isMember: true,
        memberCount: (activeChat.memberCount || 1000) + 1,
      },
    });
    window.dispatchEvent(customEvent);

    showToast(
      isArabic
        ? `تم الانضمام إلى قناة "${activeChat.title}" بنجاح!`
        : `Joined "${activeChat.title}" successfully!`,
      '✨'
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (settings.sendByEnter && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recording handlers with Telegram Hold & Drag Gestures
  const startRecording = async (e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      touchMicStartRef.current = { x: clientX, y: clientY };
      isMicHoldingRef.current = true;
    }
    setIsRecordLocked(false);
    try {
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordDuration(0);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(30);
        } catch {}
      }

      recordTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recording failed:', err);
    }
  };

  const handleMicTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || !touchMicStartRef.current || isRecordLocked) return;
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const dx = clientX - touchMicStartRef.current.x;
    const dy = clientY - touchMicStartRef.current.y;

    // Swipe up to lock (> 45px)
    if (dy < -45) {
      setIsRecordLocked(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([20, 50, 20]);
        } catch {}
      }
      showToast(isArabic ? 'تم قفل التسجيل الصوتي 🔒' : 'Audio recording locked 🔒', '🎙️');
      return;
    }

    // Swipe horizontally to cancel (> 60px)
    if (Math.abs(dx) > 60) {
      cancelRecording();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
      showToast(isArabic ? 'تم إلغاء التسجيل 🗑️' : 'Recording canceled 🗑️', '🗑️');
    }
  };

  const handleMicTouchEnd = () => {
    touchMicStartRef.current = null;
    isMicHoldingRef.current = false;
    // If not locked, releasing finger sends the message automatically like Telegram Android
    if (isRecording && !isRecordLocked) {
      stopAndSendRecording();
    }
  };

  const stopAndSendRecording = async () => {
    if (!recorderRef.current) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    try {
      const audioData = await recorderRef.current.stop();
      setIsRecording(false);
      setIsRecordLocked(false);

      const media: MessageMedia = {
        type: 'voice',
        url: audioData.url,
        duration: audioData.duration,
        waveform: audioData.waveform,
      };

      sendMessage('', media);
    } catch (err) {
      console.error('Failed to finish audio recording:', err);
      setIsRecording(false);
      setIsRecordLocked(false);
    }
  };

  const cancelRecording = () => {
    if (recorderRef.current) recorderRef.current.cancel();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setIsRecordLocked(false);
    setRecordDuration(0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const caption = text;
    if (activeChatId) {
      setChatDraft(activeChatId, '');
    }
    setText('');
    setShowAttachMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    await sendMediaMessage(file, caption);
  };

  const sendSticker = (stickerUrl: string) => {
    const media: MessageMedia = {
      type: 'sticker',
      url: stickerUrl,
    };
    sendMessage('', media);
    setShowEmojiPicker(false);
  };

  const sendLottieSticker = (stickerItem: LottieStickerItem) => {
    const media: MessageMedia = {
      type: 'sticker',
      isLottie: true,
      stickerId: stickerItem.id,
      lottieData: stickerItem.lottieData,
      packName: stickerItem.packName,
    };
    sendMessage('', media);
    setShowEmojiPicker(false);
  };

  const insertCustomEmoji = (code: string) => {
    const updated = text ? `${text} ${code} ` : `${code} `;
    updateTextAndDraft(updated);
  };

  const insertEmoji = (emoji: string) => {
    const updated = text + emoji;
    updateTextAndDraft(updated);
  };

  const sendSamplePoll = () => {
    const media: MessageMedia = {
      type: 'poll',
      pollData: {
        question: isArabic ? 'ما رأيك في تجربة تطبيق تيليجرام ويب؟' : 'How is your Telegram Web experience?',
        options: [
          { id: 'opt_1', text: isArabic ? 'رائع جداً ومطابق للأصلي 🚀' : 'Super fast & authentic 🚀', votes: 14, voters: [] },
          { id: 'opt_2', text: isArabic ? 'أداء ممتاز وسلس 💎' : 'Excellent performance 💎', votes: 8, voters: [] },
          { id: 'opt_3', text: isArabic ? 'تشفير MTProto ممتاز 🔐' : 'Great MTProto security 🔐', votes: 5, voters: [] },
        ],
        totalVotes: 27,
      },
    };
    sendMessage('', media);
    setShowAttachMenu(false);
  };

  const handleBulkForward = () => {
    if (!activeChatId || selectedMessageIds.length === 0) return;
    const currentList = messages[activeChatId] || [];
    const firstSelected = currentList.find((m) => selectedMessageIds.includes(m.id));
    if (firstSelected) {
      setForwardingMessage(firstSelected);
      setActiveModal('forward');
    }
  };

  // MULTI-SELECT BOTTOM BAR
  if (isMultiSelectMode) {
    return (
      <div
        id="tg-multi-select-bar"
        className="p-3 border-t flex items-center justify-between z-20 animate-in slide-in-from-bottom duration-150"
        style={{
          backgroundColor: 'var(--tg-theme-surface)',
          borderColor: 'var(--tg-theme-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={clearSelectedMessages}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-sky-400">
            {selectedMessageIds.length}{' '}
            {isArabic ? 'رسائل محددة' : 'messages selected'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkForward}
            className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>{isArabic ? 'تحويل' : 'Forward'}</span>
          </button>

          <button
            onClick={deleteSelectedMessages}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isArabic ? 'حذف' : 'Delete'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="tg-chat-input-wrapper"
      className="relative p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t z-20 shrink-0"
      style={{
        backgroundColor: 'var(--tg-theme-surface)',
        borderColor: 'var(--tg-theme-border)',
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Editing Message Header */}
      {editingMessage && (
        <div className="mb-2 p-2 rounded-xl bg-[#2481cc]/15 border border-[#2481cc]/30 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-amber-400">
                {isArabic ? 'تعديل الرسالة' : 'Editing Message'}
              </span>
              <span className="text-[11px] text-gray-300 truncate">
                {editingMessage.text}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Replying Quote Header */}
      {replyingTo && !editingMessage && (
        <div className="mb-2 p-2 rounded-xl bg-black/20 border-l-4 border-sky-400 flex items-center justify-between animate-in fade-in rtl:border-l-0 rtl:border-r-4">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-sky-400 truncate">
                {replyingTo.senderName}
              </span>
              <span className="text-[11px] text-gray-300 truncate">
                {replyingTo.textSnippet}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Link Preview while typing */}
      {livePreview && (
        <div className="mb-2 p-2.5 rounded-2xl bg-[#2481cc]/15 border border-[#2481cc]/30 flex items-start justify-between gap-2.5 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-1 h-10 rounded-full bg-[#2481cc] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1 leading-none mb-0.5">
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span>{livePreview.siteName || livePreview.displayUrl}</span>
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {livePreview.title}
              </div>
              {livePreview.description && (
                <div className="text-[11px] text-gray-300 truncate">
                  {livePreview.description}
                </div>
              )}
            </div>
            {livePreview.image && (
              <img
                src={livePreview.image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <button
            onClick={() => setDismissedPreviewUrl(livePreview.url)}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 shrink-0"
            title={isArabic ? 'إزالة المعاينة' : 'Remove preview'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Popover Menu */}
      {showAttachMenu && (
        <div
          id="tg-attachment-menu"
          className="absolute bottom-16 left-4 rtl:left-auto rtl:right-4 z-30 p-2 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in zoom-in-95 duration-150 flex flex-col gap-1 w-48 text-xs font-semibold"
          style={{
            backgroundColor: 'var(--tg-theme-surface)',
            borderColor: 'var(--tg-theme-border)',
            color: 'var(--tg-theme-bubble-in-text)',
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left rtl:text-right transition-colors"
          >
            <Image className="w-4 h-4 text-sky-400" />
            <span>{isArabic ? 'صورة أو فيديو' : 'Photo or Video'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left rtl:text-right transition-colors"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{isArabic ? 'ملف أو مستند' : 'File Document'}</span>
          </button>

          <button
            onClick={sendSamplePoll}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left rtl:text-right transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>{isArabic ? 'استطلاع رأي' : 'Create Poll'}</span>
          </button>
        </div>
      )}

      {/* Emoji & Sticker Picker Popover */}
      {showEmojiPicker && (
        <div
          id="tg-emoji-sticker-picker"
          className="absolute bottom-16 left-4 sm:left-12 rtl:left-auto rtl:right-4 sm:rtl:right-12 z-30 w-72 sm:w-80 h-72 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--tg-theme-surface)',
            borderColor: 'var(--tg-theme-border)',
            color: 'var(--tg-theme-bubble-in-text)',
          }}
        >
          {/* Tabs */}
          <div className="flex border-b border-white/10 text-xs font-bold bg-black/10">
            <button
              onClick={() => setPickerTab('stickers')}
              className={`flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1 ${
                pickerTab === 'stickers'
                  ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isArabic ? 'ملصقات Lottie' : 'Animated Stickers'}</span>
            </button>
            <button
              onClick={() => setPickerTab('custom_emoji')}
              className={`flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1 ${
                pickerTab === 'custom_emoji'
                  ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>💎</span>
              <span>{isArabic ? 'إيموجي مخصص' : 'Custom Emoji'}</span>
            </button>
            <button
              onClick={() => setPickerTab('emoji')}
              className={`flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1 ${
                pickerTab === 'emoji'
                  ? 'border-b-2 border-[#2481cc] text-[#2481cc]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>😀</span>
              <span>{isArabic ? 'عادي' : 'Emojis'}</span>
            </button>
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
            {pickerTab === 'stickers' ? (
              <div className="space-y-3">
                {/* Lottie Animated Stickers */}
                <div>
                  <div className="text-[11px] font-bold text-sky-400 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{isArabic ? 'ملصقات Lottie تيليجرام المتحركة (60 FPS)' : 'Telegram Animated Stickers (Lottie)'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ANIMATED_TELEGRAM_STICKERS.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => sendLottieSticker(sticker)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-105 flex flex-col items-center gap-1 border border-white/5 bg-black/10 group/stk"
                        title={`${sticker.name} (${sticker.packName})`}
                      >
                        <LottieSticker
                          lottieData={sticker.lottieData}
                          stickerId={sticker.id}
                          size={64}
                          autoplay={true}
                          loop={true}
                          showBadge={false}
                        />
                        <span className="text-[10px] text-gray-300 font-medium truncate w-full text-center group-hover/stk:text-sky-400">
                          {isArabic ? sticker.nameAr : sticker.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Classic Stickers */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[11px] font-bold text-gray-400 mb-2">
                    {isArabic ? 'ملصقات كلاسيكية' : 'Classic Stickers'}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TELEGRAM_STICKERS.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => sendSticker(sticker.url)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-transform hover:scale-105 flex flex-col items-center gap-1"
                      >
                        <img
                          src={sticker.url}
                          alt={sticker.name}
                          className="w-12 h-12 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] text-gray-400">{sticker.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : pickerTab === 'custom_emoji' ? (
              /* Custom Emoji Sets */
              <div className="space-y-4">
                {TELEGRAM_CUSTOM_EMOJI_SETS.map((set) => (
                  <div key={set.packId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 px-1">
                      <span>{isArabic ? set.packNameAr : set.packName}</span>
                      <span className="text-[9px] text-gray-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full font-normal">
                        Telegram Pack
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 bg-black/10 p-2 rounded-xl border border-white/5">
                      {set.emojis.map((cEmoji) => (
                        <button
                          key={cEmoji.code}
                          onClick={() => insertCustomEmoji(cEmoji.code)}
                          className="p-1.5 rounded-xl hover:bg-white/15 transition-all hover:scale-125 flex items-center justify-center"
                          title={`${cEmoji.name} - ${cEmoji.code}`}
                        >
                          <CustomAnimatedEmoji code={cEmoji.code} size={26} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Standard Unicode Emojis */
              <div className="grid grid-cols-6 gap-2 text-xl">
                {POPULAR_REACTIONS.concat([
                  '😎', '🤩', '🥳', '🤔', '🤝', '☕', '🌟', '💻', '📱', '🎮', '💡', '🏆', '🎯', '💯', '🔥', '❤️', '💎', '🎉', '🚀', '👍', '🦆', '✨'
                ]).map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertEmoji(emoji)}
                    className="p-1 hover:scale-125 transition-transform flex items-center justify-center rounded-lg hover:bg-white/5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BotFather Quick Command Chips */}
      {isBotFather && (
        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-sky-400 shrink-0 bg-sky-500/10 px-2 py-1 rounded-lg">
            <Bot className="w-3.5 h-3.5" />
            <span>{isArabic ? 'أوامر سريعة:' : 'Commands:'}</span>
          </div>
          {botFatherCommands.map((c) => (
            <button
              key={c.cmd}
              onClick={() => handleSelectBotCommand(c.cmd)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#2481cc] hover:text-white text-sky-300 font-mono text-[11px] transition-colors border border-white/5"
              title={c.desc}
            >
              {c.cmd}
            </button>
          ))}
        </div>
      )}

      {/* Channel Unjoined Action Bar */}
      {activeChat?.type === 'channel' && activeChat.isMember === false ? (
        <div className="flex items-center justify-between gap-3 p-1 animate-in fade-in">
          <button
            onClick={handleChannelJoin}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#2481cc] hover:bg-[#1c6fad] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isArabic ? 'الانضمام إلى القناة' : 'JOIN CHANNEL'}</span>
          </button>
          <button
            onClick={() => toggleMuteChat(activeChat.id)}
            className={`p-3 rounded-2xl border transition-colors ${
              activeChat.isMuted
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                : 'bg-black/20 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
            title={isArabic ? 'كتم/إلغاء كتم الإشعارات' : 'Mute/Unmute notifications'}
          >
            {activeChat.isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </button>
        </div>
      ) : activeChat?.type === 'channel' && activeChat.isRestricted ? (
        /* Channel Admin-Only (Joined) Mute Bottom Bar */
        <div className="flex items-center justify-between gap-3 p-1 animate-in fade-in">
          <div className="flex-1 py-2.5 px-3 rounded-2xl bg-black/20 border border-white/5 flex items-center gap-2 text-xs text-gray-400">
            <Megaphone className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">
              {isArabic ? 'المشرفون فقط هم من يستطيعون النشر في هذه القناة' : 'Only admins can post in this channel'}
            </span>
          </div>
          <button
            onClick={() => toggleMuteChat(activeChat.id)}
            className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-colors shrink-0 ${
              activeChat.isMuted
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                : 'bg-[#2481cc]/20 border-[#2481cc]/40 text-sky-300 hover:bg-[#2481cc]/30'
            }`}
          >
            {activeChat.isMuted ? (
              <>
                <BellOff className="w-4 h-4" />
                <span>{isArabic ? 'إلغاء الكتم' : 'UNMUTE'}</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>{isArabic ? 'كتم الإشعارات' : 'MUTE'}</span>
              </>
            )}
          </button>
        </div>
      ) : !permissionCheck.canSend ? (
        /* Authentic Telegram Bottom Overlay Container */
        <div className="flex items-center justify-between gap-3 p-1 animate-in fade-in">
          <div className="flex-1 py-2.5 px-3 rounded-2xl bg-black/25 border border-white/10 flex items-center gap-2.5 text-xs text-gray-300">
            {ChatObject.isChannel(activeChat) ? (
              <Megaphone className="w-4 h-4 text-sky-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="truncate font-medium">{permissionCheck.reason}</span>
          </div>
          {ChatObject.isChannel(activeChat) && (
            <button
              onClick={() => toggleMuteChat(activeChat.id)}
              className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeChat.isMuted
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                  : 'bg-[#2481cc]/20 border-[#2481cc]/40 text-sky-300 hover:bg-[#2481cc]/30'
              }`}
            >
              {activeChat.isMuted ? (
                <>
                  <BellOff className="w-4 h-4" />
                  <span>{isArabic ? 'إلغاء الكتم' : 'UNMUTE'}</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>{isArabic ? 'كتم الإشعارات' : 'MUTE'}</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : activeChat?.requiresCaptcha && !activeChat.isCaptchaSolved ? (
        /* Captcha Verification Challenge Bar */
        <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex flex-col gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
            <ShieldAlert className="w-4 h-4 text-sky-400 animate-bounce" />
            <span>{activeChat.captchaQuestion || 'حماية ضد الروبوتات: الرجاء حل الكابتشا للمتابعة'}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-300">
              {isArabic ? 'اختر الإجابة الصحيحة:' : 'Select answer:'}
            </span>
            {activeChat.captchaOptions?.map((option) => (
              <button
                key={option}
                onClick={() => handleCaptchaChoice(option)}
                disabled={isSolvingCaptcha}
                className="px-3 py-1 rounded-xl bg-[#2481cc] hover:bg-[#1c6fad] text-white text-xs font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Main Input Control Bar */
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Attachment Button */}
          <button
            onClick={() => {
              setShowAttachMenu((prev) => !prev);
              setShowEmojiPicker(false);
            }}
            className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-sky-400 transition-colors shrink-0"
            title={isArabic ? 'إرفاق وسائط' : 'Attach media'}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input / Voice Recording View */}
          <div className="flex-1 min-w-0 relative flex items-center bg-black/20 rounded-2xl border border-white/10 focus-within:border-[#2481cc] transition-colors">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>
                    {isArabic ? 'جارٍ تسجيل الصوت...' : 'Recording audio...'}
                  </span>
                  <span className="font-mono text-white">
                    0:{recordDuration < 10 ? `0${recordDuration}` : recordDuration}
                  </span>
                  {isRecordLocked ? (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>{isArabic ? 'مقفل (حر اليدين)' : 'Locked'}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      {isArabic ? '← اسحب للإلغاء' : '← Slide to cancel'}
                    </span>
                  )}
                </div>
                <button
                  onClick={cancelRecording}
                  className="text-xs text-gray-400 hover:text-rose-400 underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إلغاء' : 'Cancel'}</span>
                </button>
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={(e) => updateTextAndDraft(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isSavedMessages
                      ? isArabic
                        ? 'احفظ ملاحظة أو رسالة في سحابة تيليجرام...'
                        : 'Save a note or file to your cloud storage...'
                      : isArabic
                      ? 'اكتب رسالة...'
                      : 'Write a message...'
                  }
                  className="w-full py-2.5 px-3 bg-transparent text-sm resize-none focus:outline-none max-h-32 placeholder:text-gray-500"
                  style={{
                    color: 'var(--tg-theme-bubble-in-text)',
                  }}
                />
                <button
                  onClick={() => {
                    setShowEmojiPicker((prev) => !prev);
                    setShowAttachMenu(false);
                  }}
                  className="p-2 text-gray-400 hover:text-amber-400 transition-colors shrink-0"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Send / Voice Button */}
          {text.trim() || editingMessage ? (
            <button
              onClick={handleSend}
              className="p-2.5 rounded-full bg-[#2481cc] hover:bg-[#1c6fad] text-white shadow-md transition-transform active:scale-95 shrink-0"
              title={editingMessage ? (isArabic ? 'حفظ التعديل' : 'Save edit') : (isArabic ? 'إرسال' : 'Send')}
            >
              {editingMessage ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5 rtl:ml-0 rtl:mr-0.5" />}
            </button>
          ) : isRecording ? (
            <button
              onClick={stopAndSendRecording}
              className="p-2.5 rounded-full bg-[#2481cc] hover:bg-sky-600 text-white shadow-md animate-pulse shrink-0"
              title={isArabic ? 'إرسال التسجيل الصوتي' : 'Send voice note'}
            >
              <Send className="w-5 h-5 ml-0.5 rtl:ml-0 rtl:mr-0.5" />
            </button>
          ) : (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('tg_toggle_dictation'))}
                className="p-2.5 rounded-full hover:bg-cyan-500/15 text-cyan-400/80 hover:text-cyan-300 active:scale-110 transition-all shrink-0 select-none"
                title={isArabic ? 'إملاء الرسائل صوتياً بدلاً من الكتابة (Web Speech API)' : 'Voice dictation (Speech to text)'}
              >
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </button>
              <button
                onClick={() => startRecording()}
                onTouchStart={(e) => startRecording(e)}
                onTouchMove={handleMicTouchMove}
                onTouchEnd={handleMicTouchEnd}
                onMouseDown={(e) => startRecording(e)}
                onMouseUp={handleMicTouchEnd}
                className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-sky-400 active:scale-110 active:text-[#2481cc] transition-all shrink-0 select-none"
                title={isArabic ? 'تسجيل رسالة صوتية (اضغط أو اسحب)' : 'Record voice note'}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
