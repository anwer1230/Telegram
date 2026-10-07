import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { storageCloudBackupService, StorageCloudBackupStatus } from '../../services/StorageCloudBackupService';
import { useTelegram } from '../../context/TelegramContext';

export const StoriesSettingsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <div className="p-4">
    {onBack && (
      <button onClick={onBack} className="text-sm text-sky-400 mb-4">
        ← رجوع
      </button>
    )}
    <h3 className="font-bold text-white mb-2">إعدادات القصص (Stories)</h3>
    <p className="text-gray-400 text-sm">إعدادات الخصوصية والتحكم في القصص</p>
  </div>
);

export const MessagesSettingsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <div className="p-4">
    {onBack && (
      <button onClick={onBack} className="text-sm text-sky-400 mb-4">
        ← رجوع
      </button>
    )}
    <h3 className="font-bold text-white mb-2">إعدادات الرسائل</h3>
    <p className="text-gray-400 text-sm">خيارات إرسال الرسائل والمحادثات المباشرة</p>
  </div>
);

export const TopicsSettingsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <div className="p-4">
    {onBack && (
      <button onClick={onBack} className="text-sm text-sky-400 mb-4">
        ← رجوع
      </button>
    )}
    <h3 className="font-bold text-white mb-2">إعدادات المواضيع (Topics)</h3>
    <p className="text-gray-400 text-sm">إدارة مواضيع المجموعات العامة والخاصة</p>
  </div>
);

export const SharedMediaView: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <div className="p-4">
    {onBack && (
      <button onClick={onBack} className="text-sm text-sky-400 mb-4">
        ← رجوع
      </button>
    )}
    <h3 className="font-bold text-white mb-2">الوسائط المشتركة</h3>
    <p className="text-gray-400 text-sm">عرض الوسائط والمستندات والروابط</p>
  </div>
);

export const AdsSettingsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <div className="p-4">
    {onBack && (
      <button onClick={onBack} className="text-sm text-sky-400 mb-4">
        ← رجوع
      </button>
    )}
    <h3 className="font-bold text-white mb-2">الإعلانات والرعايات</h3>
    <p className="text-gray-400 text-sm">خيارات ظهور الإعلانات في القنوات العامة</p>
  </div>
);

export const BackupRestoreView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { showToast, settings } = useTelegram();
  const isArabic = settings?.language === 'ar';
  const [status, setStatus] = useState<StorageCloudBackupStatus>(storageCloudBackupService.getStatus());
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const unsub = storageCloudBackupService.subscribe((s) => {
      setStatus(s);
    });
    storageCloudBackupService.refreshStatus();
    return unsub;
  }, []);

  const handleBackupNow = async () => {
    setFeedback({ message: 'جاري رفع النسخة الاحتياطية إلى Firestore...', type: 'info' });
    showToast(isArabic ? 'جاري النسخ الاحتياطي الفوري إلى Firestore...' : 'Starting backup to Firestore...', '☁️');
    const res = await storageCloudBackupService.forceManualBackup();
    if (res.success) {
      setFeedback({ message: res.message, type: 'success' });
      showToast(
        isArabic
          ? `تم النسخ الاحتياطي بنجاح إلى Firestore (${res.keysCount} مفتاح) ✅`
          : `Force backup succeeded to Firestore (${res.keysCount} keys) ✅`,
        '✅'
      );
    } else {
      setFeedback({ message: res.message, type: 'error' });
      showToast(
        isArabic ? `فشل النسخ الاحتياطي: ${res.message}` : `Force backup failed: ${res.message}`,
        '❌'
      );
    }
  };

  const handleRestoreNow = async () => {
    setFeedback({ message: 'جاري استعادة مفاتيح التخزين من Firestore...', type: 'info' });
    showToast(isArabic ? 'جاري استعادة مفاتيح التخزين من Firestore...' : 'Restoring storage from Firestore...', '🔄');
    const res = await storageCloudBackupService.forceManualRestore();
    if (res.success) {
      setFeedback({ message: res.message, type: 'success' });
      showToast(
        isArabic
          ? `تمت استعادة ${res.restoredKeysCount} مفتاح من Firestore بنجاح ✅`
          : `Restored ${res.restoredKeysCount} keys from Firestore ✅`,
        '✅'
      );
    } else {
      setFeedback({ message: res.message, type: 'error' });
      showToast(
        isArabic ? `فشل الاسترجاع: ${res.message}` : `Restore failed: ${res.message}`,
        '❌'
      );
    }
  };

  const criticalKeysList = [
    { key: 'tg_multi_accounts_v3', label: 'الحسابات النشطة والبيانات المتعددة', desc: 'بيانات جميع حسابات تيليجرام المسجلة' },
    { key: 'app_settings', label: 'إعدادات التطبيق والمظهر', desc: 'خيارات الواجهة والتخصيص والسمات' },
    { key: 'tg_active_account_id_v3', label: 'الحساب النشط المختار', desc: 'تحديد الحساب المفتوح افتراضياً' },
    { key: 'tg_session_string', label: 'سلسلة جلسة تيليجرام المشفرة', desc: 'رمز تفويض MTProto المشفر' },
  ];

  return (
    <div className="p-4 space-y-4 text-right" dir="rtl">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#5288c1] hover:text-[#6ab2f2] transition-colors mb-2 font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع إلى الإعدادات</span>
        </button>
      )}

      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-br from-[#1c2733] to-[#17212b] border border-[#2481cc]/30 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2481cc]/20 text-[#5288c1] flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>النسخ الاحتياطي السحابي الدائم</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Firestore Active
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                خدمة خلفية دورية تقوم بمزامنة مفاتيح التخزين المحلية كل 45 ثانية لمنع فقدان الجلسة عند مسح المتصفح أو تغيير الجهاز.
              </div>
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5288c1] shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-gray-400">حالة السحابة</div>
              <div className="font-semibold text-gray-200 truncate">
                {status.isCloudConnected ? 'متصل بـ Firestore' : 'تخزين محلي مؤقت'}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-gray-400">آخر مزامنة سحابية</div>
              <div className="font-semibold text-gray-200 truncate">
                {status.lastBackupTime
                  ? new Date(status.lastBackupTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'لم تتم المزامنة بعد'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleBackupNow}
            disabled={status.isBackingUp || status.isRestoring}
            className="flex-1 py-2.5 px-3 bg-[#2481cc] hover:bg-[#2075b8] text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status.isBackingUp ? 'animate-spin' : ''}`} />
            <span>{status.isBackingUp ? 'جاري النسخ...' : 'نسخ احتياطي فوري'}</span>
          </button>

          <button
            onClick={handleRestoreNow}
            disabled={status.isBackingUp || status.isRestoring}
            className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 text-emerald-400 ${status.isRestoring ? 'animate-spin' : ''}`} />
            <span>{status.isRestoring ? 'جاري الاستعادة...' : 'استعادة من Firestore'}</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : feedback.type === 'error'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-[#2481cc]/20 text-[#5288c1] border border-[#2481cc]/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Critical Keys Protected List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 px-1">
          المفاتيح الأساسية المشمولة بالحماية التلقائية:
        </div>

        <div className="space-y-1.5">
          {criticalKeysList.map((item) => (
            <div
              key={item.key}
              className="p-3 bg-[#17212b] border border-white/5 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-[#5288c1]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.label}</div>
                  <div className="text-[11px] text-gray-400">{item.desc}</div>
                </div>
              </div>
              <code className="text-[10px] bg-black/40 text-sky-400 font-mono px-2 py-0.5 rounded border border-white/5">
                {item.key}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ExtendedSettingsViews: React.FC<{ subPage: string; onBack: () => void }> = ({ subPage, onBack }) => {
  switch (subPage) {
    case 'stories':
      return <StoriesSettingsView onBack={onBack} />;
    case 'messages':
      return <MessagesSettingsView onBack={onBack} />;
    case 'topics':
      return <TopicsSettingsView onBack={onBack} />;
    case 'shared_media':
      return <SharedMediaView onBack={onBack} />;
    case 'ads':
      return <AdsSettingsView onBack={onBack} />;
    case 'backup':
      return <BackupRestoreView onBack={onBack} />;
    default:
      return (
        <div className="p-4">
          <button onClick={onBack} className="text-sm text-sky-400 mb-4">
            ← رجوع
          </button>
          <p className="text-gray-400 text-sm">إعدادات إضافية</p>
        </div>
      );
  }
};
