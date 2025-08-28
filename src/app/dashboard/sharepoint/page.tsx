"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Inter } from "next/font/google";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Lock,
  Users,
  Shield,
  Eye,
  Edit,
  Star,
  Building2,
} from "lucide-react";

/* =============================================================================
   Font
============================================================================= */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* =============================================================================
   Types
============================================================================= */
type PermSpec = { edit?: string[]; read?: string[] } | "inherit" | undefined;

type NodeItem = {
  id: string;
  name: string;
  type?: "site" | "library";
  icon?: string;
  restricted?: boolean;
  highSecurity?: boolean;
  permissions?: PermSpec;
  children?: NodeItem[];
};

/* =============================================================================
   Page
============================================================================= */
export default function SharePointPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <LoadingState />;
  // Use the same gate you used on your dashboard page:
  if (status === "unauthenticated" || session?.user?.role !== "ventes-exec")
    return <AccessDenied />;

  return (
    <main className={`min-h-screen bg-black ${inter.className}`}>
      <div className="pt-0 px-0 pb-8">
        <SharePointStructure />
      </div>
    </main>
  );
}

/* =============================================================================
   Structure Viewer (dark UI, Stripe-ish cards)
============================================================================= */
function SharePointStructure() {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(["root"]));
  const [selected, setSelected] = React.useState<NodeItem | null>(null);
  const [activeCompany, setActiveCompany] = React.useState<string>("all");

  const companies = [
    { id: "all", name: "GROUPE COMPLET", color: "from-purple-500 to-blue-500" },
    { id: "sinto", name: "Sinto", color: "from-blue-500 to-cyan-500" },
    { id: "prolab", name: "Prolab", color: "from-green-500 to-emerald-500" },
    { id: "otoprotec", name: "Otoprotec", color: "from-orange-500 to-red-500" },
    { id: "lubrilab", name: "Lubrilab", color: "from-indigo-500 to-purple-500" },
  ];

  /* --------------------------- The structure (data) --------------------------- */
  const structure: NodeItem = {
    id: "root",
    name: "GROUPE SINTO - SharePoint",
    type: "site",
    children: [
      // --- ADMIN – FINANCE
      {
        id: "admin-finance",
        name: "ADMIN – FINANCE",
        type: "library",
        icon: "💰",
        children: [
          {
            id: "admin-principal",
            name: "PRINCIPAL",
            permissions: {
              edit: ["SG-ADMIN-FINANCE-EXECUTIF", "SG-ADMIN-FINANCE-ALL"],
              read: [],
            },
            children: [
              { id: "listes-prix", name: "Listes de prix", permissions: "inherit" },
              { id: "admin-gestion", name: "Administration & gestion", permissions: "inherit" },
              { id: "contrats", name: "Contrats", permissions: "inherit" },
              { id: "comm-procedures", name: "Communications & procédures", permissions: "inherit" },
            ],
          },
          {
            id: "admin-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-ADMIN-FINANCE-EXECUTIF"], read: ["SG-ADMIN-FINANCE-ALL"] },
            restricted: true,
            children: [
              { id: "etats-financiers", name: "États financiers", permissions: "inherit" },
              { id: "budgets", name: "Budgets", permissions: "inherit" },
              { id: "financement", name: "Financement et prêts", permissions: "inherit" },
              { id: "fiscalite", name: "Fiscalité (impôts)", permissions: "inherit" },
              { id: "prix-revient", name: "Prix de revient", permissions: "inherit" },
              { id: "soghu", name: "SOGHU et écofrais", permissions: "inherit" },
              { id: "contrats-majeurs", name: "Contrats majeurs et gouvernance", permissions: "inherit" },
              { id: "tresorerie", name: "Trésorerie", permissions: "inherit" },
            ],
          },
          {
            id: "cfo",
            name: "CFO",
            permissions: { edit: ["SG-CFO", "SG-PRESIDENT"], read: [] },
            restricted: true,
            highSecurity: true,
            children: [
              { id: "strategie", name: "Stratégie financière", permissions: "inherit" },
              { id: "modeles", name: "Modèles & scénarios", permissions: "inherit" },
              { id: "nego-bancaires", name: "Négociations bancaires confidentielles", permissions: "inherit" },
              { id: "ma-invest", name: "Diligence M&A & investissements", permissions: "inherit" },
              { id: "fisc-sensible", name: "Fiscalité sensible", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- OPÉRATIONS
      {
        id: "operations",
        name: "OPÉRATIONS",
        type: "library",
        icon: "⚙️",
        children: [
          {
            id: "ops-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-OPERATIONS-EXECUTIF", "SG-OPERATIONS-ALL"], read: [] },
            children: [
              { id: "plan-prod", name: "Planification de production", permissions: "inherit" },
              { id: "logistique", name: "Logistique & expédition", permissions: "inherit" },
              { id: "inventaire", name: "Inventaire", permissions: "inherit" },
              { id: "maintenance", name: "Maintenance", permissions: "inherit" },
              { id: "infrastructures", name: "Infrastructures (bâtiment)", permissions: "inherit" },
              { id: "procedures-ops", name: "Procédures & modes opératoires", permissions: "inherit" },
              { id: "csst", name: "CSST & SIMDUT", permissions: "inherit" },
              { id: "qualite", name: "Qualité", permissions: "inherit" },
              { id: "rapports", name: "Rapports & bilans", permissions: "inherit" },
            ],
          },
          {
            id: "ops-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-OPERATIONS-EXECUTIF"], read: ["SG-OPERATIONS-ALL"] },
            restricted: true,
            children: [
              { id: "kpi-ops", name: "KPI & tableaux de bord", permissions: "inherit" },
              { id: "capex-ops", name: "Capex", permissions: "inherit" },
              { id: "projets-strat", name: "Projets stratégiques", permissions: "inherit" },
              { id: "contrats-fourn", name: "Contrats & fournisseurs critiques", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- TI
      {
        id: "ti",
        name: "TI",
        type: "library",
        icon: "💻",
        children: [
          {
            id: "ti-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-TI-EXECUTIF", "SG-TI-ALL"], read: [] },
            children: [
              { id: "architecture", name: "Architecture & infrastructure", permissions: "inherit" },
              { id: "reseau", name: "Réseau & accès (VPN)", permissions: "inherit" },
              { id: "outils", name: "Outils & logiciels", permissions: "inherit" },
              { id: "scripts", name: "Scripts et automatisations", permissions: "inherit" },
              { id: "inventaire-ti", name: "Inventaire TI", permissions: "inherit" },
              { id: "proc-doc", name: "Procédures & documentation", permissions: "inherit" },
              { id: "tests", name: "Tests & validations", permissions: "inherit" },
            ],
          },
          {
            id: "ti-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-TI-EXECUTIF"], read: ["SG-TI-ALL"] },
            restricted: true,
            children: [
              { id: "securite", name: "Sécurité (politiques, incidents, audits)", permissions: "inherit" },
              { id: "contrats-lic", name: "Contrats & licences", permissions: "inherit" },
              { id: "budget-ti", name: "Budget et coûts", permissions: "inherit" },
              { id: "roadmap", name: "Feuille de route", permissions: "inherit" },
              { id: "risques", name: "Risques & conformité", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- MARKETING
      {
        id: "marketing",
        name: "MARKETING",
        type: "library",
        icon: "📣",
        children: [
          {
            id: "mkt-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-MARKETING-EXECUTIF", "SG-MARKETING-ALL"], read: [] },
            children: [
              { id: "branding", name: "Branding & identité", permissions: "inherit" },
              { id: "campagnes", name: "Campagnes", permissions: "inherit" },
              { id: "calendrier", name: "Calendrier marketing", permissions: "inherit" },
              { id: "social", name: "Réseaux sociaux", permissions: "inherit" },
              { id: "website", name: "Site web", permissions: "inherit" },
              { id: "comm-interne", name: "Communication interne", permissions: "inherit" },
              { id: "medias", name: "Médias & assets", permissions: "inherit" },
            ],
          },
          {
            id: "mkt-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-MARKETING-EXECUTIF"], read: ["SG-MARKETING-ALL"] },
            restricted: true,
            children: [
              { id: "plan-mkt", name: "Plan marketing", permissions: "inherit" },
              { id: "budget-mkt", name: "Budget", permissions: "inherit" },
              { id: "etudes", name: "Études de marché", permissions: "inherit" },
              { id: "partenariats", name: "Partenariats", permissions: "inherit" },
              { id: "kpi-mkt", name: "KPI", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- RH
      {
        id: "rh",
        name: "RH",
        type: "library",
        icon: "👥",
        children: [
          {
            id: "rh-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-RH-EXECUTIF", "SG-RH-ALL"], read: [] },
            children: [
              { id: "onboarding", name: "Onboarding & offboarding", permissions: "inherit" },
              { id: "politiques", name: "Politiques et procédures", permissions: "inherit" },
              { id: "organisation", name: "Organisation (organigrammes)", permissions: "inherit" },
              { id: "comm-rh", name: "Communications RH", permissions: "inherit" },
              { id: "formation", name: "Formation & développement", permissions: "inherit" },
            ],
          },
          {
            id: "rh-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-RH-EXECUTIF"], read: ["SG-RH-ALL"] },
            restricted: true,
            children: [
              { id: "remuneration", name: "Rémunération globale", permissions: "inherit" },
              { id: "paie", name: "Paie et relevés d'emploi", permissions: "inherit" },
              { id: "avantages", name: "Avantages sociaux", permissions: "inherit" },
              { id: "juridique-rh", name: "Juridique RH & dossiers sensibles", permissions: "inherit" },
              { id: "performance", name: "Performance & évaluations", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- VENTES
      {
        id: "ventes",
        name: "VENTES",
        type: "library",
        icon: "📈",
        children: [
          {
            id: "ventes-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-VENTES-EXECUTIF"], read: ["SG-VENTES-ALL"] },
            children: [
              { id: "produits", name: "Produits", permissions: "inherit" },
              { id: "fiches-tech", name: "Fiches techniques & signalétiques", permissions: "inherit" },
              { id: "depliants", name: "Dépliants & brochures", permissions: "inherit" },
              { id: "outils-vente", name: "Outils de support de vente", permissions: "inherit" },
              { id: "promotions", name: "Promotions & campagnes", permissions: "inherit" },
              { id: "references", name: "Références et cas à succès", permissions: "inherit" },
              { id: "videos", name: "Vidéos & médias", permissions: "inherit" },
              { id: "formation-ventes", name: "Formations des ventes", permissions: "inherit" },
              { id: "experts", name: "Experts (représentants)", permissions: "inherit" },
            ],
          },
          {
            id: "ventes-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-VENTES-EXECUTIF"], read: [] },
            restricted: true,
            children: [
              { id: "strategie-ventes", name: "Stratégie & planification", permissions: "inherit" },
              { id: "previsions", name: "Prévisions de vente & pipeline", permissions: "inherit" },
              { id: "comptes-cles", name: "Comptes clés & ententes", permissions: "inherit" },
              { id: "eval-reps", name: "Évaluations des représentants", permissions: "inherit" },
              { id: "gestion-temps", name: "Outils de gestion du temps", permissions: "inherit" },
              { id: "comptes-rendus", name: "Comptes rendus & transcripts", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- R&D
      {
        id: "rd",
        name: "R&D",
        type: "library",
        icon: "🔬",
        children: [
          {
            id: "rd-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-RD-EXECUTIF", "SG-RD-ALL"], read: [] },
            children: [
              { id: "projets", name: "Projets & protocoles (recettes)", permissions: "inherit" },
              { id: "donnees", name: "Données & analyses", permissions: "inherit" },
              { id: "controle-qual", name: "Contrôle qualité", permissions: "inherit" },
              { id: "securite-reg", name: "Sécurité & réglementations", permissions: "inherit" },
              { id: "inventaire-mat", name: "Inventaire & matières premières", permissions: "inherit" },
              { id: "embouteillage", name: "Embouteillage & procédés", permissions: "inherit" },
              { id: "carnets", name: "Carnets et rapports", permissions: "inherit" },
            ],
          },
          {
            id: "rd-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-RD-EXECUTIF"], read: ["SG-RD-ALL"] },
            restricted: true,
            children: [
              { id: "portfolio", name: "Portefeuille & roadmap", permissions: "inherit" },
              { id: "budget-labo", name: "Budget et capex labo", permissions: "inherit" },
              { id: "partenariats-nda", name: "Partenariats & NDA", permissions: "inherit" },
              { id: "propriete-int", name: "Propriété intellectuelle & brevets", permissions: "inherit" },
              { id: "kpi-strat", name: "KPI stratégiques", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- COMITÉ DE DIRECTION
      {
        id: "direction",
        name: "COMITÉ DE DIRECTION",
        type: "library",
        icon: "🏢",
        children: [
          {
            id: "dir-principal",
            name: "PRINCIPAL",
            permissions: { edit: ["SG-DIRECTION-ALL"], read: [] },
            children: [
              { id: "ordres-jour", name: "Ordres du jour & calendriers", permissions: "inherit" },
              { id: "comm-dir", name: "Communications", permissions: "inherit" },
              { id: "organigramme", name: "Organigramme fonctionnel", permissions: "inherit" },
            ],
          },
          {
            id: "dir-executif",
            name: "EXÉCUTIF",
            permissions: { edit: ["SG-DIRECTION-EXECUTIF"], read: ["SG-DIRECTION-ALL"] },
            restricted: true,
            highSecurity: true,
            children: [
              { id: "proces-verbaux", name: "Procès-verbaux & résolutions", permissions: "inherit" },
              { id: "tableau-bord", name: "Tableau de bord", permissions: "inherit" },
              { id: "projets-eval", name: "Projets en cours d'évaluation", permissions: "inherit" },
              { id: "mecanique-exec", name: "Mécanique exécutive", permissions: "inherit" },
              { id: "gouvernance", name: "Gouvernance & risques", permissions: "inherit" },
            ],
          },
        ],
      },
      // --- PUBLIC
      {
        id: "public",
        name: "PUBLIC",
        type: "library",
        icon: "🌐",
        children: [
          {
            id: "public-principal",
            name: "PRINCIPAL",
            permissions: { edit: [], read: ["SG-GENERAL"] },
            children: [
              { id: "docs-publics", name: "Documents publics", permissions: "inherit" },
              { id: "manuels", name: "Manuels & guides", permissions: "inherit" },
              { id: "politiques-pub", name: "Politiques", permissions: "inherit" },
              { id: "fiches-sds", name: "Fiches produits & SDS", permissions: "inherit" },
              { id: "faq", name: "FAQ", permissions: "inherit" },
              { id: "comm-externes", name: "Communications externes", permissions: "inherit" },
              { id: "medias-logos", name: "Médias & logos", permissions: "inherit" },
            ],
          },
        ],
      },
    ],
  };

  /* ------------------------------ UI helpers ------------------------------ */
  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const permissionBadges = (perm: PermSpec) => {
    if (!perm || perm === "inherit") return null;
    const out: React.ReactNode[] = [];
    if (perm.edit?.length) {
      out.push(
        <span
          key="edit"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300"
        >
          <Edit className="h-3 w-3" />
          {perm.edit.length} groupe{perm.edit.length > 1 ? "s" : ""}
        </span>
      );
    }
    if (perm.read?.length) {
      out.push(
        <span
          key="read"
          className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300"
        >
          <Eye className="h-3 w-3" />
          {perm.read.length} groupe{perm.read.length > 1 ? "s" : ""}
        </span>
      );
    }
    return out;
  };

  const renderNode = (node: NodeItem, depth = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = !!node.children?.length;
    const isSelected = selected?.id === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={[
            "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
            "hover:bg-white/[0.04] border border-transparent",
            isSelected
              ? "bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-transparent border-white/10"
              : "",
            node.restricted ? "pl-[calc(theme(spacing.3)+2px)] border-l-2 border-amber-400/40" : "",
            node.highSecurity ? "pl-[calc(theme(spacing.3)+2px)] border-l-2 border-red-500/40" : "",
          ].join(" ")}
          style={{ paddingLeft: depth * 20 + 12 }}
          onClick={() => {
            if (hasChildren) toggle(node.id);
            setSelected(node);
          }}
        >
          {/* Chevron */}
          {hasChildren && (
            <span
              className="text-muted-foreground/70 transition-transform"
              style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}

          {/* Icon */}
          {node.type === "site" && <Building2 className="h-5 w-5 text-purple-400" />}
          {node.type === "library" && <span className="text-lg">{node.icon || "📁"}</span>}
          {!node.type &&
            (isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-400" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground/70" />
            ))}

          {/* Name + flags */}
          <span
            className={[
              "font-medium",
              node.type === "library" ? "text-white" : "text-gray-200",
              "flex items-center gap-1",
            ].join(" ")}
          >
            {node.name}
            {node.restricted && <Lock className="h-3 w-3 text-amber-400" />}
            {node.highSecurity && <Shield className="h-3 w-3 text-red-400" />}
          </span>

          <div className="ml-auto flex flex-wrap gap-2">{permissionBadges(node.permissions)}</div>
        </div>

        {isExpanded && hasChildren && (
          <div className="ml-2 space-y-1">{node.children!.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  const findParentPerms = (
    node: NodeItem,
    targetId: string,
    parentPerms: PermSpec = undefined
  ): PermSpec => {
    if (node.id === targetId) return parentPerms;
    const nextParent = node.permissions && node.permissions !== "inherit" ? node.permissions : parentPerms;
    for (const child of node.children ?? []) {
      const res = findParentPerms(child, targetId, nextParent);
      if (res) return res;
    }
    return undefined;
  };

  const PermissionDetails = ({ node }: { node: NodeItem }) => {
    let perm = node.permissions;
    if (perm === "inherit") {
      perm = findParentPerms(structure, node.id) ?? "inherit";
    }
    if (!perm || perm === "inherit") return null;

    return (
      <Card className="space-y-4">
        <CardTitle icon={<Shield className="h-5 w-5 text-blue-400" />}>Permissions détaillées</CardTitle>

        {perm.edit?.length ? (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-200">
              <Edit className="h-4 w-4 text-emerald-400" />
              Accès en édition
            </h4>
            <div className="flex flex-wrap gap-2">
              {perm.edit.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {perm.read?.length ? (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-200">
              <Eye className="h-4 w-4 text-sky-400" />
              Accès en lecture seule
            </h4>
            <div className="flex flex-wrap gap-2">
              {perm.read.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-300"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    );
  };

  /* ------------------------------- Render UI ------------------------------- */
  return (
    <div className="space-y-6">
      {/* Page header (matches dashboard tone) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Structure SharePoint<span className="text-blue-500">.</span>
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {companies.map((c) => {
            const active = activeCompany === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCompany(c.id)}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? `bg-gradient-to-r ${c.color} text-white shadow`
                    : "border border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]",
                ].join(" ")}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Explorer */}
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <div className="mb-4">
              <CardTitle icon={<Folder className="h-5 w-5 text-blue-400" />}>
                Arborescence des dossiers
              </CardTitle>
              <p className="mt-1 text-sm text-gray-400">Site SharePoint unifié pour tout le groupe</p>
            </div>
            <div className="max-h-[620px] overflow-y-auto pr-2">{renderNode(structure)}</div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Selected node details */}
          {selected && <PermissionDetails node={selected} />}

          {/* Legend */}
          <Card>
            <CardTitle icon={<Star className="h-5 w-5 text-yellow-400" />}>Légende</CardTitle>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-300">
                <Lock className="h-4 w-4 text-amber-400" />
                <span>Accès restreint</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Shield className="h-4 w-4 text-red-400" />
                <span>Haute sécurité</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Edit className="h-4 w-4 text-emerald-400" />
                <span>Permissions d&apos;édition</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Eye className="h-4 w-4 text-sky-400" />
                <span>Lecture seule</span>
              </div>
            </div>
          </Card>

          {/* Security groups */}
          <Card>
            <CardTitle icon={<Users className="h-5 w-5 text-purple-400" />}>Groupes de sécurité</CardTitle>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div>
                <span className="font-medium text-gray-200">Standard :</span>
                <p className="text-gray-400">SG-[DEPT]-ALL</p>
              </div>
              <div>
                <span className="font-medium text-gray-200">Exécutif :</span>
                <p className="text-gray-400">SG-[DEPT]-EXECUTIF</p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <span className="font-medium text-gray-200">Spéciaux :</span>
                <p className="text-gray-400">SG-CFO, SG-PRESIDENT</p>
                <p className="text-gray-400">SG-DIRECTION-ALL</p>
                <p className="text-gray-400">SG-DIRECTION-EXECUTIF</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Small UI atoms to match your dashboard cards
============================================================================= */
function Card({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={[
        "relative rounded-2xl border border-gray-900 bg-gray-950/80 backdrop-blur-sm p-4 md:p-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -inset-0.5 -z-10 rounded-2xl opacity-0 blur transition group-hover:opacity-30" />
      {children}
    </div>
  );
}

function CardTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-medium tracking-wide text-white">{children}</h3>
    </div>
  );
}

/* =============================================================================
   Shared states
============================================================================= */
function LoadingState() {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-lg font-normal tracking-wide text-white">Chargement…</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
      <div className="max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h3 className="mb-2 text-xl font-bold text-white">Accès restreint</h3>
        <p className="text-sm text-gray-400">
          Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
          Veuillez contacter votre département TI pour de l&apos;aide.
        </p>
      </div>
    </div>
  );
}
