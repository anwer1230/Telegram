import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  Bot,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Server,
  Users,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  FileText,
  Zap,
  Info,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Building2,
  Languages,
  DollarSign,
  Phone,
  Link as LinkIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTelegram } from '../../context/TelegramContext';

interface GroupCountryAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MetadataItem {
  id: string | null;
  title: string;
  username: string | null;
  participants_count: number;
  about: string;
  dc_id: number | null;
  created_date: string | null;
  is_megagroup: boolean;
  is_broadcast: boolean;
  is_verified: boolean;
  is_restricted: boolean;
}

interface AnalysisReport {
  success: boolean;
  group_link: string;
  analyzed_at: string;
  metadata: MetadataItem;
  dc_location: { city: string; country: string; code: string | null };
  content_local: {
    country: string | null;
    confidence: 'عالية' | 'متوسطة' | 'منخفضة';
    score: number;
    all_scores: Record<string, number>;
    evidences: string[];
  };
  content_ai: {
    country?: string | null;
    country_code?: string;
    region?: string;
    confidence?: 'عالية' | 'متوسطة' | 'منخفضة';
    language?: string;
    dialect?: string;
    indicators?: string[];
    reasoning?: string;
    error?: string;
  };
  final_country: string | null;
  flag?: string;
  confidence: 'عالية' | 'متوسطة' | 'منخفضة';
  evidence_summary: string[];
  error?: string;
}

interface GeoSearchResultItem {
  id: string;
  title: string;
  username: string | null;
  url: string;
  members: number;
  about: string;
  megagroup: boolean;
  broadcast: boolean;
  verified: boolean;
  dc_id: number | null;
  country?: string | null;
  flag?: string;
  country_confidence?: 'عالية' | 'متوسطة' | 'منخفضة';
  country_evidences?: string[];
  dialect?: string | null;
  match_score?: number;
  match_reason?: string;
}

const DEFAULT_COUNTRIES = [
  'السعودية',
  'الإمارات',
  'مصر',
  'الكويت',
  'قطر',
  'البحرين',
  'عُمان',
  'الأردن',
  'العراق',
  'سوريا',
  'لبنان',
  'فلسطين',
  'اليمن',
  'المغرب',
  'الجزائر',
  'تونس',
  'ليبيا',
  'السودان',
  'تركيا',
  'إيران',
];

const DEFAULT_FLAGS: Record<string, string> = {
  'السعودية': '🇸🇦',
  'الإمارات': '🇦🇪',
  'مصر': '🇪🇬',
  'الكويت': '🇰🇼',
  'قطر': '🇶🇦',
  'البحرين': '🇧🇭',
  'عُمان': '🇴🇲',
  'الأردن': '🇯🇴',
  'العراق': '🇮🇶',
  'سوريا': '🇸🇾',
  'لبنان': '🇱🇧',
  'فلسطين': '🇵🇸',
  'اليمن': '🇾🇪',
  'المغرب': '🇲🇦',
  'الجزائر': '🇩🇿',
  'تونس': '🇹🇳',
  'ليبيا': '🇱🇾',
  'السودان': '🇸🇩',
  'تركيا': '🇹🇷',
  'إيران': '🇮🇷',
};

export const GroupCountryAnalyzerModal: React.FC<GroupCountryAnalyzerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useTelegram();
  const [activeTab, setActiveTab] = useState<'analyzer' | 'geo_search'>('analyzer');

  // Analyzer state
  const [targetLink, setTargetLink] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchLinksText, setBatchLinksText] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<AnalysisReport[]>([]);

  // Geo search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('السعودية');
  const [minMembers, setMinMembers] = useState(0);
  const [isStrictMode, setIsStrictMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeoSearchResultItem[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>(DEFAULT_COUNTRIES);
  const [countryFlags, setCountryFlags] = useState<Record<string, string>>(DEFAULT_FLAGS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch available countries from server on mount
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/geo_search/countries')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.countries)) {
          setAvailableCountries(data.countries);
          if (data.flags) setCountryFlags(data.flags);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  // Single Group Analysis Handler
  const handleAnalyzeSingle = async () => {
    const clean = targetLink.trim();
    if (!clean) {
      showToast('يرجى إدخال رابط أو معرف المجموعة أو القناة', '⚠️');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisReport(null);

    try {
      const res = await fetch('/api/analyze_group_country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ group_link: clean, use_ai: useAi }),
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisReport(data);
        showToast(
          `تم اكتشاف الدولة: ${data.final_country || 'غير محدد'} (${data.confidence || 'منخفضة'})`,
          data.flag || '🌍'
        );
      } else {
        showToast(data.error || 'فشل تحليل المجموعة', '❌');
      }
    } catch (err: any) {
      showToast(`خطأ في الاتصال بالخادم: ${err?.message || err}`, '❌');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Batch Groups Analysis Handler
  const handleAnalyzeBatch = async () => {
    const links = batchLinksText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (links.length === 0) {
      showToast('يرجى لصق رابط واحد على الأقل في السطور', '⚠️');
      return;
    }

    setIsAnalyzing(true);
    setBatchProgress({ current: 0, total: links.length });
    setBatchResults([]);

    try {
      const res = await fetch('/api/analyze_groups_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ links, use_ai: useAi }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`بدأ تحليل ${links.length} رابط بنجاح في الخلفية`, '🚀');
      }
    } catch (err: any) {
      showToast('تعذر بدء التحليل الدفعي', '❌');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Geo Reverse Search Handler
  const handleGeoSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      showToast('يرجى كتابة كلمة مفتاحية للبحث', '⚠️');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch('/api/geo_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          query: q,
          country: selectedCountry,
          min_members: minMembers,
          use_ai: useAi,
          strict: isStrictMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const matches = data.matched || [];
        setSearchResults(matches);
        showToast(
          `تم العثور على ${matches.length} نتيجة في ${selectedCountry}`,
          countryFlags[selectedCountry] || '🌍'
        );
      } else {
        showToast(data.error || 'فشل البحث الجغرافي', '❌');
      }
    } catch (err: any) {
      showToast(`خطأ أثناء البحث: ${err?.message || err}`, '❌');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('تم النسخ إلى الحافظة بنجاح', '📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAnalyzeFromSearch = (url: string) => {
    setTargetLink(url);
    setActiveTab('analyzer');
    setIsBatchMode(false);
    showToast('تم نقل الرابط إلى المحلل الجغرافي', '🔍');
  };

  return (
    <div
      id="group-country-analyzer-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        id="group-country-analyzer-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 text-right"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  محلّل الدولة والبحث الجغرافي العكسي
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  Groq Llama 3.3
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تحليل اللهجة والعملة والمدن ومركز البيانات DC بالذكاء الاصطناعي الفائق
              </p>
            </div>
          </div>
          <button
            id="btn-close-country-analyzer"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-[#1E293B]">
          <button
            id="tab-btn-country-analyzer"
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'analyzer'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>محلّل دولة المجموعة</span>
          </button>
          <button
            id="tab-btn-geo-search"
            onClick={() => setActiveTab('geo_search')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'geo_search'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>محرك البحث الجغرافي المعاكس</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'analyzer' ? (
            <div className="space-y-6">
              {/* Single / Batch Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl max-w-sm">
                <button
                  id="btn-analyzer-single-mode"
                  onClick={() => setIsBatchMode(false)}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                    !isBatchMode
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  فحص رابط مفرد
                </button>
                <button
                  id="btn-analyzer-batch-mode"
                  onClick={() => setIsBatchMode(true)}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                    isBatchMode
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  فحص دفعة روابط (Batch)
                </button>
              </div>

              {!isBatchMode ? (
                /* Single Analysis Form */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="input-analyzer-link"
                        type="text"
                        value={targetLink}
                        onChange={(e) => setTargetLink(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeSingle()}
                        placeholder="أدخل رابط المجموعة أو القناة (مثال: https://t.me/example أو @example)"
                        className="w-full pr-9 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <button
                      id="btn-run-analyzer-single"
                      onClick={handleAnalyzeSingle}
                      disabled={isAnalyzing || !targetLink.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm min-w-[160px]"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جارٍ التحليل...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>بدء التحليل</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Options row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <input
                        type="checkbox"
                        checked={useAi}
                        onChange={(e) => setUseAi(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>تفعيل الذكاء الاصطناعي Groq (Llama 3.3 70B) لكشف اللهجة بدقة</span>
                    </label>

                    {/* Quick test buttons */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>نماذج تجريبية:</span>
                      <button
                        onClick={() => setTargetLink('https://t.me/saudinews50')}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-blue-500"
                      >
                        🇸🇦 أخبار السعودية
                      </button>
                      <button
                        onClick={() => setTargetLink('https://t.me/egyptjobs')}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-blue-500"
                      >
                        🇪🇬 وظائف مصر
                      </button>
                      <button
                        onClick={() => setTargetLink('https://t.me/dubaimarket')}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-blue-500"
                      >
                        🇦🇪 سوق دبي
                      </button>
                    </div>
                  </div>

                  {/* Single Report View */}
                  {analysisReport && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6"
                    >
                      {/* Top Result Banner */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl">{analysisReport.flag || '🌍'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {analysisReport.final_country || 'دولة غير محددة'}
                              </h3>
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                  analysisReport.confidence === 'عالية'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : analysisReport.confidence === 'متوسطة'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                }`}
                              >
                                ثقة {analysisReport.confidence}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {analysisReport.metadata.title} ({analysisReport.metadata.participants_count.toLocaleString()} عضو)
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleCopyText(
                              `تقرير الدولة: ${analysisReport.final_country} (${analysisReport.confidence})\nالمجموعة: ${analysisReport.metadata.title}\nالرابط: ${analysisReport.group_link}`,
                              'report-summary'
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          {copiedId === 'report-summary' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>نسخ التقرير</span>
                        </button>
                      </div>

                      {/* Detail Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Telegram Metadata Card */}
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <Server className="w-4 h-4 text-blue-500" />
                            <span>البيانات الوصفية وشبكة تيليجرام</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">اسم المجموعة:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{analysisReport.metadata.title || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">المعرف (Username):</span>
                              <span className="font-semibold text-blue-500">
                                {analysisReport.metadata.username ? `@${analysisReport.metadata.username}` : 'رابط دعوة خاص'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">الأعضاء:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {analysisReport.metadata.participants_count.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">مركز البيانات (DC):</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {analysisReport.metadata.dc_id
                                  ? `DC ${analysisReport.metadata.dc_id} (${analysisReport.dc_location.city}، ${analysisReport.dc_location.country})`
                                  : 'غير متوفر'}
                              </span>
                            </div>
                            {analysisReport.metadata.created_date && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">تاريخ الإنشاء التقريبي:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {new Date(analysisReport.metadata.created_date).toLocaleDateString('ar-SA')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Groq AI Analysis Card */}
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <Bot className="w-4 h-4 text-purple-500" />
                            <span>استنتاج Groq AI (Llama 3.3)</span>
                          </div>
                          {analysisReport.content_ai.error ? (
                            <div className="text-xs text-rose-500 flex items-center gap-1.5 p-2 rounded bg-rose-500/10">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>{analysisReport.content_ai.error}</span>
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">اللهجة المكتشفة:</span>
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  {analysisReport.content_ai.dialect || 'لهجة عربية عامة'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">المنطقة الجغرافية:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {analysisReport.content_ai.region || '—'}
                                </span>
                              </div>
                              {analysisReport.content_ai.reasoning && (
                                <div className="pt-1">
                                  <span className="text-slate-500 block mb-1">السبب والتحليل:</span>
                                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg leading-relaxed text-[11px]">
                                    {analysisReport.content_ai.reasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Evidence Summary List */}
                      {analysisReport.evidence_summary.length > 0 && (
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            الأدلة والمؤشرات المكتشفة بالمحتوى:
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {analysisReport.evidence_summary.map((ev, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
                              >
                                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Batch Analysis Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      قائمة الروابط المراد تحليلها (رابط في كل سطر):
                    </label>
                    <textarea
                      id="textarea-analyzer-batch"
                      value={batchLinksText}
                      onChange={(e) => setBatchLinksText(e.target.value)}
                      rows={5}
                      placeholder="https://t.me/group1&#10;https://t.me/group2&#10;@group3"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <input
                        type="checkbox"
                        checked={useAi}
                        onChange={(e) => setUseAi(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>استخدام الذكاء الاصطناعي للتحليل المتعمق</span>
                    </label>

                    <button
                      id="btn-run-analyzer-batch"
                      onClick={handleAnalyzeBatch}
                      disabled={isAnalyzing || !batchLinksText.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Layers className="w-4 h-4" />
                      <span>بدء الفحص الدفعي</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Geo Reverse Search Tab */
            <div className="space-y-6">
              {/* Search Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Keyword */}
                <div className="md:col-span-5 relative">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    id="input-geo-search-keyword"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGeoSearch()}
                    placeholder="ابحث بكلمة مفتاحية (مثال: عقارات، وظائف، ملخصات)..."
                    className="w-full pr-9 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                {/* Country selector */}
                <div className="md:col-span-4">
                  <select
                    id="select-geo-search-country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
                  >
                    {availableCountries.map((c) => (
                      <option key={c} value={c}>
                        {countryFlags[c] || '🌍'} {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Button */}
                <div className="md:col-span-3">
                  <button
                    id="btn-run-geo-search"
                    onClick={handleGeoSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ البحث...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>بحث عكسي</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Secondary Options */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-xs">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isStrictMode}
                      onChange={(e) => setIsStrictMode(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>نتائج مؤكدة فقط (استبعاد غير المحددة)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAi}
                      onChange={(e) => setUseAi(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>تحليل بالذكاء الاصطناعي عند عدم التأكد</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">الحد الأدنى للأعضاء:</span>
                  <select
                    value={minMembers}
                    onChange={(e) => setMinMembers(Number(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value={0}>الكل</option>
                    <option value={100}>100+ عضو</option>
                    <option value={500}>500+ عضو</option>
                    <option value={1000}>1,000+ عضو</option>
                    <option value={5000}>5,000+ عضو</option>
                  </select>
                </div>
              </div>

              {/* Search Results List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    النتائج المطابقة ({searchResults.length}):
                  </h4>
                  {searchResults.length > 0 && (
                    <span className="text-xs text-slate-400">
                      مرتبة حسب قوة التطابق وعدد الأعضاء
                    </span>
                  )}
                </div>

                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
                    <Search className="w-8 h-8 mx-auto stroke-1" />
                    <p className="text-xs">
                      أدخل كلمة مفتاحية واختر الدولة لبدء البحث الجغرافي العكسي في تيليجرام
                    </p>
                  </div>
                )}

                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{item.flag || countryFlags[item.country || ''] || '🌍'}</span>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.title}
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.broadcast ? 'قناة' : 'مجموعة'}
                        </span>
                        {item.match_score && item.match_score >= 2 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            تطابق مؤكد
                          </span>
                        )}
                      </div>

                      {item.about && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.about}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {item.members.toLocaleString()} عضو
                        </span>
                        {item.username && (
                          <span className="text-blue-500 font-mono">
                            @{item.username}
                          </span>
                        )}
                        {item.country && (
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            الدولة: {item.country} ({item.country_confidence})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                          title="فتح في تيليجرام"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {item.url && (
                        <button
                          onClick={() => handleCopyText(item.url, `res-${item.id}`)}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                          title="نسخ الرابط"
                        >
                          {copiedId === `res-${item.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleAnalyzeFromSearch(item.url || item.username || '')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        تحليل تفصيلي
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
