import { AiComposeTone, AiToneId } from '../../types';

export const GROQ_API_KEY = "gsk_" + "ZNr7uNRZ6EyZUASH1oBdWGdyb3FYwxJpzik4OICbSNCIntD4wFFV";

export const AI_COMPOSE_TONES: AiComposeTone[] = [
  {
    id: 'neutral',
    name: 'Original / Neutral',
    nameAr: 'أصلي / محايد',
    icon: '✨',
    description: 'Direct and balanced text tone without special formatting.',
    descriptionAr: 'نبرة متوازنة ومباشرة بدون تعديلات أسلوبية خاصة.',
  },
  {
    id: 'formal',
    name: 'Professional & Formal',
    nameAr: 'مهني ورسمي',
    icon: '💼',
    description: 'Polite, structured, and ideal for business or formal inquiries.',
    descriptionAr: 'أسلوب مهذب ومحكم ومناسب للمراسلات الرسمية والعمل.',
  },
  {
    id: 'casual',
    name: 'Casual & Relaxed',
    nameAr: 'ودي وغير رسمي',
    icon: '☕',
    description: 'Warm, conversational, and effortless for everyday chats.',
    descriptionAr: 'أسلوب عفوي دافئ وسلس للمحادثات اليومية بين الأصدقاء.',
  },
  {
    id: 'concise',
    name: 'Concise & Short',
    nameAr: 'موجز ومختصر',
    icon: '⚡',
    description: 'Distills the message to essential points and brevity.',
    descriptionAr: 'يختصر المعنى في أقل عدد من الكلمات وبأقصى وضوح.',
  },
  {
    id: 'friendly',
    name: 'Warm & Cheerful',
    nameAr: 'لطيف ومرح',
    icon: '🌸',
    description: 'Adds extra kindness, positive emojis, and warmth.',
    descriptionAr: 'يضيف لمسات ترحيبية وإيجابية دافئة مع رموز تعبيرية مناسبة.',
  },
  {
    id: 'poetic',
    name: 'Poetic & Eloquent',
    nameAr: 'أدبي وبليغ',
    icon: '📜',
    description: 'Rich vocabulary, elegant prose, and captivating flow.',
    descriptionAr: 'صياغة أدبية بليغة وبلاغة لغوية رفيعة ومفردات فصيحة.',
  },
  {
    id: 'persuasive',
    name: 'Persuasive & Confident',
    nameAr: 'مقنع وواثق',
    icon: '🎯',
    description: 'Compelling argumentation with confident, inspiring phrasing.',
    descriptionAr: 'صياغة قوية وحاسمة تدعم الحجة وتلهم الطرف الآخر بالإقناع.',
  },
  {
    id: 'humorous',
    name: 'Witty & Playful',
    nameAr: 'مرح وفكاهي',
    icon: '🎭',
    description: 'Lighthearted humor, playful analogies, and entertaining touch.',
    descriptionAr: 'إضافة لمسة فكاهية ذكية وممتعة تضفي البهجة على الرسالة.',
  },
  {
    id: 'pirate',
    name: 'Pirate / Fun',
    nameAr: 'قرصان / مغامرة',
    icon: '🏴‍☠️',
    description: 'Ahoy matey! Nautical adventure flavor.',
    descriptionAr: 'أسلوب المغامرات والبحارة المرح!',
  },
];

class AiTonesController {
  private currentAccount: number = 0;

  constructor(accountNum: number = 0) {
    this.currentAccount = accountNum;
  }

  public getAvailableTones(): AiComposeTone[] {
    return AI_COMPOSE_TONES;
  }

  public transformTextTone(text: string, toneId: AiToneId, isArabic: boolean = false): string {
    if (!text.trim() || toneId === 'neutral') return text;

    const trimmed = text.trim();

    if (isArabic) {
      switch (toneId) {
        case 'formal':
          return `تحية طيبة وبعد،\n\nنود إحاطتكم علماً بخصوص: ${trimmed}\n\nشاكرين ومقدرين حسن تعاونكم، ودمتم برعاية الله.`;
        case 'casual':
          return `هلا وغلا! باختصار: ${trimmed} 👍`;
        case 'concise':
          return `${trimmed.split('.')[0] || trimmed} (باختصار).`;
        case 'friendly':
          return `مرحباً بك يا غالي 🌸 يسعدني مشاركتك: ${trimmed} ✨ أتمنى لك يوماً رائعاً!`;
        case 'poetic':
          return `في أفق المعاني وجميل الكلام، يطيب القول: "${trimmed}" 📜✨`;
        case 'persuasive':
          return `من المؤكد والواضح للجميع أن: ${trimmed}. الخطوة الأنسب هي المتابعة دون تردد 🎯`;
        case 'humorous':
          return `بينما العالم في عجلة من أمره، تذكر: ${trimmed} 😄🚀`;
        case 'pirate':
          return `يا هلا يا كابتن! 🏴‍☠️ اسمع رسالة الأفق: "${trimmed}" صبراً وسنصل الكنز! ⚓`;
        default:
          return trimmed;
      }
    } else {
      switch (toneId) {
        case 'formal':
          return `Dear recipient,\n\nI would like to respectfully convey that: ${trimmed}.\n\nThank you for your consideration.\nBest regards.`;
        case 'casual':
          return `Hey! Just wanted to share: ${trimmed} 👍`;
        case 'concise':
          return `${trimmed.split('.')[0] || trimmed}.`;
        case 'friendly':
          return `Hello! 🌸 Hope you're doing great! Wanted to let you know: ${trimmed} ✨`;
        case 'poetic':
          return `Like a whispered thought across gentle winds: "${trimmed}" 📜`;
        case 'persuasive':
          return `It is clearly evident that: ${trimmed}. Moving forward is our optimal choice 🎯`;
        case 'humorous':
          return `Plot twist of the day: ${trimmed} 😄✨`;
        case 'pirate':
          return `Ahoy matey! 🏴‍☠️ Listen up: "${trimmed}" — onward to treasure! ⚓`;
        default:
          return trimmed;
      }
    }
  }

  public async transformTextToneWithGroq(text: string, toneId: AiToneId, isArabic: boolean = false): Promise<string> {
    if (!text.trim() || toneId === 'neutral') return text;

    const toneObj = AI_COMPOSE_TONES.find((t) => t.id === toneId);
    const toneDescription = isArabic ? (toneObj?.descriptionAr || toneId) : (toneObj?.description || toneId);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: isArabic
                ? `أنت خبير في إعادة صياغة النصوص وتعديل الأسلوب والنبرة باللغة العربية. أعد صياغة النص المعطى حسب النبرة المطلوبة: "${toneDescription}". أخرج النص المصاغ فقط بدون أي مقدمات أو تعليقات أو علامات تنصيص زائدة.`
                : `You are an expert in text rewriting and stylistic tone transformation. Rewrite the given text according to the requested tone: "${toneDescription}". Output only the rewritten text without conversational filler or extra quotes.`,
            },
            {
              role: 'user',
              content: text.trim(),
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    } catch (err) {
      console.warn('[AiTonesController] Groq API error, using local template fallback:', err);
    }

    return this.transformTextTone(text, toneId, isArabic);
  }
}

export const aiTonesController = new AiTonesController(0);
