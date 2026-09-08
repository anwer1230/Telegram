import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  X,
  ArrowLeft,
  Edit3,
  Download,
  Radio,
  Link2,
  MoreVertical,
  Zap,
  Bell,
  Smartphone,
  LayoutList,
  ShieldAlert,
  CameraOff,
  Send,
  Layers,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export const ChatListHeader: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchFilter,
    setSearchFilter,
    isSearchActive,
    setIsSearchActive,
    chatsWithDraftsCount,
    setIsDrawerOpen,
    setActiveModal,
    resolveTelegramLink,
    settings,
    updateSettings,
    showToast,
    autoJoinLinksEnabled,
    capturedLinks,
    isSyncing,
    triggerScreenshotBlocked,
  } = useTelegram();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isArabic = settings.language === 'ar';
  const isSearchMode = isSearchActive || !!searchQuery.trim() || searchFilter !== 'all';
  const isLinkSearch =
    searchQuery.startsWith('@') ||
    searchQuery.startsWith('t.me') ||
    searchQuery.startsWith('https://t.me') ||
    searchQuery.startsWith('+');

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      resolveTelegramLink(searchQuery.trim());
    }
  };

  const handleCloseSearch = () => {
    setSearchQuery('');
    setSearchFilter('all');
    setIsSearchActive(false);
  };

  const isThreeLines = settings.chatListViewMode === 'three_lines';

  const toggleChatListViewMode = () => {
    const nextMode = isThreeLines ? 'two_lines' : 'three_lines';
    updateSettings({ chatListViewMode: nextMode });
    showToast(
      nextMode === 'three_lines'
        ? (isArabic ? 'تم تفعيل نمط القائمة: 3 أسطر' : 'Chat List View: 3 Lines')
        : (isArabic ? 'تم تفعيل نمط القائمة: سطرين' : 'Chat List View: 2 Lines'),
      '📋'
    );
  };

  return (
    <div
      id="tg-chat-list-header"
      className="flex flex-col border-b select-none shrink-0"
      style={{
        backgroundColor: 'var(--tg-theme-surface)',
        borderColor: 'var(--tg-theme-border)',
      }}
    >
      {/* Top Brand Gradient Accent Bar (#8A2BE2 to #FF69B4) */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#8A2BE2] via-[#d946ef] to-[#FF69B4] shrink-0" />

      {/* Official Telegram Android Action Bar (56px standard) with subtle gradient hue */}
      <div className="h-14 px-2 flex items-center justify-between gap-1 relative bg-gradient-to-r from-[#8A2BE2]/10 via-transparent to-[#FF69B4]/10">
        {isSearchMode ? (
          /* Search Mode (ActionBarSearchItem) */
          <div className="flex items-center w-full gap-2 px-1 animate-in fade-in duration-150">
            <button
              id="tg-search-back-btn"
              onClick={handleCloseSearch}
              className="p-2 rounded-full hover:bg-white/10 text-gray-300 transition-colors shrink-0"
              title={isArabic ? 'إلغاء البحث' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>

            <div className="relative flex-1 flex items-center">
              <input
                ref={searchInputRef}
                id="tg-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  searchFilter === 'drafts'
                    ? (isArabic ? 'بحث داخل المسودات غير المرسلة...' : 'Search within unsent drafts...')
                    : (isArabic
                        ? 'بحث، أو رابط t.me/+ أو @معرف...'
                        : 'Search, or paste t.me/link or @handle...')
                }
                className="w-full py-1.5 px-3 text-sm rounded-full bg-black/20 focus:bg-black/30 focus:outline-none border border-transparent focus:border-[#2481cc]/50 text-white placeholder-gray-400 transition-all"
              />
              {searchQuery && (
                <button
                  id="tg-clear-search-button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-200 rtl:right-auto rtl:left-2.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Normal Action Bar Mode */
          <>
            {/* Left: Hamburger Menu + Brand Title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                id="tg-menu-button"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2.5 rounded-full hover:bg-white/10 active:bg-white/15 text-gray-300 transition-colors shrink-0"
                title={isArabic ? 'القائمة الرئيسية' : 'Main Menu'}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base text-white tracking-tight leading-none">
                  Telegram
                </span>
                <span className="text-[10px] text-sky-400 font-mono mt-0.5 leading-none">
                  {isSyncing ? (isArabic ? 'جاري التحديث...' : 'Updating...') : 'v12.9.2'}
                </span>
              </div>
            </div>

            {/* Right: Actions (Search, Radar, Install, New Chat) */}
            <div className="flex items-center gap-0.5 text-gray-300 shrink-0">
              {/* Quick Unsent Drafts shortcut button if drafts exist */}
              {chatsWithDraftsCount > 0 && (
                <button
                  id="tg-quick-drafts-shortcut"
                  onClick={() => {
                    setIsSearchActive(true);
                    setSearchFilter('drafts');
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all shrink-0 cursor-pointer"
                  title={isArabic ? `عرض ${chatsWithDraftsCount} مسودات غير مرسلة` : `View ${chatsWithDraftsCount} unsent drafts`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline text-[11px]">{isArabic ? 'مسودات' : 'Drafts'}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white leading-tight">
                    {chatsWithDraftsCount}
                  </span>
                </button>
              )}

              {/* Search Button */}
              <button
                id="tg-open-search-btn"
                onClick={() => setIsSearchActive(true)}
                className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 text-gray-300 transition-colors"
                title={isArabic ? 'بحث' : 'Search'}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Radar Live Monitor Button */}
              <button
                id="tg-link-radar-header-btn"
                onClick={() => setActiveModal('link-monitor')}
                className={`p-2 rounded-full transition-colors relative ${
                  autoJoinLinksEnabled
                    ? 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
                title={isArabic ? 'رادار الروابط والانضمام الفوري' : 'Auto-Join & Links Radar'}
              >
                <Radio className={`w-5 h-5 ${autoJoinLinksEnabled ? 'animate-pulse' : ''}`} />
                {capturedLinks.length > 0 && (
                  <span className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              {/* Android Notification Shade Preview Button */}
              <button
                id="tg-android-shade-btn"
                onClick={() => setActiveModal('android-notification-shade' as any)}
                className="p-2 rounded-full text-cyan-400 hover:bg-cyan-500/15 transition-colors relative"
                title={isArabic ? 'شريط إشعارات الجوال الأندرويد (خارج التطبيق)' : 'Android Notification Shade'}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-2 h-2 rounded-full bg-cyan-400" />
              </button>

              {/* Direct APK Install Button */}
              <button
                id="tg-apk-installer-btn"
                onClick={() => setActiveModal('apk-installer')}
                className="p-2 rounded-full text-emerald-400 hover:bg-emerald-500/15 transition-colors hidden sm:flex"
                title={isArabic ? 'تثبيت التطبيق على الجوال' : 'Install App on Phone'}
              >
                <Download className="w-5 h-5" />
              </button>

              {/* New Chat Button */}
              <button
                id="tg-new-chat-button"
                onClick={() => setActiveModal('new-chat')}
                className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 text-[#5288c1] hover:text-[#6499d3] transition-colors"
                title={isArabic ? 'محادثة أو قناة جديدة' : 'New Chat or Channel'}
              >
                <Edit3 className="w-5 h-5" />
              </button>

              {/* More Menu (Dropdown) */}
              <div className="relative">
                <button
                  id="tg-more-header-btn"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-300 transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {isMoreMenuOpen && (
                  <div
                    className="absolute right-0 rtl:right-auto rtl:left-0 top-12 w-64 bg-[#17212b] border border-[#2b394a] rounded-2xl shadow-2xl py-1.5 z-50 text-xs font-semibold text-gray-200 animate-in fade-in zoom-in-95 divide-y divide-white/5"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    <div className="py-1">
                      {/* Fast 2 Lines vs 3 Lines Toggle */}
                      <button
                        id="tg-toggle-list-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChatListViewMode();
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center justify-between text-left rtl:text-right text-amber-300 hover:text-amber-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <LayoutList className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{isArabic ? 'نمط القائمة' : 'Chat List Layout'}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                          {isThreeLines ? (isArabic ? '3 أسطر' : '3 Lines') : (isArabic ? 'سطرين' : '2 Lines')}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveModal('android-notification-shade' as any)}
                        className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-cyan-300 hover:text-cyan-200"
                      >
                        <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{isArabic ? 'شريط إشعارات الجوال (Android UI)' : 'Android Notification Shade'}</span>
                      </button>

                      <button
                        onClick={() => setActiveModal('apk-installer')}
                        className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-200 hover:text-white"
                      >
                        <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{isArabic ? 'تثبيت تطبيق الجوال (APK)' : 'Install Mobile App (APK)'}</span>
                      </button>
                    </div>

                    <div className="py-1">
                      {/* Security & Restricted Testing Controls */}
                      <button
                        onClick={() => {
                          setActiveModal('restricted-content');
                        }}
                        className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-rose-300 hover:text-rose-200"
                      >
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{isArabic ? 'تجربة لافتة المحتوى الحساس والمقيد' : 'Test Restricted Content Modal'}</span>
                      </button>

                      <button
                        onClick={() => {
                          triggerScreenshotBlocked();
                        }}
                        className="w-full px-3.5 py-2.5 hover:bg-white/5 flex items-center gap-2.5 text-left rtl:text-right text-gray-300 hover:text-white"
                      >
                        <CameraOff className="w-4 h-4 text-orange-400 shrink-0" />
                        <span>{isArabic ? 'تجربة حظر لقطات الشاشة (FLAG_SECURE)' : 'Test Screenshot Block Alert'}</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold text-sky-400 font-mono uppercase tracking-wider">
                        {isArabic ? '⚡ أدوات الأتمتة' : '⚡ Automation Suite'}
                      </div>
                      <button
                        onClick={() => setActiveModal('sender')}
                        className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center justify-between text-left rtl:text-right text-gray-200 hover:text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <Send className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{isArabic ? 'الإرسال والمراقبة' : 'Sender & Monitor'}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-sky-500/20 text-sky-300 px-1 rounded font-mono">TLRPC</span>
                      </button>

                      <button
                        onClick={() => setActiveModal('my-messages')}
                        className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center justify-between text-left rtl:text-right text-gray-200 hover:text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{isArabic ? 'رسائلي (سجل الدفعات)' : 'My Messages'}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1 rounded font-mono">BATCH</span>
                      </button>

                      <button
                        onClick={() => setActiveModal('auto-responder')}
                        className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center justify-between text-left rtl:text-right text-gray-200 hover:text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>{isArabic ? 'الردود التلقائية' : 'Auto Responder'}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1 rounded font-mono">AUTO</span>
                      </button>

                      <button
                        onClick={() => setActiveModal('auto-joiner')}
                        className="w-full px-3.5 py-2 hover:bg-white/5 flex items-center justify-between text-left rtl:text-right text-gray-200 hover:text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{isArabic ? 'الانضمام المتقدم' : 'Auto-Joiner'}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">REGEX</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Category Filter Pills (Drafts, Channels, Groups, Bots, Direct) */}
      {isSearchMode && (
        <div
          id="tg-search-filter-pills"
          className="flex items-center gap-1.5 px-2.5 py-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-black/25"
        >
          <button
            id="tg-search-pill-all"
            onClick={() => setSearchFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              searchFilter === 'all'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            {isArabic ? 'الكل' : 'All'}
          </button>

          <button
            id="tg-search-pill-drafts"
            onClick={() => setSearchFilter('drafts')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              searchFilter === 'drafts'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 ring-1 ring-rose-400'
                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{isArabic ? 'المسودات' : 'Drafts'}</span>
            {chatsWithDraftsCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${
                  searchFilter === 'drafts' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'
                }`}
              >
                {chatsWithDraftsCount}
              </span>
            )}
          </button>

          <button
            id="tg-search-pill-channels"
            onClick={() => setSearchFilter('channels')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              searchFilter === 'channels'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            {isArabic ? 'القنوات' : 'Channels'}
          </button>

          <button
            id="tg-search-pill-groups"
            onClick={() => setSearchFilter('groups')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              searchFilter === 'groups'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            {isArabic ? 'المجموعات' : 'Groups'}
          </button>

          <button
            id="tg-search-pill-bots"
            onClick={() => setSearchFilter('bots')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              searchFilter === 'bots'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            {isArabic ? 'البوتات' : 'Bots'}
          </button>

          <button
            id="tg-search-pill-private"
            onClick={() => setSearchFilter('private')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              searchFilter === 'private'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            {isArabic ? 'المحادثات المباشرة' : 'Direct Chats'}
          </button>
        </div>
      )}

      {/* Global Link / Invite Quick Join Action Bar */}
      {isLinkSearch && (
        <div
          onClick={() => resolveTelegramLink(searchQuery.trim())}
          className="mx-2 mb-2 flex items-center justify-between p-2.5 rounded-xl bg-[#2481cc]/20 border border-[#2481cc]/40 text-xs text-sky-300 cursor-pointer hover:bg-[#2481cc]/30 transition-colors animate-in fade-in"
        >
          <div className="flex items-center gap-2 truncate">
            <Link2 className="w-4 h-4 text-[#2481cc] shrink-0" />
            <span className="truncate">
              {isArabic ? 'فتح وانضمام عبر رابط:' : 'Open & Join link:'}{' '}
              <strong className="text-white">{searchQuery}</strong>
            </span>
          </div>
          <span className="font-bold px-2 py-0.5 rounded-md bg-[#2481cc] text-white text-[11px] shrink-0">
            {isArabic ? 'انضمام' : 'Join'}
          </span>
        </div>
      )}
    </div>
  );
};
