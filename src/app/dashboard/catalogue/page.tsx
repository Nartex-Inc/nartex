// src/app/dashboard/catalogue/page.tsx
// SINTO Premium Item Catalogue Navigation
// Enhanced version with large intuitive buttons and dramatic price comparison
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Package,
  Layers,
  Tag,
  DollarSign,
  ArrowLeftRight,
  X,
  Check,
  Loader2,
  BarChart3,
  Sparkles,
  Home,
  Scale,
  Eye,
  TrendingUp,
  Copy,
  CheckCheck,
  Info,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   Design Tokens - Industrial Premium Theme
   ═══════════════════════════════════════════════════════════════════════════════ */
const THEME = {
  light: {
    void: "#FFFFFF",
    surface1: "#FAFAFA",
    surface2: "#F5F5F5",
    surface3: "#EBEBEB",
    textPrimary: "#0A0A0A",
    textSecondary: "#525252",
    textTertiary: "#737373",
    textMuted: "#A3A3A3",
    borderSubtle: "rgba(0,0,0,0.06)",
    borderDefault: "rgba(0,0,0,0.12)",
    accent: "#1DB954",
    accentMuted: "rgba(29,185,84,0.12)",
    secondary: "#6366F1",
    tertiary: "#EC4899",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    glass: "rgba(255,255,255,0.7)",
    gradientStart: "#1DB954",
    gradientEnd: "#059669",
  },
  dark: {
    void: "#000000",
    surface1: "#0A0A0A",
    surface2: "#141414",
    surface3: "#1F1F1F",
    textPrimary: "#FAFAFA",
    textSecondary: "#A3A3A3",
    textTertiary: "#737373",
    textMuted: "#525252",
    borderSubtle: "rgba(255,255,255,0.06)",
    borderDefault: "rgba(255,255,255,0.12)",
    accent: "#1ED760",
    accentMuted: "rgba(30,215,96,0.15)",
    secondary: "#818CF8",
    tertiary: "#F472B6",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    glass: "rgba(10,10,10,0.8)",
    gradientStart: "#1ED760",
    gradientEnd: "#10B981",
  },
} as const;

const CHART_PALETTE = {
  light: ["#1DB954", "#6366F1", "#EC4899", "#F59E0B", "#14B8A6", "#8B5CF6"],
  dark: ["#1ED760", "#818CF8", "#F472B6", "#FBBF24", "#2DD4BF", "#A78BFA"],
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════════ */
type Product = {
  prodId: number;
  name: string;
  itemCount: number;
};

type ItemType = {
  itemTypeId: number;
  description: string;
  itemCount: number;
};

type Item = {
  itemId: number;
  itemCode: string;
  description: string;
  prodId: number;
  itemSubTypeId: number;
  productName: string;
  typeDescription: string;
  relevance?: number;
};

type PriceList = {
  priceId: number;
  name: string;
  description: string | null;
  currency: string;
  isActive: boolean;
};

type PriceRange = {
  id: number;
  qtyMin: number;
  qtyMax: number | null;
  unitPrice: number;
};

type PriceData = {
  priceId: number;
  priceListName: string;
  currency: string;
  ranges: PriceRange[];
};

type ItemPrices = {
  itemId: number;
  priceLists: PriceData[];
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Formatters & Hooks
   ═══════════════════════════════════════════════════════════════════════════════ */
const currency = (n: number, curr = "CAD") =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);

const formatNumber = (n: number) => new Intl.NumberFormat("fr-CA").format(n);

function useDebounce<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return v;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CSS Animations (injected via style tag)
   ═══════════════════════════════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.05); opacity: 0.2; }
      100% { transform: scale(1); opacity: 0.4; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(30,215,96,0.3); }
      50% { box-shadow: 0 0 40px rgba(30,215,96,0.5); }
    }
    .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
    .animate-slideUp { animation: slideUp 0.5s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
    .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
    .animate-shimmer {
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
      background-size: 200% 100%;
      animation: shimmer 2s linear infinite;
    }
    .animate-glow { animation: glow 2s ease-in-out infinite; }
    .glassmorphism {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-hover:hover {
      transform: translateY(-4px) scale(1.02);
    }
  `}</style>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Large Category Button (HERO STYLE)
   ═══════════════════════════════════════════════════════════════════════════════ */
const HeroCategoryCard = ({
  title,
  count,
  icon: Icon,
  onClick,
  isSelected,
  color,
  t,
  index,
}: {
  title: string;
  count: number;
  icon: any;
  onClick: () => void;
  isSelected: boolean;
  color: string;
  t: typeof THEME.dark;
  index: number;
}) => (
  <button
    onClick={onClick}
    className="group relative w-full text-left card-hover animate-fadeIn"
    style={{
      animationDelay: `${index * 50}ms`,
      animationFillMode: "backwards",
    }}
  >
    {/* Background with gradient border */}
    <div
      className="relative overflow-hidden rounded-2xl p-[1px]"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${color}, ${t.accent})`
          : t.borderSubtle,
      }}
    >
      <div
        className="relative rounded-2xl p-6 overflow-hidden"
        style={{
          background: isSelected ? `${color}15` : t.surface2,
        }}
      >
        {/* Decorative background element */}
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 transition-all duration-500 group-hover:opacity-20 group-hover:scale-125"
          style={{ background: color }}
        />
        
        {/* Selection indicator */}
        {isSelected && (
          <div
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center animate-scaleIn"
            style={{ background: color }}
          >
            <Check className="w-5 h-5" style={{ color: t.void }} />
          </div>
        )}

        {/* Icon */}
        <div
          className="relative w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
          style={{
            background: `${color}20`,
            boxShadow: isSelected ? `0 0 30px ${color}40` : "none",
          }}
        >
          <Icon className="w-7 h-7" style={{ color }} />
        </div>

        {/* Title */}
        <h3
          className="font-bold text-lg mb-2 line-clamp-2 transition-colors"
          style={{ color: isSelected ? color : t.textPrimary }}
        >
          {title}
        </h3>

        {/* Count badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-mono px-3 py-1 rounded-lg"
            style={{
              background: t.surface3,
              color: t.textSecondary,
            }}
          >
            {formatNumber(count)} articles
          </span>
        </div>

        {/* Arrow indicator */}
        <div
          className="absolute bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1"
          style={{
            background: isSelected ? color : t.surface3,
          }}
        >
          <ArrowRight
            className="w-5 h-5"
            style={{ color: isSelected ? t.void : t.textMuted }}
          />
        </div>
      </div>
    </div>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Item Type Pill (Medium Level Navigation)
   ═══════════════════════════════════════════════════════════════════════════════ */
const ItemTypePill = ({
  type,
  onClick,
  isSelected,
  color,
  t,
  index,
}: {
  type: ItemType;
  onClick: () => void;
  isSelected: boolean;
  color: string;
  t: typeof THEME.dark;
  index: number;
}) => (
  <button
    onClick={onClick}
    className="group relative text-left transition-all duration-300 animate-fadeIn"
    style={{
      animationDelay: `${index * 30}ms`,
      animationFillMode: "backwards",
    }}
  >
    <div
      className="relative overflow-hidden rounded-xl p-4 border transition-all duration-300"
      style={{
        background: isSelected ? `${color}15` : t.surface2,
        borderColor: isSelected ? `${color}50` : t.borderSubtle,
      }}
    >
      {/* Selection ring */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-xl animate-pulse-ring"
          style={{ border: `2px solid ${color}` }}
        />
      )}

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
          style={{
            background: isSelected ? color : `${color}20`,
          }}
        >
          <Layers
            className="w-5 h-5"
            style={{ color: isSelected ? t.void : color }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm truncate"
            style={{ color: isSelected ? color : t.textPrimary }}
          >
            {type.description}
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {formatNumber(type.itemCount)} articles
          </p>
        </div>

        <ChevronRight
          className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1"
          style={{ color: isSelected ? color : t.textMuted }}
        />
      </div>
    </div>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Item Selection Card
   ═══════════════════════════════════════════════════════════════════════════════ */
const ItemCard = ({
  item,
  onSelect,
  isPrimary,
  isCompare,
  t,
  colors,
  index,
}: {
  item: Item;
  onSelect: (item: Item, slot: "primary" | "compare") => void;
  isPrimary: boolean;
  isCompare: boolean;
  t: typeof THEME.dark;
  colors: string[];
  index: number;
}) => {
  const [copied, setCopied] = useState(false);
  const isSelected = isPrimary || isCompare;
  const selectionColor = isPrimary ? colors[0] : isCompare ? colors[1] : t.accent;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.itemCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="group relative rounded-xl border transition-all duration-300 cursor-pointer card-hover animate-fadeIn"
      style={{
        background: isSelected ? `${selectionColor}10` : t.surface2,
        borderColor: isSelected ? `${selectionColor}40` : t.borderSubtle,
        animationDelay: `${index * 40}ms`,
        animationFillMode: "backwards",
      }}
      onClick={() => onSelect(item, isPrimary ? "primary" : "primary")}
    >
      {/* Selection badge */}
      {isSelected && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 animate-scaleIn"
          style={{ background: selectionColor }}
        >
          {isPrimary ? (
            <span className="text-xs font-bold" style={{ color: t.void }}>1</span>
          ) : (
            <span className="text-xs font-bold" style={{ color: t.void }}>2</span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header with code and copy */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${t.accent}20` }}
            >
              <Tag className="w-4 h-4" style={{ color: t.accent }} />
            </div>
            <span
              className="font-mono font-bold text-lg"
              style={{ color: isSelected ? selectionColor : t.textPrimary }}
            >
              {item.itemCode}
            </span>
          </div>
          
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            style={{ background: t.surface3 }}
          >
            {copied ? (
              <CheckCheck className="w-4 h-4" style={{ color: t.success }} />
            ) : (
              <Copy className="w-4 h-4" style={{ color: t.textMuted }} />
            )}
          </button>
        </div>

        {/* Description */}
        <p
          className="text-sm line-clamp-2 mb-3"
          style={{ color: t.textSecondary }}
        >
          {item.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {item.productName && (
            <span
              className="text-xs px-2 py-1 rounded-md"
              style={{ background: t.surface3, color: t.textTertiary }}
            >
              {item.productName}
            </span>
          )}
          {item.typeDescription && (
            <span
              className="text-xs px-2 py-1 rounded-md"
              style={{ background: t.surface3, color: t.textTertiary }}
            >
              {item.typeDescription}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: t.borderSubtle }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item, "primary");
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: isPrimary ? colors[0] : t.surface3,
              color: isPrimary ? t.void : t.textSecondary,
            }}
          >
            {isPrimary ? "Sélectionné" : "Sélectionner"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item, "compare");
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: isCompare ? colors[1] : t.surface3,
              color: isCompare ? t.void : t.textSecondary,
            }}
          >
            {isCompare ? "Comparé" : "Comparer"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Search Autocomplete (Premium)
   ═══════════════════════════════════════════════════════════════════════════════ */
const SearchAutocomplete = ({
  onSelect,
  t,
  colors,
}: {
  onSelect: (item: Item, slot: "primary" | "compare") => void;
  t: typeof THEME.dark;
  colors: string[];
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/catalogue/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(data.length > 0);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((p) => Math.min(p + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((p) => Math.max(p - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          onSelect(results[highlightedIndex], "primary");
          setQuery("");
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {/* Premium search input */}
      <div
        className="relative rounded-2xl p-[1px] transition-all duration-300"
        style={{
          background: isOpen
            ? `linear-gradient(135deg, ${t.accent}, ${colors[1]})`
            : t.borderSubtle,
        }}
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ background: t.surface2 }}
        >
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none"
            style={{ color: t.textMuted }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Rechercher par code article ou description..."
            className="w-full pl-14 pr-14 py-5 text-lg bg-transparent focus:outline-none"
            style={{ color: t.textPrimary }}
          />
          {isLoading && (
            <Loader2
              className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 animate-spin"
              style={{ color: t.accent }}
            />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-3 rounded-2xl overflow-hidden z-50 shadow-2xl glassmorphism animate-scaleIn"
          style={{
            background: t.glass,
            border: `1px solid ${t.borderDefault}`,
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {results.map((item, index) => (
            <button
              key={item.itemId}
              onClick={() => {
                onSelect(item, "primary");
                setQuery("");
                setIsOpen(false);
              }}
              className="w-full px-5 py-4 flex items-start gap-4 text-left transition-all"
              style={{
                background: index === highlightedIndex ? t.surface2 : "transparent",
                borderBottom: index < results.length - 1 ? `1px solid ${t.borderSubtle}` : "none",
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div
                className="p-3 rounded-xl shrink-0"
                style={{ background: `${t.accent}15` }}
              >
                <Tag className="w-5 h-5" style={{ color: t.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-mono font-bold text-base"
                    style={{ color: t.textPrimary }}
                  >
                    {item.itemCode}
                  </span>
                  {item.relevance && item.relevance >= 80 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${t.accent}20`, color: t.accent }}
                    >
                      Match exact
                    </span>
                  )}
                </div>
                <p
                  className="text-sm truncate"
                  style={{ color: t.textSecondary }}
                >
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {item.productName && (
                    <span
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ background: t.surface3, color: t.textTertiary }}
                    >
                      {item.productName}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 mt-1" style={{ color: t.textMuted }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   BIG COMPARE BUTTON
   ═══════════════════════════════════════════════════════════════════════════════ */
const CompareButton = ({
  primaryItem,
  compareItem,
  onClear,
  onTogglePanel,
  isPanelOpen,
  t,
  colors,
}: {
  primaryItem: Item | null;
  compareItem: Item | null;
  onClear: (slot: "primary" | "compare" | "all") => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  t: typeof THEME.dark;
  colors: string[];
}) => {
  const hasSelection = primaryItem || compareItem;
  const hasComparison = primaryItem && compareItem;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
      <div
        className="rounded-2xl p-[2px] shadow-2xl"
        style={{
          background: hasComparison
            ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
            : hasSelection
            ? colors[0]
            : t.borderDefault,
        }}
      >
        <div
          className="rounded-2xl px-6 py-4 flex items-center gap-4 glassmorphism"
          style={{ background: t.glass }}
        >
          {/* Selection indicators */}
          <div className="flex items-center gap-3">
            {/* Primary slot */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
              style={{
                background: primaryItem ? `${colors[0]}20` : t.surface3,
                border: `1px solid ${primaryItem ? colors[0] : t.borderSubtle}`,
              }}
            >
              {primaryItem ? (
                <>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: colors[0] }}
                  />
                  <span
                    className="font-mono font-semibold text-sm"
                    style={{ color: colors[0] }}
                  >
                    {primaryItem.itemCode}
                  </span>
                  <button
                    onClick={() => onClear("primary")}
                    className="p-1 rounded-md transition-colors hover:bg-white/10"
                  >
                    <X className="w-3 h-3" style={{ color: colors[0] }} />
                  </button>
                </>
              ) : (
                <span className="text-sm" style={{ color: t.textMuted }}>
                  Article 1
                </span>
              )}
            </div>

            {/* VS divider */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: hasComparison ? `${colors[1]}20` : t.surface3,
                color: hasComparison ? colors[1] : t.textMuted,
              }}
            >
              VS
            </div>

            {/* Compare slot */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
              style={{
                background: compareItem ? `${colors[1]}20` : t.surface3,
                border: `1px solid ${compareItem ? colors[1] : t.borderSubtle}`,
              }}
            >
              {compareItem ? (
                <>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: colors[1] }}
                  />
                  <span
                    className="font-mono font-semibold text-sm"
                    style={{ color: colors[1] }}
                  >
                    {compareItem.itemCode}
                  </span>
                  <button
                    onClick={() => onClear("compare")}
                    className="p-1 rounded-md transition-colors hover:bg-white/10"
                  >
                    <X className="w-3 h-3" style={{ color: colors[1] }} />
                  </button>
                </>
              ) : (
                <span className="text-sm" style={{ color: t.textMuted }}>
                  Article 2
                </span>
              )}
            </div>
          </div>

          {/* Compare action button */}
          <button
            onClick={onTogglePanel}
            disabled={!hasSelection}
            className={`
              relative px-8 py-3 rounded-xl font-bold text-base transition-all
              ${hasComparison ? "animate-glow" : ""}
            `}
            style={{
              background: hasComparison
                ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
                : hasSelection
                ? colors[0]
                : t.surface3,
              color: hasSelection ? t.void : t.textMuted,
              opacity: hasSelection ? 1 : 0.5,
              cursor: hasSelection ? "pointer" : "not-allowed",
            }}
          >
            <span className="flex items-center gap-2">
              {hasComparison ? (
                <>
                  <Scale className="w-5 h-5" />
                  Comparer les prix
                </>
              ) : hasSelection ? (
                <>
                  <Eye className="w-5 h-5" />
                  Voir les prix
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-5 h-5" />
                  Sélectionnez
                </>
              )}
            </span>
          </button>

          {/* Clear all */}
          {hasSelection && (
            <button
              onClick={() => onClear("all")}
              className="p-2 rounded-lg transition-colors"
              style={{ background: t.surface3 }}
            >
              <X className="w-5 h-5" style={{ color: t.textMuted }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Price Comparison Panel (Slide-up Modal)
   ═══════════════════════════════════════════════════════════════════════════════ */
const PriceComparisonPanel = ({
  isOpen,
  onClose,
  primaryItem,
  compareItem,
  primaryPrices,
  comparePrices,
  priceLists,
  selectedPriceList,
  onSelectPriceList,
  isLoading,
  t,
  colors,
}: {
  isOpen: boolean;
  onClose: () => void;
  primaryItem: Item | null;
  compareItem: Item | null;
  primaryPrices: ItemPrices | null;
  comparePrices: ItemPrices | null;
  priceLists: PriceList[];
  selectedPriceList: PriceList | null;
  onSelectPriceList: (pl: PriceList) => void;
  isLoading: boolean;
  t: typeof THEME.dark;
  colors: string[];
}) => {
  if (!isOpen) return null;

  const primaryPriceData = primaryPrices?.priceLists.find(
    (pl) => pl.priceId === selectedPriceList?.priceId
  );
  const comparePriceData = comparePrices?.priceLists.find(
    (pl) => pl.priceId === selectedPriceList?.priceId
  );

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl overflow-hidden animate-slideUp"
        style={{ background: t.surface1 }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-5 border-b flex items-center justify-between"
          style={{ background: t.surface2, borderColor: t.borderSubtle }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ background: `${t.accent}20` }}
            >
              <Scale className="w-6 h-6" style={{ color: t.accent }} />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: t.textPrimary }}
              >
                Comparaison des prix
              </h2>
              <p className="text-sm mt-0.5" style={{ color: t.textSecondary }}>
                {primaryItem?.itemCode}
                {compareItem && ` vs ${compareItem.itemCode}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-3 rounded-xl transition-colors"
            style={{ background: t.surface3 }}
          >
            <X className="w-5 h-5" style={{ color: t.textMuted }} />
          </button>
        </div>

        {/* Price list selector */}
        <div className="px-6 py-4 border-b" style={{ borderColor: t.borderSubtle }}>
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: t.textSecondary }}
          >
            Liste de prix
          </p>
          <div className="flex flex-wrap gap-2">
            {priceLists.map((pl) => (
              <button
                key={pl.priceId}
                onClick={() => onSelectPriceList(pl)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background:
                    selectedPriceList?.priceId === pl.priceId
                      ? t.accent
                      : t.surface3,
                  color:
                    selectedPriceList?.priceId === pl.priceId
                      ? t.void
                      : t.textSecondary,
                }}
              >
                {pl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: t.accent }}
              />
            </div>
          ) : (
            <div className={`grid gap-6 ${compareItem ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {/* Primary item prices */}
              {primaryItem && (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ background: colors[0] }}
                    />
                    <span
                      className="font-mono font-bold text-lg"
                      style={{ color: colors[0] }}
                    >
                      {primaryItem.itemCode}
                    </span>
                  </div>
                  <p
                    className="text-sm mb-4"
                    style={{ color: t.textSecondary }}
                  >
                    {primaryItem.description}
                  </p>

                  {primaryPriceData ? (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${t.borderSubtle}` }}
                    >
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: t.surface3 }}>
                            <th
                              className="px-4 py-3 text-left text-xs font-semibold uppercase"
                              style={{ color: t.textMuted }}
                            >
                              Quantité
                            </th>
                            <th
                              className="px-4 py-3 text-right text-xs font-semibold uppercase"
                              style={{ color: t.textMuted }}
                            >
                              Prix unitaire
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {primaryPriceData.ranges.map((range, i) => (
                            <tr
                              key={i}
                              style={{
                                borderTop: i > 0 ? `1px solid ${t.borderSubtle}` : undefined,
                              }}
                            >
                              <td className="px-4 py-3">
                                <span
                                  className="font-mono text-sm"
                                  style={{ color: t.textPrimary }}
                                >
                                  {range.qtyMin}
                                  {range.qtyMax ? ` — ${range.qtyMax}` : "+"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className="font-mono font-bold text-lg"
                                  style={{ color: colors[0] }}
                                >
                                  {currency(range.unitPrice, primaryPriceData.currency)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      className="p-8 rounded-xl text-center"
                      style={{ background: t.surface2 }}
                    >
                      <Info className="w-10 h-10 mx-auto mb-3" style={{ color: t.warning }} />
                      <p style={{ color: t.textSecondary }}>
                        Aucun prix disponible pour cette liste
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Compare item prices */}
              {compareItem && (
                <div className="animate-fadeIn" style={{ animationDelay: "100ms" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ background: colors[1] }}
                    />
                    <span
                      className="font-mono font-bold text-lg"
                      style={{ color: colors[1] }}
                    >
                      {compareItem.itemCode}
                    </span>
                  </div>
                  <p
                    className="text-sm mb-4"
                    style={{ color: t.textSecondary }}
                  >
                    {compareItem.description}
                  </p>

                  {comparePriceData ? (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${t.borderSubtle}` }}
                    >
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: t.surface3 }}>
                            <th
                              className="px-4 py-3 text-left text-xs font-semibold uppercase"
                              style={{ color: t.textMuted }}
                            >
                              Quantité
                            </th>
                            <th
                              className="px-4 py-3 text-right text-xs font-semibold uppercase"
                              style={{ color: t.textMuted }}
                            >
                              Prix unitaire
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparePriceData.ranges.map((range, i) => (
                            <tr
                              key={i}
                              style={{
                                borderTop: i > 0 ? `1px solid ${t.borderSubtle}` : undefined,
                              }}
                            >
                              <td className="px-4 py-3">
                                <span
                                  className="font-mono text-sm"
                                  style={{ color: t.textPrimary }}
                                >
                                  {range.qtyMin}
                                  {range.qtyMax ? ` — ${range.qtyMax}` : "+"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className="font-mono font-bold text-lg"
                                  style={{ color: colors[1] }}
                                >
                                  {currency(range.unitPrice, comparePriceData.currency)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      className="p-8 rounded-xl text-center"
                      style={{ background: t.surface2 }}
                    >
                      <Info className="w-10 h-10 mx-auto mb-3" style={{ color: t.warning }} />
                      <p style={{ color: t.textSecondary }}>
                        Aucun prix disponible pour cette liste
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Breadcrumb Navigation
   ═══════════════════════════════════════════════════════════════════════════════ */
const Breadcrumb = ({
  product,
  itemType,
  onReset,
  onResetToProduct,
  t,
}: {
  product: Product | null;
  itemType: ItemType | null;
  onReset: () => void;
  onResetToProduct: () => void;
  t: typeof THEME.dark;
}) => (
  <nav className="flex items-center gap-2 text-sm flex-wrap mb-6">
    <button
      onClick={onReset}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
      style={{
        background: !product ? `${t.accent}15` : "transparent",
        color: !product ? t.accent : t.textSecondary,
      }}
    >
      <Home className="w-4 h-4" />
      <span className="font-medium">Catalogue</span>
    </button>

    {product && (
      <>
        <ChevronRight className="w-4 h-4" style={{ color: t.textMuted }} />
        <button
          onClick={onResetToProduct}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
          style={{
            background: !itemType ? `${t.accent}15` : "transparent",
            color: !itemType ? t.accent : t.textSecondary,
          }}
        >
          <Package className="w-4 h-4" />
          <span className="font-medium">{product.name}</span>
        </button>
      </>
    )}

    {itemType && (
      <>
        <ChevronRight className="w-4 h-4" style={{ color: t.textMuted }} />
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: `${t.accent}15`, color: t.accent }}
        >
          <Layers className="w-4 h-4" />
          <span className="font-medium">{itemType.description}</span>
        </div>
      </>
    )}
  </nav>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CataloguePage() {
  const { status } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t = THEME[mode];
  const colors = CHART_PALETTE[mode];

  // Navigation state
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  // Selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(null);
  const [primaryItem, setPrimaryItem] = useState<Item | null>(null);
  const [compareItem, setCompareItem] = useState<Item | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);

  // Prices state
  const [primaryPrices, setPrimaryPrices] = useState<ItemPrices | null>(null);
  const [comparePrices, setComparePrices] = useState<ItemPrices | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, priceListsRes] = await Promise.all([
          fetch("/api/catalogue/products"),
          fetch("/api/catalogue/pricelists"),
        ]);

        if (productsRes.ok) setProducts(await productsRes.json());
        if (priceListsRes.ok) {
          const lists = await priceListsRes.json();
          setPriceLists(lists);
          if (lists.length > 0) setSelectedPriceList(lists[0]);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") fetchInitialData();
  }, [status]);

  // Load item types when product is selected
  useEffect(() => {
    if (!selectedProduct) {
      setItemTypes([]);
      return;
    }

    const fetchItemTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const res = await fetch(`/api/catalogue/itemtypes?prodId=${selectedProduct.prodId}`);
        if (res.ok) setItemTypes(await res.json());
      } catch (error) {
        console.error("Error fetching item types:", error);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchItemTypes();
  }, [selectedProduct]);

  // Load items when item type is selected
  useEffect(() => {
    if (!selectedProduct || !selectedItemType) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const res = await fetch(
          `/api/catalogue/items?prodId=${selectedProduct.prodId}&itemTypeId=${selectedItemType.itemTypeId}`
        );
        if (res.ok) setItems(await res.json());
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedProduct, selectedItemType]);

  // Load prices when primary item changes
  useEffect(() => {
    if (!primaryItem) {
      setPrimaryPrices(null);
      return;
    }

    const fetchPrices = async () => {
      setIsLoadingPrices(true);
      try {
        const res = await fetch(`/api/catalogue/prices?itemId=${primaryItem.itemId}`);
        if (res.ok) setPrimaryPrices(await res.json());
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchPrices();
  }, [primaryItem]);

  // Load compare prices
  useEffect(() => {
    if (!compareItem) {
      setComparePrices(null);
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/catalogue/prices?itemId=${compareItem.itemId}`);
        if (res.ok) setComparePrices(await res.json());
      } catch (error) {
        console.error("Error fetching compare prices:", error);
      }
    };

    fetchPrices();
  }, [compareItem]);

  // Handlers
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedItemType(null);
  };

  const handleSelectItemType = (type: ItemType) => {
    setSelectedItemType(type);
  };

  const handleSelectItem = (item: Item, slot: "primary" | "compare") => {
    if (slot === "primary") {
      // If clicking on the same item, deselect it
      if (primaryItem?.itemId === item.itemId) {
        setPrimaryItem(null);
      } else {
        setPrimaryItem(item);
      }
    } else {
      // If clicking on the same compare item, deselect it
      if (compareItem?.itemId === item.itemId) {
        setCompareItem(null);
      } else {
        setCompareItem(item);
      }
    }
  };

  const handleClear = (slot: "primary" | "compare" | "all") => {
    if (slot === "primary" || slot === "all") {
      setPrimaryItem(null);
      setPrimaryPrices(null);
    }
    if (slot === "compare" || slot === "all") {
      setCompareItem(null);
      setComparePrices(null);
    }
    if (slot === "all") setIsPanelOpen(false);
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setSelectedItemType(null);
    setItemTypes([]);
    setItems([]);
  };

  const handleResetToProduct = () => {
    setSelectedItemType(null);
    setItems([]);
  };

  // Determine current view
  const showCategories = !selectedProduct;
  const showTypes = selectedProduct && !selectedItemType;
  const showItems = selectedProduct && selectedItemType;

  if (!mounted) return null;

  return (
    <main
      className="min-h-screen"
      style={{ background: t.void, color: t.textPrimary }}
    >
      <GlobalStyles />

      <div className="max-w-[1600px] mx-auto px-6 py-8 pb-32">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="p-3 rounded-xl"
              style={{ background: `${t.accent}20` }}
            >
              <Zap className="w-7 h-7" style={{ color: t.accent }} />
            </div>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ color: t.textPrimary }}
              >
                Catalogue Produits
              </h1>
              <p className="text-base mt-1" style={{ color: t.textSecondary }}>
                Explorez notre gamme complète et comparez les prix
              </p>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="mb-8">
          <SearchAutocomplete
            onSelect={handleSelectItem}
            t={t}
            colors={colors}
          />
        </div>

        {/* Breadcrumb */}
        <Breadcrumb
          product={selectedProduct}
          itemType={selectedItemType}
          onReset={handleReset}
          onResetToProduct={handleResetToProduct}
          t={t}
        />

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: t.accent }} />
          </div>
        )}

        {/* Categories (Level 1) */}
        {!isLoading && showCategories && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Package className="w-6 h-6" style={{ color: t.accent }} />
                Catégories de produits
              </h2>
              <span className="text-sm" style={{ color: t.textMuted }}>
                {products.length} catégories
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product, index) => (
                <HeroCategoryCard
                  key={product.prodId}
                  title={product.name}
                  count={product.itemCount}
                  icon={Package}
                  onClick={() => handleSelectProduct(product)}
                  isSelected={selectedProduct?.prodId === product.prodId}
                  color={colors[index % colors.length]}
                  t={t}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}

        {/* Item Types (Level 2) */}
        {!isLoading && showTypes && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Layers className="w-6 h-6" style={{ color: t.accent }} />
                Types d'articles
              </h2>
              <span className="text-sm" style={{ color: t.textMuted }}>
                {itemTypes.length} types
              </span>
            </div>

            {isLoadingTypes ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: t.accent }} />
              </div>
            ) : itemTypes.length === 0 ? (
              <div
                className="p-12 rounded-2xl text-center"
                style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
              >
                <Layers className="w-12 h-12 mx-auto mb-4" style={{ color: t.textMuted }} />
                <p style={{ color: t.textSecondary }}>
                  Aucun type d'article dans cette catégorie
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemTypes.map((type, index) => (
                  <ItemTypePill
                    key={type.itemTypeId}
                    type={type}
                    onClick={() => handleSelectItemType(type)}
                    isSelected={selectedItemType?.itemTypeId === type.itemTypeId}
                    color={colors[index % colors.length]}
                    t={t}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Items (Level 3) */}
        {!isLoading && showItems && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Tag className="w-6 h-6" style={{ color: t.accent }} />
                Articles
              </h2>
              <span className="text-sm" style={{ color: t.textMuted }}>
                {items.length} articles
              </span>
            </div>

            {isLoadingItems ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: t.accent }} />
              </div>
            ) : items.length === 0 ? (
              <div
                className="p-12 rounded-2xl text-center"
                style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
              >
                <Tag className="w-12 h-12 mx-auto mb-4" style={{ color: t.textMuted }} />
                <p style={{ color: t.textSecondary }}>
                  Aucun article dans cette catégorie
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item, index) => (
                  <ItemCard
                    key={item.itemId}
                    item={item}
                    onSelect={handleSelectItem}
                    isPrimary={primaryItem?.itemId === item.itemId}
                    isCompare={compareItem?.itemId === item.itemId}
                    t={t}
                    colors={colors}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Floating Compare Button */}
      <CompareButton
        primaryItem={primaryItem}
        compareItem={compareItem}
        onClear={handleClear}
        onTogglePanel={() => setIsPanelOpen(true)}
        isPanelOpen={isPanelOpen}
        t={t}
        colors={colors}
      />

      {/* Price Comparison Panel */}
      <PriceComparisonPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        primaryItem={primaryItem}
        compareItem={compareItem}
        primaryPrices={primaryPrices}
        comparePrices={comparePrices}
        priceLists={priceLists}
        selectedPriceList={selectedPriceList}
        onSelectPriceList={setSelectedPriceList}
        isLoading={isLoadingPrices}
        t={t}
        colors={colors}
      />
    </main>
  );
}
