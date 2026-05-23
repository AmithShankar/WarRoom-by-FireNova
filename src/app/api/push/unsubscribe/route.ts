import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { endpoint } = (await req.json()) as { endpoint: string };
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return new Response(null, { status: 200 });
}
