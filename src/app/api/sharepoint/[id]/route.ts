// src/app/api/sharepoint/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

const EDITOR_ROLES = new Set(["ceo", "admin", "ti-exec", "direction-exec"]);
type RouteCtx = { params: { id: string } };
type PermSpec = { edit?: string[]; read?: string[] } | "inherit" | null;

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
  return { tenantId: userTenant.tenantId, session };
}

async function requireEditor() {
  const base = await requireTenant();
  if ("error" in base) return base as any;
  const role = (base.session?.user as any)?.role as string | undefined;
  if (!role || !EDITOR_ROLES.has(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

/** GET /api/sharepoint/:id */
export async function GET(_req: Request, ctx: RouteCtx) {
  const mech = await requireTenant();
  if ("error" in mech) return mech.error;

  const id = ctx?.params?.id?.toString();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const node = await prisma.sharePointNode.findFirst({
    where: { id, tenantId: mech.tenantId },
  });

  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(node);
}

/** PATCH /api/sharepoint/:id */
export async function PATCH(req: Request, ctx: RouteCtx) {
  const mech = await requireEditor();
  if ("error" in mech) return mech.error;

  const id = ctx?.params?.id?.toString();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const current = await prisma.sharePointNode.findFirst({
    where: { id, tenantId: mech.tenantId },
    select: { id: true, parentId: true },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, any> = {};

  // rename
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    data.name = name;
  }

  // parent move (cycle protection)
  if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
    const parentId: string | null = body.parentId ?? null;

    if (parentId === id) {
      return NextResponse.json({ error: "Cannot set parentId to self" }, { status: 400 });
    }

    if (parentId) {
      const parent = await prisma.sharePointNode.findFirst({
        where: { id: parentId, tenantId: mech.tenantId },
        select: { id: true, parentId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent not found in tenant" }, { status: 400 });
      }

      // climb ancestors of parent to prevent cycles
      let cursor: string | null | undefined = parent.parentId;
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json({ error: "Cannot move node under its own descendant" }, { status: 400 });
        }
        const ancestor: { parentId: string | null } | null =
          await prisma.sharePointNode.findFirst({
            where: { id: cursor, tenantId: mech.tenantId },
            select: { parentId: true },
          });
        cursor = ancestor?.parentId ?? null;
      }
    }

    // still inside the outer "parentId" block
    data.parentId = parentId;
  }

  // flags
  if (typeof body.restricted === "boolean") data.restricted = body.restricted;
  if (typeof body.highSecurity === "boolean") data.highSecurity = body.highSecurity;

  // permissions
  const sanitize = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.map((x) => String(x).trim()).filter(Boolean)))
      : [];

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

  if (editGroupsToSet !== undefined) data.editGroups = editGroupsToSet === null ? [] : editGroupsToSet;
  if (readGroupsToSet !== undefined) data.readGroups = readGroupsToSet === null ? [] : readGroupsToSet;

  const updated = await prisma.sharePointNode.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

/** DELETE /api/sharepoint/:id (recursive) */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const mech = await requireEditor();
  if ("error" in mech) return mech.error;

  const id = ctx?.params?.id?.toString();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const all = await prisma.sharePointNode.findMany({
    where: { tenantId: mech.tenantId },
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
    where: { tenantId: mech.tenantId, id: { in: Array.from(toDelete) } },
  });

  return NextResponse.json({ deleted: toDelete.size });
}
