import React from 'react';
import { useTelegram } from '../../context/TelegramContext';
import { RotateCcw } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useTelegram();

  if (toasts.length === 0) return null;

  // Strictly display at most 2 toasts simultaneously to prevent UI flooding
  const visibleToasts = toasts.slice(-2);

  return (
    <div
      id="tg-toast-container"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-2 pointer-events-none select-none max-w-md w-full px-4"
    >
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto px-4 py-2.5 rounded-full bg-[#182533]/95 text-white border border-white/10 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-full"
        >
          <div className="flex items-center gap-2 min-w-0">
            {toast.icon && <span className="shrink-0">{toast.icon}</span>}
            <span className="truncate">{toast.text}</span>
          </div>
          {toast.action && (
            <button
              id={`tg-toast-action-${toast.id}`}
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.onClick();
                dismissToast?.(toast.id);
              }}
              className="px-3 py-1 rounded-full bg-[#2481cc] hover:bg-[#1d6fa5] active:scale-95 text-white font-bold text-[11px] transition-all cursor-pointer shrink-0 shadow-md shadow-sky-950/40 flex items-center gap-1.5 ml-1 rtl:mr-1 rtl:ml-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{toast.action.label}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
