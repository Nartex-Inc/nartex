// Force Node runtime + no caching for Prisma
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type PermSpec = { edit?: string[]; read?: string[] } | "inherit" | null;
type Authed = { userId: string; role: string; tenantId: string };

function toJsonError(e: unknown, fallback = "Internal error", status = 500) {
  const msg =
    typeof e === "object" && e && "message" in e
      ? String((e as any).message)
      : String(e);
  return NextResponse.json({ error: fallback, detail: msg }, { status });
}

async function loadAuth(): Promise<Authed> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  let userId = (session?.user as any)?.id as string | undefined;

  if (!userId && email) {
    const u = await prisma.user.findFirst({ where: { email }, select: { id: true } });
    userId = u?.id ?? undefined;
  }
  if (!userId) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = (user?.role ?? "user").toLowerCase().trim();

  const ut = await prisma.userTenant.findFirst({
    where: { userId },
    select: { tenantId: true },
  });
  if (!ut) throw new Error("Tenant not found for user");

  return { userId, role, tenantId: ut.tenantId };
}

const sanitize = (arr: unknown): string[] =>
  Array.isArray(arr)
    ? Array.from(new Set(arr.map((x) => String(x).trim()).filter(Boolean)))
    : [];

async function getParentId(nodeId: string, tenantId: string): Promise<string | null> {
  const row = await prisma.sharePointNode.findFirst({
    where: { id: nodeId, tenantId },
    select: { parentId: true },
  });
  return row?.parentId ?? null;
}

export async function GET(_req: Request, ctx: any) {
  try {
    const a = await loadAuth();

    const id = ctx?.params?.id?.toString();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const node = await prisma.sharePointNode.findFirst({
      where: { id, tenantId: a.tenantId },
    });
    if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(node);
  } catch (e) {
    return toJsonError(e);
  }
}

export async function PATCH(req: Request, ctx: any) {
  try {
    const a = await loadAuth();

    const id = ctx?.params?.id?.toString();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const current = await prisma.sharePointNode.findFirst({
      where: { id, tenantId: a.tenantId },
      select: { id: true, parentId: true },
    });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, any> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      data.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
      const parentId: string | null = body.parentId ?? null;
      if (parentId === id) {
        return NextResponse.json({ error: "Cannot set parentId to self" }, { status: 400 });
      }
      if (parentId) {
        const parent = await prisma.sharePointNode.findFirst({
          where: { id: parentId, tenantId: a.tenantId },
          select: { id: true, parentId: true },
        });
        if (!parent) {
          return NextResponse.json({ error: "Parent not found in tenant" }, { status: 400 });
        }
        let cursor: string | null = parent.parentId ?? null;
        while (cursor) {
          if (cursor === id) {
            return NextResponse.json(
              { error: "Cannot move node under its own descendant" },
              { status: 400 }
            );
          }
          cursor = await getParentId(cursor, a.tenantId);
        }
      }
      data.parentId = parentId;
    }

    if (typeof body.restricted === "boolean") data.restricted = body.restricted;
    if (typeof body.highSecurity === "boolean") data.highSecurity = body.highSecurity;

    let editGroupsToSet: string[] | null | undefined;
    let readGroupsToSet: string[] | null | undefined;

    if (Object.prototype.hasOwnProperty.call(body, "permissions")) {
      const perms: PermSpec = body.permissions;
      if (perms == null || perms === "inherit") {
        editGroupsToSet = null;
        readGroupsToSet = null;
      } else {
        if (perms.edit && !Array.isArray(perms.edit)) {
          return NextResponse.json({ error: "permissions.edit must be an array" }, { status: 400 });
        }
        if (perms.read && !Array.isArray(perms.read)) {
          return NextResponse.json({ error: "permissions.read must be an array" }, { status: 400 });
        }
        editGroupsToSet = sanitize(perms.edit ?? []);
        readGroupsToSet = sanitize(perms.read ?? []);
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "editGroups")) {
      editGroupsToSet = body.editGroups === null ? null : sanitize(body.editGroups);
    }
    if (Object.prototype.hasOwnProperty.call(body, "readGroups")) {
      readGroupsToSet = body.readGroups === null ? null : sanitize(body.readGroups);
    }

    if (editGroupsToSet !== undefined)
      data.editGroups = editGroupsToSet === null ? [] : editGroupsToSet;
    if (readGroupsToSet !== undefined)
      data.readGroups = readGroupsToSet === null ? [] : readGroupsToSet;

    const updated = await prisma.sharePointNode.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return toJsonError(e);
  }
}

export async function DELETE(_req: Request, ctx: any) {
  try {
    const a = await loadAuth();

    const id = ctx?.params?.id?.toString();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const all = await prisma.sharePointNode.findMany({
      where: { tenantId: a.tenantId },
      select: { id: true, parentId: true },
    });
    if (!all.some((n) => n.id === id)) {
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
      where: { tenantId: a.tenantId, id: { in: Array.from(toDelete) } },
    });
    return NextResponse.json({ deleted: toDelete.size });
  } catch (e) {
    return toJsonError(e);
  }
}
