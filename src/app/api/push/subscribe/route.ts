import { prisma } from '@/lib/prisma';
import {
  MAX_PUSH_SUBSCRIPTIONS_PER_LEADER,
  parseJsonBody,
  requestLeader,
  subscribeBody,
} from '@/server/push-subscription';

// Expiry alerts are a leader tool, and visitors have no session to own a row, so only a
// signed-in current Leader or Co-Leader may register a device.
export async function POST(req: Request) {
  const leader = await requestLeader(req, prisma);
  if (!leader) return new Response(null, { status: 401 });

  const body = await parseJsonBody(req, subscribeBody);
  if (!body) return new Response(null, { status: 400 });

  const fields = { p256dh: body.keys.p256dh, auth: body.keys.auth, ownerTag: leader.tag };
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: fields,
    create: { endpoint: body.endpoint, ...fields },
  });

  // Keep at most MAX_PUSH_SUBSCRIPTIONS_PER_LEADER rows per leader: drop that leader's oldest.
  const rows = await prisma.pushSubscription.findMany({
    where: { ownerTag: leader.tag },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (rows.length > MAX_PUSH_SUBSCRIPTIONS_PER_LEADER) {
    await prisma.pushSubscription.deleteMany({
      where: { ownerTag: leader.tag, id: { in: rows.slice(MAX_PUSH_SUBSCRIPTIONS_PER_LEADER).map(r => r.id) } },
    });
  }

  return new Response(null, { status: 200 });
}
