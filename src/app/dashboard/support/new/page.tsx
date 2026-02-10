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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORT_CATEGORIES,
  IMPACT_OPTIONS,
  PORTEE_OPTIONS,
  URGENCE_OPTIONS,
  DEPARTEMENTS,
  SITES,
  calculatePriority,
  getPriorityInfo,
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
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-base))]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Success state
  if (success) {
    const successPriorityInfo = getPriorityInfo(success.priorite as Priority);
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-base))]">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <div className="rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-xl p-10 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-8">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-semibold text-[hsl(var(--text-primary))] mb-3">
              Billet créé avec succès
            </h1>
            <p className="text-[hsl(var(--text-secondary))] mb-8 text-lg">
              Votre demande a été soumise et sera traitée selon sa priorité.
            </p>

            <div className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-xl bg-[hsl(var(--bg-elevated))] mb-8">
              <span className="text-sm text-[hsl(var(--text-muted))] uppercase tracking-wide">Numéro de billet</span>
              <span className="text-3xl font-mono font-bold text-[hsl(var(--text-primary))]">
                {success.code}
              </span>
              <span className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold", successPriorityInfo.bgColor, successPriorityInfo.color)}>
                {successPriorityInfo.priority} - {successPriorityInfo.label}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] text-sm font-medium hover:bg-[hsl(var(--bg-elevated))] transition-all"
              >
                Créer un autre billet
              </button>
              <button
                onClick={() => router.push("/dashboard/support/tickets")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--text-primary))] text-[hsl(var(--bg-base))] text-sm font-medium hover:opacity-90 transition-all"
              >
                Voir mes billets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-base))]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Header with tenant logo */}
        <header className="mb-10">
          <div className="flex items-center gap-6">
            {activeTenant?.logo && (
              <div className="shrink-0 p-3 rounded-2xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-subtle))]">
                <Image
                  src={activeTenant.logo}
                  alt={activeTenant.name}
                  width={72}
                  height={72}
                  className="h-16 w-16 object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                Nouveau billet de support TI
              </h1>
              <p className="mt-2 text-[hsl(var(--text-secondary))]">
                Décrivez votre problème et notre équipe TI vous assistera dans les meilleurs délais.
              </p>
            </div>
          </div>
        </header>

        {/* No tenant warning */}
        {!hasTenantContext && (
          <div className="mb-8 p-5 rounded-xl border border-red-500/30 bg-red-500/10">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">
                  Aucune organisation sélectionnée
                </p>
                <p className="text-sm text-red-400/80 mt-1">
                  Veuillez sélectionner une organisation dans le menu latéral avant de soumettre un billet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Row 1: Identification + Location */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identification Section */}
            <Section title="Identification" icon={User}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <LockedField label="Nom" value={session?.user?.name || "—"} />
                  <LockedField label="Courriel" value={session?.user?.email || "—"} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Téléphone" optional>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="450-555-1234"
                      className="input-field"
                    />
                  </Field>
                  <LockedField label="Organisation" value={activeTenant?.name || "—"} />
                </div>
              </div>
            </Section>

            {/* Location Section */}
            <Section title="Localisation" icon={MapPin}>
              <div className="space-y-4">
                <Field label="Site" required>
                  <div className="grid grid-cols-2 gap-3">
                    {SITES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSite(s.value)}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                          site === s.value
                            ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]"
                            : "border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-elevated))]"
                        )}
                      >
                        {s.value === "bureau" ? <Building2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Département" required>
                  <select
                    value={departement}
                    onChange={(e) => setDepartement(e.target.value)}
                    required
                    className="input-field"
                  >
                    <option value="">Sélectionnez un département</option>
                    {DEPARTEMENTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>
          </div>

          {/* Row 2: Classification */}
          <Section title="Classification" icon={Tag}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Catégorie" required>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as CategoryKey | "")}
                  required
                  className="input-field"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {Object.entries(SUPPORT_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sous-catégorie">
                <select
                  value={sousCategorie}
                  onChange={(e) => setSousCategorie(e.target.value)}
                  disabled={subcategories.length === 0}
                  className="input-field disabled:opacity-50"
                >
                  <option value="">{subcategories.length === 0 ? "Sélectionnez d'abord une catégorie" : "Sélectionnez (optionnel)"}</option>
                  {subcategories.map((sc) => (
                    <option key={sc.value} value={sc.value}>{sc.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Row 3: Impact Assessment */}
          <Section title="Évaluation de la priorité" icon={Zap} accent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Impact */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--text-muted))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">Impact</span>
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
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-[hsl(var(--text-muted))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">Portée</span>
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
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-[hsl(var(--text-muted))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">Urgence</span>
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
            <div className="mt-8 pt-6 border-t border-[hsl(var(--border-subtle))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-[hsl(var(--text-muted))]" />
                  <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">Priorité calculée automatiquement</span>
                </div>
                {priorityInfo ? (
                  <span className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold", priorityInfo.bgColor, priorityInfo.color)}>
                    {priorityInfo.priority} - {priorityInfo.label}
                    <span className="text-xs font-medium opacity-75">SLA {priorityInfo.slaHours}h</span>
                  </span>
                ) : (
                  <span className="text-sm text-[hsl(var(--text-muted))] italic">
                    Complétez les 3 champs ci-dessus
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Row 4: Description */}
          <Section title="Description du problème" icon={FileText}>
            <div className="space-y-6">
              <Field label="Sujet" required hint="Résumez votre problème en une phrase claire">
                <input
                  type="text"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  placeholder="Ex: Impossible d'accéder à mon compte Office 365"
                  minLength={10}
                  required
                  className="input-field"
                />
              </Field>

              <Field label="Description détaillée" required hint={`${description.length}/50 caractères minimum`}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Décrivez votre problème en détail:

• Que s'est-il passé exactement?
• Quand le problème a-t-il commencé?
• Y a-t-il un message d'erreur?
• Qu'avez-vous déjà essayé?`}
                  rows={7}
                  minLength={50}
                  required
                  className="input-field resize-none"
                />
              </Field>

              {/* Attachments placeholder */}
              <Field label="Pièces jointes" optional hint="Captures d'écran, fichiers de log, etc.">
                <div className="flex items-center justify-center h-28 rounded-xl border-2 border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--bg-elevated))]/50 text-[hsl(var(--text-muted))]">
                  <div className="flex items-center gap-3 text-sm">
                    <Paperclip className="h-5 w-5" />
                    <span>Fonctionnalité à venir</span>
                  </div>
                </div>
              </Field>
            </div>
          </Section>

          {/* Error message */}
          {error && (
            <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] text-sm font-medium hover:bg-[hsl(var(--bg-elevated))] transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !hasTenantContext}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold shadow-lg shadow-[hsl(var(--accent))]/25 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Global styles for input fields */}
      <style jsx global>{`
        .input-field {
          width: 100%;
          height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid hsl(var(--border-default));
          background: hsl(var(--bg-elevated));
          color: hsl(var(--text-primary));
          font-size: 14px;
          transition: all 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: hsl(var(--accent));
          box-shadow: 0 0 0 3px hsl(var(--accent) / 0.1);
        }
        .input-field::placeholder {
          color: hsl(var(--text-muted));
        }
        textarea.input-field {
          height: auto;
          padding: 12px 16px;
        }
        select.input-field {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 40px;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function Section({ title, icon: Icon, accent, children }: { title: string; icon: React.ElementType; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn(
      "rounded-2xl border bg-[hsl(var(--bg-surface))] overflow-hidden",
      accent ? "border-[hsl(var(--accent))]/30" : "border-[hsl(var(--border-default))]"
    )}>
      <div className={cn(
        "px-6 py-4 border-b",
        accent
          ? "border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5"
          : "border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-elevated))]/50"
      )}>
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", accent ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-muted))]")} />
          <h2 className={cn("text-sm font-semibold uppercase tracking-wider", accent ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-secondary))]")}>
            {title}
          </h2>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, required, optional, hint, children }: { label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[hsl(var(--text-primary))] mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {optional && <span className="text-[hsl(var(--text-muted))] ml-2 text-xs font-normal">(optionnel)</span>}
      </label>
      {children}
      {hint && <p className="mt-2 text-xs text-[hsl(var(--text-muted))]">{hint}</p>}
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[hsl(var(--text-primary))] mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="w-full h-11 px-4 flex items-center justify-between rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] text-sm text-[hsl(var(--text-secondary))]">
          <span className="truncate">{value}</span>
          <Lock className="h-3.5 w-3.5 text-[hsl(var(--text-muted))] shrink-0 ml-2" />
        </div>
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
        "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
        checked
          ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5"
          : "border-[hsl(var(--border-default))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-elevated))]"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 text-[hsl(var(--accent))] border-[hsl(var(--border-default))] focus:ring-[hsl(var(--accent))] focus:ring-offset-0"
      />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-semibold", checked ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-primary))]")}>
          {label}
        </div>
        <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 leading-relaxed">
          {description}
        </div>
      </div>
    </label>
  );
}
