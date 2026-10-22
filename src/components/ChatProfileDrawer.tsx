/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, Bell, BellOff, Search, Share2, MoreVertical, 
  Phone, AtSign, Info, Users, Image as ImageIcon, FileText, 
  Link2, Mic, Music, ShieldCheck, Sparkles, Check, Copy,
  UserPlus, LogOut, Trash2
} from 'lucide-react';
import { ChatItem, ChatMessage } from '../types/telegram';
import { telegramService } from '../services/telegramService';

interface Props {
  chat: ChatItem;
  isOpen: boolean;
  onClose: () => void;
  onSearchInChat: () => void;
  onClearHistory: () => void;
}

type TabKey = 'media' | 'files' | 'links' | 'voice' | 'members';

export const ChatProfileDrawer: React.FC<Props> = ({
  chat,
  isOpen,
  onClose,
  onSearchInChat,
  onClearHistory
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('media');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(chat.isMuted || false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const theme = telegramService.getThemeSettings();

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleMute = () => {
    const newState = telegramService.toggleMuteChat(chat.id);
    setIsMuted(newState);
  };

  // استخراج الوسائط والملفات والروابط الحقيقية من رسائل المحادثة الفعلية
  const chatMessages = telegramService.getMessages(chat.id);
  const actualMedia = chatMessages
    .filter(m => m.mediaType === 'photo' && m.mediaUrl)
    .map(m => m.mediaUrl as string);

  const actualFiles = chatMessages
    .filter(m => m.mediaType === 'file')
    .map(m => ({
      name: m.mediaName || 'ملف مرفق',
      size: m.mediaSize || '1.2 MB',
      date: m.timestamp
    }));

  const actualLinks = chatMessages
    .filter(m => m.text && (m.text.includes('http://') || m.text.includes('https://')))
    .map(m => {
      const match = m.text.match(/(https?:\/\/[^\s]+)/g);
      return match ? { url: match[0], title: match[0].replace(/https?:\/\//, '').split('/')[0], date: m.timestamp } : null;
    })
    .filter(Boolean) as { url: string; title: string; date: string }[];

  const currentUser = telegramService.getCurrentUser();
  const actualMembers = [
    {
      id: currentUser.id,
      name: currentUser.name || `${currentUser.firstName} ${currentUser.lastName || ''}`.trim(),
      role: 'owner',
      isOnline: true,
      avatar: currentUser.avatar
    }
  ];

  const filteredMembers = actualMembers.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 md:relative md:z-20 md:w-[380px] lg:w-[420px] md:flex-shrink-0 h-full bg-[#17212b] md:border-r border-[#242f3d] flex flex-col shadow-2xl animate-fade-in select-none overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#242f3d] bg-[#17212b] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white">
            {chat.type === 'group' ? 'معلومات المجموعة' : chat.type === 'channel' ? 'معلومات القناة' : 'معلومات المحادثة'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <button 
            onClick={onSearchInChat}
            className="p-1.5 hover:bg-white/10 rounded-full hover:text-white transition-colors"
            title="بحث في المحادثة"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleCopy(`https://t.me/${chat.username || 'telegram'}`, 'share')}
            className="p-1.5 hover:bg-white/10 rounded-full hover:text-white transition-colors"
            title="مشاركة رابط المحادثة"
          >
            {copiedField === 'share' ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto w-full">
        {/* Profile Banner & Avatar */}
        <div className="p-6 flex flex-col items-center justify-center text-center border-b border-[#242f3d] bg-gradient-to-b from-black/25 to-transparent w-full">
          <div className="relative mb-3 mx-auto">
            <img
              src={chat.avatar}
              alt={chat.title}
              className="w-24 h-24 rounded-full object-cover shadow-xl border-2 border-teal-500/30 mx-auto"
            />
            {chat.isOnline && (
              <span className="absolute bottom-1 left-1 w-4 h-4 bg-emerald-400 border-2 border-[#17212b] rounded-full" />
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1 w-full px-4 text-center">
            <h2 className="text-lg font-bold text-white text-center break-words max-w-full leading-snug">{chat.title}</h2>
            {chat.isVerified && <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />}
          </div>

          <p className="text-xs text-gray-400 text-center w-full">
            {chat.type === 'saved' 
              ? 'سحابة تيليجرام الرسمية غير المحدودة' 
              : chat.membersCount 
              ? `${chat.membersCount.toLocaleString('ar-SA')} عضواً` 
              : chat.isOnline 
              ? 'متصل الآن' 
              : 'آخر ظهور قريباً'}
          </p>

          {/* Quick Actions (Mute, Search, Clear) */}
          <div className="flex items-center justify-center gap-6 mt-5 w-full mx-auto">
            <button
              onClick={handleToggleMute}
              className="flex flex-col items-center gap-1.5 text-xs text-gray-300 hover:text-teal-400 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-teal-400'
              }`}>
                {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </div>
              <span className="text-[11px]">{isMuted ? 'مكتوم' : 'كتم'}</span>
            </button>

            <button
              onClick={onSearchInChat}
              className="flex flex-col items-center gap-1.5 text-xs text-gray-300 hover:text-teal-400 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 text-teal-400 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[11px]">بحث</span>
            </button>

            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex flex-col items-center gap-1.5 text-xs text-gray-300 hover:text-red-400 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-[11px]">مسح المحادثة</span>
            </button>
          </div>
        </div>

        {/* Details List */}
        <div className="p-4 space-y-4 border-b border-[#242f3d]">
          {/* Bio / Description */}
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-right flex-1">
              <span className="text-[11px] text-gray-400 block mb-0.5">الوصف / النبذة</span>
              <p className="text-xs text-gray-200 leading-relaxed">
                {chat.bio || (chat.type === 'saved' 
                  ? 'مساحتك التخزينية السحابية الخاصة لحفظ المسودات، الرسائل، الوسائط، والروابط المشفرة.'
                  : 'محادثة مشفرة ومتصلة بسحابة تيليجرام الرسمية.')}
              </p>
            </div>
          </div>

          {/* Username */}
          <div 
            onClick={() => handleCopy(`@${chat.username || chat.id}`, 'username')}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <AtSign className="w-5 h-5 text-gray-400" />
              <div className="text-right">
                <span className="text-[11px] text-gray-400 block">اسم المستخدم</span>
                <span className="text-xs font-mono text-teal-400 font-semibold">
                  @{chat.username || chat.id.replace('chat_', '')}
                </span>
              </div>
            </div>
            {copiedField === 'username' ? (
              <span className="text-[10px] text-emerald-400 font-bold">تم النسخ</span>
            ) : (
              <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
            )}
          </div>

          {/* Phone if user */}
          {chat.phone && (
            <div 
              onClick={() => handleCopy(chat.phone || '', 'phone')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block">رقم الهاتف</span>
                  <span className="text-xs font-mono text-gray-200">{chat.phone}</span>
                </div>
              </div>
              {copiedField === 'phone' ? (
                <span className="text-[10px] text-emerald-400 font-bold">تم النسخ</span>
              ) : (
                <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
              )}
            </div>
          )}

          {/* Encryption Badge */}
          <div className="p-3 bg-[#0e1621] rounded-xl border border-teal-500/20 flex items-center gap-3 text-xs text-teal-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold block">التشفير السحابي الموثق</span>
              <span className="text-[10px] text-gray-400">Telegram MTProto Protocol • AES-256</span>
            </div>
          </div>
        </div>

        {/* Shared Media Tabs (Official Telegram Web K/A Tabs) */}
        <div>
          <div className="flex items-center border-b border-[#242f3d] bg-[#17212b] px-2 text-xs font-medium">
            <button
              onClick={() => setActiveTab('media')}
              className={`py-3 px-3 flex-1 text-center transition-colors relative ${
                activeTab === 'media' ? 'text-teal-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              وسائط
              {activeTab === 'media' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`py-3 px-3 flex-1 text-center transition-colors relative ${
                activeTab === 'files' ? 'text-teal-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              ملفات
              {activeTab === 'files' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={`py-3 px-3 flex-1 text-center transition-colors relative ${
                activeTab === 'links' ? 'text-teal-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              روابط
              {activeTab === 'links' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />}
            </button>

            {chat.type === 'group' && (
              <button
                onClick={() => setActiveTab('members')}
                className={`py-3 px-3 flex-1 text-center transition-colors relative ${
                  activeTab === 'members' ? 'text-teal-400 font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                الأعضاء
                {activeTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />}
              </button>
            )}
          </div>

          {/* Tab Panes */}
          <div className="p-4">
            {activeTab === 'media' && (
              actualMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {actualMedia.map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10 group relative cursor-pointer">
                      <img src={img} alt="media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  لا توجد وسائط مرسلة في هذه المحادثة حتى الآن
                </div>
              )
            )}

            {activeTab === 'files' && (
              actualFiles.length > 0 ? (
                <div className="space-y-2">
                  {actualFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-xs font-semibold text-gray-200 truncate">{file.name}</p>
                        <span className="text-[10px] text-gray-400">{file.size} • {file.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  لا توجد ملفات مرفقة في هذه المحادثة حتى الآن
                </div>
              )
            )}

            {activeTab === 'links' && (
              actualLinks.length > 0 ? (
                <div className="space-y-2">
                  {actualLinks.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors block text-right"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                        <Link2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-teal-400 truncate">{link.title}</p>
                        <span className="text-[10px] text-gray-400 truncate block">{link.url}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  لا توجد روابط مشتركة في هذه المحادثة حتى الآن
                </div>
              )
            )}

            {activeTab === 'members' && chat.type === 'group' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="بحث في الأعضاء..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#242f3d] py-1.5 px-3 rounded-xl text-xs text-white text-right focus:outline-none focus:border-teal-400"
                />

                <div className="space-y-1.5">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                          {member.isOnline && (
                            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-400 border border-[#17212b] rounded-full" />
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-200 block">{member.name}</span>
                          <span className="text-[10px] text-gray-400">{member.isOnline ? 'متصل الآن' : 'غير متصل'}</span>
                        </div>
                      </div>

                      {member.role === 'owner' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">المالك</span>
                      ) : member.role === 'admin' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold">مشرف</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clear History */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#242f3d] rounded-2xl p-5 max-w-sm w-full text-right shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">هل أنت متأكد من مسح المحادثة؟</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              سيتم حذف جميع الرسائل في هذه المحادثة من سحابة تيليجرام نهائياً.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setShowConfirmDelete(false);
                }}
                className="px-4 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                مسح الرسائل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
