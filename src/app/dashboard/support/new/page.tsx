"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Image from "next/image";
import {
  Lock,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Tag,
  AlertTriangle,
  Users,
  Clock,
  FileText,
  Paperclip,
  Send,
  Loader2,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORT_CATEGORIES,
  IMPACT_OPTIONS,
  PORTEE_OPTIONS,
  URGENCE_OPTIONS,
  DEPARTEMENTS,
  calculatePriority,
  getPriorityInfo,
  getSitesForTenant,
  type CategoryKey,
  type Priority,
} from "@/lib/support-constants";

// =============================================================================
// TYPES
// =============================================================================

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function NewSupportTicketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Fetch tenants to get active tenant details
  const { data: tenantsRes } = useSWR<{ ok: boolean; data: TenantData[] }>(
    "/api/tenants",
    fetcher
  );

  const tenants = tenantsRes?.data ?? [];
  const activeTenantId = session?.user?.activeTenantId;
  const activeTenant = tenants.find((t) => t.id === activeTenantId);

  // Form state
  const [userPhone, setUserPhone] = React.useState("");
  const [site, setSite] = React.useState("");
  const [departement, setDepartement] = React.useState("");
  const [categorie, setCategorie] = React.useState<CategoryKey | "">("");
  const [sousCategorie, setSousCategorie] = React.useState("");
  const [impact, setImpact] = React.useState("");
  const [portee, setPortee] = React.useState("");
  const [urgence, setUrgence] = React.useState("");
  const [sujet, setSujet] = React.useState("");
  const [description, setDescription] = React.useState("");

  // UI state
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ code: string; priorite: string } | null>(null);

  // Derived values
  const sites = React.useMemo(() => getSitesForTenant(activeTenant?.slug), [activeTenant?.slug]);
  const subcategories = React.useMemo(() => {
    if (!categorie) return [];
    return SUPPORT_CATEGORIES[categorie]?.subcategories ?? [];
  }, [categorie]);

  const calculatedPriority = React.useMemo<Priority | null>(() => {
    if (!impact || !portee || !urgence) return null;
    return calculatePriority(impact, portee, urgence);
  }, [impact, portee, urgence]);

  const priorityInfo = calculatedPriority ? getPriorityInfo(calculatedPriority) : null;

  // Reset subcategory when category changes
  React.useEffect(() => {
    setSousCategorie("");
  }, [categorie]);

  // Check for tenant context
  const hasTenantContext = !!activeTenantId && !!activeTenant;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasTenantContext) {
      setError("Problème de contexte Nartex - veuillez recharger la page ou sélectionner une organisation.");
      return;
    }

    // Validate required fields
    if (!site || !departement || !categorie || !impact || !portee || !urgence || !sujet || !description) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (sujet.length < 10) {
      setError("Le sujet doit contenir au moins 10 caractères.");
      return;
    }

    if (description.length < 50) {
      setError("La description doit contenir au moins 50 caractères.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site,
          departement,
          categorie,
          sousCategorie: sousCategorie || undefined,
          impact,
          portee,
          urgence,
          sujet,
          description,
          userPhone: userPhone || undefined,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Erreur lors de la création du billet");
      }

      setSuccess({ code: json.data.code, priorite: json.data.priorite });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du billet");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Success state
  if (success) {
    const successPriorityInfo = getPriorityInfo(success.priorite as Priority);
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
              Billet créé avec succès
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              Votre billet a été soumis et sera traité selon sa priorité.
            </p>

            <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 mb-6">
              <span className="text-sm text-neutral-500">Numéro de billet</span>
              <span className="text-2xl font-mono font-semibold text-neutral-900 dark:text-white">
                {success.code}
              </span>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium", successPriorityInfo.bgColor, successPriorityInfo.color)}>
                {successPriorityInfo.priority} - {successPriorityInfo.label}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSuccess(null);
                  setSite("");
                  setDepartement("");
                  setCategorie("");
                  setSousCategorie("");
                  setImpact("");
                  setPortee("");
                  setUrgence("");
                  setSujet("");
                  setDescription("");
                  setUserPhone("");
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Créer un autre billet
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Header with tenant logo */}
        <header className="mb-8">
          <div className="flex items-start gap-4">
            {activeTenant?.logo && (
              <div className="shrink-0">
                <Image
                  src={activeTenant.logo}
                  alt={activeTenant.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Nouveau billet de support TI
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Remplissez ce formulaire pour soumettre une demande d'assistance technique.
              </p>
            </div>
          </div>
        </header>

        {/* No tenant warning */}
        {!hasTenantContext && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Aucune organisation sélectionnée
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Veuillez sélectionner une organisation dans le menu latéral avant de soumettre un billet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION: Identification */}
          <Section title="Identification" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LockedField label="Nom complet" value={session?.user?.name || "—"} icon={User} />
              <LockedField label="Courriel" value={session?.user?.email || "—"} icon={Mail} />
              <Field label="Téléphone / Poste" optional>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="Ex: 450-555-1234 poste 123"
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
                  />
                </div>
              </Field>
              <LockedField label="Organisation" value={activeTenant?.name || "—"} icon={Building2} />
              <Field label="Site" required>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow appearance-none cursor-pointer"
                  >
                    <option value="">Sélectionnez un site</option>
                    {sites.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Département" required>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <select
                    value={departement}
                    onChange={(e) => setDepartement(e.target.value)}
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow appearance-none cursor-pointer"
                  >
                    <option value="">Sélectionnez un département</option>
                    {DEPARTEMENTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </Section>

          {/* SECTION: Classification */}
          <Section title="Classification" icon={Tag}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Catégorie" required>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as CategoryKey | "")}
                  required
                  className="w-full h-10 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow appearance-none cursor-pointer"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {Object.entries(SUPPORT_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sous-catégorie" required={subcategories.length > 0}>
                <select
                  value={sousCategorie}
                  onChange={(e) => setSousCategorie(e.target.value)}
                  disabled={subcategories.length === 0}
                  className="w-full h-10 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{subcategories.length === 0 ? "Sélectionnez d'abord une catégorie" : "Sélectionnez une sous-catégorie"}</option>
                  {subcategories.map((sc) => (
                    <option key={sc.value} value={sc.value}>{sc.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* SECTION: Impact Assessment */}
          <Section title="Évaluation de l'impact" icon={AlertTriangle}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Impact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Impact</span>
                  <span className="text-red-500">*</span>
                </div>
                <div className="space-y-2">
                  {IMPACT_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      name="impact"
                      value={opt.value}
                      label={opt.label}
                      description={opt.description}
                      checked={impact === opt.value}
                      onChange={() => setImpact(opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Portée */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Portée</span>
                  <span className="text-red-500">*</span>
                </div>
                <div className="space-y-2">
                  {PORTEE_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      name="portee"
                      value={opt.value}
                      label={opt.label}
                      description={opt.description}
                      checked={portee === opt.value}
                      onChange={() => setPortee(opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Urgence */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Urgence</span>
                  <span className="text-red-500">*</span>
                </div>
                <div className="space-y-2">
                  {URGENCE_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      name="urgence"
                      value={opt.value}
                      label={opt.label}
                      description={opt.description}
                      checked={urgence === opt.value}
                      onChange={() => setUrgence(opt.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Priority Badge */}
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Priorité calculée</span>
                {priorityInfo ? (
                  <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold", priorityInfo.bgColor, priorityInfo.color)}>
                    {priorityInfo.priority} - {priorityInfo.label}
                    <span className="text-xs opacity-75">({priorityInfo.slaHours}h SLA)</span>
                  </span>
                ) : (
                  <span className="text-sm text-neutral-400 italic">
                    Sélectionnez Impact, Portée et Urgence
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* SECTION: Description */}
          <Section title="Description du problème" icon={FileText}>
            <div className="space-y-4">
              <Field label="Sujet" required hint="Résumez votre problème en une phrase (minimum 10 caractères)">
                <input
                  type="text"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  placeholder="Ex: Impossible d'accéder à mon compte Office 365"
                  minLength={10}
                  required
                  className="w-full h-10 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
                />
              </Field>

              <Field label="Description détaillée" required hint="Minimum 50 caractères">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Décrivez votre problème en détail...

- Que s'est-il passé?
- Quand le problème a-t-il commencé?
- Y a-t-il un message d'erreur?
- Avez-vous essayé quelque chose pour résoudre le problème?`}
                  rows={6}
                  minLength={50}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow resize-none"
                />
                <div className="mt-1 text-xs text-neutral-400 text-right">
                  {description.length} / 50 caractères minimum
                </div>
              </Field>

              {/* Attachments placeholder */}
              <Field label="Pièces jointes" optional hint="Captures d'écran, fichiers de log, etc.">
                <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400">
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-4 w-4" />
                    Fonctionnalité à venir
                  </div>
                </div>
              </Field>
            </div>
          </Section>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !hasTenantContext}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Soumettre le billet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, required, optional, hint, children }: { label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-neutral-400 ml-1 text-xs font-normal">(optionnel)</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function LockedField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <div className="w-full h-10 pl-9 pr-10 flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/50 text-sm text-neutral-600 dark:text-neutral-400">
          {value}
        </div>
        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      </div>
    </div>
  );
}

function RadioCard({
  name,
  value,
  label,
  description,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
        checked
          ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-600 focus:ring-neutral-900 dark:focus:ring-white"
      />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", checked ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300")}>
          {label}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {description}
        </div>
      </div>
    </label>
  );
}
