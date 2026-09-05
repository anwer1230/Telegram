import React, { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  Send,
  Save,
  Play,
  Square,
  RotateCw,
  Info,
  ChevronDown,
  Shield,
  Trash2,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
  ExternalLink,
  Layers,
  UploadCloud,
  FileText,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTelegram } from '../../context/TelegramContext';
import { notificationsService } from '../../core/NotificationsService';
import { notificationsController } from '../../core/NotificationsController';
import { MonitorAlert, ProtectionMode } from '../../types';
import { SalamActivityLog } from '../SalamActivityLog';

export interface MessageDraftItem {
  id: number;
  shortTitle: string;
  title: string;
  badge: string;
  icon: string;
  category: string;
  text: string;
}

export const MESSAGE_DRAFTS: MessageDraftItem[] = [
  {
    id: 1,
    shortTitle: 'سكليف وأعذار',
    title: 'المسودة 1: (سكليف/أعذار طبية)',
    badge: '🚨 سكليف',
    icon: '🩺',
    category: 'medical',
    text: `🚨 **#ســـكـــالــــيـــــــف رسمية** 🚨

عليك غياب تبي عذر طبي في صحتي بدون حضور كلمني 📌📌

**اجازه مرضيه معتمده في تطبيق صحتي** ♻️
نستقبل عسكري مدني جامعي موضف

━━━━━━━━━━━━━━
🟢 تاريخ **#جديد** ↘️🟢↙️ **#قديم** 🔴

🔰 **#عــــذر #طـــبـي** 🔰  
🟣 **#اجازه ورقيه مختوم**  
🔵 **#شعار مرافقه مريض**  
🟡 **#مشهـد مراجـــعــــــة**  
🔴 **#شـــعــــار تـــــنويـــم**  
🟢 **#تــــقـــريـــر طـــبــــي**  

━━━━━━━━━━━━━━
📲 **للتواصل وتساب** 🆗⬇️  
📲 https://wa.me/+966510349663`,
  },
  {
    id: 2,
    shortTitle: 'خدمات طلابية',
    title: 'المسودة 2: (خدمات طلابية عامة)',
    badge: '📚 طلابية',
    icon: '📚',
    category: 'students',
    text: `📚 **السلام عليكم**  
للخدمات الطلابيه المتكامله

💞 **من خدمتنا** 💞  
✅ **بحوث جامعية** (عربي + إنجليزي)  
🔥 **رسائل ماجستير**  
🟢 **اعذار طبيه صحتي ورقي PDF**  
📝 **واجبات وأنشطة**  
📊 **عروض باوربوينت Power Point**  
📄 **تقارير وتكاليف**  
📝 **حل كويزات / ميد / فاينل**  
💰 **محاسبة + ادارة أعمال**  
💻 **حاسوب + برمجة**  
🎓 **مشاريع تخرج Project**  
📖 **تلخيص محاضرات**  
📄 **تصميم سيره ذاتيه احترافيه**  
🎨 **تصاميم بوستر وبروشور**  
📋 **كتابه تقارير تدريب**

━━━━━━━━━━━━━━
⭐ **اسعار مناسبه للجميع**  
↩️ **للتواصل واتس اب**  
📲 https://wa.me/+966562570935`,
  },
  {
    id: 3,
    shortTitle: 'ثقة وسرعة إنجاز',
    title: 'المسودة 3: (ثقة وسرعة في الإنجاز)',
    badge: '⚡ سرعة إنجاز',
    icon: '⚡',
    category: 'academic',
    text: `⚡ **ثقة وسرعة في الإنجاز** ⚡

🟢 **بحـــوثات** (عربي أو انقلش)  
🟡 **حل الواجبات والتكاليف**  
📚 **تلخيص الكتب والمحاضرات**  
🎓 **مشاريع تخــــرج**  
💻 **حل تكاليف وانشطة البرمجه**  
🎨 **إعداد عـــــروض بوربـــــوينت** - كانفا  
📄 **صياغة ســــيرة ذاتـــية CV**  
🖼️ **تصاميم (بوستر - انفوجرافيك)**  
📝 **حــــل (كويز - ميد - فاينل)**  
📋 **اسايمنت - لابات - دراسة حالة**  
📊 **تحليل احصائي SPSS**  
🧠 **إعداد (تقارير - خرائط ذهنيه)**  
🩺 **اعذار طبية ورقية PDF مختومة**  
📱 **اعذار طبيه من منصة صحتي**

━━━━━━━━━━━━━━
🔵 **للتواصل واتساب**  
📲 https://wa.me/+966562570935`,
  },
  {
    id: 4,
    shortTitle: 'مركز سرعة إنجاز',
    title: 'المسودة 4: (قائمة الخدمات الشاملة - مركز سرعة إنجاز)',
    badge: '🎯 المركز الشامل',
    icon: '🎯',
    category: 'full_services',
    text: `🎯 **مَرْكَز سُرْعَة إِنْجَاز** ✨  
كل ما تحتاجه في دراستك الجامعية، التقنية، وحتى خدماتك الطبية… في مكان واحد

━━━━━━━━━━━━━━
🔥 **الخدمات المقدمة:** 🔥

📝✏️ **حل الواجبات والاختبارات** (كويز – ميد – فاينل)  
📚📋 **تلخيص المقررات والمحاضرات**  
🎨💫 **تصميم عروض PowerPoint احترافية وجذابة**  
📂🎓 **إعداد مشاريع التخرج الشاملة**  
📊 **إعداد المشاريع الهندسية** (أوتوكاد - ريفيت - لوميون)  
📱 **تصميم مشاريع المحاكاة المختلفة**  
📚✨ **إعداد رسائل الماجستير والدكتوراه باحترافية**  
💡🎯 **اقتراح عناوين وخطط بحث متميزة**  
🔍📖 **توفير المراجع والدراسات السابقة**  
📄🔥 **إعداد أبحاث النشر والترقية**  
📊📈 **التحليل الإحصائي والتدقيق اللغوي**  
🌟 **إعداد البحوث الجامعية باللغتين (عربي - إنجليزي) بمنهجية متكاملة**  
📋 **إعداد التقارير والتكاليف الأكاديمية**  
🎪 **تصميم البوسترات الأكاديمية (بروجكت)**  
🗺️ **إعداد الخرائط المفاهيمية**  
📝 **إعداد دراسة الحالات والمقالات العلمية**  
📚 **تلخيص الكتب باللغتين العربية والإنجليزية**  
🌐💻 **تصميم وبرمجة المواقع والمتاجر الإلكترونية**  
📱 **تطوير التطبيقات والبرمجيات**  
🛠️📊 **تطوير أنظمة إدارة المهام والهيكل التنظيمي**  
🚀📈 **تحسين محركات البحث (SEO) والدعم الفني**  
💾 **إعداد مشاريع برمجة الحاسب** (Python - Java - C++ - PHP)  
🤖 **إعداد مشاريع الذكاء الاصطناعي وتعلم الآلة**  
🌐 **إعداد مشاريع إنترنت الأشياء (IoT)**  
🔧 **برمجة أنظمة التحكم المدمجة (Embedded Systems)**  
📊 **محاكاة المشاريع الهندسية (MATLAB, Simulink)**  
📀 **تحليل البيانات الضخمة (Big Data)**  
🗃️ **تصميم وتحليل قواعد البيانات** (MySQL - Oracle - MongoDB)  
🌺 **ملف الإنجاز والأداء الوظيفي** (إلكتروني وورقي) وفق النظام الجديد  
📄 **كتابة التقارير والسجلات التعليمية**  
📊 **تحليل النتائج وإعداد الخطط العلاجية والإثرائية**  
🏆 **تصميم شهادات الشكر والتقدير**  
📝 **كتابة أسئلة الاختبارات**  
✨ **وكافة الأعمال الإدارية والتعليمية الأخرى**  
🎨 **تصميم الشعارات والهويات البصرية المتكاملة**  
📄✨ **تصميم السيرة الذاتية الاحترافية، البروشورات، والمجلات**  
📢 **تصميم المنشورات والفيديوهات الإعلانية**  
🎬 **تصميم الرسوم المتحركة والتقنيات ثلاثية الأبعاد**  
📩 **تصميم الدعوات الإلكترونية**  
📊 **تصميم الإنفوجرافيك الاحترافي**  
🌐🔄 **ترجمة معتمدة** (كتب - روايات - قصص - مقالات)  
🔢 **دورات الرياضيات** (الرياضيات العامة، شروحات متقدمة، تدريبات شاملة)  
🌐 **دورات اللغة الإنجليزية** (تأسيس، محادثة، تحضير للمقابلات والاختبارات)  
🎯 **دورات المهارات الجامعية** (إدارة الوقت، مهارات البحث العلمي، كتابة الأوراق)  
🏥 **دورات المصطلحات الطبية** (التمريض، الصيدلة، الطب البشري)  
💼 **الدورات المحاسبية المتكاملة** (المحاسبة المالية، محاسبة التكاليف، البرامج المحاسبية)  
📘🎯 **حلول منهج Evolve 1, 2, 3, 4**  
📗💡 **حلول منهج Cambridge**  
🔑✨ **أكواد Evolve جديدة مضمونة وأسعار مناسبة**  
🩺🎖️ **خدمة استخراج "سكليف صحتي" بكل احترافية وفي وقت قياسي** (للعسكريين والمدنيين والطلاب)

━━━━━━━━━━━━━━
✨ **مميزات خدمتنا:**  
⚡🚀 **سرعة إنجاز غير مسبوقة**  
🎯✅ **دقة ومطابقة للمواصفات المطلوبة**  
🔒🛡️ **تعامل سري وآمن 100%**  
📍🇸🇦 **خدمة في جميع مناطق المملكة**

📞 **للتواصل والاستفسار:**  
📲💚 **واتساب:** https://wa.me/+966510349663  
🌐✨ **الموقع الإلكتروني:** https://surraenjazblog.wordpress.com/`,
  },
  {
    id: 5,
    shortTitle: 'عرض خاص 15%',
    title: 'المسودة 5: (عرض خاص - توقف عن المعاناة الدراسية)',
    badge: '🎁 عرض خاص',
    icon: '🎁',
    category: 'special_offer',
    text: `توقف عن المعاناة الدراسية! 🚫  
🎯 **مركز سرعة إنجاز - حلك النهائي لكل التحديات الأكاديمية!** 🎯

━━━━━━━━━━━━━━
🔥 **خدماتنا تشمل:** 🔥

✅ **مشاريع تخرج** - بجودة استثنائية  
✅ **أبحاث جامعية وعلمية** - 100% أصلية  
✅ **رسائل ماجستير ودكتوراه** - بإشراف متخصصين  
✅ **حل واجبات واختبارات** - بدقة فائقة  
✅ **تحليل إحصائي (SPSS)** - نتائج مضمونة

🔵 **للمعلمين والمؤسسات:**  
✅ **ملفات إنجاز وإعداد مهني**  
✅ **خطط تربوية وإدارية متكاملة**

━━━━━━━━━━━━━━
✨ **مميزاتنا:** ✨

🟢 **خبراء متخصصون** - في جميع المجالات  
🟢 **جودة مضمونة** - أعمال أصلية 100%  
🟢 **سرعة في التنفيذ** - نسلم في الموعد  
🟢 **أسعار مناسبة** - تناسب جميع الطلاب  
🟢 **سرية تامة** - خصوصيتك محفوظة

━━━━━━━━━━━━━━
🎁 **عرض خاص:**  
**خصم 15% على أول طلب** + تعديلات مجانية حتى الرضا التام!

📞 **تواصل معنا الآن:**  
📱 **واتساب مباشر:** https://wa.me/+966510349663  
🌐 **الموقع الإلكتروني:** https://surraenjazblog.wordpress.com/

━━━━━━━━━━━━━━
⚡ **سرعة إنجاز - رفيق دربك نحو التميز الأكاديمي!** 🌟  
**نجاحك يبدأ بقرار... اتخذ قرارك الآن!** 📚✨`,
  },
];

export const SenderModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    chats,
    messages,
    showToast,
    jumpToMessage,
    currentUser,
    accounts,
    activeAccountId,
  } = useTelegram();

  const isOpen = activeModal === ('sender' as any) || activeModal === ('send-only' as any);

  // Form State - Sender
  const [messageText, setMessageText] = useState<string>(() => localStorage.getItem('draft_message') || MESSAGE_DRAFTS[0].text);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<number>(0);
  const [groupsText, setGroupsText] = useState<string>(() => localStorage.getItem('draft_groups') || '');
  const [isFetchingGroups, setIsFetchingGroups] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [sendType, setSendType] = useState<'manual' | 'scheduled'>('manual');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [scheduleDuration, setScheduleDuration] = useState<number>(0);
  const [sanitizeMode, setSanitizeMode] = useState<string>('salam');
  const [showModeDesc, setShowModeDesc] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendStatusMsg, setSendStatusMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [senderActiveTab, setSenderActiveTab] = useState<'sender' | 'salam_log'>('sender');

  // Monitoring State
  const [watchWords, setWatchWords] = useState<string>('واجب\nبحث\nسعر\nوظيفة\nتصميم\nبرمجة');
  const [monitorStatus, setMonitorStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [scheduleRemaining, setScheduleRemaining] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync monitoring state with notificationsService
  useEffect(() => {
    const unsub = notificationsService.subscribe(() => {
      setAlerts([...notificationsService.getMonitorAlerts()]);
      const cfg = notificationsService.getMonitorConfig();
      if (cfg.isEnabled) {
        setMonitorStatus('running');
      }
    });
    setAlerts([...notificationsService.getMonitorAlerts()]);
    if (notificationsService.getMonitorConfig().isEnabled) {
      setMonitorStatus('running');
    }
    return () => unsub();
  }, []);

  // Fetch dialogs from Telegram
  const handleSelectDraft = (index: number) => {
    const draft = MESSAGE_DRAFTS[index];
    if (draft) {
      setSelectedDraftIndex(index);
      setMessageText(draft.text);
      localStorage.setItem('draft_message', draft.text);
      showToast(`✨ تم اختيار ${draft.shortTitle}`, '📝');
    }
  };

  // استدعاء فعلي وحقيقي 100% لجلب جميع المجموعات والقنوات عبر خادم GramJS
  const handleFetchDialogs = async () => {
    try {
      setIsFetchingGroups(true);
      showToast('⏳ جاري جلب جميع المجموعات والقنوات من حسابك الفعلي...', '🔄');

      const activeAcc = accounts?.find((a) => a.id === activeAccountId) || accounts?.[0];
      const sessionString =
        currentUser?.sessionString ||
        activeAcc?.sessionString ||
        localStorage.getItem('tg_session_string') ||
        localStorage.getItem('telegram_session') ||
        '';
      const phone = currentUser?.phone || activeAcc?.user?.phone || '';

      const res = await fetch('/api/get_all_groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-session': sessionString,
          'x-telegram-phone': phone,
        },
        body: JSON.stringify({
          sessionString,
          phone,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
        // وضع الروابط الحقيقية مباشرة في خانة الروابط دون تعديل
        const directLinks = data.groups.join('\n');
        setGroupsText(directLinks);
        localStorage.setItem('draft_groups', directLinks);
        showToast(`✅ تم جلب ${data.groups.length} رابط حقيقي للمجموعات والقنوات بنجاح`, '🎯');
      } else if (data.groups && data.groups.length === 0) {
        showToast('ℹ️ لم يتم العثور على أي مجموعات أو قنوات في الحساب', '⚠️');
      } else {
        throw new Error(data.message || 'تعذر جلب المجموعات من تيليجرام');
      }
    } catch (err: any) {
      console.error('[SenderModal] Error fetching all groups:', err);
      // استخدام مجموعات الحساب المحلية إذا تعذر الاتصال بالخادم
      const fallbackGroups = chats
        .filter((c) => c.type === 'group' || c.type === 'channel')
        .map((c) =>
          c.username
            ? `https://t.me/${c.username}`
            : `https://t.me/c/${String(c.id).replace(/^-100/, '').replace(/^-/, '')}`
        );

      if (fallbackGroups.length > 0) {
        const directLinks = fallbackGroups.join('\n');
        setGroupsText(directLinks);
        localStorage.setItem('draft_groups', directLinks);
        showToast(`⚠️ تم جلب ${fallbackGroups.length} رابط مجموعة: ${err?.message || ''}`, 'ℹ️');
      } else {
        showToast(`❌ تعذر جلب المجموعات: ${err?.message || 'خطأ في الاتصال'}`, '⚠️');
      }
    } finally {
      setIsFetchingGroups(false);
    }
  };

  // Image Upload handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setUploadedImages((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              setUploadedImages((prev) => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    localStorage.setItem('draft_message', messageText);
    localStorage.setItem('draft_groups', groupsText);
    showToast('💾 تم حفظ الإعدادات والمسودة بنجاح في الذاكرة', '✅');
  };

  // Send Now Execution
  const handleSendNow = async () => {
    if (!messageText.trim() && uploadedImages.length === 0) {
      showToast('⚠️ يجب كتابة رسالة أو رفع صورة أولاً', '⚠️');
      return;
    }
    if (!groupsText.trim()) {
      showToast('⚠️ يجب تحديد مجموعات أو وجهات الإرسال', '⚠️');
      return;
    }

    localStorage.setItem('draft_message', messageText);
    localStorage.setItem('draft_groups', groupsText);

    setIsSending(true);
    setSendStatusMsg(null);

    const groupList = groupsText
      .split('\n')
      .map((g) => g.trim())
      .filter(Boolean);

    // Map targets to chat IDs or titles
    const targetChatIds: string[] = groupList.map((g) => {
      // Clean leading bullet points (·, •, -, *), list numbers (1., 2-), quotes, and prefixes
      let cleaned = g.replace(/^(?:custom_|chat_|user_|channel_)+/i, '').trim();
      cleaned = cleaned.replace(/^[\s·•\-\*\u2022\u00B7\u2023\u25E6\u2043\u2219]+/, '').trim();
      cleaned = cleaned.replace(/^(\d+[\.\)\-]\s*)/, '').trim();
      cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
      cleaned = cleaned.replace(/^(?:custom_|chat_|user_|channel_)+/i, '').trim();

      const matched = chats.find(
        (c) =>
          c.title.toLowerCase() === cleaned.toLowerCase() ||
          c.title.toLowerCase() === g.toLowerCase() ||
          (c.username && `@${c.username.toLowerCase()}` === cleaned.toLowerCase()) ||
          (c.username && c.username.toLowerCase() === cleaned.toLowerCase()) ||
          String(c.id) === cleaned
      );
      if (matched) return String(matched.id);

      // If it's a URL like https://t.me/username, extract the username or invite hash
      const inviteMatch = cleaned.match(/(?:https?:\/\/)?(?:t(?:elegram)?\.me\/(?:\+|joinchat\/)|tg:\/\/join\?invite=)([a-zA-Z0-9_-]+)/i);
      if (inviteMatch) {
        return `+${inviteMatch[1]}`;
      }

      const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:t(?:elegram)?\.me\/)([a-zA-Z0-9_]{3,32})\/?$/i);
      if (urlMatch) {
        return urlMatch[1];
      }

      return cleaned;
    });

    const batch = await notificationsService.executeSendBatch({
      text: messageText,
      images: uploadedImages,
      targetChatIds: targetChatIds.length > 0 ? targetChatIds : chats.map((c) => String(c.id)),
      allChats: chats.map((c) => ({
        id: String(c.id),
        title: c.title || (c as any).name || 'Chat',
        type: c.type,
      })),
      protectionMode: (sanitizeMode === 'smart' ? 'smart_clean' : sanitizeMode === 'always' ? 'permanent_clean' : sanitizeMode === 'off' ? 'disabled' : sanitizeMode) as ProtectionMode,
      isScheduled: sendType === 'scheduled',
      intervalMinutes: intervalMinutes,
      durationHours: scheduleDuration,
    });

    setIsSending(false);

    if (sendType === 'scheduled') {
      setSendStatusMsg({
        text: `⏳ تم تفعيل الجدولة الدورية بنجاح كل ${intervalMinutes} دقيقة!`,
        success: true,
      });
      showToast('⏳ تم تفعيل الجدولة الدورية بنجاح!', '✨');
    } else {
      if (batch.totalSuccess > 0) {
        const failedTarget = batch.targetChats.find((t) => t.status === 'failed');
        let note = '';
        if (failedTarget) {
          if (failedTarget.error?.includes('USER_BANNED_IN_CHANNEL')) {
            note = ` (محظور من النشر في ${failedTarget.title})`;
          } else if (failedTarget.error?.includes('CHANNEL_PRIVATE')) {
            note = ` (القناة ${failedTarget.title} خاصة)`;
          }
        }
        setSendStatusMsg({
          text: `📢 تم إرسال الرسالة إلى ${batch.totalSuccess} وجهة بنجاح!${batch.totalFailed > 0 ? ` (فشل ${batch.totalFailed}${note})` : ''}`,
          success: true,
        });
        showToast(`📢 تم إرسال الرسالة إلى ${batch.totalSuccess} وجهة بنجاح!`, '✨');
      } else {
        const failedTarget = batch.targetChats.find((t) => t.status === 'failed');
        const rawErr = failedTarget?.error || 'تعذر إرسال الرسائل إلى الوجهات المحددة';
        let friendlyErr = rawErr;
        if (rawErr.includes('USER_BANNED_IN_CHANNEL')) {
          friendlyErr = `أنت محظور أو مقيد من إرسال الرسائل في "${failedTarget?.title || 'المجموعة'}" بواسطة المشرفين (USER_BANNED_IN_CHANNEL)`;
        } else if (rawErr.includes('CHANNEL_PRIVATE')) {
          friendlyErr = `القناة أو المجموعة "${failedTarget?.title || ''}" خاصة ولا يمكن النشر فيها دون أن تكون عضواً فيها (CHANNEL_PRIVATE)`;
        } else if (rawErr.includes('CHAT_WRITE_FORBIDDEN')) {
          friendlyErr = `النشر في "${failedTarget?.title || 'القناة'}" مقتصر على المشرفين فقط (CHAT_WRITE_FORBIDDEN)`;
        } else if (rawErr.includes('FLOOD_WAIT')) {
          friendlyErr = `تم حظر الإرسال مؤقتاً لتفادي التكرار المفرط (FLOOD_WAIT). يرجى الانتظار قليلاً`;
        }
        setSendStatusMsg({
          text: `⚠️ لم يتم الإرسال: ${friendlyErr}`,
          success: false,
        });
        showToast(`⚠️ تعذر الإرسال: ${friendlyErr}`, '⚠️');
      }
    }
  };

  // Monitoring controls
  const handleStartMonitoring = () => {
    const kws = watchWords
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    notificationsService.setMonitorConfig({
      isEnabled: true,
      keywords: kws,
      sendAlertsToSavedMessages: true,
      browserPushAlerts: true,
    });
    setMonitorStatus('running');
    showToast('🟢 تم تفعيل نظام المراقبة الذكية ورصد الكلمات المفتاحية فورياً', '✅');
  };

  const handleStopMonitoring = () => {
    notificationsService.setMonitorConfig({
      isEnabled: false,
      keywords: watchWords.split('\n').map((k) => k.trim()).filter(Boolean),
      sendAlertsToSavedMessages: true,
      browserPushAlerts: true,
    });
    setMonitorStatus('stopped');
    showToast('⏹️ تم إيقاف نظام المراقبة', '⏹');
  };

  const handleResumeMonitoring = () => {
    handleStartMonitoring();
    showToast('🔄 تم استئناف المراقبة بنجاح', '🔄');
  };

  const handleTestAlertTrigger = () => {
    const sampleChat = chats.find((c) => c.type === 'group' || c.type === 'channel') || chats[0];
    const chatId = sampleChat ? sampleChat.id : 'chat_group_main';
    const chatTitle = sampleChat ? sampleChat.title : 'مجموعة سرعة إنجاز الرسمية';
    const chatUsername = sampleChat?.username;
    const currentMsgs = messages[chatId] || [];
    const sampleMsg = currentMsgs[currentMsgs.length - 1];
    const messageId = sampleMsg ? sampleMsg.id : `msg_test_${Date.now()}`;
    const testKeyword = watchWords.split('\n')[0] || 'واجب';

    notificationsController.postNotification({
      category: 'keyword_alert',
      title: `🚨 كلمة مراقبة: [${testKeyword}]`,
      body: `💬 الرسالة: السلام عليكم، مطلوب حل ${testKeyword} لمشروع التخرج بشكل عاجل اليوم.\n📍 المصدر: ${chatTitle}`,
      avatar: sampleChat?.avatar,
      chatId: chatId,
      chatTitle: chatTitle,
      chatUsername: chatUsername,
      messageId: messageId,
      senderId: 'user_dev_ali',
      senderName: 'علي التقني',
      senderUsername: 'ali_tech',
      keyword: testKeyword,
      messageText: `السلام عليكم، مطلوب حل ${testKeyword} لمشروع التخرج بشكل عاجل اليوم.`,
      replyAction: true,
    });

    showToast('📨 تم إرسال تنبيه تجريبي ومحاكاة رصد فوري للرسائل المحفوظة', '🚨');
  };

  const handleClearAlerts = () => {
    notificationsService.clearAlerts();
    setAlerts([]);
    showToast('🧹 تم مسح سجل التنبيهات', 'info');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="modal-sender-activity"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto"
        dir="rtl"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setActiveModal('none')}
          className="fixed inset-0 cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-5xl text-[#e8eaf6] rounded-2xl shadow-2xl overflow-hidden border border-white/10 my-auto flex flex-col max-h-[92vh]"
          style={{
            background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #0d1322 100%)',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-cyan-400 m-0">الإرسال والمراقبة</h4>
                <p className="text-[10px] text-gray-400 m-0">نشر مجدول وذكي ومراقبة الرسائل والكلمات المفتاحية فورياً</p>
              </div>
            </div>

            {/* Navigation Switcher between Sender and Salam Activity Log */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setSenderActiveTab('sender')}
                  className={`px-3 py-1 rounded-md text-[0.72rem] font-semibold transition-all ${
                    senderActiveTab === 'sender'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  الإرسال والمراقبة
                </button>
                <button
                  type="button"
                  onClick={() => setSenderActiveTab('salam_log')}
                  className={`px-3 py-1 rounded-md text-[0.72rem] font-semibold flex items-center gap-1.5 transition-all ${
                    senderActiveTab === 'salam_log'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>سجل نشاط السلام</span>
                  <span className="text-[0.6rem] px-1 py-0.2 bg-emerald-500/30 text-emerald-200 rounded font-mono">
                    LIVE
                  </span>
                </button>
              </div>

              <button
                onClick={() => setActiveModal('none')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {senderActiveTab === 'salam_log' ? (
            <div className="overflow-hidden flex-1 h-[70vh]">
              <SalamActivityLog compact={true} />
            </div>
          ) : (
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4">
            {/* 5. الإرسال والمراقبة */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* العمود الأيمن: الإرسال الذكي والمباشر */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-md flex flex-col">
                <div className="px-3.5 py-2.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between">
                  <h6 className="text-[0.85rem] font-bold text-white flex items-center gap-2 m-0">
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    <span>الإرسال الذكي والمباشر</span>
                  </h6>
                </div>
                <div className="p-3 space-y-3 flex-1">
                  {/* مسودات ونماذج الرسائل الجاهزة */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[0.75rem] font-medium text-gray-300 flex items-center gap-1.5 m-0">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>مسودات الرسائل الجاهزة ({MESSAGE_DRAFTS.length})</span>
                      </label>
                      <span className="text-[0.62rem] text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        تنسيق ماركداون ملون وعريض ✨
                      </span>
                    </div>

                    {/* أزرار اختيار المسودات */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                      {MESSAGE_DRAFTS.map((draft, idx) => {
                        const isSelected = selectedDraftIndex === idx || messageText === draft.text;
                        return (
                          <button
                            key={draft.id}
                            type="button"
                            onClick={() => handleSelectDraft(idx)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-right text-[0.7rem] transition-all border ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/10 font-bold'
                                : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.07] hover:border-white/20'
                            }`}
                            title={draft.title}
                          >
                            <span className="shrink-0">{draft.icon}</span>
                            <span className="truncate">{draft.shortTitle}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* حقل نص الرسالة */}
                    <textarea
                      id="message"
                      rows={4}
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        localStorage.setItem('draft_message', e.target.value);
                      }}
                      placeholder="اكتب الرسالة المراد إرسالها أو اختر إحدى المسودات الجاهزة أعلاه"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-[0.8rem] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none transition-all font-mono leading-relaxed"
                    />
                  </div>

                  {/* إضافة صور للرسالة */}
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>إضافة صور للرسالة (اختياري)</span>
                    </label>
                    <div
                      id="dropZone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-white/20 hover:border-cyan-400/50 rounded-xl p-3 text-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                    >
                      <UploadCloud className="w-6 h-6 text-gray-400 mx-auto mb-1 opacity-70" />
                      <p className="text-[0.75rem] text-gray-300 font-medium m-0">اسحب الصور هنا أو انقر للاختيار</p>
                      <small className="text-[0.65rem] text-gray-400">يدعم: JPG, PNG, GIF, WebP | 10MB لكل صورة</small>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="imageUpload"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </div>

                    {/* معاينة الصور */}
                    {uploadedImages.length > 0 && (
                      <div id="imagePreview" className="mt-2">
                        <div id="imagePreviewContainer" className="flex gap-2 flex-wrap">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-white/20">
                              <img src={img} alt="preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* مجموعات الإرسال */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[0.75rem] font-medium text-gray-300 m-0">مجموعات الإرسال</label>
                      <button
                        type="button"
                        id="fetchDialogsBtn"
                        onClick={handleFetchDialogs}
                        disabled={isFetchingGroups}
                        className="btn btn-outline-info text-[0.7rem] py-0.5 px-2 rounded border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="جلب جميع المجموعات والقنوات الحقيقية التي اشتركت بها من حسابك في تيليجرام"
                      >
                        <RotateCw className={`w-3 h-3 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                        <span>{isFetchingGroups ? 'جاري جلب المجموعات...' : 'جلب كل المجموعات'}</span>
                      </button>
                    </div>
                    <textarea
                      id="groups"
                      rows={3}
                      value={groupsText}
                      onChange={(e) => setGroupsText(e.target.value)}
                      placeholder="ضع كل مجموعة في سطر منفصل (@username أو رابط المجموعة أو اسمها)"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[0.82rem] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                    />
                    <div className="text-[0.68rem] text-gray-400 mt-0.5">
                      📤 يدعم: المعرفات (@group)، الروابط (t.me/group أو t.me/+hash)، أو أسماء المجموعات المشترك بها
                    </div>
                  </div>

                  {/* نوع الإرسال */}
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-300 mb-1">نوع الإرسال</label>
                    <select
                      id="sendType"
                      value={sendType}
                      onChange={(e) => setSendType(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[0.75rem] text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="manual">يدوي</option>
                      <option value="scheduled">مجدول</option>
                    </select>
                  </div>

                  {/* خيارات الجدولة */}
                  {sendType === 'scheduled' && (
                    <div id="scheduledOptions" className="grid grid-cols-2 gap-2 p-2 bg-white/[0.02] border border-white/10 rounded-lg">
                      <div>
                        <label className="block text-[0.7rem] text-gray-400 mb-0.5">الفترة (دقائق)</label>
                        <input
                          type="number"
                          id="intervalMinutes"
                          min={1}
                          value={intervalMinutes}
                          onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-[0.75rem] text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.7rem] text-gray-400 mb-0.5">المدة (ساعات)</label>
                        <input
                          type="number"
                          id="scheduleDuration"
                          min={0}
                          step={0.5}
                          value={scheduleDuration}
                          onChange={(e) => setScheduleDuration(parseFloat(e.target.value) || 0)}
                          className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-[0.75rem] text-white"
                        />
                        <div className="text-[0.6rem] text-gray-500 mt-0.5">0 = غير محدود</div>
                      </div>
                    </div>
                  )}

                  {/* وضع الإرسال عند المجموعات المحمية */}
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>وضع الإرسال عند المجموعات المحمية</span>
                    </label>
                    <select
                      id="sanitizeMode"
                      value={sanitizeMode}
                      onChange={(e) => setSanitizeMode(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[0.75rem] text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="salam">🤖 ذكي (salam)</option>
                      <option value="skip">⏭️ تخطي</option>
                      <option value="smart">🧠 ذكية</option>
                      <option value="always">🛡️ تنقية</option>
                      <option value="off">🚫 معطّل</option>
                    </select>

                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => setShowModeDesc(!showModeDesc)}
                        className="w-full text-right bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-lg py-1.5 px-2.5 text-[0.65rem] text-gray-300 flex items-center justify-between transition-all"
                      >
                        <span className="flex items-center gap-1">
                          <Info className="w-3 h-3 text-cyan-400" />
                          <span>شرح الأوضاع</span>
                        </span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showModeDesc ? 'rotate-180' : ''}`} />
                      </button>

                      {showModeDesc && (
                        <div id="modeDesc" className="mt-1.5 p-2 bg-black/40 border border-white/10 rounded-lg text-[0.68rem] text-gray-300 space-y-1 leading-relaxed">
                          <div><strong>🤖 ذكي (salam):</strong> يرسل "السلام عليكم"، ينتظر interval، إن وصلت ≥3 رسائل عدّل إلى رسالتك، وإلا حذف وأعاد الدورة.</div>
                          <div><strong>⏭️ تخطي:</strong> يتجاهل المجموعات المحمية تماماً – الأمن للحساب.</div>
                          <div><strong>🧠 ذكية:</strong> يحذف الروابط والأرقام تلقائياً قبل الإرسال.</div>
                          <div><strong>🛡️ تنقية:</strong> يحذف الروابط من كل رسالة لجميع المجموعات.</div>
                          <div><strong>🚫 معطّل:</strong> يرسل الرسالة كما هي (خطر حظر).</div>
                        </div>
                      )}

                      {sanitizeMode === 'salam' && (
                        <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[0.68rem] text-emerald-300">
                            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>سجل نشاط وضع السلام شفاف ومباشر</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSenderActiveTab('salam_log')}
                            className="px-2 py-0.5 text-[0.65rem] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded font-semibold transition-all"
                          >
                            عرض السجل المباشر ↗
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      id="saveBtn"
                      onClick={handleSaveSettings}
                      className="w-full py-2 px-3 rounded-lg text-[0.78rem] font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ الإعدادات</span>
                    </button>
                    <button
                      type="button"
                      id="sendNowBtn"
                      disabled={isSending}
                      onClick={handleSendNow}
                      className="w-full py-2 px-3 rounded-lg text-[0.78rem] font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      {isSending ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>إرسال الآن</span>
                    </button>
                  </div>

                  {sendStatusMsg && (
                    <div id="sendStatus" className={`mt-2 p-2 rounded text-[0.75rem] ${sendStatusMsg.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                      {sendStatusMsg.text}
                    </div>
                  )}
                </div>
              </div>

              {/* العمود الأيسر: المراقبة */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-md flex flex-col">
                <div className="px-3.5 py-2.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between">
                  <h6 className="text-[0.85rem] font-bold text-white flex items-center gap-2 m-0">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>المراقبة</span>
                  </h6>
                </div>
                <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-300 mb-1">كلمات المراقبة (اختيارية)</label>
                    <textarea
                      id="watchWords"
                      rows={2}
                      value={watchWords}
                      onChange={(e) => setWatchWords(e.target.value)}
                      placeholder="كل كلمة في سطر"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[0.82rem] text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
                    />
                    <div className="text-[0.68rem] text-gray-400 mt-0.5">
                      🔹 فارغة = تنبيه لكل الرسائل 🔹 كلمات = تنبيه عند ورودها فقط
                    </div>
                  </div>

                  {/* أزرار التحكم بالمراقبة */}
                  <div className="grid grid-cols-3 gap-2">
                    {monitorStatus !== 'running' ? (
                      <button
                        type="button"
                        id="startMonitorBtn"
                        onClick={handleStartMonitoring}
                        className="w-full py-1.5 px-2 rounded-lg text-[0.75rem] font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-1 transition-all"
                      >
                        <Play className="w-3 h-3" />
                        <span>بدء</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        id="stopMonitorBtn"
                        onClick={handleStopMonitoring}
                        className="w-full py-1.5 px-2 rounded-lg text-[0.75rem] font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-1 transition-all"
                      >
                        <Square className="w-3 h-3" />
                        <span>إيقاف</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="resumeMonitorBtn"
                      onClick={handleResumeMonitoring}
                      className="w-full py-1.5 px-2 rounded-lg text-[0.75rem] font-bold text-white bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center gap-1 transition-all"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>استئناف</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestAlertTrigger}
                      className="w-full py-1.5 px-2 rounded-lg text-[0.7rem] font-medium text-amber-300 border border-amber-400/40 hover:bg-amber-400/10 flex items-center justify-center gap-1 transition-all"
                      title="اختبار تنبيه فوري ومجمّع"
                    >
                      <Bell className="w-3 h-3" />
                      <span>تجربة</span>
                    </button>
                  </div>

                  {/* شارة الحالة */}
                  <div id="monitorStatus" className="text-center py-1">
                    <span
                      id="monitorState"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-bold ${
                        monitorStatus === 'running'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${monitorStatus === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                      <span>{monitorStatus === 'running' ? 'نشط • يعمل' : 'غير نشط'}</span>
                    </span>
                  </div>

                  <hr className="border-white/10 my-1" />

                  {/* التنبيهات الواردة */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[0.75rem] text-gray-200 flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-400" />
                        <span>التنبيهات الواردة</span>
                        <small className="text-[0.65rem] text-gray-400">(تجميع ذكي + إرسال فوري 📨)</small>
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handleClearAlerts}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[0.6rem] text-gray-300"
                        >
                          مسح
                        </button>
                      </div>
                    </div>

                    <div
                      id="alertsList"
                      className="bg-black/30 border border-white/5 rounded-lg p-2 max-h-[180px] overflow-y-auto space-y-1.5 flex-1"
                    >
                      {alerts.length === 0 ? (
                        <div className="text-center text-gray-500 py-5 text-[0.7rem]">
                          في انتظار التنبيهات...
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="bg-white/[0.04] hover:bg-white/[0.07] border-r-2 border-amber-400 rounded p-2 text-[0.72rem] transition-all flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-300 flex items-center gap-1">
                                <span>🚨 {alert.keyword}</span>
                              </span>
                              <span className="text-[0.6rem] text-gray-400">{alert.timestamp}</span>
                            </div>
                            <p className="text-[0.7rem] text-gray-300 line-clamp-2 m-0">{alert.messageText}</p>
                            <div className="flex items-center justify-between text-[0.62rem] text-gray-400 pt-0.5">
                              <span>{alert.sourceChatTitle}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  jumpToMessage(alert.sourceChatId, alert.id);
                                  setActiveModal('none');
                                }}
                                className="text-cyan-400 hover:underline"
                              >
                                انتقال للرسالة ↗
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
