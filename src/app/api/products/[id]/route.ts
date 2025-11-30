// src/app/api/products/[id]/route.ts
// Delete product from return - DELETE
// PostgreSQL version

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { Return, ReturnProduct } from "@/types/returns";

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
    const products = await query<ReturnProduct>(
      "SELECT * FROM return_products WHERE id = $1",
      [productId]
    );

    if (products.length === 0) {
      return NextResponse.json({ ok: false, error: "Produit non trouvé" }, { status: 404 });
    }

    const product = products[0];

    // Get the return
    const returns = await query<Return>(
      "SELECT * FROM returns WHERE id = $1",
      [product.return_id]
    );

    if (returns.length === 0) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const existing = returns[0];
    const userRole = (session.user as { role?: string }).role;

    // Check if return can be edited
    if (existing.is_final && !existing.is_standby) {
      return NextResponse.json(
        { ok: false, error: "Impossible de modifier un retour finalisé" },
        { status: 400 }
      );
    }

    // Vérificateur cannot delete products from verified returns
    if (userRole === "Vérificateur" && existing.is_verified) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer un produit d'un retour vérifié" },
        { status: 400 }
      );
    }

    // Expert can only modify their own returns
    const userName = session.user.name || "";
    if (userRole === "Expert" && !existing.expert?.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Check if this is the last product
    const productCount = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM return_products WHERE return_id = $1",
      [existing.id]
    );

    if (parseInt(productCount[0]?.count || "0", 10) <= 1) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer le dernier produit d'un retour" },
        { status: 400 }
      );
    }

    // Delete product
    await query("DELETE FROM return_products WHERE id = $1", [productId]);

    return NextResponse.json({ ok: true, message: "Produit supprimé" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression du produit" },
      { status: 500 }
    );
  }
}
