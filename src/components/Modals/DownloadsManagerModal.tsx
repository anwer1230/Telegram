import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../context/TelegramContext';
import {
  Download,
  Upload,
  Pause,
  Play,
  X,
  CheckCircle2,
  HardDrive,
  FileText,
  Zap,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { downloadController } from '../../core/messenger/DownloadController';
import { ChunkedTransferProgress } from '../../types';

export const DownloadsManagerModal: React.FC = () => {
  const { activeModal, setActiveModal, settings, showToast } = useTelegram();
  const [transfers, setTransfers] = useState<ChunkedTransferProgress[]>([]);
  const isArabic = settings.language === 'ar';

  useEffect(() => {
    if (activeModal !== ('downloads-manager' as any)) return;

    const interval = setInterval(() => {
      setTransfers(downloadController.getActiveTransfers());
    }, 300);

    return () => clearInterval(interval);
  }, [activeModal]);

  if (activeModal !== ('downloads-manager' as any)) return null;

  const handleStartTestDownload = () => {
    const fileId = `chunk_demo_${Date.now()}`;
    const fileSize = 16 * 1024 * 1024; // 16 MB demo file
    downloadController.startChunkedDownload(
      fileId,
      'Telegram_4K_Video_Documentary.mp4',
      fileSize,
      512 * 1024
    );
    showToast(
      isArabic
        ? 'تم بدء تنزيل تجريبي بنظام الأجزاء المتدفقة (512KB Chunks) 🚀'
        : 'Started chunked streaming download (512KB Chunks) 🚀',
      '⚡'
    );
  };

  const handleStartTestUpload = () => {
    // Synthetic file upload
    const blob = new Blob([new Uint8Array(10 * 1024 * 1024)], { type: 'application/octet-stream' });
    const file = new File([blob], 'Client_Database_Dump_2026.sqlite', { type: 'application/octet-stream' });
    downloadController.startChunkedUpload(file, 256 * 1024);
    showToast(
      isArabic
        ? 'تم بدء رفع الملف بنظام الأجزاء الكبيرة (upload.saveBigFilePart) 📤'
        : 'Started upload with MTProto upload.saveBigFilePart 📤',
      '📤'
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      id="modal-downloads-manager"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      dir={isArabic ? 'rtl' : 'ltr'}
      onClick={() => setActiveModal('none')}
    >
      <div
        className="w-full max-w-xl bg-[#17212b] border border-white/10 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between bg-[#1e2c3a]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#2481cc]/20 text-[#2481cc] flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isArabic ? 'إدارة التنزيلات والوسائط الضخمة' : 'Downloads & Chunked Media Manager'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {isArabic ? 'نظام الأجزاء المتدفقة (MTProto upload.getFile / 512KB Chunks)' : 'MTProto Parallel Chunk Streaming'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-gray-300">
            {isArabic ? 'دعم تدفق وتنزيل ملفات حتى 2GB/4GB' : 'Supports streaming & resume up to 4GB'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartTestDownload}
              className="px-3 py-1.5 rounded-xl bg-[#2481cc] hover:bg-[#1c70b4] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تنزيل تجريبي (Stream)' : 'Test Download'}</span>
            </button>
            <button
              onClick={handleStartTestUpload}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isArabic ? 'رفع تجريبي (BigFile)' : 'Test Upload'}</span>
            </button>
          </div>
        </div>

        {/* Transfer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <HardDrive className="w-10 h-10 mx-auto text-gray-500 opacity-50" />
              <p className="text-sm font-semibold">
                {isArabic ? 'لا توجد تنزيلات أو وسائط جارية حالياً' : 'No active chunked transfers'}
              </p>
              <p className="text-xs text-gray-500">
                {isArabic
                  ? 'اضغط على زر التنزيل التجريبي بالأعلى لاختبار نظام الأجزاء المتدفقة'
                  : 'Click the test buttons above to simulate MTProto parallel chunk transfer'}
              </p>
            </div>
          ) : (
            transfers.map((item) => {
              const pct = Math.round((item.completedParts / item.totalParts) * 100);
              const speedMB = (item.speedBytesPerSec / (1024 * 1024)).toFixed(2);

              return (
                <div
                  key={item.fileId}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
                        {item.status === 'uploading' ? (
                          <Upload className="w-4 h-4 text-emerald-400" />
                        ) : item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Download className="w-4 h-4 text-sky-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-xs">
                          {item.fileName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {formatBytes(item.transferredBytes)} / {formatBytes(item.fileSize)} •{' '}
                          {item.completedParts}/{item.totalParts} parts
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'downloading' && (
                        <button
                          onClick={() => downloadController.pauseTransfer(item.fileId)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status === 'paused' && (
                        <button
                          onClick={() => downloadController.resumeTransfer(item.fileId)}
                          className="p-1.5 rounded-lg bg-[#2481cc]/30 text-sky-400"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => downloadController.cancelTransfer(item.fileId)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        item.status === 'completed'
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-[#2481cc] to-sky-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-mono">{pct}% مكتمل</span>
                    {item.status === 'downloading' || item.status === 'uploading' ? (
                      <span className="font-mono text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        {speedMB} MB/s
                      </span>
                    ) : item.status === 'completed' ? (
                      <span className="text-emerald-400 font-bold">جاهز للاستخدام ✔</span>
                    ) : (
                      <span className="text-amber-400">متوقف مؤقتاً</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
