// src/app/api/invitations/[token]/route.ts
// GET - Public endpoint: look up invitation by token

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        tenant: {
          select: { name: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    }

    // Check expiry
    const isExpired = invitation.expiresAt < new Date();
    const effectiveStatus = isExpired && invitation.status === "pending" ? "expired" : invitation.status;

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      tenantName: invitation.tenant.name,
      status: effectiveStatus,
    });
  } catch (error) {
    console.error("INVITATION LOOKUP ERROR:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche de l'invitation" },
      { status: 500 }
    );
  }
}
