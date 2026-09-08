import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  CornerDownLeft,
  X,
  RotateCcw,
  Sparkles,
  Globe,
  Check,
  AlertCircle,
  Volume2,
  Minimize2,
  Maximize2,
} from 'lucide-react';

interface ChatSpeechRecognitionProps {
  isOpen: boolean;
  onClose: () => void;
  onSendText: (text: string) => void;
  onInsertText: (text: string) => void;
  chatTitle?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'ar-SA', label: 'العربية (السعودية)' },
  { code: 'ar-EG', label: 'العربية (مصر)' },
  { code: 'ar-AE', label: 'العربية (الإمارات)' },
  { code: 'ar-IQ', label: 'العربية (العراق)' },
  { code: 'en-US', label: 'English (US)' },
];

export const ChatSpeechRecognition: React.FC<ChatSpeechRecognitionProps> = ({
  isOpen,
  onClose,
  onSendText,
  onInsertText,
  chatTitle,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [selectedLang, setSelectedLang] = useState('ar-SA');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const shouldListenRef = useRef(false);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setErrorMessage('متصفحك لا يدعم Web Speech API بشكل مباشر. يمكنك استخدام المحاكاة التجريبية أدناه.');
    }
  }, []);

  // Timer for dictation duration
  useEffect(() => {
    if (isListening && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening, isPaused]);

  // Start Recognition
  const startRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setIsPaused(false);
        setErrorMessage(null);
        shouldListenRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalChunk += text + ' ';
          } else {
            interim += text;
          }
        }

        if (finalChunk.trim()) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('[Web Speech API] Recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Normal when silent, don't break
          return;
        }
        if (event.error === 'not-allowed') {
          setErrorMessage('تم رفض الإذن للوصول إلى الميكروفون. يرجى السماح بالميكروفون من إعدادات المتصفح.');
          setIsListening(false);
          shouldListenRef.current = false;
        } else if (event.error === 'network') {
          setErrorMessage('خطأ في الاتصال بخدمة التعرف الصوتي السحابية للمتصفح.');
        } else {
          setErrorMessage(`تنبيه التعرف على الصوت: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Auto-restart if user intends to keep listening
        if (shouldListenRef.current && !isPaused) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('[Web Speech API] Start error:', err);
      setErrorMessage('تعذر بدء التعرف على الصوت: ' + (err?.message || 'خطأ غير متوقع'));
      setIsListening(false);
      shouldListenRef.current = false;
    }
  }, [selectedLang, isPaused]);

  // Stop Recognition
  const stopRecognition = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    setIsPaused(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // Pause / Resume Recognition
  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      startRecognition();
    } else {
      setIsPaused(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  };

  // Start on open
  useEffect(() => {
    if (isOpen && isSupported) {
      startRecognition();
    } else {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [isOpen, isSupported, startRecognition, stopRecognition]);

  // When language changes, restart if actively listening
  const handleLanguageChange = (code: string) => {
    setSelectedLang(code);
    if (isListening) {
      stopRecognition();
      setTimeout(() => {
        startRecognition();
      }, 300);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Full current text
  const fullText = (transcript + (interimText ? ' ' + interimText : '')).trim();

  // Send directly
  const handleSendDirectly = () => {
    if (!fullText) return;
    onSendText(fullText);
    setTranscript('');
    setInterimText('');
    setDuration(0);
    stopRecognition();
    onClose();
  };

  // Insert into Chat Input
  const handleInsertToInput = () => {
    if (!fullText) return;
    onInsertText(fullText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Clear text
  const handleClear = () => {
    setTranscript('');
    setInterimText('');
    setDuration(0);
  };

  // Simulation dictation for environments without microphone access or testing
  const handleSimulateDictation = () => {
    const samples = [
      'السلام عليكم ورحمة الله وبركاته، مرحباً بكم في المحادثة.',
      'أهلاً بك، تم إرسال هذه الرسالة عبر ميزة الإملاء الصوتي الذكية Web Speech API.',
      'شكراً جزيلاً لك على حسن المتابعة والتفاعل السريع.',
      'أنا جاهز للاجتماع في تمام الساعة الخامسة مساءً إن شاء الله.',
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setTranscript((prev) => (prev ? `${prev} ${picked}` : picked));
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`transition-all duration-200 z-30 bg-[#17212b]/95 backdrop-blur-md border-t border-cyan-500/30 text-white shadow-2xl shrink-0 ${
        isMinimized ? 'py-2 px-4' : 'p-3.5 sm:p-4'
      }`}
      dir="rtl"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isListening && !isPaused
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            <Mic className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-white">
                إملاء صوتي مباشر (Web Speech API)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isListening && !isPaused
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                    : isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}
              >
                {isListening && !isPaused ? 'جاري الاستماع...' : isPaused ? 'متوقف مؤقتاً' : 'جاهز للإملاء'}
              </span>
            </div>

            {chatTitle && (
              <span className="text-[10px] text-gray-400 block truncate">
                إلى: {chatTitle}
              </span>
            )}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-1.5">
          {/* Audio Waves Simulation */}
          {isListening && !isPaused && (
            <div className="hidden sm:flex items-center gap-0.5 px-2 py-1 bg-black/30 rounded-lg border border-white/5 h-6">
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-5" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3" />
            </div>
          )}

          {/* Timer */}
          <span className="text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-black/40 border border-white/10">
            {formatTime(duration)}
          </span>

          {/* Language Selector */}
          <div className="relative">
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-black/40 border border-white/15 text-[11px] text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer pr-5 pl-2"
              title="تغيير لغة الإملاء الصوتي"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#17212b] text-white">
                  {lang.label}
                </option>
              ))}
            </select>
            <Globe className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Minimize / Maximize */}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all"
            title={isMinimized ? 'تكبير الواجهة' : 'تصغير الواجهة'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={() => {
              stopRecognition();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 transition-all"
            title="إغلاق واجهة الإملاء"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Transcript Box */}
          <div className="mt-2.5 p-3 rounded-xl bg-black/35 border border-white/10 min-h-[75px] max-h-[140px] overflow-y-auto relative">
            {fullText ? (
              <div className="text-xs sm:text-sm leading-relaxed text-gray-100 select-text">
                <span>{transcript}</span>
                {interimText && (
                  <span className="text-cyan-300 italic opacity-85 mr-1">
                    {interimText}
                    <span className="inline-block w-1.5 h-3 bg-cyan-400 mr-0.5 animate-pulse" />
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-center text-gray-400">
                <Volume2 className="w-5 h-5 text-gray-500 mb-1 animate-pulse" />
                <p className="text-xs m-0">تحدث بصوتك الآن وسيتم تحويل كلماتك إلى نص في الوقت الفعلي...</p>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  اللغة الحالية: {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label}
                </span>
              </div>
            )}

            {/* Word count */}
            {fullText && (
              <div className="absolute left-2.5 bottom-2 text-[10px] text-gray-400 font-mono">
                {fullText.split(/\s+/).filter(Boolean).length} كلمة
              </div>
            )}
          </div>

          {/* Error / Feedback notification */}
          {errorMessage && (
            <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleSimulateDictation}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold transition-all shrink-0"
              >
                محاكاة صوتية تجريبية
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10">
            {/* Left controls: Pause, Clear, Simulate */}
            <div className="flex items-center gap-1.5">
              {isListening ? (
                <button
                  type="button"
                  onClick={togglePause}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border ${
                    isPaused
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {isPaused ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'استئناف الاستماع' : 'إيقاف مؤقت'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecognition}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>بدء الإملاء</span>
                </button>
              )}

              {fullText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs transition-all"
                  title="مسح النص"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Simulation test button */}
              <button
                type="button"
                onClick={handleSimulateDictation}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-medium flex items-center gap-1 transition-all"
                title="إضافة جملة نموذجية للمعاينة"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">نص تجريبي</span>
              </button>
            </div>

            {/* Right controls: Insert to text box OR Send directly */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertToInput}
                disabled={!fullText}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/15 flex items-center gap-1.5 transition-all active:scale-95"
                title="إدراج النص في صندوق الكتابة للمراجعة والتعديل قبل الإرسال"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'تم الإدراج بنجاح!' : 'إدراج في صندوق الكتابة'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendDirectly}
                disabled={!fullText}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-40 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                title="إرسال النص كرسالة فوراً إلى المحادثة"
              >
                <Send className="w-3.5 h-3.5 ml-0.5 rtl:ml-0 rtl:mr-0.5" />
                <span>إرسال فوري</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
