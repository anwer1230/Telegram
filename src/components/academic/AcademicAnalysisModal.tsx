import React, { useState } from "react";
import {
  X,
  GraduationCap,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  Copy,
  Download,
  BookOpen,
  Award,
  Layers,
  Search,
} from "lucide-react";
import { AcademicPaperAnalysis } from "../../types";

interface AcademicAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcademicAnalysisModal: React.FC<AcademicAnalysisModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [fileName, setFileName] = useState("دراسة_أثر_الأتمتة_في_التسويق_الرقمي_2026.pdf");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AcademicPaperAnalysis>({
    title: "أثر نظم الأتمتة المعتمدة على الذكاء الاصطناعي في تحسين كفاءة الحملات التسويقية في الشرق الأوسط",
    executiveSummary:
      "تتناول هذه الدراسة الاستقصائية التحليلية أداء أدوات البث الآلي والردود الذكية في بيئة تطبيقات المراسلة الفورية، حيث أظهرت النتائج زيادة معدلات التحويل بنسبة 42% وانخفاض تكلفة اكتساب العميل بنسبة 31% مقارنة بالطرق التقليدية.",
    methodology:
      "منهجية كمية تحليلية قائمة على تتبع 150 ألف عملية مراسلة عبر مجموعات تيليجرام للأعمال، واستخدام نماذج معالجة اللغة الطبيعية (NLP) لتصنيف نية العميل وحساب أوقات الاستجابة.",
    keyFindings: [
      "تقليل زمن الرد الأول على استفسارات العملاء من 45 دقيقة إلى أقل من 3 ثوانٍ.",
      "انخفاض معدلات الحظر الآلي بنسبة 89% عند تطبيق خوارزمية الفواصل الزمنية المتغيرة (Smart Intervals).",
      "ارتفاع تفاعل أعضاء المجموعات مع المنشورات الدورية المتسلسلة ذات المحتوى المخصص بنسبة 57%.",
    ],
    citations: [
      "العتيبي، س. وآخرون (2025). الذكاء الاصطناعي وتطبيقات الأتمتة في الإعلام الرقمي. مجلة البحوث الإدارية المعاصرة، 14(2)، 45-68.",
      "Smith, J., & Al-Mansoor, K. (2026). Automated Messaging Architectures in Scalable Distributed Systems. IEEE Transactions on Software Engineering, 52(1), 112-125.",
    ],
    citationFormat: "APA 7th Edition",
  });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      runAnalysis();
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/academic/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        showToast("اكتمل التحليل الأكاديمي الشامل للمستند");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyCitations = () => {
    navigator.clipboard.writeText(analysis.citations.join("\n\n"));
    showToast("تم نسخ الاستشهادات بنمط APA");
  };

  if (!isOpen) return null;

  return (
    <div
      id="academicAnalysisModal"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>تحليل الأوراق والبحوث العلمية (Analyze Papers)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  APA / IEEE Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                استخراج الملخص التنفيذي، تقييم المنهجية، وصياغة الاستشهادات المرجعية بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-indigo-500/10 border-b border-indigo-500/30 px-6 py-2.5 text-xs text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{toast}</span>
          </div>
        )}

        {/* Upload bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">{fileName}</div>
              <div className="text-[11px] text-slate-400">ملف بحثي جاهز للتحليل والفهرسة</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer border border-slate-700">
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span>رفع بحث جديد (PDF/DOCX)</span>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>{analyzing ? "جارٍ التحليل..." : "إعادة التحليل الذكي"}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Title */}
          <div>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide">عنوان البحث المعتمد:</span>
            <h3 className="text-base font-bold text-white mt-1 leading-snug">{analysis.title}</h3>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>الملخص التنفيذي (Executive Summary):</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{analysis.executiveSummary}</p>
          </div>

          {/* Methodology */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>المنهجية العلمية (Research Methodology):</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{analysis.methodology}</p>
          </div>

          {/* Key Findings */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>أبرز النتائج والمخرجات (Key Findings):</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {analysis.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Citations */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-2">
                <span>الاستشهادات والمراجع ({analysis.citationFormat}):</span>
              </h4>
              <button
                onClick={copyCitations}
                className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/40"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ المراجع</span>
              </button>
            </div>
            <div className="space-y-2">
              {analysis.citations.map((c, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            مدعوم بمحرك المعالجة الأكاديمية اللغوية للجامعات والمراكز البحثية
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
