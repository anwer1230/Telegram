import { useState, useRef } from 'react';
import {
  ChevronLeft,
  RotateCcw,
  Maximize2,
  Minimize2,
  Share2,
  X,
  GraduationCap,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Presentation,
  Link2,
  Bookmark,
  BarChart3,
  ShieldAlert,
  WandSparkles,
  Check,
  Send,
  Sparkles,
  Megaphone,
  Eye,
  Bot,
  Users,
} from 'lucide-react';
import { AutoBroadcastModal } from './features/AutoBroadcastModal';
import { GroupMonitoringModal } from './features/GroupMonitoringModal';
import { AutoRepliesModal } from './features/AutoRepliesModal';
import { AccountsManagerModal } from './features/AccountsManagerModal';
import { OriginalPublishingMonitoringModal } from './features/OriginalPublishingMonitoringModal';
import { SavedLinksModal } from './features/SavedLinksModal';

export type ServiceItem = {
  id: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  url: string;
  icon: typeof GraduationCap;
  tone: string;
  featured?: boolean;
  category: 'core' | 'academic' | 'conversion' | 'tools';
};

export const ALL_SERVICES: ServiceItem[] = [
  {
    id: 'academic',
    title: 'المساعد الأكاديمي والبحوث',
    shortTitle: 'الأكاديمي',
    eyebrow: 'مساعد ذكي للطلاب',
    description: 'إعداد خطط البحث، التلخيص، صياغة الاستبيانات، ومساعدة الطلاب الأكاديمية.',
    url: '/academic',
    icon: GraduationCap,
    tone: 'bg-primary/20 text-primary',
    featured: true,
    category: 'academic',
  },
  {
    id: 'pdf2word',
    title: 'تحويل PDF إلى Word',
    shortTitle: 'PDF إلى Word',
    eyebrow: 'تحويل وتنسيق',
    description: 'تحويل وتنسيق ملفات PDF إلى مستندات Word قابلة للتحرير بدقة عالية.',
    url: '/formatter?section=pdf2word',
    icon: FileText,
    tone: 'bg-[#e5c7b2] text-[#844416]',
    category: 'conversion',
  },
  {
    id: 'html2excel',
    title: 'استخراج الجداول إلى Excel',
    shortTitle: 'إلى Excel',
    eyebrow: 'معالجة الجداول',
    description: 'استخراج وتنسيق الجداول والبيانات في جداول بيانات Excel جاهزة.',
    url: '/formatter?section=html2excel',
    icon: FileSpreadsheet,
    tone: 'bg-[#c4dbc1] text-[#2b6426]',
    category: 'conversion',
  },
  {
    id: 'html2word',
    title: 'تحويل HTML إلى Word',
    shortTitle: 'HTML إلى Word',
    eyebrow: 'تنسيق المحتوى',
    description: 'تحويل صفحات الويب والنصوص إلى مستندات Word منسقة.',
    url: '/formatter?section=html2word',
    icon: FileArchive,
    tone: 'bg-[#d5c8e5] text-[#553678]',
    category: 'conversion',
  },
  {
    id: 'html2ppt',
    title: 'تحويل إلى PowerPoint',
    shortTitle: 'إلى PowerPoint',
    eyebrow: 'عروض تقديمية',
    description: 'تحويل النصوص والنقاط إلى شرائح عرض تقديمي PPTX احترافية.',
    url: '/formatter?section=html2ppt',
    icon: Presentation,
    tone: 'bg-[#e6cf9e] text-[#7a5316]',
    category: 'conversion',
  },
  {
    id: 'link_finder',
    title: 'باحث الروابط والمجموعات',
    shortTitle: 'باحث الروابط',
    eyebrow: 'استكشاف المجموعات',
    description: 'استخراج وبحث روابط قنوات ومجموعات التيليجرام المستهدفة والتحقق منها.',
    url: '/link-finder',
    icon: Link2,
    tone: 'bg-[#b9d8d1] text-[#1c5f53]',
    category: 'tools',
  },
  {
    id: 'broadcast',
    title: 'إدارة النشر التلقائي المتقدم',
    shortTitle: 'النشر التلقائي',
    eyebrow: 'البث والجدولة',
    description: 'إرسال ونشر الرسائل الإعلانية في المجموعات والقنوات مع الجدولة والتوقيت الذكي.',
    url: '/legacy/broadcast',
    icon: Megaphone,
    tone: 'bg-[#ce8e49]/20 text-[#ce8e49]',
    featured: true,
    category: 'core',
  },
  {
    id: 'monitoring',
    title: 'مراقبة المجموعات والكلمات المفتاحية',
    shortTitle: 'مراقبة المجموعات',
    eyebrow: 'الرصد الفوري',
    description: 'رصد فوري لطلبات العملاء والطلاب والكلمات الدلالية في المجموعات المستهدفة.',
    url: '/legacy/monitoring',
    icon: Eye,
    tone: 'bg-[#377c79]/20 text-[#377c79]',
    featured: true,
    category: 'core',
  },
  {
    id: 'autoreplies',
    title: 'الرد الآلي ومحرك التعلم الذكي',
    shortTitle: 'الرد الآلي',
    eyebrow: 'الأتمتة والذكاء',
    description: 'إدارة قواعد المطابقة الفورية للردود والتعلم من استفسارات الطلاب المتكررة.',
    url: '/legacy/autoreply',
    icon: Bot,
    tone: 'bg-[#844416]/20 text-[#844416]',
    category: 'core',
  },
  {
    id: 'accounts',
    title: 'إدارة الحسابات وجلسات العمل',
    shortTitle: 'إدارة الحسابات',
    eyebrow: 'الحسابات والجلسات',
    description: 'التبديل الفوري بين حسابات النشر والمراقبة وربطها بنظام تسجيل الدخول الرئيسي.',
    url: '/legacy/accounts',
    icon: Users,
    tone: 'bg-[#4c8790]/20 text-[#4c8790]',
    category: 'core',
  },
  {
    id: 'legacy',
    title: 'لوحة الخدمات الأساسية والنشر',
    shortTitle: 'الخدمات والنشر',
    eyebrow: 'التحكم والمراقبة',
    description: 'إدارة النشر التلقائي، مراقبة المجموعات، الحسابات والرد الآلي.',
    url: '/legacy/',
    icon: WandSparkles,
    tone: 'bg-accent text-accent-foreground',
    category: 'core',
  },
  {
    id: 'saved_links',
    title: 'مستودع الروابط المحفوظة',
    shortTitle: 'الروابط المحفوظة',
    eyebrow: 'الأرشيف السريع',
    description: 'مكتبة الروابط المصنفة والمحفوظة للاستخدام والجدولة الفورية.',
    url: '/saved_links',
    icon: Bookmark,
    tone: 'bg-muted text-muted-foreground',
    category: 'tools',
  },
  {
    id: 'stats',
    title: 'إحصائيات النظام ومؤشرات الأداء',
    shortTitle: 'الإحصائيات',
    eyebrow: 'التقارير الحية',
    description: 'متابعة أداء العمليات واستقرار الاتصالات ومعدلات التسليم.',
    url: '/stats',
    icon: BarChart3,
    tone: 'bg-muted text-muted-foreground',
    category: 'tools',
  },
  {
    id: 'admin',
    title: 'لوحة الإدارة المتقدمة',
    shortTitle: 'لوحة الإدارة',
    eyebrow: 'إدارة النظام',
    description: 'التحكم المتقدم في الجلسات، مفاتيح الربط، وسجلات النظام.',
    url: '/admin',
    icon: ShieldAlert,
    tone: 'bg-muted text-muted-foreground',
    category: 'core',
  },
];

type InAppServiceViewerProps = {
  serviceId: string;
  onClose: () => void;
  onSelectService?: (serviceId: string) => void;
  onSendToChat?: (text: string) => void;
  activeChatName?: string;
  fullPage?: boolean;
};

export function InAppServiceViewer({
  serviceId,
  onClose,
  onSelectService,
  onSendToChat,
  activeChatName,
  fullPage = false,
}: InAppServiceViewerProps) {
  if (serviceId === 'legacy' || serviceId === 'broadcast' || serviceId === 'monitoring') {
    return <OriginalPublishingMonitoringModal onClose={onClose} onSendToChat={onSendToChat} />;
  }

  if (serviceId === 'saved_links') {
    return <SavedLinksModal onClose={onClose} onSelectMessage={onSendToChat} />;
  }

  if (serviceId === 'autoreplies') {
    return <AutoRepliesModal onClose={onClose} onSendToChat={onSendToChat} />;
  }

  if (serviceId === 'accounts') {
    return <AccountsManagerModal onClose={onClose} />;
  }

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState('');

  const currentService = ALL_SERVICES.find(s => s.id === serviceId) || ALL_SERVICES[0];
  const Icon = currentService.icon;

  const handleReload = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = currentService.url;
    }
  };

  const handleShareToChat = () => {
    const shareText = `📌 تم فتح أداة [${currentService.title}] داخل المنصة\nالرابط: ${window.location.origin}${currentService.url}`;
    if (onSendToChat) {
      onSendToChat(shareText);
      setCopiedNotification('تم الإرسال إلى المحادثة الحالية بنجاح!');
    } else {
      void navigator.clipboard.writeText(shareText);
      setCopiedNotification('تم نسخ معلومات الأداة إلى الحافظة!');
    }
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  return (
    <div
      className={`relative flex flex-col bg-background text-foreground transition-all duration-300 ${
        fullPage
          ? 'h-screen w-screen'
          : fullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen'
          : 'h-full w-full'
      }`}
      dir="rtl"
    >
      {/* Integrated In-App Top Navigation Bar */}
      <header className="flex h-16 flex-none items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-6">
        {/* Right side: Back button & Active Service Details */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            data-testid="button-service-back"
            className="group flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft size={17} className="transition-transform group-hover:-translate-x-0.5" />
            <span>رجوع</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className={`grid h-9 w-9 place-items-center rounded-xl shadow-xs ${currentService.tone}`}>
              <Icon size={18} strokeWidth={2} />
            </span>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">{currentService.title}</h2>
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                  <Sparkles size={10} /> مدمج بالتطبيق
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate max-w-[280px] lg:max-w-md">
                {currentService.description}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Fast Switcher Pills */}
        <div className="hidden xl:flex items-center gap-1 overflow-x-auto py-1 max-w-[480px]">
          {ALL_SERVICES.slice(0, 6).map(service => {
            const isCurrent = service.id === currentService.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelectService && onSelectService(service.id)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {service.shortTitle}
              </button>
            );
          })}
        </div>

        {/* Left side: Tool Controls (Reload, Share to Chat, Fullscreen, Close) */}
        <div className="flex items-center gap-1.5">
          {/* Quick Share to Telegram Chat */}
          <button
            type="button"
            onClick={handleShareToChat}
            title={activeChatName ? `مشاركة إلى محادثة ${activeChatName}` : 'مشاركة إلى تيليجرام'}
            data-testid="button-share-to-chat"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            {onSendToChat ? <Send size={14} /> : <Share2 size={14} />}
            <span className="hidden md:inline">
              {activeChatName ? `إرسال إلى ${activeChatName}` : 'مشاركة للمحادثة'}
            </span>
          </button>

          {/* Reload Service */}
          <button
            type="button"
            onClick={handleReload}
            title="إعادة تحميل الخدمة"
            aria-label="إعادة تحميل الخدمة"
            data-testid="button-reload-service"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:bg-muted hover:text-foreground"
          >
            <RotateCcw size={15} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            aria-label={fullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            data-testid="button-toggle-fullscreen"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:bg-muted hover:text-foreground"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Close viewer */}
          <button
            type="button"
            onClick={onClose}
            title="إغلاق والعودة"
            aria-label="إغلاق والعودة"
            data-testid="button-close-service"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Quick Services Navigation Sub-bar for mobile / tablets */}
      <nav aria-label="شريط الخدمات السريعة" className="xl:hidden flex items-center gap-1.5 overflow-x-auto border-b border-border/70 bg-card/60 px-4 py-2 text-xs">
        <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap pl-1">الخدمات:</span>
        {ALL_SERVICES.map(service => {
          const isCurrent = service.id === currentService.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectService && onSelectService(service.id)}
              className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition ${
                isCurrent
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {service.shortTitle}
            </button>
          );
        })}
      </nav>

      {/* Notification Toast */}
      {copiedNotification && (
        <div
          role="status"
          className="absolute top-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-card border border-primary/30 px-4 py-2.5 text-xs font-bold text-foreground shadow-xl fade-up"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#7dbd8a] text-white">
            <Check size={12} strokeWidth={3} />
          </span>
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Native In-App Service Component OR Embedded Iframe Container */}
      <div className="relative flex-1 w-full overflow-hidden bg-background">
        {currentService.id === 'broadcast' && (
          <AutoBroadcastModal
            onClose={onClose}
            onOpenAccounts={() => onSelectService?.('accounts')}
            onSendDirectToChat={onSendToChat}
          />
        )}

        {currentService.id === 'monitoring' && (
          <GroupMonitoringModal
            onClose={onClose}
            onOpenAutoReplies={() => onSelectService?.('autoreplies')}
            onReplyInChat={onSendToChat}
          />
        )}

        {currentService.id === 'autoreplies' && (
          <AutoRepliesModal
            onClose={onClose}
            onSendToChat={onSendToChat}
          />
        )}

        {currentService.id === 'accounts' && (
          <AccountsManagerModal
            onClose={onClose}
            onOpenLoginFlow={() => {
              onClose();
              // When user wants to login, close and let user access login
            }}
          />
        )}

        {!['broadcast', 'monitoring', 'autoreplies', 'accounts'].includes(currentService.id) && (
          <>
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-xs font-bold text-muted-foreground">
                  جارٍ تحميل {currentService.title} داخل التطبيق…
                </p>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={currentService.id}
              src={currentService.url}
              title={currentService.title}
              data-testid={`iframe-service-${currentService.id}`}
              className="h-full w-full border-0 bg-background"
              onLoad={() => setLoading(false)}
              allow="clipboard-read; clipboard-write;"
            />
          </>
        )}
      </div>
    </div>
  );
}
