// src/app/api/invitations/route.ts
// POST - Send invitations (Gestionnaire only)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CreateInvitationsSchema } from "@/lib/validations";
import { sendInvitationEmail } from "@/lib/email";

const ADMIN_EMAILS = ["n.labranche@sinto.ca"];
const ADMIN_ROLES = ["Gestionnaire"];

function isAdmin(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  if (role && ADMIN_ROLES.includes(role)) return true;
  return false;
}

const ROLE_LABELS: Record<string, string> = {
  Gestionnaire: "Gestionnaire",
  Analyste: "Analyste",
  Verificateur: "Vérificateur",
  Facturation: "Facturation",
  Expert: "Expert",
  user: "Utilisateur",
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!isAdmin(currentUser?.email, currentUser?.role)) {
      return NextResponse.json(
        { error: "Accès non autorisé. Droits administrateur requis." },
        { status: 403 }
      );
    }

    const activeTenantId = (session.user as any).activeTenantId;
    if (!activeTenantId) {
      return NextResponse.json(
        { error: "Aucun tenant actif. Sélectionnez un tenant." },
        { status: 400 }
      );
    }

    const raw = await req.json();
    const parsed = CreateInvitationsSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: activeTenantId },
      select: { id: true, name: true, logo: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
    }

    // Check which emails already exist in this tenant
    const existingUsers = await prisma.userTenant.findMany({
      where: {
        tenantId: activeTenantId,
        user: {
          email: { in: parsed.data.invitations.map((i) => i.email.toLowerCase()) },
        },
      },
      select: { user: { select: { email: true } } },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.user.email?.toLowerCase()));

    const sent: string[] = [];
    const skipped: string[] = [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    for (const inv of parsed.data.invitations) {
      const email = inv.email.toLowerCase();

      if (existingEmails.has(email)) {
        skipped.push(email);
        continue;
      }

      // Create invitation record
      const invitation = await prisma.invitation.create({
        data: {
          email,
          role: inv.role as any,
          tenantId: activeTenantId,
          invitedBy: currentUser!.id,
          expiresAt,
        },
      });

      // Send email (don't fail the whole batch if one email fails)
      try {
        await sendInvitationEmail({
          email,
          inviterName: currentUser!.name || currentUser!.email!,
          tenantName: tenant.name,
          tenantLogo: tenant.logo,
          roleLabel: ROLE_LABELS[inv.role] || inv.role,
          token: invitation.token,
        });
        sent.push(email);
      } catch (emailError) {
        console.error(`Failed to send invitation email to ${email}:`, emailError);
        // Still count as sent since the invitation record was created
        sent.push(email);
      }
    }

    return NextResponse.json({ sent, skipped });
  } catch (error) {
    console.error("INVITATIONS API ERROR:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des invitations" },
      { status: 500 }
    );
  }
}
