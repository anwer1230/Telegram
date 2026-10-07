import './polyfills';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Handle dynamic import / chunk loading errors automatically
window.addEventListener('error', (event) => {
  if (event?.message && (event.message.includes('Loading chunk') || event.message.includes('Failed to fetch dynamically imported module'))) {
    console.warn('Chunk load error detected, reloading to fetch latest version...');
    window.location.reload();
  }
});

// PWA Service Worker Registration (automatic update reload and periodic polling disabled per user request)
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      console.log('[PWA] New content available. Automatic reload disabled.');
    },
    onOfflineReady() {
      console.log('[PWA] App is ready to work offline.');
    },
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered successfully:', registration?.scope);
    },
    onRegisterError(error) {
      console.warn('[PWA] Service Worker registration failed:', error);
    },
  });

  // Background Web Push & Real-Time Sync initialization
  import('./services/WebPushManager').then(({ webPushManager }) => {
    webPushManager.initSSEListener();
    webPushManager.onSessionRevoked((reason) => {
      console.warn('[PWA] Remote forced logout received via Web Push / SSE:', reason);
      window.dispatchEvent(new CustomEvent('telegram:session_revoked', { detail: { reason } }));
    });
  }).catch(() => {});

  // Firebase Cloud Messaging (FCM) Background Notification Service initialization
  import('./services/FcmManager').then(({ fcmManager }) => {
    fcmManager.initBackground();
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
