"""
╔══════════════════════════════════════════════════════════════════════════╗
║   محلّل دولة المجموعة على تيليجرام — Group Country Analyzer            ║
║   دمج: تحليل المحتوى + اللهجة + العملة + DC + Groq AI                  ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import os
import re
import json
import logging
from datetime import datetime
from telethon import functions, types
import requests

logger = logging.getLogger('GroupCountryAnalyzer')

# مفتاح Groq الدائم المدمج بالتطبيق
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')

DC_LOCATIONS = {
    1: {'city': 'ميامي', 'country': 'الولايات المتحدة', 'code': 'US'},
    2: {'city': 'أمستردام', 'country': 'هولندا', 'code': 'NL'},
    3: {'city': 'ميامي', 'country': 'الولايات المتحدة', 'code': 'US'},
    4: {'city': 'أمستردام', 'country': 'هولندا', 'code': 'NL'},
    5: {'city': 'سنغافورة', 'country': 'سنغافورة', 'code': 'SG'},
}

COUNTRY_INDICATORS = {
    'السعودية': {
        'dialect': ['ابشر', 'مايهمك', 'وش', 'ايش', 'كيفك', 'زين', 'عساك', 'تسلم', 'ياطويل العمر', 'أبشر', 'يعطيك العافية', 'لاهنت'],
        'currency': ['ريال', 'SAR', '﷼', 'هللة', 'رس'],
        'cities': ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'أبها', 'الطائف', 'القصيم', 'تبوك', 'حائل', 'نجران', 'جازان'],
        'phone': ['+966', '966', '05'],
        'domains': ['.sa', '.com.sa', '.edu.sa', '.gov.sa'],
    },
    'الإمارات': {
        'dialect': ['شو', 'زين', 'الحين', 'يعطيك العافية', 'شحالك', 'أبا', 'وايد', 'سير', 'دخيلك', 'فديتك'],
        'currency': ['درهم', 'AED', 'فلس', 'د.إ'],
        'cities': ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'العين', 'أم القيوين'],
        'phone': ['+971', '971', '050', '052', '055', '056'],
        'domains': ['.ae'],
    },
    'مصر': {
        'dialect': ['ازاي', 'إيه', 'عامل ايه', 'خلاص', 'كده', 'دلوقتي', 'أوي', 'معلش', 'بص', 'يعني', 'طب', 'يا باشا', 'حبيبي'],
        'currency': ['جنيه', 'EGP', 'قرش', 'ج.م'],
        'cities': ['القاهرة', 'الإسكندرية', 'الجيزة', 'طنطا', 'المنصورة', 'أسيوط', 'أسوان', 'الزقازيق', 'بورسعيد', 'السويس', 'شرم الشيخ'],
        'phone': ['+20', '20', '010', '011', '012', '015'],
        'domains': ['.eg', '.com.eg'],
    },
    'الكويت': {
        'dialect': ['شلونك', 'زين', 'اي', 'چذي', 'وايد', 'شكو ماكو', 'ابشري', 'قواك الله', 'يا هلا'],
        'currency': ['دينار', 'KWD', 'فلس', 'د.ك'],
        'cities': ['الكويت', 'الجهراء', 'حولي', 'الفروانية', 'الأحمدي', 'مبارك الكبير', 'السالمية'],
        'phone': ['+965', '965'],
        'domains': ['.kw', '.com.kw'],
    },
    'قطر': {
        'dialect': ['شلونك', 'زين', 'وايد', 'أكيد', 'يا طويل العمر', 'شخبارك', 'مرحبا ومسهلا'],
        'currency': ['ريال قطري', 'QAR', 'درهم قطري', 'ر.ق'],
        'cities': ['الدوحة', 'الوكرة', 'الخور', 'الريان', 'أم صلال', 'لوسيل'],
        'phone': ['+974', '974'],
        'domains': ['.qa'],
    },
    'البحرين': {
        'dialect': ['شلونك', 'زين', 'وايد', 'اي', 'خوش', 'عساك طيب', 'هلا والله'],
        'currency': ['دينار بحريني', 'BHD', 'د.ب'],
        'cities': ['المنامة', 'المحرق', 'الرفاع', 'سترة', 'مدينة عيسى', 'مدينة حمد'],
        'phone': ['+973', '973'],
        'domains': ['.bh'],
    },
    'عُمان': {
        'dialect': ['شحالك', 'زين', 'وايد', 'مو', 'تو', 'عاد', 'اخبارك', 'حبوب'],
        'currency': ['ريال عماني', 'OMR', 'بيسة', 'ر.ع'],
        'cities': ['مسقط', 'صلالة', 'صحار', 'نزوى', 'صور', 'البريمي', 'السيب'],
        'phone': ['+968', '968'],
        'domains': ['.om'],
    },
    'الأردن': {
        'dialect': ['شو', 'كيفك', 'زلمة', 'منيح', 'شو أخبارك', 'يخزي', 'هيك', 'يسعد مساك', 'حبيبي'],
        'currency': ['دينار أردني', 'JOD', 'قرش', 'د.أ'],
        'cities': ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'المفرق', 'السلط', 'مادبا', 'جرش'],
        'phone': ['+962', '962', '077', '078', '079'],
        'domains': ['.jo'],
    },
    'العراق': {
        'dialect': ['شلونك', 'شكو ماكو', 'هواية', 'زين', 'شبيها', 'چان', 'فدوه', 'عيني', 'اكو', 'ماكو'],
        'currency': ['دينار عراقي', 'IQD', 'د.ع', 'ألف دينار'],
        'cities': ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'النجف', 'كربلاء', 'السليمانية', 'كركوك', 'بابل'],
        'phone': ['+964', '964', '077', '078', '075'],
        'domains': ['.iq'],
    },
    'سوريا': {
        'dialect': ['شو', 'كيفك', 'منيح', 'هلق', 'لك', 'ياعمي', 'شلونك', 'تسلملي', 'ابن عمي'],
        'currency': ['ليرة سورية', 'SYP', 'ل.س'],
        'cities': ['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'دير الزور', 'طرطوس', 'درعا'],
        'phone': ['+963', '963'],
        'domains': ['.sy'],
    },
    'لبنان': {
        'dialect': ['شو', 'كيفك', 'هيدا', 'هيدي', 'منيح', 'كتير', 'لك', 'ولو', 'تقبرني', 'حبيبي'],
        'currency': ['ليرة لبنانية', 'LBP', 'ل.ل', 'دولار'],
        'cities': ['بيروت', 'طرابلس', 'صيدا', 'صور', 'زحلة', 'جونية', 'جبيل', 'النبطية'],
        'phone': ['+961', '961'],
        'domains': ['.lb'],
    },
    'فلسطين': {
        'dialect': ['شو', 'كيفك', 'منيح', 'هلق', 'زي', 'لك', 'وين', 'يسعدك', 'يا سيدي', 'شو في'],
        'currency': ['شيكل', 'ILS', 'دينار أردني', 'NIS'],
        'cities': ['القدس', 'غزة', 'رام الله', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم', 'خان يونس', 'رفح'],
        'phone': ['+970', '970', '+972', '059', '056'],
        'domains': ['.ps'],
    },
    'اليمن': {
        'dialect': ['كيف حالك', 'زين', 'شو', 'ايش', 'عساك', 'طيب', 'وانت', 'يا خبير', 'ماشي', 'حياك الله', 'ارحب'],
        'currency': ['ريال يمني', 'YER', 'ر.ي'],
        'cities': ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'حضرموت', 'المكلا', 'ذمار', 'مأرب', 'سيئون'],
        'phone': ['+967', '967', '77', '73', '71', '70'],
        'domains': ['.ye'],
    },
    'المغرب': {
        'dialect': ['كيفاش', 'بزاف', 'مزيان', 'دابا', 'واخا', 'غير', 'صافي', 'شكون', 'راه', 'عفاك'],
        'currency': ['درهم مغربي', 'MAD', 'سنتيم', 'د.م'],
        'cities': ['الدار البيضاء', 'الرباط', 'فاس', 'مراكش', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'تطوان'],
        'phone': ['+212', '212', '06', '07'],
        'domains': ['.ma'],
    },
    'الجزائر': {
        'dialect': ['كيفاش', 'بزاف', 'مليح', 'واش', 'راك', 'خلاص', 'لاباس', 'صحا', 'كاين', 'درك'],
        'currency': ['دينار جزائري', 'DZD', 'د.ج'],
        'cities': ['الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'سطيف', 'باتنة', 'تلمسان', 'البليدة', 'بجاية'],
        'phone': ['+213', '213', '05', '06', '07'],
        'domains': ['.dz'],
    },
    'تونس': {
        'dialect': ['شنوة', 'برشة', 'باهي', 'كيفاش', 'ياخي', 'علاش', 'شبيك', 'توة', 'يعيشك'],
        'currency': ['دينار تونسي', 'TND', 'مليم', 'د.ت'],
        'cities': ['تونس', 'صفاقس', 'سوسة', 'بنزرت', 'القيروان', 'قابس', 'أريانة', 'المنستير'],
        'phone': ['+216', '216'],
        'domains': ['.tn'],
    },
    'ليبيا': {
        'dialect': ['شحالك', 'زي', 'وايد', 'وين', 'شنو', 'هلبة', 'شنجوك', 'باهي', 'صقع'],
        'currency': ['دينار ليبي', 'LYD', 'درهم ليبي', 'د.ل'],
        'cities': ['طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'سبها', 'البيضاء', 'طبرق', 'سرت'],
        'phone': ['+218', '218', '091', '092'],
        'domains': ['.ly'],
    },
    'السودان': {
        'dialect': ['كيفنك', 'زول', 'شديد', 'قسما', 'بالله', 'يا زول', 'حبابك', 'سمح', 'داير شنو'],
        'currency': ['جنيه سوداني', 'SDG', 'ج.س'],
        'cities': ['الخرطوم', 'أم درمان', 'بورتسودان', 'كسلا', 'الأبيض', 'نيالا', 'ود مدني', 'الفاشر'],
        'phone': ['+249', '249'],
        'domains': ['.sd'],
    },
    'تركيا': {
        'dialect': ['merhaba', 'nasılsın', 'tamam', 'evet', 'hayır', 'teşekkür', 'lütfen', 'günaydın'],
        'currency': ['ليرة تركية', 'TRY', 'TL', '₺'],
        'cities': ['إسطنبول', 'أنقرة', 'إزمير', 'أنطاليا', 'بورصة', 'أضنة', 'غازي عنتاب', 'قونية'],
        'phone': ['+90', '90'],
        'domains': ['.tr', '.com.tr'],
    },
    'إيران': {
        'dialect': ['سلام', 'ممنون', 'خوبی', 'بله', 'نه', 'تشکر', 'صبح بخیر', 'قربانت'],
        'currency': ['ريال إيراني', 'IRR', 'تومان'],
        'cities': ['طهران', 'أصفهان', 'مشهد', 'شيراز', 'تبريز', 'كرج', 'قم', 'أهواز'],
        'phone': ['+98', '98'],
        'domains': ['.ir'],
    },
}

COUNTRY_FLAGS = {
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
}

async def collect_metadata(client, entity):
    meta = {
        'id': getattr(entity, 'id', None),
        'title': getattr(entity, 'title', ''),
        'username': getattr(entity, 'username', None),
        'participants_count': getattr(entity, 'participants_count', 0),
        'about': '',
        'dc_id': None,
        'created_date': None,
        'is_megagroup': getattr(entity, 'megagroup', False),
        'is_broadcast': getattr(entity, 'broadcast', False),
        'is_verified': getattr(entity, 'verified', False),
        'is_restricted': getattr(entity, 'restricted', False),
    }

    try:
        if getattr(entity, 'broadcast', False) or getattr(entity, 'megagroup', False):
            full = await client(functions.channels.GetFullChannelRequest(channel=entity))
            meta['about'] = full.full_chat.about or ''
            meta['participants_count'] = getattr(full.full_chat, 'participants_count', meta['participants_count'])
    except Exception:
        pass

    try:
        photo = getattr(entity, 'photo', None)
        if photo and hasattr(photo, 'dc_id'):
            meta['dc_id'] = photo.dc_id
    except Exception:
        pass

    try:
        first_msg = await client.get_messages(entity, limit=1, reverse=True)
        if first_msg:
            meta['created_date'] = first_msg[0].date.isoformat()
    except Exception:
        pass

    return meta

def analyze_content_locally(texts):
    full = ' '.join(texts).lower()
    scores = {}
    evidences = {}

    for country, ind in COUNTRY_INDICATORS.items():
        ev = []
        for kw in ind['dialect']:
            if kw.lower() in full:
                scores[country] = scores.get(country, 0) + 3
                ev.append(f'لهجة: {kw}')
                break
        for cur in ind['currency']:
            if cur.lower() in full:
                scores[country] = scores.get(country, 0) + 5
                ev.append(f'عملة: {cur}')
                break
        for city in ind['cities']:
            if city.lower() in full:
                scores[country] = scores.get(country, 0) + 4
                ev.append(f'مدينة: {city}')
                break
        for ph in ind['phone']:
            if ph.lower() in full:
                scores[country] = scores.get(country, 0) + 6
                ev.append(f'هاتف: {ph}')
                break
        for dm in ind['domains']:
            if dm.lower() in full:
                scores[country] = scores.get(country, 0) + 3
                ev.append(f'نطاق: {dm}')
                break
        if ev:
            evidences[country] = ev

    if not scores:
        return {'country': None, 'confidence': 'منخفضة', 'score': 0, 'all_scores': {}, 'evidences': []}

    top_country = max(scores, key=scores.get)
    top_score = scores[top_country]
    total = sum(scores.values())
    confidence = 'عالية' if top_score / max(total, 1) > 0.5 else 'متوسطة' if top_score / max(total, 1) > 0.3 else 'منخفضة'

    return {
        'country': top_country,
        'confidence': confidence,
        'score': top_score,
        'all_scores': scores,
        'evidences': evidences.get(top_country, []),
    }

async def analyze_content_with_groq(texts, sample_size=60):
    if not GROQ_API_KEY:
        return {'error': 'مفتاح Groq غير متوفر'}

    sample = '\n---\n'.join(texts[:sample_size])[:5000]
    prompt = f"""أنت محلّل خبير في تحديد الدولة الجغرافية لمجموعات تيليجرام.

حلّل الرسائل التالية واستنتج الدولة/المنطقة الأرجح للمجموعة بناءً على:
- اللهجة والكلمات العامية
- العملة والأسعار
- أسماء المدن والمناطق
- الأرقام الدولية
- الأحداث والمناسبات

الرسائل:
{sample}

أجب بصيغة JSON فقط:
{{
  "country": "اسم الدولة بالعربية",
  "country_code": "رمز ISO حرفين",
  "region": "المنطقة (خليج/شام/مغرب عربي/شمال أفريقيا)",
  "confidence": "عالية|متوسطة|منخفضة",
  "language": "اللغة الأساسية",
  "dialect": "اللهجة المكتشفة",
  "indicators": ["مؤشر 1", "مؤشر 2"],
  "reasoning": "شرح موجز لسبب الاختيار"
}}"""

    try:
        resp = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {GROQ_API_KEY}',
            },
            json={
                'model': 'llama-3.3-70b-versatile',
                'messages': [
                    {'role': 'system', 'content': 'أنت محلّل جغرافي دقيق وذكي. تجيب بـ JSON فقط.'},
                    {'role': 'user', 'content': prompt},
                ],
                'max_tokens': 600,
                'temperature': 0.15,
            },
            timeout=20,
        )
        if resp.status_code == 200:
            raw = resp.json()['choices'][0]['message']['content'].strip()
            match = re.search(r'\{[\s\S]*\}', raw)
            if match:
                return json.loads(match.group(0))
            return {'error': 'تعذر استخراج JSON من Groq', 'raw': raw}
        return {'error': f'Groq error {resp.status_code}: {resp.text}'}
    except Exception as e:
        return {'error': f'فشل الاتصال بـ Groq: {str(e)}'}

def dc_to_location(dc_id):
    return DC_LOCATIONS.get(dc_id, {'city': 'غير محدد', 'country': 'غير محدد', 'code': None})

async def analyze_group_country(client, group_link, use_ai=True):
    report = {
        'group_link': group_link,
        'analyzed_at': datetime.utcnow().isoformat(),
        'metadata': {},
        'dc_location': {},
        'content_local': {},
        'content_ai': {},
        'final_country': None,
        'confidence': 'منخفضة',
        'evidence_summary': [],
    }

    clean = group_link.strip().replace('https://t.me/', '').replace('t.me/', '').replace('@', '')
    try:
        entity = await client.get_entity(clean)
    except Exception as e:
        report['error'] = f'تعذر الوصول للمجموعة: {str(e)}'
        return report

    report['metadata'] = await collect_metadata(client, entity)
    report['dc_location'] = dc_to_location(report['metadata']['dc_id'])

    texts = []
    if report['metadata']['about']:
        texts.append(report['metadata']['about'])

    try:
        async for msg in client.iter_messages(entity, limit=100):
            if msg.text and len(msg.text.strip()) > 3:
                texts.append(msg.text.strip())
    except Exception:
        pass

    report['content_local'] = analyze_content_locally(texts)

    if use_ai and texts:
        report['content_ai'] = await analyze_content_with_groq(texts)

    votes = {}
    evidences = []

    ai_country = report['content_ai'].get('country')
    if ai_country and ai_country in COUNTRY_INDICATORS:
        votes[ai_country] = votes.get(ai_country, 0) + 3
        evidences.append(f"الذكاء الاصطناعي: {ai_country} ({report['content_ai'].get('dialect', '')})")

    local_country = report['content_local'].get('country')
    if local_country:
        votes[local_country] = votes.get(local_country, 0) + 2
        evidences.append(f"التحليل المحلي: {local_country} ({', '.join(report['content_local'].get('evidences', []))})")

    if votes:
        top = max(votes, key=votes.get)
        report['final_country'] = top
        report['flag'] = COUNTRY_FLAGS.get(top, '🌍')
        ai_conf = report['content_ai'].get('confidence', 'منخفضة')
        loc_conf = report['content_local'].get('confidence', 'منخفضة')
        report['confidence'] = 'عالية' if 'عالية' in (ai_conf, loc_conf) else 'متوسطة' if 'متوسطة' in (ai_conf, loc_conf) else 'منخفضة'
    else:
        report['final_country'] = None
        report['flag'] = '🌍'
        report['confidence'] = 'منخفضة'

    report['evidence_summary'] = evidences
    report['success'] = True
    return report
