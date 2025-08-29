// src/app/api/sharepoint/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

const EDITOR_ROLES = new Set(["ceo","admin","ventes-exec","ti-exec","direction-exec"].map(s=>s.toLowerCase()));

type Authed = { userId: string; role: string; tenantId: string };

async function loadAuth(): Promise<Authed | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  let userId = (session?.user as any)?.id as string | undefined;

  if (!userId && email) {
    const u = await prisma.user.findFirst({
      where: { email: email },
      select: { id: true },
    });
    userId = u?.id;
  }
  if (!userId) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = (user?.role ?? "user").toLowerCase().trim();

  const ut = await prisma.userTenant.findFirst({
    where: { userId },
    select: { tenantId: true },
  });
  if (!ut) {
    return { error: NextResponse.json({ error: "Tenant not found for user" }, { status: 404 }) };
  }

  return { userId, role, tenantId: ut.tenantId };
}

async function requireEditor(): Promise<Authed | { error: NextResponse }> {
  const a = await loadAuth();
  if ("error" in a) return a;
  
  // The role check is bypassed for now to allow all users.
  /*
  if (!EDITOR_ROLES.has(a.role)) {
    return { error: NextResponse.json({ error: `Forbidden: role '${a.role}'` }, { status: 403 }) };
  }
  */
  
  return a;
}

/** GET /api/sharepoint */
export async function GET() {
  const a = await loadAuth();
  if ("error" in a) return a.error;

  const nodes = await prisma.sharePointNode.findMany({
    where: { tenantId: a.tenantId },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(nodes);
}

/** POST /api/sharepoint */
export async function POST(req: Request) {
  const a = await requireEditor();
  if ("error" in a) return a.error;

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

  if (parentId) {
    const parent = await prisma.sharePointNode.findFirst({
      where: { id: parentId, tenantId: a.tenantId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found in tenant" }, { status: 400 });
    }
  }

  const sanitize = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.map((x) => String(x).trim()).filter(Boolean)))
      : [];

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
      tenantId: a.tenantId,
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
