/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { action: 'البحث السريع في المحادثات', keys: ['Ctrl', 'K'] },
  { action: 'بدء محادثة جديدة', keys: ['Ctrl', 'N'] },
  { action: 'الانتقال إلى المحادثة التالية', keys: ['Alt', '↓'] },
  { action: 'الانتقال إلى المحادثة السابقة', keys: ['Alt', '↑'] },
  { action: 'إغلاق المحادثة الحالية', keys: ['Esc'] },
  { action: 'فتح قائمة الإعدادات', keys: ['Ctrl', ','] },
  { action: 'كتم / إلغاء كتم الإشعارات', keys: ['Ctrl', 'Shift', 'M'] },
  { action: 'التركيز على حقل الكتابة', keys: ['Ctrl', '/'] },
];

export const KeyboardShortcutsModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-[#242f3d] pb-4 mb-4">
          <button onClick={onClose} className="p-1 hover:bg-black/20 rounded-full text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-100">اختصارات لوحة المفاتيح</h2>
            <Keyboard className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {SHORTCUTS.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#0e1621] border border-[#242f3d]">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {item.keys.map((k, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-[#242f3d] text-teal-300 border border-gray-600 font-bold">
                    {k}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-300 font-medium text-right">{item.action}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm"
        >
          حسناً، فهمت
        </button>
      </div>
    </div>
  );
};
