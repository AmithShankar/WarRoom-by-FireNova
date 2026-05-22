'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker (`public/sw.js`) in production. The service
 * worker enables installability and an offline-capable app shell. It is not
 * registered in development to avoid caching dev assets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is non-fatal - the app still works without the SW.
    });
  }, []);

  return null;
}
