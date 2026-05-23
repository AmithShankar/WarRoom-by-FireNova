import webpush, { WebPushError } from 'web-push';
import { prisma } from '@/lib/prisma';

if (
  process.env.VAPID_EMAIL &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Prisma WarningReason enum → human-readable string
const REASON_LABEL: Record<string, string> = {
  FailedInitialChallenge: 'Failed Initial Challenge',
  MissedWarAttack: 'Missed War Attack',
  LowDonations: 'Low Donations',
  Behavior: 'Behavior',
  Other: 'Other',
};

export type ExpiryWarning = { name: string; reason: string };

export function buildNotificationPayload(warnings: ExpiryWarning[]) {
  const title = 'WarRoom — Warnings Expired';
  const body =
    warnings.length === 1
      ? `${warnings[0].name}'s ${warnings[0].reason} warning has expired.`
      : `${warnings.length} warnings expired: ${warnings
          .map(w => `${w.name} (${w.reason})`)
          .join(', ')}`;
  return {
    title,
    body,
    icon: '/icon-192.png',
    data: { url: '/warnings' },
  };
}

export function toReadableReason(prismaReason: string): string {
  return REASON_LABEL[prismaReason] ?? prismaReason;
}

export async function sendExpiryNotification(
  warnings: ExpiryWarning[],
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
): Promise<void> {
  const payload = JSON.stringify(buildNotificationPayload(warnings));
  const deadEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: unknown) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.warn(
            'Push delivery failed:',
            sub.endpoint,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }),
  );

  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: deadEndpoints } },
    });
  }
}
