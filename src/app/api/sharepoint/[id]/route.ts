// src/app/api/sharepoint/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// PATCH handler to rename a folder
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } // This is the corrected inline type
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const updatedNode = await prisma.sharePointNode.update({
      where: { id: params.id },
      data: { name },
    });
    return NextResponse.json(updatedNode);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
  }
}

// DELETE handler to delete a folder
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } // This is the corrected inline type
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await prisma.sharePointNode.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'Node deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}
