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
  Camera,
  X,
  Sparkles,
  Smartphone,
  Download,
  Radio,
  Zap,
  Send,
  Star,
  Lock,
  Eye,
  Layers,
  MessageSquare,
  BrainCircuit,
  RotateCw,
  Bot,
  Search,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTelegram } from '../../context/TelegramContext';
import { PWAInstallButton } from '../Common/PWAInstallButton';

export const NavigationDrawer: React.FC = () => {
  const {
    currentUser,
    isDrawerOpen,
    setIsDrawerOpen,
    setActiveChatId,
    activeChatId,
    activeModal,
    setActiveModal,
    settings,
    updateSettings,
    accounts,
    activeAccountId,
    switchAccount,
    settingsSubPage,
    openSettingsPage,
    showToast,
    capturedLinks,
    autoJoinLinksEnabled,
  } = useTelegram();

  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);

  const isArabic = settings.language === 'ar';

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
    showToast(nextTheme === 'dark' ? 'الوضع الليلي مفعّل' : 'الوضع النهاري مفعّل', '🌓');
  };

  const handleItemClick = (action: () => void) => {
    setIsDrawerOpen(false);
    // Slight tick to allow drawer closing physics while triggering the modal
    action();
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex select-none font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
          {/* Backdrop with smooth fade */}
          <motion.div
            id="tg-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Sheet with Native Spring Slide-in and Swipe Gesture */}
          <motion.div
            id="tg-drawer-content"
            initial={{ x: isArabic ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isArabic ? '100%' : '-100%' }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 350,
              mass: 0.8,
            }}
            drag="x"
            dragConstraints={isArabic ? { left: 0, right: 300 } : { left: -300, right: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (isArabic) {
                if (info.offset.x > 80 || info.velocity.x > 400) {
                  setIsDrawerOpen(false);
                }
              } else {
                if (info.offset.x < -80 || info.velocity.x < -400) {
                  setIsDrawerOpen(false);
                }
              }
            }}
            className="relative w-80 max-w-[85vw] h-full flex flex-col shadow-2xl z-10 overflow-hidden"
            style={{
              backgroundColor: 'var(--tg-theme-surface, #17212b)',
              color: 'var(--tg-theme-bubble-in-text, #ffffff)',
            }}
          >
            {/* User Profile Header (Telegram Android Style with Purple-to-Pink Brand Gradient) */}
            <div className="p-4 bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] text-white flex flex-col justify-between min-h-[148px] shadow-sm relative shrink-0">
              {/* Header Action Buttons */}
              <div className="flex items-center justify-between">
                {/* User Avatar */}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/40 shadow-inner cursor-pointer group"
                  onClick={() => handleItemClick(() => openSettingsPage('account'))}
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-lg">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  {currentUser.isPremium && (
                    <div className="absolute bottom-0 right-0 bg-amber-400 text-black p-0.5 rounded-full" title="Telegram Premium">
                      <Sparkles className="w-3 h-3 fill-black" />
                    </div>
                  )}
                </motion.div>

                {/* Quick Action Buttons (Moon, Saved, Close) */}
                <div className="flex items-center gap-1.5 text-white/90">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    id="btn-drawer-night-mode"
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-white/15 transition-colors"
                    title={isArabic ? 'الوضع الليلي' : 'Night Mode'}
                  >
                    {settings.theme === 'dark' || settings.theme === 'night' ? (
                      <Sun className="w-5 h-5 text-amber-300" />
                    ) : (
                      <Moon className="w-5 h-5 text-white" />
                    )}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    id="btn-drawer-quick-saved"
                    onClick={() => handleItemClick(() => setActiveChatId('chat_saved_messages'))}
                    className="p-2 rounded-full hover:bg-white/15 transition-colors"
                    title={isArabic ? 'الرسائل المحفوظة' : 'Saved Messages'}
                  >
                    <Bookmark className="w-5 h-5 text-white" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    id="tg-drawer-close"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 rounded-full hover:bg-white/15 text-white/80"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* User Name, Phone & Account Switcher Accordion Trigger */}
              <div
                className="cursor-pointer mt-2 pt-1 flex items-center justify-between"
                onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px] leading-snug flex items-center gap-1.5 truncate">
                    <span className="truncate">{currentUser.name}</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-medium">
                      {currentUser.username ? `@${currentUser.username}` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-white/80 font-mono mt-0.5">{currentUser.phone}</div>
                </div>

                <div
                  id="btn-toggle-accounts-drawer"
                  className="p-1 rounded-full text-white/90 hover:bg-white/15 transition-colors"
                >
                  {isAccountsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* Multi-Account Drawer Dropdown with AnimatePresence */}
            <AnimatePresence>
              {isAccountsExpanded && (
                <motion.div
                  id="multi-account-drawer-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#17212b] border-b border-[#2b394a] py-2 px-2 max-h-56 overflow-y-auto shadow-inner space-y-1"
                >
                  {accounts.map((acc) => {
                    const isActive = acc.id === activeAccountId;
                    return (
                      <motion.button
                        key={acc.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          switchAccount(acc.id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                          isActive ? 'bg-[#2481cc]/25 text-white' : 'hover:bg-white/5 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 text-left rtl:text-right">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
                            {acc.user.avatar ? (
                              <img src={acc.user.avatar} alt={acc.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-[10px]">
                                {acc.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {isActive && (
                              <div className="absolute inset-0 bg-[#2481cc]/50 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate flex items-center gap-1">
                              <span className="truncate">{acc.user.name}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono truncate">{acc.user.phone}</div>
                          </div>
                        </div>

                        {(acc.unreadCount || 0) > 0 && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-[#5288c1] text-white rounded-full ml-2 rtl:mr-2">
                            {acc.unreadCount}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}

                  {/* Add Account Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    id="btn-drawer-add-account"
                    onClick={() => handleItemClick(() => setActiveModal('add-account'))}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-xs font-semibold text-[#5288c1] hover:bg-[#5288c1]/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full border border-dashed border-[#5288c1] flex items-center justify-center">
                      <UserPlus className="w-3.5 h-3.5 text-[#5288c1]" />
                    </div>
                    <span>{isArabic ? '+ إضافة حساب' : '+ Add Account'}</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Items List - EXACT DRKLO TELEGRAM + PLUS MESSENGER ORDER */}
            <div className="flex-1 overflow-y-auto py-2 divide-y divide-white/5 scrollbar-thin">
              {/* Main Group 1: Core Navigation */}
              <div className="py-1 space-y-0.5">
                {/* My Profile */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'account';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-my-profile"
                      onClick={() => handleItemClick(() => openSettingsPage('account'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <User className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'الملف الشخصي' : 'My Profile'}</span>
                    </motion.button>
                  );
                })()}

                {/* Telegram Premium Star Option */}
                {(() => {
                  const isActive = activeModal === ('premium' as any);
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-telegram-premium"
                      onClick={() => handleItemClick(() => setActiveModal('premium' as any))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-purple-500/20 text-purple-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-purple-500'
                          : 'hover:bg-purple-500/10 text-purple-400 hover:text-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400/30 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">{isArabic ? 'Telegram Premium' : 'Telegram Premium'}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-sm">
                        4GB & STAR
                      </span>
                    </motion.button>
                  );
                })()}

                {/* New Secret Chat (E2EE) */}
                {(() => {
                  const isActive = activeChatId === 'chat_secret_alex';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-new-secret-chat"
                      onClick={() => handleItemClick(() => setActiveChatId('chat_secret_alex'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-emerald-500/20 text-emerald-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-emerald-500'
                          : 'hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Lock className="w-5 h-5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold">{isArabic ? 'محادثة سرية جديدة' : 'New Secret Chat'}</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full font-mono">
                        E2EE
                      </span>
                    </motion.button>
                  );
                })()}

                {/* New Group */}
                {(() => {
                  const isActive = activeModal === 'new-chat';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-new-group"
                      onClick={() => handleItemClick(() => setActiveModal('new-chat'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Users className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'مجموعة جديدة' : 'New Group'}</span>
                    </motion.button>
                  );
                })()}

                {/* New Channel */}
                {(() => {
                  const isActive = activeModal === 'new-chat';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-new-channel"
                      onClick={() => handleItemClick(() => setActiveModal('new-chat'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Megaphone className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'قناة جديدة' : 'New Channel'}</span>
                    </motion.button>
                  );
                })()}

                {/* Contacts */}
                {(() => {
                  const isActive = activeModal === 'contacts';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-contacts"
                      onClick={() => handleItemClick(() => setActiveModal('contacts'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <User className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'جهات الاتصال' : 'Contacts'}</span>
                    </motion.button>
                  );
                })()}




                {/* Telegram Mini Apps (TMA) */}
                {(() => {
                  const isActive = activeModal === 'mini-apps';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-mini-apps"
                      onClick={() => handleItemClick(() => setActiveModal('mini-apps'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-[#2481cc]/10 text-sky-400 hover:text-sky-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
                        <span>{isArabic ? 'تطبيقات وألعاب (Mini Apps)' : 'Mini Apps & Games'}</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/20 text-sky-300 rounded-full">
                        NEW
                      </span>
                    </motion.button>
                  );
                })()}
              </div>

              {/* Automation & Smart Tools Suite (4 Main Functions Requested) */}
              <div className="py-1.5 space-y-0.5 bg-sky-950/20 border-y border-sky-500/15">
                <div className="px-4 pt-1 pb-0.5 text-[11px] font-bold text-sky-400/80 uppercase tracking-wider flex items-center justify-between">
                  <span>{isArabic ? '⚡ الأدوات والوظائف الذكية' : '⚡ Automation & Smart Suite'}</span>
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">PRO</span>
                </div>

                {/* 1. الإرسال والمراقبة */}
                {(() => {
                  const isActive = activeModal === 'sender';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-send-monitor"
                      onClick={() => handleItemClick(() => setActiveModal('sender'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-sky-500/20 text-sky-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-sky-400'
                          : 'hover:bg-sky-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Send className={`w-5 h-5 shrink-0 ${isActive ? 'text-sky-300' : 'text-sky-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'الإرسال والمراقبة' : 'Send & Monitor'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'نشر دوري ورصد فوري للكلمات' : 'Broadcast & keyword monitor'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/30 rounded font-mono">
                        TLRPC
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 1.1 سجل نشاط السلام */}
                {(() => {
                  const isActive = activeModal === 'salam-activity-log';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-salam-activity-log"
                      onClick={() => handleItemClick(() => setActiveModal('salam-activity-log'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-emerald-500/20 text-emerald-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-emerald-400'
                          : 'hover:bg-emerald-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Radio className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-300' : 'text-emerald-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'سجل نشاط السلام' : 'Salam Activity Log'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'رصد فوري لشفافية وضع السلام (تعديل/حذف)' : 'Real-time Salam mode status'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 rounded font-mono">
                        LIVE
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 1.2 سجل بيانات القياس والتشخيص (Telemetry) */}
                {(() => {
                  const isActive = activeModal === 'telemetry-log';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-telemetry-log"
                      onClick={() => handleItemClick(() => setActiveModal('telemetry-log'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-cyan-500/20 text-cyan-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-cyan-400'
                          : 'hover:bg-cyan-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Activity className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-cyan-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'سجل بيانات القياس (Telemetry)' : 'Telemetry & Diagnostics'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'تشخيص أسباب تأخر المزامنة وقياس Latency' : 'Diagnose sync issues & latency'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-500/25 text-cyan-200 border border-cyan-400/30 rounded font-mono">
                        DIAG
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 2. رسائلي */}
                {(() => {
                  const isActive = activeModal === 'my-messages';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-my-messages"
                      onClick={() => handleItemClick(() => setActiveModal('my-messages'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-amber-500/20 text-amber-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-amber-400'
                          : 'hover:bg-amber-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Layers className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'رسائلي (سجل الدفعات)' : 'My Messages (Batches)'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'إدارة الرسائل المرسلة والمجدولة' : 'Manage sent & queued batches'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/30 rounded font-mono">
                        BATCH
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 3. الردود التلقائية */}
                {(() => {
                  const isActive = activeModal === 'auto-responder';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-auto-responder"
                      onClick={() => handleItemClick(() => setActiveModal('auto-responder'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-purple-500/20 text-purple-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-purple-400'
                          : 'hover:bg-purple-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <MessageSquare className={`w-5 h-5 shrink-0 ${isActive ? 'text-purple-300' : 'text-purple-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'الردود التلقائية' : 'Auto Responder'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'قواعد رد ذكية مع فلترة فورية' : 'Smart reply rules & filters'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/30 rounded font-mono">
                        AUTO
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 4. الانضمام المتقدم */}
                {(() => {
                  const isActive = activeModal === 'auto-joiner';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-auto-joiner"
                      onClick={() => handleItemClick(() => setActiveModal('auto-joiner'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-emerald-500/20 text-emerald-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-emerald-400'
                          : 'hover:bg-emerald-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <UserPlus className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-300' : 'text-emerald-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'الانضمام المتقدم' : 'Advanced Auto-Joiner'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'استخراج روابط القنوات والجروبات' : 'Extract & join links queue'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 rounded font-mono">
                        REGEX
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 5. نظام التعلم الذكي للرسائل */}
                {(() => {
                  const isActive = activeModal === 'smart-ai';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-smart-ai"
                      onClick={() => handleItemClick(() => setActiveModal('smart-ai'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-fuchsia-500/20 text-fuchsia-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-fuchsia-400'
                          : 'hover:bg-fuchsia-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <BrainCircuit className={`w-5 h-5 shrink-0 ${isActive ? 'text-fuchsia-300' : 'text-fuchsia-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'نظام التعلم الذكي (AI Bot)' : 'Smart AI Learning Bot'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'تحليل وتدريب وردود ذكية متكيفة' : 'Self-learning responses & context'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/30 rounded font-mono">
                        GROQ
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 6. النشر الدوري المجدول (Rotator) */}
                {(() => {
                  const isActive = activeModal === 'scheduled-rotator';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-scheduled-rotator"
                      onClick={() => handleItemClick(() => setActiveModal('scheduled-rotator'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-amber-500/20 text-amber-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-amber-400'
                          : 'hover:bg-amber-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <RotateCw className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'النشر الدوري المجدول' : 'Scheduled Rotator'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'تدوير ونشر دوري متكرر بين القوالب' : 'Continuous rotating broadcast'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/30 rounded font-mono">
                        ROTATOR
                      </span>
                    </motion.button>
                  );
                })()}

                {/* 7. رادار ومراقبة الروابط */}
                {(() => {
                  const isActive = activeModal === 'link-monitor';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-link-monitor"
                      onClick={() => handleItemClick(() => setActiveModal('link-monitor'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'active bg-sky-500/20 text-sky-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-sky-400'
                          : 'hover:bg-sky-500/10 text-gray-100 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Radio className={`w-5 h-5 shrink-0 ${isActive ? 'text-sky-300' : 'text-sky-400'} group-hover:scale-110 transition-transform`} />
                        <div className="flex flex-col text-left rtl:text-right">
                          <span className="font-semibold">{isArabic ? 'رادار ومراقبة الروابط' : 'Link Monitor Radar'}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                            {isArabic ? 'التقاط فوري وروابط المجموعات والقنوات' : 'Real-time invite link sniffer & auto-join'}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/30 rounded font-mono">
                        RADAR
                      </span>
                    </motion.button>
                  );
                })()}
              </div>

              {/* Core Folders & Calls Group */}
              <div className="py-1 space-y-0.5">

                {/* Chat Folders */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'folders';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-folders"
                      onClick={() => handleItemClick(() => openSettingsPage('folders'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Folder className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'مجلدات المحادثات' : 'Chat Folders'}</span>
                    </motion.button>
                  );
                })()}

                {/* Saved Messages */}
                {(() => {
                  const isActive = activeChatId === 'chat_saved_messages';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-saved-messages"
                      onClick={() => handleItemClick(() => setActiveChatId('chat_saved_messages'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'الرسائل المحفوظة' : 'Saved Messages'}</span>
                    </motion.button>
                  );
                })()}

                {/* Calls */}
                {(() => {
                  const isActive = activeModal === 'call';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-calls"
                      onClick={() => handleItemClick(() => setActiveModal('call'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Phone className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'المكالمات' : 'Calls'}</span>
                    </motion.button>
                  );
                })()}

                {/* Direct Install & APK Suite (DrKLO Engine) */}
                {(() => {
                  const isActive = activeModal === 'apk-installer';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-apk-installer"
                      onClick={() => handleItemClick(() => setActiveModal('apk-installer'))}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-emerald-500/20 text-emerald-300 font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-emerald-500'
                          : 'hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Download className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>{isArabic ? 'تثبيت التطبيق على الجوال' : 'Install App on Phone'}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                        v12.9.2
                      </span>
                    </motion.button>
                  );
                })()}

                {/* In-App PWA Quick Install Banner */}
                <div className="px-4 py-1.5">
                  <PWAInstallButton isArabic={isArabic} className="w-full justify-center" />
                </div>

                {/* Settings */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'main';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-settings"
                      onClick={() => handleItemClick(() => openSettingsPage('main'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Settings className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'الإعدادات' : 'Settings'}</span>
                    </motion.button>
                  );
                })()}
              </div>

              {/* Plus Section Group 2: Plus Settings & Themes */}
              <div className="py-1 space-y-0.5">
                {/* Plus Settings */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'plus_settings';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-plus-settings"
                      onClick={() => handleItemClick(() => openSettingsPage('plus_settings'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <PlusCircle className="w-5 h-5 text-[#5288c1] shrink-0" />
                      <span>{isArabic ? 'إعدادات بلاس' : 'Plus Settings'}</span>
                    </motion.button>
                  );
                })()}

                {/* Categories / Tabs */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'folders';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-categories"
                      onClick={() => handleItemClick(() => openSettingsPage('folders'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <FolderKanban className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'التصنيفات' : 'Categories'}</span>
                    </motion.button>
                  );
                })()}

                {/* Download Themes */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'themes_browser';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-download-themes"
                      onClick={() => handleItemClick(() => openSettingsPage('themes_browser'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Palette className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'تنزيل أنماط' : 'Download Themes'}</span>
                    </motion.button>
                  );
                })()}

                {/* Coloring Theme */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'theme_coloring';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-theme-coloring"
                      onClick={() => handleItemClick(() => openSettingsPage('theme_coloring'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <Paintbrush className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'تلوين النمط' : 'Coloring Theme'}</span>
                    </motion.button>
                  );
                })()}

                {/* Support Group */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'support_group';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-support-group"
                      onClick={() => handleItemClick(() => openSettingsPage('support_group'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <HelpCircle className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'مجموعة الدعم' : 'Support Group'}</span>
                    </motion.button>
                  );
                })()}

                {/* Chat Counters / Layout */}
                {(() => {
                  const isActive = activeModal === 'settings' && settingsSubPage === 'chat_settings';
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      id="drawer-chat-counters"
                      onClick={() => handleItemClick(() => openSettingsPage('chat_settings'))}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-[13.5px] font-medium transition-all ${
                        isActive
                          ? 'active bg-[#2481cc]/20 text-[#5288c1] font-semibold border-r-4 rtl:border-r-0 rtl:border-l-4 border-[#2481cc]'
                          : 'hover:bg-white/5 text-gray-200 hover:text-white'
                      }`}
                    >
                      <ListOrdered className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#5288c1]' : 'text-gray-400'}`} />
                      <span>{isArabic ? 'عدادات المحادثات' : 'Chat Counters'}</span>
                    </motion.button>
                  );
                })()}
              </div>

              {/* Footer - Telegram_anwer saif (DrKLO Official Build) & Developer Info */}
              <div className="py-3.5 px-4 text-xs text-gray-400 space-y-2 border-t border-white/10 mt-2 bg-black/20">
                <div className="flex items-center gap-2.5">
                  {/* Animated Multi-Color Telegram Icon */}
                  <div className="relative shrink-0 w-8 h-8 rounded-full tg-multicolor-gradient flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <div className="tg-multicolor-glow" />
                    <svg className="w-4.5 h-4.5 text-white -translate-x-0.5 relative z-10 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[12.5px] text-white tracking-tight leading-tight">
                      Telegram_anwer saif (DrKLO Official Build)
                    </div>
                    <div className="text-[11px] text-sky-400 font-mono font-semibold mt-0.5">
                      v12.9.2.0 (2246) universal arm64-v8a
                    </div>
                  </div>
                </div>

                {/* Developer & Phone Number Section */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-gray-300 font-semibold">{isArabic ? 'المطور:' : 'Developer:'}</span>
                    <span className="text-white font-medium">انور فواد محمد علي سيف</span>
                  </div>

                  {/* Primary Requested Phone Number */}
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <span className="text-[10px] text-emerald-300 font-semibold">{isArabic ? 'رقم التواصل المباشر:' : 'Direct Contact:'}</span>
                    <a
                      href="tel:+966510349663"
                      className="text-[11.5px] font-mono font-bold hover:underline flex items-center gap-1.5 text-emerald-300"
                      dir="ltr"
                    >
                      <span>📞</span> +966 51 034 9663
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10.5px] font-mono text-gray-400 pt-0.5" dir="ltr">
                    <a href="tel:+966562570935" className="hover:text-sky-300 flex items-center gap-1">
                      <span>📞</span> +966 562 570 935
                    </a>
                    <a href="tel:+967772997043" className="hover:text-sky-300 flex items-center gap-1">
                      <span>📞</span> +967 772 997 043
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
