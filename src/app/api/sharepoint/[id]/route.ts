// src/app/api/sharepoint/[id]/route.ts
// THIS IS A NEW FILE - Create this in a NEW [id] folder
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// PATCH handler to rename a folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userTenant = await prisma.userTenant.findFirst({ 
      where: { userId: session.user.id } 
    });
    
    if (!userTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Verify the node belongs to the user's tenant
    const existingNode = await prisma.sharePointNode.findFirst({
      where: { 
        id: params.id,
        tenantId: userTenant.tenantId 
      }
    });

    if (!existingNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const updatedNode = await prisma.sharePointNode.update({
      where: { id: params.id },
      data: { name },
    });

    return NextResponse.json(updatedNode);
  } catch (error) {
    console.error('Error updating SharePoint node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userTenant = await prisma.userTenant.findFirst({ 
      where: { userId: session.user.id } 
    });
    
    if (!userTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify the node belongs to the user's tenant
    const existingNode = await prisma.sharePointNode.findFirst({
      where: { 
        id: params.id,
        tenantId: userTenant.tenantId 
      }
    });

    if (!existingNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // This will cascade delete if you have onDelete: Cascade in your schema
    await prisma.sharePointNode.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Node deleted successfully' });
  } catch (error) {
    console.error('Error deleting SharePoint node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}
