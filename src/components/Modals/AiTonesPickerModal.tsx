import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, Wand2, Copy, RefreshCw } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { AI_COMPOSE_TONES, aiTonesController } from '../../core/messenger/AiTonesController';
import { AiToneId } from '../../types';

interface AiTonesPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputText: string;
  onApplyText: (newText: string) => void;
}

export const AiTonesPickerModal: React.FC<AiTonesPickerModalProps> = ({
  isOpen,
  onClose,
  inputText,
  onApplyText,
}) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [selectedTone, setSelectedTone] = useState<AiToneId>('formal');
  const [workingText, setWorkingText] = useState(inputText);
  const [transformedText, setTransformedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const initialText = inputText || (isArabic ? 'مرحباً، هل يمكنك مراجعة الملفات وإرسال الملاحظات؟' : 'Hello, could you please review the files and send feedback?');
      setWorkingText(initialText);
      const initial = aiTonesController.transformTextTone(
        initialText,
        'formal',
        isArabic
      );
      setTransformedText(initial);
      aiTonesController.transformTextToneWithGroq(initialText, 'formal', isArabic)
        .then((refined) => setTransformedText(refined))
        .catch(() => {});
    }
  }, [isOpen, inputText, isArabic]);

  const handleToneChange = async (toneId: AiToneId) => {
    setSelectedTone(toneId);
    setIsGenerating(true);
    try {
      const result = await aiTonesController.transformTextToneWithGroq(workingText, toneId, isArabic);
      setTransformedText(result);
    } catch {
      const fallback = aiTonesController.transformTextTone(workingText, toneId, isArabic);
      setTransformedText(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    onApplyText(transformedText);
    showToast(isArabic ? 'تم تطبيق نبرة الرسالة بنجاح' : 'AI Tone applied to message input', '✨');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#17212b] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#2481cc] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
              <h3 className="font-bold text-base">
                {isArabic ? 'صياغة ونبرة الرسائل بالذكاء الاصطناعي' : 'AI Message Tones & Style'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Tone Selector Pills */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5288c1] uppercase tracking-wide">
                {isArabic ? 'اختر النبرة المطلوبة' : 'Select Desired Tone'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AI_COMPOSE_TONES.map((tone) => {
                  const isSelected = selectedTone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      onClick={() => handleToneChange(tone.id)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col items-start transition-all ${
                        isSelected
                          ? 'bg-[#2481cc]/20 border-[#2481cc] text-white ring-1 ring-[#2481cc]'
                          : 'bg-[#0e1621] border-white/5 text-gray-300 hover:border-white/15'
                      }`}
                    >
                      <span className="text-lg mb-1">{tone.icon}</span>
                      <span className="text-xs font-bold truncate w-full">
                        {isArabic ? tone.nameAr : tone.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Message Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400">
                {isArabic ? 'النص الأصلي' : 'Original Text'}
              </label>
              <textarea
                value={workingText}
                onChange={(e) => {
                  setWorkingText(e.target.value);
                  setTransformedText(aiTonesController.transformTextTone(e.target.value, selectedTone, isArabic));
                }}
                rows={2}
                className="w-full bg-[#0e1621] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5288c1] resize-none"
                placeholder={isArabic ? 'اكتب رسالتك هنا...' : 'Type message here...'}
              />
            </div>

            {/* Transformed Result Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'النتيجة بالأسلوب المختار' : 'AI Styled Result'}</span>
                </label>
                {isGenerating && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
              </div>
              <div className="bg-[#0e1621] p-3.5 rounded-xl border border-emerald-500/30 text-xs text-white leading-relaxed min-h-[70px] relative">
                {transformedText}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-[#0e1621] border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-[#2481cc] hover:bg-[#1f6fa8] active:bg-[#195a88] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isArabic ? 'تطبيق في المحادثة' : 'Apply to Chat'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
