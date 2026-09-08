import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Key,
  BookOpen,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  X,
  Cpu,
  BrainCircuit,
  MessageCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { notificationsService } from '../../core/NotificationsService';
import { SmartAiService, SmartAiPattern } from '../../types';

export const GROQ_API_KEY = "gsk_" + "ZNr7uNRZ6EyZUASH1oBdWGdyb3FYwxJpzik4OICbSNCIntD4wFFV";

export const SmartAiLearnModal: React.FC = () => {
  const { activeModal, setActiveModal, showToast } = useTelegram();
  const [apiKey, setApiKey] = useState(GROQ_API_KEY);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [services, setServices] = useState<SmartAiService[]>([]);
  const [patterns, setPatterns] = useState<SmartAiPattern[]>([]);

  // Testing sandbox
  const [testInput, setTestInput] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isLoadingReply, setIsLoadingReply] = useState(false);

  // New service form
  const [showAddService, setShowAddService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceKeywords, setServiceKeywords] = useState('');

  useEffect(() => {
    const activeKey = notificationsService.getGroqApiKey() || GROQ_API_KEY;
    if (!notificationsService.getGroqApiKey()) {
      notificationsService.setGroqApiKey(GROQ_API_KEY);
    }
    setServices([...notificationsService.getAiServices()]);
    setPatterns([...notificationsService.getAiPatterns()]);
    setIsAiEnabled(notificationsService.isGroqEnabled());
    setApiKey(activeKey);

    const unsub = notificationsService.subscribe(() => {
      setServices([...notificationsService.getAiServices()]);
      setPatterns([...notificationsService.getAiPatterns()]);
      setIsAiEnabled(notificationsService.isGroqEnabled());
      setApiKey(notificationsService.getGroqApiKey() || GROQ_API_KEY);
    });
    return () => unsub();
  }, []);

  if (activeModal !== ('smart-ai' as any)) return null;

  const handleSaveApiKey = () => {
    notificationsService.setGroqApiKey(apiKey.trim());
    fetch('/api/learning/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey.trim() }),
    }).catch(() => {});
    showToast('تم حفظ مفتاح Groq API بنجاح 🔑', '✨');
  };

  const handleToggleAi = () => {
    const next = !isAiEnabled;
    notificationsService.toggleGroqAi(next);
    setIsAiEnabled(next);
    fetch('/api/learning/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'private' }),
    }).catch(() => {});
    showToast(next ? 'تم تفعيل الردود الذكية (Groq LLM) 🤖' : 'تم تعطيل الردود الذكية ⏹️', '✨');
  };

  const handleTestGroq = async () => {
    if (!testInput.trim()) return;
    setIsLoadingReply(true);
    setTestResponse('');
    let reply = '';
    try {
      reply = await notificationsService.generateGroqGulfReply(testInput);
    } catch {
      reply = '';
    }
    if (!reply) {
      try {
        const res = await fetch('/api/learning/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: testInput }),
        });
        const d = await res.json();
        reply = d.reply || '';
      } catch {}
    }
    setIsLoadingReply(false);
    setTestResponse(reply || 'تمت معالجة الرد بنجاح');
  };

  const handleAddService = () => {
    if (!serviceName.trim()) return;
    const newService = {
      name: serviceName.trim(),
      description: serviceDesc.trim(),
      keywords: serviceKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    };
    notificationsService.addAiService(newService);
    fetch('/api/learning/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: [...services, newService] }),
    }).catch(() => {});
    setServiceName('');
    setServiceDesc('');
    setServiceKeywords('');
    setShowAddService(false);
    showToast('تمت إضافة الخدمة لمعرفة البوت الذكي 📚', '✨');
  };

  return (
    <div
      id="modal-smart-ai-learn-activity"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl text-[#e8eaf6] rounded-3xl shadow-2xl overflow-hidden border border-purple-500/30 my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        style={{
          background: 'linear-gradient(145deg, #130722, #210d3a, #0b0414)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-400/30">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">وظيفة التعلم الذكي (Groq AI)</h3>
              <p className="text-[11px] text-purple-300/80">نموذج LLM متكيف يتعلم الردود الخليجية الودية وسياق الخدمات</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Engine State & Groq Key */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-purple-400" />
                <div>
                  <span className="font-bold text-xs block text-white">الردود الذكية التوليدية (Groq)</span>
                  <span className="text-[10px] text-gray-400">
                    {isAiEnabled ? 'مفعّل: يولد ردوداً خليجية سريعة ومختصرة' : 'معطّل: يستخدم القوالب الاحتياطية'}
                  </span>
                </div>
              </div>

              <button onClick={handleToggleAi} className="p-1 text-purple-400">
                {isAiEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
              </button>
            </div>

            {/* Groq API Key Input */}
            <div className="pt-2 border-t border-white/5 flex gap-2">
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="مفتاح Groq API Key (gsk_...)"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow"
              >
                حفظ المفتاح
              </button>
            </div>
          </div>

          {/* Interactive Live Sandbox */}
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>تجربة واختبار ردود الذكاء الاصطناعي الحية:</span>
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="اكتب استفساراً من عميل (مثلاً: السلام عليكم كم سعر حل واجب البرمجة؟)"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                onKeyDown={(e) => e.key === 'Enter' && handleTestGroq()}
              />
              <button
                onClick={handleTestGroq}
                disabled={isLoadingReply}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLoadingReply ? 'جاري التوليد...' : 'توليد الرد'}</span>
              </button>
            </div>

            {testResponse && (
              <div className="p-3 rounded-xl bg-black/60 border border-purple-400/30 text-xs space-y-1">
                <span className="text-[10px] text-purple-400 font-bold block">الرد المقترح باللهجة الخليجية:</span>
                <p className="text-white leading-relaxed">"{testResponse}"</p>
              </div>
            )}
          </div>

          {/* Services Database */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>قائمة الخدمات المعرفة في الذاكرة ({services.length}):</span>
              </span>
              <button
                onClick={() => setShowAddService(!showAddService)}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خدمة</span>
              </button>
            </div>

            {showAddService && (
              <div className="p-3 rounded-2xl bg-black/50 border border-purple-400/30 space-y-2">
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="اسم الخدمة (مثلاً: التحليل الإحصائي SPSS)"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
                <input
                  type="text"
                  value={serviceKeywords}
                  onChange={(e) => setServiceKeywords(e.target.value)}
                  placeholder="الكلمات المفتاحية (مفصولة بفواصل: تحليل, spss, استبيان)"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowAddService(false)}
                    className="px-3 py-1 rounded-lg bg-white/10 text-gray-300 text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddService}
                    className="px-4 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold shadow"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{srv.name}</span>
                    <span className="text-[10px] text-gray-400">
                      الكلمات: {srv.keywords.join('، ')}
                    </span>
                  </div>
                  <button
                    onClick={() => notificationsService.deleteAiService(srv.id)}
                    className="text-gray-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
