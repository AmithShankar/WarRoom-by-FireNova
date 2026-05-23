'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

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

export function NotificationsButton() {
  const [supported, setSupported] = useState(false);
  const [iosBlock, setIosBlock] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      // iOS Safari browser tab — push only works from installed PWA.
      setIosBlock(true);
      setSupported(true);
      return;
    }

    if (!('PushManager' in window)) return;

    setSupported(true);
    setEnabled(Notification.permission === 'granted');
  }, []);

  if (!supported) return null;

  const handleClick = async () => {
    if (iosBlock) return; // button is disabled, click is a no-op

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    if (enabled) {
      // Unsubscribe
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON() as { endpoint: string };
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint }),
        });
      }
      setEnabled(false);
      return;
    }

    // Subscribe
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
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
    setEnabled(true);
  };

  const label = iosBlock
    ? 'Install the app first to enable notifications'
    : enabled
    ? 'Disable notifications'
    : 'Enable notifications';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={iosBlock}
      title={label}
      aria-label={label}
      className={
        iosBlock
          ? 'flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-text-3 opacity-40'
          : enabled
          ? 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-brand-from transition-colors hover:bg-surface-2'
          : 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1'
      }
    >
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
    </button>
  );
}
