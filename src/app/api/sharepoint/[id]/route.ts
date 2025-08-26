// src/app/api/sharepoint/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// PATCH handler to rename a folder
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const updatedNode = await prisma.sharePointNode.update({
    where: { id: params.id },
    data: { name },
  });

  return NextResponse.json(updatedNode);
}

// DELETE handler to delete a folder
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await prisma.sharePointNode.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: 'Node deleted successfully' }, { status: 200 });
}
