// src/app/api/tenants/route.ts
// Returns the tenants the current user belongs to

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const userTenants = await prisma.userTenant.findMany({
      where: { userId: session.user.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            logo: true,
            address: true,
            city: true,
            province: true,
            postalCode: true,
            phone: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const tenants = userTenants
      .filter((ut) => ut.tenant.isActive)
      .map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
        plan: ut.tenant.plan,
        logo: ut.tenant.logo,
        address: ut.tenant.address,
        city: ut.tenant.city,
        province: ut.tenant.province,
        postalCode: ut.tenant.postalCode,
        phone: ut.tenant.phone,
        role: ut.role,
      }));

    return NextResponse.json({
      ok: true,
      data: tenants,
      activeTenantId: session.user.activeTenantId,
    });
  } catch (error) {
    console.error("GET /api/tenants error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des tenants" },
      { status: 500 }
    );
  }
}
