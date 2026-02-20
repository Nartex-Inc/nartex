// src/lib/validations.ts
// Centralized Zod schemas for API input validation

import { z } from "zod";

// ─── Returns ─────────────────────────────────────────────────────────────────

const ReporterEnum = z.enum([
  "expert",
  "transporteur",
  "client",
  "prise_commande",
  "autre",
]);

const CauseEnum = z.enum([
  "production",
  "pompe",
  "autre_cause",
  "exposition_sinto",
  "transporteur",
  "client",
  "expert",
  "expedition",
  "analyse",
  "defect",
  "surplus_inventaire",
  "prise_commande",
  "rappel",
  "redirection",
  "fournisseur",
  "autre",
]);

const ReturnProductSchema = z.object({
  codeProduit: z.string().min(1),
  descriptionProduit: z.string().optional(),
  descriptionRetour: z.string().optional(),
  quantite: z.number().int().min(0).optional(),
});

export const CreateReturnSchema = z.object({
  reportedAt: z.string().optional(),
  reporter: ReporterEnum.optional(),
  cause: CauseEnum.optional(),
  expert: z.string().min(1, "Expert est requis"),
  client: z.string().min(1, "Client est requis"),
  noClient: z.string().nullable().optional(),
  noCommande: z.string().nullable().optional(),
  tracking: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  dateCommande: z.string().nullable().optional(),
  transport: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  physicalReturn: z.boolean().optional(),
  isPickup: z.boolean().optional(),
  isCommande: z.boolean().optional(),
  isReclamation: z.boolean().optional(),
  noBill: z.string().nullable().optional(),
  noBonCommande: z.string().nullable().optional(),
  noReclamation: z.string().nullable().optional(),
  noCommandeCheckbox: z.boolean().optional(),
  products: z.array(ReturnProductSchema).optional(),
});

export const UpdateReturnSchema = z.object({
  reporter: ReporterEnum.optional(),
  cause: CauseEnum.optional(),
  expert: z.string().optional(),
  client: z.string().optional(),
  noClient: z.string().nullable().optional(),
  noCommande: z.string().nullable().optional(),
  tracking: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  dateCommande: z.string().nullable().optional(),
  transport: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  physicalReturn: z.boolean().optional(),
  isPickup: z.boolean().optional(),
  isCommande: z.boolean().optional(),
  isReclamation: z.boolean().optional(),
  noBill: z.string().nullable().optional(),
  noBonCommande: z.string().nullable().optional(),
  noReclamation: z.string().nullable().optional(),
  products: z.array(ReturnProductSchema).optional(),
});

// ─── Return Comments ────────────────────────────────────────────────────────

export const CreateReturnCommentSchema = z.object({
  content: z.string().min(1, "Le contenu est requis").max(5000),
});

// ─── Verify / Finalize / Standby ────────────────────────────────────────────

export const VerifyReturnSchema = z.object({
  products: z.array(
    z.object({
      codeProduit: z.string().min(1),
      quantiteRecue: z.number().int().min(0),
      qteDetruite: z.number().int().min(0),
    })
  ).min(1),
});

export const FinalizeReturnSchema = z.object({
  products: z.array(
    z.object({
      codeProduit: z.string().min(1),
      quantiteRecue: z.number().int().min(0),
      qteDetruite: z.number().int().min(0),
      tauxRestock: z.number().min(0),
    })
  ).optional(),
  warehouseOrigin: z.string().nullable().optional(),
  warehouseDestination: z.string().nullable().optional(),
  noCredit: z.string().nullable().optional(),
  noCredit2: z.string().nullable().optional(),
  noCredit3: z.string().nullable().optional(),
  creditedTo: z.string().nullable().optional(),
  creditedTo2: z.string().nullable().optional(),
  creditedTo3: z.string().nullable().optional(),
  transportAmount: z.number().nullable().optional(),
  restockingAmount: z.number().nullable().optional(),
  chargeTransport: z.boolean().optional(),
  villeShipto: z.string().nullable().optional(),
});

export const StandbyReturnSchema = z.object({
  action: z.enum(["standby", "reactivate"]),
});

// ─── Signup ──────────────────────────────────────────────────────────────────

export const SignupSchema = z
  .object({
    email: z.string().email("Format d'e-mail invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit comporter au moins 8 caractères"),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirm"],
  });

// ─── Support Tickets ─────────────────────────────────────────────────────────

export const CreateTicketSchema = z.object({
  site: z.string().min(1, 'Le champ "site" est requis'),
  departement: z.string().min(1, 'Le champ "departement" est requis'),
  categorie: z.string().min(1, 'Le champ "categorie" est requis'),
  sousCategorie: z.string().optional(),
  impact: z.string().min(1, 'Le champ "impact" est requis'),
  portee: z.string().min(1, 'Le champ "portee" est requis'),
  urgence: z.string().min(1, 'Le champ "urgence" est requis'),
  sujet: z.string().min(10, "Le sujet doit contenir au moins 10 caractères"),
  description: z
    .string()
    .min(50, "La description doit contenir au moins 50 caractères"),
  userPhone: z.string().optional(),
});

export const UpdateTicketSchema = z.object({
  statut: z
    .enum(["nouveau", "en_cours", "en_attente", "resolu", "ferme"])
    .optional(),
  assigneA: z.string().nullable().optional(),
});

// ─── Invitations ─────────────────────────────────────────────────────────────

const InvitationRoleEnum = z.enum([
  "Gestionnaire",
  "Analyste",
  "Verificateur",
  "Facturation",
  "Expert",
  "user",
]);

const InvitationItemSchema = z.object({
  email: z.string().email("Format d'e-mail invalide"),
  role: InvitationRoleEnum,
});

export const CreateInvitationsSchema = z.object({
  invitations: z
    .array(InvitationItemSchema)
    .min(1, "Au moins une invitation est requise")
    .max(20, "Maximum 20 invitations à la fois"),
});

// ─── User Profile ────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  image: z.string().nullable().optional(),
  userId: z.string().optional(),
  departement: z.string().optional(),
});
