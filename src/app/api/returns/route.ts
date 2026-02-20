// src/app/api/returns/route.ts
// Main returns API with role-based filtering

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatReturnCode, getReturnStatus } from "@/types/returns";
import type { ReturnRow, Reporter, Cause } from "@/types/returns";
import { Prisma } from "@prisma/client";
import { notifyReturnCreated } from "@/lib/notifications";
import { requireTenant, requireRoles, normalizeRole } from "@/lib/auth-helpers";
import { CreateReturnSchema } from "@/lib/validations";

// User roles
export type UserRole = "Gestionnaire" | "Vérificateur" | "Facturation" | "Expert" | "Analyste";

// MAPPING: Legacy Name -> New Email
const LEGACY_USER_MAP: Record<string, string> = {
  'Suzie Boutin': 's.boutin@sinto.ca',
  'Hugo Fortin': 'h.fortin@sinto.ca',
  'Anick Poulin': 'a.poulin@sinto.ca',
  'Jessica Lessard': 'j.lessard@sinto.ca',
  'Stéphanie Veilleux': 's.veilleux@sinto.ca',
  'Nicolas Labranche': 'n.labranche@sinto.ca',
  'suzie boutin': 's.boutin@sinto.ca',
  'hugo fortin': 'h.fortin@sinto.ca',
  'anick poulin': 'a.poulin@sinto.ca',
  'jessica lessard': 'j.lessard@sinto.ca',
  'stéphanie veilleux': 's.veilleux@sinto.ca',
  'nicolas labranche': 'n.labranche@sinto.ca',
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    // Get next available ID
    if (mode === "next_id") {
      const lastReturn = await prisma.return.findFirst({
        select: { id: true },
        orderBy: { id: 'desc' }
      });
      const nextId = (lastReturn?.id ?? 0) + 1;
      return NextResponse.json({ ok: true, nextId });
    }

    const q = searchParams.get("q") || "";
    const cause = searchParams.get("cause");
    const reporter = searchParams.get("reporter");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const history = searchParams.get("history") === "true"; // Archive/History toggle
    const takeParam = searchParams.get("take");
    const take = takeParam ? parseInt(takeParam, 10) : undefined;

    const userRole = user.role as UserRole | undefined;
    const userName = user.name || "";

    // Normalize role for comparison (handle accent variations)
    const normalizedRole = normalizeRole(userRole);

    const where: Prisma.ReturnWhereInput = { tenantId };
    const AND: Prisma.ReturnWhereInput[] = [];

    // =======================================================================
    // ROLE-BASED FILTERING LOGIC
    // =======================================================================

    if (history) {
      // HISTORY MODE: Show only finalized returns (for all roles that can see history)
      AND.push({ isFinal: true, isStandby: false });
    } else {
      // ACTIVE MODE: Role-specific filtering (using normalized role comparison)
      if (normalizedRole === "gestionnaire") {
        // Gestionnaire sees ALL active returns including drafts
        AND.push({ isFinal: false });
      } else if (normalizedRole === "verificateur") {
        // Vérificateur ONLY sees returns where:
        // - returnPhysical == TRUE AND isVerified == FALSE
        // - NOT drafts, NOT finalized
        AND.push({
          returnPhysical: true,
          isVerified: false,
          isDraft: false,
          isFinal: false,
        });
      } else if (normalizedRole === "facturation") {
        // Facturation ONLY sees returns where EITHER:
        // - returnPhysical == TRUE AND isVerified == TRUE, OR
        // - returnPhysical == FALSE
        // - NOT drafts, NOT finalized
        AND.push({
          isDraft: false,
          isFinal: false,
          OR: [
            { returnPhysical: true, isVerified: true },
            { returnPhysical: false },
          ],
        });
      } else if (normalizedRole === "expert") {
        // Expert only sees their own returns (non-finalized)
        AND.push({
          expert: { contains: userName, mode: "insensitive" },
          isFinal: false,
          isDraft: false,
        });
      } else if (normalizedRole === "analyste") {
        // Analyste sees same as Facturation but read-only
        AND.push({
          isDraft: false,
          isFinal: false,
          OR: [
            { returnPhysical: true, isVerified: true },
            { returnPhysical: false },
          ],
        });
      } else {
        // Unknown role - show nothing for safety
        AND.push({ id: -1 });
      }
    }

    // Exclude standby unless specifically requested
    if (!history) {
      AND.push({ isStandby: false });
    }

    // Safety: Never show corrupted rows (Draft AND Final)
    AND.push({
      NOT: {
        AND: [{ isDraft: true }, { isFinal: true }, { isStandby: false }]
      }
    });

    // Search filter
    if (q) {
      AND.push({
        OR: [
          { client: { contains: q, mode: "insensitive" } },
          { noCommande: { contains: q, mode: "insensitive" } },
          { noClient: { contains: q, mode: "insensitive" } },
          { expert: { contains: q, mode: "insensitive" } },
          { products: { some: { codeProduit: { contains: q, mode: "insensitive" } } } },
        ],
      });
    }

    // Additional filters
    if (cause && cause !== "all") AND.push({ cause: cause as Cause });
    if (reporter && reporter !== "all") AND.push({ reporter: reporter as Reporter });
    if (dateFrom) AND.push({ reportedAt: { gte: new Date(dateFrom) } });
    if (dateTo) AND.push({ reportedAt: { lte: new Date(dateTo) } });

    if (AND.length > 0) where.AND = AND;

    const returns = await prisma.return.findMany({
      where,
      include: {
        products: { orderBy: { id: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { reportedAt: "desc" },
      take,
    });

    // =======================================================================
    // USER AVATAR LOOKUP
    // =======================================================================

    const emailsToFetch = new Set<string>();

    const resolveCreatorEmail = (ret: { initiatedBy: string | null }): string | null => {
      if (ret.initiatedBy) {
        const initiator = ret.initiatedBy.trim();
        if (LEGACY_USER_MAP[initiator]) return LEGACY_USER_MAP[initiator];
        const lowerInitiator = initiator.toLowerCase();
        if (LEGACY_USER_MAP[lowerInitiator]) return LEGACY_USER_MAP[lowerInitiator];
        if (initiator.includes("@")) return initiator;
      }
      return null;
    };

    returns.forEach(r => {
      const email = resolveCreatorEmail(r);
      if (email) emailsToFetch.add(email);
    });

    const users = await prisma.user.findMany({
      where: { email: { in: Array.from(emailsToFetch) } },
      select: { email: true, image: true, name: true }
    });

    const userMap = new Map<string, { image: string | null, name: string | null }>();
    users.forEach(u => {
      if (u.email) userMap.set(u.email, { image: u.image, name: u.name });
    });

    // =======================================================================
    // BUILD RESPONSE
    // =======================================================================

    const data: ReturnRow[] = returns.map((ret) => {
      const creatorNameRaw = ret.initiatedBy || "Système";
      const creatorEmail = resolveCreatorEmail(ret);
      
      let avatarUrl: string | null = null;
      let displayName = creatorNameRaw;

      if (creatorEmail && userMap.has(creatorEmail)) {
        const userData = userMap.get(creatorEmail);
        avatarUrl = userData?.image || null;
        if (userData?.name) displayName = userData.name;
      }

      return {
        id: formatReturnCode(ret.id),
        codeRetour: ret.id,
        reportedAt: ret.reportedAt.toISOString(),
        reporter: ret.reporter as Reporter,
        cause: ret.cause as Cause,
        expert: ret.expert || "",
        client: ret.client || "",
        noClient: ret.noClient === "NULL" ? null : ret.noClient,
        noCommande: ret.noCommande === "NULL" ? null : ret.noCommande,
        tracking: ret.noTracking === "NULL" ? null : ret.noTracking,
        status: getReturnStatus(ret),
        standby: ret.isStandby,
        amount: ret.amount ? Number(ret.amount) : null,
        dateCommande: ret.dateCommande === "NULL" ? null : ret.dateCommande,
        transport: ret.transporteur === "NULL" ? null : ret.transporteur,
        description: ret.description === "NULL" ? null : ret.description,

        physicalReturn: ret.returnPhysical,
        verified: ret.isVerified,
        finalized: ret.isFinal,
        isPickup: ret.isPickup,
        isCommande: ret.isCommande,
        isReclamation: ret.isReclamation,
        isDraft: ret.isDraft,

        noBill: ret.noBill === "NULL" ? null : ret.noBill,
        noBonCommande: ret.noBonCommande === "NULL" ? null : ret.noBonCommande,
        noReclamation: ret.noReclamation === "NULL" ? null : ret.noReclamation,

        // Verification fields (visible after verification)
        verifiedBy: ret.verifiedBy
          ? { name: ret.verifiedBy, at: ret.verifiedAt?.toISOString() || null }
          : null,

        // Finalization fields (visible after finalization)
        warehouseOrigin: ret.warehouseOrigin === "NULL" ? null : ret.warehouseOrigin,
        warehouseDestination: ret.warehouseDestination === "NULL" ? null : ret.warehouseDestination,
        noCredit: ret.noCredit === "NULL" ? null : ret.noCredit,
        noCredit2: ret.noCredit2 === "NULL" ? null : ret.noCredit2,
        noCredit3: ret.noCredit3 === "NULL" ? null : ret.noCredit3,
        creditedTo: ret.creditedTo === "NULL" ? null : ret.creditedTo,
        creditedTo2: ret.creditedTo2 === "NULL" ? null : ret.creditedTo2,
        creditedTo3: ret.creditedTo3 === "NULL" ? null : ret.creditedTo3,
        villeShipto: ret.villeShipto === "NULL" ? null : ret.villeShipto,
        totalWeight: ret.totalWeight ? Number(ret.totalWeight) : null,
        transportAmount: ret.transportAmount ? Number(ret.transportAmount) : null,
        restockingAmount: ret.restockingAmount ? Number(ret.restockingAmount) : null,
        finalizedBy: ret.finalizedBy
          ? { name: ret.finalizedBy, at: ret.finalizedAt?.toISOString() || null }
          : null,

        createdBy: {
          name: displayName,
          avatar: avatarUrl,
          at: (ret.initializedAt || ret.reportedAt).toISOString()
        },

        products: ret.products.map((p) => ({
          id: String(p.id),
          codeProduit: p.codeProduit,
          descriptionProduit: p.descrProduit || "",
          descriptionRetour: p.descriptionRetour || "",
          quantite: p.quantite,
          quantiteRecue: p.quantiteRecue,
          qteInventaire: p.qteInventaire,
          qteDetruite: p.qteDetruite,
          tauxRestock: p.tauxRestock ? Number(p.tauxRestock) : null,
          poidsUnitaire: p.weightProduit ? Number(p.weightProduit) : null,
          poidsTotal: p.poids ? Number(p.poids) : null,
        })),
        attachments: ret.attachments.map((a) => ({
          id: a.fileId,
          name: a.fileName,
          url: `https://drive.google.com/file/d/${a.fileId}/preview`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${a.fileId}`,
        })),
      };
    });

    return NextResponse.json({ ok: true, data, userRole: user.role });
  } catch (error) {
    console.error("GET /api/returns error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des retours" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Only Gestionnaire or Analyste can create returns
    const roleError = requireRoles(user, ["gestionnaire", "analyste"]);
    if (roleError) return roleError;

    const raw = await request.json();
    const parsed = CreateReturnSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const hasRequiredFields = body.reporter && body.cause && body.expert && body.client;
    const hasProducts = body.products
      && body.products.length > 0
      && body.products.some((p) => (p.quantite ?? 0) > 0);

    const isDraft = !(hasRequiredFields && hasProducts);

    const lastReturn = await prisma.return.findFirst({
      select: { id: true },
      orderBy: { id: 'desc' }
    });
    const nextId = (lastReturn?.id ?? 0) + 1;

    const ret = await prisma.return.create({
      data: {
        id: nextId,
        tenantId,
        reportedAt: body.reportedAt ? new Date(body.reportedAt) : new Date(),
        reporter: body.reporter || "expert",
        cause: body.cause || "production",
        expert: body.expert,
        client: body.client,
        noClient: body.noClient || null,
        noCommande: body.noCommande || null,
        noTracking: body.tracking || null,
        amount: body.amount || null,
        dateCommande: body.dateCommande || null,
        transporteur: body.transport || null,
        description: body.description || null,
        returnPhysical: body.physicalReturn ?? false,
        isPickup: body.isPickup ?? false,
        isCommande: body.isCommande ?? false,
        isReclamation: body.isReclamation ?? false,
        noBill: body.noBill || null,
        noBonCommande: body.noBonCommande || null,
        noReclamation: body.noReclamation || null,
        isDraft,
        isFinal: false,
        isVerified: false,
        isStandby: false,
        initiatedBy: user.name || user.email || "Système",
        initializedAt: new Date(),
        noCommandeCheckbox: body.noCommandeCheckbox ?? false,
        products: {
          create: (body.products && Array.isArray(body.products)) 
            ? body.products.map((p: { codeProduit: string; descriptionProduit?: string; descriptionRetour?: string; quantite?: number }) => ({
                codeProduit: p.codeProduit,
                descrProduit: p.descriptionProduit || null,
                descriptionRetour: p.descriptionRetour || null,
                quantite: p.quantite || 0,
              }))
            : []
        }
      },
      include: { products: true }
    });

    // Fire-and-forget notification
    notifyReturnCreated({
      returnId: ret.id,
      returnCode: formatReturnCode(ret.id),
      client: body.client,
      userName: user.name || user.email || "Système",
      tenantId,
    }).catch(console.error);

    return NextResponse.json({
      ok: true,
      data: {
        id: formatReturnCode(ret.id),
        codeRetour: ret.id,
        status: getReturnStatus(ret),
      },
    });
  } catch (error) {
    console.error("POST /api/returns error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du retour" },
      { status: 500 }
    );
  }
}
