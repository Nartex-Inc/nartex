// src/app/api/sharepoint/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// Small helper to read the tenant of the current user
async function getTenantId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
  });
  if (!userTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  return userTenant.tenantId as string | NextResponse;
}

// ---------- GET /api/sharepoint/:id ----------
export async function GET(_req: NextRequest, ctx: any) {
  const tenant = await getTenantId();
  if (tenant instanceof NextResponse) return tenant;

  const id = String(ctx?.params?.id || '');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const node = await prisma.sharePointNode.findFirst({
    where: { id, tenantId: tenant },
  });
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(node);
}

// ---------- PATCH /api/sharepoint/:id ----------
export async function PATCH(req: NextRequest, ctx: any) {
  const tenant = await getTenantId();
  if (tenant instanceof NextResponse) return tenant;

  const id = String(ctx?.params?.id || '');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { name } = await req.json().catch(() => ({}));
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Ensure the node belongs to the tenant
  const exists = await prisma.sharePointNode.findFirst({ where: { id, tenantId: tenant } });
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.sharePointNode.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json(updated);
}

// ---------- DELETE /api/sharepoint/:id ----------
// Recursively deletes the node and all descendants for this tenant.
export async function DELETE(_req: NextRequest, ctx: any) {
  const tenant = await getTenantId();
  if (tenant instanceof NextResponse) return tenant;

  const id = String(ctx?.params?.id || '');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Load all nodes for this tenant, compute subtree, then deleteMany
  const all = await prisma.sharePointNode.findMany({
    where: { tenantId: tenant },
    select: { id: true, parentId: true },
  });

  const byParent = new Map<string | null, string[]>();
  for (const n of all) {
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n.id);
    byParent.set(n.parentId, arr);
  }

  const toDelete = new Set<string>();
  const q = [id];
  while (q.length) {
    const cur = q.shift()!;
    if (toDelete.has(cur)) continue;
    toDelete.add(cur);
    const children = byParent.get(cur) ?? [];
    for (const c of children) q.push(c);
  }

  if (toDelete.size === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.sharePointNode.deleteMany({
    where: { id: { in: Array.from(toDelete) }, tenantId: tenant },
  });

  return NextResponse.json({ deleted: toDelete.size });
}
