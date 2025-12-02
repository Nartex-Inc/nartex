// src/app/dashboard/catalogue/page.tsx
// SINTO Premium Item Catalogue - iPad Optimized
// Frontend skeleton with mock data - NO backend dependencies
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronRight,
  Package,
  Layers,
  Tag,
  X,
  Check,
  Home,
  Scale,
  Eye,
  Copy,
  CheckCheck,
  Info,
  Zap,
  ArrowRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   Theme System
   ═══════════════════════════════════════════════════════════════════════════════ */
interface ThemeTokens {
  void: string;
  surface1: string;
  surface2: string;
  surface3: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  borderSubtle: string;
  borderDefault: string;
  accent: string;
  accentMuted: string;
  secondary: string;
  tertiary: string;
  success: string;
  warning: string;
  danger: string;
  glass: string;
  gradientStart: string;
  gradientEnd: string;
}

const THEME: { light: ThemeTokens; dark: ThemeTokens } = {
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
    glass: "rgba(255,255,255,0.85)",
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
    glass: "rgba(10,10,10,0.9)",
    gradientStart: "#1ED760",
    gradientEnd: "#10B981",
  },
};

const COLORS = ["#1ED760", "#818CF8", "#F472B6", "#FBBF24", "#2DD4BF", "#A78BFA"];

/* ═══════════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════════ */
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
  itemSubTypeId: number;
  productName: string;
  typeDescription: string;
}

interface PriceList {
  priceId: number;
  name: string;
  currency: string;
}

interface PriceRange {
  qtyMin: number;
  qtyMax: number | null;
  unitPrice: number;
}

interface PriceData {
  priceId: number;
  priceListName: string;
  currency: string;
  ranges: PriceRange[];
}

interface ItemPrices {
  itemId: number;
  priceLists: PriceData[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Mock Data - Replace with API calls when ready
   ═══════════════════════════════════════════════════════════════════════════════ */
const MOCK_PRODUCTS: Product[] = [
  { prodId: 1, name: "100(G)-TRAITEMENT DE CARBURANT", itemCount: 45 },
  { prodId: 2, name: "110-HUILES MOTEUR", itemCount: 128 },
  { prodId: 3, name: "120-HUILES HYDRAULIQUES", itemCount: 89 },
  { prodId: 4, name: "130-HUILES TRANSMISSION", itemCount: 67 },
  { prodId: 5, name: "140-GRAISSES INDUSTRIELLES", itemCount: 156 },
  { prodId: 6, name: "150-LUBRIFIANTS ALIMENTAIRES", itemCount: 34 },
  { prodId: 7, name: "160-FLUIDES DE COUPE", itemCount: 78 },
  { prodId: 8, name: "170-NETTOYANTS INDUSTRIELS", itemCount: 92 },
  { prodId: 9, name: "180-PRODUITS SPÉCIALISÉS", itemCount: 56 },
  { prodId: 10, name: "190-ÉQUIPEMENTS", itemCount: 43 },
  { prodId: 11, name: "200-ADDITIFS", itemCount: 67 },
  { prodId: 12, name: "210-ANTIGELS", itemCount: 28 },
];

const MOCK_ITEM_TYPES: Record<number, ItemType[]> = {
  1: [
    { itemTypeId: 101, description: "100.1-DIESEL ADDITIFS", itemCount: 15 },
    { itemTypeId: 102, description: "100.2-ESSENCE ADDITIFS", itemCount: 12 },
    { itemTypeId: 103, description: "100.3-STABILISANTS CARBURANT", itemCount: 18 },
  ],
  2: [
    { itemTypeId: 201, description: "110.1-HUILE HME 0W20", itemCount: 22 },
    { itemTypeId: 202, description: "110.2-HUILE HME 5W30", itemCount: 35 },
    { itemTypeId: 203, description: "110.3-HUILE HME 10W40", itemCount: 28 },
    { itemTypeId: 204, description: "110.4-HUILE SYNTHÉTIQUE", itemCount: 43 },
  ],
  3: [
    { itemTypeId: 301, description: "120.1-HYDRAULIQUE ISO 32", itemCount: 30 },
    { itemTypeId: 302, description: "120.2-HYDRAULIQUE ISO 46", itemCount: 35 },
    { itemTypeId: 303, description: "120.3-HYDRAULIQUE ISO 68", itemCount: 24 },
  ],
  4: [
    { itemTypeId: 401, description: "130.1-ATF DEXRON", itemCount: 22 },
    { itemTypeId: 402, description: "130.2-HUILE ENGRENAGES", itemCount: 25 },
    { itemTypeId: 403, description: "130.3-FLUIDE CVT", itemCount: 20 },
  ],
  5: [
    { itemTypeId: 501, description: "140.1-GRAISSE LITHIUM", itemCount: 45 },
    { itemTypeId: 502, description: "140.2-GRAISSE COMPLEXE", itemCount: 38 },
    { itemTypeId: 503, description: "140.3-GRAISSE HAUTE TEMP", itemCount: 42 },
    { itemTypeId: 504, description: "140.4-GRAISSE ALIMENTAIRE", itemCount: 31 },
  ],
};

const MOCK_ITEMS: Record<string, Item[]> = {
  "1-101": [
    { itemId: 1001, itemCode: "DC-001", description: "Additif diesel premium 1L", prodId: 1, itemSubTypeId: 101, productName: "TRAITEMENT CARBURANT", typeDescription: "DIESEL ADDITIFS" },
    { itemId: 1002, itemCode: "DC-002", description: "Additif diesel premium 4L", prodId: 1, itemSubTypeId: 101, productName: "TRAITEMENT CARBURANT", typeDescription: "DIESEL ADDITIFS" },
    { itemId: 1003, itemCode: "DC-003", description: "Nettoyant injecteurs diesel 500ml", prodId: 1, itemSubTypeId: 101, productName: "TRAITEMENT CARBURANT", typeDescription: "DIESEL ADDITIFS" },
    { itemId: 1004, itemCode: "DC-004", description: "Anti-gel diesel concentré 1L", prodId: 1, itemSubTypeId: 101, productName: "TRAITEMENT CARBURANT", typeDescription: "DIESEL ADDITIFS" },
  ],
  "2-201": [
    { itemId: 2001, itemCode: "HME-0W20-1L", description: "Huile moteur synthétique 0W20 1L", prodId: 2, itemSubTypeId: 201, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 0W20" },
    { itemId: 2002, itemCode: "HME-0W20-4L", description: "Huile moteur synthétique 0W20 4L", prodId: 2, itemSubTypeId: 201, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 0W20" },
    { itemId: 2003, itemCode: "HME-0W20-20L", description: "Huile moteur synthétique 0W20 20L", prodId: 2, itemSubTypeId: 201, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 0W20" },
    { itemId: 2004, itemCode: "HME-0W20-205L", description: "Huile moteur synthétique 0W20 Baril 205L", prodId: 2, itemSubTypeId: 201, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 0W20" },
  ],
  "2-202": [
    { itemId: 2101, itemCode: "HME-5W30-1L", description: "Huile moteur synthétique 5W30 1L", prodId: 2, itemSubTypeId: 202, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 5W30" },
    { itemId: 2102, itemCode: "HME-5W30-4L", description: "Huile moteur synthétique 5W30 4L", prodId: 2, itemSubTypeId: 202, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 5W30" },
    { itemId: 2103, itemCode: "HME-5W30-20L", description: "Huile moteur synthétique 5W30 20L", prodId: 2, itemSubTypeId: 202, productName: "HUILES MOTEUR", typeDescription: "HUILE HME 5W30" },
  ],
};

const MOCK_PRICE_LISTS: PriceList[] = [
  { priceId: 1, name: "01-DISTRIBUTEUR", currency: "CAD" },
  { priceId: 2, name: "02-DÉTAILLANT", currency: "CAD" },
  { priceId: 3, name: "03-COMMERCIAL", currency: "CAD" },
  { priceId: 4, name: "04-INDUSTRIEL", currency: "CAD" },
];

const generateMockPrices = (itemId: number): ItemPrices => ({
  itemId,
  priceLists: MOCK_PRICE_LISTS.map((pl) => ({
    priceId: pl.priceId,
    priceListName: pl.name,
    currency: pl.currency,
    ranges: [
      { qtyMin: 1, qtyMax: 5, unitPrice: 45.99 + (pl.priceId * 2) + (itemId % 10) },
      { qtyMin: 6, qtyMax: 11, unitPrice: 42.99 + (pl.priceId * 2) + (itemId % 10) },
      { qtyMin: 12, qtyMax: 47, unitPrice: 39.99 + (pl.priceId * 2) + (itemId % 10) },
      { qtyMin: 48, qtyMax: null, unitPrice: 35.99 + (pl.priceId * 2) + (itemId % 10) },
    ],
  })),
});

/* ═══════════════════════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════════════════════ */
const currency = (n: number, curr = "CAD") =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);

const formatNumber = (n: number) => new Intl.NumberFormat("fr-CA").format(n);

/* ═══════════════════════════════════════════════════════════════════════════════
   Global CSS
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
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(30,215,96,0.3); }
      50% { box-shadow: 0 0 40px rgba(30,215,96,0.5); }
    }
    .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
    .animate-slideUp { animation: slideUp 0.5s ease-out forwards; }
    .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
    .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
    .animate-glow { animation: glow 2s ease-in-out infinite; }
    .glassmorphism {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-hover:hover {
      transform: translateY(-2px);
    }
    @media (hover: none) {
      .card-hover:hover {
        transform: none;
      }
    }
    @media (pointer: coarse) {
      button, .clickable {
        min-height: 48px;
        min-width: 48px;
      }
    }
    .scroll-container {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Hero Category Card - Large touch-friendly buttons for iPad
   ═══════════════════════════════════════════════════════════════════════════════ */
interface HeroCategoryCardProps {
  title: string;
  count: number;
  onClick: () => void;
  isSelected: boolean;
  color: string;
  t: ThemeTokens;
  index: number;
}

const HeroCategoryCard = ({
  title,
  count,
  onClick,
  isSelected,
  color,
  t,
  index,
}: HeroCategoryCardProps) => (
  <button
    onClick={onClick}
    className="group relative w-full text-left card-hover animate-fadeIn"
    style={{ animationDelay: `${index * 40}ms` }}
  >
    <div
      className="relative overflow-hidden rounded-2xl p-[2px]"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${color}, ${t.accent})`
          : t.borderSubtle,
      }}
    >
      <div
        className="relative rounded-2xl p-5 md:p-6 overflow-hidden min-h-[140px] md:min-h-[160px]"
        style={{ background: isSelected ? `${color}15` : t.surface2 }}
      >
        <div
          className="absolute -right-6 -top-6 w-24 h-24 md:w-32 md:h-32 rounded-full opacity-10 transition-all duration-500"
          style={{ background: color }}
        />
        
        {isSelected && (
          <div
            className="absolute top-3 right-3 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center animate-scaleIn"
            style={{ background: color }}
          >
            <Check className="w-4 h-4 md:w-5 md:h-5" style={{ color: t.void }} />
          </div>
        )}

        <div
          className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-3 md:mb-4"
          style={{
            background: `${color}20`,
            boxShadow: isSelected ? `0 0 30px ${color}40` : "none",
          }}
        >
          <Package className="w-6 h-6 md:w-7 md:h-7" style={{ color }} />
        </div>

        <h3
          className="font-bold text-base md:text-lg mb-2 line-clamp-2"
          style={{ color: isSelected ? color : t.textPrimary }}
        >
          {title}
        </h3>

        <span
          className="text-xs md:text-sm font-mono px-2 py-1 md:px-3 md:py-1 rounded-lg inline-block"
          style={{ background: t.surface3, color: t.textSecondary }}
        >
          {formatNumber(count)} articles
        </span>

        <div
          className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center"
          style={{ background: isSelected ? color : t.surface3 }}
        >
          <ArrowRight
            className="w-4 h-4 md:w-5 md:h-5"
            style={{ color: isSelected ? t.void : t.textMuted }}
          />
        </div>
      </div>
    </div>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Item Type Pill
   ═══════════════════════════════════════════════════════════════════════════════ */
interface ItemTypePillProps {
  type: ItemType;
  onClick: () => void;
  isSelected: boolean;
  color: string;
  t: ThemeTokens;
  index: number;
}

const ItemTypePill = ({ type, onClick, isSelected, color, t, index }: ItemTypePillProps) => (
  <button
    onClick={onClick}
    className="group relative text-left transition-all duration-300 animate-fadeIn w-full"
    style={{ animationDelay: `${index * 30}ms` }}
  >
    <div
      className="relative overflow-hidden rounded-xl p-4 md:p-5 border transition-all duration-300"
      style={{
        background: isSelected ? `${color}15` : t.surface2,
        borderColor: isSelected ? `${color}50` : t.borderSubtle,
      }}
    >
      {isSelected && (
        <div
          className="absolute inset-0 rounded-xl animate-pulse-ring pointer-events-none"
          style={{ border: `2px solid ${color}` }}
        />
      )}

      <div className="flex items-center gap-3 md:gap-4">
        <div
          className="w-11 h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: isSelected ? color : `${color}20` }}
        >
          <Layers
            className="w-5 h-5 md:w-6 md:h-6"
            style={{ color: isSelected ? t.void : color }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm md:text-base truncate"
            style={{ color: isSelected ? color : t.textPrimary }}
          >
            {type.description}
          </p>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: t.textMuted }}>
            {formatNumber(type.itemCount)} articles
          </p>
        </div>

        <ChevronRight
          className="w-5 h-5 shrink-0"
          style={{ color: isSelected ? color : t.textMuted }}
        />
      </div>
    </div>
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Item Card
   ═══════════════════════════════════════════════════════════════════════════════ */
interface ItemCardProps {
  item: Item;
  onSelect: (item: Item, slot: "primary" | "compare") => void;
  isPrimary: boolean;
  isCompare: boolean;
  t: ThemeTokens;
  colors: string[];
  index: number;
}

const ItemCard = ({ item, onSelect, isPrimary, isCompare, t, colors, index }: ItemCardProps) => {
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
      className="group relative rounded-xl border transition-all duration-300 card-hover animate-fadeIn"
      style={{
        background: isSelected ? `${selectionColor}10` : t.surface2,
        borderColor: isSelected ? `${selectionColor}40` : t.borderSubtle,
        animationDelay: `${index * 40}ms`,
      }}
    >
      {isSelected && (
        <div
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center z-10 animate-scaleIn"
          style={{ background: selectionColor }}
        >
          <span className="text-xs font-bold" style={{ color: t.void }}>
            {isPrimary ? "1" : "2"}
          </span>
        </div>
      )}

      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${t.accent}20` }}
            >
              <Tag className="w-4 h-4 md:w-5 md:h-5" style={{ color: t.accent }} />
            </div>
            <span
              className="font-mono font-bold text-base md:text-lg"
              style={{ color: isSelected ? selectionColor : t.textPrimary }}
            >
              {item.itemCode}
            </span>
          </div>
          
          <button
            onClick={handleCopy}
            className="p-2 md:p-3 rounded-lg transition-all active:scale-95"
            style={{ background: t.surface3 }}
          >
            {copied ? (
              <CheckCheck className="w-4 h-4 md:w-5 md:h-5" style={{ color: t.success }} />
            ) : (
              <Copy className="w-4 h-4 md:w-5 md:h-5" style={{ color: t.textMuted }} />
            )}
          </button>
        </div>

        <p className="text-sm md:text-base line-clamp-2 mb-3" style={{ color: t.textSecondary }}>
          {item.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {item.productName && (
            <span
              className="text-xs px-2 py-1 rounded-md"
              style={{ background: t.surface3, color: t.textTertiary }}
            >
              {item.productName}
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: t.borderSubtle }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(item, "primary"); }}
            className="flex-1 py-3 px-4 rounded-xl text-sm md:text-base font-semibold transition-all active:scale-98"
            style={{
              background: isPrimary ? colors[0] : t.surface3,
              color: isPrimary ? t.void : t.textSecondary,
            }}
          >
            {isPrimary ? "✓ Sélectionné" : "Sélectionner"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(item, "compare"); }}
            className="flex-1 py-3 px-4 rounded-xl text-sm md:text-base font-semibold transition-all active:scale-98"
            style={{
              background: isCompare ? colors[1] : t.surface3,
              color: isCompare ? t.void : t.textSecondary,
            }}
          >
            {isCompare ? "✓ Comparé" : "Comparer"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Search Bar
   ═══════════════════════════════════════════════════════════════════════════════ */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  t: ThemeTokens;
}

const SearchBar = ({ value, onChange, t }: SearchBarProps) => (
  <div
    className="relative rounded-2xl p-[1px] transition-all duration-300"
    style={{
      background: value ? `linear-gradient(135deg, ${t.accent}, ${t.secondary})` : t.borderSubtle,
    }}
  >
    <div className="relative rounded-2xl overflow-hidden" style={{ background: t.surface2 }}>
      <Search
        className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 pointer-events-none"
        style={{ color: t.textMuted }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher par code ou description..."
        className="w-full pl-12 md:pl-14 pr-4 md:pr-6 py-4 md:py-5 text-base md:text-lg bg-transparent focus:outline-none"
        style={{ color: t.textPrimary }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 p-2 rounded-lg"
          style={{ background: t.surface3 }}
        >
          <X className="w-4 h-4 md:w-5 md:h-5" style={{ color: t.textMuted }} />
        </button>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Floating Compare Button
   ═══════════════════════════════════════════════════════════════════════════════ */
interface CompareButtonProps {
  primaryItem: Item | null;
  compareItem: Item | null;
  onClear: (slot: "primary" | "compare" | "all") => void;
  onTogglePanel: () => void;
  t: ThemeTokens;
  colors: string[];
}

const CompareButton = ({ primaryItem, compareItem, onClear, onTogglePanel, t, colors }: CompareButtonProps) => {
  const hasSelection = primaryItem || compareItem;
  const hasComparison = primaryItem && compareItem;

  if (!hasSelection) return null;

  return (
    <div className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50 animate-slideUp">
      <div
        className="rounded-2xl p-[2px] shadow-2xl"
        style={{
          background: hasComparison
            ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
            : colors[0],
        }}
      >
        <div
          className="rounded-2xl px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 glassmorphism"
          style={{ background: t.glass }}
        >
          <div className="flex items-center gap-2 md:gap-3 flex-1 md:flex-none overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
              style={{
                background: primaryItem ? `${colors[0]}20` : t.surface3,
                border: `1px solid ${primaryItem ? colors[0] : t.borderSubtle}`,
              }}
            >
              {primaryItem ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[0] }} />
                  <span className="font-mono font-semibold text-xs md:text-sm truncate max-w-[80px] md:max-w-none" style={{ color: colors[0] }}>
                    {primaryItem.itemCode}
                  </span>
                  <button onClick={() => onClear("primary")} className="p-1">
                    <X className="w-3 h-3" style={{ color: colors[0] }} />
                  </button>
                </>
              ) : (
                <span className="text-xs md:text-sm" style={{ color: t.textMuted }}>Art. 1</span>
              )}
            </div>

            <div
              className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
              style={{
                background: hasComparison ? `${colors[1]}20` : t.surface3,
                color: hasComparison ? colors[1] : t.textMuted,
              }}
            >
              VS
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
              style={{
                background: compareItem ? `${colors[1]}20` : t.surface3,
                border: `1px solid ${compareItem ? colors[1] : t.borderSubtle}`,
              }}
            >
              {compareItem ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[1] }} />
                  <span className="font-mono font-semibold text-xs md:text-sm truncate max-w-[80px] md:max-w-none" style={{ color: colors[1] }}>
                    {compareItem.itemCode}
                  </span>
                  <button onClick={() => onClear("compare")} className="p-1">
                    <X className="w-3 h-3" style={{ color: colors[1] }} />
                  </button>
                </>
              ) : (
                <span className="text-xs md:text-sm" style={{ color: t.textMuted }}>Art. 2</span>
              )}
            </div>
          </div>

          <button
            onClick={onTogglePanel}
            className={`px-5 md:px-8 py-3 rounded-xl font-bold text-sm md:text-base transition-all active:scale-95 shrink-0 ${hasComparison ? "animate-glow" : ""}`}
            style={{
              background: hasComparison
                ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
                : colors[0],
              color: t.void,
            }}
          >
            <span className="flex items-center gap-2">
              {hasComparison ? (
                <>
                  <Scale className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden md:inline">Comparer</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden md:inline">Voir prix</span>
                </>
              )}
            </span>
          </button>

          <button
            onClick={() => onClear("all")}
            className="p-2 md:p-3 rounded-lg shrink-0"
            style={{ background: t.surface3 }}
          >
            <X className="w-4 h-4 md:w-5 md:h-5" style={{ color: t.textMuted }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Price Comparison Panel
   ═══════════════════════════════════════════════════════════════════════════════ */
interface PriceComparisonPanelProps {
  isOpen: boolean;
  onClose: () => void;
  primaryItem: Item | null;
  compareItem: Item | null;
  primaryPrices: ItemPrices | null;
  comparePrices: ItemPrices | null;
  priceLists: PriceList[];
  selectedPriceList: PriceList | null;
  onSelectPriceList: (pl: PriceList) => void;
  t: ThemeTokens;
  colors: string[];
}

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
  t,
  colors,
}: PriceComparisonPanelProps) => {
  if (!isOpen) return null;

  const primaryPriceData = primaryPrices?.priceLists.find(
    (pl) => pl.priceId === selectedPriceList?.priceId
  );
  const comparePriceData = comparePrices?.priceLists.find(
    (pl) => pl.priceId === selectedPriceList?.priceId
  );

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] md:max-h-[85vh] rounded-t-3xl overflow-hidden animate-slideUp scroll-container"
        style={{ background: t.surface1 }}
      >
        <div
          className="sticky top-0 z-10 px-4 md:px-6 py-4 md:py-5 border-b flex items-center justify-between"
          style={{ background: t.surface2, borderColor: t.borderSubtle }}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2.5 md:p-3 rounded-xl" style={{ background: `${t.accent}20` }}>
              <Scale className="w-5 h-5 md:w-6 md:h-6" style={{ color: t.accent }} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold" style={{ color: t.textPrimary }}>
                Comparaison des prix
              </h2>
              <p className="text-xs md:text-sm mt-0.5" style={{ color: t.textSecondary }}>
                {primaryItem?.itemCode}
                {compareItem && ` vs ${compareItem.itemCode}`}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-3 rounded-xl" style={{ background: t.surface3 }}>
            <X className="w-5 h-5" style={{ color: t.textMuted }} />
          </button>
        </div>

        <div className="px-4 md:px-6 py-4 border-b hide-scrollbar" style={{ borderColor: t.borderSubtle }}>
          <p className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>
            Liste de prix
          </p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {priceLists.map((pl) => (
              <button
                key={pl.priceId}
                onClick={() => onSelectPriceList(pl)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0"
                style={{
                  background: selectedPriceList?.priceId === pl.priceId ? t.accent : t.surface3,
                  color: selectedPriceList?.priceId === pl.priceId ? t.void : t.textSecondary,
                }}
              >
                {pl.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-180px)] md:max-h-[calc(85vh-180px)]">
          <div className={`grid gap-4 md:gap-6 ${compareItem ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
            {primaryItem && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ background: colors[0] }} />
                  <span className="font-mono font-bold text-lg" style={{ color: colors[0] }}>
                    {primaryItem.itemCode}
                  </span>
                </div>
                <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
                  {primaryItem.description}
                </p>

                {primaryPriceData ? (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.borderSubtle}` }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: t.surface3 }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: t.textMuted }}>
                            Quantité
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: t.textMuted }}>
                            Prix unitaire
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {primaryPriceData.ranges.map((range, i) => (
                          <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${t.borderSubtle}` : undefined }}>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm" style={{ color: t.textPrimary }}>
                                {range.qtyMin}{range.qtyMax ? ` — ${range.qtyMax}` : "+"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono font-bold text-lg" style={{ color: colors[0] }}>
                                {currency(range.unitPrice, primaryPriceData.currency)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl text-center" style={{ background: t.surface2 }}>
                    <Info className="w-10 h-10 mx-auto mb-3" style={{ color: t.warning }} />
                    <p style={{ color: t.textSecondary }}>Aucun prix disponible</p>
                  </div>
                )}
              </div>
            )}

            {compareItem && (
              <div className="animate-fadeIn" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ background: colors[1] }} />
                  <span className="font-mono font-bold text-lg" style={{ color: colors[1] }}>
                    {compareItem.itemCode}
                  </span>
                </div>
                <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
                  {compareItem.description}
                </p>

                {comparePriceData ? (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.borderSubtle}` }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: t.surface3 }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: t.textMuted }}>
                            Quantité
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: t.textMuted }}>
                            Prix unitaire
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparePriceData.ranges.map((range, i) => (
                          <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${t.borderSubtle}` : undefined }}>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm" style={{ color: t.textPrimary }}>
                                {range.qtyMin}{range.qtyMax ? ` — ${range.qtyMax}` : "+"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono font-bold text-lg" style={{ color: colors[1] }}>
                                {currency(range.unitPrice, comparePriceData.currency)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl text-center" style={{ background: t.surface2 }}>
                    <Info className="w-10 h-10 mx-auto mb-3" style={{ color: t.warning }} />
                    <p style={{ color: t.textSecondary }}>Aucun prix disponible</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Breadcrumb
   ═══════════════════════════════════════════════════════════════════════════════ */
interface BreadcrumbProps {
  product: Product | null;
  itemType: ItemType | null;
  onReset: () => void;
  onResetToProduct: () => void;
  t: ThemeTokens;
}

const Breadcrumb = ({ product, itemType, onReset, onResetToProduct, t }: BreadcrumbProps) => (
  <nav className="flex items-center gap-2 text-sm flex-wrap mb-6 overflow-x-auto hide-scrollbar pb-2">
    <button
      onClick={onReset}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all shrink-0"
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
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: t.textMuted }} />
        <button
          onClick={onResetToProduct}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all shrink-0"
          style={{
            background: !itemType ? `${t.accent}15` : "transparent",
            color: !itemType ? t.accent : t.textSecondary,
          }}
        >
          <Package className="w-4 h-4" />
          <span className="font-medium truncate max-w-[150px]">{product.name}</span>
        </button>
      </>
    )}

    {itemType && (
      <>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: t.textMuted }} />
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg shrink-0"
          style={{ background: `${t.accent}15`, color: t.accent }}
        >
          <Layers className="w-4 h-4" />
          <span className="font-medium truncate max-w-[150px]">{itemType.description}</span>
        </div>
      </>
    )}
  </nav>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CataloguePage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  const t = THEME[isDark ? "dark" : "light"];
  const colors = COLORS;

  // Navigation state
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists] = useState<PriceList[]>(MOCK_PRICE_LISTS);

  // Selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(null);
  const [primaryItem, setPrimaryItem] = useState<Item | null>(null);
  const [compareItem, setCompareItem] = useState<Item | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList>(MOCK_PRICE_LISTS[0]);

  // Prices state
  const [primaryPrices, setPrimaryPrices] = useState<ItemPrices | null>(null);
  const [comparePrices, setComparePrices] = useState<ItemPrices | null>(null);

  // UI state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Handlers
  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setSelectedItemType(null);
    setItems([]);
    const types = MOCK_ITEM_TYPES[product.prodId] || [];
    setItemTypes(types);
  }, []);

  const handleSelectItemType = useCallback((type: ItemType) => {
    setSelectedItemType(type);
    const key = `${selectedProduct?.prodId}-${type.itemTypeId}`;
    const itemList = MOCK_ITEMS[key] || [];
    setItems(itemList);
  }, [selectedProduct]);

  const handleSelectItem = useCallback((item: Item, slot: "primary" | "compare") => {
    if (slot === "primary") {
      if (primaryItem?.itemId === item.itemId) {
        setPrimaryItem(null);
        setPrimaryPrices(null);
      } else {
        setPrimaryItem(item);
        setPrimaryPrices(generateMockPrices(item.itemId));
      }
    } else {
      if (compareItem?.itemId === item.itemId) {
        setCompareItem(null);
        setComparePrices(null);
      } else {
        setCompareItem(item);
        setComparePrices(generateMockPrices(item.itemId));
      }
    }
  }, [primaryItem, compareItem]);

  const handleClear = useCallback((slot: "primary" | "compare" | "all") => {
    if (slot === "primary" || slot === "all") {
      setPrimaryItem(null);
      setPrimaryPrices(null);
    }
    if (slot === "compare" || slot === "all") {
      setCompareItem(null);
      setComparePrices(null);
    }
    if (slot === "all") setIsPanelOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedProduct(null);
    setSelectedItemType(null);
    setItemTypes([]);
    setItems([]);
  }, []);

  const handleResetToProduct = useCallback(() => {
    setSelectedItemType(null);
    setItems([]);
  }, []);

  // Determine current view
  const showCategories = !selectedProduct;
  const showTypes = selectedProduct && !selectedItemType;
  const showItems = selectedProduct && selectedItemType;

  // Filter items by search
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.itemCode.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  if (!mounted) return null;

  return (
    <main className="min-h-screen scroll-container" style={{ background: t.void, color: t.textPrimary }}>
      <GlobalStyles />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-32">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 rounded-xl" style={{ background: `${t.accent}20` }}>
                <Zap className="w-6 h-6 md:w-7 md:h-7" style={{ color: t.accent }} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                  Catalogue Produits
                </h1>
                <p className="text-sm md:text-base mt-1" style={{ color: t.textSecondary }}>
                  Explorez notre gamme complète
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-3 rounded-xl"
              style={{ background: t.surface2 }}
            >
              <span className="text-xl">{isDark ? "☀️" : "🌙"}</span>
            </button>
          </div>
        </header>

        {/* Search */}
        {showItems && (
          <div className="mb-6">
            <SearchBar value={searchQuery} onChange={setSearchQuery} t={t} />
          </div>
        )}

        {/* Breadcrumb */}
        <Breadcrumb
          product={selectedProduct}
          itemType={selectedItemType}
          onReset={handleReset}
          onResetToProduct={handleResetToProduct}
          t={t}
        />

        {/* Categories (Level 1) */}
        {showCategories && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 md:gap-3">
                <Package className="w-5 h-5 md:w-6 md:h-6" style={{ color: t.accent }} />
                Catégories de produits
              </h2>
              <span className="text-xs md:text-sm" style={{ color: t.textMuted }}>
                {products.length} catégories
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product, index) => (
                <HeroCategoryCard
                  key={product.prodId}
                  title={product.name}
                  count={product.itemCount}
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
        {showTypes && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 md:gap-3">
                <Layers className="w-5 h-5 md:w-6 md:h-6" style={{ color: t.accent }} />
                Types d&apos;articles
              </h2>
              <span className="text-xs md:text-sm" style={{ color: t.textMuted }}>
                {itemTypes.length} types
              </span>
            </div>

            {itemTypes.length === 0 ? (
              <div
                className="p-10 md:p-12 rounded-2xl text-center"
                style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
              >
                <Layers className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4" style={{ color: t.textMuted }} />
                <p style={{ color: t.textSecondary }}>
                  Aucun type d&apos;article dans cette catégorie
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
        {showItems && (
          <section className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 md:gap-3">
                <Tag className="w-5 h-5 md:w-6 md:h-6" style={{ color: t.accent }} />
                Articles
              </h2>
              <span className="text-xs md:text-sm" style={{ color: t.textMuted }}>
                {filteredItems.length} articles
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <div
                className="p-10 md:p-12 rounded-2xl text-center"
                style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
              >
                <Tag className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4" style={{ color: t.textMuted }} />
                <p style={{ color: t.textSecondary }}>
                  {searchQuery ? "Aucun résultat pour cette recherche" : "Aucun article dans cette catégorie"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredItems.map((item, index) => (
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
        t={t}
        colors={colors}
      />
    </main>
  );
}
