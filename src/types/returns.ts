// src/types/returns.ts
// TypeScript types for the returns management system
// Field names match prisma/schema.prisma

import type { Return, ReturnProduct, ReturnAttachment, Reporter, Cause } from "@prisma/client";

/* =============================================================================
   Re-export Prisma types for convenience
============================================================================= */

export type { Return, ReturnProduct, ReturnAttachment, Reporter, Cause };

/* =============================================================================
   Return Status (derived from flags)
============================================================================= */
export type Upload = ReturnAttachment;

export type ReturnStatus = "draft" | "awaiting_physical" | "received_or_no_physical";

/* =============================================================================
   Label Maps
============================================================================= */

export const REPORTER_LABELS: Record<string, string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  client: "Client",
  autre: "Autre",
  prise_commande: "Prise de commande",
};

export const CAUSE_LABELS: Record<string, string> = {
  production: "Production",
  pompe: "Pompe de transfert",
  autre_cause: "Autre cause",
  exposition_sinto: "Exposition Sinto",
  transporteur: "Transporteur",
  client: "Client",
  expert: "Expert",
  expedition: "Expédition",
  analyse: "Analyse laboratoire",
  defect: "Défectuosité",
  surplus_inventaire: "Surplus inventaire",
  prise_commande: "Prise de commande",
  rappel: "Rappel",
  redirection: "Redirection",
  fournisseur: "Fournisseur",
  autre: "Autre",
};

/* =============================================================================
   API Response Types
============================================================================= */

export type Attachment = { 
  id: string; 
  name: string; 
  url: string; 
  downloadUrl?: string 
};

export type ProductLine = {
  id: string;
  codeProduit: string;
  descriptionProduit: string | null; // Allow null for strict check
  descriptionRetour?: string | null;
  quantite: number;
  poidsUnitaire?: number | null;
  poidsTotal?: number | null;
  // Added optional fields often used in UI
  quantiteRecue?: number | null;
  qteInventaire?: number | null;
  qteDetruite?: number | null;
  tauxRestock?: number | null;
};

export interface ReturnRow {
  id: string; // "R123" format
  codeRetour: number;
  reportedAt: string;
  reporter: Reporter;
  cause: Cause;
  expert: string | null;
  client: string | null;
  noClient?: string | null;
  noCommande?: string | null;
  tracking?: string | null;
  status: ReturnStatus;
  standby?: boolean;
  amount?: number | null;
  dateCommande?: string | null;
  transport?: string | null;
  attachments?: Attachment[];
  products?: ProductLine[];
  description?: string | null;
  createdBy?: { name: string; avatar?: string | null; at: string } | null;
  
  // Boolean flags matching API logic
  returnPhysical?: boolean; 
  physicalReturn?: boolean; // Alias often used in frontend logic
  isPickup?: boolean;
  isCommande?: boolean;
  isReclamation?: boolean;
  isDraft?: boolean;
  
  // Status flags (Fixes the build error)
  verified?: boolean;
  finalized?: boolean;

  noBill?: string | null;
  noBonCommande?: string | null;
  noReclamation?: string | null;
  
  verifiedBy?: { name: string; at: string | null } | null;
  finalizedBy?: { name: string; at: string | null } | null;
  
  warehouseOrigin?: string | null;
  warehouseDestination?: string | null;
  noCredit?: string | null;
  noCredit2?: string | null;
  noCredit3?: string | null;
  creditedTo?: string | null;
  creditedTo2?: string | null;
  creditedTo3?: string | null;
  villeShipto?: string | null;
  
  totalWeight?: number | null;
  transportAmount?: number | null;
  restockingAmount?: number | null;
}

export interface AttachmentResponse {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
}

export interface ProductLineResponse {
  id: string;
  codeProduit: string;
  descriptionProduit: string | null;
  descriptionRetour?: string | null;
  quantite: number;
  poidsUnitaire?: number | null;
  poidsTotal?: number | null;
  quantiteRecue?: number | null;
  qteInventaire?: number | null;
  qteDetruite?: number | null;
  tauxRestock?: number | null;
}

/* =============================================================================
   API Request Types
============================================================================= */

export interface CreateReturnPayload {
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string | null;
  noCommande?: string | null;
  tracking?: string | null;
  amount?: number | null;
  dateCommande?: string | null;
  transport?: string | null;
  description?: string | null;
  returnPhysical?: boolean;
  physicalReturn?: boolean; // Alias for frontend compatibility
  isPickup?: boolean;
  isCommande?: boolean;
  isReclamation?: boolean;
  
  noBill?: string | null;
  noBonCommande?: string | null;
  noReclamation?: string | null;
  noCommandeCheckbox?: boolean;
  
  products?: ProductInput[];
  reportedAt?: string | Date; // Allow passing custom date
}

export interface ProductInput {
  codeProduit: string;
  descriptionProduit: string;
  descriptionRetour?: string;
  quantite: number;
}

export interface UpdateReturnPayload extends Partial<CreateReturnPayload> {
  isDraft?: boolean;
}

export interface VerifyReturnPayload {
  products: {
    codeProduit: string;
    quantiteRecue: number;
    qteInventaire: number;
    qteDetruite: number;
  }[];
}

export interface FinalizeReturnPayload {
  products: {
    codeProduit: string;
    quantiteRecue: number;
    qteInventaire: number;
    qteDetruite: number;
    tauxRestock: number;
  }[];
  warehouseOrigin?: string;
  warehouseDestination?: string;
  noCredit?: string;
  noCredit2?: string;
  noCredit3?: string;
  creditedTo?: string;
  creditedTo2?: string;
  creditedTo3?: string;
  transportAmount?: number;
  restockingAmount?: number;
  chargeTransport?: boolean;
}

/* =============================================================================
   Prextra Lookup Types
============================================================================= */

export interface OrderLookup {
  sonbr: string | number;
  orderDate?: string | null;
  totalamt: number | null;
  customerName?: string | null;
  carrierName?: string | null;
  salesrepName?: string | null;
  tracking?: string | null;
  noClient?: string | null;
  custCode?: string | null;
}

export interface ItemSuggestion {
  code: string;
  descr?: string | null;
}

export interface ItemDetail {
  code: string;
  descr?: string | null;
  weight?: number | null;
}

/* =============================================================================
   Helper Functions
============================================================================= */

/**
 * Derive status from Return flags
 * Uses field names from prisma schema: isDraft, returnPhysical, isVerified
 */
export function getReturnStatus(ret: Partial<Return>): ReturnStatus {
  if (ret.isDraft) return "draft";
  if (ret.returnPhysical && !ret.isVerified) return "awaiting_physical";
  return "received_or_no_physical";
}

export function formatReturnCode(id: number): string {
  return `R${id}`;
}

export function parseReturnCode(formatted: string): number {
  return parseInt(formatted.replace(/^R/i, ""), 10);
}

/* =============================================================================
   Transport Calculation
============================================================================= */

export const TRANSPORT_RATES: Record<string, number[]> = {
  A: [15.0, 0.08, 0.07, 0.06, 0.05],
  B: [18.0, 0.10, 0.09, 0.08, 0.07],
  C: [22.0, 0.12, 0.11, 0.10, 0.09],
  D: [28.0, 0.15, 0.14, 0.12, 0.11],
  E: [35.0, 0.18, 0.16, 0.14, 0.12],
  Z: [50.0, 0.25, 0.22, 0.20, 0.18],
};

export function calculateShippingCost(zone: string, weightLbs: number): number {
  const rates = TRANSPORT_RATES[zone.toUpperCase()] || TRANSPORT_RATES.Z;

  if (weightLbs <= 10) {
    return rates[0];
  } else if (weightLbs <= 400) {
    return rates[0] + (weightLbs - 10) * rates[1];
  } else if (weightLbs <= 800) {
    return rates[0] + 390 * rates[1] + (weightLbs - 400) * rates[2];
  } else if (weightLbs <= 1000) {
    return rates[0] + 390 * rates[1] + 400 * rates[2] + (weightLbs - 800) * rates[3];
  } else {
    return (
      rates[0] +
      390 * rates[1] +
      400 * rates[2] +
      200 * rates[3] +
      (weightLbs - 1000) * rates[4]
    );
  }
}
