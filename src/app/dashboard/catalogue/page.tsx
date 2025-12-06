"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { THEME, CHART_COLORS, ThemeTokens } from "@/lib/theme-tokens";
import {
  Search,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  Package,
  Tag,
  Layers,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";

// --- Interfaces ---
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

// --- Animated Number Component ---
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
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  return <span>{displayValue.toFixed(2)}</span>;
}

// --- Toggle Component (Dashboard Style) ---
function Toggle({ 
  enabled, 
  onChange, 
  label,
  t 
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void; 
  label: string;
  t: ThemeTokens;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-manipulation"
      style={{
        background: enabled ? `${t.accent}20` : t.surface2,
        border: `1px solid ${enabled ? `${t.accent}40` : t.borderSubtle}`,
      }}
    >
      <div 
        className="relative w-11 h-6 rounded-full transition-colors duration-200"
        style={{ background: enabled ? t.accent : t.surface3 }}
      >
        <div 
          className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200 shadow-sm"
          style={{ 
            left: enabled ? '1.5rem' : '0.25rem',
            background: enabled ? t.void : t.textMuted,
          }}
        />
      </div>
      <span 
        className="text-sm font-medium whitespace-nowrap"
        style={{ color: enabled ? t.accent : t.textSecondary }}
      >
        {label}
      </span>
    </button>
  );
}

// --- Select Component (iPad Optimized) ---
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  icon: Icon,
  step,
  t,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; count?: number }[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
  step?: number;
  t: ThemeTokens;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        {step && (
          <span 
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
            style={{ 
              background: value ? t.accent : t.surface3,
              color: value ? t.void : t.textMuted,
            }}
          >
            {step}
          </span>
        )}
        <label 
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: t.textTertiary }}
        >
          {label}
        </label>
      </div>
      
      <div className="relative">
        {Icon && (
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.textMuted }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className={cn(
            "w-full h-14 md:h-16 rounded-xl text-base font-medium transition-all duration-200",
            "appearance-none cursor-pointer touch-manipulation",
            "focus:outline-none focus:ring-2",
            Icon ? "pl-12 pr-12" : "pl-4 pr-12",
            (disabled || loading) && "opacity-50 cursor-not-allowed"
          )}
          style={{
            background: t.surface2,
            border: `1px solid ${t.borderSubtle}`,
            color: value ? t.textPrimary : t.textMuted,
            // @ts-ignore
            "--tw-ring-color": `${t.accent}40`,
          }}
        >
          <option value="" disabled style={{ color: t.textMuted }}>
            {loading ? "Chargement..." : placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: t.textPrimary }}>
              {opt.label}{opt.count !== undefined ? ` (${opt.count})` : ''}
            </option>
          ))}
        </select>
        
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: t.textMuted }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Price Modal Component ---
interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];
  priceLists: PriceList[];
  selectedPriceList: PriceList | null;
  onPriceListChange: (priceId: number) => void;
  loading: boolean;
  error: string | null;
  t: ThemeTokens;
}

function PriceModal({ 
  isOpen, onClose, data, priceLists, 
  selectedPriceList, onPriceListChange, loading, error, t
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const itemsWithPrices = data.filter(item => item.ranges && item.ranges.length > 0);

  // Calculation Helpers
  const calcPricePerCaisse = (price: number, caisse: number | null) => caisse ? price * caisse : null;
  const calcPricePerLitre = (price: number, volume: number | null) => volume ? price / volume : null;
  const calcMarginExp = (unit: number, cout: number | null) => cout && unit ? ((unit - cout) / unit) * 100 : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-[98vw] max-h-[94vh] rounded-2xl overflow-hidden flex flex-col animate-scale-in"
        style={{ 
          background: t.surface1,
          border: `1px solid ${t.borderSubtle}`,
        }}
      >
        {/* Modal Header */}
        <div 
          className="flex-shrink-0 px-4 md:px-6 py-4"
          style={{ 
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accent}dd 100%)`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Liste de Prix</h2>
                <p className="text-white/70 text-sm">{selectedPriceList?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle 
                enabled={showDetails} 
                onChange={setShowDetails} 
                label="Détails" 
                t={{ ...t, accent: '#fff', surface2: 'rgba(255,255,255,0.15)', surface3: 'rgba(255,255,255,0.1)', textSecondary: 'rgba(255,255,255,0.9)', void: t.accent, textMuted: 'rgba(255,255,255,0.6)', borderSubtle: 'rgba(255,255,255,0.2)' } as ThemeTokens}
              />

              <select
                value={selectedPriceList?.priceId || ""}
                onChange={(e) => onPriceListChange(parseInt(e.target.value))}
                disabled={loading}
                className="h-12 px-4 rounded-xl font-semibold text-sm border-2 transition-all focus:outline-none touch-manipulation min-w-[180px]"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderColor: "rgba(255,255,255,0.3)",
                  color: "white",
                }}
              >
                {priceLists.map(pl => (
                  <option key={pl.priceId} value={pl.priceId} style={{ color: t.textPrimary, background: t.surface1 }}>
                    {pl.code} - {pl.name}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={onClose} 
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors touch-manipulation"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Modal Content */}
        <div 
          className="flex-1 overflow-auto p-3 md:p-5"
          style={{ background: t.void }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: t.accent }} />
              <p className="font-medium" style={{ color: t.textMuted }}>Chargement des prix...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: `${t.danger}20` }}
              >
                <AlertCircle className="w-8 h-8" style={{ color: t.danger }} />
              </div>
              <p className="text-lg font-bold" style={{ color: t.danger }}>{error}</p>
            </div>
          ) : itemsWithPrices.length > 0 ? (
            <div className="space-y-4">
              {itemsWithPrices.map((item) => (
                <div 
                  key={item.itemId} 
                  className="rounded-xl overflow-hidden"
                  style={{ 
                    background: t.surface1,
                    border: `1px solid ${t.borderSubtle}`,
                  }}
                >
                  {/* Item Header */}
                  <div 
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ 
                      background: `linear-gradient(135deg, ${t.accent}15 0%, ${t.accent}05 100%)`,
                      borderBottom: `1px solid ${t.borderSubtle}`,
                    }}
                  >
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                        {item.description.split(' ')[0].toUpperCase()}
                      </h3>
                      <p className="text-sm" style={{ color: t.textTertiary }}>
                        {item.className || item.description}
                      </p>
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: t.accent, color: t.void }}
                    >
                      {item.ranges.length} niveau{item.ranges.length > 1 ? 'x' : ''}
                    </div>
                  </div>
                  
                  {/* Price Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm md:text-base">
                      <thead>
                        <tr style={{ background: t.surface2 }}>
                          <th 
                            className="text-left p-3 md:p-4 font-semibold"
                            style={{ color: t.textSecondary, borderBottom: `1px solid ${t.borderSubtle}` }}
                          >
                            Article
                          </th>
                          <th 
                            className="text-center p-3 md:p-4 font-semibold"
                            style={{ color: t.textSecondary, borderBottom: `1px solid ${t.borderSubtle}` }}
                          >
                            Caisse
                          </th>
                          <th 
                            className="text-center p-3 md:p-4 font-semibold"
                            style={{ color: t.textSecondary, borderBottom: `1px solid ${t.borderSubtle}` }}
                          >
                            Format
                          </th>
                          <th 
                            className="text-center p-3 md:p-4 font-semibold"
                            style={{ color: t.textSecondary, borderBottom: `1px solid ${t.borderSubtle}` }}
                          >
                            Qté
                          </th>
                          
                          {showDetails && (
                            <>
                              <th 
                                className="text-right p-3 md:p-4 font-semibold"
                                style={{ 
                                  color: t.accent, 
                                  borderBottom: `1px solid ${t.borderSubtle}`,
                                  background: `${t.accent}08`,
                                }}
                              >
                                Coût Exp
                              </th>
                              <th 
                                className="text-right p-3 md:p-4 font-semibold"
                                style={{ 
                                  color: t.accent, 
                                  borderBottom: `1px solid ${t.borderSubtle}`,
                                  background: `${t.accent}08`,
                                }}
                              >
                                % Exp
                              </th>
                            </>
                          )}

                          <th 
                            className="text-right p-3 md:p-4 font-semibold"
                            style={{ color: t.textSecondary, borderBottom: `1px solid ${t.borderSubtle}` }}
                          >
                            {selectedPriceList?.code || 'Prix'}
                          </th>
                          
                          {showDetails && (
                            <>
                              <th 
                                className="text-right p-3 md:p-4 font-semibold"
                                style={{ 
                                  color: CHART_COLORS.dark[1], 
                                  borderBottom: `1px solid ${t.borderSubtle}`,
                                  background: `${CHART_COLORS.dark[1]}08`,
                                }}
                              >
                                $/Caisse
                              </th>
                              <th 
                                className="text-right p-3 md:p-4 font-semibold"
                                style={{ 
                                  color: CHART_COLORS.dark[1], 
                                  borderBottom: `1px solid ${t.borderSubtle}`,
                                  background: `${CHART_COLORS.dark[1]}08`,
                                }}
                              >
                                $/L
                              </th>
                            </>
                          )}
                          
                          <th 
                            className="text-right p-3 md:p-4 font-semibold"
                            style={{ 
                              color: t.warning, 
                              borderBottom: `1px solid ${t.borderSubtle}`,
                              background: `${t.warning}08`,
                            }}
                          >
                            PDS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.ranges.map((range, rIdx) => {
                          const isFirstRow = rIdx === 0;
                          const ppc = calcPricePerCaisse(range.unitPrice, item.caisse);
                          const ppl = calcPricePerLitre(range.unitPrice, item.volume);
                          const marginExp = calcMarginExp(range.unitPrice, range.coutExp);
                          
                          return (
                            <tr 
                              key={range.id} 
                              className="transition-colors"
                              style={{ 
                                background: isFirstRow ? t.surface1 : t.surface2,
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = `${t.accent}08`}
                              onMouseLeave={(e) => e.currentTarget.style.background = isFirstRow ? t.surface1 : t.surface2}
                            >
                              <td 
                                className="p-3 md:p-4"
                                style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                              >
                                {isFirstRow && (
                                  <span 
                                    className="font-mono font-bold"
                                    style={{ color: t.textPrimary }}
                                  >
                                    {item.itemCode}
                                  </span>
                                )}
                              </td>
                              <td 
                                className="p-3 md:p-4 text-center"
                                style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                              >
                                {isFirstRow && (
                                  <span className="font-bold" style={{ color: t.textPrimary }}>
                                    {item.caisse || '—'}
                                  </span>
                                )}
                              </td>
                              <td 
                                className="p-3 md:p-4 text-center"
                                style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                              >
                                {isFirstRow && (
                                  <span className="font-bold" style={{ color: t.textPrimary }}>
                                    {item.format || '—'}
                                  </span>
                                )}
                              </td>
                              <td 
                                className="p-3 md:p-4 text-center"
                                style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                              >
                                <span 
                                  className="inline-flex items-center justify-center w-10 h-8 rounded-lg font-mono font-bold text-sm"
                                  style={{ 
                                    background: t.surface3,
                                    color: t.textPrimary,
                                  }}
                                >
                                  {range.qtyMin}
                                </span>
                              </td>
                              
                              {showDetails && (
                                <>
                                  <td 
                                    className="p-3 md:p-4 text-right"
                                    style={{ 
                                      borderBottom: `1px solid ${t.borderSubtle}`,
                                      background: `${t.accent}05`,
                                    }}
                                  >
                                    <span className="font-mono font-medium" style={{ color: t.accent }}>
                                      {range.coutExp ? range.coutExp.toFixed(2) : '—'}
                                    </span>
                                  </td>
                                  <td 
                                    className="p-3 md:p-4 text-right"
                                    style={{ 
                                      borderBottom: `1px solid ${t.borderSubtle}`,
                                      background: `${t.accent}05`,
                                    }}
                                  >
                                    <span 
                                      className="font-mono font-medium"
                                      style={{ 
                                        color: marginExp && marginExp > 0 ? t.success : t.danger 
                                      }}
                                    >
                                      {marginExp ? `${marginExp.toFixed(1)}%` : '—'}
                                    </span>
                                  </td>
                                </>
                              )}

                              <td 
                                className="p-3 md:p-4 text-right"
                                style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                              >
                                <span 
                                  className={cn(
                                    "font-mono font-bold",
                                    isFirstRow && "text-lg"
                                  )}
                                  style={{ color: isFirstRow ? t.accent : t.textPrimary }}
                                >
                                  <AnimatedPrice value={range.unitPrice} />
                                </span>
                              </td>
                              
                              {showDetails && (
                                <>
                                  <td 
                                    className="p-3 md:p-4 text-right"
                                    style={{ 
                                      borderBottom: `1px solid ${t.borderSubtle}`,
                                      background: `${CHART_COLORS.dark[1]}05`,
                                    }}
                                  >
                                    <span className="font-mono" style={{ color: CHART_COLORS.dark[1] }}>
                                      {ppc ? ppc.toFixed(2) : '—'}
                                    </span>
                                  </td>
                                  <td 
                                    className="p-3 md:p-4 text-right"
                                    style={{ 
                                      borderBottom: `1px solid ${t.borderSubtle}`,
                                      background: `${CHART_COLORS.dark[1]}05`,
                                    }}
                                  >
                                    <span className="font-mono" style={{ color: CHART_COLORS.dark[1] }}>
                                      {ppl ? ppl.toFixed(2) : '—'}
                                    </span>
                                  </td>
                                </>
                              )}
                              
                              <td 
                                className="p-3 md:p-4 text-right"
                                style={{ 
                                  borderBottom: `1px solid ${t.borderSubtle}`,
                                  background: `${t.warning}05`,
                                }}
                              >
                                <span className="font-mono font-bold" style={{ color: t.warning }}>
                                  {range.pdsPrice !== null ? <AnimatedPrice value={range.pdsPrice} /> : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: t.surface2 }}
              >
                <Package className="w-8 h-8" style={{ color: t.textMuted }} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: t.textSecondary }}>Aucun prix trouvé</p>
                <p style={{ color: t.textMuted }}>Aucun article avec prix pour cette sélection.</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!loading && itemsWithPrices.length > 0 && (
          <div 
            className="flex-shrink-0 px-4 md:px-6 py-3 flex items-center justify-between"
            style={{ 
              background: t.surface2,
              borderTop: `1px solid ${t.borderSubtle}`,
            }}
          >
            <span style={{ color: t.textTertiary }} className="font-medium">
              {itemsWithPrices.length} article{itemsWithPrices.length > 1 ? 's' : ''}
              {showDetails && " • Détails activés"}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium transition-colors touch-manipulation"
              style={{ background: t.surface3, color: t.textSecondary }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function CataloguePage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t = THEME[mode];

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  
  // Selections
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Price Modal
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // For re-fetching with different price list in modal
  const [modalProdId, setModalProdId] = useState<number | null>(null);
  const [modalTypeId, setModalTypeId] = useState<number | null>(null);
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  
  // Loading states
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    async function init() {
      try {
        const [prodRes, plRes] = await Promise.all([
          fetch("/api/catalogue/products"),
          fetch("/api/catalogue/pricelists")
        ]);
        
        if (prodRes.ok) setProducts(await prodRes.json());
        if (plRes.ok) {
          const pls: PriceList[] = await plRes.json();
          setPriceLists(pls);
          if (pls.length > 0) setSelectedPriceList(pls[0]);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    }
    init();
  }, []);

  // --- Search Debounce ---
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
      } else {
        setSearchResults([]);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // --- Fetch Prices ---
  const fetchPrices = async (priceId: number, prodId: number, typeId?: number | null, itemId?: number | null) => {
    setPriceData([]);
    setPriceError(null);
    setLoadingPrices(true);
    
    try {
      let url = `/api/catalogue/prices?priceId=${priceId}&prodId=${prodId}`;
      if (itemId) {
        url += `&itemId=${itemId}`;
      } else if (typeId) {
        url += `&typeId=${typeId}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${res.status}`);
      }
      
      const data = await res.json();
      setPriceData(data);
      
    } catch (err: any) {
      console.error("Price fetch failed:", err);
      setPriceError(err.message || "Erreur lors du chargement des prix");
    } finally {
      setLoadingPrices(false);
    }
  };

  // --- Handlers ---
  const handlePriceListChange = (priceId: string) => {
    const pl = priceLists.find(p => p.priceId === parseInt(priceId));
    if (pl) setSelectedPriceList(pl);
  };

  const handleProductChange = async (prodId: string) => {
    const prod = products.find(p => p.prodId === parseInt(prodId));
    if (!prod) return;

    setSelectedProduct(prod);
    setSelectedType(null);
    setSelectedItem(null);
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
      setItems([]);
      return;
    }

    const type = itemTypes.find(t => t.itemTypeId === parseInt(typeId));
    if (!type) return;

    setSelectedType(type);
    setSelectedItem(null);
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
    const item = items.find(i => i.itemId === parseInt(itemId));
    if (item) setSelectedItem(item);
  };

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
    
    setSelectedItem(item);
    
    const prod = products.find(p => p.prodId === item.prodId);
    if (prod) {
      setSelectedProduct(prod);
      
      setLoadingTypes(true);
      try {
        const typesRes = await fetch(`/api/catalogue/itemtypes?prodId=${item.prodId}`);
        if (typesRes.ok) {
          const types: ItemType[] = await typesRes.json();
          setItemTypes(types);
          
          const type = types.find(t => t.itemTypeId === item.itemTypeId);
          if (type) {
            setSelectedType(type);
            
            setLoadingItems(true);
            try {
              const itemsRes = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
              if (itemsRes.ok) {
                const loadedItems: Item[] = await itemsRes.json();
                setItems(loadedItems);
              }
            } finally {
              setLoadingItems(false);
            }
          }
        }
      } finally {
        setLoadingTypes(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectedPriceList || !selectedProduct) return;
    
    setModalProdId(selectedProduct.prodId);
    setModalTypeId(selectedType?.itemTypeId || null);
    setModalItemId(selectedItem?.itemId || null);
    
    setPriceData([]);
    setPriceError(null);
    setShowPriceModal(true);
    
    await fetchPrices(
      selectedPriceList.priceId,
      selectedProduct.prodId,
      selectedType?.itemTypeId || null,
      selectedItem?.itemId || null
    );
  };

  const handleModalPriceListChange = async (priceId: number) => {
    const pl = priceLists.find(p => p.priceId === priceId);
    if (pl && modalProdId) {
      setSelectedPriceList(pl);
      await fetchPrices(priceId, modalProdId, modalTypeId, modalItemId);
    }
  };

  const canGenerate = selectedPriceList && selectedProduct;
  
  // Calculate completion steps
  const completedSteps = [
    selectedPriceList,
    selectedProduct,
    selectedType,
    selectedItem,
  ].filter(Boolean).length;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ background: t.void }}
    >
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        
        {/* Header Card */}
        <div 
          className="rounded-xl p-5 md:p-6 mb-6"
          style={{ 
            background: t.surface1,
            border: `1px solid ${t.borderSubtle}`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ background: `${t.accent}15`, color: t.accent }}
            >
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 
                className="text-2xl md:text-3xl font-bold tracking-tight"
                style={{ color: t.textPrimary }}
              >
                Catalogue SINTO
                <span style={{ color: t.accent }}>.</span>
              </h1>
              <p style={{ color: t.textTertiary }} className="text-sm md:text-base">
                Générateur de liste de prix
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div 
          className="rounded-xl overflow-hidden"
          style={{ 
            background: t.surface1,
            border: `1px solid ${t.borderSubtle}`,
          }}
        >
          {/* Progress Indicator */}
          <div 
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
          >
            <span 
              className="text-sm font-medium"
              style={{ color: t.textTertiary }}
            >
              Configuration
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="w-2 h-2 rounded-full transition-colors duration-300"
                  style={{
                    background: step <= completedSteps ? t.accent : t.surface3,
                  }}
                />
              ))}
              <span 
                className="ml-2 text-xs font-mono"
                style={{ color: t.textMuted }}
              >
                {completedSteps}/4
              </span>
            </div>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            {/* Search Bar */}
            <div className="relative z-20">
              <div 
                className="relative transition-all duration-200"
                style={{
                  boxShadow: searchFocused ? `0 0 0 2px ${t.accent}40` : 'none',
                  borderRadius: '0.75rem',
                }}
              >
                <div 
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
                  style={{ color: searchFocused ? t.accent : t.textMuted }}
                >
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="search" 
                  placeholder="Recherche rapide par code article..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="w-full h-14 pl-12 pr-4 rounded-xl text-base font-medium transition-all outline-none touch-manipulation"
                  style={{
                    background: t.surface2,
                    border: `1px solid ${searchFocused ? t.accent : t.borderSubtle}`,
                    color: t.textPrimary,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors touch-manipulation"
                    style={{ color: t.textMuted }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {searchQuery.length > 1 && searchFocused && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto z-50"
                  style={{ 
                    background: t.surface1,
                    border: `1px solid ${t.borderSubtle}`,
                  }}
                >
                  {isSearching ? (
                    <div className="p-6 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.accent }} />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <button 
                        key={item.itemId}
                        onClick={() => handleSearchResultClick(item)}
                        className="w-full p-4 text-left transition-colors touch-manipulation"
                        style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                        onMouseEnter={(e) => e.currentTarget.style.background = `${t.accent}10`}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="font-mono font-bold text-sm px-2 py-1 rounded"
                            style={{ background: `${t.accent}15`, color: t.accent }}
                          >
                            {item.itemCode}
                          </span>
                          <span 
                            className="truncate font-medium"
                            style={{ color: t.textPrimary }}
                          >
                            {item.description}
                          </span>
                        </div>
                        <div 
                          className="text-xs mt-1 ml-1"
                          style={{ color: t.textMuted }}
                        >
                          {item.categoryName} → {item.className}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div 
                      className="p-6 text-center"
                      style={{ color: t.textMuted }}
                    >
                      Aucun résultat
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ background: t.borderSubtle }} />
              <span className="text-xs font-medium" style={{ color: t.textMuted }}>
                ou sélectionner
              </span>
              <div className="flex-1 h-px" style={{ background: t.borderSubtle }} />
            </div>

            {/* Form Steps */}
            <div className="space-y-4">
              {/* Step 1: Price List */}
              <SelectField
                step={1}
                label="Liste de Prix"
                value={selectedPriceList?.priceId.toString() || ""}
                onChange={handlePriceListChange}
                options={priceLists.map(pl => ({ 
                  value: pl.priceId.toString(), 
                  label: `${pl.code} - ${pl.name}` 
                }))}
                placeholder="Sélectionner une liste..."
                icon={Tag}
                t={t}
              />

              {/* Step 2: Category */}
              <SelectField
                step={2}
                label="Catégorie"
                value={selectedProduct?.prodId.toString() || ""}
                onChange={handleProductChange}
                options={products.map(p => ({ 
                  value: p.prodId.toString(), 
                  label: p.name,
                  count: p.itemCount,
                }))}
                placeholder="Sélectionner une catégorie..."
                disabled={!selectedPriceList}
                icon={Package}
                t={t}
              />

              {/* Step 3: Class (Optional) */}
              <SelectField
                step={3}
                label="Classe (Optionnel)"
                value={selectedType?.itemTypeId.toString() || ""}
                onChange={handleTypeChange}
                options={itemTypes.map(it => ({ 
                  value: it.itemTypeId.toString(), 
                  label: it.description,
                  count: it.itemCount,
                }))}
                placeholder="Toutes les classes"
                disabled={!selectedProduct}
                loading={loadingTypes}
                icon={Layers}
                t={t}
              />

              {/* Step 4: Item (Optional) */}
              <SelectField
                step={4}
                label="Article (Optionnel)"
                value={selectedItem?.itemId.toString() || ""}
                onChange={handleItemChange}
                options={items.map(i => ({ 
                  value: i.itemId.toString(), 
                  label: `${i.itemCode} - ${i.description}`,
                }))}
                placeholder="Tous les articles"
                disabled={!selectedType}
                loading={loadingItems}
                icon={FileText}
                t={t}
              />
            </div>

            {/* Generate Button */}
            <div className="pt-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={cn(
                  "w-full h-16 md:h-20 rounded-xl font-bold text-lg uppercase tracking-wide transition-all duration-200 touch-manipulation",
                  "flex items-center justify-center gap-3",
                  canGenerate && "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                )}
                style={{
                  background: canGenerate 
                    ? `linear-gradient(135deg, ${t.accent} 0%, ${t.accent}dd 100%)`
                    : t.surface3,
                  color: canGenerate ? t.void : t.textMuted,
                  cursor: canGenerate ? 'pointer' : 'not-allowed',
                }}
              >
                <Sparkles className="w-5 h-5" />
                Générer la Liste
              </button>
            </div>
          </div>
        </div>

        {/* Selected Item Preview */}
        {selectedItem && (
          <div 
            className="mt-5 p-4 md:p-5 rounded-xl flex items-center gap-4 animate-fade-in"
            style={{ 
              background: `${t.accent}10`,
              border: `1px solid ${t.accent}30`,
            }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: t.accent, color: t.void }}
            >
              <Check className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div 
                className="font-bold text-lg truncate"
                style={{ color: t.textPrimary }}
              >
                {selectedItem.itemCode}
              </div>
              <div 
                className="font-medium truncate"
                style={{ color: t.textSecondary }}
              >
                {selectedItem.description}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Price Modal */}
      <PriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        data={priceData}
        priceLists={priceLists}
        selectedPriceList={selectedPriceList}
        onPriceListChange={handleModalPriceListChange}
        loading={loadingPrices}
        error={priceError}
        t={t}
      />
      
      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        
        /* iPad-specific touch optimizations */
        @media (hover: none) and (pointer: coarse) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
          
          select, button, input {
            font-size: 16px !important; /* Prevent iOS zoom on focus */
          }
        }
        
        /* Smooth scrolling on iOS */
        .overflow-auto {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Remove number input spinners */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
