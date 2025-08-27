// src/app/api/sharepoint/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// in a route or server component:
const session = await getServerSession(authOptions);

// GET: return all nodes for the tenant
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userTenant = await prisma.userTenant.findFirst({ where: { userId: session.user.id } });
  if (!userTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const nodes = await prisma.sharePointNode.findMany({
    where: { tenantId: userTenant.tenantId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(nodes);
}

// POST: create a node
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userTenant = await prisma.userTenant.findFirst({ where: { userId: session.user.id } });
  if (!userTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { name, parentId, type = 'folder', icon } = await req.json();

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  // parentId can be null (root)
  const newNode = await prisma.sharePointNode.create({
    data: { name, parentId: parentId ?? null, tenantId: userTenant.tenantId, type, icon },
  });

  return NextResponse.json(newNode, { status: 201 });
}
