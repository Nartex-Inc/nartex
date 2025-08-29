import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const EDITOR_ROLES = new Set(["ceo", "admin", "ventes-exec", "ti-exec", "direction-exec"]);

/** Resolve tenant from the signed-in user (401/404 on failure). */
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

/** Editor gate: allow if role is in EDITOR_ROLES; fall back to DB if session lacks role. */
async function requireEditor() {
  const base = await requireTenant();
  if ("error" in base) return base as any;

  // 1) try from session (JWT-backed)
  let role = (base.session?.user as any)?.role as string | undefined;

  // 2) harden: fetch from DB if missing
  if (!role && base.session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: (base.session.user as any).id },
      select: { role: true },
    });
    role = u?.role ?? undefined;
  }

  if (!role || !EDITOR_ROLES.has(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

/** GET /api/sharepoint  -> all nodes for the tenant */
export async function GET() {
  const mech = await requireTenant();
  if ("error" in mech) return mech.error;

  const nodes = await prisma.sharePointNode.findMany({
    where: { tenantId: mech.tenantId },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(nodes);
}

/** POST /api/sharepoint -> create node (editor only) */
export async function POST(req: Request) {
  const mech = await requireEditor();
  if ("error" in mech) return mech.error;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    parentId,
    type = "folder",
    icon,
    restricted = false,
    highSecurity = false,
    permissions,
    editGroups: editGroupsRaw,
    readGroups: readGroupsRaw,
  } = body ?? {};

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Validate parent inside tenant
  if (parentId) {
    const parent = await prisma.sharePointNode.findFirst({
      where: { id: parentId, tenantId: mech.tenantId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found in tenant" }, { status: 400 });
    }
  }

  // Sanitize list helpers
  const sanitize = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.map((x) => String(x).trim()).filter(Boolean)))
      : [];

  // Normalize permissions (store arrays only; inherit/null => [])
  let editGroups: string[] = [];
  let readGroups: string[] = [];

  if (permissions == null || permissions === "inherit") {
    editGroups = [];
    readGroups = [];
  } else {
    if (permissions.edit && !Array.isArray(permissions.edit)) {
      return NextResponse.json({ error: "permissions.edit must be an array" }, { status: 400 });
    }
    if (permissions.read && !Array.isArray(permissions.read)) {
      return NextResponse.json({ error: "permissions.read must be an array" }, { status: 400 });
    }
    editGroups = sanitize(permissions.edit ?? []);
    readGroups = sanitize(permissions.read ?? []);
  }

  if (Object.prototype.hasOwnProperty.call(body, "editGroups")) {
    editGroups = editGroupsRaw === null ? [] : sanitize(editGroupsRaw);
  }
  if (Object.prototype.hasOwnProperty.call(body, "readGroups")) {
    readGroups = readGroupsRaw === null ? [] : sanitize(readGroupsRaw);
  }

  const newNode = await prisma.sharePointNode.create({
    data: {
      name: name.trim(),
      parentId: parentId ?? null,
      tenantId: mech.tenantId,
      type,
      icon,
      restricted,
      highSecurity,
      editGroups,
      readGroups,
    },
  });

  return NextResponse.json(newNode, { status: 201 });
}
