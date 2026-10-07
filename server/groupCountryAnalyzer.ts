/**
 * ══════════════════════════════════════════════════════════════════════════
 *   محلّل دولة المجموعة على تيليجرام & محرك البحث الجغرافي العكسي
 *   دمج: تحليل المحتوى + اللهجة + العملة + DC + Groq AI (Llama 3.3 70B)
 * ══════════════════════════════════════════════════════════════════════════
 */

import { Api, TelegramClient } from 'telegram';
import type { Express, Request, Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';

// ── مفتاح Groq الدائم والمدمج بالنظام ──
// GROQ_API_KEY from environment
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// ── خريطة مراكز بيانات تيليجرام (Telegram Data Centers) ──
export const DC_LOCATIONS: Record<number, { city: string; country: string; code: string }> = {
  1: { city: 'ميامي', country: 'الولايات المتحدة', code: 'US' },
  2: { city: 'أمستردام', country: 'هولندا', code: 'NL' },
  3: { city: 'ميامي', country: 'الولايات المتحدة', code: 'US' },
  4: { city: 'أمستردام', country: 'هولندا', code: 'NL' },
  5: { city: 'سنغافورة', country: 'سنغافورة', code: 'SG' },
};

// ── أعلام الدول ──
export const COUNTRY_FLAGS: Record<string, string> = {
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

// ── مؤشرات الدول/المناطق حسب اللهجة والعملة والمدن والهواتف والنطاقات ──
export const COUNTRY_INDICATORS: Record<
  string,
  {
    dialect: string[];
    currency: string[];
    cities: string[];
    phone: string[];
    domains: string[];
  }
> = {
  'السعودية': {
    dialect: ['ابشر', 'مايهمك', 'وش', 'ايش', 'كيفك', 'زين', 'عساك', 'تسلم', 'ياطويل العمر', 'أبشر', 'يعطيك العافية', 'لاهنت'],
    currency: ['ريال', 'SAR', '﷼', 'هللة', 'رس'],
    cities: ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'أبها', 'الطائف', 'القصيم', 'تبوك', 'حائل', 'نجران', 'جازان'],
    phone: ['+966', '966', '05'],
    domains: ['.sa', '.com.sa', '.edu.sa', '.gov.sa'],
  },
  'الإمارات': {
    dialect: ['شو', 'زين', 'الحين', 'يعطيك العافية', 'شحالك', 'أبا', 'وايد', 'سير', 'دخيلك', 'فديتك'],
    currency: ['درهم', 'AED', 'فلس', 'د.إ'],
    cities: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'العين', 'أم القيوين'],
    phone: ['+971', '971', '050', '052', '055', '056'],
    domains: ['.ae'],
  },
  'مصر': {
    dialect: ['ازاي', 'إيه', 'عامل ايه', 'خلاص', 'كده', 'دلوقتي', 'أوي', 'معلش', 'بص', 'يعني', 'طب', 'يا باشا', 'حبيبي'],
    currency: ['جنيه', 'EGP', 'قرش', 'ج.م'],
    cities: ['القاهرة', 'الإسكندرية', 'الجيزة', 'طنطا', 'المنصورة', 'أسيوط', 'أسوان', 'الزقازيق', 'بورسعيد', 'السويس', 'شرم الشيخ'],
    phone: ['+20', '20', '010', '011', '012', '015'],
    domains: ['.eg', '.com.eg'],
  },
  'الكويت': {
    dialect: ['شلونك', 'زين', 'اي', 'چذي', 'وايد', 'شكو ماكو', 'ابشري', 'قواك الله', 'يا هلا'],
    currency: ['دينار', 'KWD', 'فلس', 'د.ك'],
    cities: ['الكويت', 'الجهراء', 'حولي', 'الفروانية', 'الأحمدي', 'مبارك الكبير', 'السالمية'],
    phone: ['+965', '965'],
    domains: ['.kw', '.com.kw'],
  },
  'قطر': {
    dialect: ['شلونك', 'زين', 'وايد', 'أكيد', 'يا طويل العمر', 'شخبارك', 'مرحبا ومسهلا'],
    currency: ['ريال قطري', 'QAR', 'درهم قطري', 'ر.ق'],
    cities: ['الدوحة', 'الوكرة', 'الخور', 'الريان', 'أم صلال', 'لوسيل'],
    phone: ['+974', '974'],
    domains: ['.qa'],
  },
  'البحرين': {
    dialect: ['شلونك', 'زين', 'وايد', 'اي', 'خوش', 'عساك طيب', 'هلا والله'],
    currency: ['دينار بحريني', 'BHD', 'د.ب'],
    cities: ['المنامة', 'المحرق', 'الرفاع', 'سترة', 'مدينة عيسى', 'مدينة حمد'],
    phone: ['+973', '973'],
    domains: ['.bh'],
  },
  'عُمان': {
    dialect: ['شحالك', 'زين', 'وايد', 'مو', 'تو', 'عاد', 'اخبارك', 'حبوب'],
    currency: ['ريال عماني', 'OMR', 'بيسة', 'ر.ع'],
    cities: ['مسقط', 'صلالة', 'صحار', 'نزوى', 'صور', 'البريمي', 'السيب'],
    phone: ['+968', '968'],
    domains: ['.om'],
  },
  'الأردن': {
    dialect: ['شو', 'كيفك', 'زلمة', 'منيح', 'شو أخبارك', 'يخزي', 'هيك', 'يسعد مساك', 'حبيبي'],
    currency: ['دينار أردني', 'JOD', 'قرش', 'د.أ'],
    cities: ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'المفرق', 'السلط', 'مادبا', 'جرش'],
    phone: ['+962', '962', '077', '078', '079'],
    domains: ['.jo'],
  },
  'العراق': {
    dialect: ['شلونك', 'شكو ماكو', 'هواية', 'زين', 'شبيها', 'چان', 'فدوه', 'عيني', 'اكو', 'ماكو'],
    currency: ['دينار عراقي', 'IQD', 'د.ع', 'ألف دينار'],
    cities: ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'النجف', 'كربلاء', 'السليمانية', 'كركوك', 'بابل'],
    phone: ['+964', '964', '077', '078', '075'],
    domains: ['.iq'],
  },
  'سوريا': {
    dialect: ['شو', 'كيفك', 'منيح', 'هلق', 'لك', 'ياعمي', 'شلونك', 'تسلملي', 'ابن عمي'],
    currency: ['ليرة سورية', 'SYP', 'ل.س'],
    cities: ['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'دير الزور', 'طرطوس', 'درعا'],
    phone: ['+963', '963'],
    domains: ['.sy'],
  },
  'لبنان': {
    dialect: ['شو', 'كيفك', 'هيدا', 'هيدي', 'منيح', 'كتير', 'لك', 'ولو', 'تقبرني', 'حبيبي'],
    currency: ['ليرة لبنانية', 'LBP', 'ل.ل', 'دولار'],
    cities: ['بيروت', 'طرابلس', 'صيدا', 'صور', 'زحلة', 'جونية', 'جبيل', 'النبطية'],
    phone: ['+961', '961'],
    domains: ['.lb'],
  },
  'فلسطين': {
    dialect: ['شو', 'كيفك', 'منيح', 'هلق', 'زي', 'لك', 'وين', 'يسعدك', 'يا سيدي', 'شو في'],
    currency: ['شيكل', 'ILS', 'دينار أردني', 'NIS'],
    cities: ['القدس', 'غزة', 'رام الله', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم', 'خان يونس', 'رفح'],
    phone: ['+970', '970', '+972', '059', '056'],
    domains: ['.ps'],
  },
  'اليمن': {
    dialect: ['كيف حالك', 'زين', 'شو', 'ايش', 'عساك', 'طيب', 'وانت', 'يا خبير', 'ماشي', 'حياك الله', 'ارحب'],
    currency: ['ريال يمني', 'YER', 'ر.ي'],
    cities: ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'حضرموت', 'المكلا', 'ذمار', 'مأرب', 'سيئون'],
    phone: ['+967', '967', '77', '73', '71', '70'],
    domains: ['.ye'],
  },
  'المغرب': {
    dialect: ['كيفاش', 'بزاف', 'مزيان', 'دابا', 'واخا', 'غير', 'صافي', 'شكون', 'راه', 'عفاك'],
    currency: ['درهم مغربي', 'MAD', 'سنتيم', 'د.م'],
    cities: ['الدار البيضاء', 'الرباط', 'فاس', 'مراكش', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'تطوان'],
    phone: ['+212', '212', '06', '07'],
    domains: ['.ma'],
  },
  'الجزائر': {
    dialect: ['كيفاش', 'بزاف', 'مليح', 'واش', 'راك', 'خلاص', 'لاباس', 'صحا', 'كاين', 'درك'],
    currency: ['دينار جزائري', 'DZD', 'د.ج'],
    cities: ['الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'سطيف', 'باتنة', 'تلمسان', 'البليدة', 'بجاية'],
    phone: ['+213', '213', '05', '06', '07'],
    domains: ['.dz'],
  },
  'تونس': {
    dialect: ['شنوة', 'برشة', 'باهي', 'كيفاش', 'ياخي', 'علاش', 'شبيك', 'توة', 'يعيشك'],
    currency: ['دينار تونسي', 'TND', 'مليم', 'د.ت'],
    cities: ['تونس', 'صفاقس', 'سوسة', 'بنزرت', 'القيروان', 'قابس', 'أريانة', 'المنستير'],
    phone: ['+216', '216'],
    domains: ['.tn'],
  },
  'ليبيا': {
    dialect: ['شحالك', 'زي', 'وايد', 'وين', 'شنو', 'هلبة', 'شنجوك', 'باهي', 'صقع'],
    currency: ['دينار ليبي', 'LYD', 'درهم ليبي', 'د.ل'],
    cities: ['طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'سبها', 'البيضاء', 'طبرق', 'سرت'],
    phone: ['+218', '218', '091', '092'],
    domains: ['.ly'],
  },
  'السودان': {
    dialect: ['كيفنك', 'زول', 'شديد', 'قسما', 'بالله', 'يا زول', 'حبابك', 'سمح', 'داير شنو'],
    currency: ['جنيه سوداني', 'SDG', 'ج.س'],
    cities: ['الخرطوم', 'أم درمان', 'بورتسودان', 'كسلا', 'الأبيض', 'نيالا', 'ود مدني', 'الفاشر'],
    phone: ['+249', '249'],
    domains: ['.sd'],
  },
  'تركيا': {
    dialect: ['merhaba', 'nasılsın', 'tamam', 'evet', 'hayır', 'teşekkür', 'lütfen', 'günaydın'],
    currency: ['ليرة تركية', 'TRY', 'TL', '₺'],
    cities: ['إسطنبول', 'أنقرة', 'إزمير', 'أنطاليا', 'بورصة', 'أضنة', 'غازي عنتاب', 'قونية'],
    phone: ['+90', '90'],
    domains: ['.tr', '.com.tr'],
  },
  'إيران': {
    dialect: ['سلام', 'ممنون', 'خوبی', 'بله', 'نه', 'تشکر', 'صبح بخیر', 'قربانت'],
    currency: ['ريال إيراني', 'IRR', 'تومان'],
    cities: ['طهران', 'أصفهان', 'مشهد', 'شيراز', 'تبريز', 'كرج', 'قم', 'أهواز'],
    phone: ['+98', '98'],
    domains: ['.ir'],
  },
};

export interface GroupMetadata {
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

export interface ContentLocalAnalysis {
  country: string | null;
  confidence: 'عالية' | 'متوسطة' | 'منخفضة';
  score: number;
  all_scores: Record<string, number>;
  evidences: string[];
}

export interface ContentAiAnalysis {
  country?: string | null;
  country_code?: string;
  region?: string;
  confidence?: 'عالية' | 'متوسطة' | 'منخفضة';
  language?: string;
  dialect?: string;
  indicators?: string[];
  reasoning?: string;
  error?: string;
  raw?: string;
}

export interface GroupCountryReport {
  success: boolean;
  group_link: string;
  analyzed_at: string;
  metadata: GroupMetadata;
  dc_location: { city: string; country: string; code: string | null };
  content_local: ContentLocalAnalysis;
  content_ai: ContentAiAnalysis;
  final_country: string | null;
  flag?: string;
  confidence: 'عالية' | 'متوسطة' | 'منخفضة';
  evidence_summary: string[];
  error?: string;
}

export interface GeoSearchResultItem {
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

/**
 * جمع البيانات الوصفية للمجموعة أو القناة
 */
export async function collectMetadata(client: TelegramClient, entity: any): Promise<GroupMetadata> {
  const meta: GroupMetadata = {
    id: entity?.id ? String(entity.id) : null,
    title: entity?.title || entity?.firstName || '',
    username: entity?.username || null,
    participants_count: entity?.participantsCount || 0,
    about: entity?.about || '',
    dc_id: null,
    created_date: null,
    is_megagroup: Boolean(entity?.megagroup),
    is_broadcast: Boolean(entity?.broadcast),
    is_verified: Boolean(entity?.verified),
    is_restricted: Boolean(entity?.restricted),
  };

  // محاولة جلب الوصف الكامل (GetFullChannel)
  try {
    if (entity?.broadcast || entity?.megagroup || entity?.className === 'Channel') {
      const full = (await client.invoke(
        new Api.channels.GetFullChannel({
          channel: entity,
        })
      )) as any;
      if (full && full.fullChat) {
        meta.about = full.fullChat.about || meta.about;
        meta.participants_count = full.fullChat.participantsCount || meta.participants_count;
      }
    }
  } catch (err) {
    // Non-critical, ignore
  }

  // استخراج معرف مركز البيانات DC من صورة المجموعة/القناة إن وجدت
  try {
    if (entity?.photo && (entity.photo as any).dcId) {
      meta.dc_id = (entity.photo as any).dcId;
    }
  } catch (_) {}

  // تاريخ الإنشاء أو تاريخ أول رسالة تقريبية
  try {
    if (entity?.date) {
      meta.created_date = new Date(entity.date * 1000).toISOString();
    } else {
      const firstMsg = await client.getMessages(entity, { limit: 1, reverse: true });
      if (firstMsg && firstMsg[0] && firstMsg[0].date) {
        meta.created_date = new Date(firstMsg[0].date * 1000).toISOString();
      }
    }
  } catch (_) {}

  return meta;
}

/**
 * تحليل المحتوى محلياً (لهجة، عملة، مدن، هواتف، نطاقات) بدون AI
 */
export function analyzeContentLocally(texts: string[]): ContentLocalAnalysis {
  const full = texts.join('\n').toLowerCase();
  const scores: Record<string, number> = {};
  const evidences: Record<string, string[]> = {};

  for (const [country, ind] of Object.entries(COUNTRY_INDICATORS)) {
    const ev: string[] = [];

    // اللهجة
    for (const kw of ind.dialect) {
      if (full.includes(kw.toLowerCase())) {
        scores[country] = (scores[country] || 0) + 3;
        ev.push(`لهجة: ${kw}`);
        break;
      }
    }

    // العملة
    for (const cur of ind.currency) {
      if (full.includes(cur.toLowerCase())) {
        scores[country] = (scores[country] || 0) + 5;
        ev.push(`عملة: ${cur}`);
        break;
      }
    }

    // المدن
    for (const city of ind.cities) {
      if (full.includes(city.toLowerCase())) {
        scores[country] = (scores[country] || 0) + 4;
        ev.push(`مدينة: ${city}`);
        break;
      }
    }

    // أكواد الهاتف
    for (const ph of ind.phone) {
      if (full.includes(ph.toLowerCase())) {
        scores[country] = (scores[country] || 0) + 6;
        ev.push(`هاتف: ${ph}`);
        break;
      }
    }

    // النطاقات
    for (const dm of ind.domains) {
      if (full.includes(dm.toLowerCase())) {
        scores[country] = (scores[country] || 0) + 3;
        ev.push(`نطاق: ${dm}`);
        break;
      }
    }

    if (ev.length > 0) {
      evidences[country] = ev.slice(0, 6);
    }
  }

  // روابط واتساب أو تيليجرام أو هواتف دولية بتنسيق +xxx
  const intlPhones = full.match(/\+(\d{1,3})[\s\-]?\d/g) || [];
  for (const match of intlPhones) {
    const code = match.replace(/\D/g, '');
    for (const [country, ind] of Object.entries(COUNTRY_INDICATORS)) {
      if (ind.phone.some((p) => p.includes(code) || code.startsWith(p.replace('+', '')))) {
        scores[country] = (scores[country] || 0) + 2;
        evidences[country] = evidences[country] || [];
        if (!evidences[country].includes(`رقم دولي: +${code}`)) {
          evidences[country].push(`رقم دولي: +${code}`);
        }
        break;
      }
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return {
      country: null,
      confidence: 'منخفضة',
      score: 0,
      all_scores: {},
      evidences: [],
    };
  }

  const [topCountry, topScore] = entries[0];
  const total = entries.reduce((sum, [, s]) => sum + s, 0);
  const ratio = topScore / Math.max(total, 1);
  const confidence: 'عالية' | 'متوسطة' | 'منخفضة' = ratio > 0.5 ? 'عالية' : ratio > 0.3 ? 'متوسطة' : 'منخفضة';

  const topScoresObj: Record<string, number> = {};
  entries.slice(0, 5).forEach(([c, s]) => {
    topScoresObj[c] = s;
  });

  return {
    country: topCountry,
    confidence,
    score: topScore,
    all_scores: topScoresObj,
    evidences: evidences[topCountry] || [],
  };
}

/**
 * تحليل المحتوى بالذكاء الاصطناعي (Groq Llama-3.3-70b-versatile)
 */
export async function analyzeContentWithGroq(texts: string[], sampleSize = 60): Promise<ContentAiAnalysis> {
  const activeGroqKey = GROQ_API_KEY;
  if (!activeGroqKey) {
    return { error: 'مفتاح Groq API غير متوفر' };
  }

  const sample = texts
    .slice(0, sampleSize)
    .join('\n---\n')
    .slice(0, 5000);

  const prompt = `أنت محلّل خبير في تحديد الدولة الجغرافية لمجموعات وقنوات تيليجرام.

حلّل الرسائل التالية واستنتج الدولة/المنطقة الأرجح للمجموعة بناءً على:
- اللهجة والكلمات العامية والمفردات الدارجة
- العملة والأسعار وتنسيق الأرقام
- أسماء المدن والأحياء والمناطق
- الأرقام الدولية ومفاتيح الاتصال
- الأحداث والمناسبات والتواريخ
- طبيعة المعاملات والعادات

═══════ الرسائل ═══════
${sample}
══════════════════════

أجب بصيغة JSON فقط (بدون أي نص أو مقدمات أو كتل markdown إضافية):
{
  "country": "اسم الدولة بالعربية",
  "country_code": "رمز ISO للدولة حرفين مثل SA أو EG أو AE أو YE",
  "region": "المنطقة (خليج/شام/مغرب عربي/شمال أفريقيا)",
  "confidence": "عالية|متوسطة|منخفضة",
  "language": "اللغة الأساسية",
  "dialect": "اللهجة المكتشفة (مثل: خليجية سعودية، مصرية، شامية)",
  "indicators": ["مؤشر 1", "مؤشر 2", "مؤشر 3"],
  "reasoning": "شرح موجز ومنطقي جداً لسبب اختيار هذه الدولة"
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeGroqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'أنت محلّل جغرافي دقيق وذكي. تُجيب بصيغة JSON حصراً.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Groq HTTP ${res.status}: ${errText}` };
    }

    const data: any = await res.json();
    const raw = (data?.choices?.[0]?.message?.content || '').trim();

    // Clean potential code block wrapper
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch (parseErr: any) {
        return { error: `خطأ في تحليل استجابة Groq JSON: ${parseErr.message}`, raw };
      }
    }
    return { error: 'تعذر العثور على JSON صالح في استجابة Groq', raw };
  } catch (err: any) {
    return { error: `فشل الاتصال بـ Groq: ${err?.message || err}` };
  }
}

/**
 * تحويل رقم DC إلى موقع جغرافي
 */
export function dcToLocation(dcId: number | null): { city: string; country: string; code: string | null } {
  if (!dcId || !DC_LOCATIONS[dcId]) {
    return { city: 'غير محدد', country: 'غير محدد', code: null };
  }
  return DC_LOCATIONS[dcId];
}

/**
 * المحلل الرئيسي المتكامل لدولة المجموعة/القناة
 */
export async function analyzeGroupCountryAsync(
  client: TelegramClient,
  groupLink: string,
  useAi = true
): Promise<GroupCountryReport> {
  const report: GroupCountryReport = {
    success: false,
    group_link: groupLink,
    analyzed_at: new Date().toISOString(),
    metadata: {
      id: null,
      title: '',
      username: null,
      participants_count: 0,
      about: '',
      dc_id: null,
      created_date: null,
      is_megagroup: false,
      is_broadcast: false,
      is_verified: false,
      is_restricted: false,
    },
    dc_location: { city: 'غير محدد', country: 'غير محدد', code: null },
    content_local: {
      country: null,
      confidence: 'منخفضة',
      score: 0,
      all_scores: {},
      evidences: [],
    },
    content_ai: {},
    final_country: null,
    confidence: 'منخفضة',
    evidence_summary: [],
  };

  let clean = groupLink.trim();
  if (clean.includes('t.me/')) {
    clean = clean.split('t.me/')[1].split('?')[0];
  }
  clean = clean.replace(/^@/, '').replace(/\/$/, '');

  if (!clean) {
    report.error = 'رابط المجموعة أو المعرف فارغ';
    return report;
  }

  let entity: any = null;
  try {
    // Check if invite link with hash (+)
    if (clean.startsWith('+') || clean.includes('joinchat/')) {
      const hash = clean.replace(/^\+/, '').replace('joinchat/', '');
      const inviteCheck: any = await client.invoke(new Api.messages.CheckChatInvite({ hash }));
      report.metadata.title = inviteCheck.title || inviteCheck.chat?.title || 'مجموعة خاصة';
      report.metadata.participants_count = inviteCheck.participantsCount || 0;
      report.metadata.about = inviteCheck.about || '';
      report.metadata.is_broadcast = Boolean(inviteCheck.broadcast);
      report.metadata.is_megagroup = Boolean(inviteCheck.megagroup);
      entity = inviteCheck.chat || null;
    } else {
      entity = await client.getEntity(clean);
    }
  } catch (err: any) {
    // Try resolving as username
    try {
      const res: any = await client.invoke(new Api.contacts.ResolveUsername({ username: clean }));
      if (res && res.chats && res.chats.length > 0) {
        entity = res.chats[0];
      }
    } catch (_) {}

    if (!entity) {
      report.error = `تعذر الوصول للمجموعة: ${err?.errorMessage || err?.message || err}`;
      return report;
    }
  }

  // 2. جمع البيانات الوصفية
  try {
    report.metadata = await collectMetadata(client, entity);
    report.dc_location = dcToLocation(report.metadata.dc_id);
  } catch (metaErr: any) {
    console.warn('[CountryAnalyzer] Metadata warning:', metaErr?.message || metaErr);
  }

  // 3. جمع الرسائل النصية الأخيرة
  const texts: string[] = [];
  if (report.metadata.about) {
    texts.push(report.metadata.about);
  }

  try {
    const messages = await client.getMessages(entity, { limit: 100 });
    for (const msg of messages) {
      if (msg && msg.message && msg.message.trim().length > 3) {
        texts.push(msg.message.trim());
      }
    }
  } catch (msgErr: any) {
    console.warn('[CountryAnalyzer] Messages warning:', msgErr?.message || msgErr);
  }

  // 4. التحليل المحلي
  try {
    report.content_local = analyzeContentLocally(texts);
  } catch (locErr: any) {
    console.warn('[CountryAnalyzer] Local analysis error:', locErr);
  }

  // 5. التحليل بالذكاء الاصطناعي (Groq)
  if (useAi && texts.length > 0) {
    try {
      report.content_ai = await analyzeContentWithGroq(texts);
    } catch (aiErr: any) {
      report.content_ai = { error: String(aiErr?.message || aiErr) };
    }
  }

  // 6. دمج النتائج وتحديد الدولة النهائية ومستوى الثقة
  const votes: Record<string, number> = {};
  const evidences: string[] = [];

  const aiCountry = report.content_ai?.country;
  if (aiCountry && COUNTRY_INDICATORS[aiCountry]) {
    votes[aiCountry] = (votes[aiCountry] || 0) + 3;
    evidences.push(`الذكاء الاصطناعي (Groq): ${aiCountry} (${report.content_ai?.dialect || 'لهجة واضحة'})`);
  } else if (aiCountry) {
    votes[aiCountry] = (votes[aiCountry] || 0) + 2;
    evidences.push(`الذكاء الاصطناعي: ${aiCountry}`);
  }

  const localCountry = report.content_local?.country;
  if (localCountry) {
    votes[localCountry] = (votes[localCountry] || 0) + 2;
    evidences.push(`التحليل المحلي: ${localCountry} (${report.content_local.evidences.join('، ')})`);
  }

  const voteEntries = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (voteEntries.length > 0) {
    const top = voteEntries[0][0];
    report.final_country = top;
    report.flag = COUNTRY_FLAGS[top] || '🌍';

    const aiConf = report.content_ai?.confidence || 'منخفضة';
    const locConf = report.content_local?.confidence || 'منخفضة';
    report.confidence = aiConf === 'عالية' || locConf === 'عالية' ? 'عالية' : aiConf === 'متوسطة' || locConf === 'متوسطة' ? 'متوسطة' : 'منخفضة';
  } else {
    report.final_country = null;
    report.flag = '🌍';
    report.confidence = 'منخفضة';
  }

  report.evidence_summary = evidences;
  report.success = true;
  return report;
}

/**
 * فحص قناة أو مجموعة وإثراء بياناتها الجغرافية للبحث المعاكس
 */
export async function enrichChannelWithLocation(
  client: TelegramClient,
  channelInfo: GeoSearchResultItem,
  useAi = false,
  sampleMsgs = 25
): Promise<GeoSearchResultItem> {
  const enriched: GeoSearchResultItem = { ...channelInfo };
  enriched.country = null;
  enriched.country_confidence = 'منخفضة';
  enriched.country_evidences = [];
  enriched.dialect = null;

  if (!channelInfo.username) {
    return enriched;
  }

  const uname = channelInfo.username.replace(/^@/, '');
  let entity: any = null;

  try {
    entity = await client.getEntity(uname);
  } catch (_) {
    try {
      const r: any = await client.invoke(new Api.contacts.ResolveUsername({ username: uname }));
      entity = r.chats?.[0] || r.users?.[0] || null;
    } catch (_) {
      return enriched;
    }
  }

  if (!entity) return enriched;

  // الوصف والأعضاء
  try {
    const full: any = await client.invoke(new Api.channels.GetFullChannel({ channel: entity }));
    if (full && full.fullChat) {
      enriched.about = full.fullChat.about || enriched.about || '';
      enriched.members = full.fullChat.participantsCount || enriched.members || 0;
    }
  } catch (_) {}

  // عينة من الرسائل
  const texts: string[] = [];
  if (enriched.about) texts.push(enriched.about);

  try {
    const msgs = await client.getMessages(entity, { limit: sampleMsgs });
    for (const m of msgs) {
      if (m && m.message && m.message.trim().length > 3) {
        texts.push(m.message.trim());
      }
    }
  } catch (_) {}

  // التحليل المحلي السريع
  const localAnalysis = analyzeContentLocally(texts);
  if (localAnalysis.country) {
    enriched.country = localAnalysis.country;
    enriched.flag = COUNTRY_FLAGS[localAnalysis.country] || '🌍';
    enriched.country_confidence = localAnalysis.confidence;
    enriched.country_evidences = localAnalysis.evidences;
  }

  // الاستعانة بـ Groq AI في حال عدم التأكد
  if (useAi && GROQ_API_KEY && (!enriched.country || enriched.country_confidence !== 'عالية')) {
    try {
      const ai = await analyzeContentWithGroq(texts, 20);
      if (ai && ai.country) {
        enriched.country = ai.country;
        enriched.flag = COUNTRY_FLAGS[ai.country] || '🌍';
        enriched.country_confidence = ai.confidence || 'متوسطة';
        enriched.dialect = ai.dialect || null;
        if (ai.reasoning) {
          enriched.country_evidences = enriched.country_evidences || [];
          enriched.country_evidences.push(`AI: ${ai.reasoning.slice(0, 90)}`);
        }
      }
    } catch (_) {}
  }

  return enriched;
}

/**
 * محرك البحث الجغرافي المعاكس (البحث بكلمة مفتاحية + تصفية لدولة معينة)
 */
export async function geoReverseSearchAsync(
  client: TelegramClient,
  query: string,
  targetCountry: string,
  options: {
    maxResults?: number;
    minMembers?: number;
    useAi?: boolean;
    strict?: boolean;
  } = {}
) {
  const maxResults = options.maxResults || 40;
  const minMembers = options.minMembers || 0;
  const useAi = options.useAi !== false;
  const strict = Boolean(options.strict);

  const report = {
    success: false,
    query,
    target_country: targetCountry,
    search_time: new Date().toISOString(),
    total_found: 0,
    matched_count: 0,
    rejected_count: 0,
    matched: [] as GeoSearchResultItem[],
    rejected: [] as GeoSearchResultItem[],
    errors: [] as string[],
  };

  const seenIds = new Set<string>();
  const rawResults: GeoSearchResultItem[] = [];

  // المرحلة 1: البحث الواسع عبر تيليجرام بواسطة contacts.Search
  try {
    const searchRes: any = await client.invoke(new Api.contacts.Search({ q: query, limit: Math.min(maxResults * 3, 100) }));
    for (const chat of searchRes.chats || []) {
      const id = String(chat.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      rawResults.push({
        id,
        title: chat.title || '',
        username: chat.username || null,
        url: chat.username ? `https://t.me/${chat.username}` : '',
        members: chat.participantsCount || 0,
        about: '',
        megagroup: Boolean(chat.megagroup),
        broadcast: Boolean(chat.broadcast),
        verified: Boolean(chat.verified),
        dc_id: chat.photo?.dcId || null,
      });
    }
  } catch (err: any) {
    report.errors.push(`فشل البحث الشامل عبر جهات الاتصال: ${err?.message || err}`);
  }

  // Fallback: messages.SearchGlobal
  if (rawResults.length < 20) {
    try {
      const globalRes: any = await client.invoke(
        new Api.messages.SearchGlobal({
          q: query,
          offsetPeer: new Api.InputPeerEmpty(),
          offsetId: 0,
          limit: 50,
        } as any)
      );
      for (const chat of globalRes.chats || []) {
        const id = String(chat.id);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        rawResults.push({
          id,
          title: chat.title || '',
          username: chat.username || null,
          url: chat.username ? `https://t.me/${chat.username}` : '',
          members: chat.participantsCount || 0,
          about: '',
          megagroup: Boolean(chat.megagroup),
          broadcast: Boolean(chat.broadcast),
          verified: Boolean(chat.verified),
          dc_id: chat.photo?.dcId || null,
        });
      }
    } catch (_) {}
  }

  report.total_found = rawResults.length;

  if (rawResults.length === 0) {
    report.success = true;
    return report;
  }

  // فلترة حسب الحد الأدنى للأعضاء
  let filtered = rawResults;
  if (minMembers > 0) {
    filtered = filtered.filter((r) => (r.members || 0) >= minMembers);
  }

  // ترتيب حسب عدد الأعضاء مبدئياً
  filtered.sort((a, b) => (b.members || 0) - (a.members || 0));

  // المرحلة 2: إثراء النتائج جغرافياً
  const candidates = filtered.slice(0, Math.min(maxResults * 2, 40));
  const enrichedList: GeoSearchResultItem[] = [];

  for (const item of candidates) {
    try {
      const enriched = await enrichChannelWithLocation(client, item, useAi, 20);
      enrichedList.push(enriched);
      // Small pause to avoid hitting Telegram flood limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      enrichedList.push(item);
    }
  }

  // المرحلة 3: تصفية وتصنيف حسب الدولة المستهدفة
  const matched: GeoSearchResultItem[] = [];
  const rejected: GeoSearchResultItem[] = [];

  for (const item of enrichedList) {
    const country = item.country;
    const conf = item.country_confidence || 'منخفضة';

    if (country === targetCountry) {
      item.match_score = conf === 'عالية' ? 3 : conf === 'متوسطة' ? 2 : 1;
      item.match_reason = `دولة مطابقة (${conf})`;
      matched.push(item);
    } else if (!strict && !country) {
      item.match_score = 0;
      item.match_reason = 'دولة غير محددة بعد';
      matched.push(item);
    } else {
      item.match_reason = `دولة مختلفة: ${country || 'غير معروف'}`;
      rejected.push(item);
    }
  }

  // ترتيب النتائج: أعلى درجة تطابق ثم أكبر عدد أعضاء
  matched.sort((a, b) => {
    const scoreDiff = (b.match_score || 0) - (a.match_score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.members || 0) - (a.members || 0);
  });

  report.matched = matched.slice(0, maxResults);
  report.rejected = rejected.slice(0, 20);
  report.matched_count = report.matched.length;
  report.rejected_count = report.rejected.length;
  report.success = true;

  return report;
}

/**
 * تسجيل المسارات في Express و Socket.IO
 */
export function registerGroupCountryRoutes(
  app: Express,
  io: SocketIOServer,
  getActiveClient: () => TelegramClient | null
) {
  // 1. قائمة الدول المتاحة
  app.get('/api/geo_search/countries', (req: Request, res: Response) => {
    const countries = Object.keys(COUNTRY_INDICATORS).sort();
    return res.json({
      success: true,
      countries,
      flags: COUNTRY_FLAGS,
      groqConfigured: Boolean(GROQ_API_KEY),
    });
  });

  // 2. تحليل دولة مجموعة واحدة
  app.post('/api/analyze_group_country', async (req: Request, res: Response) => {
    try {
      const { group_link, use_ai } = req.body || {};
      const link = (group_link || '').trim();

      if (!link) {
        return res.status(400).json({ success: false, error: 'يجب إرسال رابط أو معرف المجموعة' });
      }

      const client = getActiveClient();
      if (!client || !client.connected) {
        return res.status(503).json({
          success: false,
          error: 'حساب تيليجرام غير متصل حالياً. يرجى تسجيل الدخول أولاً.',
        });
      }

      // بث إشعار البدء
      io.emit('log_update', {
        message: `🔍 جارٍ تحليل دولة المجموعة: ${link}...`,
        timestamp: Date.now(),
      });

      const report = await analyzeGroupCountryAsync(client, link, use_ai !== false);

      if (report.success) {
        io.emit('log_update', {
          message: `✅ نتيجة التحليل: ${report.final_country || 'غير محدد'} (ثقة: ${report.confidence})`,
          timestamp: Date.now(),
        });
        io.emit('group_country_result', report);
      }

      return res.json(report);
    } catch (err: any) {
      console.error('[CountryAnalyzer] Route error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'خطأ غير متوقع في التحليل' });
    }
  });

  // 3. تحليل دفعة روابط
  app.post('/api/analyze_groups_batch', async (req: Request, res: Response) => {
    try {
      const { links, use_ai } = req.body || {};
      if (!Array.isArray(links) || links.length === 0) {
        return res.status(400).json({ success: false, error: 'أرسل قائمة روابط صالحة للتحليل' });
      }

      const client = getActiveClient();
      if (!client || !client.connected) {
        return res.status(503).json({
          success: false,
          error: 'حساب تيليجرام غير متصل حالياً. يرجى تسجيل الدخول أولاً.',
        });
      }

      const total = links.length;
      const cleanLinks = links.map((l: string) => String(l).trim()).filter(Boolean);

      // تشغيل التحليل في الخلفية وبث النتائج عبر Socket.IO
      (async () => {
        const results: GroupCountryReport[] = [];
        for (let i = 0; i < cleanLinks.length; i++) {
          const currentLink = cleanLinks[i];
          try {
            io.emit('log_update', {
              message: `🔍 [${i + 1}/${total}] جارٍ تحليل: ${currentLink}`,
              timestamp: Date.now(),
            });

            const rep = await analyzeGroupCountryAsync(client, currentLink, use_ai !== false);
            results.push(rep);

            io.emit('group_country_batch_progress', {
              index: i + 1,
              total,
              link: currentLink,
              country: rep.final_country,
              confidence: rep.confidence,
              flag: rep.flag,
            });

            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (e: any) {
            results.push({
              success: false,
              group_link: currentLink,
              analyzed_at: new Date().toISOString(),
              metadata: {
                id: null,
                title: '',
                username: null,
                participants_count: 0,
                about: '',
                dc_id: null,
                created_date: null,
                is_megagroup: false,
                is_broadcast: false,
                is_verified: false,
                is_restricted: false,
              },
              dc_location: { city: '', country: '', code: null },
              content_local: { country: null, confidence: 'منخفضة', score: 0, all_scores: {}, evidences: [] },
              content_ai: {},
              final_country: null,
              confidence: 'منخفضة',
              evidence_summary: [],
              error: e?.message || 'فشل التحليل',
            });
          }
        }

        io.emit('group_country_batch_done', {
          total,
          results,
        });
      })();

      return res.json({
        success: true,
        message: `بدأ تحليل ${total} مجموعة بنجاح في الخلفية`,
        total,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || err });
    }
  });

  // 4. محرك البحث الجغرافي المعاكس (مفرد)
  app.post('/api/geo_search', async (req: Request, res: Response) => {
    try {
      const { query, country, max_results, min_members, use_ai, strict } = req.body || {};
      const q = (query || '').trim();
      const targetCountry = (country || '').trim();

      if (!q) {
        return res.status(400).json({ success: false, error: 'الكلمة المفتاحية مطلوبة' });
      }
      if (!targetCountry) {
        return res.status(400).json({ success: false, error: 'الدولة المستهدفة مطلوبة' });
      }

      const client = getActiveClient();
      if (!client || !client.connected) {
        return res.status(503).json({
          success: false,
          error: 'حساب تيليجرام غير متصل حالياً. يرجى تسجيل الدخول أولاً.',
        });
      }

      io.emit('log_update', {
        message: `🌍 بدء البحث الجغرافي: '${q}' في دولة ${targetCountry}...`,
        timestamp: Date.now(),
      });

      const report = await geoReverseSearchAsync(client, q, targetCountry, {
        maxResults: max_results ? parseInt(String(max_results), 10) : 40,
        minMembers: min_members ? parseInt(String(min_members), 10) : 0,
        useAi: use_ai !== false,
        strict: Boolean(strict),
      });

      io.emit('log_update', {
        message: `✅ اكتمل البحث: تم العثور على ${report.matched_count} نتيجة مطابقة في ${targetCountry}`,
        timestamp: Date.now(),
      });

      return res.json(report);
    } catch (err: any) {
      console.error('[GeoSearch] Error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'فشل البحث الجغرافي' });
    }
  });

  // 5. بحث جغرافي دفعي (متعدد الكلمات)
  app.post('/api/geo_search/stream', async (req: Request, res: Response) => {
    try {
      const { queries, country, max_per_query, use_ai, strict } = req.body || {};
      const targetCountry = (country || '').trim();

      if (!Array.isArray(queries) || queries.length === 0) {
        return res.status(400).json({ success: false, error: 'أرسل قائمة كلمات مفتاحية صالحة' });
      }
      if (!targetCountry) {
        return res.status(400).json({ success: false, error: 'الدولة المستهدفة مطلوبة' });
      }

      const client = getActiveClient();
      if (!client || !client.connected) {
        return res.status(503).json({
          success: false,
          error: 'حساب تيليجرام غير متصل حالياً',
        });
      }

      const total = queries.length;
      const cleanQueries = queries.map((q: string) => String(q).trim()).filter(Boolean);

      (async () => {
        const allMatched: GeoSearchResultItem[] = [];
        for (let i = 0; i < cleanQueries.length; i++) {
          const q = cleanQueries[i];
          try {
            io.emit('log_update', {
              message: `🔍 [${i + 1}/${total}] بحث جغرافي عن: '${q}' في ${targetCountry}`,
              timestamp: Date.now(),
            });

            const r = await geoReverseSearchAsync(client, q, targetCountry, {
              maxResults: max_per_query ? parseInt(String(max_per_query), 10) : 20,
              useAi: use_ai !== false,
              strict: Boolean(strict),
            });

            if (r.success && r.matched) {
              allMatched.push(...r.matched);
              io.emit('geo_search_batch_result', {
                index: i + 1,
                total,
                query: q,
                matched: r.matched,
                count: r.matched.length,
              });
            }

            await new Promise((resolve) => setTimeout(resolve, 600));
          } catch (e: any) {
            io.emit('log_update', {
              message: `❌ فشل البحث عن '${q}': ${e?.message || e}`,
              timestamp: Date.now(),
            });
          }
        }

        // إزالة التكرار
        const seen = new Set<string>();
        const unique: GeoSearchResultItem[] = [];
        for (const item of allMatched) {
          const key = (item.username || item.url || item.id || '').toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        unique.sort((a, b) => {
          const sDiff = (b.match_score || 0) - (a.match_score || 0);
          if (sDiff !== 0) return sDiff;
          return (b.members || 0) - (a.members || 0);
        });

        io.emit('geo_search_batch_done', {
          total_queries: total,
          total_unique: unique.length,
          results: unique,
        });
      })();

      return res.json({
        success: true,
        message: `بدأ البحث الجغرافي لـ ${total} كلمة مفتاحية`,
        total,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || err });
    }
  });

  console.log('✅ [CountryAnalyzer] تم تسجيل مسارات تحليل الدولة والبحث الجغرافي العكسي بنجاح');
}
