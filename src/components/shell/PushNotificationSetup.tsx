'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return view;
}

async function syncSubscription(reg: ServiceWorkerRegistration): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return;

  const existing = await reg.pushManager.getSubscription();

  if (existing) {
    // Re-POST in case the server lost it (e.g. after a DB wipe or SW update).
    const json = existing.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    });
    return;
  }

  if (Notification.permission !== 'granted') return;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  });
}

// Push registration needs a signed-in Leader / Co-Leader: the server owns each row by player tag.
export function PushNotificationSetup() {
  const me = trpc.auth.me.useQuery();
  const editorTag = me.data?.editor?.tag ?? null;

  useEffect(() => {
    if (!editorTag) return;
    if (!('Notification' in window) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    navigator.serviceWorker.ready
      .then(async (reg) => {
        // In an installed PWA, auto-prompt for permission on first open.
        if (isStandalone && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        }
        await syncSubscription(reg);
      })
      .catch(() => {
        // Non-fatal — push just won't work on this device.
      });
  }, [editorTag]);

  return null;
}
