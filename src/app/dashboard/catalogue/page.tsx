"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { THEME, ThemeTokens } from "@/lib/theme-tokens";
import { useAccentColor } from "@/components/accent-color-provider";

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

// --- Animated Price ---
function AnimatedPrice({ value, duration = 500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const startValue = previousValue.current;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(startValue + (value - startValue) * eased);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [value, duration]);

  return <>{displayValue.toFixed(2)}</>;
}

// --- Minimal Select ---
function MinimalSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  accent,
  t,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  accent: string;
  t: ThemeTokens;
}) {
  const hasValue = !!value;
  
  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <span 
          className="text-[11px] font-medium uppercase tracking-widest transition-colors"
          style={{ color: hasValue ? accent : t.textMuted }}
        >
          {label}
        </span>
        {loading && (
          <span className="text-[10px]" style={{ color: t.textMuted }}>
            Chargement...
          </span>
        )}
      </div>
      
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className={cn(
            "w-full h-14 md:h-16 px-4 rounded-none text-base font-medium transition-all duration-200",
            "appearance-none cursor-pointer touch-manipulation",
            "border-0 border-b-2 bg-transparent",
            "focus:outline-none",
            (disabled || loading) && "opacity-40 cursor-not-allowed"
          )}
          style={{
            color: hasValue ? t.textPrimary : t.textMuted,
            borderColor: hasValue ? accent : t.borderSubtle,
          }}
        >
          <option value="" disabled style={{ color: t.textMuted }}>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: t.textPrimary }}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow */}
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200"
          style={{ 
            color: hasValue ? accent : t.textMuted,
            transform: `translateY(-50%)`,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// --- Price Modal ---
interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];
  priceLists: PriceList[];
  selectedPriceList: PriceList | null;
  onPriceListChange: (priceId: number) => void;
  loading: boolean;
  error: string | null;
  accent: string;
  accentMuted: string;
  t: ThemeTokens;
}

function PriceModal({ 
  isOpen, onClose, data, priceLists, 
  selectedPriceList, onPriceListChange, loading, error, accent, accentMuted, t
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const itemsWithPrices = data.filter(item => item.ranges?.length > 0);

  const calcMarginExp = (unit: number, cout: number | null) => 
    cout && unit ? ((unit - cout) / unit) * 100 : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.8)" }}
        onClick={onClose} 
      />
      
      <div 
        className="relative w-full max-w-[98vw] max-h-[94vh] overflow-hidden flex flex-col"
        style={{ 
          background: t.void,
          borderRadius: 0,
        }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 px-6 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
          <div>
            <h2 
              className="text-2xl md:text-3xl font-bold tracking-tight"
              style={{ color: t.textPrimary }}
            >
              Prix
            </h2>
            <p className="text-sm mt-1" style={{ color: t.textMuted }}>
              {selectedPriceList?.code} — {selectedPriceList?.name}
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2.5 text-sm font-medium transition-all touch-manipulation"
              style={{
                color: showDetails ? accent : t.textSecondary,
                borderBottom: `2px solid ${showDetails ? accent : 'transparent'}`,
              }}
            >
              {showDetails ? 'Masquer détails' : 'Voir détails'}
            </button>

            {/* Price List Selector */}
            <select
              value={selectedPriceList?.priceId || ""}
              onChange={(e) => onPriceListChange(parseInt(e.target.value))}
              disabled={loading}
              className="h-11 px-4 text-sm font-medium border-0 bg-transparent transition-all focus:outline-none touch-manipulation"
              style={{
                borderBottom: `2px solid ${accent}`,
                color: t.textPrimary,
              }}
            >
              {priceLists.map(pl => (
                <option key={pl.priceId} value={pl.priceId} style={{ background: t.surface1 }}>
                  {pl.code}
                </option>
              ))}
            </select>
            
            {/* Close */}
            <button 
              onClick={onClose} 
              className="w-11 h-11 flex items-center justify-center transition-colors touch-manipulation"
              style={{ color: t.textMuted }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div 
          className="flex-1 overflow-auto"
          style={{ background: t.void }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div 
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: t.borderSubtle, borderTopColor: accent }}
              />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <p className="text-lg font-medium" style={{ color: t.danger }}>{error}</p>
            </div>
          ) : itemsWithPrices.length > 0 ? (
            <div>
              {itemsWithPrices.map((item, idx) => (
                <div 
                  key={item.itemId}
                  style={{ borderBottom: idx < itemsWithPrices.length - 1 ? `1px solid ${t.borderSubtle}` : undefined }}
                >
                  {/* Item Header */}
                  <div className="px-6 md:px-8 py-4 flex items-baseline justify-between">
                    <div>
                      <span 
                        className="text-lg font-bold"
                        style={{ color: t.textPrimary }}
                      >
                        {item.itemCode}
                      </span>
                      <span 
                        className="ml-3 text-sm"
                        style={{ color: t.textMuted }}
                      >
                        {item.className || item.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm" style={{ color: t.textMuted }}>
                      {item.caisse && <span>Caisse: {item.caisse}</span>}
                      {item.format && <span>Format: {item.format}</span>}
                    </div>
                  </div>
                  
                  {/* Price Rows */}
                  <div className="px-6 md:px-8 pb-4">
                    <div className="grid gap-2">
                      {item.ranges.map((range, rIdx) => {
                        const marginExp = calcMarginExp(range.unitPrice, range.coutExp);
                        const isFirst = rIdx === 0;
                        
                        return (
                          <div 
                            key={range.id}
                            className="flex items-center justify-between py-3 px-4 rounded-lg transition-colors"
                            style={{ 
                              background: isFirst ? accentMuted : t.surface1,
                            }}
                          >
                            {/* Qty */}
                            <div className="flex items-center gap-4">
                              <span 
                                className="text-xs font-medium uppercase"
                                style={{ color: t.textMuted }}
                              >
                                Qté {range.qtyMin}+
                              </span>
                              
                              {showDetails && range.coutExp && (
                                <span 
                                  className="text-xs"
                                  style={{ color: t.textMuted }}
                                >
                                  Coût: {range.coutExp.toFixed(2)}
                                </span>
                              )}
                              
                              {showDetails && marginExp !== null && (
                                <span 
                                  className="text-xs font-medium"
                                  style={{ color: marginExp > 0 ? t.success : t.danger }}
                                >
                                  {marginExp.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            
                            {/* Prices */}
                            <div className="flex items-baseline gap-6">
                              {range.pdsPrice !== null && (
                                <div className="text-right">
                                  <span 
                                    className="text-xs uppercase mr-2"
                                    style={{ color: t.textMuted }}
                                  >
                                    PDS
                                  </span>
                                  <span 
                                    className="font-mono font-medium"
                                    style={{ color: t.warning }}
                                  >
                                    <AnimatedPrice value={range.pdsPrice} />
                                  </span>
                                </div>
                              )}
                              
                              <div className="text-right min-w-[100px]">
                                <span 
                                  className={cn(
                                    "font-mono font-bold",
                                    isFirst && "text-xl"
                                  )}
                                  style={{ color: isFirst ? accent : t.textPrimary }}
                                >
                                  $<AnimatedPrice value={range.unitPrice} />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-lg" style={{ color: t.textMuted }}>Aucun prix trouvé</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!loading && itemsWithPrices.length > 0 && (
          <div 
            className="flex-shrink-0 px-6 md:px-8 py-4 flex items-center justify-between"
            style={{ borderTop: `1px solid ${t.borderSubtle}` }}
          >
            <span className="text-sm" style={{ color: t.textMuted }}>
              {itemsWithPrices.length} article{itemsWithPrices.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="text-sm font-medium transition-colors touch-manipulation"
              style={{ color: t.textSecondary }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function CataloguePage() {
  const { resolvedTheme } = useTheme();
  const { accent: accentPreset } = useAccentColor();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";
  const t = THEME[mode];
  const accent = mode === "dark" ? accentPreset.dark : accentPreset.light;
  const accentMuted = mode === "dark" ? accentPreset.muted.dark : accentPreset.muted.light;

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
  
  // Modal
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [modalProdId, setModalProdId] = useState<number | null>(null);
  const [modalTypeId, setModalTypeId] = useState<number | null>(null);
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  
  // Loading
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // Init
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

  // Search
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

  // Fetch Prices
  const fetchPrices = async (priceId: number, prodId: number, typeId?: number | null, itemId?: number | null) => {
    setPriceData([]);
    setPriceError(null);
    setLoadingPrices(true);
    
    try {
      let url = `/api/catalogue/prices?priceId=${priceId}&prodId=${prodId}`;
      if (itemId) url += `&itemId=${itemId}`;
      else if (typeId) url += `&typeId=${typeId}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${res.status}`);
      }
      setPriceData(await res.json());
    } catch (err: any) {
      setPriceError(err.message || "Erreur");
    } finally {
      setLoadingPrices(false);
    }
  };

  // Handlers
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

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
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
              if (itemsRes.ok) setItems(await itemsRes.json());
            } finally { setLoadingItems(false); }
          }
        }
      } finally { setLoadingTypes(false); }
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

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ background: t.void }}
    >
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 md:px-8 py-12 md:py-20">
        
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <h1 
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{ color: t.textPrimary }}
          >
            Catalogue
            <span style={{ color: accent }}>.</span>
          </h1>
          <p 
            className="mt-2 text-base"
            style={{ color: t.textMuted }}
          >
            Générer une liste de prix
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-12">
          <input 
            type="search" 
            placeholder="Rechercher un article..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 px-0 text-lg font-medium bg-transparent border-0 border-b-2 transition-colors focus:outline-none touch-manipulation"
            style={{
              color: t.textPrimary,
              borderColor: searchQuery ? accent : t.borderSubtle,
            }}
          />
          
          {/* Search Results */}
          {searchQuery.length > 1 && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto z-50"
              style={{ 
                background: t.surface1,
                borderBottom: `1px solid ${t.borderSubtle}`,
              }}
            >
              {isSearching ? (
                <div className="p-4 text-center" style={{ color: t.textMuted }}>
                  Recherche...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button 
                    key={item.itemId}
                    onClick={() => handleSearchResultClick(item)}
                    className="w-full px-4 py-3 text-left transition-colors touch-manipulation flex items-baseline gap-3"
                    style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = t.surface2}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span 
                      className="font-mono font-bold text-sm"
                      style={{ color: accent }}
                    >
                      {item.itemCode}
                    </span>
                    <span 
                      className="truncate"
                      style={{ color: t.textSecondary }}
                    >
                      {item.description}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center" style={{ color: t.textMuted }}>
                  Aucun résultat
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-8">
          <MinimalSelect
            label="Liste de prix"
            value={selectedPriceList?.priceId.toString() || ""}
            onChange={(v) => {
              const pl = priceLists.find(p => p.priceId === parseInt(v));
              if (pl) setSelectedPriceList(pl);
            }}
            options={priceLists.map(pl => ({ 
              value: pl.priceId.toString(), 
              label: `${pl.code} — ${pl.name}` 
            }))}
            placeholder="Sélectionner"
            accent={accent}
            t={t}
          />

          <MinimalSelect
            label="Catégorie"
            value={selectedProduct?.prodId.toString() || ""}
            onChange={handleProductChange}
            options={products.map(p => ({ 
              value: p.prodId.toString(), 
              label: `${p.name} (${p.itemCount})`,
            }))}
            placeholder="Sélectionner"
            disabled={!selectedPriceList}
            accent={accent}
            t={t}
          />

          <MinimalSelect
            label="Classe"
            value={selectedType?.itemTypeId.toString() || ""}
            onChange={handleTypeChange}
            options={[
              { value: "", label: "Toutes" },
              ...itemTypes.map(it => ({ 
                value: it.itemTypeId.toString(), 
                label: `${it.description} (${it.itemCount})`,
              }))
            ]}
            placeholder="Optionnel"
            disabled={!selectedProduct}
            loading={loadingTypes}
            accent={accent}
            t={t}
          />

          <MinimalSelect
            label="Article"
            value={selectedItem?.itemId.toString() || ""}
            onChange={(v) => {
              if (!v) { setSelectedItem(null); return; }
              const item = items.find(i => i.itemId === parseInt(v));
              if (item) setSelectedItem(item);
            }}
            options={[
              { value: "", label: "Tous" },
              ...items.map(i => ({ 
                value: i.itemId.toString(), 
                label: `${i.itemCode} — ${i.description}`,
              }))
            ]}
            placeholder="Optionnel"
            disabled={!selectedType}
            loading={loadingItems}
            accent={accent}
            t={t}
          />
        </div>

        {/* Selected Preview */}
        {selectedItem && (
          <div 
            className="mt-10 py-4 border-l-2 pl-4"
            style={{ borderColor: accent }}
          >
            <p 
              className="font-mono font-bold"
              style={{ color: t.textPrimary }}
            >
              {selectedItem.itemCode}
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: t.textMuted }}
            >
              {selectedItem.description}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-12">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={cn(
              "w-full h-16 text-base font-semibold uppercase tracking-widest transition-all duration-200 touch-manipulation",
              canGenerate && "hover:tracking-[0.2em]"
            )}
            style={{
              background: canGenerate ? accent : t.surface2,
              color: canGenerate ? (mode === "dark" ? "#000" : "#fff") : t.textMuted,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
            }}
          >
            Générer
          </button>
        </div>
      </main>

      {/* Modal */}
      <PriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        data={priceData}
        priceLists={priceLists}
        selectedPriceList={selectedPriceList}
        onPriceListChange={handleModalPriceListChange}
        loading={loadingPrices}
        error={priceError}
        accent={accent}
        accentMuted={accentMuted}
        t={t}
      />
      
      <style jsx global>{`
        @media (hover: none) and (pointer: coarse) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
          select, button, input { font-size: 16px !important; }
        }
        .overflow-auto, .overflow-y-auto { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  );
}
