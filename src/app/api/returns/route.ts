// src/app/api/returns/route.ts
// Returns list and create - GET (list), POST (create)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { formatReturnCode, getReturnStatus } from "@/types/returns";
import type { ReturnRow, Reporter, Cause } from "@/types/returns";
import { Prisma } from "@prisma/client";

// MAPPING: Legacy Name -> New Email
const LEGACY_USER_MAP: Record<string, string> = {
  'Suzie Boutin': 's.boutin@sinto.ca',
  'Hugo Fortin': 'h.fortin@sinto.ca',
  'Anick Poulin': 'a.poulin@sinto.ca',
  'Jessica Lessard': 'j.lessard@sinto.ca',
  'Stéphanie Veilleux': 's.veilleux@sinto.ca',
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    // Handle "Get Next ID" request (MAX + 1 Logic)
    if (mode === "next_id") {
      const lastReturn = await prisma.return.findFirst({
        select: { id: true },
        orderBy: { id: 'desc' }
      });
      const nextId = (lastReturn?.id ?? 0) + 1;
      return NextResponse.json({ ok: true, nextId });
    }

    // --- Standard List Logic ---
    const q = searchParams.get("q") || "";
    const cause = searchParams.get("cause");
    const reporter = searchParams.get("reporter");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const history = searchParams.get("history") === "true";
    const take = parseInt(searchParams.get("take") || "200", 10);

    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";

    const where: Prisma.ReturnWhereInput = {};
    const AND: Prisma.ReturnWhereInput[] = [];

    // Safety: Hide corrupted rows (Draft & Final)
    AND.push({
      NOT: {
        AND: [{ isDraft: true }, { isFinal: true }]
      }
    });

    if (userRole === "Expert") {
      AND.push({ expert: { contains: userName, mode: "insensitive" } });
    }

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

    if (cause && cause !== "all") AND.push({ cause: cause as Cause });
    if (reporter && reporter !== "all") AND.push({ reporter: reporter as Reporter });
    if (dateFrom) AND.push({ reportedAt: { gte: new Date(dateFrom) } });
    if (dateTo) AND.push({ reportedAt: { lte: new Date(dateTo) } });

    if (status === "draft") {
      AND.push({ isDraft: true });
    } else if (status === "awaiting_physical") {
      AND.push({ returnPhysical: true, isVerified: false, isDraft: false, isFinal: false });
    } else if (status === "received_or_no_physical") {
      AND.push({
        isDraft: false,
        isFinal: false,
        OR: [
          { returnPhysical: false },
          { returnPhysical: true, isVerified: true },
        ],
      });
    } else if (status === "standby") {
      AND.push({ isStandby: true });
    } else if (status === "finalized") {
      AND.push({ isFinal: true });
    }

    if (!status) {
      AND.push({ isStandby: false });
      if (!history) {
        AND.push({ isFinal: false });
      }
    }

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

    // --- USER AVATAR LOOKUP LOGIC ---
    // 1. Collect all unique emails/names from the returns list
    const emailsToFetch = new Set<string>();
    
    returns.forEach(r => {
      const initiator = r.initiatedBy || "";
      // Check legacy map first
      if (LEGACY_USER_MAP[initiator]) {
        emailsToFetch.add(LEGACY_USER_MAP[initiator]);
      } 
      // If it looks like an email, add it directly (for modern returns)
      else if (initiator.includes("@")) {
        emailsToFetch.add(initiator);
      }
    });

    // 2. Fetch User objects from DB
    const users = await prisma.user.findMany({
      where: { email: { in: Array.from(emailsToFetch) } },
      select: { email: true, image: true, name: true }
    });

    // 3. Create a Map for O(1) access
    const userMap = new Map<string, { image: string | null, name: string | null }>();
    users.forEach(u => {
      if (u.email) userMap.set(u.email, { image: u.image, name: u.name });
    });

    const data: ReturnRow[] = returns.map((ret) => {
      // Resolve Created By info
      const initiatorName = ret.initiatedBy || "Système";
      let avatarUrl = null;
      
      // Try to find email
      const email = LEGACY_USER_MAP[initiatorName] || (initiatorName.includes("@") ? initiatorName : null);
      
      if (email && userMap.has(email)) {
        const u = userMap.get(email);
        avatarUrl = u?.image || null;
        // Optionally override name with DB name if desired, or keep legacy name
      }

      return {
        id: formatReturnCode(ret.id),
        codeRetour: ret.id,
        reportedAt: ret.reportedAt.toISOString(),
        reporter: ret.reporter as Reporter,
        cause: ret.cause as Cause,
        expert: ret.expert || "",
        client: ret.client || "",
        noClient: ret.noClient,
        noCommande: ret.noCommande,
        tracking: ret.noTracking,
        status: getReturnStatus(ret),
        standby: ret.isStandby,
        amount: ret.amount ? Number(ret.amount) : null,
        dateCommande: ret.dateCommande,
        transport: ret.transporteur,
        description: ret.description,
        
        // Mapped fields
        physicalReturn: ret.returnPhysical, 
        verified: ret.isVerified,
        finalized: ret.isFinal,
        isPickup: ret.isPickup,
        isCommande: ret.isCommande,
        isReclamation: ret.isReclamation,
        isDraft: ret.isDraft,
        
        noBill: ret.noBill,
        noBonCommande: ret.noBonCommande,
        noReclamation: ret.noReclamation,

        // Populated Creator Info
        createdBy: {
          name: initiatorName,
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
        })),
        attachments: ret.attachments.map((a) => ({
          id: a.fileId,
          name: a.fileName,
          url: `https://drive.google.com/file/d/${a.fileId}/preview`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${a.fileId}`,
        })),
      };
    });

    return NextResponse.json({ ok: true, data });
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.expert || !body.client) {
      return NextResponse.json(
        { ok: false, error: "Expert et client sont requis" },
        { status: 400 }
      );
    }

    const hasRequiredFields = body.reporter && body.cause && body.expert && body.client;
    const hasProducts = body.products 
      && body.products.length > 0 
      && body.products.some((p: { quantite?: number }) => (p.quantite ?? 0) > 0);
    
    const isDraft = !(hasRequiredFields && hasProducts);

    const lastReturn = await prisma.return.findFirst({
      select: { id: true },
      orderBy: { id: 'desc' }
    });
    const nextId = (lastReturn?.id ?? 0) + 1;

    const ret = await prisma.return.create({
      data: {
        id: nextId,
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
        initiatedBy: session.user.name || "Système",
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
      include: {
        products: true
      }
    });

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
