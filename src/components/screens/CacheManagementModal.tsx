/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, HardDrive, Trash2, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';
import { telegramService } from '../../services/telegramService';

interface Props {
  onClose: () => void;
}

export const CacheManagementModal: React.FC<Props> = ({ onClose }) => {
  const [dataSettings, setDataSettings] = useState(telegramService.getDataStorageSettings());
  const [isClearing, setIsClearing] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);
  const [keepMedia, setKeepMedia] = useState('forever');
  const [maxCache, setMaxCache] = useState('nolimit');

  const handleClearCache = () => {
    setIsClearing(true);
    setTimeout(() => {
      telegramService.clearCache();
      setDataSettings(telegramService.getDataStorageSettings());
      setIsClearing(false);
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#242f3d] pb-3">
          <button onClick={onClose} className="p-1 hover:bg-black/20 rounded-full text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-100">إدارة التخزين والذاكرة المؤقتة</h2>
            <HardDrive className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        {clearedSuccess && (
          <div className="p-3 bg-emerald-600/90 text-white text-center rounded-xl text-xs font-semibold flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم تفريغ الذاكرة المؤقتة واستعادة مساحة التخزين بنجاح!</span>
          </div>
        )}

        {/* Breakdown bar */}
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono text-teal-400 font-bold">{dataSettings.storageUsedMB.toFixed(2)} MB</span>
            <span>حجم الذاكرة المؤقتة الإجمالي:</span>
          </div>

          <div className="w-full h-3 bg-[#0e1621] rounded-full overflow-hidden flex border border-[#242f3d]">
            <div className="w-[45%] bg-blue-500" title="الصور" />
            <div className="w-[25%] bg-emerald-500" title="الفيديوهات" />
            <div className="w-[18%] bg-amber-500" title="الملفات" />
            <div className="w-[12%] bg-purple-500" title="الصوتيات" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-gray-300">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> صور (0.85 MB)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> فيديو (0.48 MB)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> ملفات (0.34 MB)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> صوت (0.23 MB)</span>
          </div>
        </div>

        {/* Clear Button */}
        <button
          onClick={handleClearCache}
          disabled={isClearing}
          className="w-full py-3 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isClearing ? 'جارٍ تفريغ الذاكرة...' : 'تفريغ الذاكرة المؤقتة الآن'}</span>
        </button>

        {/* Keep Media Selector */}
        <div className="space-y-2 text-right">
          <span className="text-xs font-semibold text-teal-400 block">الاحتفاظ بالوسائط (Keep Media)</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: '3d', label: '3 أيام' },
              { id: '1w', label: 'أسبوع' },
              { id: '1m', label: 'شهر' },
              { id: 'forever', label: 'دائمًا' },
            ].map((km) => (
              <button
                key={km.id}
                onClick={() => setKeepMedia(km.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  keepMedia === km.id ? 'bg-teal-500 text-white font-bold' : 'bg-[#0e1621] text-gray-400 hover:text-white'
                }`}
              >
                {km.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-500 text-center leading-relaxed">
          جميع الصور والملفات ستبقى محفوظة في سحابة تيليجرام الرسمية ويمكن إعادة تحميلها في أي وقت دون أن تفقدها.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium text-gray-200"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
