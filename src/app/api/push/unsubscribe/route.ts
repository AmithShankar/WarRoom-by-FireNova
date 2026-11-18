import { prisma } from '@/lib/prisma';
import { parseJsonBody, requestLeader, unsubscribeBody } from '@/server/push-subscription';

// Deletes only the caller's own row for one exact, validated endpoint. The body is never
// passed to Prisma unvalidated, so `{}` or a filter object cannot widen the delete.
export async function POST(req: Request) {
  const leader = await requestLeader(req, prisma);
  if (!leader) return new Response(null, { status: 401 });

  const body = await parseJsonBody(req, unsubscribeBody);
  if (!body) return new Response(null, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, ownerTag: leader.tag } });
  return new Response(null, { status: 200 });
}
