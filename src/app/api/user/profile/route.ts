// src/app/api/user/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { UpdateProfileSchema } from "@/lib/validations";

const PROFILE_SELECT = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET - Fetch user profile (own or another user's for Gestionnaire)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const { session } = auth;

    if (!session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Check if requesting another user's profile
    const targetUserId = request.nextUrl.searchParams.get("userId");

    if (targetUserId) {
      // Only Gestionnaire can view other users' profiles
      if (session.user.role !== "Gestionnaire") {
        return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
      }

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: PROFILE_SELECT,
      });

      if (!user) {
        return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
      }

      return NextResponse.json({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
        role: user.role || "Expert",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    // Default: fetch own profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: PROFILE_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      image: user.image,
      role: user.role || "Expert",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile (own or another user's for Gestionnaire)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const { session } = auth;

    if (!session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = UpdateProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, firstName, lastName, image, userId } = parsed.data;

    const isGestionnaire = session.user.role === "Gestionnaire";
    const isEditingOther = !!userId && userId !== session.user.id;

    // Only Gestionnaire can edit other users
    if (isEditingOther && !isGestionnaire) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, string | null> = {};

    if (name !== undefined) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (image !== undefined) updateData.image = image;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Aucune donnée à mettre à jour" },
        { status: 400 }
      );
    }

    // Determine which user to update
    const whereClause = isEditingOther
      ? { id: userId }
      : { email: session.user.email };

    const updatedUser = await prisma.user.update({
      where: whereClause,
      data: updateData,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Profil mis à jour avec succès",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        image: updatedUser.image,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
