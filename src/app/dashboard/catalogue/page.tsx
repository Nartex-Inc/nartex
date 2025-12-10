"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

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

// --- Animated Number Component ---
function AnimatedPrice({ value, duration = 600 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toFixed(2)}</span>;
}

// --- Toggle Component ---
function Toggle({ enabled, onChange, label, accentColor }: { enabled: boolean; onChange: (v: boolean) => void; label: string; accentColor: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-white text-sm font-medium hidden md:inline-block">{label}</span>
      <div 
        onClick={() => onChange(!enabled)} 
        className={cn(
          "relative w-12 h-6 rounded-full transition-colors", 
          enabled ? "bg-white" : "bg-white/30"
        )}
      >
        <div 
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm", 
            enabled ? "left-7" : "left-1 bg-white"
          )}
          style={{ backgroundColor: enabled ? accentColor : undefined }} 
        />
      </div>
    </label>
  );
}

// --- Quick Add Search Component (Popup) ---
function QuickAddSearch({ 
  onAddItems, 
  onClose, 
  accentColor 
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
      } else {
        setResults([]);
      }
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
    <div className="absolute top-20 right-4 z-50 w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex gap-2">
        <input 
          autoFocus
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 text-sm outline-none"
          placeholder="Rechercher article..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button onClick={onClose} className="px-2 text-neutral-400 hover:text-neutral-600">✕</button>
      </div>
      
      <div className="max-h-64 overflow-y-auto p-1">
        {searching ? (
          <div className="p-4 text-center text-sm text-neutral-400">Recherche...</div>
        ) : results.length > 0 ? (
          results.map(item => (
            <div 
              key={item.itemId} 
              onClick={() => toggleSelect(item.itemId)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800",
                selectedIds.has(item.itemId) && "bg-neutral-100 dark:bg-neutral-800"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                selectedIds.has(item.itemId) ? "bg-black border-black dark:bg-white dark:border-white" : "border-neutral-300"
              )}>
                {selectedIds.has(item.itemId) && <span className="text-[10px] text-white dark:text-black">✓</span>}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold truncate">{item.itemCode}</div>
                <div className="text-xs text-neutral-500 truncate">{item.description}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-neutral-400">
            {query.length > 1 ? "Aucun résultat" : "Tapez pour chercher"}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <button
          onClick={handleAdd}
          disabled={selectedIds.size === 0}
          className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: accentColor }}
        >
          Ajouter ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}

// --- Price Modal Component ---
interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];
  
  // Data for Dropdowns
  priceLists: PriceList[];
  products: Product[];
  itemTypes: ItemType[];
  items: Item[];

  // Selections
  selectedPriceList: PriceList | null;
  selectedProduct: Product | null;
  selectedType: ItemType | null;
  selectedItem: Item | null;

  // Handlers
  onPriceListChange: (priceId: number) => void;
  onProductChange: (prodId: string) => void;
  onTypeChange: (typeId: string) => void;
  onItemChange: (itemId: string) => void;
  
  onAddItems: (itemIds: number[]) => void;
  onReset: () => void; 
  onLoadSelection: () => void;

  loading: boolean;
  error: string | null;
  accentColor: string;
  accentMuted: string;
}

function PriceModal({ 
  isOpen, onClose, data, 
  priceLists, products, itemTypes, items,
  selectedPriceList, selectedProduct, selectedType, selectedItem,
  onPriceListChange, onProductChange, onTypeChange, onItemChange,
  onAddItems, onReset, onLoadSelection,
  loading, error,
  accentColor, accentMuted
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  if (!isOpen) return null;

  const itemsWithPrices = data.filter(item => item.ranges && item.ranges.length > 0);

  // --- GROUPING LOGIC ---
  const groupedItems = itemsWithPrices.reduce((acc, item) => {
    const groupKey = item.className || "Articles Ajoutés";
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, ItemPriceData[]>);

  // Calculation Helpers
  const calcPricePerCaisse = (price: number, caisse: number | null) => caisse ? price * caisse : null;
  const calcPricePerLitre = (price: number, volume: number | null) => volume ? price / volume : null;
  
  const calcMargin = (sell: number | null, cost: number | null) => {
    if (!sell || !cost || sell === 0) return null;
    return ((sell - cost) / sell) * 100;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-[98vw] max-h-[94vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div 
          className="flex-shrink-0 px-4 md:px-6 py-4 flex flex-col gap-4"
          style={{ backgroundColor: accentColor }}
        >
          {/* Row 1: Title & Main Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Liste de Prix
            </h2>
            
            <div className="flex items-center gap-3">
              <Toggle 
                enabled={showDetails} 
                onChange={setShowDetails} 
                label="Afficher détails" 
                accentColor={accentColor}
              />

              {/* Reset Button (Circular Arrow) */}
              <button 
                onClick={onReset}
                className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Réinitialiser la liste (Tout effacer)"
              >
                <span className="text-xl font-bold">↺</span>
              </button>

              <button 
                onClick={onClose}
                className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Row 2: Filters & Actions Toolbar */}
          <div className="flex flex-col md:flex-row gap-2 bg-black/10 p-2 rounded-xl border border-white/10">
             
             {/* Price List Select */}
             <select
                value={selectedPriceList?.priceId || ""}
                onChange={(e) => onPriceListChange(parseInt(e.target.value))}
                disabled={loading}
                className="h-10 px-3 bg-white/90 text-neutral-900 rounded-lg font-bold text-sm border-2 border-transparent focus:border-white outline-none flex-1 min-w-[200px]"
              >
                {priceLists.map(pl => (
                  <option key={pl.priceId} value={pl.priceId}>
                    {pl.code} - {pl.name}
                  </option>
                ))}
              </select>

              {/* Category Select */}
              <select
                value={selectedProduct?.prodId || ""}
                onChange={(e) => onProductChange(e.target.value)}
                className="h-10 px-3 bg-white/20 text-white rounded-lg font-medium text-sm border border-white/30 focus:border-white outline-none flex-1 min-w-[140px]"
              >
                <option value="" className="text-black">Catégorie...</option>
                {products.map(p => (
                  <option key={p.prodId} value={p.prodId} className="text-black">{p.name}</option>
                ))}
              </select>

              {/* Class Select */}
              <select
                value={selectedType?.itemTypeId || ""}
                onChange={(e) => onTypeChange(e.target.value)}
                disabled={!selectedProduct}
                className="h-10 px-3 bg-white/20 text-white rounded-lg font-medium text-sm border border-white/30 focus:border-white outline-none flex-1 min-w-[140px] disabled:opacity-50"
              >
                <option value="" className="text-black">Classe...</option>
                {itemTypes.map(t => (
                  <option key={t.itemTypeId} value={t.itemTypeId} className="text-black">{t.description}</option>
                ))}
              </select>

              {/* Article Select */}
              <select
                value={selectedItem?.itemId || ""}
                onChange={(e) => onItemChange(e.target.value)}
                disabled={!selectedType && !selectedProduct}
                className="h-10 px-3 bg-white/20 text-white rounded-lg font-medium text-sm border border-white/30 focus:border-white outline-none flex-1 min-w-[140px] disabled:opacity-50"
              >
                <option value="" className="text-black">Article...</option>
                {items.map(i => (
                  <option key={i.itemId} value={i.itemId} className="text-black">{i.itemCode} - {i.description}</option>
                ))}
              </select>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={onLoadSelection}
                  disabled={loading || (!selectedProduct && !selectedItem)}
                  className="h-10 px-4 rounded-lg bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  Ajouter
                </button>

                <button 
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition-colors"
                  title="Recherche Rapide"
                >
                  🔍
                </button>
              </div>
          </div>

          {/* Quick Add Popover */}
          {showQuickAdd && (
            <QuickAddSearch 
              accentColor={accentColor}
              onClose={() => setShowQuickAdd(false)}
              onAddItems={onAddItems}
            />
          )}
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-3 md:p-5 bg-neutral-100 dark:bg-neutral-950">
          {loading && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div 
                className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" 
                style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
              />
              <p className="text-neutral-500 font-medium">Chargement des prix...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl" style={{ color: `${accentColor}50` }}>!</div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: accentColor }}>Erreur</p>
                <p className="text-neutral-500 mt-1">{error}</p>
              </div>
            </div>
          ) : Object.keys(groupedItems).length > 0 ? (
            <div className="space-y-8">
              {/* ITERATE OVER GROUPS */}
              {Object.entries(groupedItems).map(([className, classItems]) => {
                
                const firstItem = classItems[0];
                let priceColumns = firstItem.ranges[0]?.columns 
                    ? Object.keys(firstItem.ranges[0].columns).sort()
                    : [selectedPriceList?.code || 'Prix'];

                if (!showDetails && selectedPriceList?.code !== "01-EXP") {
                    priceColumns = priceColumns.filter(c => c !== "01-EXP");
                }

                return (
                  <div 
                    key={className}
                    className="bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800"
                  >
                    {/* GROUP HEADER */}
                    <div className="px-4 py-3" style={{ backgroundColor: accentColor }}>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">
                        {className}
                      </h3>
                      <p className="text-white/80 text-xs mt-0.5">
                        {classItems.length} article(s) dans cette classe
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full w-full text-sm md:text-base border-collapse">
                        <thead>
                          <tr className="bg-neutral-200 dark:bg-neutral-800">
                            <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 sticky left-0 z-10 bg-neutral-200 dark:bg-neutral-800 min-w-[200px]">Article</th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 w-24 min-w-[90px]">CAISSE</th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 w-24 min-w-[90px]">Format</th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 w-20 min-w-[80px]">Qty</th>
                            <th className="text-right p-3 font-bold text-green-700 dark:text-green-400 border border-neutral-300 dark:border-neutral-700 bg-green-50 dark:bg-green-900/20 min-w-[90px]">% Marge</th>

                            {priceColumns.map((colCode) => (
                                <th key={colCode} className="text-right p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 whitespace-nowrap min-w-[120px]">{colCode}</th>
                            ))}
                            
                            {showDetails && (
                              <>
                                <th className="text-right p-3 font-bold text-blue-700 dark:text-blue-400 border border-neutral-300 dark:border-neutral-700 bg-blue-50 dark:bg-blue-900/20 min-w-[110px]">($)/Caisse</th>
                                <th className="text-right p-3 font-bold text-blue-700 dark:text-blue-400 border border-neutral-300 dark:border-neutral-700 bg-blue-50 dark:bg-blue-900/20 min-w-[110px]">($)/L</th>
                                <th className="text-right p-3 font-bold text-orange-700 dark:text-orange-400 border border-neutral-300 dark:border-neutral-700 bg-orange-50 dark:bg-orange-900/20 min-w-[100px]">Escompte</th>
                                <th className="text-right p-3 font-bold text-purple-700 dark:text-purple-400 border border-neutral-300 dark:border-neutral-700 bg-purple-50 dark:bg-purple-900/20 min-w-[90px]">% Exp</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        
                        <tbody>
                          {classItems.map((item, itemIndex) => (
                            <片 key={item.itemId}>
                              {item.ranges.map((range, rIdx) => {
                                const isFirstRowOfItem = rIdx === 0;
                                const ppc = calcPricePerCaisse(range.unitPrice, item.caisse);
                                const ppl = calcPricePerLitre(range.unitPrice, item.volume);
                                
                                const selectedPriceCode = selectedPriceList?.code || "";
                                const selectedPriceVal = range.columns?.[selectedPriceCode] ?? range.unitPrice;
                                const expBaseVal = range.columns?.["01-EXP"] ?? null;
                                const pdsVal = range.columns?.["08-PDS"] ?? null;

                                const percentExp = calcMargin(selectedPriceVal, expBaseVal);
                                const percentMarge = calcMargin(pdsVal, selectedPriceVal);
                                const rowBg = itemIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/50 dark:bg-neutral-800/30";

                                return (
                                  <tr key={range.id} className={cn("transition-colors group", rowBg)} style={{ '--hover-color': `${accentColor}15` } as React.CSSProperties}>
                                    <style jsx>{`tr:hover { background-color: var(--hover-color) !important; }`}</style>

                                    <td className={cn("p-3 border border-neutral-200 dark:border-neutral-700 align-top sticky left-0 z-10", rowBg, "group-hover:bg-[var(--hover-color)]")}>
                                      {isFirstRowOfItem && (
                                        <div className="flex flex-col">
                                          <span className="font-mono font-black text-neutral-900 dark:text-white whitespace-nowrap">{item.itemCode}</span>
                                          <span className="text-xs text-neutral-500 truncate max-w-[180px]" title={item.description}>{item.description}</span>
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* FIX: Caisse Column (Integer) */}
                                    <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700 align-top">{isFirstRowOfItem && <span className="font-black text-neutral-900 dark:text-white">{item.caisse ? Math.round(item.caisse) : '-'}</span>}</td>
                                    <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700 align-top">{isFirstRowOfItem && <span className="font-black text-neutral-900 dark:text-white">{item.format || '-'}</span>}</td>
                                    <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700"><span className="font-mono font-bold text-neutral-900 dark:text-white">{range.qtyMin}</span></td>
                                    
                                    {/* FIX: % Marge Column (No grouping, shows on all rows) */}
                                    <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-green-50 dark:bg-green-900/10">
                                      <span className={cn("font-mono font-bold whitespace-nowrap", percentMarge && percentMarge < 0 ? "text-red-600" : "text-green-700 dark:text-green-400")}>
                                        {percentMarge !== null ? `${percentMarge.toFixed(1)}%` : '-'}
                                      </span>
                                    </td>

                                    {priceColumns.map((colCode) => {
                                        const priceVal = range.columns ? range.columns[colCode] : (colCode === selectedPriceList?.code ? range.unitPrice : null);
                                        const isSelectedList = colCode === selectedPriceList?.code;
                                        return (
                                            <td key={colCode} className={cn("p-3 text-right border border-neutral-200 dark:border-neutral-700", isSelectedList && "bg-amber-50 dark:bg-amber-900/10")}>
                                                <span className={cn("font-mono font-black whitespace-nowrap", isSelectedList ? "text-amber-700 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-300")} style={{ color: isSelectedList && isFirstRowOfItem ? accentColor : undefined }}>
                                                    {priceVal !== null && priceVal !== undefined ? <AnimatedPrice value={priceVal} /> : '-'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    
                                    {showDetails && (
                                      <>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-blue-50/50 dark:bg-blue-900/10"><span className="font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">{ppc ? ppc.toFixed(2) : '-'}</span></td>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-blue-50/50 dark:bg-blue-900/10"><span className="font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">{ppl ? ppl.toFixed(2) : '-'}</span></td>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-orange-50/50 dark:bg-orange-900/10"><span className="font-mono font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">{range.costingDiscountAmt !== undefined ? range.costingDiscountAmt.toFixed(2) : '-'}</span></td>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-purple-50/50 dark:bg-purple-900/10"><span className={cn("font-mono font-bold whitespace-nowrap", percentExp && percentExp < 0 ? "text-red-600" : "text-purple-700 dark:text-purple-400")}>{percentExp !== null ? `${percentExp.toFixed(1)}%` : '-'}</span></td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                              
                              {itemIndex < classItems.length - 1 && <tr className="h-px bg-neutral-200 dark:bg-neutral-700"><td colSpan={100} className="p-0"></td></tr>}
                            </片>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl text-neutral-300">∅</div>
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-600 dark:text-neutral-400">Aucun prix trouvé</p>
                <p className="text-neutral-500 mt-1">Sélectionnez des articles et cliquez sur Ajouter.</p>
              </div>
            </div>
          )}
        </div>
        
        {!loading && itemsWithPrices.length > 0 && (
          <div className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-800 px-4 py-3 text-center">
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">{itemsWithPrices.length} article(s) {showDetails && " • Détails activés"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper component ---
function 片({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// --- Main Page Component ---
export default function CataloguePage() {
  const { color: accentColor, muted: accentMuted } = useCurrentAccent();

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
  
  // Price Modal
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // For re-fetching
  const [modalProdId, setModalProdId] = useState<number | null>(null);
  
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
          const defaultList = pls.find(p => p.code.startsWith("03")) || pls[0];
          if (defaultList) setSelectedPriceList(defaultList);
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

  // --- Fetch Prices General ---
  const fetchPrices = async (priceId: number, prodId: number | null, typeId?: number | null, itemId?: number | null) => {
    setPriceData([]);
    setPriceError(null);
    setLoadingPrices(true);
    try {
      let url = `/api/catalogue/prices?priceId=${priceId}`;
      if (prodId) url += `&prodId=${prodId}`;
      if (itemId) url += `&itemId=${itemId}`;
      else if (typeId) url += `&typeId=${typeId}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch");
      const data = await res.json();
      setPriceData(data);
    } catch (err: any) {
      setPriceError(err.message || "Erreur");
    } finally {
      setLoadingPrices(false);
    }
  };

  // --- Handle Adding Items via Quick Add / Modal Dropdown ---
  const handleAddItems = async (itemIds: number[]) => {
    if (!selectedPriceList || itemIds.length === 0) return;
    setLoadingPrices(true);
    try {
      const idsString = itemIds.join(',');
      const url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&itemIds=${idsString}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch items");
      const newItems: ItemPriceData[] = await res.json();
      setPriceData(prev => {
        const existingIds = new Set(prev.map(i => i.itemId));
        const filteredNew = newItems.filter(i => !existingIds.has(i.itemId));
        return [...prev, ...filteredNew];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrices(false);
    }
  };

  // --- Handle Load Selection from Modal Dropdowns ---
  const handleLoadSelection = async () => {
    if (!selectedPriceList) return;
    // Strategy: If specific item selected, add it. If not, add whole category/class.
    if (selectedItem) {
        await handleAddItems([selectedItem.itemId]);
    } else {
        // Fetch based on Category/Class and APPEND
        setLoadingPrices(true);
        try {
            let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}`;
            if (selectedProduct) url += `&prodId=${selectedProduct.prodId}`;
            if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error("Erreur fetch");
            const newItems: ItemPriceData[] = await res.json();
            
            setPriceData(prev => {
                const existingIds = new Set(prev.map(i => i.itemId));
                const filteredNew = newItems.filter(i => !existingIds.has(i.itemId));
                return [...prev, ...filteredNew];
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPrices(false);
        }
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
    } finally { setLoadingTypes(false); }
  };

  const handleTypeChange = async (typeId: string) => {
    if (!typeId) { setSelectedType(null); setSelectedItem(null); setItems([]); return; }
    const type = itemTypes.find(t => t.itemTypeId === parseInt(typeId));
    if (!type) return;
    setSelectedType(type);
    setSelectedItem(null);
    setItems([]);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
      if (res.ok) setItems(await res.json());
    } finally { setLoadingItems(false); }
  };

  const handleItemChange = (itemId: string) => {
    if (!itemId) { setSelectedItem(null); return; }
    const item = items.find(i => i.itemId === parseInt(itemId));
    if (item) setSelectedItem(item);
  };

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery(""); setSearchResults([]); setSelectedItem(item);
    const prod = products.find(p => p.prodId === item.prodId);
    if (prod) {
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
            } finally { setLoadingItems(false); }
          }
        }
      } finally { setLoadingTypes(false); }
    }
  };

  const handleGenerate = async () => {
    if (!selectedPriceList || !selectedProduct) return;
    setModalProdId(selectedProduct.prodId);
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
    if (pl) {
      setSelectedPriceList(pl);
      if (priceData.length > 0) {
          setLoadingPrices(true);
          const allIds = Array.from(new Set(priceData.map(i => i.itemId))).join(',');
          try {
              const url = `/api/catalogue/prices?priceId=${priceId}&itemIds=${allIds}`;
              const res = await fetch(url);
              if (res.ok) setPriceData(await res.json());
          } finally {
              setLoadingPrices(false);
          }
      }
    }
  };

  const canGenerate = selectedPriceList && selectedProduct;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 p-4 md:p-6 flex flex-col justify-center items-center">
          <div className="w-full max-w-3xl">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg p-5 md:p-8">
              {/* Branding & Search (unchanged) */}
              <div className="flex items-center gap-4 mb-8">
                <Image src="/sinto-logo.svg" alt="SINTO Logo" width={64} height={64} className="h-16 w-16 object-contain" />
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Catalogue SINTO</h1>
                  <p className="text-sm text-neutral-500">Générateur de liste de prix</p>
                </div>
              </div>
              <div className="mb-8 relative">
                <input type="search" placeholder="Recherche rapide par code article..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 px-5 rounded-xl text-base font-medium bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent focus:ring-0 focus:outline-none transition-colors" style={{ '--focus-color': accentColor } as React.CSSProperties} />
                <style jsx>{`input[type="search"]:focus { border-color: var(--focus-color) !important; }`}</style>
                {searchQuery.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-72 overflow-y-auto z-50">
                    {isSearching ? (<div className="p-6 flex justify-center"><div className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} /></div>) : searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button key={item.itemId} onClick={() => handleSearchResultClick(item)} className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors group">
                          <div className="flex items-center gap-3"><span className="font-mono font-black text-sm" style={{ color: accentColor }}>{item.itemCode}</span><span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{item.description}</span></div>
                          <div className="text-xs text-neutral-400 mt-1">{item.categoryName} → {item.className}</div>
                        </button>
                      ))
                    ) : (<div className="p-6 text-center text-neutral-500">Aucun résultat</div>)}
                  </div>
                )}
              </div>

              {/* Main Form Fields (unchanged) */}
              <div className="space-y-5">
                <div><label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">1. Liste de Prix</label><select value={selectedPriceList?.priceId || ""} onChange={(e) => handlePriceListChange(e.target.value)} className="w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-colors" style={{ '--focus-color': accentColor } as React.CSSProperties}><option value="" disabled>Sélectionner...</option>{priceLists.map(pl => (<option key={pl.priceId} value={pl.priceId}>{pl.code} - {pl.name}</option>))}</select><style jsx>{`select:focus { border-color: var(--focus-color) !important; }`}</style></div>
                <div><label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">2. Catégorie</label><select value={selectedProduct?.prodId || ""} onChange={(e) => handleProductChange(e.target.value)} disabled={!selectedPriceList} className={cn("w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all", !selectedPriceList && "opacity-50 cursor-not-allowed")} style={{ '--focus-color': accentColor } as React.CSSProperties}><option value="" disabled>Sélectionner...</option>{products.map(p => (<option key={p.prodId} value={p.prodId}>{p.name} ({p.itemCount})</option>))}</select></div>
                <div><label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">3. Classe <span className="text-neutral-400 font-normal normal-case">(Optionnel)</span></label><select value={selectedType?.itemTypeId || ""} onChange={(e) => handleTypeChange(e.target.value)} disabled={!selectedProduct || loadingTypes} className={cn("w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all", (!selectedProduct || loadingTypes) && "opacity-50 cursor-not-allowed")} style={{ '--focus-color': accentColor } as React.CSSProperties}><option value="">{loadingTypes ? "Chargement..." : "Toutes les classes"}</option>{itemTypes.map(t => (<option key={t.itemTypeId} value={t.itemTypeId}>{t.description} ({t.itemCount})</option>))}</select></div>
                <div><label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">4. Article <span className="text-neutral-400 font-normal normal-case">(Optionnel)</span></label><select value={selectedItem?.itemId || ""} onChange={(e) => handleItemChange(e.target.value)} disabled={!selectedType || loadingItems} className={cn("w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all", (!selectedType || loadingItems) && "opacity-50 cursor-not-allowed")} style={{ '--focus-color': accentColor } as React.CSSProperties}><option value="">{loadingItems ? "Chargement..." : "Tous les articles"}</option>{items.map(i => (<option key={i.itemId} value={i.itemId}>{i.itemCode} - {i.description}</option>))}</select></div>
                <div className="pt-4"><button onClick={handleGenerate} disabled={!canGenerate} className={cn("w-full h-16 rounded-xl font-black text-lg uppercase tracking-wide transition-all shadow-lg", !canGenerate && "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none")} style={canGenerate ? { backgroundColor: accentColor, color: '#ffffff', boxShadow: `0 10px 15px -3px ${accentColor}40` } : {}}>GÉNÉRER LA LISTE</button></div>
              </div>
            </div>
            {selectedItem && (<div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}><div className="font-bold" style={{ color: accentColor }}>{selectedItem.itemCode}</div><div className="text-sm opacity-80" style={{ color: accentColor }}>{selectedItem.description}</div></div>)}
          </div>
        </main>
      </div>

      <PriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        data={priceData}
        
        // Passing dropdown data
        priceLists={priceLists}
        products={products}
        itemTypes={itemTypes}
        items={items}

        // Passing selections
        selectedPriceList={selectedPriceList}
        selectedProduct={selectedProduct}
        selectedType={selectedType}
        selectedItem={selectedItem}

        // Passing handlers
        onPriceListChange={handleModalPriceListChange}
        onProductChange={handleProductChange}
        onTypeChange={handleTypeChange}
        onItemChange={handleItemChange}
        
        onAddItems={handleAddItems}
        onReset={() => setPriceData([])} // Reset Logic
        onLoadSelection={handleLoadSelection} // Load Button Logic

        loading={loadingPrices}
        error={priceError}
        accentColor={accentColor}
        accentMuted={accentMuted}
      />
    </div>
  );
}
