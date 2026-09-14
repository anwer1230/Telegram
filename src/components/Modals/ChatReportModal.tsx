import React, { useState } from 'react';
import { Flag, X, ShieldAlert, Check } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export interface ChatReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
  chatType?: 'private' | 'group' | 'channel' | 'bot' | 'supergroup';
}

interface ReportOption {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'spam',
    titleEn: 'Spam',
    titleAr: 'رسائل غير مرغوب فيها (سبام)',
    descEn: 'Unwanted promotional messages or repeated advertisements',
    descAr: 'رسائل إعلانية مزعجة، مكررة أو احتيالية',
  },
  {
    id: 'fake',
    titleEn: 'Fake Account or Impersonation',
    titleAr: 'حساب مزيف أو انتحال صفة',
    descEn: 'Impersonating another person, organization, or channel',
    descAr: 'ادعاء هوية شخص آخر أو علامة تجارية دون إذن',
  },
  {
    id: 'violence',
    titleEn: 'Violence or Dangerous Organizations',
    titleAr: 'عنف أو تحريض على الضرر',
    descEn: 'Depicting or encouraging physical harm, violence, or dangerous acts',
    descAr: 'الترويج لأعمال العنف، التهديدات الجسدية أو التحريض',
  },
  {
    id: 'child_abuse',
    titleEn: 'Child Abuse',
    titleAr: 'إساءة للأطفال',
    descEn: 'Child sexual abuse material, endangerment, or exploitation',
    descAr: 'أي محتوى يتضمن استغلالاً أو إساءة موجهة ضد القاصرين',
  },
  {
    id: 'pornography',
    titleEn: 'Pornography or Illegal Goods',
    titleAr: 'محتوى إباحي أو سلع غير قانونية',
    descEn: 'Adult explicit media, prohibited substances, or illicit weapons',
    descAr: 'محتوى للبالغين، مواد مخدرة أو تجارة سلع محظورة',
  },
  {
    id: 'personal_details',
    titleEn: 'Personal Details (Doxxing)',
    titleAr: 'نشر بيانات شخصية بدون إذن',
    descEn: 'Leaking private phone numbers, home addresses, or confidential files',
    descAr: 'تسريب صور خاصة، أرقام هواتف أو عناوين سكنية دون موافقة',
  },
  {
    id: 'copyright',
    titleEn: 'Copyright Infringement',
    titleAr: 'انتهاك حقوق النشر والملكية',
    descEn: 'Pirated content, unauthorized stream links or trademark breach',
    descAr: 'محتوى مقرصن، ملفات محمية بحقوق التأليف أو نسخ غير مصرح',
  },
  {
    id: 'other',
    titleEn: 'Other',
    titleAr: 'سبب آخر',
    descEn: 'Any other violation not listed above',
    descAr: 'أي مخالفة أخرى لسياسات وشروط مجتمع تيليجرام',
  },
];

export const ChatReportModal: React.FC<ChatReportModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatTitle,
  chatType = 'group',
}) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [selectedReason, setSelectedReason] = useState<string>('spam');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Telegram report submission logic
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      showToast(
        isArabic
          ? 'تم إرسال البلاغ بنجاح إلى المشرفين. شكراً لمساعدتك في حماية تيليجرام 🛡️'
          : 'Report sent successfully. Thank you for keeping Telegram safe 🛡️',
        '✅'
      );
      setDetails('');
      setSelectedReason('spam');
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#17212b] border border-[#2b394a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2b394a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">
                {isArabic ? 'الإبلاغ' : 'Report'}
              </h2>
              <p className="text-[11px] text-gray-400 truncate max-w-[240px]">
                {chatTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-gray-300">
            {isArabic
              ? 'يرجى تحديد سبب الإبلاغ عن هذه المحادثة لمساعدتنا في مراجعتها واتخاذ الإجراء المناسب:'
              : 'Please select the reason for reporting this chat so our moderators can review it:'}
          </p>

          {/* Options list */}
          <div className="space-y-1.5">
            {REPORT_OPTIONS.map((opt) => {
              const isSelected = selectedReason === opt.id;
              return (
                <label
                  key={opt.id}
                  onClick={() => setSelectedReason(opt.id)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? 'bg-[#2481cc]/15 border-[#2481cc]/50 text-white'
                      : 'bg-[#242f3d]/40 border-white/5 text-gray-300 hover:bg-[#242f3d]'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-[#2481cc] bg-[#2481cc]'
                          : 'border-gray-500 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">
                      {isArabic ? opt.titleAr : opt.titleEn}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {isArabic ? opt.descAr : opt.descEn}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Optional Details Input */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              {isArabic ? 'تفاصيل إضافية (اختياري)' : 'Additional details (optional)'}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                isArabic
                  ? 'أدخل أي معلومات أو روابط تساعد فريق المشرفين...'
                  : 'Enter any additional notes for our moderation team...'
              }
              rows={3}
              className="w-full bg-[#0e1621] border border-[#2b394a] focus:border-[#2481cc] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2b394a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-[#2481cc] hover:bg-[#2072b3] text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting
                ? isArabic ? 'جاري الإرسال...' : 'Sending...'
                : isArabic ? 'إرسال البلاغ' : 'Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
