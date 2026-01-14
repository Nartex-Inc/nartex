// src/app/api/returns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { formatReturnCode, getReturnStatus, REPORTER_LABELS } from "@/types/returns";
import type { ReturnRow, Reporter, Cause } from "@/types/returns";
import { Prisma } from "@prisma/client";

// MAPPING: Legacy Name -> New Email
// Used to resolve old records where initiatedBy stored names instead of emails
const LEGACY_USER_MAP: Record<string, string> = {
  'Suzie Boutin': 's.boutin@sinto.ca',
  'Hugo Fortin': 'h.fortin@sinto.ca',
  'Anick Poulin': 'a.poulin@sinto.ca',
  'Jessica Lessard': 'j.lessard@sinto.ca',
  'Stéphanie Veilleux': 's.veilleux@sinto.ca',
  'Nicolas Labranche': 'n.labranche@sinto.ca',
  // Lowercase fallbacks for safety
  'suzie boutin': 's.boutin@sinto.ca',
  'hugo fortin': 'h.fortin@sinto.ca',
  'anick poulin': 'a.poulin@sinto.ca',
  'jessica lessard': 'j.lessard@sinto.ca',
  'stéphanie veilleux': 's.veilleux@sinto.ca',
  'nicolas labranche': 'n.labranche@sinto.ca',
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

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

    // =========================================================================
    // USER AVATAR LOOKUP LOGIC
    // =========================================================================
    // Key concepts:
    // - `reporter` (enum): Type of person who reported (expert, transporteur, client, etc.)
    // - `expert`: Sales rep assigned to the client (NOT the creator)
    // - `initiatedBy`: The actual user who created the return in the system
    // =========================================================================

    const emailsToFetch = new Set<string>();

    /**
     * Resolve the email of the user who CREATED the return.
     * Always uses `initiatedBy` field, NOT `expert` (which is client data).
     */
    const resolveCreatorEmail = (ret: any): string | null => {
      if (ret.initiatedBy) {
        const initiator = ret.initiatedBy.trim();
        
        // Check legacy name -> email map
        if (LEGACY_USER_MAP[initiator]) {
          return LEGACY_USER_MAP[initiator];
        }
        
        // Case-insensitive check
        const lowerInitiator = initiator.toLowerCase();
        if (LEGACY_USER_MAP[lowerInitiator]) {
          return LEGACY_USER_MAP[lowerInitiator];
        }
        
        // If initiatedBy is already an email
        if (initiator.includes("@")) {
          return initiator;
        }
      }
      
      return null;
    };

    // Collect all emails we need to fetch
    returns.forEach(r => {
      const email = resolveCreatorEmail(r);
      if (email) emailsToFetch.add(email);
    });

    // Batch fetch all User objects
    const users = await prisma.user.findMany({
      where: { email: { in: Array.from(emailsToFetch) } },
      select: { email: true, image: true, name: true }
    });

    // Build a lookup map: email -> { image, name }
    const userMap = new Map<string, { image: string | null, name: string | null }>();
    users.forEach(u => {
      if (u.email) {
        userMap.set(u.email, { image: u.image, name: u.name });
      }
    });

    // =========================================================================
    // BUILD RESPONSE DATA
    // =========================================================================

    const data: ReturnRow[] = returns.map((ret) => {
      // FIXED: Always use initiatedBy for the creator name
      // `expert` is the sales rep assigned to the client, NOT who created the return
      const creatorNameRaw = ret.initiatedBy || "Système";
      const creatorEmail = resolveCreatorEmail(ret);
      
      let avatarUrl: string | null = null;
      let displayName = creatorNameRaw;

      // If we found a matching user, use their avatar and clean name
      if (creatorEmail && userMap.has(creatorEmail)) {
        const userData = userMap.get(creatorEmail);
        avatarUrl = userData?.image || null;
        // Override with cleaner name from user record if available
        if (userData?.name) {
          displayName = userData.name;
        }
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

        // FIXED: createdBy now correctly shows who created the return
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
        // Store the actual user who created this return
        initiatedBy: session.user.name || session.user.email || "Système",
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
