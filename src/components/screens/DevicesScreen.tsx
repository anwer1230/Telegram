/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, QrCode, Laptop, Smartphone, Hand, Check, ShieldCheck, X } from 'lucide-react';
import { telegramService } from '../../services/telegramService';
import { ActiveSession } from '../../types/telegram';

interface Props {
  onBack: () => void;
}

export const DevicesScreen: React.FC<Props> = ({ onBack }) => {
  const [sessions, setSessions] = useState<ActiveSession[]>(telegramService.getSessions());
  const [showQRScannerModal, setShowQRScannerModal] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const theme = telegramService.getThemeSettings();

  const handleTerminateAll = () => {
    telegramService.terminateOtherSessions();
    setSessions(telegramService.getSessions());
    setShowTerminateConfirm(false);
    setToastMessage("تم إنهاء جميع الجلسات الأخرى بنجاح!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTerminateOne = (id: string) => {
    telegramService.terminateSession(id);
    setSessions(telegramService.getSessions());
    setToastMessage("تم إنهاء الجلسة المحددة!");
    setTimeout(() => setToastMessage(null), 2500);
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
          <h1 className="text-xl font-bold text-white">الأجهزة</h1>
        </div>
      </div>

      {toastMessage && (
        <div className="m-3 p-3 bg-teal-600/90 text-white text-center rounded-xl text-sm font-medium animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Laptop Graphic with QR Screen from screenshot 10 */}
        <div className="flex flex-col items-center justify-center text-center pt-4">
          <div className="relative w-44 h-32 flex flex-col items-center justify-center">
            {/* Laptop screen */}
            <div className="w-36 h-24 bg-gray-800 border-4 border-gray-600 rounded-t-lg shadow-xl flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">
              <div className="p-2 bg-white rounded-md shadow flex flex-col items-center justify-center">
                <QrCode className="w-12 h-12 text-teal-700" />
              </div>
            </div>
            {/* Laptop base */}
            <div className="w-44 h-3 bg-gray-500 rounded-b-lg shadow-md" />
            <div className="w-12 h-1 bg-gray-400 rounded-b-sm" />
          </div>

          <p className="text-sm text-gray-300 mt-4 max-w-xs leading-relaxed">
            تسجيل الدخول في <span className="text-teal-400">تيليجرام سطح المكتب</span> أو <span className="text-teal-400">تيليجرام ويب</span> عبر مسح رمز QR.
          </p>

          {/* إضافة جهاز Button */}
          <button
            onClick={() => setShowQRScannerModal(true)}
            className="mt-5 w-full py-3.5 rounded-full font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <QrCode className="w-5 h-5" />
            <span>إضافة جهاز</span>
          </button>
        </div>

        {/* هذا الجهاز Section */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            هذا الجهاز
          </span>

          <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between">
            <div className="w-11 h-11 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="text-right flex-1 pr-3">
              <h3 className="text-sm font-bold text-gray-100">Motorola moto g power (2021)</h3>
              <p className="text-xs text-gray-400">plus messenger 13.0.2.0 (22590) stable stable</p>
              <p className="text-[11px] text-teal-400 mt-0.5">Aden, Yemen • متصل</p>
            </div>
          </div>

          {/* زر إنهاء جميع الجلسات الأخرى */}
          <button
            onClick={() => setShowTerminateConfirm(true)}
            className="w-full py-3 px-4 bg-red-950/40 hover:bg-red-950/60 border border-red-800/40 rounded-2xl flex items-center justify-between text-red-400 transition-colors"
          >
            <Hand className="w-5 h-5" />
            <span className="text-sm font-semibold">إنهاء جميع الجلسات الأخرى</span>
          </button>
          <p className="text-xs text-gray-400 text-center">
            لتسجيل الخروج من جميع الأجهزة عدا هذا الجهاز
          </p>
        </div>

        {/* الجلسات النشطة */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-semibold text-teal-400 block text-right">
            الجلسات النشطة
          </span>

          {sessions.filter(s => !s.isCurrent).map((sess) => (
            <div
              key={sess.id}
              className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between group hover:border-teal-500/30 transition-colors"
            >
              <button
                onClick={() => handleTerminateOne(sess.id)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 transition-colors"
              >
                إنهاء
              </button>

              <div className="text-right flex-1 pr-3">
                <h4 className="text-sm font-semibold text-gray-100">{sess.device}</h4>
                <p className="text-xs text-gray-400">{sess.appVersion}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{sess.date} • {sess.location}</p>
              </div>

              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
                {sess.iconType === 'browser' ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-400 text-center pt-2">
            The official Telegram app is available for Android, iPhone, iPad, Windows, macOS and Linux.
          </p>
        </div>

        {/* Automatically terminate old sessions */}
        <div className="bg-[#17212b] rounded-2xl p-4 border border-[#242f3d] flex items-center justify-between">
          <span className="text-xs font-bold text-teal-400">٦ أشهر</span>
          <span className="text-xs font-medium text-gray-300">if inactive for</span>
          <span className="text-xs font-bold text-teal-400">Automatically terminate old sessions</span>
        </div>
      </div>

      {/* QR Code Scanner / Generator Modal */}
      {showQRScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17212b] rounded-3xl p-6 max-w-sm w-full border border-teal-500/40 text-center space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs bg-teal-500/20 text-teal-400 font-bold px-2 py-0.5 rounded">
                TELEGRAM WEB QR
              </span>
              <button onClick={() => setShowQRScannerModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-white">مسح رمز الاستجابة السريعة</h3>
            <p className="text-xs text-gray-300">
              افتح تيليجرام على هاتفك &gt; الإعدادات &gt; الأجهزة &gt; ربط جهاز جديد ووجه الكاميرا:
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <QrCode className="w-48 h-48 text-teal-900 mx-auto" />
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مشفر برمز تفويض سحابي ديناميكي</span>
            </div>

            <button
              onClick={() => {
                setShowQRScannerModal(false);
                setToastMessage("تم مسح الرمز والربط السحابي بنجاح!");
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500"
            >
              تم الربط
            </button>
          </div>
        </div>
      )}

      {/* Confirm terminate all sessions */}
      {showTerminateConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17212b] rounded-3xl p-6 max-w-sm w-full border border-red-500/40 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Hand className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">إنهاء جميع الجلسات الأخرى؟</h3>
            <p className="text-xs text-gray-300">
              سيتم تسجيل الخروج من كافة الأجهزة والحواسيب الأخرى المتصلة بحسابك.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowTerminateConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleTerminateAll}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold"
              >
                تأكيد الإنهاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
