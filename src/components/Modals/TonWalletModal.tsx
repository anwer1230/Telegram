import React, { useState } from 'react';
import {
  X,
  Wallet,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export interface TonWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TonWalletModal: React.FC<TonWalletModalProps> = ({ isOpen, onClose }) => {
  const { settings, showToast, currentUser } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [activeTab, setActiveTab] = useState<'wallet' | 'stars'>('wallet');
  const [copied, setCopied] = useState(false);
  const [tonAddress] = useState('EQBvW8Z5huBkMJYdn30dcYfQ_cGJ6PHkR0Usn_ton_official');
  const [tonBalance, setTonBalance] = useState('24.50');
  const [starsBalance, setStarsBalance] = useState('450');
  const [sendAmount, setSendAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tonAddress);
    setCopied(true);
    showToast(isArabic ? 'تم نسخ عنوان المحفظة' : 'Wallet address copied', '📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!sendAmount || Number(sendAmount) <= 0 || !recipient.trim()) {
      showToast(isArabic ? 'يرجى إدخال المبلغ وعنوان المستلم' : 'Please enter amount and address', '⚠️');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setTonBalance((prev) => (Number(prev) - Number(sendAmount)).toFixed(2));
      showToast(
        isArabic
          ? `تم إرسال ${sendAmount} TON بنجاح عبر شبكة TON 💎`
          : `Sent ${sendAmount} TON successfully via TON network 💎`,
        '✅'
      );
      setSendAmount('');
      setRecipient('');
    }, 1200);
  };

  const handleBuyStars = (amount: number, price: string) => {
    setStarsBalance((prev) => String(Number(prev) + amount));
    showToast(
      isArabic
        ? `تم شحن ${amount} ⭐ بنجاح بحسابك!`
        : `Purchased ${amount} ⭐ stars successfully!`,
      '⭐'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#17212b] border border-[#2b394a] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isArabic ? 'محفظة TON ونجوم تيليجرام' : 'Telegram Wallet & Stars'}
              </h3>
              <span className="text-[10px] text-gray-400">The Open Network (TON Web3)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 bg-black/20 p-1 m-3 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'wallet'
                ? 'bg-[#2481cc] text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{isArabic ? 'محفظة TON' : 'TON Wallet'}</span>
          </button>
          <button
            onClick={() => setActiveTab('stars')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'stars'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{isArabic ? 'نجوم تيليجرام (Stars)' : 'Stars'}</span>
          </button>
        </div>

        {/* Tab 1: TON Wallet */}
        {activeTab === 'wallet' && (
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Balance Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#0088cc]/30 via-[#0098ea]/15 to-[#8A2BE2]/20 border border-sky-500/30 text-center relative overflow-hidden">
              <span className="text-xs text-sky-300 font-medium">
                {isArabic ? 'الرصيد الكلي المتاح' : 'Total Balance'}
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight flex items-center justify-center gap-2">
                <span>{tonBalance}</span>
                <span className="text-sky-400 text-xl font-sans">TON</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1 font-mono">
                ≈ ${(Number(tonBalance) * 5.42).toFixed(2)} USD
              </div>
            </div>

            {/* Address */}
            <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>{isArabic ? 'عنوان محفظتك (TON Address)' : 'Your TON Address'}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-gray-300 break-all select-all py-1">
                {tonAddress}
              </div>
            </div>

            {/* Send TON */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-gray-200">
                {isArabic ? 'إرسال TON سريعاً' : 'Quick Send TON'}
              </span>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={isArabic ? 'عنوان المحفظة أو معرف @username' : 'TON address or @username'}
                className="w-full px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs text-white focus:outline-none focus:border-[#2481cc]"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder={isArabic ? 'المبلغ بالـ TON' : 'Amount in TON'}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs text-white focus:outline-none focus:border-[#2481cc]"
                />
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-[#2481cc] hover:bg-[#1c6fad] text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  <span>{isArabic ? 'إرسال' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Telegram Stars */}
        {activeTab === 'stars' && (
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Stars Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/10 to-orange-500/20 border border-amber-500/30 text-center">
              <span className="text-xs text-amber-300 font-medium">
                {isArabic ? 'رصيد نجوم تيليجرام' : 'Telegram Stars Balance'}
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight flex items-center justify-center gap-2">
                <Star className="w-7 h-7 text-amber-400 fill-amber-400 animate-pulse" />
                <span>{starsBalance}</span>
                <span className="text-amber-300 text-lg">Stars</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 max-w-xs mx-auto">
                {isArabic
                  ? 'تُستخدم لشراء السلع الرقمية، اشتراكات القنوات، الألعاب، والتطبيقات المصغرة (Mini Apps).'
                  : 'Used for digital goods, channel subscriptions, games, and Mini Apps.'}
              </p>
            </div>

            {/* Buy Stars Packages */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-200">
                {isArabic ? 'شراء باقات النجوم (Telegram Official Stars)' : 'Purchase Stars Packages'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { stars: 50, price: '$0.99' },
                  { stars: 150, price: '$2.99' },
                  { stars: 500, price: '$9.99' },
                  { stars: 1000, price: '$18.99' },
                ].map((pkg) => (
                  <button
                    key={pkg.stars}
                    onClick={() => handleBuyStars(pkg.stars, pkg.price)}
                    className="p-3 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/30 flex items-center justify-between text-left rtl:text-right transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-white">{pkg.stars}</span>
                    </div>
                    <span className="font-mono text-amber-300 font-semibold">{pkg.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isArabic ? 'تشفير E2EE ومعاملات غير مركزية' : 'Decentralized & Encrypted'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg hover:bg-white/10 text-white font-semibold transition-colors"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
