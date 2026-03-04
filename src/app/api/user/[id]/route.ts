import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ADMIN_EMAILS = ["n.labranche@sinto.ca"];
const ADMIN_ROLES = ["Gestionnaire", "GestionnaireTest"];
const PROTECTED_EMAILS = ["n.labranche@sinto.ca"];

function isAdmin(
  email: string | null | undefined,
  role: string | null | undefined
): boolean {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  if (role && ADMIN_ROLES.includes(role)) return true;
  return false;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, email: true },
    });

    if (!isAdmin(currentUser?.email, currentUser?.role)) {
      return NextResponse.json(
        { error: "Accès non autorisé. Droits administrateur requis." },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;

    // Prevent self-deletion
    if (currentUser?.id === targetUserId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 }
      );
    }

    // Look up the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    // Tenant isolation: verify admin and target share at least one tenant
    if (!ADMIN_EMAILS.includes(currentUser?.email ?? "")) {
      const sharedTenant = await prisma.userTenant.findFirst({
        where: {
          userId: currentUser!.id,
          tenantId: {
            in: (
              await prisma.userTenant.findMany({
                where: { userId: targetUserId },
                select: { tenantId: true },
              })
            ).map((t) => t.tenantId),
          },
        },
      });
      if (!sharedTenant) {
        return NextResponse.json(
          { error: "Accès non autorisé. Aucun tenant en commun." },
          { status: 403 }
        );
      }
    }

    // Prevent deleting protected admin accounts
    if (targetUser.email && PROTECTED_EMAILS.includes(targetUser.email)) {
      return NextResponse.json(
        { error: "Ce compte administrateur est protégé et ne peut pas être supprimé." },
        { status: 403 }
      );
    }

    // Delete in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete ReturnComments (has userId but no FK cascade to User)
      await tx.returnComment.deleteMany({
        where: { userId: targetUserId },
      });

      // 2. Delete pending Invitations matching the user's email (so re-registration isn't blocked)
      if (targetUser.email) {
        await tx.invitation.deleteMany({
          where: { email: targetUser.email, status: "pending" },
        });
      }

      // 3. Delete the User — Prisma cascades handle:
      //    Account, Session, UserTenant, WebAuthnCredential, Notification,
      //    Invitation (sent by user), SupportTicket (after schema fix)
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    return NextResponse.json({
      message: `Utilisateur ${targetUser.name || targetUser.email} supprimé avec succès.`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur." },
      { status: 500 }
    );
  }
}
