// src/app/api/sharepoint/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const EDITOR_ROLES = new Set(["ceo", "admin", "ti-exec", "direction-exec"]);

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

/** POST /api/sharepoint
 * body: {
 *   name: string;
 *   parentId?: string | null;
 *   type?: string;    // default "folder"
 *   icon?: string;
 *   restricted?: boolean;
 *   highSecurity?: boolean;
 *   permissions?: { edit?: string[]; read?: string[] } | "inherit" | null
 * }
 */
export async function POST(req: Request) {
  const mech = await requireEditor();
  if ("error" in mech) return mech.error;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, parentId, type = "folder", icon, restricted = false, highSecurity = false, permissions } = body ?? {};
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // If parent is provided, ensure it exists in this tenant
  if (parentId) {
    const parent = await prisma.sharePointNode.findFirst({
      where: { id: parentId, tenantId: mech.tenantId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found in tenant" }, { status: 400 });
    }
  }

  let editGroups: string[] | null = null;
  let readGroups: string[] | null = null;
  if (permissions && permissions !== "inherit") {
    if (permissions.edit && !Array.isArray(permissions.edit)) {
      return NextResponse.json({ error: "permissions.edit must be an array" }, { status: 400 });
    }
    if (permissions.read && !Array.isArray(permissions.read)) {
      return NextResponse.json({ error: "permissions.read must be an array" }, { status: 400 });
    }
    editGroups = permissions.edit ?? [];
    readGroups = permissions.read ?? [];
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
