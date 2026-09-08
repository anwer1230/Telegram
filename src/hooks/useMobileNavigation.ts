import { useEffect, useRef, useState, useCallback } from 'react';
import { useTelegram } from '../context/TelegramContext';

/**
 * Mobile Navigation & Gestures Controller
 * - Mobile and Hardware Back Button (Popstate) & History Stack Controller
 * - Swipe-to-refresh functionality on the conversation list triggering refreshDialogs()
 * - Android hardware back button, mobile browser gestures, and Escape key handling.
 */
export function useMobileNavigation() {
  const {
    activeChatId,
    setActiveChatId,
    refreshDialogs,
    isDrawerOpen,
    setIsDrawerOpen,
    isRightPanelOpen,
    setIsRightPanelOpen,
    activeModal,
    setActiveModal,
    viewerMedia,
    setViewerMedia,
    chatContextMenu,
    setChatContextMenu,
    messageContextMenu,
    setMessageContextMenu,
    selectedMessageIds,
    clearSelectedMessages,
    editingMessage,
    setEditingMessage,
    replyingTo,
    setReplyingTo,
    settings,
    showToast,
  } = useTelegram();

  const isArabic = settings?.language === 'ar';

  // Swipe-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const hapticFiredRef = useRef(false);

  // Trigger synchronization routine
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
    try {
      await refreshDialogs();
      showToast?.(isArabic ? 'تم تحديث المحادثات سحابياً' : 'Dialogs synchronized', '🔄');
    } catch (err) {
      console.warn('[useMobileNavigation] refreshDialogs failed:', err);
      showToast?.(isArabic ? 'فشل تحديث المحادثات' : 'Failed to refresh conversations', '⚠️');
    } finally {
      setIsRefreshing(false);
      setPullProgress(0);
    }
  }, [isRefreshing, refreshDialogs, showToast, isArabic]);

  // Attach swipe-to-refresh touch listeners directly to conversation list
  useEffect(() => {
    // Only active when on conversation list view (mobile or desktop sidebar)
    if (activeChatId && window.innerWidth < 768) {
      return;
    }

    // Locate the conversation list container
    const findChatListEl = (): HTMLElement | null => {
      return (
        document.getElementById('conversation-list-container') ||
        document.querySelector('[data-conversation-list="true"]') ||
        document.querySelector('[data-chat-list="true"]') ||
        document.querySelector('#tg-chat-list-scroll') ||
        document.querySelector('.conversation-list-scroll') ||
        document.querySelector('aside .overflow-y-auto')
      );
    };

    const targetEl = findChatListEl();
    if (!targetEl) return;

    const onTouchStart = (e: TouchEvent) => {
      if (targetEl.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isPullingRef.current = true;
        hapticFiredRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = currentY - startYRef.current;
      const dx = currentX - startXRef.current;

      // Only handle downward swipe with predominantly vertical motion
      if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2 && targetEl.scrollTop <= 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        // Native mobile damping physics
        const damped = Math.min(dy * 0.45, 80);
        const progress = Math.min(damped / 60, 1.2);
        setPullProgress(progress);

        if (progress >= 1.0 && !hapticFiredRef.current) {
          hapticFiredRef.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(25);
            } catch {}
          }
        }
      } else if (dy < 0) {
        isPullingRef.current = false;
        setPullProgress(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullProgress >= 0.9 && !isRefreshing) {
        await triggerRefresh();
      } else {
        setPullProgress(0);
      }
    };

    const onTouchCancel = () => {
      isPullingRef.current = false;
      setPullProgress(0);
    };

    targetEl.addEventListener('touchstart', onTouchStart, { passive: true });
    targetEl.addEventListener('touchmove', onTouchMove, { passive: false });
    targetEl.addEventListener('touchend', onTouchEnd, { passive: true });
    targetEl.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      targetEl.removeEventListener('touchstart', onTouchStart);
      targetEl.removeEventListener('touchmove', onTouchMove);
      targetEl.removeEventListener('touchend', onTouchEnd);
      targetEl.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [activeChatId, isRefreshing, pullProgress, triggerRefresh]);

  // Push history state whenever a view/modal opens so that hardware Back button intercepts it
  useEffect(() => {
    const hasOpenOverlay =
      Boolean(activeChatId) ||
      isDrawerOpen ||
      isRightPanelOpen ||
      activeModal !== 'none' ||
      Boolean(viewerMedia) ||
      Boolean(chatContextMenu) ||
      Boolean(messageContextMenu) ||
      selectedMessageIds.length > 0;

    if (hasOpenOverlay) {
      window.history.pushState({ tgNav: true, timestamp: Date.now() }, '');
    }
  }, [
    activeChatId,
    isDrawerOpen,
    isRightPanelOpen,
    activeModal,
    Boolean(viewerMedia),
    Boolean(chatContextMenu),
    Boolean(messageContextMenu),
    selectedMessageIds.length,
  ]);

  // Handle hardware / browser back button popstate
  useEffect(() => {
    const handlePopState = () => {
      // 1. Close Context menus
      if (chatContextMenu) {
        setChatContextMenu(null);
        return;
      }
      if (messageContextMenu) {
        setMessageContextMenu(null);
        return;
      }

      // 2. Close Media Viewer Lightbox
      if (viewerMedia) {
        setViewerMedia(null);
        return;
      }

      // 3. Clear Multi-select
      if (selectedMessageIds.length > 0) {
        clearSelectedMessages();
        return;
      }

      // 4. Close Active Modals (Settings, Calls, Invites, New chat)
      if (activeModal !== 'none') {
        setActiveModal('none');
        return;
      }

      // 5. Close Drawer
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return;
      }

      // 6. Close Right Info Panel
      if (isRightPanelOpen) {
        setIsRightPanelOpen(false);
        return;
      }

      // 7. Cancel Editing / Replying
      if (editingMessage) {
        setEditingMessage(null);
        return;
      }
      if (replyingTo) {
        setReplyingTo(null);
        return;
      }

      // 8. Navigate from Chat back to Chat List on Mobile
      if (activeChatId && window.innerWidth < 768) {
        setActiveChatId(null);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    chatContextMenu,
    messageContextMenu,
    viewerMedia,
    selectedMessageIds,
    activeModal,
    isDrawerOpen,
    isRightPanelOpen,
    editingMessage,
    replyingTo,
    activeChatId,
    setChatContextMenu,
    setMessageContextMenu,
    setViewerMedia,
    clearSelectedMessages,
    setActiveModal,
    setIsDrawerOpen,
    setIsRightPanelOpen,
    setEditingMessage,
    setReplyingTo,
    setActiveChatId,
  ]);

  // Handle Escape keyboard key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chatContextMenu) setChatContextMenu(null);
        if (messageContextMenu) setMessageContextMenu(null);
        if (viewerMedia) setViewerMedia(null);
        if (selectedMessageIds.length > 0) clearSelectedMessages();
        if (activeModal !== 'none') setActiveModal('none');
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (isRightPanelOpen) setIsRightPanelOpen(false);
        if (editingMessage) setEditingMessage(null);
        if (replyingTo) setReplyingTo(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    chatContextMenu,
    messageContextMenu,
    viewerMedia,
    selectedMessageIds,
    activeModal,
    isDrawerOpen,
    isRightPanelOpen,
    editingMessage,
    replyingTo,
    setChatContextMenu,
    setMessageContextMenu,
    setViewerMedia,
    clearSelectedMessages,
    setActiveModal,
    setIsDrawerOpen,
    setIsRightPanelOpen,
    setEditingMessage,
    setReplyingTo,
  ]);

  return {
    isRefreshing,
    pullProgress,
    refreshDialogs: triggerRefresh,
  };
}
