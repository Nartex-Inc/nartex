// src/app/api/user/role/route.ts
// Matching actual Prisma UserRole enum: Gestionnaire, Analyste, Verificateur, Facturation, Expert, user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Admin emails - these users have full admin access regardless of role
const ADMIN_EMAILS = ["n.labranche@sinto.ca"];

// Roles that have admin privileges
const ADMIN_ROLES = ["Gestionnaire"];

// Helper to check if user is admin
function isAdmin(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  if (role && ADMIN_ROLES.includes(role)) return true;
  return false;
}

// GET - List all users with their roles (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Get current user to check admin status
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, email: true },
    });

    // Check if user is admin
    if (!isAdmin(currentUser?.email, currentUser?.role)) {
      return NextResponse.json(
        { error: "Accès non autorisé. Droits administrateur requis." },
        { status: 403 }
      );
    }

    // Fetch all users with their tenant assignments
    // Try with canManageTickets first; fall back without it if column doesn't exist yet
    let users;
    try {
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
          canManageTickets: true,
          createdAt: true,
          updatedAt: true,
          tenants: {
            include: {
              tenant: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Column may not exist yet if migration hasn't run
      users = (await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          tenants: {
            include: {
              tenant: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })).map((u) => ({ ...u, canManageTickets: false as boolean }));
    }

    // Transform to expected format
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      email: user.email,
      image: user.image,
      role: user.role || "user",
      canManageTickets: (user as any).canManageTickets ?? false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tenants: user.tenants.map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      })),
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}

// PATCH - Update a user's role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Get current user to check admin status
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, email: true },
    });

    // Check if user is admin
    if (!isAdmin(currentUser?.email, currentUser?.role)) {
      return NextResponse.json(
        { error: "Accès non autorisé. Droits administrateur requis." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role, canManageTickets } = body;

    // Support updating canManageTickets independently
    if (userId && canManageTickets !== undefined && role === undefined) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { canManageTickets: !!canManageTickets },
        });
        return NextResponse.json({ message: "Permission mise à jour avec succès" });
      } catch {
        return NextResponse.json(
          { error: "La colonne canManageTickets n'existe pas encore. Migration en attente." },
          { status: 500 }
        );
      }
    }

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId et role sont requis" },
        { status: 400 }
      );
    }

    // Valid roles from your Prisma UserRole enum
    const validRoles = [
      "Gestionnaire",
      "Administrateur",
      "Analyste",
      "Verificateur",
      "Facturation",
      "Expert",
      "user"
    ];
    
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rôle invalide. Valeurs acceptées: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Prevent admin from demoting themselves if they're the last admin
    if (currentUser?.id === userId && role !== "Gestionnaire" && role !== "Administrateur") {
      const adminCount = await prisma.user.count({
        where: {
          OR: [
            { role: "Gestionnaire" },
            { role: "Administrateur" },
            { email: { in: ADMIN_EMAILS } },
          ],
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Impossible de rétrograder le dernier administrateur" },
          { status: 400 }
        );
      }
    }

    // Update the user's role - cast to the enum type
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as "Gestionnaire" | "Administrateur" | "Analyste" | "Verificateur" | "Facturation" | "Expert" | "user" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Rôle mis à jour avec succès",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du rôle" },
      { status: 500 }
    );
  }
}
