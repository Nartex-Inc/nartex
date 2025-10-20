// Force Node runtime + no caching for Prisma
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

type Authed = { userId: string; role: string; tenantId: string };

function toJsonError(e: unknown, fallback = "Internal error", status = 500) {
  const msg =
    typeof e === "object" && e && "message" in e
      ? String((e as any).message)
      : String(e);
  // Don’t expose full stack traces in prod; message is enough to debug quickly
  return NextResponse.json({ error: fallback, detail: msg }, { status });
}

async function loadAuth(): Promise<Authed> {
  try {
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
  } catch (e) {
    throw new Error(
      "AUTH_LOAD_FAILED: " +
        (typeof e === "object" && e && "message" in e ? (e as any).message : String(e))
    );
  }
}

/** GET /api/sharepoint — list all nodes for the user's tenant */
export async function GET() {
  try {
    const a = await loadAuth();

    const nodes = await prisma.sharePointNode.findMany({
      where: { tenantId: a.tenantId },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(nodes);
  } catch (e) {
    // If auth failed, return 401/404 style messages instead of opaque 500
    const msg = String(e);
    if (msg.includes("Not authenticated")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (msg.includes("Tenant not found")) {
      return NextResponse.json({ error: "Tenant not found for user" }, { status: 404 });
    }
    return toJsonError(e);
  }
}

/** POST /api/sharepoint — create a node (no department column anywhere) */
export async function POST(req: Request) {
  try {
    const a = await loadAuth();

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
        return NextResponse.json(
          { error: "Parent not found in tenant" },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "permissions.edit must be an array" },
          { status: 400 }
        );
      }
      if (permissions.read && !Array.isArray(permissions.read)) {
        return NextResponse.json(
          { error: "permissions.read must be an array" },
          { status: 400 }
        );
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

    const created = await prisma.sharePointNode.create({
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

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return toJsonError(e);
  }
}
