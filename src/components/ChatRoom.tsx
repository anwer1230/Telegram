/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Phone, Video, Search, MoreVertical, Paperclip, 
  Smile, Mic, Send, ShieldCheck, Check, CheckCheck, Play, 
  Pause, Cloud, Sparkles, X, Image as ImageIcon, FileText
} from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { ChatItem, ChatMessage } from '../types/telegram';

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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const theme = telegramService.getThemeSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = telegramService.subscribe(() => {
      setMessages(telegramService.getMessages(chat.id));
    });
    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording timer
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    await telegramService.sendMessage(chat.id, text);
  };

  const handleSendVoice = async () => {
    setIsRecordingVoice(false);
    await telegramService.sendMessage(
      chat.id, 
      `رسالة صوتية (${recordingSeconds} ثانية) 🎙️`, 
      'voice',
      undefined
    );
  };

  const handleSendImageSample = async () => {
    setShowAttachMenu(false);
    await telegramService.sendMessage(
      chat.id,
      'صورة سحابية تم رفعها إلى سحابة تيليجرام 📸',
      'photo',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80'
    );
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    telegramService.addReaction(chat.id, msgId, emoji);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white">
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
          <button className="p-1.5 hover:bg-black/10 rounded-full">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-1.5 hover:bg-black/10 rounded-full">
            <Search className="w-5 h-5" />
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
                  <div className="rounded-lg overflow-hidden mb-2">
                    <img src={msg.mediaUrl} alt="Photo" className="w-full max-h-60 object-cover" />
                  </div>
                )}

                {/* Voice player if present */}
                {msg.mediaType === 'voice' && (
                  <div className="flex items-center gap-2 my-1 bg-black/20 p-2 rounded-lg">
                    <button
                      onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                      className="w-8 h-8 rounded-full bg-white text-teal-800 flex items-center justify-center shadow"
                    >
                      {playingVoiceId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-white transition-all ${
                          playingVoiceId === msg.id ? 'w-full duration-3000' : 'w-1/3'
                        }`} 
                      />
                    </div>
                    <span className="text-[10px] opacity-80">0:14</span>
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

      {/* Attachment Menu Popover */}
      {showAttachMenu && (
        <div className="p-3 bg-[#17212b] border-t border-[#242f3d] flex items-center justify-around animate-fade-in text-xs">
          <button 
            onClick={handleSendImageSample}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-teal-400"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span>صورة أو فيديو</span>
          </button>

          <button 
            onClick={async () => {
              setShowAttachMenu(false);
              await telegramService.sendMessage(chat.id, 'ملف مستند سحابي: Document_Backup.pdf (2.4 MB) 📁', 'file');
            }}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-teal-400"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span>ملف ومستند</span>
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

        {/* Text Input */}
        <div className="flex-1 relative">
          {isRecordingVoice ? (
            <div className="w-full py-2 px-4 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-between text-red-400 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>جارٍ تسجيل الصوت... 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
              </div>
              <button 
                onClick={() => setIsRecordingVoice(false)}
                className="text-xs text-gray-400 hover:text-white"
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
          className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
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
            onClick={handleSendVoice}
            className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md transition-transform active:scale-90 animate-pulse"
          >
            <Check className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsRecordingVoice(true)}
            className="w-10 h-10 rounded-full bg-[#242f3d] hover:bg-[#2b394a] flex items-center justify-center text-gray-300 transition-transform active:scale-90"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
