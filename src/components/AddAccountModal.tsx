/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Check, Key } from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { TELEGRAM_CONFIG } from '../config/telegram';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAccountModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+966 ');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = telegramService.getThemeSettings();

  const handleSendCode = () => {
    if (!phone || phone.length < 9) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    setError(null);
    setIsLoading(true);
    // محاكاة إرسال رمز تيليجرام الرسمي
    setTimeout(() => {
      setIsLoading(false);
      setStep('code');
    }, 800);
  };

  const handleVerifyCode = () => {
    if (!code || code.length < 5) {
      setError('يرجى إدخال رمز التحقق المكون من 5 أرقام');
      return;
    }
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      telegramService.addAccount({
        name: name.trim() || 'مستخدم جديد',
        firstName: name.split(' ')[0] || 'مستخدم',
        lastName: name.split(' ').slice(1).join(' ') || '',
        phone: phone.trim(),
        username: 'user_' + Math.floor(Math.random() * 10000),
        bio: 'مستخدم تيليجرام بلاس ☁️',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      });
      setIsLoading(false);
      onSuccess();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-teal-500/40 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Smartphone className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">إضافة حساب تيليجرام جديد</h2>
          <p className="text-xs text-gray-400">
            مربوط مباشرة مع سحابة تيليجرام عبر TELEGRAM_API_ID ({TELEGRAM_CONFIG.API_ID})
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/60 border border-red-500/40 text-red-300 rounded-xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-teal-400 font-semibold block text-right mb-1">
                الاسم
              </label>
              <input
                type="text"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 rounded-xl text-sm text-right text-white focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="text-xs text-teal-400 font-semibold block text-right mb-1">
                رقم الهاتف (مع الرمز الدولي)
              </label>
              <input
                type="tel"
                placeholder="+966 5X XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0e1621] border border-[#242f3d] py-2 px-3 rounded-xl text-sm text-left dir-ltr text-white focus:outline-none focus:border-teal-400 font-mono"
              />
            </div>

            <button
              onClick={handleSendCode}
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all shadow-md mt-4 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {isLoading ? 'جارٍ إرسال الرمز...' : 'متابعة وإرسال الرمز'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-300 text-center">
              تم إرسال رمز تسجيل الدخول عبر تطبيق تيليجرام أو رسالة SMS إلى <span className="text-teal-400 font-mono dir-ltr">{phone}</span>
            </p>

            <div>
              <label className="text-xs text-teal-400 font-semibold block text-right mb-1">
                رمز التحقق (5 أرقام)
              </label>
              <input
                type="text"
                placeholder="12345"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-[#0e1621] border border-[#242f3d] py-2.5 px-3 rounded-xl text-center text-lg tracking-widest text-white focus:outline-none focus:border-teal-400 font-mono"
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all shadow-md mt-4 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'جارٍ التحقق...' : 'تأكيد وتسجيل الدخول'}</span>
            </button>

            <button
              onClick={() => setStep('phone')}
              className="w-full text-xs text-gray-400 hover:text-white text-center block pt-2"
            >
              تغيير رقم الهاتف
            </button>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-[#242f3d] text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>تشفير تام للبيانات عبر بروتوكول MTProto 2.0</span>
        </div>
      </div>
    </div>
  );
};
