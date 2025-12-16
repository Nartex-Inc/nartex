"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { startRegistration } from "@simplewebauthn/browser";
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
  ChevronUp,
  Check,
  Plus,
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
  Settings2,
} from "lucide-react";

/* =========================
   Types
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
   Utilities
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

/**
 * Abbreviate column names:
 * - Remove leading "0" from numbers (01-EXP -> 1-EXP)
 * - Replace "04-GROSEXP" with "4-GREXP"
 * - Replace "08-PDS" with "8-PDS"
 */
function abbreviateColumnName(name: string): string {
  let result = name.trim();
  // Special case: 04-GROSEXP -> 4-GREXP
  if (result === "04-GROSEXP") return "4-GREXP";
  // Remove leading zero from number prefix (01-XXX -> 1-XXX)
  result = result.replace(/^0(\d+-)/, "$1");
  return result;
}

/* =========================
   Animated number
========================= */
function AnimatedPrice({ value, duration = 600 }: { value: number; duration?: number }) {
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
      const easeOut = 1 - Math.pow(1 - progress, 3);
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

  return <span>{displayValue.toFixed(2)}</span>;
}

/* =========================
   Toggle - Compact
========================= */
function Toggle({
  enabled,
  onChange,
  label,
  accentColor,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void | Promise<void>;
  label: string;
  accentColor: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none group">
      <span className="text-white/90 text-xs font-semibold hidden sm:inline-block tracking-wide">
        {label}
      </span>
      <div
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-12 h-7 rounded-full transition-all duration-300 shadow-inner",
          enabled ? "bg-white shadow-lg" : "bg-white/20 hover:bg-white/30"
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-5 h-5 rounded-full transition-all duration-300 shadow-md flex items-center justify-center",
            enabled ? "left-6 scale-110" : "left-1 bg-white/90"
          )}
          style={{ backgroundColor: enabled ? accentColor : undefined }}
        >
          {enabled ? <Eye className="w-3 h-3 text-white" /> : <EyeOff className="w-3 h-3 text-neutral-500" />}
        </div>
      </div>
    </label>
  );
}

/* =========================
   Header Icon Button - BIGGER for fat fingers
========================= */
function HeaderIconButton({
  onClick,
  icon: Icon,
  title,
  variant = "default",
  loading = false,
  className = "",
}: {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  variant?: "default" | "primary" | "danger";
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      className={cn(
        "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-sm",
        "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "default" && "bg-white/20 hover:bg-white/30 text-white border border-white/20",
        variant === "primary" && "bg-white text-neutral-900 shadow-lg hover:shadow-xl",
        variant === "danger" && "bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/20",
        className
      )}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" strokeWidth={2} />}
    </button>
  );
}

/* =========================
   Quick add popup
========================= */
function QuickAddSearch({
  onAddItems,
  onClose,
  accentColor,
}: {
  onAddItems: (itemIds: number[]) => void;
  onClose: () => void;
  accentColor: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length > 1) {
        setSearching(true);
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(query)}`);
          if (res.ok) setResults(await res.json());
        } finally {
          setSearching(false);
        }
      } else setResults([]);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAdd = () => {
    onAddItems(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-3 z-[9999] max-w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
            <Search className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div className="flex-1">
            <input
              autoFocus
              className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-neutral-400 dark:text-white"
              placeholder="Rechercher un article..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {searching ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
            <span className="text-sm text-neutral-500">Recherche en cours...</span>
          </div>
        ) : results.length > 0 ? (
          <div className="p-2">
            {results.map((item) => {
              const isSelected = selectedIds.has(item.itemId);
              return (
                <div
                  key={item.itemId}
                  onClick={() => toggleSelect(item.itemId)}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200",
                    "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    isSelected && "bg-neutral-100 dark:bg-neutral-800 ring-2 ring-offset-2 dark:ring-offset-neutral-900"
                  )}
                  style={isSelected ? ({ ["--tw-ring-color" as any]: accentColor } as any) : undefined}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                      isSelected ? "border-transparent" : "border-neutral-300 dark:border-neutral-600"
                    )}
                    style={{ backgroundColor: isSelected ? accentColor : undefined }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">{item.itemCode}</div>
                    <div className="text-sm text-neutral-500 truncate">{item.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Package className="w-6 h-6 text-neutral-400" />
            </div>
            <span className="text-sm text-neutral-500">{query.length > 1 ? "Aucun résultat trouvé" : "Tapez pour rechercher"}</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80">
        <button
          onClick={handleAdd}
          disabled={selectedIds.size === 0}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300",
            "flex items-center justify-center gap-2",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
            "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          )}
          style={{ backgroundColor: accentColor }}
        >
          <Plus className="w-4 h-4" />
          Ajouter {selectedIds.size > 0 && `(${selectedIds.size})`}
        </button>
      </div>
    </div>
  );
}

/* =========================
   MultiSelect
========================= */
function MultiSelectDropdown({
  items,
  selectedIds,
  onChange,
  disabled,
  placeholder = "Articles...",
  accentColor,
}: {
  items: Item[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  disabled?: boolean;
  placeholder?: string;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!isOpen) return;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 12;
      const desiredWidth = Math.max(r.width, 400);
      const maxWidth = Math.max(320, window.innerWidth - margin * 2);
      const width = Math.min(desiredWidth, maxWidth);
      const left = Math.min(r.left, window.innerWidth - width - margin);
      const top = r.bottom + 10;
      setPanelStyle({ top, left: Math.max(margin, left), width });
    };
    update();
    window.addEventListener("resize", update, { passive: true } as any);
    window.addEventListener("scroll", update, { passive: true } as any);
    return () => {
      window.removeEventListener("resize", update as any);
      window.removeEventListener("scroll", update as any);
    };
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

  return (
    <>
      <div className="relative w-full" ref={triggerRef}>
        <div
          onClick={() => !disabled && setIsOpen((v) => !v)}
          className={cn(
            "h-11 px-4 bg-white/15 text-white rounded-xl font-semibold text-sm",
            "border border-white/20 flex items-center justify-between gap-2",
            "cursor-pointer transition-all duration-300 backdrop-blur-sm",
            disabled && "opacity-40 cursor-not-allowed",
            isOpen && "border-white/50 bg-white/25 shadow-lg"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 flex-shrink-0 opacity-70" />
            <span className="truncate">{selectedIds.size > 0 ? `${selectedIds.size} article(s)` : placeholder}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && panelStyle && (
        <Portal>
          <div
            ref={panelRef}
            className="fixed z-[999999] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
          >
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3">
                <Filter className="w-4 h-4 text-neutral-400" />
                <input
                  autoFocus
                  className="flex-1 py-2.5 bg-transparent text-sm outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
                  placeholder="Filtrer les articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <div
                    key={item.itemId}
                    onClick={() => toggleSelection(item.itemId)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                      selectedIds.has(item.itemId) && "bg-neutral-100 dark:bg-neutral-800"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                        selectedIds.has(item.itemId) ? "border-transparent" : "border-neutral-300 dark:border-neutral-600"
                      )}
                      style={{ backgroundColor: selectedIds.has(item.itemId) ? accentColor : undefined }}
                    >
                      {selectedIds.has(item.itemId) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900 dark:text-white truncate text-sm">{item.itemCode}</div>
                      <div className="text-xs text-neutral-500 truncate">{item.description}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Inbox className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <span className="text-sm text-neutral-400">Aucun article trouvé</span>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

/* =========================
   Email modal
========================= */
function EmailModal({
  isOpen,
  onClose,
  onSend,
  sending,
  accentColor,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  sending: boolean;
  accentColor: string;
}) {
  const [email, setEmail] = useState("");
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <Mail className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Envoyer par Courriel</h3>
              <p className="text-sm text-neutral-500">La liste de prix sera jointe en PDF</p>
            </div>
          </div>
          <input
            type="email"
            autoFocus
            className={cn(
              "w-full h-14 px-4 rounded-xl text-base font-medium",
              "bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent",
              "outline-none transition-all duration-300 placeholder:text-neutral-400"
            )}
            style={{ borderColor: email ? accentColor : undefined }}
            placeholder="nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className={cn(
              "flex-1 h-12 rounded-xl font-semibold transition-all duration-300",
              "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
              "hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
            )}
          >
            Annuler
          </button>
          <button
            onClick={() => onSend(email)}
            disabled={!email || sending}
            className={cn(
              "flex-1 h-12 rounded-xl font-bold text-white transition-all duration-300",
              "flex items-center justify-center gap-2",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            )}
            style={{ backgroundColor: accentColor }}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Price modal - REDESIGNED
========================= */
interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];
  priceLists: PriceList[];
  products: Product[];
  itemTypes: ItemType[];
  items: Item[];
  selectedPriceList: PriceList | null;
  selectedProduct: Product | null;
  selectedType: ItemType | null;
  selectedItemIds: Set<number>;
  onPriceListChange: (priceId: number) => void;
  onProductChange: (prodId: string) => void;
  onTypeChange: (typeId: string) => void;
  onItemsChange: (ids: Set<number>) => void;
  onAddItems: (itemIds: number[]) => void;
  onReset: () => void;
  onLoadSelection: () => void;
  loading: boolean;
  error: string | null;
  accentColor: string;
}

function PriceModal({
  isOpen,
  onClose,
  data,
  priceLists,
  products,
  itemTypes,
  items,
  selectedPriceList,
  selectedProduct,
  selectedType,
  selectedItemIds,
  onPriceListChange,
  onProductChange,
  onTypeChange,
  onItemsChange,
  onAddItems,
  onReset,
  onLoadSelection,
  loading,
  error,
  accentColor,
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const isTabletCompact = useMediaQuery("(max-width: 1024px)");

  if (!isOpen) return null;

  const itemsWithPrices = data.filter((item) => item.ranges && item.ranges.length > 0);

  const groupedItems = itemsWithPrices.reduce((acc, item) => {
    const key = item.className || "Articles Ajoutés";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ItemPriceData[]>);

  const calcPricePerCaisse = (price: number, caisse: number | null) => (caisse ? price * caisse : null);
  const calcPricePerLitre = (price: number, volume: number | null) => (volume ? price / volume : null);
  const calcMargin = (sell: number | null, cost: number | null) => {
    if (!sell || !cost || sell === 0) return null;
    return ((sell - cost) / sell) * 100;
  };

  const handleToggleDetails = async (newValue: boolean) => {
    if (!newValue) {
      setShowDetails(false);
      return;
    }
    setIsAuthenticating(true);
    try {
      const resp = await fetch("/api/auth/challenge");
      if (!resp.ok) throw new Error("Challenge fetch failed");
      const options = await resp.json();
      const authResp = await startRegistration(options);
      const verifyResp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResp),
      });
      const verification = await verifyResp.json();
      if (verification.verified) setShowDetails(true);
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

  const handleEmailPDF = async (recipientEmail: string) => {
    setIsSendingEmail(true);
    try {
      const doc = new jsPDF();
      const logoData = await getDataUri("/sinto-logo.svg");
      if (logoData) doc.addImage(logoData, "PNG", 15, 10, 40, 0);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const title = "Liste de Prix SINTO";
      const titleWidth = doc.getTextWidth(title);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(title, (pageWidth - titleWidth) / 2, 25);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Liste: ${abbreviateColumnName(selectedPriceList?.code || "")} - ${selectedPriceList?.name}`, 15, 45);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 50);

      let finalY = 55;

      for (const [className, classItems] of Object.entries(groupedItems)) {
        if (finalY > 270) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFillColor(220, 220, 220);
        doc.rect(14, finalY, 182, 8, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(className.toUpperCase(), 16, finalY + 6);
        finalY += 10;

        const firstItem = classItems[0];
        let priceColumns = firstItem.ranges[0]?.columns
          ? Object.keys(firstItem.ranges[0].columns).sort()
          : [selectedPriceList?.code || "Prix"];
        if (!showDetails && selectedPriceList?.code !== "01-EXP") {
          priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
        }
        const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
        const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS");

        const tableBody: any[] = [];
        const spacerRowIndices: number[] = [];
        let rowIndex = 0;

        classItems.forEach((item, index) => {
          item.ranges.forEach((range, idx) => {
            const row: string[] = [];
            if (idx === 0) {
              row.push(item.itemCode);
              row.push(item.caisse ? Math.round(item.caisse).toString() : "-");
              row.push(item.format || "-");
            } else {
              row.push("");
              row.push("");
              row.push("");
            }
            row.push(range.qtyMin.toString());
            // REMOVED: % Marge column
            standardColumns.forEach((col) => {
              const val = range.columns?.[col] ?? null;
              row.push(val ? val.toFixed(2) : "-");
              if (showDetails && col.trim() === selectedPriceList?.code?.trim()) {
                const ppc = calcPricePerCaisse(val || 0, item.caisse);
                const ppl = calcPricePerLitre(val || 0, item.volume);
                const expVal = range.columns?.["01-EXP"] ?? null;
                const pExp = calcMargin(val, expVal);
                row.push(ppc ? ppc.toFixed(2) : "-");
                row.push(ppl ? ppl.toFixed(2) : "-");
                row.push(pExp ? `${pExp.toFixed(1)}%` : "-");
              }
            });
            if (hasPDS) {
              const p = range.columns?.["08-PDS"] ?? null;
              row.push(p ? p.toFixed(2) : "-");
            }
            tableBody.push(row);
            rowIndex++;
          });
          if (index < classItems.length - 1) {
            // UPDATED column count: removed % Marge
            const columnsCount = 4 + standardColumns.length + (hasPDS ? 1 : 0) + (showDetails ? 3 : 0);
            tableBody.push(new Array(columnsCount).fill(""));
            spacerRowIndices.push(rowIndex);
            rowIndex++;
          }
        });

        // UPDATED: Removed % Marge, abbreviated column names
        const headRow = ["Article", "Cs", "Fmt", "Qty"];
        standardColumns.forEach((c) => {
          headRow.push(abbreviateColumnName(c));
          if (showDetails && c.trim() === selectedPriceList?.code?.trim()) {
            headRow.push("$/Cs");
            headRow.push("$/L");
            headRow.push("%Exp");
          }
        });
        if (hasPDS) headRow.push(abbreviateColumnName("08-PDS"));

        autoTable(doc, {
          startY: finalY,
          head: [headRow],
          body: tableBody,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [120, 0, 0], textColor: 255 },
          columnStyles: { 0: { fontStyle: "bold" } },
          theme: "grid",
          didParseCell: function (d) {
            if (d.section === "body" && spacerRowIndices.includes(d.row.index)) {
              d.cell.styles.fillColor = [0, 0, 0];
              d.cell.styles.textColor = [0, 0, 0];
              d.cell.styles.minCellHeight = 4;
            }
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("file", pdfBlob, "ListePrix.pdf");
      formData.append("to", recipientEmail);
      formData.append("subject", `Liste de prix SINTO : ${selectedPriceList?.name}`);
      formData.append("message", "Liste de Prix SINTO\n\nBonjour,\n\nVeuillez trouver ci-joint la liste de prix que vous avez demandée.");
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

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-2">
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-[98vw] max-h-[94vh] bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* HEADER - REDESIGNED with bigger, well-spaced buttons */}
        <div className="flex-shrink-0 relative" style={{ backgroundColor: accentColor }}>
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          </div>

          <div className="relative px-4 py-4">
            {/* Single row: Title on left, ALL buttons on right - BIGGER and SPACED */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white tracking-tight truncate">Liste de Prix</h2>
                  <p className="text-white/70 text-xs truncate">{itemsWithPrices.length} article(s) • {abbreviateColumnName(selectedPriceList?.code || "")}</p>
                </div>
              </div>

              {/* ALL buttons in one row - BIGGER (h-11 w-11) with gap-3 spacing */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {isAuthenticating && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-xl">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span className="text-white text-xs font-bold hidden sm:inline">FaceID...</span>
                  </div>
                )}
                
                <Toggle enabled={showDetails} onChange={handleToggleDetails} label="Détails" accentColor={accentColor} />
                
                <HeaderIconButton onClick={() => setShowEmailModal(true)} icon={Mail} title="Envoyer par courriel" />
                <HeaderIconButton onClick={onReset} icon={RotateCcw} title="Réinitialiser" />
                <HeaderIconButton 
                  onClick={() => setFiltersExpanded(!filtersExpanded)} 
                  icon={filtersExpanded ? ChevronUp : Settings2} 
                  title="Options de filtrage"
                  className={filtersExpanded ? "bg-white/40" : ""}
                />
                <HeaderIconButton onClick={onLoadSelection} icon={Plus} title="Ajouter la sélection" />
                <HeaderIconButton onClick={() => setShowQuickAdd(!showQuickAdd)} icon={Search} title="Recherche rapide" />
                <HeaderIconButton onClick={onClose} icon={X} title="Fermer" />
              </div>
            </div>

            {/* EXPLODABLE filters section - hidden by default */}
            {filtersExpanded && (
              <div className="relative mt-4 p-3 bg-black/15 backdrop-blur-sm rounded-xl border border-white/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Row 1: Price list */}
                <div className="relative w-full">
                  <select
                    value={selectedPriceList?.priceId || ""}
                    onChange={(e) => onPriceListChange(parseInt(e.target.value))}
                    disabled={loading}
                    className="w-full h-11 px-4 pr-10 rounded-xl font-bold text-sm appearance-none cursor-pointer bg-white text-neutral-900 border-2 border-white focus:outline-none disabled:opacity-50 transition-all"
                  >
                    {priceLists.map((pl) => (
                      <option key={pl.priceId} value={pl.priceId}>{abbreviateColumnName(pl.code)} - {pl.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
                </div>

                {/* Row 2: Category + Class */}
                <div className="flex gap-3">
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={selectedProduct?.prodId || ""}
                      onChange={(e) => onProductChange(e.target.value)}
                      className="w-full h-11 px-4 pr-10 rounded-xl font-semibold text-sm appearance-none cursor-pointer bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white/50 transition-all"
                    >
                      <option value="" className="text-neutral-900">Catégorie...</option>
                      {products.map((p) => (
                        <option key={p.prodId} value={p.prodId} className="text-neutral-900">{p.name}</option>
                      ))}
                    </select>
                    <Layers className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={selectedType?.itemTypeId || ""}
                      onChange={(e) => onTypeChange(e.target.value)}
                      disabled={!selectedProduct}
                      className="w-full h-11 px-4 pr-10 rounded-xl font-semibold text-sm appearance-none cursor-pointer bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white/50 disabled:opacity-40 transition-all"
                    >
                      <option value="" className="text-neutral-900">Classe...</option>
                      {itemTypes.map((t) => (
                        <option key={t.itemTypeId} value={t.itemTypeId} className="text-neutral-900">{t.description}</option>
                      ))}
                    </select>
                    <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                </div>

                {/* Row 3: Articles multiselect */}
                <div className="w-full">
                  <MultiSelectDropdown
                    items={items}
                    selectedIds={selectedItemIds}
                    onChange={onItemsChange}
                    disabled={!selectedType && !selectedProduct}
                    accentColor={accentColor}
                  />
                </div>
              </div>
            )}

            {showQuickAdd && (
              <QuickAddSearch accentColor={accentColor} onClose={() => setShowQuickAdd(false)} onAddItems={onAddItems} />
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950">
          {loading && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 gap-5">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor}30`, borderTopColor: "transparent" }} />
                <div className="absolute inset-2 w-12 h-12 border-4 border-b-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderBottomColor: "transparent", animationDirection: "reverse" }} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-neutral-700 dark:text-neutral-300">Chargement des prix</p>
                <p className="text-sm text-neutral-500 mt-1">Veuillez patienter...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-80 gap-5">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                <AlertCircle className="w-10 h-10" style={{ color: accentColor }} />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: accentColor }}>Erreur</p>
                <p className="text-neutral-500 mt-2 max-w-md">{error}</p>
                <button onClick={onReset} className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold border-2 transition-colors" style={{ borderColor: accentColor, color: accentColor }}>
                  <RefreshCw className="w-4 h-4 inline mr-2" />Réessayer
                </button>
              </div>
            </div>
          ) : Object.keys(groupedItems).length > 0 ? (
            <div className="p-4 space-y-8">
              {Object.entries(groupedItems).map(([className, classItems]) => {
                const firstItem = classItems[0];
                let priceColumns = firstItem.ranges[0]?.columns ? Object.keys(firstItem.ranges[0].columns).sort() : [selectedPriceList?.code || "Prix"];
                if (!showDetails && selectedPriceList?.code !== "01-EXP") priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
                const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
                const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS");
                // UPDATED: Include detail columns in count when showDetails is true
                const totalCols = 4 + standardColumns.length + (hasPDS ? 1 : 0) + (showDetails && !isTabletCompact ? 3 : 0) + (showDetails && isTabletCompact ? 1 : 0);

                return (
                  <div key={className} className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-xl border border-neutral-200/50 dark:border-neutral-800">
                    <div className="relative px-4 py-4" style={{ backgroundColor: accentColor }}>
                      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-2xl" />
                      </div>
                      <div className="relative flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-wider">{className}</h3>
                          <p className="text-white/70 text-xs mt-1 font-medium">{classItems.length} article(s)</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Sparkles className="w-3 h-3 text-white" />
                          <span className="text-white text-xs font-bold">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className={cn("w-full table-fixed border-collapse", isTabletCompact ? "text-[11px]" : "text-base")}>
                        <colgroup>
                          {(() => {
                            const articlePct = isTabletCompact ? 28 : 24;
                            const restPct = 100 - articlePct;
                            const eachPct = restPct / (totalCols - 1);
                            return (
                              <>
                                <col style={{ width: `${articlePct}%` }} />
                                {Array.from({ length: totalCols - 1 }).map((_, i) => (
                                  <col key={i} style={{ width: `${eachPct}%` }} />
                                ))}
                              </>
                            );
                          })()}
                        </colgroup>
                        <thead>
                          <tr className="bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
                            <th className={cn("text-left font-black text-neutral-700 dark:text-neutral-200 border-b-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800", isTabletCompact ? "p-2" : "p-4")}>
                              <div className="flex items-center gap-2"><Package className={cn(isTabletCompact ? "w-4 h-4" : "w-5 h-5", "opacity-50")} />Article</div>
                            </th>
                            <th className={cn("text-center font-black text-neutral-700 dark:text-neutral-200 border-b-2 border-neutral-300 dark:border-neutral-700", isTabletCompact ? "p-2" : "p-4")}>Cs</th>
                            <th className={cn("text-center font-black text-neutral-700 dark:text-neutral-200 border-b-2 border-neutral-300 dark:border-neutral-700", isTabletCompact ? "p-2" : "p-4")}>Fmt</th>
                            <th className={cn("text-center font-black text-neutral-700 dark:text-neutral-200 border-b-2 border-neutral-300 dark:border-neutral-700", isTabletCompact ? "p-2" : "p-4")}>Qty</th>
                            {/* REMOVED: % Marge column */}
                            {standardColumns.map((colCode) => {
                              const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                              const displayName = abbreviateColumnName(colCode);
                              return (
                                <Fragment key={colCode}>
                                  <th className={cn("text-right font-black border-b-2 border-neutral-300 dark:border-neutral-700 whitespace-nowrap", isTabletCompact ? "p-2" : "p-4", isSelectedList ? "text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10" : "text-neutral-700 dark:text-neutral-200")}>{displayName}</th>
                                  {/* DETAIL COLUMNS - Appear RIGHT AFTER the selected price list column */}
                                  {showDetails && isSelectedList && !isTabletCompact && (
                                    <>
                                      <th className="text-right p-4 font-black text-sky-700 dark:text-sky-400 border-b-2 border-neutral-300 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-900/10 whitespace-nowrap">$/Cs</th>
                                      <th className="text-right p-4 font-black text-sky-700 dark:text-sky-400 border-b-2 border-neutral-300 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-900/10 whitespace-nowrap">$/L</th>
                                      <th className="text-right p-4 font-black text-violet-700 dark:text-violet-400 border-b-2 border-neutral-300 dark:border-neutral-700 bg-violet-50/50 dark:bg-violet-900/10 whitespace-nowrap">%Exp</th>
                                    </>
                                  )}
                                  {showDetails && isSelectedList && isTabletCompact && (
                                    <th className="text-right p-2 font-black text-sky-700 dark:text-sky-400 border-b-2 border-neutral-300 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-900/10 whitespace-nowrap">Détails</th>
                                  )}
                                </Fragment>
                              );
                            })}
                            {hasPDS && <th className={cn("text-right font-black text-neutral-700 dark:text-neutral-200 border-b-2 border-neutral-300 dark:border-neutral-700 whitespace-nowrap", isTabletCompact ? "p-2" : "p-4")}>{abbreviateColumnName("08-PDS")}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {classItems.map((item, itemIndex) => (
                            <Fragment key={item.itemId}>
                              {item.ranges.map((range, rIdx) => {
                                const isFirstRowOfItem = rIdx === 0;
                                const rowBg = itemIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/70 dark:bg-neutral-800/40";

                                return (
                                  <tr key={range.id} className={cn("transition-all duration-200 group", rowBg, "hover:bg-amber-50/50 dark:hover:bg-amber-900/10")}>
                                    <td className={cn("border-b border-neutral-100 dark:border-neutral-800 align-top", isTabletCompact ? "p-2" : "p-4", rowBg, "group-hover:bg-amber-50/50 dark:group-hover:bg-amber-900/10")}>
                                      {isFirstRowOfItem && (
                                        <div className="flex flex-col gap-1">
                                          <span className={cn("font-mono font-black tracking-tight", isTabletCompact ? "text-[13px]" : "text-lg")} style={{ color: accentColor }}>{item.itemCode}</span>
                                          <span className={cn("text-neutral-500 truncate", isTabletCompact ? "text-[10px]" : "text-sm")} title={item.description}>{item.description}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className={cn("text-center border-b border-neutral-100 dark:border-neutral-800 align-top", isTabletCompact ? "p-2" : "p-4")}>{isFirstRowOfItem && <span className={cn("font-black text-neutral-900 dark:text-white", isTabletCompact ? "text-[12px]" : "text-lg")}>{item.caisse ? Math.round(item.caisse) : "-"}</span>}</td>
                                    <td className={cn("text-center border-b border-neutral-100 dark:border-neutral-800 align-top", isTabletCompact ? "p-2" : "p-4")}>{isFirstRowOfItem && <span className={cn("font-bold text-neutral-800 dark:text-neutral-200 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg inline-block", isTabletCompact ? "text-[11px]" : "text-base")}>{item.format || "-"}</span>}</td>
                                    <td className={cn("text-center border-b border-neutral-100 dark:border-neutral-800", isTabletCompact ? "p-2" : "p-4")}><span className={cn("font-mono font-bold text-neutral-900 dark:text-white", isTabletCompact ? "text-[12px]" : "text-lg")}>{range.qtyMin}</span></td>
                                    {/* REMOVED: % Marge cell */}
                                    {standardColumns.map((colCode) => {
                                      const priceVal = range.columns ? range.columns[colCode] : colCode === selectedPriceList?.code ? range.unitPrice : null;
                                      const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                                      return (
                                        <Fragment key={colCode}>
                                          <td className={cn("text-right border-b border-neutral-100 dark:border-neutral-800", isTabletCompact ? "p-2" : "p-4", isSelectedList && "bg-amber-50/30 dark:bg-amber-900/5")}>
                                            <span className={cn("font-mono font-black whitespace-nowrap tabular-nums", isTabletCompact ? "text-[12px]" : "text-lg", isSelectedList ? "text-amber-700 dark:text-amber-400" : "text-neutral-700 dark:text-neutral-300")}>{priceVal !== null && priceVal !== undefined ? <AnimatedPrice value={priceVal} /> : "-"}</span>
                                          </td>
                                          {/* DETAIL COLUMNS - Appear RIGHT AFTER the selected price list column */}
                                          {showDetails && isSelectedList && !isTabletCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppc = calcPricePerCaisse(selectedPriceVal, item.caisse);
                                            const ppl = calcPricePerLitre(selectedPriceVal, item.volume);
                                            const expBaseVal = range.columns?.["01-EXP"] ?? null;
                                            const percentExp = calcMargin(selectedPriceVal, expBaseVal);
                                            return (
                                              <>
                                                <td className="p-4 text-right border-b border-neutral-100 dark:border-neutral-800 bg-sky-50/30 dark:bg-sky-900/5"><span className="font-mono text-base text-sky-700 dark:text-sky-400 tabular-nums">{ppc ? ppc.toFixed(2) : "-"}</span></td>
                                                <td className="p-4 text-right border-b border-neutral-100 dark:border-neutral-800 bg-sky-50/30 dark:bg-sky-900/5"><span className="font-mono text-base text-sky-700 dark:text-sky-400 tabular-nums">{ppl ? ppl.toFixed(2) : "-"}</span></td>
                                                <td className="p-4 text-right border-b border-neutral-100 dark:border-neutral-800 bg-violet-50/30 dark:bg-violet-900/5"><span className={cn("font-mono font-bold text-base tabular-nums", percentExp && percentExp < 0 ? "text-red-600 dark:text-red-400" : "text-violet-700 dark:text-violet-400")}>{percentExp !== null ? `${percentExp.toFixed(1)}%` : "-"}</span></td>
                                              </>
                                            );
                                          })()}
                                          {showDetails && isSelectedList && isTabletCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppc = calcPricePerCaisse(selectedPriceVal, item.caisse);
                                            const ppl = calcPricePerLitre(selectedPriceVal, item.volume);
                                            const expBaseVal = range.columns?.["01-EXP"] ?? null;
                                            const percentExp = calcMargin(selectedPriceVal, expBaseVal);
                                            return (
                                              <td className="p-2 text-right border-b border-neutral-100 dark:border-neutral-800 bg-sky-50/30 dark:bg-sky-900/5">
                                                <div className="space-y-0.5 text-[10px] leading-tight">
                                                  <div className="flex justify-end gap-2 text-sky-700 dark:text-sky-400"><span className="opacity-70">$/Cs</span><span className="font-mono tabular-nums">{ppc ? ppc.toFixed(2) : "-"}</span></div>
                                                  <div className="flex justify-end gap-2 text-sky-700 dark:text-sky-400"><span className="opacity-70">$/L</span><span className="font-mono tabular-nums">{ppl ? ppl.toFixed(2) : "-"}</span></div>
                                                  <div className="flex justify-end gap-2 text-violet-700 dark:text-violet-400"><span className="opacity-70">%Exp</span><span className="font-mono tabular-nums">{percentExp !== null ? `${percentExp.toFixed(1)}%` : "-"}</span></div>
                                                </div>
                                              </td>
                                            );
                                          })()}
                                        </Fragment>
                                      );
                                    })}
                                    {hasPDS && (() => {
                                      const p = range.columns?.["08-PDS"] ?? null;
                                      return <td className={cn("text-right border-b border-neutral-100 dark:border-neutral-800", isTabletCompact ? "p-2" : "p-4")}><span className={cn("font-mono font-black text-neutral-700 dark:text-neutral-300 tabular-nums", isTabletCompact ? "text-[12px]" : "text-lg")}>{p !== null ? <AnimatedPrice value={p} /> : "-"}</span></td>;
                                    })()}
                                  </tr>
                                );
                              })}
                              {itemIndex < classItems.length - 1 && <tr className="h-3 bg-neutral-900 dark:bg-black"><td colSpan={100} className="border-none" /></tr>}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 gap-5">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                <Inbox className="w-12 h-12" style={{ color: `${accentColor}50` }} />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-700 dark:text-neutral-300">Aucun prix trouvé</p>
                <p className="text-neutral-500 mt-2 max-w-sm">Cliquez sur le bouton + pour ajouter des articles ou sur la loupe pour rechercher.</p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {!loading && itemsWithPrices.length > 0 && (
          <div className="flex-shrink-0 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg font-bold text-xs" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>{itemsWithPrices.length} article(s)</div>
                {showDetails && <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold text-xs"><Eye className="w-3 h-3" />Détails</div>}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
                <span>Liste:</span>
                <span className="font-bold text-neutral-700 dark:text-neutral-300">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <EmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSend={handleEmailPDF} sending={isSendingEmail} accentColor={accentColor} />
    </div>
  );
}

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* =========================
   Main page - COMPACT for iPad Mini (no scroll needed)
========================= */
export default function CataloguePage() {
  const { color: accentColor } = useCurrentAccent();

  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prodRes, plRes] = await Promise.all([fetch("/api/catalogue/products"), fetch("/api/catalogue/pricelists")]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (plRes.ok) {
          const pls: PriceList[] = await plRes.json();
          setPriceLists(pls);
          const defaultList = pls.find((p) => p.code.startsWith("03")) || pls[0];
          if (defaultList) setSelectedPriceList(defaultList);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(searchQuery)}`);
          if (res.ok) setSearchResults(await res.json());
        } finally {
          setIsSearching(false);
        }
      } else setSearchResults([]);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleAddItems = async (itemIds: number[]) => {
    if (!selectedPriceList || itemIds.length === 0) return;
    setLoadingPrices(true);
    try {
      const idsString = itemIds.join(",");
      const url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&itemIds=${idsString}`;
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

  const handleLoadSelection = async () => {
    if (!selectedPriceList) return;
    if (selectedItemIds.size > 0) {
      await handleAddItems(Array.from(selectedItemIds));
      return;
    }
    setLoadingPrices(true);
    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}`;
      if (selectedProduct) url += `&prodId=${selectedProduct.prodId}`;
      if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch");
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

  const handlePriceListChange = (priceId: string) => {
    const pl = priceLists.find((p) => p.priceId === parseInt(priceId));
    if (pl) setSelectedPriceList(pl);
  };

  const handleProductChange = async (prodId: string) => {
    const prod = products.find((p) => p.prodId === parseInt(prodId));
    if (!prod) return;
    setSelectedProduct(prod);
    setSelectedType(null);
    setSelectedItem(null);
    setSelectedItemIds(new Set());
    setItems([]);
    setItemTypes([]);
    setLoadingTypes(true);
    try {
      const res = await fetch(`/api/catalogue/itemtypes?prodId=${prod.prodId}`);
      if (res.ok) setItemTypes(await res.json());
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleTypeChange = async (typeId: string) => {
    if (!typeId) {
      setSelectedType(null);
      setSelectedItem(null);
      setSelectedItemIds(new Set());
      setItems([]);
      return;
    }
    const type = itemTypes.find((t) => t.itemTypeId === parseInt(typeId));
    if (!type) return;
    setSelectedType(type);
    setSelectedItem(null);
    setSelectedItemIds(new Set());
    setItems([]);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoadingItems(false);
    }
  };

  const handleItemChange = (itemId: string) => {
    if (!itemId) {
      setSelectedItem(null);
      return;
    }
    const item = items.find((i) => i.itemId === parseInt(itemId));
    if (item) setSelectedItem(item);
  };

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedItem(item);
    const prod = products.find((p) => p.prodId === item.prodId);
    if (!prod) return;
    setSelectedProduct(prod);
    setLoadingTypes(true);
    try {
      const typesRes = await fetch(`/api/catalogue/itemtypes?prodId=${item.prodId}`);
      if (typesRes.ok) {
        const types = await typesRes.json();
        setItemTypes(types);
        const type = types.find((t: any) => t.itemTypeId === item.itemTypeId);
        if (type) {
          setSelectedType(type);
          setLoadingItems(true);
          try {
            const itemsRes = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
            if (itemsRes.ok) setItems(await itemsRes.json());
          } finally {
            setLoadingItems(false);
          }
        }
      }
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPriceList || !selectedProduct) return;
    setPriceData([]);
    setPriceError(null);
    setShowPriceModal(true);
    setLoadingPrices(true);
    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&prodId=${selectedProduct.prodId}`;
      if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;
      if (selectedItem) url += `&itemId=${selectedItem.itemId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch");
      setPriceData(await res.json());
    } catch (err: any) {
      setPriceError(err.message);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleModalPriceListChange = async (priceId: number) => {
    const pl = priceLists.find((p) => p.priceId === priceId);
    if (!pl) return;
    setSelectedPriceList(pl);
    if (priceData.length > 0) {
      setLoadingPrices(true);
      const allIds = Array.from(new Set(priceData.map((i) => i.itemId))).join(",");
      try {
        const url = `/api/catalogue/prices?priceId=${priceId}&itemIds=${allIds}`;
        const res = await fetch(url);
        if (res.ok) setPriceData(await res.json());
      } finally {
        setLoadingPrices(false);
      }
    }
  };

  const canGenerate = Boolean(selectedPriceList && selectedProduct);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="h-full flex flex-col">
        {/* COMPACT layout for iPad Mini - everything fits without scroll */}
        <main className="flex-1 p-3 flex flex-col">
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col flex-1">
              
              {/* HEADER with logo + GÉNÉRER button */}
              <div className="flex-shrink-0 relative p-4 overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 100%)` }}>
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ backgroundColor: accentColor }} />
                </div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-xl blur-xl opacity-30" style={{ backgroundColor: accentColor }} />
                      <Image src="/sinto-logo.svg" alt="SINTO Logo" width={56} height={56} className="relative h-14 w-14 object-contain" />
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">Catalogue SINTO</h1>
                      <p className="text-neutral-500 text-xs font-medium">Générateur de liste de prix</p>
                    </div>
                  </div>
                  
                  {/* GÉNÉRER button in header */}
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={cn(
                      "h-12 px-6 rounded-xl font-black text-sm uppercase tracking-wider",
                      "flex items-center justify-center gap-2 transition-all duration-300",
                      "disabled:bg-neutral-200 disabled:dark:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none",
                      canGenerate && "hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                    )}
                    style={canGenerate ? { backgroundColor: accentColor, color: "#ffffff", boxShadow: `0 10px 30px -5px ${accentColor}50` } : {}}
                  >
                    <Sparkles className="w-4 h-4" />
                    GÉNÉRER
                  </button>
                </div>
              </div>

              {/* FORM - Compact layout */}
              <div className="flex-1 p-4 pt-2 flex flex-col">
                {/* Search bar */}
                <div className="mb-3 relative">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                      <Search className="w-4 h-4 text-neutral-400 group-focus-within:text-neutral-600 transition-colors" />
                    </div>
                    <input
                      type="search"
                      placeholder="Recherche rapide par code article..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn("w-full h-11 pl-11 pr-4 rounded-xl text-sm font-semibold", "bg-neutral-100 dark:bg-neutral-800", "border-2 border-transparent", "focus:ring-0 focus:outline-none transition-all", "placeholder:text-neutral-400")}
                      style={{ borderColor: searchQuery ? accentColor : "transparent" }}
                    />
                  </div>

                  {searchQuery.length > 1 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-60 overflow-y-auto z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                      {isSearching ? (
                        <div className="p-6 flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
                          <span className="text-xs text-neutral-500">Recherche...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="p-1">
                          {searchResults.slice(0, 5).map((item) => (
                            <button key={item.itemId} onClick={() => handleSearchResultClick(item)} className="w-full p-3 text-left rounded-lg transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}15` }}>
                                  <Package className="w-4 h-4" style={{ color: accentColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs" style={{ color: accentColor }}>{item.itemCode}</span>
                                    <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">{item.description}</span>
                                  </div>
                                  <div className="text-[10px] text-neutral-400 mt-0.5">{item.categoryName} → {item.className}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 flex flex-col items-center gap-2">
                          <Inbox className="w-8 h-8 text-neutral-300" />
                          <span className="text-xs text-neutral-500">Aucun résultat</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dropdowns in 2x2 grid */}
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {/* 1. Liste de Prix */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[9px]">1</span>
                      Liste de Prix
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPriceList?.priceId || ""}
                        onChange={(e) => handlePriceListChange(e.target.value)}
                        className={cn("w-full h-12 px-3 pr-10 text-sm font-bold appearance-none cursor-pointer", "bg-neutral-50 dark:bg-neutral-800", "border-2 border-neutral-200 dark:border-neutral-700 rounded-xl", "focus:ring-0 focus:outline-none transition-all")}
                        style={{ borderColor: selectedPriceList ? accentColor : undefined }}
                      >
                        <option value="" disabled>Sélectionner...</option>
                        {priceLists.map((pl) => <option key={pl.priceId} value={pl.priceId}>{abbreviateColumnName(pl.code)} - {pl.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* 2. Catégorie */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[9px]">2</span>
                      Catégorie
                    </label>
                    <div className="relative">
                      <select
                        value={selectedProduct?.prodId || ""}
                        onChange={(e) => handleProductChange(e.target.value)}
                        disabled={!selectedPriceList}
                        className={cn("w-full h-12 px-3 pr-10 text-sm font-bold appearance-none cursor-pointer", "bg-neutral-50 dark:bg-neutral-800", "border-2 border-neutral-200 dark:border-neutral-700 rounded-xl", "focus:ring-0 focus:outline-none transition-all", "disabled:opacity-40 disabled:cursor-not-allowed")}
                      >
                        <option value="" disabled>Sélectionner...</option>
                        {products.map((p) => <option key={p.prodId} value={p.prodId}>{p.name} ({p.itemCount})</option>)}
                      </select>
                      <Layers className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. Classe */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[9px]">3</span>
                      Classe <span className="text-neutral-400 font-normal normal-case">(Opt.)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedType?.itemTypeId || ""}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        disabled={!selectedProduct || loadingTypes}
                        className={cn("w-full h-12 px-3 pr-10 text-sm font-bold appearance-none cursor-pointer", "bg-neutral-50 dark:bg-neutral-800", "border-2 border-neutral-200 dark:border-neutral-700 rounded-xl", "focus:ring-0 focus:outline-none transition-all", "disabled:opacity-40 disabled:cursor-not-allowed")}
                      >
                        <option value="">{loadingTypes ? "Chargement..." : "Toutes les classes"}</option>
                        {itemTypes.map((t) => <option key={t.itemTypeId} value={t.itemTypeId}>{t.description} ({t.itemCount})</option>)}
                      </select>
                      {loadingTypes ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin pointer-events-none" /> : <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />}
                    </div>
                  </div>

                  {/* 4. Article */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 mb-1.5 uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[9px]">4</span>
                      Article <span className="text-neutral-400 font-normal normal-case">(Opt.)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedItem?.itemId || ""}
                        onChange={(e) => handleItemChange(e.target.value)}
                        disabled={!selectedType || loadingItems}
                        className={cn("w-full h-12 px-3 pr-10 text-sm font-bold appearance-none cursor-pointer", "bg-neutral-50 dark:bg-neutral-800", "border-2 border-neutral-200 dark:border-neutral-700 rounded-xl", "focus:ring-0 focus:outline-none transition-all", "disabled:opacity-40 disabled:cursor-not-allowed")}
                      >
                        <option value="">{loadingItems ? "Chargement..." : "Tous les articles"}</option>
                        {items.map((i) => <option key={i.itemId} value={i.itemId}>{i.itemCode} - {i.description}</option>)}
                      </select>
                      {loadingItems ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin pointer-events-none" /> : <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />}
                    </div>
                  </div>
                </div>

                {/* Selected item indicator */}
                {selectedItem && (
                  <div className="mt-3 p-3 rounded-xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}30` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                        <Check className="w-5 h-5" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <div className="font-black text-base" style={{ color: accentColor }}>{selectedItem.itemCode}</div>
                        <div className="text-xs opacity-70" style={{ color: accentColor }}>{selectedItem.description}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <PriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        data={priceData}
        priceLists={priceLists}
        products={products}
        itemTypes={itemTypes}
        items={items}
        selectedPriceList={selectedPriceList}
        selectedProduct={selectedProduct}
        selectedType={selectedType}
        selectedItemIds={selectedItemIds}
        onPriceListChange={handleModalPriceListChange}
        onProductChange={handleProductChange}
        onTypeChange={handleTypeChange}
        onItemsChange={setSelectedItemIds}
        onAddItems={handleAddItems}
        onReset={() => setPriceData([])}
        onLoadSelection={handleLoadSelection}
        loading={loadingPrices}
        error={priceError}
        accentColor={accentColor}
      />
    </div>
  );
}
