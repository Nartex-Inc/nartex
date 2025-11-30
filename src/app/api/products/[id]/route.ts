// src/app/api/products/[id]/route.ts
// Delete product from return - DELETE

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return NextResponse.json({ ok: false, error: "ID produit invalide" }, { status: 400 });
    }

    // Get product and its return
    const product = await prisma.returnProduct.findUnique({
      where: { id: productId },
      include: { return: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Produit non trouvé" }, { status: 404 });
    }

    const ret = product.return;
    const userRole = (session.user as { role?: string }).role;

    // Check if return can be edited
    if (ret.isFinal && !ret.isStandby) {
      return NextResponse.json(
        { ok: false, error: "Impossible de modifier un retour finalisé" },
        { status: 400 }
      );
    }

    // Vérificateur cannot delete products from verified returns
    if (userRole === "Verificateur" && ret.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer un produit d'un retour vérifié" },
        { status: 400 }
      );
    }

    // Expert can only modify their own returns
    const userName = session.user.name || "";
    if (userRole === "Expert" && !ret.expert.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Check if this is the last product
    const productCount = await prisma.returnProduct.count({
      where: { returnId: ret.id },
    });

    if (productCount <= 1) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer le dernier produit d'un retour" },
        { status: 400 }
      );
    }

    // Delete product
    await prisma.returnProduct.delete({ where: { id: productId } });

    return NextResponse.json({ ok: true, message: "Produit supprimé" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression du produit" },
      { status: 500 }
    );
  }
}
