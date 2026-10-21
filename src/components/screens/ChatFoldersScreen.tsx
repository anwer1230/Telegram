/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRight, FolderPlus, Folder, Trash2, Check, 
  MessageSquare, Users, Megaphone, Bot, Bookmark, Sparkles
} from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { ChatFolder, ChatType } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

export const ChatFoldersScreen: React.FC<Props> = ({ onBack }) => {
  const [folders, setFolders] = useState<ChatFolder[]>(telegramService.getFolders());
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ChatType[]>(['user', 'group']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const theme = telegramService.getThemeSettings();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    telegramService.addFolder(folderName.trim(), 'Folder', selectedTypes);
    setFolders(telegramService.getFolders());
    setFolderName('');
    setShowNewFolderModal(false);
    showToast("تم إنشاء المجلد السحابي الجديد بنجاح!");
  };

  const handleDeleteFolder = (folderId: string) => {
    telegramService.deleteFolder(folderId);
    setFolders(telegramService.getFolders());
    showToast("تم حذف المجلد");
  };

  const toggleType = (t: ChatType) => {
    if (selectedTypes.includes(t)) {
      setSelectedTypes(selectedTypes.filter(x => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-12">
      {/* Top Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">مجلدات المحادثات</h1>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Banner */}
        <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Folder className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-gray-100">تنظيم محادثاتك في مجلدات</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            أنشئ مجلدات مخصصة لمحادثات العمل، القنوات، العائلة، أو المجموعات للوصول السريع والتبديل السلس.
          </p>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="mt-3 py-2.5 px-6 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <FolderPlus className="w-4 h-4" />
            <span>إنشاء مجلد جديد</span>
          </button>
        </div>

        {/* قائمة المجلدات الحالية */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            المجلدات النشطة
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                {folder.isCustom ? (
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    title="حذف المجلد"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">افتراضي</span>
                )}

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-200 block">{folder.name}</span>
                    <span className="text-[11px] text-gray-400">
                      {folder.includedChatTypes.join(', ')}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Folder className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-sm w-full p-6 text-white space-y-4">
            <h3 className="text-base font-bold text-right text-gray-100">إنشاء مجلد محادثات جديد</h3>

            <div>
              <label className="text-xs text-teal-400 block text-right mb-1">اسم المجلد</label>
              <input
                type="text"
                placeholder="مثال: العمل، الأصدقاء..."
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full bg-[#0e1621] border border-[#242f3d] p-2.5 rounded-xl text-sm text-right text-white focus:outline-none focus:border-teal-400"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block text-right mb-2">أنواع المحادثات المشمولة:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { type: 'user' as ChatType, label: 'محادثات خاصة', icon: MessageSquare },
                  { type: 'group' as ChatType, label: 'المجموعات', icon: Users },
                  { type: 'channel' as ChatType, label: 'القنوات', icon: Megaphone },
                  { type: 'bot' as ChatType, label: 'البوتات', icon: Bot },
                ].map((item) => {
                  const isChecked = selectedTypes.includes(item.type);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => toggleType(item.type)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                        isChecked 
                          ? 'bg-teal-950/40 border-teal-400 text-teal-300' 
                          : 'bg-[#0e1621] border-[#242f3d] text-gray-400'
                      }`}
                    >
                      <span>{item.label}</span>
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-md"
                style={{ backgroundColor: theme.primaryColor }}
              >
                إنشاء المجلد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
