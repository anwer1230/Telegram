import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface NetworkTopStripProps {
  isOffline: boolean;
  networkStatus?: 'online' | 'offline' | 'reconnecting' | 'updating';
  isArabic: boolean;
  onRetry?: () => void;
  isAuthView?: boolean;
}

export const NetworkTopStrip: React.FC<NetworkTopStripProps> = ({
  isOffline,
  networkStatus = isOffline ? 'offline' : 'online',
  isArabic,
  onRetry,
  isAuthView = false,
}) => {
  const [showBackOnlineNotice, setShowBackOnlineNotice] = React.useState(false);
  const prevOfflineRef = React.useRef(isOffline);

  React.useEffect(() => {
    if (prevOfflineRef.current && !isOffline) {
      setShowBackOnlineNotice(true);
      const timer = setTimeout(() => {
        setShowBackOnlineNotice(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline]);

  const isVisible = isOffline || showBackOnlineNotice;
  const isReconnecting = networkStatus === 'reconnecting' || networkStatus === 'updating';

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={showBackOnlineNotice ? 'back-online' : 'offline-strip'}
          initial={{ height: 0, opacity: 0, y: -10 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -10 }}
          transition={{
            duration: 0.32,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="overflow-hidden select-none shrink-0 z-50 w-full"
        >
          <div
            id={isAuthView ? 'tg-offline-top-strip-auth' : 'tg-offline-top-strip'}
            role="status"
            aria-live="polite"
            className={`w-full px-3 py-1.5 flex items-center justify-between text-xs transition-colors duration-300 shadow-sm border-b ${
              showBackOnlineNotice
                ? 'bg-[#1b3d2b] border-emerald-500/40 text-emerald-200'
                : isReconnecting
                ? 'bg-[#162a3f] border-sky-500/40 text-sky-200'
                : 'bg-[#182533] border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {showBackOnlineNotice ? (
                <motion.div
                  initial={{ scale: 0.5, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </motion.div>
              ) : isReconnecting ? (
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
              ) : (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}

              <span className="font-medium text-[11px] sm:text-xs truncate">
                {showBackOnlineNotice
                  ? isArabic
                    ? 'تم استعادة الاتصال بنجاح • تم تحديث البيانات'
                    : 'Back Online • Synchronized with Telegram cloud'
                  : isReconnecting
                  ? isArabic
                    ? 'جارٍ الاتصال بسحابة تيليجرام وتحديث المحادثات...'
                    : 'Reconnecting to Telegram cloud...'
                  : isArabic
                  ? isAuthView
                    ? 'في انتظار الاتصال بالشبكة... (وضع عدم الاتصال)'
                    : 'في انتظار الاتصال بالشبكة... (وضع عدم الاتصال: عرض المحادثات المحفوظة محلياً)'
                  : isAuthView
                  ? 'Waiting for network... (Offline mode)'
                  : 'Waiting for network... (Offline mode: viewing cached chats & messages)'}
              </span>
            </div>

            {!showBackOnlineNotice && onRetry && !isAuthView && (
              <button
                type="button"
                onClick={onRetry}
                className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-[10px] sm:text-[11px] font-semibold text-white transition-colors cursor-pointer shrink-0 ml-2"
              >
                {isArabic ? 'إعادة المحاولة' : 'Retry'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
