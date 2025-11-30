// src/types/returns.ts
// TypeScript types for the returns management system (PostgreSQL version)

/* =============================================================================
   Enums & Constants
============================================================================= */

export type Reporter = "expert" | "transporteur" | "client" | "autre" | "prise_commande";
export type Cause =
  | "production"
  | "pompe"
  | "autre_cause"
  | "exposition_sinto"
  | "transporteur"
  | "client"
  | "expert"
  | "expedition"
  | "analyse"
  | "defect"
  | "surplus_inventaire"
  | "prise_commande"
  | "rappel"
  | "redirection"
  | "fournisseur"
  | "autre";

export type ReturnStatus = "draft" | "awaiting_physical" | "received_or_no_physical";
export type UserRole = "Gestionnaire" | "Analyste" | "Vérificateur" | "Facturation" | "Expert";

export const REPORTER_LABELS: Record<Reporter, string> = {
  expert: "Expert",
  transporteur: "Transporteur",
  client: "Client",
  autre: "Autre",
  prise_commande: "Prise de commande",
};

export const CAUSE_LABELS: Record<Cause, string> = {
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
   Database Models (PostgreSQL)
============================================================================= */

// public.returns table
export interface Return {
  id: number;
  code_retour: number;
  date_signalement: Date | string;
  signale_par: Reporter;
  cause_retour: Cause;
  expert: string | null;
  montant: number | null;
  client: string | null;
  no_client: string | null;
  no_commande: string | null;
  no_tracking: string | null;
  date_commande: string | null;
  description: string | null;
  transporteur: string | null;
  retour_physique: boolean;
  is_draft: boolean;
  is_final: boolean;
  is_verified: boolean;
  is_standby: boolean;
  is_pickup: boolean;
  is_commande: boolean;
  is_reclamation: boolean;
  no_bill: string | null;
  no_bon_commande: string | null;
  no_reclamation: string | null;
  initie_par: string | null;
  date_initialization: Date | string | null;
  verifie_par: string | null;
  date_verification: Date | string | null;
  finalise_par: string | null;
  date_finalisation: Date | string | null;
  entrepot_depart: string | null;
  entrepot_destination: string | null;
  no_credit: string | null;
  no_credit2: string | null;
  no_credit3: string | null;
  credite_a: string | null;
  credite_a2: string | null;
  credite_a3: string | null;
  ville_shipto: string | null;
  poids_total: number | null;
  montant_transport: number | null;
  montant_restocking: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// public.return_products table
export interface ReturnProduct {
  id: number;
  return_id: number;
  code_retour: number;
  code_produit: string;
  quantite: number;
  descr_produit: string | null;
  description_retour: string | null;
  quantite_recue: number | null;
  qte_inventaire: number | null;
  qte_detruite: number | null;
  taux_restock: number | null;
  poids: number | null;
  weight_produit: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// public.uploads table
export interface Upload {
  id: number;
  return_id: number;
  code_retour: number;
  file_name: string;
  file_path: string; // Google Drive file ID
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: Date | string;
}

// public.users table
export interface User {
  id: number;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/* =============================================================================
   Prextra Replicated Tables (dbo schema)
============================================================================= */

// dbo."Items" table
export interface PrextraItem {
  ItemCode: string;
  Descr: string | null;
  ShipWeight: number | null;
}

// dbo."SOHeader" table
export interface PrextraSOHeader {
  sonbr: string;
  OrderDate: Date | string | null;
  totalamt: number | null;
  custid: number | null;
  Carrid: number | null;
  SRid: number | null;
}

// dbo."Customers" table
export interface PrextraCustomer {
  CustId: number;
  CustCode: string | null;
  Name: string | null;
}

// dbo."carriers" table
export interface PrextraCarrier {
  carrid: number;
  name: string | null;
}

// dbo."Salesrep" table
export interface PrextraSalesrep {
  SRId: number;
  Name: string | null;
}

// dbo."Sites" table
export interface PrextraSite {
  Name: string;
}

// dbo."ShipmentHdr" table
export interface PrextraShipmentHdr {
  sonbr: string;
  WayBill: string | null;
}

/* =============================================================================
   API Response Types
============================================================================= */

export interface ReturnRow {
  id: string; // "R123" format
  codeRetour: number;
  reportedAt: string;
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string;
  noCommande?: string;
  tracking?: string;
  status: ReturnStatus;
  standby?: boolean;
  amount?: number | null;
  dateCommande?: string | null;
  transport?: string | null;
  attachments?: Attachment[];
  products?: ProductLine[];
  description?: string;
  createdBy?: { name: string; avatar?: string | null; at: string };
  retourPhysique?: boolean;
  isPickup?: boolean;
  isCommande?: boolean;
  isReclamation?: boolean;
  noBill?: string | null;
  noBonCommande?: string | null;
  noReclamation?: string | null;
  verifiedBy?: { name: string; at: string | null } | null;
  finalizedBy?: { name: string; at: string | null } | null;
  entrepotDepart?: string | null;
  entrepotDestination?: string | null;
  noCredit?: string | null;
  noCredit2?: string | null;
  noCredit3?: string | null;
  crediteA?: string | null;
  crediteA2?: string | null;
  crediteA3?: string | null;
  villeShipto?: string | null;
  poidsTotal?: number | null;
  montantTransport?: number | null;
  montantRestocking?: number | null;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
}

export interface ProductLine {
  id: string;
  codeProduit: string;
  descriptionProduit: string;
  descriptionRetour?: string;
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
  retourPhysique?: boolean;
  isPickup?: boolean;
  isCommande?: boolean;
  isReclamation?: boolean;
  noBill?: string | null;
  noBonCommande?: string | null;
  noReclamation?: string | null;
  products?: {
    codeProduit: string;
    descriptionProduit: string;
    descriptionRetour?: string;
    quantite: number;
  }[];
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
  entrepotDepart?: string;
  entrepotDestination?: string;
  noCredit?: string;
  noCredit2?: string;
  noCredit3?: string;
  crediteA?: string;
  crediteA2?: string;
  crediteA3?: string;
  montantTransport?: number;
  montantRestocking?: number;
  chargerTransport?: boolean;
}

/* =============================================================================
   Prextra Lookup Response Types
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

export function getReturnStatus(row: Return): ReturnStatus {
  if (row.is_draft) return "draft";
  if (row.retour_physique && !row.is_verified) return "awaiting_physical";
  return "received_or_no_physical";
}

export function formatReturnCode(code: number): string {
  return `R${code}`;
}

export function parseReturnCode(formatted: string): number {
  return parseInt(formatted.replace(/^R/i, ""), 10);
}
