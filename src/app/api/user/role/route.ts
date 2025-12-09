// src/app/api/user/role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// List of admin emails that can manage roles
const ADMIN_EMAILS = ["n.labranche@sinto.ca"];

// Check if user is admin
async function isAdmin(email: string): Promise<boolean> {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  
  return user?.role === "admin";
}

// GET - List all users with their roles (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(session.user.email);
    if (!isUserAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
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
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(session.user.email);
    if (!isUserAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId et role sont requis" },
        { status: 400 }
      );
    }

    // Validate role - these should match your Prisma Role enum
    const validRoles = [
      "admin",
      "Gestionnaire",
      "ventes-exec",
      "ventes_exec",
      "Expert",
      "facturation",
      "user",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rôle invalide. Rôles valides: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Prevent removing admin role from self
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });

    if (
      targetUser?.email?.toLowerCase() === session.user.email.toLowerCase() &&
      targetUser?.role === "admin" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer votre propre rôle admin" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any }, // Cast to match your Prisma enum
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du rôle" },
      { status: 500 }
    );
  }
}
