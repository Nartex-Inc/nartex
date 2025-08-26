// src/app/api/sharepoint/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth'; // Assuming your auth setup exports this

// GET handler to fetch the entire folder structure for a tenant
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // This is a placeholder to get the tenant ID. Adapt to your session logic.
  const userTenant = await prisma.userTenant.findFirst({
    where: { userId: session.user.id },
  });

  if (!userTenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const nodes = await prisma.sharePointNode.findMany({
    where: { tenantId: userTenant.tenantId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(nodes);
}

// POST handler to create a new folder
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const userTenant = await prisma.userTenant.findFirst({
      where: { userId: session.user.id },
  });

  if (!userTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const { name, parentId } = await req.json();

  if (!name || !parentId) {
    return NextResponse.json({ error: 'Name and parentId are required' }, { status: 400 });
  }

  const newNode = await prisma.sharePointNode.create({
    data: {
      name,
      parentId,
      tenantId: userTenant.tenantId,
      type: 'folder', // Default new items to be folders
    },
  });

  return NextResponse.json(newNode, { status: 201 });
}
