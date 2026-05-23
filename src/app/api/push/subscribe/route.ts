import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    create: {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  });

  return new Response(null, { status: 200 });
}
