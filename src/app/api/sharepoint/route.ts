// src/app/api/sharepoint/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";   // ✅ use "next-auth"
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: (session.user as any).id },
  });
  if (!userTenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const nodes = await prisma.sharePointNode.findMany({
    where: { tenantId: userTenant.tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(nodes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: (session.user as any).id },
  });
  if (!userTenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, parentId, type = "folder", icon } = body ?? {};
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const newNode = await prisma.sharePointNode.create({
    data: {
      name: name.trim(),
      parentId: parentId ?? null, // root allowed
      tenantId: userTenant.tenantId,
      type,
      icon,
    },
  });

  return NextResponse.json(newNode, { status: 201 });
}
