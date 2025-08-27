// src/app/api/sharepoint/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/** Resolve the current user's tenantId or return an error response. */
async function requireTenant() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: (session.user as any).id },
    select: { tenantId: true },
  });

  if (!userTenant) {
    return { error: NextResponse.json({ error: "Tenant not found" }, { status: 404 }) };
  }

  return { tenantId: userTenant.tenantId as string };
}

/* ============================================
   GET /api/sharepoint/:id
   NOTE: second parameter MUST NOT be typed in Next 15
   ============================================ */
export async function GET(_req: Request, { params }: any) {
  const mech = await requireTenant();
  if ("error" in mech) return mech.error;

  const id = params?.id?.toString() ?? "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const node = await prisma.sharePointNode.findFirst({
    where: { id, tenantId: mech.tenantId },
  });

  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(node);
}

/* ============================================
   PATCH /api/sharepoint/:id
   Body: { name: string }
   ============================================ */
export async function PATCH(req: Request, { params }: any) {
  const mech = await requireTenant();
  if ("error" in mech) return mech.error;

  const id = params?.id?.toString() ?? "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body?.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Ensure node belongs to this tenant
  const exists = await prisma.sharePointNode.findFirst({
    where: { id, tenantId: mech.tenantId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.sharePointNode.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json(updated);
}

/* ============================================
   DELETE /api/sharepoint/:id
   Recursively delete node and descendants
   ============================================ */
export async function DELETE(_req: Request, { params }: any) {
  const mech = await requireTenant();
  if ("error" in mech) return mech.error;

  const id = params?.id?.toString() ?? "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Load all nodes for this tenant and compute the subtree under :id
  const all = await prisma.sharePointNode.findMany({
    where: { tenantId: mech.tenantId },
    select: { id: true, parentId: true },
  });

  if (!all.some(n => n.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const byParent = new Map<string | null, string[]>();
  for (const n of all) {
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n.id);
    byParent.set(n.parentId, arr);
  }

  const toDelete = new Set<string>();
  const queue: string[] = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (toDelete.has(cur)) continue;
    toDelete.add(cur);
    const children = byParent.get(cur) ?? [];
    queue.push(...children);
  }

  await prisma.sharePointNode.deleteMany({
    where: { tenantId: mech.tenantId, id: { in: Array.from(toDelete) } },
  });

  return NextResponse.json({ deleted: toDelete.size });
}
