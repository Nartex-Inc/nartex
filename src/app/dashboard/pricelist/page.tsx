"use client";

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Search,
  X,
  RotateCcw,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Minus,
  Filter,
  Sparkles,
  Package,
  Layers,
  Tag,
  FileText,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Inbox,
  ChevronUp,
  Check,
  Recycle,
  SlidersHorizontal,
  Lock,
  Download,
  Languages,
} from "lucide-react";

/* =========================
   i18n — FR/EN translations
========================= */
type Lang = "fr" | "en";

const i18n = {
  fr: {
    viewDetails: "Voir détails",
    showHideFilters: "Afficher/Masquer les filtres",
    quickSearchBtn: "Recherche rapide par code",
    add: "Ajouter",
    send: "Envoyer",
    clearAll: "Effacer tout",
    close: "Fermer",
    category: "Catégorie",
    select: "Sélectionner...",
    allCategories: "Toutes les catégories",
    classOpt: "Classe (Opt.)",
    allOpt: "Toutes",
    allClasses: "Toutes les classes",
    itemsOpt: "Articles (Opt.)",
    loadingPrices: "Chargement des prix",
    pleaseWait: "Veuillez patienter...",
    error: "Erreur",
    retry: "Réessayer",
    noPricesSelected: "Aucun prix sélectionné",
    articles: "article(s)",
    classes: "classe(s)",
    detailedMode: "Mode détaillé",
    list: "Liste:",
    sendByEmail: "Envoyer par courriel",
    pdfAttached: "La liste sera jointe en PDF",
    cancel: "Annuler",
    sending: "Envoi...",
    quickSearchTitle: "Recherche rapide",
    addToList: "Ajoutez des articles à votre liste",
    searchPlaceholder: "Code article ou description...",
    noResults: "Aucun résultat trouvé",
    withoutClass: "Sans classe",
    addedItems: "Articles Ajoutés",
    removeItem: "Retirer cet article",
    addSelectionTitle: "Ajouter la sélection à la liste",
    sendEmailTitle: "Envoyer par courriel",
    emptyStateP1: "Utilisez le bouton",
    emptyStateP2: "pour sélectionner des catégories ou utilisez la",
    emptyStateP3: "pour ajouter des articles individuels.",
    emptyStateAdd: "Ajouter",
    emptyStateSearch: "Recherche",
    disabledForList: "Désactivé pour cette liste",
    downloadPdf: "Télécharger en PDF",
    download: "Télécharger",
    generateFullList: "Générer Liste complète",
    generatingProgress: "Chargement {current}/{total}...",
  },
  en: {
    viewDetails: "View details",
    showHideFilters: "Show/Hide filters",
    quickSearchBtn: "Quick search by code",
    add: "Add",
    send: "Send",
    clearAll: "Clear all",
    close: "Close",
    category: "Category",
    select: "Select...",
    allCategories: "All categories",
    classOpt: "Class (Opt.)",
    allOpt: "All",
    allClasses: "All classes",
    itemsOpt: "Items (Opt.)",
    loadingPrices: "Loading prices",
    pleaseWait: "Please wait...",
    error: "Error",
    retry: "Retry",
    noPricesSelected: "No prices selected",
    articles: "item(s)",
    classes: "class(es)",
    detailedMode: "Detailed mode",
    list: "List:",
    sendByEmail: "Send by email",
    pdfAttached: "The list will be attached as PDF",
    cancel: "Cancel",
    sending: "Sending...",
    quickSearchTitle: "Quick search",
    addToList: "Add items to your list",
    searchPlaceholder: "Item code or description...",
    noResults: "No results found",
    withoutClass: "Without class",
    addedItems: "Added Items",
    removeItem: "Remove this item",
    addSelectionTitle: "Add selection to list",
    sendEmailTitle: "Send by email",
    emptyStateP1: "Use the",
    emptyStateP2: "button to select categories or use the",
    emptyStateP3: "to add individual items.",
    emptyStateAdd: "Add",
    emptyStateSearch: "Search",
    disabledForList: "Disabled for this list",
    downloadPdf: "Download as PDF",
    download: "Download",
    generateFullList: "Generate full list",
    generatingProgress: "Loading {current}/{total}...",
  },
};

type Translations = (typeof i18n)[Lang];

/* =========================
   Role-Based Access Control
========================= */
const ALLOWED_ROLES = ["gestionnaire", "expert"];
const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

function isUserAuthorized(
  role: string | undefined | null,
  email: string | undefined | null
): boolean {
  if (email && BYPASS_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  if (role && ALLOWED_ROLES.includes(role.toLowerCase().trim())) {
    return true;
  }
  return false;
}

const AccessDenied = ({ role, email }: { role: string | undefined; email: string | undefined | null }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4 bg-[hsl(var(--bg-base))]">
    <div className="bg-[hsl(var(--bg-surface))] rounded-2xl p-10 max-w-lg text-center shadow-2xl">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-[hsl(var(--danger-muted))]">
        <Lock className="w-10 h-10 text-[hsl(var(--danger))]" />
      </div>
      <h3 className="text-2xl font-bold text-[hsl(var(--text-primary))] mb-3">Accès restreint</h3>
      <p className="text-[hsl(var(--text-secondary))] leading-relaxed mb-4">
        Vous ne disposez pas des autorisations nécessaires pour accéder aux listes de prix.
        Seuls les rôles <strong>Gestionnaire</strong> et <strong>Expert</strong> peuvent y accéder.
      </p>
      <div className="bg-[hsl(var(--bg-muted))] p-4 rounded-lg text-left text-xs font-mono text-[hsl(var(--text-tertiary))]">
        <p>DEBUG INFO:</p>
        <p>Email: {email || "Not Found"}</p>
        <p>Role Detected: {role || "Undefined/Null"}</p>
      </div>
    </div>
  </div>
);

/* =========================
   Types (Unchanged)
========================= */
interface Product {
  prodId: number;
  name: string;
  itemCount: number;
}
interface ItemType {
  itemTypeId: number;
  description: string;
  itemCount: number;
}
interface Item {
  itemId: number;
  itemCode: string;
  description: string;
  prodId: number;
  itemTypeId: number;
  className?: string;
  categoryName?: string;
}
interface GroupedClass {
  className: string;
  items: Item[];
  allItemIds: number[];
}
interface GroupedCategory {
  categoryName: string;
  classes: GroupedClass[];
  allItemIds: number[];
}

function groupItemsByCategory(items: Item[]): GroupedCategory[] {
  const catMap = new Map<string, Map<string, Item[]>>();
  for (const item of items) {
    const cat = item.categoryName || "Sans catégorie";
    const cls = item.className || "Sans classe";
    if (!catMap.has(cat)) catMap.set(cat, new Map());
    const clsMap = catMap.get(cat)!;
    if (!clsMap.has(cls)) clsMap.set(cls, []);
    clsMap.get(cls)!.push(item);
  }
  const result: GroupedCategory[] = [];
  for (const [categoryName, clsMap] of catMap) {
    const classes: GroupedClass[] = [];
    const allCatIds: number[] = [];
    for (const [className, clsItems] of clsMap) {
      const ids = clsItems.map((i) => i.itemId);
      allCatIds.push(...ids);
      classes.push({ className, items: clsItems, allItemIds: ids });
    }
    result.push({ categoryName, classes, allItemIds: allCatIds });
  }
  return result;
}

interface PriceList {
  priceId: number;
  name: string;
  code: string;
  currency: string;
}
interface PriceRange {
  id: number;
  qtyMin: number;
  unitPrice: number;
  pdsPrice: number | null;
  expBasePrice: number | null;
  coutExp: number | null;
  costingDiscountAmt?: number;
  columns?: Record<string, number | null>;
}
interface ItemPriceData {
  itemId: number;
  itemCode: string;
  description: string;
  caisse: number | null;
  format: string | null;
  volume: number | null;
  categoryName: string;
  className: string;
  priceListName: string;
  priceCode: string;
  ranges: PriceRange[];
}

/* =========================
   Utilities & Sub-Components
========================= */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

async function getDataUri(url: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.setAttribute("crossOrigin", "anonymous");
    image.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve("");
    image.src = url;
  });
}

function abbreviateColumnName(name: string): string {
  let result = name.trim();
  if (result === "04-GROSEXP") return "4-GREXP";
  result = result.replace(/^0(\d+-)/, "$1");
  return result;
}

// Custom sort function to put 5-GROS first, then the rest in order
function sortPriceColumns(columns: string[]): string[] {
  const priorityOrder = ["01-EXP", "05-GROS", "02-DET", "03-IND"];
  
  return columns.sort((a, b) => {
    const aKey = a.trim();
    const bKey = b.trim();
    
    const aIndex = priorityOrder.findIndex(p => aKey.includes(p) || aKey === p);
    const bIndex = priorityOrder.findIndex(p => bKey.includes(p) || bKey === p);
    
    // If both are in priority list, sort by priority
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only a is in priority list, a comes first
    if (aIndex !== -1) return -1;
    // If only b is in priority list, b comes first
    if (bIndex !== -1) return 1;
    // Otherwise, sort alphabetically
    return aKey.localeCompare(bKey);
  });
}

function parseFormat(format: string | null): { quantity: number | null; unit: string; normalizedUnit: string } {
  if (!format) return { quantity: null, unit: "unité", normalizedUnit: "unité" };
  
  // Match optional leading number (including decimals) followed by text
  const match = format.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/i);
  
  if (match) {
    let quantity = parseFloat(match[1].replace(",", "."));
    const rawUnit = match[2].trim().toUpperCase();
    
    // Normalize units
    if (rawUnit === "ML") {
      // Convert ML to L
      return { quantity: quantity / 1000, unit: rawUnit, normalizedUnit: "L" };
    } else if (rawUnit === "G") {
      // Convert G to KG
      return { quantity: quantity / 1000, unit: rawUnit, normalizedUnit: "KG" };
    } else if (rawUnit === "L") {
      return { quantity, unit: rawUnit, normalizedUnit: "L" };
    } else if (rawUnit === "KG") {
      return { quantity, unit: rawUnit, normalizedUnit: "KG" };
    } else {
      // Everything else is "unité"
      return { quantity: 1, unit: rawUnit, normalizedUnit: "unité" };
    }
  }
  
  // No leading number - treat as 1 unit (e.g., "AERO")
  return { quantity: 1, unit: format, normalizedUnit: "unité" };
}

function getCommonUnit(items: ItemPriceData[]): string {
  if (items.length === 0) return "unité";
  const units = items.map(item => parseFormat(item.format).normalizedUnit);
  const firstUnit = units[0];
  const allSame = units.every(u => u === firstUnit);
  return allSame ? firstUnit : "unité";
}

function AnimatedPrice({ value, duration = 500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(current);
      if (progress < 1) animationRef.current = requestAnimationFrame(animate);
      else previousValue.current = endValue;
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  return <span className="tabular-nums">{displayValue.toFixed(2)}</span>;
}

/* =========================
   NEW UI Components
========================= */

// Toggle Switch Component (iOS-style for "Voir détails")
const ToggleSwitch = ({ 
  enabled, 
  onToggle, 
  label, 
  loading 
}: { 
  enabled: boolean; 
  onToggle: () => void; 
  label: string; 
  loading?: boolean;
}) => (
  <button 
    onClick={onToggle}
    disabled={loading}
    className={cn(
      "flex items-center gap-2.5 text-sm transition-all px-2 py-1 rounded-lg hover:bg-white/10",
      loading && "opacity-70 cursor-wait"
    )}
  >
    {loading ? (
      <Loader2 className="w-4 h-4 animate-spin text-white/70" />
    ) : (
      <span className={cn("transition-colors", enabled ? "text-white" : "text-white/50")}>
        {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </span>
    )}
    <span className={cn("font-medium hidden sm:inline", enabled ? "text-white" : "text-white/70")}>{label}</span>
    <div className={cn(
      "w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0",
      enabled ? "bg-white" : "bg-white/30"
    )}>
      <div className={cn(
        "w-5 h-5 rounded-full shadow-md transition-transform",
        enabled ? "translate-x-5 bg-[hsl(var(--bg-base))]" : "translate-x-0 bg-white"
      )} />
    </div>
  </button>
);

// Icon Toggle Button
const ToggleButton = ({ 
  active, 
  onClick, 
  icon: Icon, 
  title, 
  loading 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  title?: string; 
  loading?: boolean;
}) => (
  <button 
    onClick={onClick}
    title={title}
    disabled={loading}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
      active 
        ? "bg-white text-gray-900 shadow-lg"
        : "bg-white/10 border border-white/20 text-white hover:bg-white/20",
      loading && "opacity-70 cursor-wait"
    )}
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
  </button>
);

// Action Button
const ActionButton = ({ 
  onClick, 
  disabled, 
  icon: Icon, 
  title, 
  primary, 
  label, 
  loading 
}: { 
  onClick: () => void; 
  disabled?: boolean; 
  icon: any; 
  title?: string; 
  primary?: boolean; 
  label?: string; 
  loading?: boolean;
}) => (
  <button 
    onClick={onClick}
    disabled={disabled || loading}
    title={title}
    className={cn(
      "h-10 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
      label ? "px-5" : "w-10",
      primary
        ? "bg-white text-gray-900 shadow-lg hover:bg-white/90"
        : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
    )}
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
    {label && <span className="text-sm font-bold">{label}</span>}
  </button>
);

// Filter Dropdown
const FilterDropdown = ({ 
  id, 
  label, 
  icon: Icon, 
  value, 
  placeholder, 
  options, 
  disabled, 
  renderOption,
  openDropdown,
  setOpenDropdown,
  onClear,
  clearLabel,
}: {
  id: string;
  label: string;
  icon: any;
  value: string | undefined | null;
  placeholder: string;
  options: any[];
  disabled?: boolean;
  renderOption: (opt: any) => ReactNode;
  openDropdown: string | null;
  setOpenDropdown: (val: string | null) => void;
  onClear?: () => void;
  clearLabel?: string;
}) => (
  <div className="relative flex-1 min-w-0">
    <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block ml-1">{label}</label>
    <button 
      onClick={() => !disabled && setOpenDropdown(openDropdown === id ? null : id)}
      disabled={disabled}
      className={cn(
        "w-full h-12 px-4 rounded-xl bg-white/10 border border-white/20 hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left flex items-center gap-3 text-sm",
        openDropdown === id && "border-white/50 bg-white/15"
      )}
    >
      <Icon className="w-4 h-4 text-white/50 flex-shrink-0" />
      <span className={cn("truncate flex-1 font-medium", value ? "text-white" : "text-white/50")}>
        {value || placeholder}
      </span>
      <ChevronDown className={cn("w-4 h-4 text-white/50 flex-shrink-0 transition-transform", openDropdown === id && "rotate-180")} />
    </button>
    {openDropdown === id && (
      <>
        <div className="fixed inset-0 z-[999998]" onClick={() => setOpenDropdown(null)} />
        <div className="absolute z-[999999] top-full left-0 right-0 mt-2 bg-[hsl(var(--bg-surface))] rounded-xl border border-[hsl(var(--border-default))] shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {/* Clear option */}
          {onClear && clearLabel && (
            <button
              onClick={() => {
                onClear();
                setOpenDropdown(null);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-[hsl(var(--bg-elevated))] transition-colors flex items-center gap-2 border-b border-[hsl(var(--border-subtle))] text-[hsl(var(--text-tertiary))] italic"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {clearLabel}
            </button>
          )}
          {options.map(opt => renderOption(opt))}
        </div>
      </>
    )}
  </div>
);

function QuickAddPanel({
  onAddItems,
  onClose,
  accentColor,
  langSuffix,
  t: qt,
}: {
  onAddItems: (itemIds: number[]) => void;
  onClose: () => void;
  accentColor: string;
  langSuffix: string;
  t: Translations;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length > 1) {
        setSearching(true);
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(query)}${langSuffix}`);
          if (res.ok) {
            const data: Item[] = await res.json();
            setResults(data);
            // Auto-expand all categories and classes on new search
            const cats = new Set<string>();
            const cls = new Set<string>();
            for (const item of data) {
              cats.add(item.categoryName || "Sans catégorie");
              cls.add(`${item.categoryName || "Sans catégorie"}::${item.className || "Sans classe"}`);
            }
            setExpandedCategories(cats);
            setExpandedClasses(cls);
          }
        } finally {
          setSearching(false);
        }
      } else setResults([]);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const grouped = useMemo(() => groupItemsByCategory(results), [results]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleBulk = (ids: number[]) => {
    const allSelected = ids.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleCategory = (catName: string) => {
    const next = new Set(expandedCategories);
    if (next.has(catName)) next.delete(catName);
    else next.add(catName);
    setExpandedCategories(next);
  };

  const toggleClass = (key: string) => {
    const next = new Set(expandedClasses);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedClasses(next);
  };

  const handleAdd = () => {
    onAddItems(Array.from(selectedIds));
    onClose();
  };

  const checkState = (ids: number[]): "none" | "partial" | "all" => {
    const count = ids.filter((id) => selectedIds.has(id)).length;
    if (count === 0) return "none";
    if (count === ids.length) return "all";
    return "partial";
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-5xl bg-[hsl(var(--bg-surface))] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[hsl(var(--border-default))]" />
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Search className="w-6 h-6" style={{ color: accentColor }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[hsl(var(--text-primary))]">
                {qt.quickSearchTitle}
              </h3>
              <p className="text-sm text-[hsl(var(--text-tertiary))]">{qt.addToList}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--bg-elevated))] transition-colors"
            >
              <X className="w-5 h-5 text-[hsl(var(--text-muted))]" />
            </button>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="search"
              className={cn(
                "w-full h-14 pl-5 pr-12 rounded-2xl text-base font-medium",
                "bg-[hsl(var(--bg-muted))]",
                "border-2 border-transparent focus:border-current",
                "outline-none transition-all duration-300",
                "placeholder:text-[hsl(var(--text-muted))]"
              )}
              style={{ borderColor: query ? accentColor : "transparent" }}
              placeholder={qt.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
              </div>
            )}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 sm:px-6">
          {grouped.length > 0 ? (
            <div className="pb-4 space-y-1">
              {grouped.map((cat) => {
                const catExpanded = expandedCategories.has(cat.categoryName);
                const catState = checkState(cat.allItemIds);
                return (
                  <div key={cat.categoryName}>
                    {/* Category row */}
                    <div className="flex items-center gap-2 py-2.5 px-2 rounded-xl hover:bg-[hsl(var(--bg-elevated))] transition-colors">
                      <button
                        onClick={() => toggleBulk(cat.allItemIds)}
                        className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{
                          backgroundColor: catState !== "none" ? accentColor : "transparent",
                          borderColor: catState !== "none" ? accentColor : "currentColor",
                          opacity: catState === "partial" ? 0.7 : 1,
                        }}
                      >
                        {catState === "all" && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                        {catState === "partial" && <Minus className="w-4 h-4 text-white" strokeWidth={3} />}
                      </button>
                      <button
                        onClick={() => toggleBulk(cat.allItemIds)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <Layers className="w-4 h-4 text-[hsl(var(--text-muted))] flex-shrink-0" />
                        <span className="font-semibold text-sm text-[hsl(var(--text-primary))] truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-xs text-[hsl(var(--text-muted))] flex-shrink-0">
                          ({cat.allItemIds.length})
                        </span>
                      </button>
                      <button
                        onClick={() => toggleCategory(cat.categoryName)}
                        className="p-1 rounded-md hover:bg-[hsl(var(--bg-muted))] transition-colors flex-shrink-0"
                      >
                        {catExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                        )}
                      </button>
                    </div>

                    {/* Classes within category */}
                    {catExpanded && cat.classes.map((cls) => {
                      const clsKey = `${cat.categoryName}::${cls.className}`;
                      const clsExpanded = expandedClasses.has(clsKey);
                      const clsState = checkState(cls.allItemIds);
                      return (
                        <div key={clsKey} className="ml-5">
                          {/* Class row */}
                          <div className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-[hsl(var(--bg-elevated))] transition-colors">
                            <button
                              onClick={() => toggleBulk(cls.allItemIds)}
                              className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                              style={{
                                backgroundColor: clsState !== "none" ? accentColor : "transparent",
                                borderColor: clsState !== "none" ? accentColor : "currentColor",
                                opacity: clsState === "partial" ? 0.7 : 1,
                              }}
                            >
                              {clsState === "all" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              {clsState === "partial" && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
                            </button>
                            <button
                              onClick={() => toggleBulk(cls.allItemIds)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              <Tag className="w-3.5 h-3.5 text-[hsl(var(--text-muted))] flex-shrink-0" />
                              <span className="font-medium text-sm text-[hsl(var(--text-secondary))] truncate">
                                {cls.className}
                              </span>
                              <span className="text-xs text-[hsl(var(--text-muted))] flex-shrink-0">
                                ({cls.items.length})
                              </span>
                            </button>
                            <button
                              onClick={() => toggleClass(clsKey)}
                              className="p-1 rounded-md hover:bg-[hsl(var(--bg-muted))] transition-colors flex-shrink-0"
                            >
                              {clsExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" />
                              )}
                            </button>
                          </div>

                          {/* Items within class */}
                          {clsExpanded && cls.items.map((item) => {
                            const isSelected = selectedIds.has(item.itemId);
                            return (
                              <button
                                key={item.itemId}
                                onClick={() => toggleSelect(item.itemId)}
                                className={cn(
                                  "w-full flex items-center gap-3 py-2 px-2 ml-5 rounded-xl transition-all duration-200",
                                  "text-left active:scale-[0.99]",
                                  isSelected
                                    ? "bg-[hsl(var(--bg-muted))]"
                                    : "hover:bg-[hsl(var(--bg-elevated))]"
                                )}
                              >
                                <div
                                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                  style={{
                                    backgroundColor: isSelected ? accentColor : "transparent",
                                    borderColor: isSelected ? accentColor : "currentColor",
                                  }}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-mono font-bold text-xs" style={{ color: accentColor }}>
                                    {item.itemCode}
                                  </span>
                                  <span className="text-xs text-[hsl(var(--text-tertiary))] ml-2 truncate">
                                    {item.description}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : query.length > 1 && !searching ? (
            <div className="py-12 text-center">
              <Inbox className="w-12 h-12 text-[hsl(var(--text-muted))] mx-auto mb-3" />
              <p className="text-[hsl(var(--text-tertiary))]">{qt.noResults}</p>
            </div>
          ) : null}
        </div>

        <div className="p-4 sm:p-6 border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-elevated))]">
          <button
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-white transition-all duration-300",
              "flex items-center justify-center gap-3",
              "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
              "hover:shadow-lg"
            )}
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-5 h-5" />
            {qt.add} {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemMultiSelect({
  items,
  selectedIds,
  onChange,
  disabled,
  accentColor,
  label,
  selectLabel,
}: {
  items: Item[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  disabled?: boolean;
  accentColor: string;
  label?: string;
  selectLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredItems = items.filter(
    (i) =>
      i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const clearAll = () => {
    onChange(new Set());
    setIsOpen(false);
  };

  return (
    <div ref={triggerRef} className="relative flex-1 min-w-0">
      <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block ml-1">{label || "Articles (Opt.)"}</label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-12 px-4 rounded-xl font-medium text-left transition-all duration-300",
          "flex items-center gap-3",
          "bg-white/10 border border-white/20 hover:border-white/40",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          isOpen && "bg-white/15 border-white/50"
        )}
      >
        <Tag className="w-4 h-4 text-white/50 flex-shrink-0" />
        <span className={cn("flex-1 truncate text-sm", selectedIds.size > 0 ? "text-white" : "text-white/50")}>
          {selectedIds.size > 0 ? `${selectedIds.size} ${selectLabel || "article(s)"}` : "Sélectionner..."}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/50 transition-transform duration-300 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            className="fixed z-[999999] bg-[hsl(var(--bg-surface))] rounded-2xl shadow-2xl border border-[hsl(var(--border-default))] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 8 : 0,
              left: triggerRef.current ? triggerRef.current.getBoundingClientRect().left : 0,
              width: triggerRef.current ? Math.max(triggerRef.current.offsetWidth, 300) : 300,
              maxWidth: "calc(100vw - 32px)",
            }}
          >
            {/* Clear all option */}
            <button
              onClick={clearAll}
              className="w-full px-4 py-3 text-left text-sm hover:bg-[hsl(var(--bg-elevated))] transition-colors flex items-center gap-2 border-b border-[hsl(var(--border-subtle))] text-[hsl(var(--text-tertiary))] italic"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tous les articles
            </button>

            <div className="p-3 border-b border-[hsl(var(--border-subtle))]">
              <div className="flex items-center gap-2 bg-[hsl(var(--bg-muted))] rounded-xl px-4">
                <Filter className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                <input
                  autoFocus
                  className="flex-1 py-3 bg-transparent text-sm outline-none text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]"
                  placeholder="Filtrer les articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={item.itemId}
                    onClick={() => toggleSelection(item.itemId)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                      "text-left hover:bg-[hsl(var(--bg-elevated))]",
                      selectedIds.has(item.itemId) && "bg-[hsl(var(--bg-muted))]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0"
                      )}
                      style={{
                        backgroundColor: selectedIds.has(item.itemId) ? accentColor : "transparent",
                        borderColor: selectedIds.has(item.itemId) ? accentColor : "rgb(209 213 219)",
                      }}
                    >
                      {selectedIds.has(item.itemId) && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-sm" style={{ color: accentColor }}>
                        {item.itemCode}
                      </div>
                      <div className="text-xs text-[hsl(var(--text-tertiary))] truncate">{item.description}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Inbox className="w-8 h-8 text-[hsl(var(--text-muted))] mx-auto mb-2" />
                  <span className="text-sm text-[hsl(var(--text-muted))]">Aucun article</span>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function EmailModal({
  isOpen,
  onClose,
  onSend,
  sending,
  accentColor,
  t: et,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  sending: boolean;
  accentColor: string;
  t: Translations;
}) {
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[hsl(var(--bg-surface))] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[hsl(var(--border-default))]" />
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Mail className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[hsl(var(--text-primary))]">
                {et.sendByEmail}
              </h3>
              <p className="text-sm text-[hsl(var(--text-tertiary))]">{et.pdfAttached}</p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="email"
            className={cn(
              "w-full h-14 px-5 rounded-2xl text-base font-medium",
              "bg-[hsl(var(--bg-muted))]",
              "border-2 border-transparent focus:border-current",
              "outline-none transition-all duration-300",
              "placeholder:text-[hsl(var(--text-muted))]"
            )}
            style={{ borderColor: email ? accentColor : "transparent" }}
            placeholder="nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 h-14 rounded-2xl font-semibold bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] transition-all hover:bg-[hsl(var(--bg-elevated))] disabled:opacity-50"
          >
            {et.cancel}
          </button>
          <button
            onClick={() => onSend(email)}
            disabled={!email || sending}
            className={cn(
              "flex-1 h-14 rounded-2xl font-bold text-white transition-all duration-300",
              "flex items-center justify-center gap-2",
              "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
              "hover:shadow-lg"
            )}
            style={{ backgroundColor: accentColor }}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {et.sending}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {et.send}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main Content Component
========================= */
const tenantFetcher = (url: string) => fetch(url).then((r) => r.json());

function CataloguePageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { color: accentColor } = useCurrentAccent();
  const userRole = (session as any)?.user?.role;
  const isGestionnaire = userRole?.toLowerCase().trim() === "gestionnaire";
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  // --- ACTIVE TENANT ---
  const { data: tenantsRes } = useSWR<{ ok: boolean; data: { id: string; name: string; slug: string; logo: string | null; address: string | null; city: string | null; province: string | null; postalCode: string | null; phone: string | null }[]; activeTenantId: string | null }>(
    "/api/tenants",
    tenantFetcher
  );
  const activeTenant = tenantsRes?.data?.find((t) => t.id === tenantsRes.activeTenantId) ?? tenantsRes?.data?.[0];
  const tenantLogo = activeTenant?.logo ?? "/sinto-logo.svg";
  const tenantName = activeTenant?.name ?? "SINTO";

  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);

  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

  const [showDetails, setShowDetails] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // CHANGE: Filters collapsed by default
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGeneratingFullList, setIsGeneratingFullList] = useState(false);
  const [fullListProgress, setFullListProgress] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // --- LANGUAGE ---
  const [lang, setLang] = useState<Lang>("fr");
  const t = i18n[lang];
  /** Append &lang=en (or nothing for fr) to a URL that already has query params */
  const langQ = lang === "en" ? "&lang=en" : "";
  /** For URLs with no existing query params */
  const langQFirst = lang === "en" ? "?lang=en" : "";

  // --- INITIAL LOAD (re-runs when lang changes) ---
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, plRes] = await Promise.all([
          fetch(`/api/catalogue/products${langQFirst}`),
          fetch("/api/catalogue/pricelists"),
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (plRes.ok) {
          const pls: PriceList[] = await plRes.json();
          setPriceLists(pls);
          const defaultList = pls.find((p) => p.code.startsWith("03")) || pls[0];
          if (defaultList && !selectedPriceList) setSelectedPriceList(defaultList);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // --- REFETCH EXISTING DATA ON LANGUAGE CHANGE ---
  const prevLangRef = useRef(lang);
  useEffect(() => {
    if (prevLangRef.current === lang) return;
    prevLangRef.current = lang;
    const lq = lang === "en" ? "&lang=en" : "";
    const lqFirst = lang === "en" ? "?lang=en" : "";

    (async () => {
      // Refetch item types if a product is selected
      if (selectedProduct) {
        try {
          const res = await fetch(`/api/catalogue/itemtypes?prodId=${selectedProduct.prodId}${lq}`);
          if (res.ok) setItemTypes(await res.json());
        } catch {}
      }
      // Refetch items if a type is selected
      if (selectedType) {
        try {
          const res = await fetch(`/api/catalogue/items?itemTypeId=${selectedType.itemTypeId}${lq}`);
          if (res.ok) setItems(await res.json());
        } catch {}
      }
      // Refetch price data if any is loaded
      if (priceData.length > 0 && selectedPriceList) {
        setLoadingPrices(true);
        try {
          const allIds = Array.from(new Set(priceData.map((i) => i.itemId))).join(",");
          const url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&itemIds=${allIds}${lq}`;
          const res = await fetch(url);
          if (res.ok) setPriceData(await res.json());
        } finally {
          setLoadingPrices(false);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // --- HANDLERS ---
  const handlePriceListChange = async (pl: PriceList) => {
    setOpenDropdown(null);

    // Gate 01-EXP behind biometric auth
    if (pl.code === "01-EXP") {
      setIsAuthenticating(true);
      try {
        const verified = await performWebAuthn();
        if (!verified) {
          alert("Vérification échouée.");
          return;
        }
      } catch (e) {
        console.error("Auth error", e);
        alert("Authentification annulée ou impossible.");
        return;
      } finally {
        setIsAuthenticating(false);
      }
    }

    setSelectedPriceList(pl);

    if (priceData.length > 0) {
      setLoadingPrices(true);
      const allIds = Array.from(new Set(priceData.map((i) => i.itemId))).join(",");
      try {
        const url = `/api/catalogue/prices?priceId=${pl.priceId}&itemIds=${allIds}${langQ}`;
        const res = await fetch(url);
        if (res.ok) setPriceData(await res.json());
      } finally {
        setLoadingPrices(false);
      }
    }
  };

  const handleProductChange = async (prod: Product) => {
    setSelectedProduct(prod);
    setSelectedType(null);
    setSelectedItemIds(new Set());
    setItems([]);
    setOpenDropdown(null);
    
    setLoadingTypes(true);
    try {
      const res = await fetch(`/api/catalogue/itemtypes?prodId=${prod.prodId}${langQ}`);
      if (res.ok) setItemTypes(await res.json());
    } finally {
      setLoadingTypes(false);
    }
  };

  // CHANGE: Clear product selection
  const handleClearProduct = () => {
    setSelectedProduct(null);
    setSelectedType(null);
    setSelectedItemIds(new Set());
    setItems([]);
    setItemTypes([]);
  };

  const handleTypeChange = async (type: ItemType) => {
    setSelectedType(type);
    setSelectedItemIds(new Set());
    setOpenDropdown(null);
    
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}${langQ}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoadingItems(false);
    }
  };

  // CHANGE: Clear type selection
  const handleClearType = () => {
    setSelectedType(null);
    setSelectedItemIds(new Set());
    setItems([]);
  };

  const handleLoadSelection = async () => {
    if (!selectedPriceList) return;
    
    if (selectedItemIds.size > 0) {
      await handleAddItems(Array.from(selectedItemIds));
      return;
    }

    if (!selectedProduct) return;

    setLoadingPrices(true);
    setPriceError(null);
    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}`;
      if (selectedProduct) url += `&prodId=${selectedProduct.prodId}`;
      if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;
      url += langQ;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur lors du chargement des prix");
      
      const newItems: ItemPriceData[] = await res.json();
      setPriceData((prev) => {
        const existingIds = new Set(prev.map((i) => i.itemId));
        const filteredNew = newItems.filter((i) => !existingIds.has(i.itemId));
        return [...prev, ...filteredNew];
      });
    } catch (err: any) {
      setPriceError(err.message);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleAddItems = async (itemIds: number[]) => {
    if (!selectedPriceList || itemIds.length === 0) return;
    setLoadingPrices(true);
    try {
      const idsString = itemIds.join(",");
      const url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&itemIds=${idsString}${langQ}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch items");
      const newItems: ItemPriceData[] = await res.json();
      setPriceData((prev) => {
        const existingIds = new Set(prev.map((i) => i.itemId));
        const filteredNew = newItems.filter((i) => !existingIds.has(i.itemId));
        return [...prev, ...filteredNew];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrices(false);
    }
  };

  // NEW: Remove individual item from price list
  const handleRemoveItem = (itemId: number) => {
    setPriceData((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  // Generate full list across all product categories
  const handleGenerateFullList = async () => {
    if (!selectedPriceList) return;
    setIsGeneratingFullList(true);
    setLoadingPrices(true);
    setPriceError(null);
    setPriceData([]);
    let accumulated: ItemPriceData[] = [];

    try {
      for (let i = 0; i < products.length; i++) {
        const prod = products[i];
        setFullListProgress(
          t.generatingProgress
            .replace("{current}", String(i + 1))
            .replace("{total}", String(products.length)) +
            ` — ${prod.name}`
        );

        const url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&prodId=${prod.prodId}${langQ}`;
        const res = await fetch(url);
        if (!res.ok) continue;

        const newItems: ItemPriceData[] = await res.json();
        const existingIds = new Set(accumulated.map((item) => item.itemId));
        const deduped = newItems.filter((item) => !existingIds.has(item.itemId));
        accumulated = [...accumulated, ...deduped];
        setPriceData([...accumulated]);
      }
    } catch (err: any) {
      setPriceError(err.message);
    } finally {
      setIsGeneratingFullList(false);
      setLoadingPrices(false);
      setFullListProgress("");
    }
  };

  const performWebAuthn = async (): Promise<boolean> => {
    const resp = await fetch("/api/auth/challenge");
    if (!resp.ok) throw new Error("Challenge fetch failed");
    const { type, options } = await resp.json();

    let authResp;
    if (type === "authenticate") {
      try {
        authResp = await startAuthentication(options);
      } catch {
        // No matching credential on this device — fall back to registering a new one
        const regResp = await fetch("/api/auth/challenge?register=true");
        if (!regResp.ok) throw new Error("Registration challenge failed");
        const regData = await regResp.json();
        authResp = await startRegistration(regData.options);
        const verifyResp = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "register", response: authResp }),
        });
        const verification = await verifyResp.json();
        return verification.verified;
      }
    } else {
      authResp = await startRegistration(options);
    }

    const verifyResp = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, response: authResp }),
    });
    const verification = await verifyResp.json();
    return verification.verified;
  };

  const handleToggleDetails = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    setIsAuthenticating(true);
    try {
      const verified = await performWebAuthn();
      if (verified) setShowDetails(true);
      else {
        alert("Vérification échouée.");
        setShowDetails(false);
      }
    } catch (e) {
      console.error("Auth error", e);
      alert("Authentification annulée ou impossible.");
      setShowDetails(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const generatePriceListPDF = async () => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const corporateRed: [number, number, number] = [200, 30, 30];
      const black: [number, number, number] = [0, 0, 0];
      const darkGray: [number, number, number] = [51, 51, 51];
      const mediumGray: [number, number, number] = [102, 102, 102];
      const borderGray: [number, number, number] = [200, 200, 200];
      const white: [number, number, number] = [255, 255, 255];

      const logoData = await getDataUri(tenantLogo);
      if (logoData) {
        const tempImg = new window.Image();
        tempImg.src = logoData;
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.onerror = resolve;
        });
        const naturalWidth = tempImg.naturalWidth || 200;
        const naturalHeight = tempImg.naturalHeight || 50;
        const aspectRatio = naturalWidth / naturalHeight;
        const logoWidth = 36;
        const logoHeight = logoWidth / aspectRatio;
        doc.addImage(logoData, "PNG", 15, 14, logoWidth, logoHeight);
      }

      doc.setTextColor(...black);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(tenantName.toUpperCase(), pageWidth - 15, 15, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mediumGray);
      if (activeTenant?.address) {
        doc.text(activeTenant.address, pageWidth - 15, 21, { align: "right" });
        doc.text(`${activeTenant.city} (${activeTenant.province}) ${activeTenant.postalCode}`, pageWidth - 15, 26, { align: "right" });
      }
      if (activeTenant?.phone) {
        doc.text(`Tél: ${activeTenant.phone}`, pageWidth - 15, 31, { align: "right" });
      }

      doc.setFillColor(...corporateRed);
      doc.rect(15, 38, pageWidth - 30, 10, "F");
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const priceListTitle = `${abbreviateColumnName(selectedPriceList?.code || "")} - ${selectedPriceList?.name || ""}`.toUpperCase();
      doc.text(priceListTitle, pageWidth / 2, 45, { align: "center" });

      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Effective: ${new Date().toLocaleDateString("fr-CA")}`, pageWidth / 2, 54, { align: "center" });

      let finalY = 62;

      // Group by category then class for PDF
      const groupedForPdf = priceData.reduce((acc, item) => {
        const categoryKey = item.categoryName || t.addedItems;
        const classKey = item.className || t.withoutClass;
        if (!acc[categoryKey]) acc[categoryKey] = {};
        if (!acc[categoryKey][classKey]) acc[categoryKey][classKey] = [];
        acc[categoryKey][classKey].push(item);
        return acc;
      }, {} as Record<string, Record<string, ItemPriceData[]>>);

      for (const [categoryName, classesByCategory] of Object.entries(groupedForPdf)) {
        // Category header
        if (finalY > 240) {
          doc.addPage();
          doc.setFillColor(...black);
          doc.rect(15, 10, pageWidth - 30, 8, "F");
          doc.setTextColor(...white);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(priceListTitle, pageWidth / 2, 15.5, { align: "center" });
          finalY = 25;
        }

        // Draw category header
        doc.setFillColor(40, 40, 40);
        doc.rect(15, finalY, pageWidth - 30, 9, "F");
        doc.setTextColor(...white);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(categoryName.toUpperCase(), 18, finalY + 6.5);
        const totalInCategory = Object.values(classesByCategory).reduce((sum, items) => sum + items.length, 0);
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`${Object.keys(classesByCategory).length} ${t.classes} • ${totalInCategory} ${t.articles}`, pageWidth - 18, finalY + 6.5, { align: "right" });
        finalY += 13;

        for (const [className, classItems] of Object.entries(classesByCategory)) {
        // Defer class header drawing until first item to prevent orphaning
        let classHeaderDrawn = false;
        const drawClassHeader = () => {
          doc.setFillColor(...black);
          doc.rect(15, finalY, pageWidth - 30, 7, "F");
          doc.setTextColor(...white);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(className.toUpperCase(), 18, finalY + 5);
          doc.setTextColor(200, 200, 200);
          doc.setFontSize(7);
          doc.text(`${classItems.length} ${t.articles}`, pageWidth - 18, finalY + 5, { align: "right" });
          finalY += 7;
          classHeaderDrawn = true;
        };

        const firstItem = classItems[0];
        let priceColumns = firstItem.ranges[0]?.columns
          ? sortPriceColumns(Object.keys(firstItem.ranges[0].columns))
          : [selectedPriceList?.code || "Prix"];
        if (!showDetails && selectedPriceList?.code !== "01-EXP") {
          priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
        }
        const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
        const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS") && selectedPriceList?.code?.trim() !== "03-IND";

        const headRow = ["Article", "Fmt", "Qty"];
        const pdfCommonUnit = getCommonUnit(classItems);
        standardColumns.forEach((c) => {
          headRow.push(abbreviateColumnName(c));
          if (c.trim() === selectedPriceList?.code?.trim()) {
            headRow.push(`$/${pdfCommonUnit}`);
            if (showDetails) {
              headRow.push("$/Cs");
            }
            if (showDetails || selectedPriceList?.code === "01-EXP") {
              headRow.push(selectedPriceList?.code === "01-EXP" ? "%Exp (vs. IND)" : "%Exp");
            }
          }
        });
        if (hasPDS) headRow.push(abbreviateColumnName("08-PDS"));

        // Compute explicit column widths so all item tables align
        const tableWidth = pageWidth - 30; // margins
        const fixedWidth = 30 + 15 + 12; // Article + Fmt + Qty
        const numDynamicCols = headRow.length - 3;
        const dynamicColWidth = numDynamicCols > 0 ? (tableWidth - fixedWidth) / numDynamicCols : 20;
        const pdfColumnStyles: Record<number, any> = {
          0: { fontStyle: "bold", halign: "left", cellWidth: 30 },
          1: { halign: "center", cellWidth: 15 },
          2: { halign: "center", cellWidth: 12 },
        };
        for (let ci = 3; ci < headRow.length; ci++) {
          pdfColumnStyles[ci] = { halign: "right", cellWidth: dynamicColWidth };
        }

        const ROW_HEIGHT = 8;
        const HEAD_HEIGHT = 10;
        let showTableHead = true;

        classItems.forEach((item, itemIndex) => {
          const itemRows: string[][] = [];
          item.ranges.forEach((range, idx) => {
            const row: string[] = [];
            if (idx === 0) {
              row.push(item.itemCode);
              row.push(item.format || "-");
            } else {
              row.push("");
              row.push("");
            }
            row.push(range.qtyMin.toString());
            standardColumns.forEach((col) => {
              const val = range.columns?.[col] ?? null;
              row.push(val ? val.toFixed(2) : "-");
              if (col.trim() === selectedPriceList?.code?.trim()) {
                const { quantity } = parseFormat(item.format);
                const ppu = quantity && val ? (val / quantity) : null;
                row.push(ppu ? ppu.toFixed(2) : "-");
                if (showDetails) {
                  const ppc = calcPricePerCaisse(val || 0, item.caisse);
                  row.push(ppc ? ppc.toFixed(2) : "-");
                }
                if (showDetails || selectedPriceList?.code === "01-EXP") {
                  const expBaseVal = selectedPriceList?.code === "01-EXP"
                    ? (range.columns?.["03-IND"] ?? null)
                    : (range.columns?.["01-EXP"] ?? null);
                  const pExp = selectedPriceList?.code === "01-EXP"
                    ? calcMargin(expBaseVal, val)
                    : calcMargin(val, expBaseVal);
                  row.push(pExp ? `${pExp.toFixed(1)}%` : "-");
                }
              }
            });
            if (hasPDS) {
              const p = range.columns?.["08-PDS"] ?? null;
              row.push(p ? p.toFixed(2) : "-");
            }
            itemRows.push(row);
          });

          if (itemRows.length === 0) return;

          // Check if this item's rows fit on the remaining page
          // Include class header height (7mm) if it hasn't been drawn yet
          const classHeaderHeight = classHeaderDrawn ? 0 : 7;
          const neededHeight = classHeaderHeight + itemRows.length * ROW_HEIGHT + (showTableHead ? HEAD_HEIGHT : 0);
          if (finalY + neededHeight > pageHeight - 20) {
            doc.addPage();
            doc.setFillColor(...black);
            doc.rect(15, 10, pageWidth - 30, 8, "F");
            doc.setTextColor(...white);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(priceListTitle, pageWidth / 2, 15.5, { align: "center" });
            finalY = 25;
            showTableHead = true;
          }

          // Draw class header if not yet drawn
          if (!classHeaderDrawn) drawClassHeader();

          autoTable(doc, {
            startY: finalY,
            head: [headRow],
            showHead: showTableHead ? "everyPage" : false,
            body: itemRows,
            margin: { left: 15, right: 15 },
            styles: {
              fontSize: 8,
              cellPadding: 2,
              font: "helvetica",
              lineColor: borderGray,
              lineWidth: 0.2,
              textColor: darkGray,
            },
            headStyles: {
              fillColor: corporateRed,
              textColor: white,
              fontStyle: "bold",
              halign: "center",
              lineColor: corporateRed,
              lineWidth: 0.2,
            },
            columnStyles: pdfColumnStyles,
            theme: "grid",
            didParseCell: function (d) {
              if (d.section === "body" && d.column.index === 0 && d.cell.raw) {
                d.cell.styles.textColor = corporateRed;
                d.cell.styles.fontStyle = "bold";
              }
              if (d.section === "body" && itemIndex % 2 === 1) {
                d.cell.styles.fillColor = [248, 248, 248];
              }
            },
          });
          finalY = (doc as any).lastAutoTable.finalY;
          // Draw bold separator line between SKUs
          doc.setDrawColor(...black);
          doc.setLineWidth(0.8);
          doc.line(15, finalY, pageWidth - 15, finalY);
          showTableHead = false;
        });
        finalY += 8;
        }

        finalY += 6; // Extra spacing after each category
      }

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...black);
        doc.setLineWidth(0.5);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        doc.setTextColor(...mediumGray);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(tenantName, 15, pageHeight - 10);
        doc.text(`Page ${i} / ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
        if (tenantName.toUpperCase() === "SINTO") {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...black);
          doc.text("www.sintoexpert.com", pageWidth / 2, pageHeight - 10, { align: "center" });
        }
      }

      return doc;
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const doc = await generatePriceListPDF();
      const now = new Date();
      const dateSuffix = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${now.getFullYear()}`;
      doc.save(`ListePrix_${tenantName.toUpperCase()}_${dateSuffix}.pdf`);
    } catch (e: any) {
      console.error(e);
      alert("Erreur: " + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailPDF = async (recipientEmail: string) => {
    setIsSendingEmail(true);
    try {
      const doc = await generatePriceListPDF();

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      const now = new Date();
      const dateSuffix = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${now.getFullYear()}`;
      formData.append("file", pdfBlob, `ListePrix_${tenantName.toUpperCase()}_${dateSuffix}.pdf`);
      formData.append("to", recipientEmail);
      formData.append("subject", `Liste de prix ${tenantName} : ${selectedPriceList?.name}`);
      formData.append("tenantName", tenantName);
      if (activeTenant?.logo) {
        formData.append("tenantLogo", activeTenant.logo);
      }
      const res = await fetch("/api/catalogue/email", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erreur envoi");
      alert("Courriel envoyé avec succès!");
      setShowEmailModal(false);
    } catch (e: any) {
      console.error(e);
      alert("Erreur: " + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const calcPricePerCaisse = (price: number, caisse: number | null) => caisse ? price * caisse : null;
  const calcPricePerUnit = (price: number, format: string | null) => {
    const { quantity } = parseFormat(format);
    return quantity ? price / quantity : null;
  };
  const calcMargin = (sell: number | null, cost: number | null) => {
    if (!sell || !cost || sell === 0) return null;
    return ((sell - cost) / sell) * 100;
  };

  const itemsWithPrices = priceData.filter((item) => item.ranges && item.ranges.length > 0);
  
  // Group items by Category, then by Class
  const groupedByCategory = itemsWithPrices.reduce((acc, item) => {
    const categoryKey = item.categoryName || t.addedItems;
    const classKey = item.className || t.withoutClass;
    
    if (!acc[categoryKey]) acc[categoryKey] = {};
    if (!acc[categoryKey][classKey]) acc[categoryKey][classKey] = [];
    acc[categoryKey][classKey].push(item);
    
    return acc;
  }, {} as Record<string, Record<string, ItemPriceData[]>>);

  const canAddSelection = selectedProduct || selectedItemIds.size > 0;

  return (
    <div className="fixed inset-0 z-[99990] flex bg-[hsl(var(--bg-base))]">
      <div className="relative w-full h-full flex flex-col animate-in fade-in duration-300">
        
        {/* ===================== HEADER - NEW STREAMLINED LAYOUT ===================== */}
        <header
          className="flex-shrink-0 relative shadow-2xl z-50 overflow-visible"
          style={{ backgroundColor: accentColor }}
        >
          {/* Decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-black/10 blur-2xl" />
          </div>

          <div className="relative px-4 py-4 sm:px-6">
            {/* ===== TOP ROW: All buttons in one line ===== */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              
              {/* LEFT SECTION: Logo + Price List + Details Toggle + Filters Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Tenant Logo */}
                <a href="https://app.nartex.ca" className="flex-shrink-0 bg-black p-1.5 rounded-lg shadow-sm hover:opacity-80 transition-opacity">
                  <Image
                    src={tenantLogo}
                    alt={tenantName}
                    width={80}
                    height={28}
                    className="h-6 sm:h-7 w-auto object-contain"
                  />
                </a>

                <div className="w-px h-8 bg-white/20 hidden sm:block" />

                {/* Price List Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'pricelist' ? null : 'pricelist')}
                    className={cn(
                      "h-10 px-3 sm:px-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2 text-sm w-[120px] sm:w-[260px]",
                      openDropdown === 'pricelist' && "bg-white/20 border-white/40"
                    )}
                  >
                    <span className="truncate flex-1 text-left">
                      {selectedPriceList ? (
                        <>
                          <span className="text-white font-bold">{abbreviateColumnName(selectedPriceList.code)}</span>
                          <span className="text-white/70 ml-1.5 hidden sm:inline">- {selectedPriceList.name}</span>
                        </>
                      ) : <span className="text-white/50">Sélectionner...</span>}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform flex-shrink-0", openDropdown === 'pricelist' && "rotate-180")} />
                  </button>
                  {openDropdown === 'pricelist' && (
                    <>
                      <div className="fixed inset-0 z-[999998]" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute z-[999999] top-full left-0 mt-2 bg-[hsl(var(--bg-surface))] rounded-xl border border-[hsl(var(--border-default))] shadow-2xl overflow-hidden w-80 max-h-96 overflow-y-auto">
                        {priceLists.map(list => (
                          <button
                            key={list.priceId}
                            onClick={() => handlePriceListChange(list)}
                            className={cn(
                              "w-full px-4 py-3 text-left text-sm hover:bg-[hsl(var(--bg-elevated))] transition-colors flex items-center justify-between",
                              selectedPriceList?.priceId === list.priceId && "bg-[hsl(var(--bg-muted))]"
                            )}
                          >
                            <span className="truncate text-[hsl(var(--text-primary))]">{abbreviateColumnName(list.code)} - {list.name}</span>
                            {selectedPriceList?.priceId === list.priceId && <Check className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Details Toggle Switch */}
                <ToggleSwitch
                  enabled={showDetails}
                  onToggle={handleToggleDetails}
                  label={t.viewDetails}
                  loading={isAuthenticating}
                />

                {/* Language Toggle */}
                <button
                  onClick={() => setLang(lang === "fr" ? "en" : "fr")}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-sm font-bold text-white"
                  title={lang === "fr" ? "Switch to English" : "Passer en français"}
                >
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{lang === "fr" ? "EN" : "FR"}</span>
                </button>

                {/* Filters Toggle Button */}
                <ToggleButton
                  active={filtersExpanded}
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  icon={SlidersHorizontal}
                  title={t.showHideFilters}
                />
              </div>

              {/* RIGHT SECTION: Search + Add + Email + Recycle + Close */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Generate Full List (Gestionnaire only) */}
                {isGestionnaire && (
                  <ActionButton
                    onClick={handleGenerateFullList}
                    disabled={isGeneratingFullList || products.length === 0}
                    icon={Layers}
                    title={t.generateFullList}
                    primary
                    label={!isCompact ? t.generateFullList : undefined}
                    loading={isGeneratingFullList}
                  />
                )}

                {/* Search Button */}
                <ActionButton
                  onClick={() => setShowQuickAdd(true)}
                  icon={Search}
                  title={t.quickSearchBtn}
                />

                {/* Email Button with Label */}
                <ActionButton
                  onClick={() => setShowEmailModal(true)}
                  disabled={priceData.length === 0 || showDetails || selectedPriceList?.code === "01-EXP"}
                  icon={Mail}
                  title={showDetails || selectedPriceList?.code === "01-EXP" ? t.disabledForList : t.sendEmailTitle}
                  primary
                  label={!isCompact ? t.send : undefined}
                />

                {/* Download PDF Button */}
                <ActionButton
                  onClick={handleDownloadPDF}
                  disabled={priceData.length === 0}
                  icon={Download}
                  title={t.downloadPdf}
                  primary
                  label={!isCompact ? t.download : undefined}
                  loading={isDownloading}
                />

                <div className="w-px h-8 bg-white/20 mx-1 hidden sm:block" />

                {/* CHANGE: Recycle Button (moved before Close, changed icon) */}
                <ActionButton
                  onClick={() => setPriceData([])}
                  disabled={priceData.length === 0}
                  icon={Recycle}
                  title={t.clearAll}
                />

                {/* Close Button */}
                <ActionButton
                  onClick={() => router.back()}
                  icon={X}
                  title={t.close}
                />
              </div>
            </div>

            {/* ===== COLLAPSIBLE FILTERS PANEL ===== */}
            {filtersExpanded && (
              <div className="mt-4 p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  {/* Category Dropdown */}
                  <FilterDropdown
                    id="category"
                    label={t.category}
                    icon={Layers}
                    value={selectedProduct?.name}
                    placeholder={t.select}
                    options={products}
                    disabled={loadingTypes}
                    openDropdown={openDropdown}
                    setOpenDropdown={setOpenDropdown}
                    onClear={handleClearProduct}
                    clearLabel={t.allCategories}
                    renderOption={(prod: Product) => (
                      <button
                        key={prod.prodId}
                        onClick={() => handleProductChange(prod)}
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm hover:bg-[hsl(var(--bg-elevated))] transition-colors flex items-center justify-between",
                          selectedProduct?.prodId === prod.prodId && "bg-[hsl(var(--bg-muted))]"
                        )}
                      >
                        <span className="text-[hsl(var(--text-primary))]">{prod.name}</span>
                        <span className="text-xs text-[hsl(var(--text-tertiary))] bg-[hsl(var(--bg-muted))] px-2 py-0.5 rounded">{prod.itemCount}</span>
                      </button>
                    )}
                  />

                  {/* Class Dropdown */}
                  <FilterDropdown
                    id="class"
                    label={t.classOpt}
                    icon={Package}
                    value={selectedType?.description}
                    placeholder={t.allOpt}
                    options={itemTypes}
                    disabled={!selectedProduct || loadingItems}
                    openDropdown={openDropdown}
                    setOpenDropdown={setOpenDropdown}
                    onClear={handleClearType}
                    clearLabel={t.allClasses}
                    renderOption={(type: ItemType) => (
                      <button
                        key={type.itemTypeId}
                        onClick={() => handleTypeChange(type)}
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm hover:bg-[hsl(var(--bg-elevated))] transition-colors flex items-center justify-between",
                          selectedType?.itemTypeId === type.itemTypeId && "bg-[hsl(var(--bg-muted))]"
                        )}
                      >
                        <span className="text-[hsl(var(--text-primary))]">{type.description}</span>
                        <span className="text-xs text-[hsl(var(--text-tertiary))] bg-[hsl(var(--bg-muted))] px-2 py-0.5 rounded">{type.itemCount}</span>
                      </button>
                    )}
                  />
                  
                  {/* CHANGE: Items MultiSelect - now only enabled when selectedType is set */}
                  <ItemMultiSelect
                    items={items}
                    selectedIds={selectedItemIds}
                    onChange={setSelectedItemIds}
                    disabled={!selectedType}
                    accentColor={accentColor}
                    label={t.itemsOpt}
                    selectLabel={t.articles}
                  />

                  {/* Add Button */}
                  <ActionButton
                    onClick={handleLoadSelection}
                    disabled={!canAddSelection}
                    icon={Plus}
                    title={t.addSelectionTitle}
                    primary
                    label={!isCompact ? t.add : undefined}
                    loading={loadingPrices}
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ===================== CONTENT - ORIGINAL TABLE FORMAT ===================== */}
        <main className="flex-1 overflow-auto bg-[hsl(var(--bg-muted))]">
          {loadingPrices ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="relative">
                <div
                  className="w-20 h-20 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${accentColor}30`, borderTopColor: "transparent" }}
                />
                <div
                  className="absolute inset-3 w-14 h-14 border-4 border-b-transparent rounded-full animate-spin"
                  style={{ borderColor: accentColor, borderBottomColor: "transparent", animationDirection: "reverse", animationDuration: "0.8s" }}
                />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[hsl(var(--text-secondary))]">
                  {isGeneratingFullList ? fullListProgress : t.loadingPrices}
                </p>
                <p className="text-[hsl(var(--text-tertiary))] mt-1">{t.pleaseWait}</p>
              </div>
            </div>
          ) : priceError ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                <AlertCircle className="w-12 h-12" style={{ color: accentColor }} />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: accentColor }}>{t.error}</p>
                <p className="text-[hsl(var(--text-tertiary))] mt-2 max-w-md">{priceError}</p>
                <button onClick={() => handleLoadSelection()} className="mt-6 px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all hover:scale-105 active:scale-95" style={{ borderColor: accentColor, color: accentColor }}>
                  <RefreshCw className="w-4 h-4 inline mr-2" />{t.retry}
                </button>
              </div>
            </div>
          ) : Object.keys(groupedByCategory).length > 0 ? (
            <div className="p-4 sm:p-6 space-y-8">
              {Object.entries(groupedByCategory).map(([categoryName, classesByCategory]) => {
                // Count total items in this category
                const totalItemsInCategory = Object.values(classesByCategory).reduce((sum, items) => sum + items.length, 0);
                
                return (
                  <div key={categoryName} className="space-y-4">
                    {/* ===== CATEGORY HEADER ===== */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(var(--bg-base))] to-[hsl(var(--bg-surface))] shadow-xl">
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: `${accentColor}30` }} />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
                      </div>
                      <div className="relative px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                            <Layers className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">{categoryName}</h2>
                            <p className="text-white/50 text-sm mt-0.5">{Object.keys(classesByCategory).length} {t.classes} • {totalItemsInCategory} {t.articles}</p>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                          <FileText className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-sm font-medium">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* ===== CLASS SECTIONS UNDER THIS CATEGORY ===== */}
                    <div className="space-y-4 pl-0 sm:pl-4">
                      {Object.entries(classesByCategory).map(([className, classItems]) => {
                const firstItem = classItems[0];
                let priceColumns = firstItem.ranges[0]?.columns
                  ? sortPriceColumns(Object.keys(firstItem.ranges[0].columns))
                  : [selectedPriceList?.code || "Prix"];
                if (!showDetails && selectedPriceList?.code !== "01-EXP")
                  priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
                const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
                const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS") && selectedPriceList?.code?.trim() !== "03-IND";
                const commonUnit = getCommonUnit(classItems);

                return (
                  <section key={className} className="bg-[hsl(var(--bg-surface))] rounded-2xl overflow-hidden shadow-lg border border-[hsl(var(--border-default))]">
                    <div className="relative px-5 py-3 sm:px-6 sm:py-4" style={{ backgroundColor: accentColor }}>
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                      </div>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-white/70" />
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">{className}</h3>
                            <p className="text-white/60 text-xs mt-0.5">{classItems.length} {t.articles}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span className="text-white text-xs font-bold">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className={cn("w-full border-collapse", isCompact ? "text-xs" : "text-sm")}>
                        <thead>
                          <tr className="bg-[hsl(var(--bg-elevated))]">
                            {/* Remove column header */}
                            <th className={cn("w-10 text-center font-black text-[hsl(var(--text-muted))] border-b-2 border-[hsl(var(--border-default))]", isCompact ? "p-2" : "p-3")}></th>
                            <th className={cn("text-left font-black text-[hsl(var(--text-secondary))] border-b-2 border-[hsl(var(--border-default))] sticky left-0 bg-[hsl(var(--bg-elevated))] z-10", isCompact ? "p-3" : "p-4")}>
                              <div className="flex items-center gap-2">
                                <Package className={cn(isCompact ? "w-4 h-4" : "w-5 h-5", "opacity-50")} />Article
                              </div>
                            </th>
                            <th className={cn("text-center font-black text-[hsl(var(--text-secondary))] border-b-2 border-[hsl(var(--border-default))]", isCompact ? "p-3" : "p-4")}>Cs</th>
                            <th className={cn("text-center font-black text-[hsl(var(--text-secondary))] border-b-2 border-[hsl(var(--border-default))]", isCompact ? "p-3" : "p-4")}>Fmt</th>
                            <th className={cn("text-center font-black text-[hsl(var(--text-secondary))] border-b-2 border-[hsl(var(--border-default))]", isCompact ? "p-3" : "p-4")}>Qty</th>
                            {standardColumns.map((colCode) => {
                              const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                              const displayName = abbreviateColumnName(colCode);
                              return (
                                <Fragment key={colCode}>
                                  <th className={cn("text-right font-black border-b-2 border-[hsl(var(--border-default))] whitespace-nowrap", isCompact ? "p-3" : "p-4", isSelectedList ? "text-[hsl(var(--warning))] bg-[hsl(var(--warning-muted))]" : "text-[hsl(var(--text-secondary))]")}>{displayName}</th>
                                  {/* $/Unit column - ALWAYS VISIBLE for selected price list */}
                                  {isSelectedList && (
                                    <th className={cn("text-right font-black text-[hsl(var(--info))] border-b-2 border-[hsl(var(--border-default))] bg-[hsl(var(--info-muted))]/50 whitespace-nowrap", isCompact ? "p-3" : "p-4")}>$/{commonUnit}</th>
                                  )}
                                  {showDetails && isSelectedList && !isCompact && (
                                    <th className="text-right p-4 font-black text-[hsl(var(--info))] border-b-2 border-[hsl(var(--border-default))] bg-[hsl(var(--info-muted))]/50 whitespace-nowrap">$/Cs</th>
                                  )}
                                  {(showDetails || selectedPriceList?.code === "01-EXP") && isSelectedList && !isCompact && (
                                    <th className="text-right p-4 font-black text-[hsl(var(--info))] border-b-2 border-[hsl(var(--border-default))] bg-[hsl(var(--info-muted))] whitespace-nowrap">{selectedPriceList?.code === "01-EXP" ? "%Exp (vs. IND)" : "%Exp"}</th>
                                  )}
                                  {showDetails && isSelectedList && isCompact && (
                                    <th className="text-right p-3 font-black text-[hsl(var(--info))] border-b-2 border-[hsl(var(--border-default))] bg-[hsl(var(--info-muted))]/50 whitespace-nowrap">Détails</th>
                                  )}
                                </Fragment>
                              );
                            })}
                            {hasPDS && <th className={cn("text-right font-black text-[hsl(var(--text-secondary))] border-b-2 border-[hsl(var(--border-default))] whitespace-nowrap", isCompact ? "p-3" : "p-4")}>{abbreviateColumnName("08-PDS")}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {classItems.map((item, itemIndex) => (
                            <Fragment key={item.itemId}>
                              {item.ranges.map((range, rIdx) => {
                                const isFirstRowOfItem = rIdx === 0;
                                const rowBg = itemIndex % 2 === 0 ? "bg-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--bg-elevated))]";

                                return (
                                  <tr key={range.id} className={cn("transition-colors duration-200 group", rowBg, "hover:bg-[hsl(var(--bg-elevated))]")}>
                                    {/* Remove button cell */}
                                    <td className={cn("border-b border-[hsl(var(--border-subtle))] align-top text-center", isCompact ? "p-2" : "p-3", rowBg, "group-hover:bg-[hsl(var(--bg-elevated))]")}>
                                      {isFirstRowOfItem && (
                                        <button
                                          onClick={() => handleRemoveItem(item.itemId)}
                                          className="w-6 h-6 rounded-md flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] transition-all"
                                          title={t.removeItem}
                                        >
                                          <Minus className="w-4 h-4" />
                                        </button>
                                      )}
                                    </td>
                                    <td className={cn("border-b border-[hsl(var(--border-subtle))] align-top sticky left-0 z-10", isCompact ? "p-3" : "p-4", rowBg, "group-hover:bg-[hsl(var(--bg-elevated))]")}>
                                      {isFirstRowOfItem && (
                                        <div className="flex flex-col gap-0.5">
                                          <span className={cn("font-mono font-black tracking-tight", isCompact ? "text-sm" : "text-base")} style={{ color: accentColor }}>{item.itemCode}</span>
                                          <span className={cn("text-[hsl(var(--text-tertiary))] truncate max-w-[200px]", isCompact ? "text-[10px]" : "text-xs")} title={item.description}>{item.description}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className={cn("text-center border-b border-[hsl(var(--border-subtle))] align-top", isCompact ? "p-3" : "p-4")}>
                                      {isFirstRowOfItem && <span className="font-bold text-[hsl(var(--text-primary))]">{item.caisse ? Math.round(item.caisse) : "-"}</span>}
                                    </td>
                                    <td className={cn("text-center border-b border-[hsl(var(--border-subtle))] align-top", isCompact ? "p-3" : "p-4")}>
                                      {isFirstRowOfItem && <span className="font-medium text-[hsl(var(--text-secondary))] px-2 py-1 bg-[hsl(var(--bg-muted))] rounded-lg inline-block text-xs">{item.format || "-"}</span>}
                                    </td>
                                    <td className={cn("text-center border-b border-[hsl(var(--border-subtle))]", isCompact ? "p-3" : "p-4")}>
                                      <span className="font-mono font-bold text-[hsl(var(--text-primary))]">{range.qtyMin}</span>
                                    </td>
                                    {standardColumns.map((colCode) => {
                                      const priceVal = range.columns ? range.columns[colCode] : colCode === selectedPriceList?.code ? range.unitPrice : null;
                                      const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                                      return (
                                        <Fragment key={colCode}>
                                          <td className={cn("text-right border-b border-[hsl(var(--border-subtle))]", isCompact ? "p-3" : "p-4", isSelectedList && "bg-[hsl(var(--warning-muted))]/50")}>
                                            <span className={cn("font-mono font-bold whitespace-nowrap", isSelectedList ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--text-secondary))]")}>
                                              {priceVal !== null && priceVal !== undefined ? <AnimatedPrice value={priceVal} /> : "-"}
                                            </span>
                                          </td>
                                          {/* $/Unit column - ALWAYS VISIBLE for selected price list */}
                                          {isSelectedList && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppu = calcPricePerUnit(selectedPriceVal, item.format);
                                            return (
                                              <td className={cn("text-right border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--info-muted))]/30", isCompact ? "p-3" : "p-4")}>
                                                <span className="font-mono font-bold text-[hsl(var(--info))]">{ppu ? ppu.toFixed(2) : "-"}</span>
                                              </td>
                                            );
                                          })()}
                                          {showDetails && isSelectedList && !isCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppc = calcPricePerCaisse(selectedPriceVal, item.caisse);
                                            return (
                                                <td className="p-4 text-right border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--info-muted))]/30">
                                                  <span className="font-mono text-[hsl(var(--info))]">{ppc ? ppc.toFixed(2) : "-"}</span>
                                                </td>
                                            );
                                          })()}
                                          {(showDetails || selectedPriceList?.code === "01-EXP") && isSelectedList && !isCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const expBaseVal = selectedPriceList?.code === "01-EXP"
                                              ? (range.columns?.["03-IND"] ?? null)
                                              : (range.columns?.["01-EXP"] ?? null);
                                            const percentExp = selectedPriceList?.code === "01-EXP"
                                              ? calcMargin(expBaseVal, selectedPriceVal)
                                              : calcMargin(selectedPriceVal, expBaseVal);
                                            return (
                                                <td className="p-4 text-right border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--info-muted))]/50">
                                                  <span className={cn("font-mono font-bold", percentExp && percentExp < 0 ? "text-[hsl(var(--danger))]" : "text-[hsl(var(--info))]")}>
                                                    {percentExp !== null ? `${percentExp.toFixed(1)}%` : "-"}
                                                  </span>
                                                </td>
                                            );
                                          })()}
                                          {showDetails && isSelectedList && isCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppc = calcPricePerCaisse(selectedPriceVal, item.caisse);
                                            const expBaseVal = selectedPriceList?.code === "01-EXP"
                                              ? (range.columns?.["03-IND"] ?? null)
                                              : (range.columns?.["01-EXP"] ?? null);
                                            const percentExp = selectedPriceList?.code === "01-EXP"
                                              ? calcMargin(expBaseVal, selectedPriceVal)
                                              : calcMargin(selectedPriceVal, expBaseVal);
                                            return (
                                              <td className="p-3 text-right border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--info-muted))]/30">
                                                <div className="space-y-1 text-[10px]">
                                                  <div className="flex justify-end gap-2 text-[hsl(var(--info))]">
                                                    <span className="opacity-60">$/Cs</span>
                                                    <span className="font-mono font-bold">{ppc ? ppc.toFixed(2) : "-"}</span>
                                                  </div>
                                                  <div className="flex justify-end gap-2 text-[hsl(var(--info))]">
                                                    <span className="opacity-60">{selectedPriceList?.code === "01-EXP" ? "%Exp (vs. IND)" : "%Exp"}</span>
                                                    <span className="font-mono font-bold">{percentExp !== null ? `${percentExp.toFixed(1)}%` : "-"}</span>
                                                  </div>
                                                </div>
                                              </td>
                                            );
                                          })()}
                                        </Fragment>
                                      );
                                    })}
                                    {hasPDS && (() => {
                                      const p = range.columns?.["08-PDS"] ?? null;
                                      return (
                                        <td className={cn("text-right border-b border-[hsl(var(--border-subtle))]", isCompact ? "p-3" : "p-4")}>
                                          <span className="font-mono font-bold text-[hsl(var(--text-secondary))]">{p !== null ? <AnimatedPrice value={p} /> : "-"}</span>
                                        </td>
                                      );
                                    })()}
                                  </tr>
                                );
                              })}
                              {itemIndex < classItems.length - 1 && (
                                <tr className="h-1.5">
                                  <td colSpan={100} className="bg-[hsl(var(--bg-muted))] border-none" />
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                <Inbox className="w-14 h-14" style={{ color: `${accentColor}40` }} />
              </div>
              <div className="text-center max-w-md">
                <p className="text-2xl font-bold text-[hsl(var(--text-secondary))]">{t.noPricesSelected}</p>
                <p className="text-[hsl(var(--text-tertiary))] mt-3">
                  {t.emptyStateP1} <span className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--bg-muted))] rounded-lg"><Plus className="w-4 h-4" /> {t.emptyStateAdd}</span> {t.emptyStateP2} <span className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--bg-muted))] rounded-lg"><Search className="w-4 h-4" /> {t.emptyStateSearch}</span> {t.emptyStateP3}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ===================== FOOTER ===================== */}
        {!loadingPrices && itemsWithPrices.length > 0 && (
          <footer className="flex-shrink-0 bg-[hsl(var(--bg-surface))] border-t border-[hsl(var(--border-default))] px-4 py-3 sm:px-6 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                  {itemsWithPrices.length} {t.articles}
                </div>
                {showDetails && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--info-muted))] text-[hsl(var(--info))] font-semibold text-sm">
                    <Eye className="w-4 h-4" />{t.detailedMode}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-tertiary))]">
                <span className="hidden sm:inline">{t.list}</span>
                <span className="font-bold text-[hsl(var(--text-secondary))]">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* ===================== MODALS ===================== */}
      {showQuickAdd && <QuickAddPanel accentColor={accentColor} onClose={() => setShowQuickAdd(false)} onAddItems={handleAddItems} langSuffix={langQ} t={t} />}
      <EmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSend={handleEmailPDF} sending={isSendingEmail} accentColor={accentColor} t={t} />
    </div>
  );
}

/* =========================
   Page Export with Auth Check
========================= */
export default function CataloguePage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--bg-base))]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const userRole = (session as any)?.user?.role;
  const userEmail = session?.user?.email;

  const isAuthorized = isUserAuthorized(userRole, userEmail);

  if (status === "unauthenticated" || !isAuthorized) {
    return <AccessDenied role={userRole} email={userEmail} />;
  }

  return <CataloguePageContent />;
}
