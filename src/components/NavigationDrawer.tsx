import React, { useState } from 'react';
import {
  User,
  Users,
  Megaphone,
  Folder,
  Bookmark,
  Phone,
  Settings,
  PlusCircle,
  FolderKanban,
  Palette,
  Paintbrush,
  HelpCircle,
  ListOrdered,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Check,
  X,
  Sparkles,
  Download,
  Radio,
  Zap,
  Send,
  Star,
  Lock,
  Eye,
  Layers,
  MessageSquare,
  Brain,
  Search,
  ExternalLink,
  ShieldCheck,
  LogOut,
  FileText,
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type DrawerAccount = {
  id: string;
  name: string;
  phone: string;
  username?: string;
  color?: string;
  role?: string;
  status?: 'connected' | 'ready' | 'offline';
  lastActive?: string;
  avatar?: string;
};

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    phone?: string;
    username?: string;
    avatar?: string;
  } | null;
  accounts?: DrawerAccount[];
  activeAccountId?: string;
  onSwitchAccount?: (accId: string) => Promise<void> | void;
  onAddAccount?: () => void;
  onManageAccounts?: () => void;
  onDeleteAccount?: (accId: string) => Promise<void> | void;
  onOpenService: (serviceId: string) => void;
  onOpenSettings: (subpage?: string) => void;
  onOpenProfile: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  onNewSecretChat?: () => void;
  onSavedMessages?: () => void;
  onLogout?: () => void;
  onOpenInstall?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  user,
  accounts = [],
  activeAccountId = '',
  onSwitchAccount,
  onAddAccount,
  onManageAccounts,
  onDeleteAccount,
  onOpenService,
  onOpenSettings,
  onOpenProfile,
  onToggleTheme,
  theme,
  onNewSecretChat,
  onSavedMessages,
  onLogout,
  onOpenInstall,
}) => {
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = (cb: () => void) => {
    onClose();
    setTimeout(() => {
      cb();
    }, 150);
  };

  const handleQuickSwitch = async (accId: string, accName: string) => {
    if (accId === activeAccountId || switchingId) return;
    setSwitchingId(accId);
    try {
      if (onSwitchAccount) {
        await onSwitchAccount(accId);
      }
      setFeedback(`تم التبديل إلى: ${accName}`);
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('تعذر التبديل بين الحسابات');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, accId: string) => {
    e.stopPropagation();
    if (confirmDeleteId !== accId) {
      setConfirmDeleteId(accId);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    setConfirmDeleteId(null);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount(accId);
      }
      setFeedback('تم إلغاء ربط الحساب');
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('تعذر حذف الحساب');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex select-none font-sans" dir="rtl">
          {/* Backdrop with smooth blur and fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Sheet with Native Spring Motion */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 350,
              mass: 0.8,
            }}
            className="relative w-80 max-w-[85vw] h-full flex flex-col bg-[#17212b] text-white shadow-2xl z-10 overflow-hidden border-l border-white/10"
          >
            {/* Header: User Profile Info with Rich Background & Multi-Account Switcher */}
            <div className="relative pt-5 pb-3 px-4 bg-gradient-to-b from-[#2481cc]/35 via-[#1e3448]/45 to-[#17212b] border-b border-white/10">
              {/* Feedback toast if switching/removing */}
              {feedback && (
                <div className="mb-2 px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-medium flex items-center justify-between animate-fadeIn">
                  <span>{feedback}</span>
                  <button type="button" onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                {/* User Avatar */}
                <div className="relative">
                  <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#377c79] to-[#2481cc] flex items-center justify-center text-white text-xl font-black shadow-lg ring-2 ring-white/20">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{user?.name ? user.name.slice(0, 1) : 'T'}</span>
                    )}
                  </div>
                  <span className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#17212b]" title="متصل الآن عبر MTProto" />
                </div>

                {/* Top Quick Actions: Night/Day Toggle & Close */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {theme === 'dark' ? <Sun size={15} className="text-amber-300" /> : <Moon size={15} className="text-sky-300" />}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    title="إغلاق القائمة"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Quick Horizontal Account Avatars Row for Instant 1-Tap Toggling */}
              {accounts && accounts.length > 0 && (
                <div className="mb-3 pt-1 pb-1">
                  <div className="text-[10px] font-semibold text-white/60 mb-1.5 flex items-center justify-between">
                    <span>التبديل الفوري بين الحسابات:</span>
                    <span className="text-sky-300 font-mono">{accounts.length} حسابات</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {accounts.map((acc) => {
                      const isActive = acc.id === activeAccountId;
                      const isSwitching = switchingId === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleQuickSwitch(acc.id, acc.name)}
                          disabled={isSwitching}
                          title={`${acc.name} (${acc.phone || ''})`}
                          className={`relative group shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#17212b] scale-105 shadow-md shadow-sky-500/20'
                              : 'opacity-70 hover:opacity-100 hover:scale-105 border border-white/20'
                          }`}
                          style={{ backgroundColor: acc.color || '#0088cc' }}
                        >
                          {isSwitching ? (
                            <RefreshCw size={14} className="animate-spin text-white" />
                          ) : (
                            <span className="text-xs font-bold text-white uppercase">{acc.name.charAt(0)}</span>
                          )}

                          {isActive && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-[#17212b] flex items-center justify-center text-white text-[9px]">
                              <Check size={9} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Quick Add Account avatar bubble */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onAddAccount) {
                          onClose();
                          onAddAccount();
                        } else {
                          handleAction(() => onOpenService('accounts'));
                        }
                      }}
                      title="ربط حساب تيليجرام إضافي"
                      className="shrink-0 w-9 h-9 rounded-full border border-dashed border-sky-400/70 hover:border-sky-300 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* User Identity Details & Multi-Account Dropdown Toggle */}
              <div
                onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                className="flex items-center justify-between cursor-pointer group pt-1 select-none rounded-xl p-1.5 -mx-1.5 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-white truncate">
                    <span className="truncate">{user?.name || 'حساب تيليجرام'}</span>
                    {user?.username && (
                      <span className="text-[10px] bg-sky-500/20 border border-sky-400/30 px-1.5 py-0.5 rounded-full font-mono text-sky-200">
                        {user.username}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {user?.phone && (
                      <span className="text-xs text-white/70 font-mono" dir="ltr">
                        {user.phone}
                      </span>
                    )}
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                      MTProto Live
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-white/80 group-hover:text-white transition-colors">
                  <span className="text-[11px] font-medium text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full">
                    {accounts.length > 0 ? `${accounts.length} حسابات` : 'الحساب'}
                  </span>
                  <div className="p-1 rounded-full group-hover:bg-white/10 transition-colors">
                    {isAccountsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Multi-Account Drawer Dropdown with Full Management */}
            <AnimatePresence>
              {isAccountsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="bg-[#0e1621] border-b border-white/10 py-2 px-3 max-h-72 overflow-y-auto space-y-1.5 scrollbar-thin"
                >
                  <div className="flex items-center justify-between px-1 pt-1 pb-1 text-[11px] font-bold text-gray-400">
                    <div className="flex items-center gap-1 text-sky-300">
                      <ArrowRightLeft size={13} />
                      <span>جلسات تيليجرام النشطة</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(() => onOpenService('accounts'))}
                      className="text-[10px] text-sky-400 hover:underline"
                    >
                      إدارة متقدمة
                    </button>
                  </div>

                  {accounts.length === 0 ? (
                    <div className="text-center py-3 px-3 text-xs text-gray-400 bg-white/5 rounded-xl">
                      لا توجد حسابات إضافية متصلة حالياً
                    </div>
                  ) : (
                    accounts.map((acc) => {
                      const isActive = acc.id === activeAccountId;
                      const isSwitching = switchingId === acc.id;
                      const isConfirming = confirmDeleteId === acc.id;

                      return (
                        <div
                          key={acc.id}
                          onClick={() => handleQuickSwitch(acc.id, acc.name)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-[#2481cc]/20 text-white border-[#2481cc]/50 shadow-sm'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 text-right">
                            {/* Avatar bubble */}
                            <div
                              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner"
                              style={{ backgroundColor: acc.color || '#0088cc' }}
                            >
                              {acc.name.charAt(0)}
                              {isActive && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-[#0e1621] flex items-center justify-center text-white text-[8px]">
                                  <Check size={8} strokeWidth={3} />
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate text-white">{acc.name}</span>
                                {acc.username && (
                                  <span className="text-[10px] text-sky-300 font-mono">
                                    {acc.username}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono truncate" dir="ltr">
                                  {acc.phone}
                                </span>
                                {isActive ? (
                                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">
                                    الحساب الحالي
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.2 rounded">
                                    انقر للتبديل
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action state */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            {isSwitching ? (
                              <div className="flex items-center gap-1 text-[10px] text-sky-300">
                                <RefreshCw size={13} className="animate-spin text-sky-400" />
                                <span>جارٍ التبديل</span>
                              </div>
                            ) : isActive ? (
                              <span className="text-emerald-400 bg-emerald-500/20 p-1.5 rounded-lg" title="الحساب النشط الآن">
                                <Check size={14} />
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickSwitch(acc.id, acc.name)}
                                  title="تبديل إلى هذا الحساب"
                                  className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <ArrowRightLeft size={11} />
                                  <span>تبديل</span>
                                </button>
                                {accounts.length > 1 && onDeleteAccount && (
                                  <button
                                    type="button"
                                    onClick={e => handleDelete(e, acc.id)}
                                    title={isConfirming ? 'انقر مرة أخرى لتأكيد إلغاء الربط' : 'إلغاء ربط هذا الحساب'}
                                    className={`p-1.5 rounded-lg transition-colors text-xs ${
                                      isConfirming
                                        ? 'bg-rose-500/30 text-rose-300 font-bold px-2'
                                        : 'text-gray-400 hover:text-rose-400 hover:bg-rose-500/10'
                                    }`}
                                  >
                                    {isConfirming ? 'تأكيد؟' : <Trash2 size={13} />}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add New Telegram Account Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onAddAccount) {
                        onClose();
                        onAddAccount();
                      } else {
                        handleAction(() => onOpenService('accounts'));
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-1 rounded-xl text-xs font-bold text-white bg-sky-600/30 hover:bg-sky-600/45 border border-sky-500/40 transition-colors shadow-sm"
                  >
                    <UserPlus size={14} className="text-sky-300" />
                    <span>+ ربط حساب تيليجرام إضافي (تسجيل دخول)</span>
                  </button>

                  {/* Comprehensive Accounts Manager shortcut */}
                  <button
                    type="button"
                    onClick={() => handleAction(() => onOpenService('accounts'))}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span>مركز إدارة وتأمين الحسابات</span>
                    <ExternalLink size={11} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Items List */}
            <div className="flex-1 overflow-y-auto py-2 divide-y divide-white/5 scrollbar-thin">
              {/* Group 1: Core Telegram Navigation */}
              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleAction(onOpenProfile)}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <User size={18} className="text-gray-400 shrink-0" />
                  <span>الملف الشخصي</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('premium'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-purple-300 hover:bg-purple-500/10 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Star size={18} className="text-amber-400 fill-amber-400/30 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">Telegram Premium</span>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-xs">
                    STAR & 4GB
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onNewSecretChat?.())}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition-all text-right"
                >
                  <div className="flex items-center gap-3.5">
                    <Lock size={18} className="text-emerald-400 shrink-0" />
                    <span>محادثة سرية جديدة</span>
                  </div>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 rounded">
                    E2EE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('contacts'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Users size={18} className="text-gray-400 shrink-0" />
                  <span>جهات الاتصال</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('services_center'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-sky-300 hover:bg-sky-500/10 transition-all text-right"
                >
                  <div className="flex items-center gap-3.5">
                    <Sparkles size={18} className="text-sky-400 shrink-0" />
                    <span>تطبيقات وخدمات مصغرة (Mini Apps)</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/20 text-sky-300 rounded-full">
                    NEW
                  </span>
                </button>
              </div>

              {/* Group 2: Automation & Smart Tools Suite (حزمة الأدوات والوظائف الذكية) */}
              <div className="py-2 space-y-0.5 bg-sky-950/20 border-y border-sky-500/15">
                <div className="px-4 pt-1 pb-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center justify-between">
                  <span>⚡ الأدوات والوظائف الذكية</span>
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">PRO</span>
                </div>

                {/* 1. الإرسال والمراقبة */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('publishing_monitoring'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-sky-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Send size={18} className="text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">الإرسال والمراقبة</span>
                      <span className="text-[10px] text-gray-400">نشر دوري ورصد فوري للكلمات</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/30 rounded font-mono">
                    TLRPC
                  </span>
                </button>

                {/* 2. رسائلي (سجل الدفعات) */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('batch_messages'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-amber-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Layers size={18} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">رسائلي (سجل الدفعات)</span>
                      <span className="text-[10px] text-gray-400">إدارة الرسائل المرسلة والمجدولة</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/30 rounded font-mono">
                    BATCH
                  </span>
                </button>

                {/* 3. الردود التلقائية */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('autoreplies'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-purple-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <MessageSquare size={18} className="text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">الردود التلقائية</span>
                      <span className="text-[10px] text-gray-400">قواعد رد ذكية مع فلترة فورية</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/30 rounded font-mono">
                    AUTO
                  </span>
                </button>

                {/* 4. الانضمام الذكي بالقوائم والروابط */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('join'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-rose-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Zap size={18} className="text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">الانضمام الذكي بالقوائم</span>
                      <span className="text-[10px] text-gray-400">سحب وانضمام تلقائي وسريع</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/25 text-rose-200 border border-rose-400/30 rounded font-mono">
                    JOIN
                  </span>
                </button>

                {/* 5. نظام التعلم الذكي للرسائل */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('learning'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-blue-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Brain size={18} className="text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">نظام التعلم الذكي للرسائل</span>
                      <span className="text-[10px] text-gray-400">تحليل وتوليد بالذكاء الاصطناعي</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/25 text-blue-200 border border-blue-400/30 rounded font-mono">
                    AI
                  </span>
                </button>

                {/* 6. النشر الدوري المجدول */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('rotating'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-emerald-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Radio size={18} className="text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">النشر الدوري المجدول</span>
                      <span className="text-[10px] text-gray-400">جدولة فترات ودفعات النشر</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 rounded font-mono">
                    ROTATE
                  </span>
                </button>

                {/* 7. الروابط والمجموعات المحفوظة */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('saved_links'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-cyan-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <Search size={18} className="text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">الروابط والمجموعات المحفوظة</span>
                      <span className="text-[10px] text-gray-400">استعراض وبحث الروابط المخزنة</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-500/25 text-cyan-200 border border-cyan-400/30 rounded font-mono">
                    LINKS
                  </span>
                </button>

                {/* 8. قوالب الرسائل الجاهزة */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('templates'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-100 hover:bg-amber-500/15 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <FileText size={18} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-white">قوالب الرسائل الجاهزة</span>
                      <span className="text-[10px] text-gray-400">حفظ نصوص متكررة واستخدامها فوراً</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/30 rounded font-mono">
                    TEMPLATES
                  </span>
                </button>
              </div>

              {/* Group 3: Core Chat Folders & Calls */}
              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('folders'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Folder size={18} className="text-gray-400 shrink-0" />
                  <span>مجلدات المحادثات</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onSavedMessages?.())}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Bookmark size={18} className="text-gray-400 shrink-0" />
                  <span>الرسائل المحفوظة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('calls'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Phone size={18} className="text-gray-400 shrink-0" />
                  <span>المكالمات الصوتية</span>
                </button>

                {/* Direct Install & PWA Mobile App Suite */}
                <button
                  type="button"
                  onClick={() => handleAction(() => (onOpenInstall ? onOpenInstall() : onOpenService('install')))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition-all text-right"
                >
                  <div className="flex items-center gap-3.5">
                    <Download size={18} className="text-emerald-400 shrink-0" />
                    <span>تثبيت التطبيق على الجوال</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    PWA
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('main'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Settings size={18} className="text-gray-400 shrink-0" />
                  <span>الإعدادات</span>
                </button>
              </div>

              {/* Group 4: Plus Settings & Themes (إعدادات بلاس والتخصيص) */}
              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('plus_settings'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <PlusCircle size={18} className="text-[#5288c1] shrink-0" />
                  <span>إعدادات بلاس</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('folders'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <FolderKanban size={18} className="text-gray-400 shrink-0" />
                  <span>التصنيفات</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('themes_browser'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Palette size={18} className="text-gray-400 shrink-0" />
                  <span>تنزيل أنماط</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('theme_coloring'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <Paintbrush size={18} className="text-gray-400 shrink-0" />
                  <span>تلوين النمط</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenService('support'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <HelpCircle size={18} className="text-gray-400 shrink-0" />
                  <span>مجموعة الدعم والمساعدة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(() => onOpenSettings('chat_settings'))}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-all text-right"
                >
                  <ListOrdered size={18} className="text-gray-400 shrink-0" />
                  <span>عدادات المحادثات</span>
                </button>

                {/* Logout Option */}
                <button
                  type="button"
                  onClick={() => handleAction(() => onLogout?.())}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-all text-right cursor-pointer"
                >
                  <LogOut size={18} className="text-rose-400 shrink-0" />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              </div>

              {/* Footer: Exact Telegram_anwer saif (DrKLO Official Build) & Developer Information */}
              <div className="py-3.5 px-4 text-xs text-gray-400 space-y-2 border-t border-white/10 mt-1 bg-black/25">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <svg className="w-4.5 h-4.5 text-white -translate-x-0.5 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[12px] text-white tracking-tight leading-tight">
                      Telegram_anwer saif (DrKLO Official Build)
                    </div>
                    <div className="text-[10.5px] text-sky-400 font-mono font-semibold mt-0.5">
                      v12.9.2.0 (2246) universal arm64-v8a
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-gray-400 font-semibold">المطور:</span>
                    <span className="text-white font-medium">انور فواد محمد علي سيف</span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[10.5px]">
                    <span className="flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      بوابة تيليجرام MTProto:
                    </span>
                    <span className="font-mono font-bold text-sky-200">ID: 22043994</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <span className="text-[10px] text-emerald-300 font-semibold">رقم التواصل المباشر:</span>
                    <a
                      href="tel:+966510349663"
                      className="text-[11px] font-mono font-bold hover:underline text-emerald-300"
                      dir="ltr"
                    >
                      +966 51 034 9663
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] font-mono text-gray-400 pt-0.5" dir="ltr">
                    <a href="tel:+966562570935" className="hover:text-sky-300">
                      +966 562 570 935
                    </a>
                    <a href="tel:+967772997043" className="hover:text-sky-300">
                      +967 772 997 043
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
