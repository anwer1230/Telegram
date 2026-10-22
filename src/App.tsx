/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { telegramService } from './services/telegramService';
import { ChatItem, TelegramUser } from './types/telegram';
import { NavigationDrawer } from './components/NavigationDrawer';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { SettingsModal } from './components/SettingsModal';
import { AccountScreen } from './components/screens/AccountScreen';
import { ThemeColorScreen } from './components/screens/ThemeColorScreen';
import { PlusSettingsScreen } from './components/screens/PlusSettingsScreen';
import { ChatSettingsScreen } from './components/screens/ChatSettingsScreen';
import { PowerUsageScreen } from './components/screens/PowerUsageScreen';
import { DevicesScreen } from './components/screens/DevicesScreen';
import { PrivacyScreen } from './components/screens/PrivacyScreen';
import { DataStorageScreen } from './components/screens/DataStorageScreen';
import { LanguageScreen } from './components/screens/LanguageScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { ChatFoldersScreen } from './components/screens/ChatFoldersScreen';
import { GeneralSettingsScreen } from './components/screens/GeneralSettingsScreen';
import { CloudStatusModal } from './components/screens/CloudStatusModal';
import { AddAccountModal } from './components/AddAccountModal';
import { CacheManagementModal } from './components/screens/CacheManagementModal';
import { KeyboardShortcutsModal } from './components/screens/KeyboardShortcutsModal';
import { NewGroupModal } from './components/modals/NewGroupModal';
import { NewChannelModal } from './components/modals/NewChannelModal';
import { ContactsModal } from './components/modals/ContactsModal';
import { hapticFeedback } from './utils/haptics';
import { notificationService, InAppToast } from './services/notificationService';

type CurrentView = 
  | 'chat' 
  | 'settings' 
  | 'account' 
  | 'plus_settings' 
  | 'theme_color' 
  | 'chat_settings' 
  | 'power_usage' 
  | 'devices' 
  | 'privacy' 
  | 'data_storage' 
  | 'language' 
  | 'notifications'
  | 'chat_folders'
  | 'general_settings';

export default function App() {
  const [currentUser, setCurrentUser] = useState<TelegramUser>(telegramService.getCurrentUser());
  const [chats, setChats] = useState<ChatItem[]>(telegramService.getChats());
  const [activeChat, setActiveChat] = useState<ChatItem | null>(chats[0] || null); // default to Saved Messages
  const [currentView, setCurrentView] = useState<CurrentView>('chat');
  const [viewHistory, setViewHistory] = useState<CurrentView[]>([]);
  
  // Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCloudStatusOpen, setIsCloudStatusOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<InAppToast | null>(null);

  useEffect(() => {
    // Initial theme styling setup
    const theme = telegramService.getThemeSettings();
    telegramService.saveThemeSettings(theme);

    // طلب إذن الإشعارات السحابية رسمياً
    notificationService.requestPermission();

    const unsubscribe = telegramService.subscribe(() => {
      setCurrentUser(telegramService.getCurrentUser());
      setChats(telegramService.getChats());
    });

    const unsubToast = notificationService.subscribeInAppToasts((toast) => {
      setActiveToast(toast);
      setTimeout(() => setActiveToast(null), 4500);
    });

    const handleCustomOpenChat = (e: any) => {
      if (e.detail?.chatId) {
        handleSelectChatById(e.detail.chatId);
      }
    };
    window.addEventListener('tg:open-chat', handleCustomOpenChat);

    return () => {
      unsubscribe();
      unsubToast();
      window.removeEventListener('tg:open-chat', handleCustomOpenChat);
    };
  }, []);

  // التعامل الفعلي مع أزرار الجوال (زر الرجوع في نظام أندرويد والمتصفحات)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      hapticFeedback('light');

      // 1. إذا كانت أي نافذة منبثقة مفتوحة، أغلقها فوراً
      if (isDrawerOpen) { setIsDrawerOpen(false); return; }
      if (isAddAccountOpen) { setIsAddAccountOpen(false); return; }
      if (isCloudStatusOpen) { setIsCloudStatusOpen(false); return; }
      if (isCacheModalOpen) { setIsCacheModalOpen(false); return; }
      if (isShortcutsModalOpen) { setIsShortcutsModalOpen(false); return; }
      if (isNewGroupOpen) { setIsNewGroupOpen(false); return; }
      if (isNewChannelOpen) { setIsNewChannelOpen(false); return; }
      if (isContactsOpen) { setIsContactsOpen(false); return; }

      // 2. إذا كنا داخل شاشة فرعية في الإعدادات، ارجع خطوة للخلف
      if (currentView !== 'chat') {
        navigateBack();
        return;
      }

      // 3. إذا كان المستخدم في الهاتف وداخل محادثة، ارجع لقائمة المحادثات
      if (activeChat) {
        setActiveChat(null);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isDrawerOpen, isAddAccountOpen, isCloudStatusOpen, isCacheModalOpen, 
    isShortcutsModalOpen, isNewGroupOpen, isNewChannelOpen, isContactsOpen, 
    currentView, activeChat, viewHistory
  ]);

  const pushNavigationHistory = () => {
    try {
      window.history.pushState({ app: 'telegram' }, '');
    } catch (e) {}
  };

  const navigateTo = (view: CurrentView) => {
    hapticFeedback('selection');
    pushNavigationHistory();
    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
  };

  const navigateBack = () => {
    hapticFeedback('light');
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory((prevArr) => prevArr.slice(0, -1));
      setCurrentView(prev);
    } else {
      setCurrentView('chat');
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    hapticFeedback('selection');
    pushNavigationHistory();
    setActiveChat(chat);
    setCurrentView('chat');
    setViewHistory([]);
  };

  const handleSelectChatById = (chatId: string) => {
    const found = chats.find(c => c.id === chatId);
    if (found) {
      handleSelectChat(found);
    }
  };

  const handleSwitchAccount = (userId: string) => {
    hapticFeedback('success');
    telegramService.switchAccount(userId);
    setCurrentUser(telegramService.getCurrentUser());
    setChats(telegramService.getChats());
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e1621] text-white relative" dir="rtl">
      {/* Floating In-App Telegram Toast Notification */}
      {activeToast && (
        <div 
          onClick={() => {
            handleSelectChatById(activeToast.chatId);
            setActiveToast(null);
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#17212b] border border-teal-500/50 shadow-2xl rounded-2xl p-3 pr-4 flex items-center gap-3 cursor-pointer hover:bg-[#1f2b38] transition-all max-w-sm w-[92vw] animate-fade-in backdrop-blur-md"
        >
          <img 
            src={activeToast.senderAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'} 
            alt={activeToast.senderName} 
            className="w-10 h-10 rounded-full object-cover border border-teal-400 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 text-right">
            <span className="text-xs font-bold text-teal-300 block truncate">{activeToast.senderName}</span>
            <span className="text-xs text-gray-300 truncate block">{activeToast.text}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
            className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Drawer matching Screenshot 1 */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectChat={handleSelectChatById}
        onOpenSettings={() => navigateTo('settings')}
        onOpenProfile={() => navigateTo('account')}
        onOpenColorTheme={() => navigateTo('theme_color')}
        onOpenPlusSettings={() => navigateTo('plus_settings')}
        onOpenAddAccount={() => setIsAddAccountOpen(true)}
        onOpenCloudStatus={() => setIsCloudStatusOpen(true)}
        onOpenChatFolders={() => navigateTo('chat_folders')}
        onOpenNewGroup={() => setIsNewGroupOpen(true)}
        onOpenNewChannel={() => setIsNewChannelOpen(true)}
        onOpenContacts={() => setIsContactsOpen(true)}
      />

      {/* Cloud Status Modal (API_ID: 34773007, API_HASH, WSS Protocol, DC Selector) */}
      {isCloudStatusOpen && (
        <CloudStatusModal onClose={() => setIsCloudStatusOpen(false)} />
      )}

      {/* Add Account Modal */}
      {isAddAccountOpen && (
        <AddAccountModal 
          onClose={() => setIsAddAccountOpen(false)} 
          onSuccess={() => {
            setIsAddAccountOpen(false);
            setChats(telegramService.getChats());
            setCurrentUser(telegramService.getCurrentUser());
          }} 
        />
      )}

      {/* Storage and Cache Breakdown Modal */}
      {isCacheModalOpen && (
        <CacheManagementModal onClose={() => setIsCacheModalOpen(false)} />
      )}

      {/* Official Telegram Web Keyboard Shortcuts Modal */}
      {isShortcutsModalOpen && (
        <KeyboardShortcutsModal onClose={() => setIsShortcutsModalOpen(false)} />
      )}

      {/* New Group Modal */}
      {isNewGroupOpen && (
        <NewGroupModal
          onClose={() => setIsNewGroupOpen(false)}
          onSuccess={(chatId) => {
            setIsNewGroupOpen(false);
            setChats(telegramService.getChats());
            handleSelectChatById(chatId);
          }}
        />
      )}

      {/* New Channel Modal */}
      {isNewChannelOpen && (
        <NewChannelModal
          onClose={() => setIsNewChannelOpen(false)}
          onSuccess={(chatId) => {
            setIsNewChannelOpen(false);
            setChats(telegramService.getChats());
            handleSelectChatById(chatId);
          }}
        />
      )}

      {/* Contacts / New Chat Modal */}
      {isContactsOpen && (
        <ContactsModal
          onClose={() => setIsContactsOpen(false)}
          onSelectContact={(chatId) => {
            setIsContactsOpen(false);
            setChats(telegramService.getChats());
            handleSelectChatById(chatId);
          }}
        />
      )}

      {/* Views Routing */}
      {currentView === 'settings' && (
        <div className="w-full h-full">
          <SettingsModal
            onBack={navigateBack}
            onOpenAccount={() => navigateTo('account')}
            onOpenPlusSettings={() => navigateTo('plus_settings')}
            onOpenColorTheme={() => navigateTo('theme_color')}
            onOpenChatSettings={() => navigateTo('chat_settings')}
            onOpenPrivacy={() => navigateTo('privacy')}
            onOpenNotifications={() => navigateTo('notifications')}
            onOpenDataStorage={() => navigateTo('data_storage')}
            onOpenDevices={() => navigateTo('devices')}
            onOpenPowerUsage={() => navigateTo('power_usage')}
            onOpenLanguage={() => navigateTo('language')}
            onOpenCloudStatus={() => setIsCloudStatusOpen(true)}
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
            onOpenChatFolders={() => navigateTo('chat_folders')}
            onOpenGeneralSettings={() => navigateTo('general_settings')}
            onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            onOpenCacheModal={() => setIsCacheModalOpen(true)}
          />
        </div>
      )}

      {currentView === 'account' && (
        <div className="w-full h-full">
          <AccountScreen
            onBack={navigateBack}
            onSwitchAccount={handleSwitchAccount}
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
          />
        </div>
      )}

      {currentView === 'theme_color' && (
        <div className="w-full h-full">
          <ThemeColorScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'plus_settings' && (
        <div className="w-full h-full">
          <PlusSettingsScreen 
            onBack={navigateBack}
            onOpenColorTheme={() => navigateTo('theme_color')}
          />
        </div>
      )}

      {currentView === 'chat_settings' && (
        <div className="w-full h-full">
          <ChatSettingsScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'power_usage' && (
        <div className="w-full h-full">
          <PowerUsageScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'devices' && (
        <div className="w-full h-full">
          <DevicesScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'privacy' && (
        <div className="w-full h-full">
          <PrivacyScreen
            onBack={navigateBack}
            onOpenDevices={() => navigateTo('devices')}
          />
        </div>
      )}

      {currentView === 'data_storage' && (
        <div className="w-full h-full">
          <DataStorageScreen
            onBack={navigateBack}
            onOpenCloudModal={() => setIsCloudStatusOpen(true)}
            onOpenCacheModal={() => setIsCacheModalOpen(true)}
          />
        </div>
      )}

      {currentView === 'language' && (
        <div className="w-full h-full">
          <LanguageScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'notifications' && (
        <div className="w-full h-full">
          <NotificationsScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'chat_folders' && (
        <div className="w-full h-full">
          <ChatFoldersScreen onBack={navigateBack} />
        </div>
      )}

      {currentView === 'general_settings' && (
        <div className="w-full h-full">
          <GeneralSettingsScreen 
            onBack={navigateBack} 
            onOpenShortcuts={() => setIsShortcutsModalOpen(true)} 
          />
        </div>
      )}

      {/* Main Dual-Pane / Responsive Chat Layout */}
      {currentView === 'chat' && (
        <div className="flex w-full h-full">
          {/* Chat List Sidebar: On mobile visible when no chat is focused, or on desktop always visible (w-80 to w-96) */}
          <div className={`h-full border-l border-[#242f3d] flex-shrink-0 ${
            activeChat ? 'hidden md:flex md:w-[380px] lg:w-[420px]' : 'w-full flex'
          }`}>
            <ChatList
              chats={chats}
              selectedChatId={activeChat?.id || null}
              onSelectChat={(chat) => setActiveChat(chat)}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              onOpenCloudStatus={() => setIsCloudStatusOpen(true)}
              onOpenNewGroup={() => setIsNewGroupOpen(true)}
              onOpenNewChannel={() => setIsNewChannelOpen(true)}
              onOpenContacts={() => setIsContactsOpen(true)}
            />
          </div>

          {/* Active Chat Room Area */}
          <div className={`h-full flex-1 ${
            activeChat ? 'flex' : 'hidden md:flex md:items-center md:justify-center bg-[#0e1621]'
          }`}>
            {activeChat ? (
              <ChatRoom
                chat={activeChat}
                onBack={() => setActiveChat(null)}
                onOpenCloudStatus={() => setIsCloudStatusOpen(true)}
              />
            ) : (
              <div className="text-center p-8 text-gray-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#17212b] border border-[#242f3d] flex items-center justify-center mx-auto text-teal-400">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-base font-semibold text-gray-300">اختر محادثة لبدء المراسلة السحابية</h3>
                <p className="text-xs text-gray-500">
                  بياناتك مشفرة ومحمية عبر سحابة تيليجرام الرسمية
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
