"use client";

import { useState, useEffect, useRef, Fragment } from "react";
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
  ChevronRight,
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
  ChevronUp,
} from "lucide-react";

/* =========================
   Types (UNCHANGED)
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
   Utilities (UNCHANGED LOGIC)
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

/* =========================
   Animated Price Component
========================= */
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
   Premium Toggle Switch
========================= */
function PremiumToggle({
  enabled,
  onChange,
  label,
  icon: Icon,
  accentColor,
  loading = false,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void | Promise<void>;
  label: string;
  icon?: React.ElementType;
  accentColor: string;
  loading?: boolean;
}) {
  return (
    <button
      onClick={() => !loading && onChange(!enabled)}
      disabled={loading}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300",
        "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
        enabled
          ? "bg-white/95 dark:bg-white/10 shadow-lg shadow-black/5 dark:shadow-black/20"
          : "bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10"
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white/70" />
      ) : Icon ? (
        <Icon
          className={cn(
            "w-4 h-4 transition-colors duration-300",
            enabled ? "text-neutral-900 dark:text-white" : "text-white/70"
          )}
        />
      ) : null}
      <span
        className={cn(
          "text-sm font-semibold transition-colors duration-300",
          enabled ? "text-neutral-900 dark:text-white" : "text-white/80"
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "relative w-10 h-6 rounded-full transition-all duration-300",
          enabled ? "bg-neutral-900 dark:bg-white" : "bg-white/30 dark:bg-white/20"
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm",
            enabled
              ? "left-5 bg-white dark:bg-neutral-900"
              : "left-1 bg-white/90 dark:bg-white/60"
          )}
        />
      </div>
    </button>
  );
}

/* =========================
   Action Button
========================= */
function ActionButton({
  onClick,
  icon: Icon,
  label,
  variant = "ghost",
  loading = false,
  disabled = false,
  className = "",
}: {
  onClick: () => void;
  icon: React.ElementType;
  label?: string;
  variant?: "ghost" | "solid" | "outline";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      title={label}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300",
        "active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed",
        label ? "h-12 px-5" : "h-12 w-12",
        variant === "ghost" && "bg-white/10 hover:bg-white/20 text-white border border-white/10",
        variant === "solid" && "bg-white text-neutral-900 shadow-lg hover:shadow-xl",
        variant === "outline" && "bg-transparent border-2 border-white/30 text-white hover:bg-white/10",
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      )}
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}

/* =========================
   Quick Add Search Panel
========================= */
function QuickAddPanel({
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
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
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Recherche rapide
              </h3>
              <p className="text-sm text-neutral-500">Ajoutez des articles à votre liste</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="search"
              className={cn(
                "w-full h-14 pl-5 pr-12 rounded-2xl text-base font-medium",
                "bg-neutral-100 dark:bg-neutral-800",
                "border-2 border-transparent focus:border-current",
                "outline-none transition-all duration-300",
                "placeholder:text-neutral-400"
              )}
              style={{ borderColor: query ? accentColor : "transparent" }}
              placeholder="Code article ou description..."
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
          {results.length > 0 ? (
            <div className="space-y-2 pb-4">
              {results.map((item) => {
                const isSelected = selectedIds.has(item.itemId);
                return (
                  <button
                    key={item.itemId}
                    onClick={() => toggleSelect(item.itemId)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                      "text-left active:scale-[0.99]",
                      isSelected
                        ? "bg-neutral-100 dark:bg-neutral-800 ring-2"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    )}
                    style={isSelected ? { ["--tw-ring-color" as string]: accentColor } : undefined}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      )}
                      style={{
                        backgroundColor: isSelected ? accentColor : "transparent",
                        borderColor: isSelected ? accentColor : "currentColor",
                      }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-sm" style={{ color: accentColor }}>
                        {item.itemCode}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.length > 1 && !searching ? (
            <div className="py-12 text-center">
              <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500">Aucun résultat trouvé</p>
            </div>
          ) : null}
        </div>

        <div className="p-4 sm:p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80">
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
            Ajouter {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Item Multi-Select
========================= */
function ItemMultiSelect({
  items,
  selectedIds,
  onChange,
  disabled,
  accentColor,
}: {
  items: Item[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  disabled?: boolean;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-14 px-4 rounded-2xl font-semibold text-left transition-all duration-300",
          "flex items-center gap-3",
          "bg-white/15 text-white border border-white/20",
          "active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed",
          isOpen && "bg-white/25 border-white/40"
        )}
      >
        <Tag className="w-5 h-5 opacity-60 flex-shrink-0" />
        <span className="flex-1 truncate">
          {selectedIds.size > 0 ? `${selectedIds.size} article(s)` : "Sélectionner articles..."}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 opacity-60 transition-transform duration-300 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <Portal>
          <div
            className="fixed z-[999999] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: ref.current ? ref.current.getBoundingClientRect().bottom + 8 : 0,
              left: ref.current ? ref.current.getBoundingClientRect().left : 0,
              width: ref.current ? Math.max(ref.current.offsetWidth, 400) : 400,
              maxWidth: "calc(100vw - 32px)",
            }}
          >
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4">
                <Filter className="w-4 h-4 text-neutral-400" />
                <input
                  autoFocus
                  className="flex-1 py-3 bg-transparent text-sm outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
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
                      "text-left hover:bg-neutral-50 dark:hover:bg-neutral-800",
                      selectedIds.has(item.itemId) && "bg-neutral-100 dark:bg-neutral-800"
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
                      <div className="text-xs text-neutral-500 truncate">{item.description}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Inbox className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <span className="text-sm text-neutral-400">Aucun article</span>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

/* =========================
   Email Modal
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
      <div className="relative w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
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
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                Envoyer par courriel
              </h3>
              <p className="text-sm text-neutral-500">La liste sera jointe en PDF</p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="email"
            className={cn(
              "w-full h-14 px-5 rounded-2xl text-base font-medium",
              "bg-neutral-100 dark:bg-neutral-800",
              "border-2 border-transparent focus:border-current",
              "outline-none transition-all duration-300",
              "placeholder:text-neutral-400"
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
            className="flex-1 h-14 rounded-2xl font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
          >
            Annuler
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
   Price Modal
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

  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (!isOpen) return null;

  const itemsWithPrices = data.filter((item) => item.ranges && item.ranges.length > 0);

  const groupedItems = itemsWithPrices.reduce((acc, item) => {
    const key = item.className || "Articles Ajoutés";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ItemPriceData[]>);

  const calcPricePerCaisse = (price: number, caisse: number | null) =>
    caisse ? price * caisse : null;
  const calcPricePerLitre = (price: number, volume: number | null) =>
    volume ? price / volume : null;
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

  // ═══════════════════════════════════════════════════════════════════
  // PROFESSIONAL PDF GENERATION - Corporate style with red/black theme
  // ═══════════════════════════════════════════════════════════════════
  const handleEmailPDF = async (recipientEmail: string) => {
    setIsSendingEmail(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Color palette - Red and Black corporate theme
      const corporateRed: [number, number, number] = [200, 30, 30];
      const black: [number, number, number] = [0, 0, 0];
      const darkGray: [number, number, number] = [51, 51, 51];
      const mediumGray: [number, number, number] = [102, 102, 102];
      const lightGray: [number, number, number] = [245, 245, 245];
      const borderGray: [number, number, number] = [200, 200, 200];
      const white: [number, number, number] = [255, 255, 255];

      // ═══════════════════════════════════════════════════════════════
      // HEADER - Logo left (FIXED ASPECT RATIO), Company info right
      // ═══════════════════════════════════════════════════════════════
      
      // Logo - FIXED: Load image and use its NATURAL aspect ratio, 1.5x smaller
      const logoData = await getDataUri("/sinto-logo.svg");
      if (logoData) {
        // Create a temporary image to get natural dimensions
        const tempImg = new window.Image();
        tempImg.src = logoData;
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.onerror = resolve;
        });
        
        // Calculate dimensions preserving aspect ratio
        // Target max width of 36mm (was 55, now 1.5x smaller), let height scale naturally
        const naturalWidth = tempImg.naturalWidth || 200;
        const naturalHeight = tempImg.naturalHeight || 50;
        const aspectRatio = naturalWidth / naturalHeight;
        
        const logoWidth = 36;
        const logoHeight = logoWidth / aspectRatio;
        
        doc.addImage(logoData, "PNG", 15, 14, logoWidth, logoHeight);
      }
      
      // Company info - right aligned
      doc.setTextColor(...black);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SINTO", pageWidth - 15, 15, { align: "right" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mediumGray);
      doc.text("3750, 14e Avenue", pageWidth - 15, 21, { align: "right" });
      doc.text("Saint-Georges (Qc) G5Y 8E3", pageWidth - 15, 26, { align: "right" });
      doc.text("Tél: (418) 227-6442 | 1-800-463-0025", pageWidth - 15, 31, { align: "right" });
      
      // Price list banner - RED
      doc.setFillColor(...corporateRed);
      doc.rect(15, 38, pageWidth - 30, 10, "F");
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const priceListTitle = `${abbreviateColumnName(selectedPriceList?.code || "")} - ${selectedPriceList?.name || ""}`.toUpperCase();
      doc.text(priceListTitle, pageWidth / 2, 45, { align: "center" });
      
      // Effective date
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Effective: ${new Date().toLocaleDateString("fr-CA")}`, pageWidth / 2, 54, { align: "center" });

      let finalY = 62;

      // ═══════════════════════════════════════════════════════════════
      // TABLE SECTIONS - Professional grid style with BLACK separators
      // ═══════════════════════════════════════════════════════════════
      
      for (const [className, classItems] of Object.entries(groupedItems)) {
        if (finalY > 250) {
          doc.addPage();
          // Repeat header on new page - BLACK bar
          doc.setFillColor(...black);
          doc.rect(15, 10, pageWidth - 30, 8, "F");
          doc.setTextColor(...white);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(priceListTitle, pageWidth / 2, 15.5, { align: "center" });
          finalY = 25;
        }
        
        // Category header - BLACK bar with article count on right
        doc.setFillColor(...black);
        doc.rect(15, finalY, pageWidth - 30, 8, "F");
        doc.setTextColor(...white);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(className.toUpperCase(), 18, finalY + 5.5);
        
        // Article count on right side of header
        doc.setTextColor(...corporateRed);
        doc.setFontSize(8);
        doc.text(`${classItems.length} article(s)`, pageWidth - 18, finalY + 5.5, { align: "right" });
        
        finalY += 12;

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
        const itemStartRows: number[] = [];
        let rowIndex = 0;

        classItems.forEach((item, index) => {
          itemStartRows.push(rowIndex);
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
        });

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
          margin: { left: 15, right: 15 },
          styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: "helvetica",
            lineColor: borderGray,
            lineWidth: 0.3,
            textColor: darkGray,
          },
          headStyles: { 
            fillColor: corporateRed,
            textColor: white,
            fontStyle: "bold",
            halign: "center",
            lineColor: corporateRed,
            lineWidth: 0.3,
          },
          columnStyles: { 
            0: { fontStyle: "bold", halign: "left", cellWidth: 30 },
            1: { halign: "center", cellWidth: 12 },
            2: { halign: "center", cellWidth: 15 },
            3: { halign: "center", cellWidth: 12 },
          },
          theme: "grid",
          didParseCell: function (d) {
            // Style price columns - right align
            if (d.section === "body" && d.column.index >= 4) {
              d.cell.styles.halign = "right";
            }
            // Bold the article code column - RED color
            if (d.section === "body" && d.column.index === 0 && d.cell.raw) {
              d.cell.styles.textColor = corporateRed;
              d.cell.styles.fontStyle = "bold";
            }
            // Alternate row backgrounds for items
            if (d.section === "body") {
              let itemIndex = 0;
              for (let i = 0; i < itemStartRows.length; i++) {
                if (d.row.index >= itemStartRows[i]) {
                  itemIndex = i;
                }
              }
              if (itemIndex % 2 === 1) {
                d.cell.styles.fillColor = [250, 250, 250];
              }
            }
          },
          didDrawCell: function(d) {
            // Draw BLACK separator line between different articles
            if (d.section === "body" && d.column.index === 0) {
              const nextRowIndex = d.row.index + 1;
              // Check if this is the last row of an article (next row starts a new article)
              if (itemStartRows.includes(nextRowIndex) && nextRowIndex < tableBody.length) {
                doc.setDrawColor(...black);
                doc.setLineWidth(1);
                doc.line(
                  d.cell.x,
                  d.cell.y + d.cell.height,
                  pageWidth - 15,
                  d.cell.y + d.cell.height
                );
              }
            }
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Footer
      const addFooter = () => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setDrawColor(...black);
          doc.setLineWidth(0.5);
          doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
          doc.setTextColor(...mediumGray);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text("SINTO - Experts en lubrification | 3750, 14e Avenue, Saint-Georges (Qc) G5Y 8E3 | Tél: (418) 227-6442 | 1-800-463-0025", 15, pageHeight - 10);
          doc.text(`Page ${i} / ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
        }
      };
      addFooter();

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("file", pdfBlob, "ListePrix_SINTO.pdf");
      formData.append("to", recipientEmail);
      formData.append("subject", `Liste de prix SINTO : ${selectedPriceList?.name}`);
      formData.append(
        "message",
        "Bonjour,\n\nVeuillez trouver ci-joint la liste de prix que vous avez demandée.\n\nCordialement,\n\nSINTO\nExperts en lubrification\n3750, 14e Avenue\nSaint-Georges (Qc) G5Y 8E3\nTél: (418) 227-6442\n1-800-463-0025"
      );
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
    <div className="fixed inset-0 z-[99990] flex">
      <div
        className="absolute inset-0 bg-gradient-to-br from-neutral-900/90 via-neutral-900/80 to-neutral-900/90 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative w-full h-full flex flex-col animate-in fade-in duration-300">
        {/* HEADER */}
        <header
          className="flex-shrink-0 relative overflow-hidden"
          style={{ backgroundColor: accentColor }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-black/10 blur-2xl" />
          </div>

          <div className="relative px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Liste de prix
                  </h1>
                  <p className="text-white/70 text-sm">
                    {itemsWithPrices.length} article(s) •{" "}
                    {abbreviateColumnName(selectedPriceList?.code || "")}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <PremiumToggle
                enabled={showDetails}
                onChange={handleToggleDetails}
                label={isMobile ? "Détails" : "Voir détails"}
                icon={showDetails ? Eye : EyeOff}
                accentColor={accentColor}
                loading={isAuthenticating}
              />

              <div className="w-px h-8 bg-white/20 flex-shrink-0" />

              <ActionButton onClick={() => setShowEmailModal(true)} icon={Mail} label={isMobile ? undefined : "Email"} variant="ghost" />
              <ActionButton onClick={onReset} icon={RotateCcw} label={isMobile ? undefined : "Réinitialiser"} variant="ghost" />
              <ActionButton onClick={() => setFiltersExpanded(!filtersExpanded)} icon={filtersExpanded ? ChevronUp : Filter} label={isMobile ? undefined : "Filtres"} variant={filtersExpanded ? "solid" : "ghost"} />
              <ActionButton onClick={onLoadSelection} icon={Plus} label={isMobile ? undefined : "Ajouter"} variant="ghost" />
              <ActionButton onClick={() => setShowQuickAdd(true)} icon={Search} label={isMobile ? undefined : "Recherche"} variant="ghost" />
            </div>

            {filtersExpanded && (
              <div className="mt-4 p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <select
                    value={selectedPriceList?.priceId || ""}
                    onChange={(e) => onPriceListChange(parseInt(e.target.value))}
                    disabled={loading}
                    className="w-full h-14 px-4 pr-12 rounded-2xl font-bold text-sm appearance-none cursor-pointer bg-white text-neutral-900 border-2 border-white focus:outline-none disabled:opacity-50 transition-all"
                  >
                    {priceLists.map((pl) => (
                      <option key={pl.priceId} value={pl.priceId}>
                        {abbreviateColumnName(pl.code)} - {pl.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <select
                      value={selectedProduct?.prodId || ""}
                      onChange={(e) => onProductChange(e.target.value)}
                      className="w-full h-14 px-4 pr-10 rounded-2xl font-semibold text-sm appearance-none cursor-pointer bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white/50 transition-all"
                    >
                      <option value="" className="text-neutral-900">Catégorie...</option>
                      {products.map((p) => (
                        <option key={p.prodId} value={p.prodId} className="text-neutral-900">{p.name}</option>
                      ))}
                    </select>
                    <Layers className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedType?.itemTypeId || ""}
                      onChange={(e) => onTypeChange(e.target.value)}
                      disabled={!selectedProduct}
                      className="w-full h-14 px-4 pr-10 rounded-2xl font-semibold text-sm appearance-none cursor-pointer bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white/50 disabled:opacity-40 transition-all"
                    >
                      <option value="" className="text-neutral-900">Classe...</option>
                      {itemTypes.map((t) => (
                        <option key={t.itemTypeId} value={t.itemTypeId} className="text-neutral-900">{t.description}</option>
                      ))}
                    </select>
                    <Package className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                </div>

                <ItemMultiSelect
                  items={items}
                  selectedIds={selectedItemIds}
                  onChange={onItemsChange}
                  disabled={!selectedType && !selectedProduct}
                  accentColor={accentColor}
                />
              </div>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950">
          {loading && data.length === 0 ? (
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
                <p className="text-xl font-bold text-neutral-700 dark:text-neutral-200">Chargement des prix</p>
                <p className="text-neutral-500 mt-1">Veuillez patienter...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                <AlertCircle className="w-12 h-12" style={{ color: accentColor }} />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: accentColor }}>Erreur</p>
                <p className="text-neutral-500 mt-2 max-w-md">{error}</p>
                <button onClick={onReset} className="mt-6 px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all hover:scale-105 active:scale-95" style={{ borderColor: accentColor, color: accentColor }}>
                  <RefreshCw className="w-4 h-4 inline mr-2" />Réessayer
                </button>
              </div>
            </div>
          ) : Object.keys(groupedItems).length > 0 ? (
            <div className="p-4 sm:p-6 space-y-6">
              {Object.entries(groupedItems).map(([className, classItems]) => {
                const firstItem = classItems[0];
                let priceColumns = firstItem.ranges[0]?.columns
                  ? Object.keys(firstItem.ranges[0].columns).sort()
                  : [selectedPriceList?.code || "Prix"];
                if (!showDetails && selectedPriceList?.code !== "01-EXP")
                  priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
                const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
                const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS");

                return (
                  <section key={className} className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-xl border border-neutral-200/50 dark:border-neutral-800">
                    <div className="relative px-5 py-4 sm:px-6 sm:py-5" style={{ backgroundColor: accentColor }}>
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                      </div>
                      <div className="relative flex items-center justify-between">
                        <div>
                          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">{className}</h2>
                          <p className="text-white/70 text-sm mt-0.5">{classItems.length} article(s)</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
                          <Sparkles className="w-4 h-4 text-white" />
                          <span className="text-white text-sm font-bold">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className={cn("w-full border-collapse", isCompact ? "text-xs" : "text-sm")}>
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                            <th className={cn("text-left font-black text-neutral-600 dark:text-neutral-300 border-b-2 border-neutral-200 dark:border-neutral-700 sticky left-0 bg-neutral-50 dark:bg-neutral-800/50 z-10", isCompact ? "p-3" : "p-4")}>
                              <div className="flex items-center gap-2">
                                <Package className={cn(isCompact ? "w-4 h-4" : "w-5 h-5", "opacity-50")} />Article
                              </div>
                            </th>
                            <th className={cn("text-center font-black text-neutral-600 dark:text-neutral-300 border-b-2 border-neutral-200 dark:border-neutral-700", isCompact ? "p-3" : "p-4")}>Cs</th>
                            <th className={cn("text-center font-black text-neutral-600 dark:text-neutral-300 border-b-2 border-neutral-200 dark:border-neutral-700", isCompact ? "p-3" : "p-4")}>Fmt</th>
                            <th className={cn("text-center font-black text-neutral-600 dark:text-neutral-300 border-b-2 border-neutral-200 dark:border-neutral-700", isCompact ? "p-3" : "p-4")}>Qty</th>
                            {standardColumns.map((colCode) => {
                              const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                              const displayName = abbreviateColumnName(colCode);
                              return (
                                <Fragment key={colCode}>
                                  <th className={cn("text-right font-black border-b-2 border-neutral-200 dark:border-neutral-700 whitespace-nowrap", isCompact ? "p-3" : "p-4", isSelectedList ? "text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20" : "text-neutral-600 dark:text-neutral-300")}>{displayName}</th>
                                  {showDetails && isSelectedList && !isCompact && (
                                    <>
                                      <th className="text-right p-4 font-black text-sky-700 dark:text-sky-400 border-b-2 border-neutral-200 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-900/20 whitespace-nowrap">$/Cs</th>
                                      <th className="text-right p-4 font-black text-sky-700 dark:text-sky-400 border-b-2 border-neutral-200 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-900/20 whitespace-nowrap">$/L</th>
                                      <th className="text-right p-4 font-black text-violet-700 dark:text-violet-400 border-b-2 border-neutral-200 dark:border-neutral-700 bg-violet-50/50 dark:bg-violet-900/20 whitespace-nowrap">%Exp</th>
                                    </>
                                  )}
                                  {showDetails && isSelectedList && isCompact && (
                                    <th className="text-right p-3 font-black text-sky-700 dark:text-sky-400 border-b-2 border-neutral-200 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-900/20 whitespace-nowrap">Détails</th>
                                  )}
                                </Fragment>
                              );
                            })}
                            {hasPDS && <th className={cn("text-right font-black text-neutral-600 dark:text-neutral-300 border-b-2 border-neutral-200 dark:border-neutral-700 whitespace-nowrap", isCompact ? "p-3" : "p-4")}>{abbreviateColumnName("08-PDS")}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {classItems.map((item, itemIndex) => (
                            <Fragment key={item.itemId}>
                              {item.ranges.map((range, rIdx) => {
                                const isFirstRowOfItem = rIdx === 0;
                                const rowBg = itemIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/70 dark:bg-neutral-800/30";

                                return (
                                  <tr key={range.id} className={cn("transition-colors duration-200 group", rowBg, "hover:bg-amber-50/50 dark:hover:bg-amber-900/10")}>
                                    <td className={cn("border-b border-neutral-100 dark:border-neutral-800 align-top sticky left-0 z-10", isCompact ? "p-3" : "p-4", rowBg, "group-hover:bg-amber-50/50 dark:group-hover:bg-amber-900/10")}>
                                      {isFirstRowOfItem && (
                                        <div className="flex flex-col gap-0.5">
                                          <span className={cn("font-mono font-black tracking-tight", isCompact ? "text-sm" : "text-base")} style={{ color: accentColor }}>{item.itemCode}</span>
                                          <span className={cn("text-neutral-500 truncate max-w-[200px]", isCompact ? "text-[10px]" : "text-xs")} title={item.description}>{item.description}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className={cn("text-center border-b border-neutral-100 dark:border-neutral-800 align-top", isCompact ? "p-3" : "p-4")}>
                                      {isFirstRowOfItem && <span className="font-bold text-neutral-900 dark:text-white">{item.caisse ? Math.round(item.caisse) : "-"}</span>}
                                    </td>
                                    <td className={cn("text-center border-b border-neutral-100 dark:border-neutral-800 align-top", isCompact ? "p-3" : "p-4")}>
                                      {isFirstRowOfItem && <span className="font-medium text-neutral-700 dark:text-neutral-300 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg inline-block text-xs">{item.format || "-"}</span>}
                                    </td>
                                    <td className={cn("text-center border-b border-neutral-100 dark:border-neutral-800", isCompact ? "p-3" : "p-4")}>
                                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{range.qtyMin}</span>
                                    </td>
                                    {standardColumns.map((colCode) => {
                                      const priceVal = range.columns ? range.columns[colCode] : colCode === selectedPriceList?.code ? range.unitPrice : null;
                                      const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                                      return (
                                        <Fragment key={colCode}>
                                          <td className={cn("text-right border-b border-neutral-100 dark:border-neutral-800", isCompact ? "p-3" : "p-4", isSelectedList && "bg-amber-50/30 dark:bg-amber-900/10")}>
                                            <span className={cn("font-mono font-bold whitespace-nowrap", isSelectedList ? "text-amber-700 dark:text-amber-400" : "text-neutral-700 dark:text-neutral-300")}>
                                              {priceVal !== null && priceVal !== undefined ? <AnimatedPrice value={priceVal} /> : "-"}
                                            </span>
                                          </td>
                                          {showDetails && isSelectedList && !isCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppc = calcPricePerCaisse(selectedPriceVal, item.caisse);
                                            const ppl = calcPricePerLitre(selectedPriceVal, item.volume);
                                            const expBaseVal = range.columns?.["01-EXP"] ?? null;
                                            const percentExp = calcMargin(selectedPriceVal, expBaseVal);
                                            return (
                                              <>
                                                <td className="p-4 text-right border-b border-neutral-100 dark:border-neutral-800 bg-sky-50/30 dark:bg-sky-900/10">
                                                  <span className="font-mono text-sky-700 dark:text-sky-400">{ppc ? ppc.toFixed(2) : "-"}</span>
                                                </td>
                                                <td className="p-4 text-right border-b border-neutral-100 dark:border-neutral-800 bg-sky-50/30 dark:bg-sky-900/10">
                                                  <span className="font-mono text-sky-700 dark:text-sky-400">{ppl ? ppl.toFixed(2) : "-"}</span>
                                                </td>
                                                <td className="p-4 text-right border-b border-neutral-100 dark:border-neutral-800 bg-violet-50/30 dark:bg-violet-900/10">
                                                  <span className={cn("font-mono font-bold", percentExp && percentExp < 0 ? "text-red-600 dark:text-red-400" : "text-violet-700 dark:text-violet-400")}>
                                                    {percentExp !== null ? `${percentExp.toFixed(1)}%` : "-"}
                                                  </span>
                                                </td>
                                              </>
                                            );
                                          })()}
                                          {showDetails && isSelectedList && isCompact && (() => {
                                            const selectedPriceVal = priceVal ?? 0;
                                            const ppc = calcPricePerCaisse(selectedPriceVal, item.caisse);
                                            const ppl = calcPricePerLitre(selectedPriceVal, item.volume);
                                            const expBaseVal = range.columns?.["01-EXP"] ?? null;
                                            const percentExp = calcMargin(selectedPriceVal, expBaseVal);
                                            return (
                                              <td className="p-3 text-right border-b border-neutral-100 dark:border-neutral-800 bg-sky-50/30 dark:bg-sky-900/10">
                                                <div className="space-y-1 text-[10px]">
                                                  <div className="flex justify-end gap-2 text-sky-700 dark:text-sky-400">
                                                    <span className="opacity-60">$/Cs</span>
                                                    <span className="font-mono font-bold">{ppc ? ppc.toFixed(2) : "-"}</span>
                                                  </div>
                                                  <div className="flex justify-end gap-2 text-sky-700 dark:text-sky-400">
                                                    <span className="opacity-60">$/L</span>
                                                    <span className="font-mono font-bold">{ppl ? ppl.toFixed(2) : "-"}</span>
                                                  </div>
                                                  <div className="flex justify-end gap-2 text-violet-700 dark:text-violet-400">
                                                    <span className="opacity-60">%Exp</span>
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
                                        <td className={cn("text-right border-b border-neutral-100 dark:border-neutral-800", isCompact ? "p-3" : "p-4")}>
                                          <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{p !== null ? <AnimatedPrice value={p} /> : "-"}</span>
                                        </td>
                                      );
                                    })()}
                                  </tr>
                                );
                              })}
                              {itemIndex < classItems.length - 1 && (
                                <tr className="h-2">
                                  <td colSpan={100} className="bg-neutral-200 dark:bg-neutral-800 border-none" />
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
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                <Inbox className="w-14 h-14" style={{ color: `${accentColor}40` }} />
              </div>
              <div className="text-center max-w-md">
                <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-200">Aucun prix trouvé</p>
                <p className="text-neutral-500 mt-3">
                  Utilisez le bouton <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><Plus className="w-4 h-4" /> Ajouter</span> ou la <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><Search className="w-4 h-4" /> Recherche</span> pour ajouter des articles.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* FOOTER */}
        {!loading && itemsWithPrices.length > 0 && (
          <footer className="flex-shrink-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl font-bold text-sm" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                  {itemsWithPrices.length} article(s)
                </div>
                {showDetails && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold text-sm">
                    <Eye className="w-4 h-4" />Mode détaillé
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="hidden sm:inline">Liste:</span>
                <span className="font-bold text-neutral-700 dark:text-neutral-300">{abbreviateColumnName(selectedPriceList?.code || "")}</span>
              </div>
            </div>
          </footer>
        )}
      </div>

      {showQuickAdd && <QuickAddPanel accentColor={accentColor} onClose={() => setShowQuickAdd(false)} onAddItems={onAddItems} />}
      <EmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSend={handleEmailPDF} sending={isSendingEmail} accentColor={accentColor} />
    </div>
  );
}

/* =========================
   Main Page - FULL SCREEN IPAD LANDSCAPE LAYOUT - NO SCROLL
========================= */
export default function CataloguePage() {
  const { color: accentColor } = useCurrentAccent();

  // STATE (UNCHANGED)
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

  // DATA FETCHING (UNCHANGED)
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, plRes] = await Promise.all([
          fetch("/api/catalogue/products"),
          fetch("/api/catalogue/pricelists"),
        ]);
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

  // HANDLERS (UNCHANGED)
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
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 p-4">
      {/* Main Card - Fixed to viewport, no scroll */}
      <div className="h-full w-full flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header - Compact */}
        <div
          className="flex-shrink-0 px-5 py-4 flex items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800"
          style={{ background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Image 
                src="/sinto-logo.svg" 
                alt="SINTO" 
                width={120} 
                height={40} 
                className="h-10 w-auto object-contain" 
                style={{ maxWidth: '120px' }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">Catalogue SINTO</h1>
              <p className="text-neutral-500 text-xs">Générateur de liste de prix</p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={cn(
              "h-12 px-8 rounded-xl font-black text-sm uppercase tracking-wider flex-shrink-0",
              "flex items-center justify-center transition-all duration-300",
              "disabled:bg-neutral-200 disabled:dark:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed",
              canGenerate && "hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] text-white"
            )}
            style={canGenerate ? { backgroundColor: accentColor, boxShadow: `0 10px 20px -5px ${accentColor}40` } : {}}
          >
            Générer
          </button>
        </div>

        {/* Search - Compact */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 z-10" />
            <input
              type="search"
              placeholder="Recherche rapide par code article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full h-11 pl-12 pr-4 rounded-xl text-sm font-medium",
                "bg-neutral-100 dark:bg-neutral-800",
                "border-2 border-transparent focus:border-current",
                "outline-none transition-all duration-300",
                "placeholder:text-neutral-400"
              )}
              style={{ borderColor: searchQuery ? accentColor : "transparent" }}
            />

            {searchQuery.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-56 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {isSearching ? (
                  <div className="p-6 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
                    <span className="text-sm text-neutral-500">Recherche...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-1">
                    {searchResults.slice(0, 6).map((item) => (
                      <button
                        key={item.itemId}
                        onClick={() => handleSearchResultClick(item)}
                        className="w-full p-3 text-left rounded-lg transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-3"
                      >
                        <Package className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-bold text-sm mr-2" style={{ color: accentColor }}>{item.itemCode}</span>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{item.description}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Inbox className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <span className="text-sm text-neutral-500">Aucun résultat</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form - 2 columns x 2 rows layout that fits on iPad screen */}
        <div className="flex-1 flex flex-col px-5 py-4 min-h-0">
          {/* Row 1: Liste de prix + Catégorie */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* 1. Liste de prix */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ backgroundColor: accentColor }}>1</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">Liste de prix</span>
              </div>
              <div className="relative">
                <select
                  value={selectedPriceList?.priceId || ""}
                  onChange={(e) => handlePriceListChange(e.target.value)}
                  className="w-full h-12 pl-3 pr-10 rounded-xl text-sm font-semibold appearance-none cursor-pointer bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ ["--tw-ring-color" as string]: accentColor }}
                >
                  {priceLists.map((pl) => (
                    <option key={pl.priceId} value={pl.priceId}>{abbreviateColumnName(pl.code)} - {pl.name}</option>
                  ))}
                </select>
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: accentColor }} />
              </div>
            </div>

            {/* 2. Catégorie */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0", selectedPriceList ? "text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400")} style={selectedPriceList ? { backgroundColor: accentColor } : undefined}>2</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">Catégorie</span>
              </div>
              <div className="relative">
                <select
                  value={selectedProduct?.prodId || ""}
                  onChange={(e) => handleProductChange(e.target.value)}
                  disabled={!selectedPriceList}
                  className="w-full h-12 pl-3 pr-10 rounded-xl text-sm font-semibold appearance-none cursor-pointer bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ ["--tw-ring-color" as string]: accentColor }}
                >
                  <option value="">Sélectionner...</option>
                  {products.map((p) => (
                    <option key={p.prodId} value={p.prodId}>{p.name} ({p.itemCount})</option>
                  ))}
                </select>
                <Layers className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Classe + Article */}
          <div className="grid grid-cols-2 gap-4">
            {/* 3. Classe */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0", selectedProduct ? "text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400")} style={selectedProduct ? { backgroundColor: accentColor } : undefined}>3</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">Classe (optionnel)</span>
              </div>
              <div className="relative">
                <select
                  value={selectedType?.itemTypeId || ""}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  disabled={!selectedProduct || loadingTypes}
                  className="w-full h-12 pl-3 pr-10 rounded-xl text-sm font-semibold appearance-none cursor-pointer bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ ["--tw-ring-color" as string]: accentColor }}
                >
                  <option value="">{loadingTypes ? "Chargement..." : "Toutes les classes"}</option>
                  {itemTypes.map((t) => (
                    <option key={t.itemTypeId} value={t.itemTypeId}>{t.description} ({t.itemCount})</option>
                  ))}
                </select>
                {loadingTypes ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin pointer-events-none" /> : <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />}
              </div>
            </div>

            {/* 4. Article */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0", selectedType ? "text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400")} style={selectedType ? { backgroundColor: accentColor } : undefined}>4</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">Article (optionnel)</span>
              </div>
              <div className="relative">
                <select
                  value={selectedItem?.itemId || ""}
                  onChange={(e) => handleItemChange(e.target.value)}
                  disabled={!selectedType || loadingItems}
                  className="w-full h-12 pl-3 pr-10 rounded-xl text-sm font-semibold appearance-none cursor-pointer bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ ["--tw-ring-color" as string]: accentColor }}
                >
                  <option value="">{loadingItems ? "Chargement..." : "Tous les articles"}</option>
                  {items.map((i) => (
                    <option key={i.itemId} value={i.itemId}>{i.itemCode}</option>
                  ))}
                </select>
                {loadingItems ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin pointer-events-none" /> : <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />}
              </div>
            </div>
          </div>

          {/* Selected Item - Compact */}
          {selectedItem && (
            <div className="mt-4 p-3 rounded-xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-3" style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}30` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}20` }}>
                <Check className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-mono font-black text-base" style={{ color: accentColor }}>{selectedItem.itemCode}</span>
                <span className="text-sm text-neutral-500 ml-2">{selectedItem.description}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <p className="text-center text-neutral-400 text-xs">
            Sélectionnez une liste de prix et une catégorie, puis appuyez sur <span className="font-bold">Générer</span>
          </p>
        </div>
      </div>

      {/* Price Modal */}
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
