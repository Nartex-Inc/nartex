"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lock, Check } from "lucide-react";
import {
  SUPPORT_CATEGORIES,
  APPAREILS,
  EQUIPEMENTS_TI,
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

const TOTAL_SECTIONS = 5;

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function NewSupportTicketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
  const [appareil, setAppareil] = React.useState("");
  const [impact, setImpact] = React.useState("");
  const [portee, setPortee] = React.useState("");
  const [urgence, setUrgence] = React.useState("");
  const [sujet, setSujet] = React.useState("");
  const [description, setDescription] = React.useState("");

  // File state
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // UI state
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ code: string; priorite: string } | null>(null);

  // Section state
  const [activeSection, setActiveSection] = React.useState(1);

  // Section refs for scroll targeting
  const sectionRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Disable body scroll while on this page
  React.useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Derived values

  const calculatedPriority = React.useMemo<Priority | null>(() => {
    if (!impact || !portee || !urgence) return null;
    return calculatePriority(impact, portee, urgence);
  }, [impact, portee, urgence]);

  const priorityInfo = calculatedPriority ? getPriorityInfo(calculatedPriority) : null;

  // Per-section completion check
  const sectionComplete = React.useMemo(() => ({
    1: !!site && !!departement,
    2: !!categorie,
    3: !!impact && !!portee && !!urgence,
    4: sujet.length >= 10 && description.length >= 50,
    5: true, // always "complete" (optional)
  }), [site, departement, categorie, impact, portee, urgence, sujet, description]);

  // Cumulative unlock: section N requires all prior sections complete
  const sectionUnlocked = React.useMemo(() => ({
    1: true,
    2: sectionComplete[1],
    3: sectionComplete[1] && sectionComplete[2],
    4: sectionComplete[1] && sectionComplete[2] && sectionComplete[3],
    5: sectionComplete[1] && sectionComplete[2] && sectionComplete[3] && sectionComplete[4],
  }), [sectionComplete]);

  // Reset appareil when category changes
  React.useEffect(() => {
    setAppareil("");
  }, [categorie]);

  const hasTenantContext = !!activeTenantId && !!activeTenant;

  // Calculate form completion percentage
  const completionSteps = [
    !!site,
    !!departement,
    !!categorie,
    !!impact,
    !!portee,
    !!urgence,
    sujet.length >= 10,
    description.length >= 50,
  ];
  const completionPercentage = Math.round(
    (completionSteps.filter(Boolean).length / completionSteps.length) * 100
  );

  // Find current step (first incomplete section)
  const currentStep = React.useMemo(() => {
    for (let i = 1; i <= TOTAL_SECTIONS; i++) {
      if (!sectionComplete[i as keyof typeof sectionComplete]) return i;
    }
    return TOTAL_SECTIONS;
  }, [sectionComplete]);

  // Navigation handlers
  const scrollToSection = (n: number) => {
    const el = sectionRefs.current[n];
    const container = scrollContainerRef.current;
    if (el && container) {
      const offsetTop = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  };

  const handleSectionToggle = (n: number) => {
    if (!sectionUnlocked[n as keyof typeof sectionUnlocked]) return;
    setActiveSection((prev) => (prev === n ? 0 : n));
    if (activeSection !== n) {
      setTimeout(() => scrollToSection(n), 50);
    }
  };

  const handleNext = (n: number) => {
    const next = n + 1;
    if (next <= TOTAL_SECTIONS && sectionUnlocked[next as keyof typeof sectionUnlocked]) {
      setActiveSection(next);
      setTimeout(() => scrollToSection(next), 50);
    }
  };

  const handlePrev = (n: number) => {
    const prev = n - 1;
    if (prev >= 1) {
      setActiveSection(prev);
      setTimeout(() => scrollToSection(prev), 50);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasTenantContext) {
      setError("Veuillez sélectionner une organisation dans le menu latéral.");
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
          sousCategorie: appareil || undefined,
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

      // Upload attachments if any
      if (selectedFiles.length > 0 && json.data.id) {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append("files", f));
        try {
          await fetch(`/api/support/tickets/${json.data.id}/attachments`, {
            method: "POST",
            body: formData,
          });
        } catch (uploadErr) {
          console.error("Failed to upload attachments:", uploadErr);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Success state
  if (success) {
    const successPriorityInfo = getPriorityInfo(success.priorite as Priority);
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-lg px-4 py-20">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-lime-500 dark:text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
              Demande soumise
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Notre équipe TI a été notifiée et traitera votre demande.
            </p>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-6 mb-6">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Numéro de référence</p>
              <p className="text-2xl font-mono font-semibold text-neutral-900 dark:text-white mb-3">
                {success.code}
              </p>
              <span className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                successPriorityInfo.bgColor,
                successPriorityInfo.color
              )}>
                Priorité {successPriorityInfo.priority}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/dashboard/support/tickets")}
                className="w-full py-2.5 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Voir mes demandes
              </button>
              <button
                onClick={() => {
                  setSuccess(null);
                  setSite("");
                  setDepartement("");
                  setCategorie("");
                  setAppareil("");
                  setImpact("");
                  setPortee("");
                  setUrgence("");
                  setSujet("");
                  setDescription("");
                  setUserPhone("");
                  setSelectedFiles([]);
                  setActiveSection(1);
                }}
                className="w-full py-2.5 px-4 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Nouvelle demande
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Section definitions
  const sectionTitles: Record<number, string> = {
    1: "Informations générales",
    2: "Type de demande",
    3: "Évaluation de l'urgence",
    4: "Description du problème",
    5: "Pièces jointes",
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Sticky progress bar */}
      <div className="shrink-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2 flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Étape {currentStep} sur {TOTAL_SECTIONS} — {completionPercentage}%
          </p>
        </div>
        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-lime-400 to-green-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          {/* Header */}
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <div className="flex items-start gap-4">
              {activeTenant?.logo && (
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden">
                  <Image
                    src={activeTenant.logo}
                    alt={activeTenant.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Soumettre une demande
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Décrivez votre problème et nous vous aiderons rapidement.
                </p>
              </div>
            </div>
          </div>

          {!hasTenantContext && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Veuillez sélectionner une organisation dans le menu latéral avant de continuer.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form Column */}
              <div className="lg:col-span-2 space-y-3">
              {/* Section 1: Informations générales */}
              <CollapsibleSection
                ref={(el) => { sectionRefs.current[1] = el; }}
                number={1}
                title={sectionTitles[1]}
                isActive={activeSection === 1}
                isComplete={sectionComplete[1]}
                isUnlocked={sectionUnlocked[1]}
                onToggle={() => handleSectionToggle(1)}
                onNext={() => handleNext(1)}
                onPrev={() => handlePrev(1)}
                isFirst
                nextUnlocked={sectionUnlocked[2]}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <ReadOnlyField label="Nom" value={session?.user?.name || "—"} />
                  <ReadOnlyField label="Courriel" value={session?.user?.email || "—"} />
                  <InputField
                    label="Téléphone"
                    value={userPhone}
                    onChange={setUserPhone}
                    placeholder="514-555-0123"
                    optional
                  />
                  <ReadOnlyField label="Organisation" value={activeTenant?.name || "—"} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Lieu de travail</FieldLabel>
                    <div className="flex gap-2">
                      {SITES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSite(s.value)}
                          className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all",
                            site === s.value
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                              : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <SelectField
                    label="Département"
                    value={departement}
                    onChange={setDepartement}
                    options={DEPARTEMENTS}
                    placeholder="Sélectionner..."
                    required
                  />
                </div>
              </CollapsibleSection>

              {/* Section 2: Type de demande */}
              <CollapsibleSection
                ref={(el) => { sectionRefs.current[2] = el; }}
                number={2}
                title={sectionTitles[2]}
                isActive={activeSection === 2}
                isComplete={sectionComplete[2]}
                isUnlocked={sectionUnlocked[2]}
                onToggle={() => handleSectionToggle(2)}
                onNext={() => handleNext(2)}
                onPrev={() => handlePrev(2)}
                nextUnlocked={sectionUnlocked[3]}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField
                    label="Catégorie"
                    value={categorie}
                    onChange={(v) => setCategorie(v as CategoryKey | "")}
                    options={Object.entries(SUPPORT_CATEGORIES).map(([key, cat]) => ({
                      value: key,
                      label: cat.label,
                    }))}
                    placeholder="Sélectionner..."
                    required
                  />
                  {categorie === "commande_materiel" ? (
                    <SelectField
                      label="Équipement demandé"
                      value={appareil}
                      onChange={setAppareil}
                      options={[...EQUIPEMENTS_TI]}
                      placeholder="Sélectionner..."
                      required
                    />
                  ) : (
                    <SelectField
                      label="Appareil concerné"
                      value={appareil}
                      onChange={setAppareil}
                      options={[...APPAREILS]}
                      placeholder="Sélectionner..."
                    />
                  )}
                </div>
              </CollapsibleSection>

              {/* Section 3: Évaluation de l'urgence */}
              <CollapsibleSection
                ref={(el) => { sectionRefs.current[3] = el; }}
                number={3}
                title={sectionTitles[3]}
                isActive={activeSection === 3}
                isComplete={sectionComplete[3]}
                isUnlocked={sectionUnlocked[3]}
                onToggle={() => handleSectionToggle(3)}
                onNext={() => handleNext(3)}
                onPrev={() => handlePrev(3)}
                nextUnlocked={sectionUnlocked[4]}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <RadioGroup
                    label="Impact"
                    name="impact"
                    value={impact}
                    onChange={setImpact}
                    options={IMPACT_OPTIONS}
                    required
                  />
                  <RadioGroup
                    label="Portée"
                    name="portee"
                    value={portee}
                    onChange={setPortee}
                    options={PORTEE_OPTIONS}
                    required
                  />
                  <RadioGroup
                    label="Urgence"
                    name="urgence"
                    value={urgence}
                    onChange={setUrgence}
                    options={URGENCE_OPTIONS}
                    required
                  />
                </div>
              </CollapsibleSection>

              {/* Section 4: Description du problème */}
              <CollapsibleSection
                ref={(el) => { sectionRefs.current[4] = el; }}
                number={4}
                title={sectionTitles[4]}
                isActive={activeSection === 4}
                isComplete={sectionComplete[4]}
                isUnlocked={sectionUnlocked[4]}
                onToggle={() => handleSectionToggle(4)}
                onNext={() => handleNext(4)}
                onPrev={() => handlePrev(4)}
                nextUnlocked={sectionUnlocked[5]}
              >
                <div className="space-y-4">
                  <InputField
                    label="Sujet"
                    value={sujet}
                    onChange={setSujet}
                    placeholder="Décrivez brièvement votre problème"
                    required
                    minLength={10}
                  />
                  <TextAreaField
                    label="Description détaillée"
                    value={description}
                    onChange={setDescription}
                    placeholder="Expliquez votre problème en détail : que s'est-il passé, quand, et qu'avez-vous déjà essayé ?"
                    required
                    minLength={50}
                    rows={4}
                    hint={description.length < 50 ? `${description.length}/50 caractères minimum` : undefined}
                  />
                </div>
              </CollapsibleSection>

              {/* Section 5: Pièces jointes */}
              <CollapsibleSection
                ref={(el) => { sectionRefs.current[5] = el; }}
                number={5}
                title={sectionTitles[5]}
                isActive={activeSection === 5}
                isComplete={sectionComplete[5]}
                isUnlocked={sectionUnlocked[5]}
                onToggle={() => handleSectionToggle(5)}
                onPrev={() => handlePrev(5)}
                isLast
              >
                <div
                  className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const droppedFiles = Array.from(e.dataTransfer.files);
                    setSelectedFiles((prev) => [...prev, ...droppedFiles]);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        e.target.value = "";
                      }
                    }}
                  />
                  <svg className="mx-auto h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    Glissez des fichiers ici ou <span className="text-lime-500 dark:text-lime-400 font-medium">parcourir</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    Max 25 Mo par fichier
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                        {file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-900 dark:text-white truncate">{file.name}</p>
                          <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit inside Section 5 */}
                <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !hasTenantContext}
                    className="w-full py-3 px-4 bg-lime-500 hover:bg-lime-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-neutral-900 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {submitting ? "Envoi en cours..." : "Soumettre la demande"}
                  </button>
                </div>
              </CollapsibleSection>

              {/* Error - shown outside sections too for visibility */}
              {error && activeSection !== 5 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Submit - Mobile fallback */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={submitting || !hasTenantContext}
                  className="w-full py-3 px-4 bg-lime-500 hover:bg-lime-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-neutral-900 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {submitting ? "Envoi en cours..." : "Soumettre la demande"}
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-16 space-y-4">
                {/* Summary Card */}
                <Card>
                  <CardHeader>Résumé</CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <SummaryRow label="Demandeur" value={session?.user?.name || "—"} />
                      <SummaryRow label="Organisation" value={activeTenant?.name || "—"} />
                      <SummaryRow label="Lieu" value={site ? SITES.find(s => s.value === site)?.label : "—"} />
                      <SummaryRow label="Département" value={departement ? DEPARTEMENTS.find(d => d.value === departement)?.label : "—"} />
                      <SummaryRow label="Catégorie" value={categorie ? SUPPORT_CATEGORIES[categorie]?.label : "—"} />
                      <SummaryRow
                        label={categorie === "commande_materiel" ? "Équipement" : "Appareil"}
                        value={appareil
                          ? (categorie === "commande_materiel"
                            ? EQUIPEMENTS_TI.find(e => e.value === appareil)?.label
                            : APPAREILS.find(a => a.value === appareil)?.label) || "—"
                          : "—"}
                      />

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Priorité calculée</p>
                        {priorityInfo ? (
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
                            priorityInfo.bgColor,
                            priorityInfo.color
                          )}>
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              priorityInfo.priority === "P1" && "bg-red-500",
                              priorityInfo.priority === "P2" && "bg-orange-500",
                              priorityInfo.priority === "P3" && "bg-yellow-500",
                              priorityInfo.priority === "P4" && "bg-green-500"
                            )} />
                            {priorityInfo.priority} - {priorityInfo.label}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">
                            Complétez l'évaluation
                          </p>
                        )}
                        {priorityInfo && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                            Délai de réponse cible : {priorityInfo.slaHours}h
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button - Desktop */}
                <div className="hidden lg:block">
                  <button
                    type="submit"
                    disabled={submitting || !hasTenantContext}
                    className="w-full py-3 px-4 bg-lime-500 hover:bg-lime-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-neutral-900 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {submitting ? "Envoi en cours..." : "Soumettre la demande"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full mt-2 py-2.5 px-4 text-neutral-600 dark:text-neutral-400 text-sm hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                </div>

                {/* Help Card */}
                <Card>
                  <CardContent>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Besoin d'aide urgente ?
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Pour les urgences critiques (arrêt de production), contactez directement le TI au poste 123.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COLLAPSIBLE SECTION COMPONENT
// =============================================================================

interface CollapsibleSectionProps {
  number: number;
  title: string;
  isActive: boolean;
  isComplete: boolean;
  isUnlocked: boolean;
  onToggle: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  nextUnlocked?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = React.forwardRef<HTMLDivElement, CollapsibleSectionProps>(
  function CollapsibleSection(
    { number, title, isActive, isComplete, isUnlocked, onToggle, onNext, onPrev, isFirst, isLast, nextUnlocked, children },
    ref
  ) {
    return (
      <div ref={ref} className="scroll-mt-14">
        <div className={cn(
          "rounded-xl border overflow-hidden transition-colors",
          isUnlocked
            ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-50"
        )}>
          {/* Header */}
          <button
            type="button"
            onClick={onToggle}
            disabled={!isUnlocked}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-4 text-left transition-colors",
              isUnlocked
                ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                : "cursor-not-allowed"
            )}
          >
            {/* Number badge */}
            <span className={cn(
              "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
              isComplete
                ? "bg-lime-500 text-white"
                : isUnlocked
                  ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500"
            )}>
              {isComplete ? <Check className="w-4 h-4" /> : number}
            </span>

            {/* Title */}
            <span className={cn(
              "flex-1 text-sm font-semibold",
              isUnlocked
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-400 dark:text-neutral-500"
            )}>
              {title}
            </span>

            {/* Status icon */}
            {!isUnlocked ? (
              <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
            ) : (
              <ChevronDown className={cn(
                "w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200",
                isActive && "rotate-180"
              )} />
            )}
          </button>

          {/* Collapsible body */}
          <AnimatePresence initial={false}>
            {isActive && isUnlocked && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  {children}

                  {/* Navigation buttons */}
                  {(!isLast || !isFirst) && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                      {!isFirst ? (
                        <button
                          type="button"
                          onClick={onPrev}
                          className="py-2 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Précédent
                        </button>
                      ) : (
                        <div />
                      )}
                      {!isLast && (
                        <button
                          type="button"
                          onClick={onNext}
                          disabled={!nextUnlocked}
                          className="py-2 px-4 text-sm font-medium text-neutral-900 bg-lime-500 rounded-lg hover:bg-lime-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
                        >
                          Suivant
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

// =============================================================================
// COMPONENTS
// =============================================================================

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{children}</h2>
    </div>
  );
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>;
}

function FieldLabel({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {optional && <span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">(optionnel)</span>}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
        {value}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
  optional,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <FieldLabel required={required} optional={optional}>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-colors"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  rows,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        rows={rows}
        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-colors resize-none"
      />
      {hint && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: "40px",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { readonly value: string; readonly label: string; readonly description: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
              value === opt.value
                ? "bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800"
                : "bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 w-4 h-4 text-lime-500 border-neutral-300 dark:border-neutral-600 focus:ring-lime-500"
            />
            <div>
              <p className={cn(
                "text-sm font-medium",
                value === opt.value ? "text-lime-900 dark:text-lime-100" : "text-neutral-900 dark:text-white"
              )}>
                {opt.label}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {opt.description}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-sm text-neutral-900 dark:text-white text-right">{value || "—"}</span>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
