import React from 'react';
import { LogOut, X } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export interface LeaveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
  chatType?: 'private' | 'group' | 'channel' | 'bot' | 'supergroup';
  onConfirm: () => void;
}

export const LeaveChatModal: React.FC<LeaveChatModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatTitle,
  chatType = 'group',
  onConfirm,
}) => {
  const { settings } = useTelegram();
  const isArabic = settings.language === 'ar';
  const isChannel = chatType === 'channel';

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
              <LogOut className="w-5 h-5 rtl:rotate-180" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isChannel
                  ? isArabic ? 'مغادرة القناة' : 'Leave Channel'
                  : isArabic ? 'مغادرة المجموعة' : 'Leave Group'}
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
          {isChannel
            ? isArabic
              ? 'هل أنت متأكد من أنك تريد مغادرة هذه القناة؟ لن تتلقى أي منشورات أو إشعارات جديدة منها.'
              : 'Are you sure you want to leave this channel? You will no longer receive any updates.'
            : isArabic
              ? 'هل أنت متأكد من رغبتك في مغادرة هذه المجموعة؟ لن تتمكن من إرسال أو استقبال الرسائل بعد مغادرتها.'
              : 'Are you sure you want to leave this group? You will no longer be able to send or receive messages.'}
        </p>

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
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition-all active:scale-95"
          >
            {isChannel
              ? isArabic ? 'مغادرة القناة' : 'Leave Channel'
              : isArabic ? 'مغادرة المجموعة' : 'Leave Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
