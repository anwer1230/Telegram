import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Check } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export interface ClearChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
  chatType?: 'private' | 'group' | 'channel' | 'bot' | 'supergroup';
  onConfirm: (alsoForOthers: boolean) => void;
}

export const ClearChatModal: React.FC<ClearChatModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatTitle,
  chatType = 'group',
  onConfirm,
}) => {
  const { settings } = useTelegram();
  const isArabic = settings.language === 'ar';
  const isGroupOrChannel = chatType === 'group' || chatType === 'supergroup' || chatType === 'channel';

  const [alsoForEveryone, setAlsoForEveryone] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#17212b] border border-[#2b394a] rounded-2xl p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isArabic ? 'مسح سجل المحادثة' : 'Clear Chat History'}
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-[200px]">
                {chatTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          {isGroupOrChannel
            ? isArabic
              ? 'هل أنت متأكد من رغبتك في تفريغ ومسح سجل الرسائل في هذه المجموعة؟ لا يمكن التراجع عن هذا الإجراء.'
              : 'Are you sure you want to clear the message history in this group? This action cannot be undone.'
            : isArabic
              ? 'هل أنت متأكد من رغبتك في مسح جميع الرسائل في هذه المحادثة؟'
              : 'Are you sure you want to clear all history from this chat?'}
        </p>

        {/* Checkbox for deleting for everyone */}
        {isGroupOrChannel && (
          <label
            onClick={() => setAlsoForEveryone(!alsoForEveryone)}
            className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer bg-[#242f3d]/50 hover:bg-[#242f3d] border border-white/5 transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                alsoForEveryone
                  ? 'border-[#2481cc] bg-[#2481cc]'
                  : 'border-gray-500 bg-transparent'
              }`}
            >
              {alsoForEveryone && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
            <span className="text-xs text-gray-200 font-medium select-none">
              {isArabic
                ? 'حذف أيضاً لجميع الأعضاء الآخرين'
                : 'Also clear for all other members'}
            </span>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2b394a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(alsoForEveryone);
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition-all active:scale-95"
          >
            {isArabic ? 'مسح السجل' : 'Clear History'}
          </button>
        </div>
      </div>
    </div>
  );
};
