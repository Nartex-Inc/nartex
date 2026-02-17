// src/app/api/user/tenants/route.ts
// Assign/remove tenant memberships for a user (admin only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ADMIN_EMAILS = ["n.labranche@sinto.ca"];
const ADMIN_ROLES = ["Gestionnaire"];

function isAdmin(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  if (role && ADMIN_ROLES.includes(role)) return true;
  return false;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, email: true },
    });

    if (!isAdmin(currentUser?.email, currentUser?.role)) {
      return NextResponse.json(
        { error: "Accès non autorisé. Droits administrateur requis." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, tenantIds } = body;

    if (!userId || !Array.isArray(tenantIds)) {
      return NextResponse.json(
        { error: "userId et tenantIds sont requis" },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Verify all tenant IDs exist
    if (tenantIds.length > 0) {
      const existingTenants = await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true },
      });

      if (existingTenants.length !== tenantIds.length) {
        return NextResponse.json(
          { error: "Un ou plusieurs tenants sont invalides" },
          { status: 400 }
        );
      }
    }

    // Atomically replace all tenant assignments
    await prisma.$transaction([
      prisma.userTenant.deleteMany({
        where: { userId },
      }),
      ...tenantIds.map((tenantId: string) =>
        prisma.userTenant.create({
          data: { userId, tenantId },
        })
      ),
    ]);

    // Return updated tenant list
    const updatedTenants = await prisma.userTenant.findMany({
      where: { userId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({
      message: "Tenants mis à jour avec succès",
      tenants: updatedTenants.map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      })),
    });
  } catch (error) {
    console.error("Error updating user tenants:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des tenants" },
      { status: 500 }
    );
  }
}
