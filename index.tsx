
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// تسجيل الـ Service Worker لتمكين ميزات PWA والعمل دون اتصال
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // استخدام مسار نسبي لضمان التوافق مع نطاق المصدر الحالي
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        console.log('✅ Al-Shwaia Smart SW Registered');
        
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New version available, reloading...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch(err => {
        // تجاهل أخطاء النطاق في بيئات التطوير المقيدة مثل AI Studio
        if (err.message?.includes('origin')) {
          console.warn('⚠️ SW Registration skipped due to origin restrictions (expected in AI Studio)');
        } else {
          console.error('❌ SW Registration Fail:', err);
        }
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Critical Error: Root element not found.");
}

const htmlSpinner = document.getElementById('html-loading-spinner');
if (htmlSpinner) {
  htmlSpinner.style.display = 'none';
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
