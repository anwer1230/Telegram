import { useState } from 'react';
import {
  X,
  CreditCard,
  Sun,
  Calendar,
  Moon,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Send,
  ShieldCheck,
  PhoneCall,
  GraduationCap
} from 'lucide-react';

interface CardPricesModalProps {
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}

interface PriceTier {
  id: string;
  title: string;
  duration: string;
  price: string;
  currency: string;
  icon: typeof Sun;
  color: string;
  badge?: string;
  features: string[];
}

const TIERS: PriceTier[] = [
  {
    id: 'daily',
    title: 'اشتراك يومي',
    duration: 'وصول كامل لمدة 24 ساعة',
    price: '3',
    currency: 'ريال سعودي',
    icon: Sun,
    color: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/40 text-cyan-400',
    features: ['نشر غير محدود', 'مراقبة المجموعات', 'ردود تلقائية', 'دعم فني سريع'],
  },
  {
    id: 'weekly',
    title: 'اشتراك أسبوعي',
    duration: 'وصول كامل لمدة 7 أيام متواصلة',
    price: '20',
    currency: 'ريال سعودي',
    icon: Calendar,
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/40 text-purple-400',
    features: ['كل مميزات اليومي', 'نظام التعلم الذكي', 'نشر متسلسل دوري', 'تعدد الحسابات'],
  },
  {
    id: 'monthly',
    title: 'اشتراك شهري VIP',
    duration: 'وصول كامل لمدة 30 يوماً',
    price: '75',
    currency: 'ريال سعودي',
    icon: Moon,
    badge: '★ الأفضل قيمة والأكثر طلباً',
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/50 text-amber-400',
    features: ['جميع المميزات والخدمات الأكاديمية', 'أولوية قصوى بالنشر والمراقبة', 'قوالب إعلانية احترافية', 'دعم واتساب مخصص 24/7'],
  },
];

export function CardPricesModal({ onClose, onSendToChat }: CardPricesModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('monthly');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendCardToChat = (tier: PriceTier) => {
    const cardText = `💳 *باقة ${tier.title}*\n⏱ المدة: ${tier.duration}\n💰 السعر: ${tier.price} ${tier.currency}\n\n✨ المميزات:\n${tier.features.map(f => `• ${f}`).join('\n')}\n\n📲 للطلب المباشر تواصل عبر واتساب: +966510349663`;
    if (onSendToChat) {
      onSendToChat(cardText);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-slate-900 via-[#13172e] to-slate-950 border border-amber-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_30px_rgba(245,197,24,0.15)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="relative flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">أسعار بطاقات الاشتراك</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  سرعة إنجاز
                </span>
              </div>
              <p className="text-xs text-slate-300">باقات متكاملة لخدمات النشر، المراقبة والخدمات الأكاديمية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Price Cards */}
          <div className="space-y-3.5">
            {TIERS.map(tier => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm">
                      {tier.badge}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border bg-gradient-to-br ${tier.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{tier.title}</h4>
                        <p className="text-[11px] text-slate-400">{tier.duration}</p>
                      </div>
                    </div>

                    <div className="text-left pl-1">
                      <div className="text-2xl font-black text-amber-400 leading-none">
                        {tier.price}{' '}
                        <span className="text-[10px] font-normal text-slate-400">{tier.currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions for this tier */}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleSendCardToChat(tier);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        إرسال للمحادثة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleCopy(`باقة ${tier.title} - ${tier.price} ريال سعودي (${tier.duration})`, tier.id);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1 transition-colors"
                    >
                      {copiedId === tier.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          تم النسخ
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          نسخ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exclusive VIP Card Banner */}
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-emerald-950 border border-amber-500/30 text-white shadow-lg">
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">بطاقة سرعة إنجاز الأكاديمية</h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-slate-950">
                    VIP حصري
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  خدمات طلابية وأكاديمية متكاملة، تنسيق بحوث ورسائل علمية ودعم 24/7.
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Order Button */}
          <a
            href="https://wa.me/966510349663?text=السلام+عليكم%2C+أرغب+في+الاشتراك+ببطاقة+سرعة+إنجاز"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
          >
            <PhoneCall className="w-4 h-4" />
            <span>اطلب بطاقتك الآن عبر واتساب</span>
            <span className="font-mono text-xs opacity-90 dir-ltr mr-1">+966 51 034 9663</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80 mr-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
