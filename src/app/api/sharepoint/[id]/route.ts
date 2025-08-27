// src/app/api/sharepoint/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  _req: Request,
  { params, }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userTenant = await prisma.userTenant.findFirst({ where: { userId: session.user.id } });
  if (!userTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const node = await prisma.sharePointNode.findFirst({
    where: { id: params.id, tenantId: userTenant.tenantId },
  });

  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(node);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const userTenant = await prisma.userTenant.findFirst({ where: { userId: session.user.id } });
  if (!userTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Ensure the node belongs to the tenant
  const existing = await prisma.sharePointNode.findFirst({
    where: { id: params.id, tenantId: userTenant.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.sharePointNode.update({
    where: { id: params.id },
    data: { name },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userTenant = await prisma.userTenant.findFirst({ where: { userId: session.user.id } });
  if (!userTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Load all nodes for tenant once, then compute subtree ids
  const all = await prisma.sharePointNode.findMany({
    where: { tenantId: userTenant.tenantId },
    select: { id: true, parentId: true },
  });

  const set = new Set<string>();
  const byParent = new Map<string | null, string[]>();
  for (const n of all) {
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n.id);
    byParent.set(n.parentId, arr);
  }

  // BFS from target id
  const queue: string[] = [params.id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (set.has(cur)) continue;
    set.add(cur);
    const kids = byParent.get(cur) ?? [];
    for (const k of kids) queue.push(k);
  }

  if (!set.size) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete all in one go
  await prisma.sharePointNode.deleteMany({
    where: { id: { in: Array.from(set) }, tenantId: userTenant.tenantId },
  });

  return NextResponse.json({ deleted: set.size });
}
