import React from 'react';
import { useTelegram } from '../../context/TelegramContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useTelegram();

  if (toasts.length === 0) return null;

  // Strictly display at most 2 toasts simultaneously to prevent UI flooding
  const visibleToasts = toasts.slice(-2);

  return (
    <div
      id="tg-toast-container"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none select-none max-w-md w-full px-4"
    >
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className="px-4 py-2.5 rounded-full bg-[#182533]/95 text-white border border-white/10 shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-full text-center"
        >
          {toast.icon && <span className="shrink-0">{toast.icon}</span>}
          <span className="truncate">{toast.text}</span>
        </div>
      ))}
    </div>
  );
};
