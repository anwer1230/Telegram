import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallStatus = 'idle' | 'installing' | 'installed' | 'dismissed' | 'unsupported';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA compliance
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Check if already installed / running in standalone mode
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      if (isStandalone) {
        setIsInstalled(true);
        setInstallStatus('installed');
      }

      // Check iframe
      setIsInIframe(window.self !== window.top);

      // Check OS
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
      setIsAndroid(/android/.test(ua));
    }

    // 3. Listen for native browser beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA] beforeinstallprompt event captured and ready');
    };

    // 4. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstalling(false);
      setInstallStatus('installed');
      setDeferredPrompt(null);
      console.log('[PWA] App successfully installed on device');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<{ success: boolean; outcome?: 'accepted' | 'dismissed' }> => {
    setIsInstalling(true);
    setInstallStatus('installing');

    // Simulate preparation step so user sees "جاري التثبيت..."
    await new Promise(r => setTimeout(r, 600));

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setInstallStatus('installed');
          setDeferredPrompt(null);
          setIsInstalling(false);
          return { success: true, outcome: 'accepted' };
        } else {
          setInstallStatus('dismissed');
          setIsInstalling(false);
          return { success: false, outcome: 'dismissed' };
        }
      } catch (err) {
        console.error('[PWA] Error calling prompt():', err);
        setIsInstalling(false);
        setInstallStatus('idle');
        return { success: false };
      }
    }

    // Fallback if beforeinstallprompt is not directly available (e.g., in iframe or browser delayed)
    setIsInstalling(false);
    return { success: false };
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isInstalling,
    installStatus,
    setInstallStatus,
    isIOS,
    isAndroid,
    isInIframe,
    install,
    deferredPrompt,
  };
}
