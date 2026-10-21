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

  // Mock members for group/channel
  const membersList = [
    { id: 'm1', name: 'أنت (مالك المجموعة)', role: 'owner', isOnline: true, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
    { id: 'm2', name: 'Telegram Service Bot', role: 'admin', isOnline: true, avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100' },
    { id: 'm3', name: 'مهندس السحابة MTProto', role: 'admin', isOnline: true, avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100' },
    { id: 'm4', name: 'عبدالله السعدي', role: 'member', isOnline: false, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { id: 'm5', name: 'سارة الأحمد', role: 'member', isOnline: true, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { id: 'm6', name: 'فهد التميمي', role: 'member', isOnline: false, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
  ];

  const filteredMembers = membersList.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Mock media files for Shared Media Tabs
  const mockMedia = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300',
    'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=300',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
  ];

  const mockFiles = [
    { name: 'MTProto_Client_Configuration.json', size: '24.5 KB', date: '21 أكتوبر 2026' },
    { name: 'telegram_api_keys_34773007.pem', size: '4.2 KB', date: '20 أكتوبر 2026' },
    { name: 'Render_Deployment_Guide.pdf', size: '1.2 MB', date: '19 أكتوبر 2026' },
  ];

  const mockLinks = [
    { title: 'مستودع تيليجرام الرسمي', url: 'https://github.com/anwer1230/Telegram', date: 'أمس' },
    { title: 'بوابة مطوري تيليجرام الرسمية', url: 'https://core.telegram.org/api', date: 'منذ 3 أيام' },
    { title: 'Telegram Web Application', url: 'https://web.telegram.org/k', date: 'الأسبوع الماضي' },
  ];

  return (
    <div className="w-full md:w-[380px] lg:w-[400px] h-full bg-[#17212b] border-r border-[#242f3d] flex flex-col z-20 shadow-2xl animate-fade-in select-none">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#242f3d] bg-[#17212b]">
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
      <div className="flex-1 overflow-y-auto">
        {/* Profile Banner & Avatar */}
        <div className="p-6 flex flex-col items-center text-center border-b border-[#242f3d] bg-gradient-to-b from-black/20 to-transparent">
          <div className="relative mb-3">
            <img
              src={chat.avatar}
              alt={chat.title}
              className="w-24 h-24 rounded-full object-cover shadow-xl border-2 border-teal-500/30"
            />
            {chat.isOnline && (
              <span className="absolute bottom-1 left-1 w-4 h-4 bg-emerald-400 border-2 border-[#17212b] rounded-full" />
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-lg font-bold text-white max-w-[280px] truncate">{chat.title}</h2>
            {chat.isVerified && <Sparkles className="w-4 h-4 text-amber-300" />}
          </div>

          <p className="text-xs text-gray-400">
            {chat.type === 'saved' 
              ? 'سحابة تيليجرام الرسمية غير المحدودة' 
              : chat.membersCount 
              ? `${chat.membersCount.toLocaleString('ar-SA')} عضواً` 
              : chat.isOnline 
              ? 'متصل الآن' 
              : 'آخر ظهور قريباً'}
          </p>

          {/* Quick Actions (Mute, Search, Clear) */}
          <div className="flex items-center justify-center gap-6 mt-5 w-full">
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
              <div className="grid grid-cols-3 gap-1.5">
                {mockMedia.map((img, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10 group relative cursor-pointer">
                    <img src={img} alt="media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-2">
                {mockFiles.map((file, i) => (
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
            )}

            {activeTab === 'links' && (
              <div className="space-y-2">
                {mockLinks.map((link, i) => (
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
