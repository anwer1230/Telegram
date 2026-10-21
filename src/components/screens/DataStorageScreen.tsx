/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, PieChart, BarChart2, HardDrive, Shield, Check, Trash2 } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { DataStorageSettings } from '../../types/telegram';

interface Props {
  onBack: () => void;
  onOpenCloudModal: () => void;
  onOpenCacheModal: () => void;
}

export const DataStorageScreen: React.FC<Props> = ({ onBack, onOpenCloudModal, onOpenCacheModal }) => {
  const [dataSettings, setDataSettings] = useState<DataStorageSettings>(telegramService.getDataStorageSettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const theme = telegramService.getThemeSettings();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updateSetting = (key: keyof DataStorageSettings, val: any) => {
    const updated = { ...dataSettings, [key]: val };
    setDataSettings(updated);
    telegramService.saveDataStorageSettings(updated);
  };

  const handleClearDrafts = () => {
    telegramService.clearCloudDrafts();
    showToast("تم حذف جميع المسودات السحابية بنجاح ☁️");
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1621] text-white overflow-y-auto pb-12">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 shadow-md"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">البيانات والتخزين</h1>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* استخدام التخزين والشبكة */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            استخدام التخزين والشبكة
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            {/* استخدام التخزين */}
            <div 
              onClick={onOpenCacheModal}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
            >
              <span className="text-xs text-gray-400">MB {dataSettings.storageUsedMB.toFixed(2)}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">استخدام التخزين</span>
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* استهلاك البيانات */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">GB {dataSettings.dataUsedGB.toFixed(2)}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">استهلاك البيانات</span>
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* مسار التخزين */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">{dataSettings.storagePath}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-200">مسار التخزين</span>
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* تنزيل الوسائط تلقائياً */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            تنزيل الوسائط تلقائيًا
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSetting('autoDownloadMobile', !dataSettings.autoDownloadMobile)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dataSettings.autoDownloadMobile ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">{dataSettings.autoDownloadMobile ? 'مفعل' : 'معطّل'}</span>
              </div>
              <span className="text-sm text-gray-200">عند استخدام بيانات الجوال</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSetting('autoDownloadWifi', !dataSettings.autoDownloadWifi)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dataSettings.autoDownloadWifi ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">{dataSettings.autoDownloadWifi ? 'مفعل' : 'معطّل'}</span>
              </div>
              <span className="text-sm text-gray-200">عند الاتصال بالواي فاي</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSetting('autoDownloadRoaming', !dataSettings.autoDownloadRoaming)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dataSettings.autoDownloadRoaming ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">{dataSettings.autoDownloadRoaming ? 'مفعل' : 'معطّل'}</span>
              </div>
              <span className="text-sm text-gray-200">عند التجوال</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center pt-1 cursor-pointer hover:text-teal-400">
            "إعادة تعيين إعدادات التنزيل التلقائي"
          </p>
        </div>

        {/* حفظ في المعرض */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            حفظ في المعرض
          </span>

          <div className="bg-[#17212b] rounded-2xl divide-y divide-[#242f3d] border border-[#242f3d]">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSetting('saveToGalleryPrivate', !dataSettings.saveToGalleryPrivate)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dataSettings.saveToGalleryPrivate ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">{dataSettings.saveToGalleryPrivate ? 'On' : 'Off'}</span>
              </div>
              <span className="text-sm text-gray-200">Private Chats</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSetting('saveToGalleryGroups', !dataSettings.saveToGalleryGroups)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dataSettings.saveToGalleryGroups ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">{dataSettings.saveToGalleryGroups ? 'On' : 'Off'}</span>
              </div>
              <span className="text-sm text-gray-200">Groups</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSetting('saveToGalleryChannels', !dataSettings.saveToGalleryChannels)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dataSettings.saveToGalleryChannels ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
                <span className="text-xs text-gray-400">{dataSettings.saveToGalleryChannels ? 'On' : 'Off'}</span>
              </div>
              <span className="text-sm text-gray-200">Channels</span>
            </div>
          </div>
        </div>

        {/* البث */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            البث
          </span>

          <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => updateSetting('streamMediaBeforeDownload', !dataSettings.streamMediaBeforeDownload)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  dataSettings.streamMediaBeforeDownload ? 'bg-teal-500 justify-end' : 'bg-gray-600 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
              <span className="text-sm text-gray-200">تشغيل الوسائط قبل تنزيلها</span>
            </div>
            <p className="text-xs text-gray-400 text-right leading-relaxed">
              عندما يكون ذلك ممكناً؛ سيبدأ تيليجرام بتشغيل المقاطع المرئية والصوتية على الفور، دون انتظار اكتمال تنزيل الملفات.
            </p>
          </div>
        </div>

        {/* المكالمات */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            المكالمات
          </span>
          <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between">
            <span className="text-xs text-teal-400">فقط عند التجوال</span>
            <span className="text-sm text-gray-200">توفير بيانات المكالمات</span>
          </div>
        </div>

        {/* بروكسي */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            بروكسي
          </span>
          <div 
            onClick={onOpenCloudModal}
            className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between cursor-pointer hover:bg-white/5"
          >
            <Shield className="w-5 h-5 text-teal-400" />
            <span className="text-sm text-gray-200">إعدادات الخادم الوسيط (MTProxy)</span>
          </div>
        </div>

        {/* حذف جميع المسودات السحابية */}
        <button
          onClick={handleClearDrafts}
          className="w-full py-3 px-4 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 rounded-2xl flex items-center justify-center gap-2 text-red-400 text-sm font-semibold transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>حذف جميع المسودات السحابية</span>
        </button>
      </div>
    </div>
  );
};
