import { useState, type Key } from 'react';
import {
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  LayoutGrid,
  Sparkles,
  Search,
} from 'lucide-react';
import { ALL_SERVICES, InAppServiceViewer, type ServiceItem } from './InAppServiceViewer';

type ServicesCenterProps = {
  onBack: () => void;
  initialServiceId?: string | null;
  onSendToChat?: (text: string) => void;
  activeChatName?: string;
};

function ServiceCard({
  service,
  onOpen,
}: {
  key?: Key;
  service: ServiceItem;
  onOpen: () => void;
}) {
  const Icon = service.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`button-open-service-${service.id}`}
      className={`group relative flex min-h-[168px] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-card p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_38px_hsl(var(--foreground)/.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer ${
        service.featured ? 'md:col-span-2 md:min-h-[190px] md:p-7' : ''
      }`}
      dir="rtl"
    >
      <span
        className={`absolute -left-10 -top-10 h-28 w-28 rounded-full ${service.tone} opacity-20 transition-transform duration-500 group-hover:scale-150`}
      />
      <div className="relative flex items-start justify-between gap-4 w-full">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${service.tone} shadow-xs`}>
          <Icon size={21} strokeWidth={1.9} />
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
            فتح داخلي
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground transition-all group-hover:border-primary/35 group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowUpLeft size={15} />
          </span>
        </div>
      </div>
      <div className="relative mt-auto pt-6">
        <p className="font-mono-app text-[9px] uppercase tracking-[.16em] text-primary">{service.eyebrow}</p>
        <h3 className={`${service.featured ? 'mt-2 text-lg' : 'mt-1.5 text-sm'} font-bold`}>{service.title}</h3>
        <p className="mt-2 max-w-[480px] text-[11px] leading-6 text-muted-foreground">{service.description}</p>
      </div>
    </button>
  );
}

export function ServicesCenter({
  onBack,
  initialServiceId = null,
  onSendToChat,
  activeChatName,
}: ServicesCenterProps) {
  const [activeServiceId, setActiveServiceId] = useState<string | null>(initialServiceId);
  const [category, setCategory] = useState<'all' | 'academic' | 'conversion' | 'tools' | 'core'>('all');
  const [search, setSearch] = useState('');

  // If a service is currently active, render the embedded in-app viewer
  if (activeServiceId) {
    return (
      <InAppServiceViewer
        serviceId={activeServiceId}
        onClose={() => setActiveServiceId(null)}
        onSelectService={id => setActiveServiceId(id)}
        onSendToChat={onSendToChat}
        activeChatName={activeChatName}
        fullPage
      />
    );
  }

  const filteredServices = ALL_SERVICES.filter(service => {
    const matchCategory = category === 'all' || service.category === category;
    const matchSearch =
      !search ||
      service.title.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase()) ||
      service.eyebrow.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <main className="workspace-shell min-h-[100dvh] overflow-y-auto" dir="rtl">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        {/* Header with Back to Chats */}
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            data-testid="button-back-to-chats"
            className="group inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3.5 py-2.5 text-xs font-bold text-muted-foreground transition hover:border-primary/35 hover:bg-card hover:text-foreground"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            العودة إلى محادثات تيليجرام
          </button>
          <div className="flex items-center gap-2 text-left">
            <div className="hidden text-left sm:block">
              <p className="font-mono-app text-[9px] uppercase tracking-[.18em] text-primary">workspace / services</p>
              <p className="mt-1 text-[10px] text-muted-foreground">مركز الخدمات المدمجة</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <LayoutGrid size={19} />
            </span>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="relative mt-8 overflow-hidden rounded-[30px] border border-border/80 bg-card p-6 soft-shadow sm:mt-10 sm:p-9 lg:p-11">
          <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_290px] lg:items-end">
            <div className="max-w-[700px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[10px] font-bold text-primary">
                <Sparkles size={13} />
                مساحة الأدوات السريعة المدمجة بالكامل
              </div>
              <h1 className="mt-5 max-w-[660px] text-[clamp(2rem,5vw,4.25rem)] font-bold leading-[1.18] tracking-[-.045em]">
                أدواتك وخدماتك،
                <span className="block text-primary">تفتح مباشرة داخل التطبيق.</span>
              </h1>
              <p className="mt-5 max-w-[580px] text-xs leading-7 text-muted-foreground sm:text-sm">
                انتقل من المحادثة إلى أي خدمة بضغطة واحدة دون فتح روابط خارجية أو مغادرة التطبيق، مع إمكانية إرسال النتائج فوراً إلى المحادثة الحالية.
              </p>
            </div>
            <div className="rounded-[22px] border border-border/80 bg-background/65 p-4 backdrop-blur-sm" data-testid="status-services">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7dbd8a]/15 text-[#4e9b65]">
                  <Check size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-xs font-bold">جميع الخدمات مدمجة</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">لا حاجة لروابط خارجية</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[#7dbd8a]" />
                <span>جاهزة للاستخدام التفاعلي</span>
                <span className="mr-auto font-mono-app text-[9px] text-primary">IN-APP</span>
              </div>
            </div>
          </div>
        </section>

        {/* Categories & Search Filter */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-card border border-border p-1">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                category === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              جميع الخدمات ({ALL_SERVICES.length})
            </button>
            <button
              type="button"
              onClick={() => setCategory('academic')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                category === 'academic'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              الأكاديمي والبحوث
            </button>
            <button
              type="button"
              onClick={() => setCategory('conversion')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                category === 'conversion'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              تحويل وتنسيق الملفات
            </button>
            <button
              type="button"
              onClick={() => setCategory('tools')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                category === 'tools'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              استكشاف الروابط
            </button>
            <button
              type="button"
              onClick={() => setCategory('core')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                category === 'core'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              التحكم والنشر
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute right-3 top-3 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن أداة أو خدمة…"
              className="h-10 w-full rounded-xl border border-input bg-card pr-9 pl-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Services Grid */}
        <section className="mt-6" aria-labelledby="services-title">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onOpen={() => setActiveServiceId(service.id)}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 flex flex-col gap-3 border-t border-border/70 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-primary" />
            <span>جميع الأدوات تعمل داخل التطبيق وترسل مخرجاتها مباشرة للمحادثات</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveServiceId('legacy')}
            data-testid="link-services-legacy-footer"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline cursor-pointer"
          >
            فتح لوحة الخدمات والتحكم الشاملة
            <ArrowUpLeft size={14} />
          </button>
        </footer>
      </div>
    </main>
  );
}
