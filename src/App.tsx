/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TelegramProvider, useTelegram } from './context/TelegramContext';
import { GlobalErrorBoundary } from './components/Common/GlobalErrorBoundary';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatView } from './components/Chat/ChatView';
import { ChatInfoPanel } from './components/RightPanel/ChatInfoPanel';
import { NavigationDrawer } from './components/Sidebar/NavigationDrawer';
import { ApiConfigModal } from './components/Modals/ApiConfigModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { CallModal } from './components/Modals/CallModal';
import { MediaViewerModal } from './components/Modals/MediaViewerModal';
import { NewChatModal } from './components/Modals/NewChatModal';
import { AddAccountModal } from './components/Modals/AddAccountModal';
import { JoinInviteModal } from './components/Modals/JoinInviteModal';
import { ApkInstallerModal } from './components/Modals/ApkInstallerModal';
import { MiniAppsModal } from './components/Modals/MiniAppsModal';
import { ThemeEditorModal } from './components/Modals/ThemeEditorModal';
import { ExportChatModal } from './components/Modals/ExportChatModal';
import { ContactsModal } from './components/Modals/ContactsModal';
import { LinkMonitorModal } from './components/Modals/LinkMonitorModal';
import { SendOnlyModal } from './components/Modals/SendOnlyModal';
import { PremiumModal } from './components/Modals/PremiumModal';
import { SecretChatInfoModal } from './components/Modals/SecretChatInfoModal';
import { GroupAdminModal } from './components/Modals/GroupAdminModal';
import { ForumTopicsModal } from './components/Modals/ForumTopicsModal';
import { SenderModal } from './components/Modals/SenderModal';
import { MonitorModal } from './components/Modals/MonitorModal';
import { MyMessagesModal } from './components/Modals/MyMessagesModal';
import { AutoJoinerModal } from './components/Modals/AutoJoinerModal';
import { AutoResponderModal } from './components/Modals/AutoResponderModal';
import { SmartAiLearnModal } from './components/Modals/SmartAiLearnModal';
import { ScheduledRotatorModal } from './components/Modals/ScheduledRotatorModal';
import { LiveLinkDiscoverModal } from './components/Modals/LiveLinkDiscoverModal';
import { UserProfileModal } from './components/Modals/UserProfileModal';
import { SalamActivityLog } from './components/SalamActivityLog';
import { ForwardModal } from './components/Interactions/ForwardModal';
import { ChatContextMenuView } from './components/Interactions/ChatContextMenu';
import { MessageContextMenuView } from './components/Interactions/MessageContextMenu';
import { ToastContainer } from './components/Interactions/ToastContainer';
import { InAppNotificationBanner } from './components/Notifications/InAppNotificationBanner';
import { AndroidNotificationShade } from './components/Notifications/AndroidNotificationShade';
import { InstallAppBanner } from './components/Notifications/InstallAppBanner';
import { TelegramAuthScreen } from './components/Auth/TelegramAuthScreen';
import { useMobileNavigation } from './hooks/useMobileNavigation';
import { AppUpdateAlertDialog } from './components/Modals/AppUpdateAlertDialog';
import { UpdateAppActivityModal } from './components/Modals/UpdateAppActivityModal';
import { RestrictedContentModal } from './components/Modals/RestrictedContentModal';
import { ScreenshotBlockedToast } from './components/Notifications/ScreenshotBlockedToast';
import { NotificationCenter } from './core/NotificationCenter';
import { appUpdateController } from './core/messenger/AppUpdateController';

const TelegramAppContent: React.FC = () => {
  const { isAuthenticated, inAppNotifications, dismissNotification, activeModal, setActiveModal, showToast, settings } = useTelegram();
  const [showUpdateDialog, setShowUpdateDialog] = React.useState(false);
  const [showUpdateActivity, setShowUpdateActivity] = React.useState(false);
  const isArabic = settings.language === 'ar';

  // Replicate LaunchActivity.java NotificationCenter observer
  React.useEffect(() => {
    const observer = {
      didReceivedNotification: (id: number | string, account: number, ...args: any[]) => {
        if (id === NotificationCenter.appUpdateAvailable) {
          const update = args[0];
          const isManual = args[1];
          // Check if previously dismissed
          const dismissedVer = localStorage.getItem('tg_dismissed_update_version');
          if (isManual || !dismissedVer || dismissedVer !== update?.version) {
            setShowUpdateDialog(true);
          }
        } else if (id === NotificationCenter.appUpdateNotModified) {
          showToast(isArabic ? 'أنت تستخدم أحدث إصدار من تيليجرام بنجاح' : "You're already using the latest version of Telegram", '✅');
        } else if (id === NotificationCenter.appDidLogout) {
          setActiveModal(null);
        }
      },
    };

    NotificationCenter.getGlobalInstance().addObserver(observer, NotificationCenter.appUpdateAvailable);
    NotificationCenter.getGlobalInstance().addObserver(observer, NotificationCenter.appUpdateNotModified);
    NotificationCenter.getGlobalInstance().addObserver(observer, NotificationCenter.appDidLogout);

    return () => {
      NotificationCenter.getGlobalInstance().removeObserver(observer, NotificationCenter.appUpdateAvailable);
      NotificationCenter.getGlobalInstance().removeObserver(observer, NotificationCenter.appUpdateNotModified);
      NotificationCenter.getGlobalInstance().removeObserver(observer, NotificationCenter.appDidLogout);
    };
  }, [isArabic, showToast]);

  // Activate mobile hardware back button, touch navigation & popstate stack
  useMobileNavigation();

  if (!isAuthenticated) {
    return (
      <div id="tg-auth-wrapper" className="w-screen h-screen min-h-screen bg-[#0e1621] text-white overflow-hidden relative select-none">
        <TelegramAuthScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div
      id="tg-app-root"
      className="fixed inset-0 w-full h-full h-[100dvh] flex overflow-hidden font-sans select-none"
      style={{
        backgroundColor: 'var(--tg-theme-bg)',
      }}
    >
      {/* Left Sidebar (Chats, Folders, Search) */}
      <Sidebar />

      {/* Center Chat Feed / Message View */}
      <ChatView />

      {/* Right Shared Media & Details Info Panel */}
      <ChatInfoPanel />

      {/* Drawer Slide-out Menu */}
      <NavigationDrawer />

      {/* Dialogs & Overlays */}
      <ApiConfigModal />
      <SettingsModal />
      <CallModal />
      <MediaViewerModal />
      <NewChatModal />
      <AddAccountModal />
      <JoinInviteModal />
      <ApkInstallerModal />
      <MiniAppsModal
        isOpen={activeModal === 'mini-apps'}
        onClose={() => setActiveModal('none')}
      />
      <ThemeEditorModal
        isOpen={activeModal === 'theme-editor'}
        onClose={() => setActiveModal('none')}
      />
      <ExportChatModal
        isOpen={activeModal === 'export-chat'}
        onClose={() => setActiveModal('none')}
      />
      <ContactsModal
        isOpen={activeModal === 'contacts'}
        onClose={() => setActiveModal('none')}
      />
      <LinkMonitorModal
        isOpen={activeModal === 'link-monitor'}
        onClose={() => setActiveModal('none')}
      />
      <SendOnlyModal />
      <PremiumModal />
      <SecretChatInfoModal />
      <GroupAdminModal />
      <ForumTopicsModal />
      
      {/* 7 Core Telegram Functions (Activities) */}
      <SenderModal />
      <MonitorModal />
      <MyMessagesModal />
      <AutoJoinerModal />
      <AutoResponderModal />
      <SmartAiLearnModal />
      <ScheduledRotatorModal />
      <LiveLinkDiscoverModal />
      <UserProfileModal />

      {/* Salam Mode Real-Time Activity Log */}
      <SalamActivityLog
        isOpen={activeModal === 'salam-activity-log'}
        onClose={() => setActiveModal('none')}
      />

      <ForwardModal />

      {/* Dynamic Context Menus */}
      <ChatContextMenuView />
      <MessageContextMenuView />

      {/* Telegram Official App Update Alert Dialog & Full Download Activity */}
      <AppUpdateAlertDialog
        isOpen={showUpdateDialog}
        onClose={() => setShowUpdateDialog(false)}
        onOpenFullActivity={() => {
          setShowUpdateDialog(false);
          setShowUpdateActivity(true);
        }}
      />
      <UpdateAppActivityModal
        isOpen={showUpdateActivity}
        onClose={() => setShowUpdateActivity(false)}
      />

      {/* Android Notification Shade (Pull-down & Background Notifications) */}
      <AndroidNotificationShade
        isOpen={activeModal === 'android-notification-shade'}
        onClose={() => setActiveModal('none')}
      />

      {/* AI Studio Style Direct App Installation Banner */}
      <InstallAppBanner />

      {/* In-App Floating Heads-up Notification Banner */}
      <InAppNotificationBanner
        notifications={inAppNotifications}
        onDismiss={dismissNotification}
      />

      {/* Restricted Content Warning Modal */}
      <RestrictedContentModal
        isOpen={activeModal === 'restricted-content'}
        onClose={() => setActiveModal('none')}
      />

      {/* Floating Toast Notifications */}
      <ToastContainer />

      {/* Android FLAG_SECURE Screenshot Blocked Alert */}
      <ScreenshotBlockedToast />
    </div>
  );
};

export default function App() {
  return (
    <GlobalErrorBoundary>
      <TelegramProvider>
        <TelegramAppContent />
      </TelegramProvider>
    </GlobalErrorBoundary>
  );
}
