import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  MoreVertical,
  Camera,
  Settings,
  Palette,
  Paintbrush,
  Users,
  User,
  MessageSquare,
  ShieldCheck,
  Bell,
  PieChart,
  Folder,
  Laptop,
  BatteryCharging,
  Globe,
  Radio,
  Star,
  Store,
  Gift,
  HelpCircle,
  Lightbulb,
  Phone,
  AtSign,
  Cake,
  Megaphone,
  Sparkles,
  UserPlus,
  LogOut,
  Check,
  X,
  PlusCircle,
  PlayCircle,
  ListOrdered,
  Menu,
  Lock,
  LayoutGrid,
  Download,
  Sliders,
  Clock,
  Mail,
  Ban,
  MonitorSmartphone,
  BarChart2,
  HardDrive,
  QrCode,
  Smartphone,
  Trash2,
  Volume2,
  Vibrate,
  Eye,
  SlidersHorizontal,
  CheckCheck,
  Hash,
  Image,
  Cloud,
  Layers,
  Zap,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTelegram } from '../../context/TelegramContext';
import { SettingsSubPage } from '../../types';
import { TwoStepVerificationView } from './TwoStepVerificationView';
import { twoStepController } from '../../core/messenger/TwoStepVerificationController';
import {
  PrivacyControlView,
  PasscodeLockView,
  AutoDeleteView,
  SessionsView,
  BlockedUsersView,
} from './PrivacySubViews';
import {
  privacyController,
  PrivacyTarget,
} from '../../core/messenger/PrivacySettingsController';
import {
  StoriesSettingsView,
  MessagesSettingsView,
  TopicsSettingsView,
  SharedMediaView,
  AdsSettingsView,
  BackupRestoreView,
} from './ExtendedSettingsViews';
import {
  GeneralPlusSettingsView,
  ChatsPlusSettingsView,
  StoriesPlusSettingsView,
  MessagesPlusSettingsView,
  TopicsPlusSettingsView,
  NavigationDrawerPlusSettingsView,
  ProfilePlusSettingsView,
  NotificationsPlusSettingsView,
  PrivacySecurityPlusSettingsView,
  SharedMediaPlusSettingsView,
  DownloadsPlusSettingsView,
  AdsPlusSettingsView,
} from './PlusSettingsSubViews';
import { FcmDiagnosticsView } from './FcmDiagnosticsView';
import { GiftAuctionsView } from './GiftAuctionsView';
import { ChannelBoostsView } from './ChannelBoostsView';
import { MemberRequestsView } from './MemberRequestsView';
import { CacheByChatsView } from './CacheByChatsView';
import { AppUpdateSettingsView } from './AppUpdateSettingsView';
import { AccountSettingsView } from './AccountSettingsView';
import { AccountProfileSettings } from '../Settings/AccountProfileSettings';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    settings,
    updateSettings,
    currentUser,
    accounts,
    activeAccountId,
    switchAccount,
    settingsSubPage,
    setSettingsSubPage,
    showToast,
    triggerNotification,
    folders,
  } = useTelegram();

  const [searchFilter, setSearchFilter] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedPrivacyTarget, setSelectedPrivacyTarget] = useState<PrivacyTarget>('phone_number');

  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const goBack = () => {
    if (settingsSubPage === 'main') {
      setActiveModal('none');
    } else {
      setSettingsSubPage('main');
    }
  };

  return (
    <AnimatePresence>
      {activeModal === 'settings' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center select-none font-sans p-0 sm:p-4"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          {/* Backdrop */}
          <motion.div
            id="settings-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActiveModal('none')}
            className="absolute inset-0 bg-black/65 backdrop-blur-xs cursor-pointer"
          />

          {/* Main Container */}
          <motion.div
            id="tg-settings-container"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full sm:max-w-xl h-full sm:h-[92vh] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 border border-white/10"
            style={{
              backgroundColor: 'var(--tg-theme-surface, #17212b)',
              color: 'var(--tg-theme-bubble-in-text, #ffffff)',
            }}
          >
            {/* Render View by SubPage with smooth transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={settingsSubPage}
                initial={{ opacity: 0, x: isArabic ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isArabic ? 12 : -12 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                {settingsSubPage === 'main' && (
                  <MainSettingsView
                    onNavigate={(page) => setSettingsSubPage(page)}
                    onClose={() => setActiveModal('none')}
                    isSearchActive={isSearchActive}
                    setIsSearchActive={setIsSearchActive}
                    searchFilter={searchFilter}
                    setSearchFilter={setSearchFilter}
                  />
                )}

                {settingsSubPage === 'account' && (
                  <AccountProfileSettings
                    onBack={goBack}
                    onNavigateTo2FA={() => setSettingsSubPage('two_step_verification')}
                    onNavigateToPrivacy={() => setSettingsSubPage('privacy_security')}
                  />
                )}
                {settingsSubPage === 'plus_settings' && (
                  <PlusSettingsView
                    onBack={goBack}
                    onNavigate={(page) => setSettingsSubPage(page)}
                  />
                )}
                {settingsSubPage === 'plus_general' && (
                  <GeneralPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_chats' && (
                  <ChatsPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_stories' && (
                  <StoriesPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_messages' && (
                  <MessagesPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_topics' && (
                  <TopicsPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_drawer' && (
                  <NavigationDrawerPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_profile' && (
                  <ProfilePlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_notifications' && (
                  <NotificationsPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_privacy' && (
                  <PrivacySecurityPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_shared_media' && (
                  <SharedMediaPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_downloads' && (
                  <DownloadsPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'plus_ads' && (
                  <AdsPlusSettingsView onBack={() => setSettingsSubPage('plus_settings')} />
                )}
                {settingsSubPage === 'theme_coloring' && <ThemeColoringView onBack={goBack} />}
                {settingsSubPage === 'chat_settings' && <ChatSettingsView onBack={goBack} />}
                {settingsSubPage === 'privacy_security' && (
                  <PrivacySecurityView
                    onBack={goBack}
                    onSelectPrivacyTarget={(target) => {
                      setSelectedPrivacyTarget(target);
                      setSettingsSubPage('privacy_control');
                    }}
                  />
                )}
                {settingsSubPage === 'privacy_control' && (
                  <PrivacyControlView
                    target={selectedPrivacyTarget}
                    onBack={() => setSettingsSubPage('privacy_security')}
                  />
                )}
                {settingsSubPage === 'two_step_verification' && (
                  <TwoStepVerificationView onBack={() => setSettingsSubPage('privacy_security')} />
                )}
                {settingsSubPage === 'passcode_lock' && (
                  <PasscodeLockView onBack={() => setSettingsSubPage('privacy_security')} />
                )}
                {settingsSubPage === 'auto_delete' && (
                  <AutoDeleteView onBack={() => setSettingsSubPage('privacy_security')} />
                )}
                {settingsSubPage === 'sessions' && (
                  <SessionsView onBack={() => setSettingsSubPage('privacy_security')} />
                )}
                {settingsSubPage === 'blocked_users' && (
                  <BlockedUsersView onBack={() => setSettingsSubPage('privacy_security')} />
                )}
                {settingsSubPage === 'notifications_sounds' && <NotificationsSoundsView onBack={goBack} />}
                {settingsSubPage === 'data_storage' && <DataStorageView onBack={goBack} />}
                {settingsSubPage === 'power_saving' && <PowerSavingView onBack={goBack} />}
                {settingsSubPage === 'language' && <LanguageView onBack={goBack} />}
                {settingsSubPage === 'devices' && <DevicesView onBack={goBack} />}
                {settingsSubPage === 'folders' && <FoldersView onBack={goBack} />}
                {settingsSubPage === 'themes_browser' && <ThemesBrowserView onBack={goBack} />}
                {settingsSubPage === 'support_group' && <SupportGroupView onBack={goBack} />}
                {settingsSubPage === 'faq' && <FaqView onBack={goBack} />}
                {settingsSubPage === 'features' && <FeaturesView onBack={goBack} />}
                {settingsSubPage === 'stories' && <StoriesSettingsView onBack={goBack} />}
                {settingsSubPage === 'messages' && <MessagesSettingsView onBack={goBack} />}
                {settingsSubPage === 'topics' && <TopicsSettingsView onBack={goBack} />}
                {settingsSubPage === 'shared_media' && <SharedMediaView onBack={goBack} />}
                {settingsSubPage === 'ads_settings' && <AdsSettingsView onBack={goBack} />}
                {settingsSubPage === 'backup_restore' && <BackupRestoreView onBack={goBack} />}
                {settingsSubPage === 'fcm_diagnostics' && <FcmDiagnosticsView onBack={goBack} />}
                {settingsSubPage === 'gift_auctions' && <GiftAuctionsView onBack={goBack} />}
                {settingsSubPage === 'channel_boosts' && <ChannelBoostsView onBack={goBack} />}
                {settingsSubPage === 'member_requests' && <MemberRequestsView onBack={goBack} />}
                {settingsSubPage === 'cache_by_chats' && <CacheByChatsView onBack={goBack} />}
                {settingsSubPage === 'app_update' && <AppUpdateSettingsView onBack={goBack} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 1. MAIN SETTINGS VIEW (Matches Screenshots)
// ==========================================
const MainSettingsView: React.FC<{
  onNavigate: (page: SettingsSubPage) => void;
  onClose: () => void;
  isSearchActive: boolean;
  setIsSearchActive: (v: boolean) => void;
  searchFilter: string;
  setSearchFilter: (v: string) => void;
}> = ({ onNavigate, onClose, isSearchActive, setIsSearchActive, searchFilter, setSearchFilter }) => {
  const { currentUser, accounts, activeAccountId, switchAccount, settings, showToast, setActiveModal } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const otherAccounts = accounts.filter((a) => a.id !== activeAccountId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#2481cc] text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
            title={isArabic ? 'رجوع' : 'Back'}
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg">{isArabic ? 'الإعدادات' : 'Settings'}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            className="p-2 rounded-full hover:bg-white/15 transition-colors"
            title={isArabic ? 'بحث' : 'Search'}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => showToast(isArabic ? 'خيارات إضافية' : 'More options', '⚙️')}
            className="p-2 rounded-full hover:bg-white/15 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar (Conditional) */}
      {isSearchActive && (
        <div className="p-3 bg-[#1e2a38] border-b border-white/10 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={isArabic ? 'ابحث في الإعدادات...' : 'Search settings...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white flex-1"
            autoFocus
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-black/30 scrollbar-thin bg-[#0e1621]">
        {/* User Profile Card */}
        <div
          onClick={() => onNavigate('account')}
          className="p-4 bg-[#17212b] flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-md">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-xl">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base truncate flex items-center gap-1.5">
                <span className="truncate">{currentUser.name}</span>
                {currentUser.isVerified && (
                  <Check className="w-4 h-4 text-[#5288c1] stroke-[3]" />
                )}
              </div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">{currentUser.phone}</div>
              <div className="text-xs text-[#5288c1] font-mono">@{currentUser.username || 'Seha09'}</div>
            </div>
          </div>
        </div>

        {/* Accounts Card List */}
        {otherAccounts.length > 0 && (
          <div className="p-3 bg-[#17212b] space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-[#5288c1] uppercase tracking-wider">
              {isArabic ? 'الحسابات' : 'Accounts'}
            </div>
            {otherAccounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => switchAccount(acc.id)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/20">
                    {acc.user.avatar ? (
                      <img src={acc.user.avatar} alt={acc.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-xs">
                        {acc.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate">{acc.user.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono truncate">{acc.user.phone}</div>
                  </div>
                </div>

                {acc.unreadCount && acc.unreadCount > 0 ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-[#5288c1] text-white rounded-full">
                    {acc.unreadCount}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Plus Section (Screenshot 2) */}
        <div className="py-2 bg-[#17212b]">
          <SettingsListItem
            icon={<Settings className="w-5 h-5 text-cyan-400" />}
            iconBg="bg-cyan-500/15"
            title={isArabic ? 'إعدادات بلاس' : 'Plus Settings'}
            onClick={() => onNavigate('plus_settings')}
          />
          <SettingsListItem
            icon={<Palette className="w-5 h-5 text-orange-400" />}
            iconBg="bg-orange-500/15"
            title={isArabic ? 'تلوين النمط' : 'Theme Coloring'}
            onClick={() => onNavigate('theme_coloring')}
          />
          <SettingsListItem
            icon={<Paintbrush className="w-5 h-5 text-rose-400" />}
            iconBg="bg-rose-500/15"
            title={isArabic ? 'تنزيل أنماط' : 'Download Themes'}
            onClick={() => onNavigate('themes_browser')}
          />
          <SettingsListItem
            icon={<Users className="w-5 h-5 text-sky-400" />}
            iconBg="bg-sky-500/15"
            title={isArabic ? 'مجموعة الدعم' : 'Support Group'}
            onClick={() => onNavigate('support_group')}
          />
        </div>

        {/* Telegram Main Settings (Colored Circles) */}
        <div className="py-2 bg-[#17212b]">
          <div className="px-4 py-1.5 text-[11px] font-bold text-[#5288c1] uppercase tracking-wider">
            {isArabic ? 'إعدادات تيليجرام' : 'Telegram Settings'}
          </div>

          <SettingsListItem
            icon={<User className="w-5 h-5 text-blue-400" />}
            iconBg="bg-blue-500/20"
            title={isArabic ? 'الملف الشخصي والحساب' : 'Profile & Account'}
            subtitle={isArabic ? 'الرقم، اسم المستخدم، النبذة' : 'Phone, Username, Bio'}
            onClick={() => onNavigate('account')}
          />
          <SettingsListItem
            icon={<Camera className="w-5 h-5 text-rose-400" />}
            iconBg="bg-rose-500/20"
            title={isArabic ? 'القصص' : 'Stories'}
            subtitle={isArabic ? 'الدقة، وضع التخفي، الخصوصية' : 'Resolution, Stealth mode, Privacy'}
            onClick={() => onNavigate('stories')}
          />
          <SettingsListItem
            icon={<MessageSquare className="w-5 h-5 text-amber-400" />}
            iconBg="bg-amber-500/20"
            title={isArabic ? 'إعدادات المحادثات' : 'Chat Settings'}
            subtitle={isArabic ? 'خلفية الشاشة، الوضع الليلي، المؤثرات الحركية' : 'Wallpaper, Night Mode, Animations'}
            onClick={() => onNavigate('chat_settings')}
          />
          <SettingsListItem
            icon={<Sliders className="w-5 h-5 text-indigo-400" />}
            iconBg="bg-indigo-500/20"
            title={isArabic ? 'الرسائل' : 'Messages'}
            subtitle={isArabic ? 'فقاعات الرسائل، حجم الخط، زوايا العرض' : 'Message bubbles, Font size, Corner radius'}
            onClick={() => onNavigate('messages')}
          />
          <SettingsListItem
            icon={<Hash className="w-5 h-5 text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            title={isArabic ? 'المواضيع والمنتديات' : 'Forum Topics'}
            subtitle={isArabic ? 'تنظيم المنتديات، الأقسام، والمواضيع' : 'Topics layout, Tabs and threads'}
            onClick={() => onNavigate('topics')}
          />
          <SettingsListItem
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            title={isArabic ? 'الخصوصية والأمان' : 'Privacy and Security'}
            subtitle={isArabic ? 'التحقق بخطوتين، آخر ظهور، الجلسات، مفاتيح المرور' : '2FA, Last Seen, Devices, Passkeys'}
            onClick={() => onNavigate('privacy_security')}
          />
          <SettingsListItem
            icon={<Bell className="w-5 h-5 text-pink-400" />}
            iconBg="bg-pink-500/20"
            title={isArabic ? 'الإشعارات والأصوات' : 'Notifications and Sounds'}
            subtitle={isArabic ? 'الأصوات، المكالمات، الشارات' : 'Sounds, Calls, Badges'}
            onClick={() => onNavigate('notifications_sounds')}
          />
          <SettingsListItem
            icon={<Radio className="w-5 h-5 text-emerald-400 animate-pulse" />}
            iconBg="bg-emerald-500/20"
            title={isArabic ? 'تشخيص الإشعارات و FCM' : 'FCM Push Diagnostics'}
            subtitle={isArabic ? 'مراقبة حزم Push، ربط الجلسة، وتوجيه dialog_id' : 'Push packet logs, dialog_id routing & status'}
            onClick={() => onNavigate('fcm_diagnostics')}
          />
        </div>

        {/* Native Controllers & New Features (TMessagesProj) */}
        <div className="py-2 bg-[#17212b]">
          <div className="px-4 py-1.5 text-[11px] font-bold text-[#5288c1] uppercase tracking-wider">
            {isArabic ? 'متحكمات تيليجرام الأصلية (TMessagesProj Subsystem)' : 'Native Telegram Subsystem'}
          </div>

          <SettingsListItem
            icon={<Gift className="w-5 h-5 text-amber-400" />}
            iconBg="bg-amber-500/20"
            title={isArabic ? 'مزادات هدايا النجوم (Star Gift Auctions)' : 'Star Gift Auctions'}
            subtitle={isArabic ? 'المزادات الحية، المقتنيات الفريدة، والمزايدات' : 'Live auctions, unique gifts, bidding'}
            onClick={() => onNavigate('gift_auctions')}
          />
          <SettingsListItem
            icon={<Zap className="w-5 h-5 text-yellow-400" />}
            iconBg="bg-yellow-500/20"
            title={isArabic ? 'تعزيز القنوات (Channel Boosts)' : 'Channel Boosts & Perks'}
            subtitle={isArabic ? 'إدارة مستوى التعزيز ومميزات القصص الحصرية' : 'Level perks, story unlocks, boost links'}
            onClick={() => onNavigate('channel_boosts')}
          />
          <SettingsListItem
            icon={<UserPlus className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            title={isArabic ? 'طلبات الانضمام المعلقة (Member Requests)' : 'Pending Member Requests'}
            subtitle={isArabic ? 'مراجعة وقبول طلبات انضمام القنوات والمجموعات' : 'Review & approve join requests'}
            onClick={() => onNavigate('member_requests')}
          />
          <SettingsListItem
            icon={<HardDrive className="w-5 h-5 text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            title={isArabic ? 'إدارة التخزين المؤقت للمحادثات (Cache by Chats)' : 'Cache by Chats'}
            subtitle={isArabic ? 'حذف وسائط كل محادثة بشكل منفصل لتوفير الذاكرة' : 'Clear media & cache per individual chat'}
            onClick={() => onNavigate('cache_by_chats')}
          />
          <SettingsListItem
            icon={<Download className="w-5 h-5 text-blue-400 animate-pulse" />}
            iconBg="bg-blue-500/20"
            title={isArabic ? 'تحديث التطبيق (App Updates & OTA)' : 'App Updates & OTA (BuildVars)'}
            subtitle={isArabic ? 'فحص الإصدارات الجديدة، سجل التغييرات، والتحديث التلقائي' : 'Check for updates, release notes & changelog'}
            onClick={() => onNavigate('app_update')}
          />
        </div>

        <div className="py-2 bg-[#17212b]">
          <SettingsListItem
            icon={<Image className="w-5 h-5 text-teal-400" />}
            iconBg="bg-teal-500/20"
            title={isArabic ? 'الوسائط المشتركة' : 'Shared Media'}
            subtitle={isArabic ? 'الصور، الفيديو، الملفات، والصوتيات' : 'Photos, Videos, Files and Audio'}
            onClick={() => onNavigate('shared_media')}
          />
          <SettingsListItem
            icon={<PieChart className="w-5 h-5 text-sky-400" />}
            iconBg="bg-sky-500/20"
            title={isArabic ? 'التنزيل والتخزين' : 'Data and Storage'}
            subtitle={isArabic ? 'إعدادات التنزيل التلقائي والشبكة' : 'Network usage, Auto-download media'}
            onClick={() => onNavigate('data_storage')}
          />
          <SettingsListItem
            icon={<Megaphone className="w-5 h-5 text-purple-400" />}
            iconBg="bg-purple-500/20"
            title={isArabic ? 'الإعلانات المدعومة' : 'Sponsored Messages'}
            subtitle={isArabic ? 'الرسائل الترويجية وإعلانات القنوات' : 'Promoted posts in public channels'}
            onClick={() => onNavigate('ads_settings')}
          />
          <SettingsListItem
            icon={<Cloud className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            title={isArabic ? 'حفظ واستعادة الإعدادات' : 'Backup & Restore'}
            subtitle={isArabic ? 'المزامنة السحابية الشاملة للإعدادات' : 'Cloud sync and settings backup'}
            onClick={() => onNavigate('backup_restore')}
          />
          <SettingsListItem
            icon={<Folder className="w-5 h-5 text-cyan-400" />}
            iconBg="bg-cyan-500/20"
            title={isArabic ? 'مجلدات المحادثات' : 'Chat Folders'}
            subtitle={isArabic ? 'فرز المحادثات في مجلدات' : 'Organize chats into folders'}
            onClick={() => onNavigate('folders')}
          />
          <SettingsListItem
            icon={<Laptop className="w-5 h-5 text-teal-400" />}
            iconBg="bg-teal-500/20"
            title={isArabic ? 'الأجهزة والجلسات' : 'Devices & Sessions'}
            subtitle={isArabic ? 'إدارة الأجهزة المتصلة والجلسات النشطة' : 'Manage linked sessions & desktop'}
            onClick={() => onNavigate('devices')}
          />
          <SettingsListItem
            icon={<BatteryCharging className="w-5 h-5 text-orange-400" />}
            iconBg="bg-orange-500/20"
            title={isArabic ? 'توفير الطاقة' : 'Power Saving'}
            subtitle={isArabic ? 'تقليل استهلاك الطاقة عند انخفاض الشحن' : 'Reduce battery consumption'}
            onClick={() => onNavigate('power_saving')}
          />
          <SettingsListItem
            icon={<Globe className="w-5 h-5 text-purple-400" />}
            iconBg="bg-purple-500/20"
            title={isArabic ? 'اللغة' : 'Language'}
            subtitle={isArabic ? 'العربية' : 'English'}
            onClick={() => onNavigate('language')}
          />
        </div>

        {/* Direct Mobile App Installation */}
        <div className="py-2 bg-[#17212b]">
          <div className="px-4 py-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>{isArabic ? 'تثبيت التطبيق على الجوال' : 'Install App on Phone'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">v12.9.2</span>
          </div>

          <SettingsListItem
            icon={<Download className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            title={isArabic ? 'تثبيت تطبيق تيليجرام' : 'Install Telegram App'}
            subtitle={isArabic ? 'تثبيت فوري كتطبيق حقيقي على الهاتف' : 'Instant installation as real mobile app'}
            onClick={() => {
              setActiveModal('apk-installer');
            }}
            rightBadge={
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                {isArabic ? 'تثبيت' : 'Install'}
              </span>
            }
          />
        </div>

        {/* Premium & Business Services */}
        <div className="py-2 bg-[#17212b]">
          <SettingsListItem
            icon={<Star className="w-5 h-5 text-purple-400" />}
            iconBg="bg-purple-500/20"
            title="Telegram Premium"
            onClick={() => showToast('Telegram Premium Activated ⭐', '✨')}
          />
          <SettingsListItem
            icon={<Store className="w-5 h-5 text-pink-400" />}
            iconBg="bg-pink-500/20"
            title="Telegram Business"
            onClick={() => showToast('Telegram Business Tools', '💼')}
          />
          <SettingsListItem
            icon={<Gift className="w-5 h-5 text-amber-400" />}
            iconBg="bg-amber-500/20"
            title={isArabic ? 'Send a Gift' : 'Send a Gift'}
            onClick={() => showToast('Send a Gift to friends 🎁', '🎁')}
          />
        </div>

        {/* Help & Information */}
        <div className="py-2 bg-[#17212b]">
          <div className="px-4 py-1.5 text-[11px] font-bold text-[#5288c1] uppercase tracking-wider">
            {isArabic ? 'مساعدة' : 'Help'}
          </div>

          <SettingsListItem
            icon={<MessageSquare className="w-5 h-5 text-amber-400" />}
            iconBg="bg-amber-500/20"
            title={isArabic ? 'اسأل سؤالاً' : 'Ask a Question'}
            onClick={() => onNavigate('faq')}
          />
          <SettingsListItem
            icon={<HelpCircle className="w-5 h-5 text-blue-400" />}
            iconBg="bg-blue-500/20"
            title={isArabic ? 'الأسئلة الشائعة' : 'Telegram FAQ'}
            onClick={() => onNavigate('faq')}
          />
          <SettingsListItem
            icon={<Lightbulb className="w-5 h-5 text-purple-400" />}
            iconBg="bg-purple-500/20"
            title={isArabic ? 'ميزات تيليجرام' : 'Telegram Features'}
            onClick={() => onNavigate('features')}
          />
          <SettingsListItem
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            title={isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
            onClick={() => showToast('Telegram Security & Privacy Guaranteed', '🛡️')}
          />
        </div>

        {/* Version & Developer Footer */}
        <div className="p-4 bg-[#17212b] text-center text-xs text-gray-400 space-y-2 border-t border-white/5">
          <div>
            <div className="font-semibold text-gray-300">
              {isArabic ? 'تيليجرام للأندرويد' : 'Telegram for Android'}
            </div>
            <div className="font-mono text-[11px] text-gray-500">
              v12.9.2.0 (2246) universal arm64-v8a
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-1 text-center">
            <div className="text-xs font-semibold text-[#5288c1]">
              {isArabic ? 'المطور:' : 'Developer:'} <span className="text-gray-200">انور فواد محمد علي سيف</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Anwer Foud Mohammed Ali Saif
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-emerald-400" dir="ltr">
              <a href="tel:+967772997043" className="hover:underline flex items-center gap-1">
                <span>📞</span> +967 772 997 043
              </a>
              <span>•</span>
              <a href="tel:+966562570935" className="hover:underline flex items-center gap-1">
                <span>📞</span> +966 562 570 935
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-Component Helper: Settings List Item
const SettingsListItem: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  onClick: () => void;
  rightBadge?: React.ReactNode;
}> = ({ icon, iconBg, title, subtitle, onClick, rightBadge }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left rtl:text-right"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium text-white truncate">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 truncate">{subtitle}</div>}
        </div>
      </div>

      {rightBadge && <div>{rightBadge}</div>}
    </button>
  );
};

// ==========================================
// 2. ACCOUNT / PROFILE EDIT VIEW (Screenshots 5, 6)
// ==========================================
const AccountEditView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, updateAccountProfile, settings, accounts, switchAccount, logout, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      await updateAccountProfile({ avatar: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateAccountProfile({
      name,
      username,
      bio,
      avatar: avatarPreview || currentUser.avatar,
    });
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'الحساب' : 'Account'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar & Name Input */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#5288c1] mb-3 cursor-pointer group"
          >
            {avatarPreview || currentUser.avatar ? (
              <img
                src={avatarPreview || currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-2xl">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <span className="text-[11px] text-sky-400 mb-2 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
            {isArabic ? 'تغيير الصورة الشخصية' : 'Change profile photo'}
          </span>

          <div className="w-full space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-sm text-center font-bold text-white outline-none focus:border-[#5288c1]"
              placeholder={isArabic ? 'الاسم' : 'Name'}
            />
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#242f3d] border border-white/10 rounded-xl px-3 py-2 text-xs text-center text-gray-300 outline-none focus:border-[#5288c1]"
              placeholder={isArabic ? 'النبذة: بضع كلمات عنك' : 'Bio'}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-colors"
            >
              {saving
                ? (isArabic ? 'جاري المزامنة مع تيليجرام...' : 'Syncing with Telegram...')
                : (isArabic ? 'حفظ التغييرات ومزامنة الحساب' : 'Save & Sync Profile')}
            </button>
          </div>
        </div>

        {/* Info Items List (Matches Screenshot 5) */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white">{currentUser.phone}</div>
                <div className="text-[11px] text-gray-400">{isArabic ? 'رقم الهاتف المرتبط' : 'Linked phone number'}</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <AtSign className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="bg-transparent text-xs font-mono font-bold text-[#5288c1] border-b border-transparent focus:border-[#5288c1] outline-none w-full"
                />
                <div className="text-[11px] text-gray-400">{isArabic ? 'انقر لتعديل المعرف (@username)' : 'Tap to edit username'}</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => showToast('Date of birth added', '🎂')}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
                <Cake className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{isArabic ? 'إضافة تاريخ الميلاد' : 'Add Date of Birth'}</div>
                <div className="text-[11px] text-gray-400">{isArabic ? 'إظهار يوم ميلادك للأصدقاء' : 'Show friends your birthday'}</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => showToast('Personal Channel', '📢')}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Add Personal channel</div>
                <div className="text-[11px] text-gray-400">{isArabic ? 'ربط قناتك الشخصية بالملف' : 'Link personal channel'}</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => showToast('AI Auto Reply Bot active', '🤖')}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{isArabic ? 'المحادثة الآلية' : 'Auto Reply Bot'}</span>
                  <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.2 rounded-full font-bold">NEW</span>
                </div>
                <div className="text-[11px] text-gray-400">{isArabic ? 'رد تلقائي بالذكاء الاصطناعي' : 'AI automated answers'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Log Out */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full p-3.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-2xl flex items-center justify-center gap-2 text-red-400 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isArabic ? 'تسجيل الخروج من الحساب' : 'Log Out of Account'}</span>
        </button>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-xs bg-[#17212b] border border-[#2b394a] rounded-2xl p-5 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {isArabic ? 'تسجيل الخروج؟' : 'Log Out?'}
                </h4>
                <p className="text-xs text-gray-400">
                  {isArabic
                    ? `هل أنت متأكد من رغبتك في تسجيل الخروج من حساب (${currentUser.name})؟`
                    : `Are you sure you want to log out of (${currentUser.name})?`}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
                >
                  {isArabic ? 'تأكيد الخروج' : 'Log Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. PLUS SETTINGS VIEW (Screenshot 3 - Full Functional Binding)
// ==========================================
const PlusSettingsView: React.FC<{
  onBack: () => void;
  onNavigate: (page: SettingsSubPage) => void;
}> = ({ onBack, onNavigate }) => {
  const { settings, updateSettings, showToast, accounts } = useTelegram();
  const isArabic = settings.language === 'ar';
  const NextIcon = isArabic ? ChevronLeft : ChevronRight;

  const items: { title: string; subtitle: string; page: SettingsSubPage; icon: React.ReactNode }[] = [
    {
      title: isArabic ? 'عام' : 'General',
      subtitle: isArabic ? 'المظهر، شريط التبويبات، الخطوط وزر الإرسال' : 'Appearance, tabs position, fonts & send button',
      page: 'plus_general',
      icon: <Settings className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'المحادثات' : 'Chats',
      subtitle: isArabic ? 'إدارة المجموعات، الخروج، وحذف الرسائل والتثبيت' : 'Group management, leave, clear history & pinning',
      page: 'plus_chats',
      icon: <Users className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'القصص' : 'Stories',
      subtitle: isArabic ? 'الوضع المتخفي، جودة التنزيل وحفظ القصص' : 'Stealth viewer, original quality & auto-save',
      page: 'plus_stories',
      icon: <PlayCircle className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'الرسائل' : 'Messages',
      subtitle: isArabic ? 'إعادة التوجيه المباشر بدون اقتباس وإخفاء جاري الكتابة' : 'Direct forward without author & ghost typing',
      page: 'plus_messages',
      icon: <MessageSquare className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'Topics' : 'Topics',
      subtitle: isArabic ? 'تنسيق المنتديات، التبديل السريع والمواضيع المغلقة' : 'Forum topics switcher, layout & archived threads',
      page: 'plus_topics',
      icon: <ListOrdered className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'درج التصفح' : 'Navigation Drawer',
      subtitle: isArabic ? 'عرض الحسابات المتعددة، المعرف والرقم في القائمة' : 'Multi-accounts switcher, username & phone header',
      page: 'plus_drawer',
      icon: <Menu className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'الملف الشخصي' : 'Profile',
      subtitle: isArabic ? 'إظهار User ID، مركز البيانات DC وتاريخ التسجيل' : 'Numeric User ID, DC cluster & registration date',
      page: 'plus_profile',
      icon: <User className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'الإشعارات' : 'Notifications',
      subtitle: isArabic ? 'تنبيه اتصال جهة الاتصال بالإنترنت وفلاش الكاميرا' : 'Contact online alerts, avatar changes & flash alerts',
      page: 'plus_notifications',
      icon: <Bell className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'الخصوصية والأمان' : 'Privacy and Security',
      subtitle: isArabic ? 'وضع القراءة المخفية، قفل البصمة وحظر لقطات الشاشة' : 'Ghost read receipts, biometric lock & screenshot guard',
      page: 'plus_privacy',
      icon: <Lock className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'الوسائط المتبادلة' : 'Shared Media',
      subtitle: isArabic ? 'أعمدة شبكة الوسائط وتنزيل الصور الأصلية' : 'Media grid column count & lossless downloads',
      page: 'plus_shared_media',
      icon: <LayoutGrid className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'التحميلات' : 'Downloads',
      subtitle: isArabic ? 'تسريع التحميل المتوازي متعدد المسارات ومسار الحفظ' : 'Multi-threaded accelerated downloads & storage path',
      page: 'plus_downloads',
      icon: <Download className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: isArabic ? 'Ads' : 'Ads',
      subtitle: isArabic ? 'حظر الإعلانات الممولة في القنوات ودعم المبدعين' : 'Block sponsored ads in channels & creator stars',
      page: 'plus_ads',
      icon: <Megaphone className="w-5 h-5 text-cyan-400" />,
    },
  ];

  const handleSaveSettings = () => {
    try {
      const backupPayload = {
        app: 'Telegram Plus Messenger',
        version: '12.9.2.0-universal',
        savedAt: new Date().toISOString(),
        settings: settings,
        accountsCount: accounts.length,
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Telegram_Plus_Settings_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(isArabic ? "تم حفظ الإعدادات في مجلد 'Telegram'" : "Settings saved to '/Telegram' directory", '💾');
    } catch {
      showToast(isArabic ? 'فشل حفظ الإعدادات' : 'Failed to save settings', '❌');
    }
  };

  const handleRestoreSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.settings) {
          updateSettings(data.settings);
          showToast(isArabic ? 'تمت استعادة إعدادات بلاس بنجاح' : 'Plus settings restored successfully', '✅');
        } else {
          showToast(isArabic ? 'ملف الإعدادات غير متوافق' : 'Incompatible settings file', '⚠️');
        }
      } catch {
        showToast(isArabic ? 'ملف الإعدادات غير صالح' : 'Invalid settings JSON file', '❌');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'إعدادات بلاس' : 'Plus Settings'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 bg-[#17212b]">
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onNavigate(item.page)}
            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-white truncate">{item.title}</div>
                <div className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</div>
              </div>
            </div>
            <NextIcon size={16} className="text-gray-500 shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />
          </div>
        ))}

        {/* Save & Restore Section (Matching Plus Messenger Screenshot) */}
        <div className="p-4 bg-[#0e1621] space-y-3">
          <div
            onClick={handleSaveSettings}
            className="p-3.5 bg-[#17212b] rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download size={14} className="text-cyan-400" />
                <span>{isArabic ? 'حفظ الإعدادات' : 'Save Settings'}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {isArabic
                  ? "مجلد حفظ الاعدادات هي (المفضلات أيضاً) 'Telegram'"
                  : "Backup settings saved to '/Telegram' storage directory"}
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold shrink-0">
              {isArabic ? 'تصدير JSON' : 'Export'}
            </span>
          </div>

          <label className="p-3.5 bg-[#17212b] rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between block">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload size={14} className="text-emerald-400" />
                <span>{isArabic ? 'إستعادة الإعدادات' : 'Restore Settings'}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {isArabic
                  ? 'إستعادة الإعدادات من الجهاز وفحص التوافق'
                  : 'Import and apply settings from local JSON file'}
              </div>
            </div>
            <input type="file" accept=".json" onChange={handleRestoreSettings} className="hidden" />
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0">
              {isArabic ? 'استيراد' : 'Import'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. THEME COLORING VIEW (Screenshot 4)
// ==========================================
const ThemeColoringView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, updateSettings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [plusThemeEnabled, setPlusThemeEnabled] = useState(true);
  const [selectedColor, setSelectedColor] = useState('#2481cc');

  const colorPresets = ['#2481cc', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'تلوين النمط' : 'Theme Coloring'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Toggle Plus Theme */}
        <div className="p-3.5 bg-[#17212b] rounded-2xl border border-white/10 flex items-center justify-between">
          <span className="font-bold text-xs text-white">{isArabic ? 'تشغيل نمط بلاس' : 'Enable Plus Theme'}</span>
          <input
            type="checkbox"
            checked={plusThemeEnabled}
            onChange={(e) => setPlusThemeEnabled(e.target.checked)}
            className="w-5 h-5 accent-[#2481cc]"
          />
        </div>

        {/* Primary Color Palette */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
          <div className="text-xs font-bold text-[#5288c1]">{isArabic ? 'اللون الأساسي للنمط' : 'Primary Theme Color'}</div>
          <div className="flex items-center gap-3">
            {colorPresets.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedColor(c);
                  updateSettings({ accentColor: c });
                  showToast(isArabic ? 'تم تغيير اللون' : 'Theme color applied', '🎨');
                }}
                className={`w-9 h-9 rounded-full border-2 transition-transform ${
                  selectedColor === c ? 'scale-110 border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Interfaces List (Matches Screenshot 4) */}
        <div className="p-3 bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5">
          <div className="py-1 text-[11px] font-bold text-gray-400 uppercase">{isArabic ? 'الواجهات' : 'Interfaces'}</div>
          {[
            '1 الواجهة الرئيسية',
            '2 واجهة الدردشة',
            '3 واجهة جهات الإتصال',
            '4 درج التصفح',
            '5 الملف الشخصي',
            '6 الإعدادات/واجهة تلوين النمط',
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => showToast(item, '🎨')}
              className="py-2.5 flex items-center justify-between text-xs text-gray-200 cursor-pointer hover:text-white"
            >
              <span>{item}</span>
              <div className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: selectedColor }} />
            </div>
          ))}
        </div>

        {/* Themes Save & XML Options */}
        <div className="p-3 bg-[#17212b] rounded-2xl border border-white/10 space-y-2 text-xs">
          <div className="py-1 text-[11px] font-bold text-gray-400 uppercase">{isArabic ? 'الأنماط' : 'Themes'}</div>
          <button
            onClick={() => showToast(isArabic ? 'تم حفظ ملف النمط' : 'Theme saved (.xml)', '💾')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium text-center"
          >
            {isArabic ? 'حفظ النمط (/Themes)' : 'Save Theme (/Themes)'}
          </button>
          <button
            onClick={() => showToast(isArabic ? 'تم تطبيق ملف النمط .xml' : 'Theme applied from XML', '📄')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium text-center"
          >
            {isArabic ? 'تطبيق النمط من الملف' : 'Apply Theme from file'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. CHAT SETTINGS VIEW (Screenshots 7, 8, 9)
// ==========================================
const ChatSettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, updateSettings, showToast, currentUser } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [fontSize, setFontSize] = useState(settings.fontSize || 16);
  const [cornerRadius, setCornerRadius] = useState(settings.bubbleCornerRadius || 17);
  const viewMode = settings.chatListViewMode || 'two_lines';

  const handleViewModeChange = (mode: 'two_lines' | 'three_lines') => {
    updateSettings({ chatListViewMode: mode });
    showToast(
      mode === 'two_lines'
        ? (isArabic ? 'تم تفعيل نمط القائمة: سطرين' : 'Chat list view: 2 lines')
        : (isArabic ? 'تم تفعيل نمط القائمة: 3 أسطر' : 'Chat list view: 3 lines'),
      '📋'
    );
  };

  const themes = [
    { id: 'classic', label: isArabic ? 'كلاسيكي' : 'Classic', color: '#2481cc' },
    { id: 'night', label: isArabic ? 'ليلي' : 'Night', color: '#17212b' },
    { id: 'arctic', label: isArabic ? 'ثلجي' : 'Arctic', color: '#e0f2fe' },
    { id: 'sunset', label: isArabic ? 'غروب' : 'Sunset', color: '#f43f5e' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'إعدادات المحادثات' : 'Chat Settings'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Interactive Chat Bubble Preview (Screenshot 7) */}
        <div className="p-4 bg-[#0b141a] rounded-2xl border border-white/10 space-y-3">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
            {isArabic ? 'معاينة الرسائل المباشرة' : 'Live Message Preview'}
          </div>

          <div className="space-y-2">
            {/* Incoming Bubble */}
            <div className="flex justify-start">
              <div
                className="max-w-[80%] bg-[#182533] p-3 text-white shadow-md transition-all"
                style={{
                  borderRadius: `${cornerRadius}px`,
                  fontSize: `${fontSize}px`,
                }}
              >
                <div className="text-xs font-bold text-[#5288c1] mb-1">{currentUser.name}</div>
                <div>{isArabic ? 'صباح الخير! ما هو الوقت الآن؟' : 'Good morning! What time is it?'}</div>
                <div className="text-[10px] text-gray-400 text-right mt-1">3:01 م</div>
              </div>
            </div>

            {/* Outgoing Bubble */}
            <div className="flex justify-end">
              <div
                className="max-w-[80%] bg-[#2b5278] p-3 text-white shadow-md transition-all"
                style={{
                  borderRadius: `${cornerRadius}px`,
                  fontSize: `${fontSize}px`,
                }}
              >
                <div>{isArabic ? 'الوقت صباح هنا في دبي ☀️' : 'It is morning here in Dubai ☀️'}</div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-sky-200 mt-1">
                  <span>3:16 م</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Font Size Slider (Screenshot 7) */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white">{isArabic ? 'حجم خط الرسائل' : 'Message Font Size'}</span>
            <span className="text-[#5288c1] font-mono text-sm">{fontSize} px</span>
          </div>
          <input
            type="range"
            min="12"
            max="26"
            value={fontSize}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFontSize(val);
              updateSettings({ fontSize: val });
            }}
            className="w-full accent-[#2481cc] cursor-pointer"
          />
        </div>

        {/* Corner Radius Slider (Screenshot 8) */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white">{isArabic ? 'زوايا الرسالة' : 'Message Corner Radius'}</span>
            <span className="text-[#5288c1] font-mono text-sm">{cornerRadius} px</span>
          </div>
          <input
            type="range"
            min="0"
            max="28"
            value={cornerRadius}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCornerRadius(val);
              updateSettings({ bubbleCornerRadius: val });
            }}
            className="w-full accent-[#2481cc] cursor-pointer"
          />
        </div>

        {/* Theme Presets */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
          <div className="text-xs font-bold text-white">{isArabic ? 'لون النمط' : 'Theme Presets'}</div>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  updateSettings({ theme: t.id === 'classic' ? 'dark' : (t.id as any) });
                  showToast(t.label, '🎨');
                }}
                className="p-3 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 hover:bg-white/5"
              >
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-[11px] text-gray-300 truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat List View Mode (2 lines vs 3 lines) */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-2">
          <div className="text-xs font-bold text-white">{isArabic ? 'عرض قائمة المحادثات' : 'Chat List View'}</div>
          <div className="flex items-center gap-4 text-xs">
            <label
              onClick={() => handleViewModeChange('two_lines')}
              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5"
            >
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === 'two_lines'}
                onChange={() => handleViewModeChange('two_lines')}
                className="accent-[#2481cc]"
              />
              <span className="font-semibold text-white">{isArabic ? 'خطين اثنين (2 lines)' : 'Two lines'}</span>
            </label>
            <label
              onClick={() => handleViewModeChange('three_lines')}
              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5"
            >
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === 'three_lines'}
                onChange={() => handleViewModeChange('three_lines')}
                className="accent-[#2481cc]"
              />
              <span className="font-semibold text-white">{isArabic ? 'ثلاثة خطوط (3 lines)' : 'Three lines'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. PRIVACY & SECURITY VIEW (Screenshot 10)
// ==========================================
const PrivacySecurityView: React.FC<{
  onBack: () => void;
  onSelectPrivacyTarget: (target: PrivacyTarget) => void;
}> = ({ onBack, onSelectPrivacyTarget }) => {
  const { settings, showToast, setSettingsSubPage } = useTelegram();
  const isArabic = settings.language === 'ar';
  const [twoStepState, setTwoStepState] = useState(twoStepController.getState());
  const [privacyState, setPrivacyState] = useState(privacyController.getState());

  useEffect(() => {
    twoStepController.getPassword().then(() => {
      setTwoStepState(twoStepController.getState());
    }).catch(() => {});

    privacyController.loadPrivacySettings().then((s) => {
      setPrivacyState({ ...s });
    }).catch(() => {});

    privacyController.loadAuthorizations().then(() => {
      setPrivacyState(privacyController.getState());
    }).catch(() => {});
  }, []);

  const getOptionLabel = (opt: string) => {
    if (opt === 'everybody') return isArabic ? 'الجميع' : 'Everybody';
    if (opt === 'contacts') return isArabic ? 'جهات اتصالي' : 'My Contacts';
    return isArabic ? 'لا أحد' : 'Nobody';
  };

  const getAutoDeleteLabel = (sec: number) => {
    if (sec === 86400) return isArabic ? 'يوم واحد' : '1 day';
    if (sec === 604800) return isArabic ? 'أسبوع واحد' : '1 week';
    if (sec === 2592000) return isArabic ? 'شهر واحد' : '1 month';
    return isArabic ? 'معطلة' : 'Off';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'الخصوصية والأمان' : 'Privacy and Security'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Security Group */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3 text-[11px] font-bold text-[#5288c1] uppercase">{isArabic ? 'الأمان' : 'Security'}</div>

          <SecurityRow
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            title={isArabic ? 'التحقق بخطوتين' : 'Two-Step Verification'}
            value={twoStepState.hasPassword ? (isArabic ? 'مفعّل' : 'On') : (isArabic ? 'معطّل' : 'Off')}
            onClick={() => setSettingsSubPage('two_step_verification')}
          />
          <SecurityRow
            icon={<Clock className="w-5 h-5 text-cyan-400" />}
            title={isArabic ? 'الحذف التلقائي للرسائل' : 'Auto-Delete Messages'}
            value={getAutoDeleteLabel(privacyState.autoDeletePeriod)}
            onClick={() => setSettingsSubPage('auto_delete')}
          />
          <SecurityRow
            icon={<Lock className="w-5 h-5 text-cyan-400" />}
            title={isArabic ? 'رمز القفل' : 'Passcode Lock'}
            value={privacyState.passcodeEnabled ? (isArabic ? 'مفعّل' : 'On') : (isArabic ? 'معطلة' : 'Off')}
            onClick={() => setSettingsSubPage('passcode_lock')}
          />
          <SecurityRow
            icon={<Mail className="w-5 h-5 text-teal-400" />}
            title={isArabic ? 'بريد تسجيل الدخول' : 'Login Email'}
            value={twoStepState.emailPattern || privacyState.loginEmail || (isArabic ? 'غير مضبوط' : 'Not set')}
            onClick={() => showToast(`${isArabic ? 'بريد تسجيل الدخول:' : 'Login email:'} ${twoStepState.emailPattern || privacyState.loginEmail || 'None'}`, '📧')}
          />
          <SecurityRow
            icon={<Ban className="w-5 h-5 text-rose-400" />}
            title={isArabic ? 'المستخدمون المحظورون' : 'Blocked Users'}
            value={String(privacyState.blockedUsersCount)}
            onClick={() => setSettingsSubPage('blocked_users')}
          />
          <SecurityRow
            icon={<MonitorSmartphone className="w-5 h-5 text-sky-400" />}
            title={isArabic ? 'الجلسات النشطة' : 'Active Sessions'}
            value={String(privacyState.activeSessionsCount || privacyState.sessions?.length || 1)}
            onClick={() => setSettingsSubPage('sessions')}
          />
        </div>

        {/* Privacy Group */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3 text-[11px] font-bold text-[#5288c1] uppercase">{isArabic ? 'الخصوصية' : 'Privacy'}</div>
          <SecurityRow
            title={isArabic ? 'رقم الهاتف' : 'Phone Number'}
            value={getOptionLabel(privacyState.phoneNumber)}
            onClick={() => onSelectPrivacyTarget('phone_number')}
          />
          <SecurityRow
            title={isArabic ? 'آخر ظهور ومتصل' : 'Last Seen & Online'}
            value={getOptionLabel(privacyState.lastSeen)}
            onClick={() => onSelectPrivacyTarget('last_seen')}
          />
          <SecurityRow
            title={isArabic ? 'الصور الشخصية' : 'Profile Photos'}
            value={getOptionLabel(privacyState.profilePhotos)}
            onClick={() => onSelectPrivacyTarget('profile_photos')}
          />
          <SecurityRow
            title={isArabic ? 'الرسائل المحوّلة' : 'Forwarded Messages'}
            value={getOptionLabel(privacyState.forwards)}
            onClick={() => onSelectPrivacyTarget('forwards')}
          />
          <SecurityRow
            title={isArabic ? 'المكالمات' : 'Calls'}
            value={getOptionLabel(privacyState.calls)}
            onClick={() => onSelectPrivacyTarget('calls')}
          />
        </div>
      </div>
    </div>
  );
};

const SecurityRow: React.FC<{
  icon?: React.ReactNode;
  title: string;
  value: string;
  onClick: () => void;
}> = ({ icon, title, value, onClick }) => (
  <div
    onClick={onClick}
    className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-xs font-semibold text-white">{title}</span>
    </div>
    <span className="text-xs text-[#5288c1] font-mono">{value}</span>
  </div>
);

// ==========================================
// 7. NOTIFICATIONS & SOUNDS VIEW (Screenshot 11)
// ==========================================
const NotificationsSoundsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, showToast, triggerNotification, fcmDiagnostic, setSettingsSubPage, activeChatId } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [privateChats, setPrivateChats] = useState(true);
  const [groups, setGroups] = useState(true);
  const [channels, setChannels] = useState(true);
  const [inAppSounds, setInAppSounds] = useState(true);
  const [inAppVibrate, setInAppVibrate] = useState(true);

  const handleToggleNotify = async (peerType: 'users' | 'chats' | 'broadcasts', enable: boolean) => {
    if (peerType === 'users') setPrivateChats(enable);
    if (peerType === 'chats') setGroups(enable);
    if (peerType === 'broadcasts') setChannels(enable);

    const activeSession = typeof window !== 'undefined' ? (localStorage.getItem('tg_session_string') || '') : '';
    if (!activeSession) return;

    try {
      await fetch('/api/telegram/account/notify-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionString: activeSession,
          peerType,
          muteUntil: enable ? 0 : 2147483647,
          showPreviews: true,
          silent: !enable,
        }),
      });
      showToast(isArabic ? 'تم تحديث إعدادات الإشعارات في تيليجرام' : 'Notification settings synced with Telegram', '🔔');
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'الإشعارات والأصوات' : 'Notifications and Sounds'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* FCM Push Notification Diagnostic Hub Card */}
        <div className="bg-[#17212b] rounded-2xl border border-[#5288c1]/30 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {isArabic ? 'نظام تشخيص الإشعارات (FCM Diagnostics)' : 'FCM Push Notification Hub'}
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                fcmDiagnostic.status === 'connected' || fcmDiagnostic.status === 'listening'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {fcmDiagnostic.status}
            </span>
          </div>

          <div className="text-xs text-gray-300 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{isArabic ? 'المحادثة النشطة المربوطة:' : 'Active dialog_id:'}</span>
              <span className="font-mono text-[#5288c1] font-bold">{activeChatId || (isArabic ? 'لا توجد (الخلفية)' : 'None (Inbox)')}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{isArabic ? 'آخر حزمة مستلمة:' : 'Last Push Packet:'}</span>
              <span className="font-mono text-emerald-400">
                {fcmDiagnostic.lastReceivedPacket ? `${fcmDiagnostic.lastReceivedPacket.title} (${fcmDiagnostic.lastReceivedPacket.status})` : isArabic ? 'بانتظار وصول حزمة' : 'Listening...'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setSettingsSubPage('fcm_diagnostics')}
            className="w-full py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] active:bg-[#195a88] rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Radio className="w-4 h-4" />
            <span>{isArabic ? 'فتح لوحة التشخيص ومراقبة الحزم (FCM Logs)' : 'Open FCM Diagnostics & Log Viewer'}</span>
          </button>
        </div>

        {/* Chat Notifications */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3 text-[11px] font-bold text-[#5288c1] uppercase">{isArabic ? 'إشعارات المحادثات' : 'Chat Notifications'}</div>
          <ToggleRow title={isArabic ? 'المحادثات الخاصة' : 'Private Chats'} checked={privateChats} onChange={(v) => handleToggleNotify('users', v)} />
          <ToggleRow title={isArabic ? 'المجموعات' : 'Groups'} checked={groups} onChange={(v) => handleToggleNotify('chats', v)} />
          <ToggleRow title={isArabic ? 'القنوات' : 'Channels'} checked={channels} onChange={(v) => handleToggleNotify('broadcasts', v)} />
        </div>

        {/* In-App Notifications */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3 text-[11px] font-bold text-[#5288c1] uppercase">{isArabic ? 'إشعارات داخل التطبيق' : 'In-App Notifications'}</div>
          <ToggleRow title={isArabic ? 'أصوات داخل التطبيق' : 'In-App Sounds'} checked={inAppSounds} onChange={setInAppSounds} />
          <ToggleRow title={isArabic ? 'اهتزازات داخل التطبيق' : 'In-App Vibrate'} checked={inAppVibrate} onChange={setInAppVibrate} />
        </div>

        {/* Test Notification Trigger */}
        <button
          onClick={() => {
            triggerNotification({
              category: 'message',
              title: isArabic ? 'منار. العنزي' : 'Manar Al-Anzi',
              body: isArabic ? 'تم تحديث كافة الأيقونات والترتيب بنجاح 🚀' : 'All icons and order updated flawlessly 🚀',
              senderName: 'System',
              avatar: '',
            });
            showToast(isArabic ? 'تم إرسال إشعار تجريبي' : 'Test notification fired', '🔔');
          }}
          className="w-full py-3 bg-[#2481cc]/80 hover:bg-[#2481cc] rounded-xl text-xs font-bold text-white transition-colors"
        >
          {isArabic ? 'تجربة إشعار داخلي (In-App Preview)' : 'Test In-App Notification'}
        </button>
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ title, checked, onChange }) => (
  <div className="px-4 py-3 flex items-center justify-between">
    <span className="text-xs font-semibold text-white">{title}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-5 h-5 accent-[#2481cc] cursor-pointer"
    />
  </div>
);

// ==========================================
// 8. DATA & STORAGE VIEW (Screenshot 12)
// ==========================================
const DataStorageView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [searchFilter, setSearchFilter] = useState('');
  const [storageTab, setStorageTab] = useState<'all' | 'cache' | 'network' | 'media'>('all');
  const [cacheSizeMB, setCacheSizeMB] = useState(586.4);
  const [dbSizeMB, setDbSizeMB] = useState(142.8);
  const [mediaAutoMobile, setMediaAutoMobile] = useState(true);
  const [mediaAutoWifi, setMediaAutoWifi] = useState(true);
  const [mediaAutoRoaming, setMediaAutoRoaming] = useState(false);

  const handleClearCache = () => {
    setCacheSizeMB(0);
    showToast(isArabic ? 'تم تنظيف ذاكرة التخزين المؤقت بنجاح (0.0 MB)' : 'Cache cleared successfully (0.0 MB)', '🧹');
  };

  const sections = [
    {
      id: 'storage_usage',
      title: isArabic ? 'استخدام التخزين والقرص' : 'Storage & Disk Usage',
      category: 'cache',
      items: [
        { label: isArabic ? 'ذاكرة التخزين المؤقت (Cache)' : 'Cache Files', val: `${cacheSizeMB.toFixed(1)} MB`, icon: PieChart, color: 'text-sky-400', action: handleClearCache, actionLabel: isArabic ? 'مسح الذاكرة' : 'Clear Cache' },
        { label: isArabic ? 'قاعدة بيانات المحادثات (MTProto MMAP)' : 'Chat Database', val: `${dbSizeMB.toFixed(1)} MB`, icon: HardDrive, color: 'text-indigo-400' },
      ]
    },
    {
      id: 'network_usage',
      title: isArabic ? 'استهلاك الشبكة والبيانات' : 'Network & Data Usage',
      category: 'network',
      items: [
        { label: isArabic ? 'بيانات الهاتف المحمول (Cellular)' : 'Cellular Data', val: '430.2 MB', icon: BarChart2, color: 'text-emerald-400' },
        { label: isArabic ? 'شبكات الواي فاي (Wi-Fi)' : 'Wi-Fi Data', val: '450.7 MB', icon: Wifi, color: 'text-cyan-400' },
        { label: isArabic ? 'أثناء التجوال (Roaming)' : 'Roaming Data', val: '0.0 KB', icon: Globe, color: 'text-amber-400' },
      ]
    },
    {
      id: 'auto_download',
      title: isArabic ? 'تنزيل الوسائط تلقائيًا' : 'Automatic Media Download',
      category: 'media',
      toggles: [
        { title: isArabic ? 'عند استخدام بيانات الجوال (الصور، المقاطع حتى 10MB)' : 'When using mobile data (Photos, Videos up to 10MB)', checked: mediaAutoMobile, onChange: setMediaAutoMobile },
        { title: isArabic ? 'عند الاتصال بالواي فاي (كافة الوسائط حتى 15MB)' : 'When connected to Wi-Fi (All media up to 15MB)', checked: mediaAutoWifi, onChange: setMediaAutoWifi },
        { title: isArabic ? 'أثناء التجوال الدولي (معطل افتراضيًا)' : 'When roaming (Disabled by default)', checked: mediaAutoRoaming, onChange: setMediaAutoRoaming },
      ]
    }
  ];

  const filteredSections = sections.filter((sec) => {
    if (storageTab !== 'all' && sec.category !== storageTab) return false;
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.items?.some(it => it.label.toLowerCase().includes(q)) ||
      sec.toggles?.some(tg => tg.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'البيانات والتخزين' : 'Data and Storage'} onBack={onBack} />

      {/* Search & Filter Bar */}
      <div className="p-3 bg-[#17212b] border-b border-white/10 space-y-2 shrink-0">
        <div className="flex items-center gap-2 bg-[#0e1621] px-3 py-2 rounded-xl border border-white/5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={isArabic ? 'بحث في إعدادات التخزين والبيانات...' : 'Search storage & network settings...'}
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="p-1 hover:bg-white/10 rounded-full text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {[
            { id: 'all', label: isArabic ? 'الكل' : 'All' },
            { id: 'cache', label: isArabic ? 'التخزين والمؤقت' : 'Cache' },
            { id: 'network', label: isArabic ? 'الشبكة' : 'Network' },
            { id: 'media', label: isArabic ? 'التنزيل التلقائي' : 'Auto-Download' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStorageTab(tab.id as any)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                storageTab === tab.id
                  ? 'bg-[#2481cc] text-white shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredSections.map((sec) => (
          <div key={sec.id} className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
            <div className="p-3 text-[11px] font-bold text-[#5288c1] uppercase">{sec.title}</div>

            {sec.items?.map((it, idx) => {
              const Icon = it.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (it.action) {
                      it.action();
                    } else {
                      showToast(`${it.label}: ${it.val}`, '📊');
                    }
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 ${it.color} shrink-0`} />
                    <span className="text-xs font-bold text-white truncate">{it.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-semibold text-gray-300">{it.val}</span>
                    {it.actionLabel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          it.action?.();
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all"
                      >
                        {it.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {sec.toggles?.map((tg, idx) => (
              <ToggleRow
                key={idx}
                title={tg.title}
                checked={tg.checked}
                onChange={tg.onChange}
              />
            ))}
          </div>
        ))}

        {/* Storage Reset Option */}
        <div className="p-3 bg-[#17212b] rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-400">{isArabic ? 'إعادة ضبط إحصائيات الشبكة' : 'Reset Network Statistics'}</div>
            <div className="text-[11px] text-gray-400">{isArabic ? 'مسح عدادات البيانات المرسلة والمستقبلة' : 'Clear all network bandwidth counters'}</div>
          </div>
          <button
            onClick={() => showToast(isArabic ? 'تمت إعادة ضبط إحصائيات البيانات بنجاح' : 'Network statistics reset', '🔄')}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-lg transition-colors"
          >
            {isArabic ? 'إعادة ضبط' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. POWER SAVING VIEW (Screenshot 13)
// ==========================================
const PowerSavingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const [sliderVal, setSliderVal] = useState(10);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'توفير الطاقة' : 'Power Saving'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Slider */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white">{isArabic ? 'وضع توفير الطاقة' : 'Power Saving Mode'}</span>
            <span className="text-amber-400 font-mono">{sliderVal}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={(e) => setSliderVal(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="text-[11px] text-gray-400">
            {isArabic ? 'يتم تقليل الحركات وتأثيرات الملصقات عند انخفاض البطارية' : 'Reduces animations and lottie stickers when battery is low'}
          </div>
        </div>

        {/* Switches */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="p-3 text-[11px] font-bold text-[#5288c1] uppercase">{isArabic ? 'خيارات توفير الطاقة' : 'Power Saving Options'}</div>
          <ToggleRow title={isArabic ? 'الملصقات المتحركة (Animated Stickers)' : 'Animated Stickers'} checked={true} onChange={() => {}} />
          <ToggleRow title={isArabic ? 'الرموز التعبيرية المتحركة (Animated Emoji)' : 'Animated Emoji'} checked={true} onChange={() => {}} />
          <ToggleRow title={isArabic ? 'التأثيرات في المحادثات (Chat Effects)' : 'Chat Effects'} checked={true} onChange={() => {}} />
          <ToggleRow title={isArabic ? 'تشغيل تلقائي للصور المتحركة (Autoplay GIFs)' : 'Autoplay GIFs'} checked={true} onChange={() => {}} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 10. LANGUAGE VIEW (Screenshot 14)
// ==========================================
const LanguageView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, updateSettings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  const expandedLanguages = [
    { code: 'ar', name: 'العربية', native: 'Arabic', flag: '🇸🇦', region: 'الشرق الأوسط' },
    { code: 'en', name: 'English', native: 'English (US)', flag: '🇺🇸', region: 'International' },
    { code: 'ru', name: 'Русский', native: 'Russian', flag: '🇷🇺', region: 'Восточная Европа' },
    { code: 'es', name: 'Español', native: 'Spanish', flag: '🇪🇸', region: 'España / América' },
    { code: 'fr', name: 'Français', native: 'French', flag: '🇫🇷', region: 'France / Europe' },
    { code: 'de', name: 'Deutsch', native: 'German', flag: '🇩🇪', region: 'Deutschland' },
    { code: 'tr', name: 'Türkçe', native: 'Turkish', flag: '🇹🇷', region: 'Türkiye' },
    { code: 'fa', name: 'فارسی', native: 'Persian', flag: '🇮🇷', region: 'ایران' },
    { code: 'pt', name: 'Português', native: 'Portuguese (Brasil)', flag: '🇧🇷', region: 'Brasil / Portugal' },
    { code: 'it', name: 'Italiano', native: 'Italian', flag: '🇮🇹', region: 'Italia' },
    { code: 'id', name: 'Bahasa Indonesia', native: 'Indonesian', flag: '🇮🇩', region: 'Indonesia' },
    { code: 'ms', name: 'Bahasa Melayu', native: 'Malay', flag: '🇲🇾', region: 'Malaysia' },
    { code: 'nl', name: 'Nederlands', native: 'Dutch', flag: '🇳🇱', region: 'Nederland' },
    { code: 'pl', name: 'Polski', native: 'Polish', flag: '🇵🇱', region: 'Polska' },
    { code: 'uk', name: 'Українська', native: 'Ukrainian', flag: '🇺🇦', region: 'Україна' },
    { code: 'hi', name: 'हिन्दी', native: 'Hindi', flag: '🇮🇳', region: 'भारत' },
    { code: 'ur', name: 'اردو', native: 'Urdu', flag: '🇵🇰', region: 'پاکستان' },
    { code: 'ku', name: 'Kurdî / کوردی', native: 'Kurdish', flag: '☀️', region: 'کوردستان' },
    { code: 'uz', name: 'O‘zbekcha', native: 'Uzbek', flag: '🇺🇿', region: 'Oʻzbekiston' },
    { code: 'kk', name: 'Қазақша', native: 'Kazakh', flag: '🇰🇿', region: 'Қазақстан' },
    { code: 'zh', name: '简体中文', native: 'Chinese (Simplified)', flag: '🇨🇳', region: '中国' },
    { code: 'ja', name: '日本語', native: 'Japanese', flag: '🇯🇵', region: '日本' },
    { code: 'ko', name: '한국어', native: 'Korean', flag: '🇰🇷', region: '대한민국' },
    { code: 'vi', name: 'Tiếng Việt', native: 'Vietnamese', flag: '🇻🇳', region: 'Việt Nam' },
  ];

  const filteredLanguages = expandedLanguages.filter((lang) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.native.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q) ||
      lang.region.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'اللغة' : 'Language'} onBack={onBack} />

      {/* Language Search Bar */}
      <div className="p-3 bg-[#17212b] border-b border-white/10 space-y-2 shrink-0">
        <div className="flex items-center gap-2 bg-[#0e1621] px-3 py-2 rounded-xl border border-white/5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            id="tg-language-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث عن لغة (مثال: عربي، English، Français)...' : 'Search languages...'}
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 font-mono">
          <span>{isArabic ? `${filteredLanguages.length} لغة متطابقة` : `${filteredLanguages.length} languages matching`}</span>
          <span className="text-[#5288c1] font-semibold">{isArabic ? `الحالية: ${settings.language.toUpperCase()}` : `Current: ${settings.language.toUpperCase()}`}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Translation Settings */}
        <div className="p-4 bg-[#17212b] rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white">{isArabic ? 'ترجمة الرسائل' : 'Translate Messages'}</div>
            <div className="text-[11px] text-gray-400">{isArabic ? 'إظهار زر الترجمة الفورية في شريط الرسائل' : 'Show instantaneous Translate button in chats'}</div>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2481cc] cursor-pointer" />
        </div>

        {/* Languages List */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {filteredLanguages.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              {isArabic ? 'لم يتم العثور على لغة مطابقة للبحث' : 'No matching languages found'}
            </div>
          ) : (
            filteredLanguages.map((lang) => {
              const isSelected = settings.language === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => {
                    updateSettings({ language: lang.code as any });
                    showToast(
                      isArabic ? `تم ضبط لغة التطبيق: ${lang.name}` : `App language set to: ${lang.name}`,
                      '🌐'
                    );
                  }}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2481cc]/15' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0 select-none">{lang.flag}</span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{lang.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-mono font-normal">
                          {lang.code.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {lang.native} • <span className="text-gray-500">{lang.region}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#2481cc] flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 11. DEVICES VIEW (Screenshot 15)
// ==========================================
const DevicesView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings, showToast } = useTelegram();
  const isArabic = settings.language === 'ar';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'الأجهزة' : 'Devices'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
        <div className="p-6 bg-[#17212b] rounded-2xl border border-white/10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#2481cc]/20 flex items-center justify-center text-[#2481cc] mb-3">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-white mb-1">
            {isArabic ? 'ربط جهاز حاسوب أو ويب' : 'Link Desktop or Web Device'}
          </div>
          <div className="text-xs text-gray-400 max-w-xs mb-4">
            {isArabic
              ? 'تسجيل الدخول في تيليجرام سطح المكتب أو ويب عبر مسح رمز QR'
              : 'Scan QR code to log into Telegram Desktop or Web'}
          </div>
          <button
            onClick={() => showToast('Camera QR scanner opened', '📷')}
            className="px-6 py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span>{isArabic ? 'إضافة جهاز' : 'Link Device'}</span>
          </button>
        </div>

        {/* Current Device */}
        <div className="bg-[#17212b] rounded-2xl border border-white/10 p-4 text-left rtl:text-right space-y-1">
          <div className="text-[11px] font-bold text-[#5288c1] uppercase">{isArabic ? 'هذا الجهاز' : 'This Device'}</div>
          <div className="flex items-center gap-3 pt-2">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">Telegram for Android 12.9.2</div>
              <div className="text-[11px] text-gray-400">Online • Universal arm64-v8a</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 12. FOLDERS / CATEGORIES VIEW
// ==========================================
const FoldersView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { folders, showToast, settings, createChatFolder } = useTelegram();
  const isArabic = settings.language === 'ar';

  const [isCreating, setIsCreating] = useState(false);
  const [folderTitle, setFolderTitle] = useState('');
  const [filterContacts, setFilterContacts] = useState(true);
  const [filterNonContacts, setFilterNonContacts] = useState(false);
  const [filterGroups, setFilterGroups] = useState(true);
  const [filterChannels, setFilterChannels] = useState(true);
  const [filterBots, setFilterBots] = useState(false);
  const [excludeMuted, setExcludeMuted] = useState(false);
  const [excludeArchived, setExcludeArchived] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderTitle.trim()) {
      showToast(isArabic ? 'يرجى إدخال اسم المجلد' : 'Please enter folder name', '⚠️');
      return;
    }
    setIsSubmitting(true);
    try {
      await createChatFolder({
        title: folderTitle.trim(),
        contacts: filterContacts,
        nonContacts: filterNonContacts,
        groups: filterGroups,
        broadcasts: filterChannels,
        bots: filterBots,
        excludeMuted,
        excludeArchived,
      });
      setIsCreating(false);
      setFolderTitle('');
    } catch (err: any) {
      showToast(isArabic ? 'فشل إنشاء المجلد' : 'Failed to create folder', '❌');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'مجلدات المحادثات' : 'Chat Folders'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-[#17212b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {folders.map((f) => (
            <div key={f.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-[#5288c1]" />
                <div>
                  <div className="text-xs font-bold text-white">{isArabic ? f.nameAr : f.name}</div>
                  <div className="text-[11px] text-gray-400">{f.id === 'all' ? 'All chats included' : 'Filtered category'}</div>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {f.id === 'all' ? 'Default' : 'Active'}
              </span>
            </div>
          ))}
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateFolder} className="bg-[#17212b] rounded-2xl border border-white/10 p-4 space-y-3">
            <div className="text-xs font-bold text-white mb-1">
              {isArabic ? 'إنشاء مجلد جديد في تيليجرام' : 'Create Telegram Chat Folder'}
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                {isArabic ? 'اسم المجلد' : 'Folder Name'}
              </label>
              <input
                type="text"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
                placeholder={isArabic ? 'مثال: العمل، القنوات، العائلة...' : 'e.g. Work, Channels, Family...'}
                className="w-full px-3 py-2 bg-[#0e1621] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5288c1]"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-gray-300">
                {isArabic ? 'المحادثات المضمنة:' : 'Included Chats:'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterContacts}
                    onChange={(e) => setFilterContacts(e.target.checked)}
                    className="accent-[#5288c1] rounded"
                  />
                  <span>{isArabic ? 'جهات الاتصال' : 'Contacts'}</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterNonContacts}
                    onChange={(e) => setFilterNonContacts(e.target.checked)}
                    className="accent-[#5288c1] rounded"
                  />
                  <span>{isArabic ? 'غير جهات الاتصال' : 'Non-Contacts'}</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterGroups}
                    onChange={(e) => setFilterGroups(e.target.checked)}
                    className="accent-[#5288c1] rounded"
                  />
                  <span>{isArabic ? 'المجموعات' : 'Groups'}</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterChannels}
                    onChange={(e) => setFilterChannels(e.target.checked)}
                    className="accent-[#5288c1] rounded"
                  />
                  <span>{isArabic ? 'القنوات' : 'Channels'}</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterBots}
                    onChange={(e) => setFilterBots(e.target.checked)}
                    className="accent-[#5288c1] rounded"
                  />
                  <span>{isArabic ? 'البوتات' : 'Bots'}</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
              >
                {isSubmitting
                  ? (isArabic ? 'جاري الحفظ بالسحابة...' : 'Saving to Cloud...')
                  : (isArabic ? 'حفظ وإنشاء في تيليجرام' : 'Save & Create Folder')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-xl transition-colors"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full py-3 bg-[#2481cc] hover:bg-[#1f6fa8] text-white text-xs font-bold rounded-xl transition-colors"
          >
            {isArabic ? '+ إنشاء مجلد جديد' : '+ Create New Folder'}
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 13. THEMES BROWSER & SUPPORT GROUP & FAQ
// ==========================================
const ThemesBrowserView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { showToast, settings } = useTelegram();
  const isArabic = settings.language === 'ar';

  const themes = [
    { name: 'DrKLO Official Dark', author: 'Telegram Devs', downloads: '1.2M', color: '#17212b' },
    { name: 'Plus Cyberpunk Neo', author: 'Plus Team', downloads: '840K', color: '#0f172a' },
    { name: 'Emerald Forest Clean', author: 'ThemeStudio', downloads: '420K', color: '#064e3b' },
    { name: 'Midnight Violet Glass', author: 'Apex Dev', downloads: '310K', color: '#3b0764' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'تنزيل أنماط' : 'Download Themes'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {themes.map((t, i) => (
          <div key={i} className="p-3.5 bg-[#17212b] rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-white/20" style={{ backgroundColor: t.color }} />
              <div>
                <div className="text-xs font-bold text-white">{t.name}</div>
                <div className="text-[11px] text-gray-400">{t.author} • {t.downloads} downloads</div>
              </div>
            </div>
            <button
              onClick={() => showToast(`Applied ${t.name}`, '🎨')}
              className="px-3 py-1.5 bg-[#2481cc] hover:bg-[#1f6fa8] text-white text-xs font-bold rounded-lg"
            >
              {isArabic ? 'تطبيق' : 'Apply'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SupportGroupView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { showToast, settings } = useTelegram();
  const isArabic = settings.language === 'ar';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'مجموعة الدعم' : 'Support Group'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#2481cc]/20 flex items-center justify-center text-[#2481cc]">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="text-base font-bold text-white">
          {isArabic ? 'مجموعة الدعم الرسمي والتطوير' : 'Official Support & Dev Group'}
        </div>
        <div className="text-xs text-gray-400 max-w-sm">
          {isArabic
            ? 'انضم لمجتمع مطوري تيليجرام لمناقشة أحدث ميزات MTProto ومستودع DrKLO/Telegram'
            : 'Join the Telegram community to discuss MTProto features and repository enhancements'}
        </div>
        <button
          onClick={() => showToast('Joined Support Group', '👥')}
          className="px-6 py-2.5 bg-[#2481cc] hover:bg-[#1f6fa8] text-white text-xs font-bold rounded-xl"
        >
          {isArabic ? 'الانضمام للمجموعة (@tg_support)' : 'Join Group (@tg_support)'}
        </button>
      </div>
    </div>
  );
};

const FaqView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings } = useTelegram();
  const isArabic = settings.language === 'ar';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'الأسئلة الشائعة' : 'Telegram FAQ'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          { q: 'ما هو تيليجرام؟', a: 'تيليجرام هو تطبيق مراسلة يركز على السرعة والأمان، متزامن عبر كافة الأجهزة.' },
          { q: 'ما هو بروتوكول MTProto 2.0؟', a: 'بروتوكول تشفير متقدم مخصص لسرعة نقل البيانات مع خوادم التوزيع السحابي.' },
          { q: 'كيف أقوم بتبديل الحسابات؟', a: 'انقر على سهم الحسابات في درج التصفح لاختيار أي حساب مسجل أو إضافة حساب جديد.' },
        ].map((item, i) => (
          <div key={i} className="p-3.5 bg-[#17212b] rounded-2xl border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white">{item.q}</div>
            <div className="text-xs text-gray-400">{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FeaturesView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { settings } = useTelegram();
  const isArabic = settings.language === 'ar';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0e1621]">
      <SubPageHeader title={isArabic ? 'ميزات تيليجرام' : 'Telegram Features'} onBack={onBack} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          'محادثات مشفرة ومكالمات P2P فائقة النقاء',
          'مجلدات وتصنيفات غير محدودة لتنظيم جهات الاتصال',
          'دعم الملصقات المتحركة بنظام Lottie المتطور',
          'مزامنة سحابية فورية وتخزين دائم في الرسائل المحفوظة',
        ].map((feat, i) => (
          <div key={i} className="p-3.5 bg-[#17212b] rounded-2xl border border-white/10 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-gray-200 font-medium">{feat}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sub-Page Header Helper
const SubPageHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => {
  const { settings } = useTelegram();
  const isArabic = settings.language === 'ar';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-[#2481cc] text-white shrink-0 shadow-md">
      <button
        onClick={onBack}
        className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
        title={isArabic ? 'رجوع' : 'Back'}
      >
        <BackIcon className="w-5 h-5" />
      </button>
      <span className="font-bold text-base">{title}</span>
    </div>
  );
};
