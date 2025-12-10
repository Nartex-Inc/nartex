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
  columns?: Record<string, number>;
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
  accentColor: string;
  accentMuted: string;
}

function PriceModal({ 
  isOpen, onClose, data, priceLists, 
  selectedPriceList, onPriceListChange, loading, error,
  accentColor, accentMuted
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const itemsWithPrices = data.filter(item => item.ranges && item.ranges.length > 0);

  // --- GROUPING LOGIC ---
  const groupedItems = itemsWithPrices.reduce((acc, item) => {
    const groupKey = item.className || "Autres";
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, ItemPriceData[]>);

  // Calculation Helpers
  const calcPricePerCaisse = (price: number, caisse: number | null) => caisse ? price * caisse : null;
  const calcPricePerLitre = (price: number, volume: number | null) => volume ? price / volume : null;
  const calcMarginExp = (unit: number, cout: number | null) => cout && unit ? ((unit - cout) / unit) * 100 : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-[98vw] max-h-[94vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div 
          className="flex-shrink-0 px-4 md:px-6 py-4"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Liste de Prix
            </h2>
            
            <div className="flex items-center gap-4">
              <Toggle 
                enabled={showDetails} 
                onChange={setShowDetails} 
                label="Afficher détails" 
                accentColor={accentColor}
              />

              <select
                value={selectedPriceList?.priceId || ""}
                onChange={(e) => onPriceListChange(parseInt(e.target.value))}
                disabled={loading}
                className="h-12 px-4 bg-white/20 text-white rounded-xl font-bold text-base border-2 border-white/30 focus:border-white outline-none min-w-[200px] disabled:opacity-50"
              >
                {priceLists.map(pl => (
                  <option key={pl.priceId} value={pl.priceId} className="text-neutral-900">
                    {pl.code} - {pl.name}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-2xl transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-3 md:p-5 bg-neutral-100 dark:bg-neutral-950">
          {loading ? (
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
                
                // Determine Columns from the first item
                const firstItem = classItems[0];
                const priceColumns = firstItem.ranges[0]?.columns 
                    ? Object.keys(firstItem.ranges[0].columns).sort()
                    : [selectedPriceList?.code || 'Prix'];

                return (
                  <div 
                    key={className}
                    className="bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800"
                  >
                    {/* GROUP HEADER (Banner) */}
                    <div className="px-4 py-3" style={{ backgroundColor: accentColor }}>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">
                        {className}
                      </h3>
                      <p className="text-white/80 text-xs mt-0.5">
                        {classItems.length} article(s) dans cette classe
                      </p>
                    </div>
                    
                    {/* SINGLE TABLE for the class */}
                    <div className="overflow-x-auto">
                      {/* FIX: Removed 'table-fixed', added 'min-w-full' to prevent crushing */}
                      <table className="min-w-full w-full text-sm md:text-base border-collapse">
                        <thead>
                          <tr className="bg-neutral-200 dark:bg-neutral-800">
                            {/* Article Name - Needs nice width */}
                            <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 sticky left-0 z-10 bg-neutral-200 dark:bg-neutral-800 min-w-[200px]">
                              Article
                            </th>
                            
                            {/* Static Columns - Fixed small widths */}
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 w-24 min-w-[90px]">
                              CAISSE
                            </th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 w-24 min-w-[90px]">
                              Format
                            </th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 w-20 min-w-[80px]">
                              Qty
                            </th>
                            
                            {/* Coût Exp */}
                            {showDetails && (
                              <th className="text-right p-3 font-bold text-purple-700 dark:text-purple-400 border border-neutral-300 dark:border-neutral-700 bg-purple-50 dark:bg-purple-900/20 min-w-[110px]">
                                Coût Exp
                              </th>
                            )}

                            {/* Dynamic Price Headers - Give them breathing room */}
                            {priceColumns.map((colCode) => (
                                <th 
                                    key={colCode}
                                    className="text-right p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 whitespace-nowrap min-w-[120px]"
                                >
                                    {colCode}
                                </th>
                            ))}
                            
                            {/* Expanded Details Headers */}
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
                                const marginExp = calcMarginExp(range.unitPrice, range.coutExp);
                                
                                const rowBg = itemIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/50 dark:bg-neutral-800/30";

                                return (
                                  <tr 
                                    key={range.id} 
                                    className={cn(
                                      "transition-colors group",
                                      rowBg
                                    )}
                                    style={{ '--hover-color': `${accentColor}15` } as React.CSSProperties}
                                  >
                                    <style jsx>{`tr:hover { background-color: var(--hover-color) !important; }`}</style>

                                    {/* Basic Info - Sticky Left to keep context while scrolling right */}
                                    <td className={cn(
                                      "p-3 border border-neutral-200 dark:border-neutral-700 align-top sticky left-0 z-10",
                                      rowBg,
                                      "group-hover:bg-[var(--hover-color)]" // Ensure sticky column also gets hover effect
                                    )}>
                                      {isFirstRowOfItem && (
                                        <div className="flex flex-col">
                                          <span className="font-mono font-black text-neutral-900 dark:text-white whitespace-nowrap">{item.itemCode}</span>
                                          <span className="text-xs text-neutral-500 truncate max-w-[180px]" title={item.description}>{item.description}</span>
                                        </div>
                                      )}
                                    </td>
                                    
                                    <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700 align-top">
                                      {isFirstRowOfItem && <span className="font-black text-neutral-900 dark:text-white">{item.caisse || '-'}</span>}
                                    </td>
                                    <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700 align-top">
                                      {isFirstRowOfItem && <span className="font-black text-neutral-900 dark:text-white">{item.format || '-'}</span>}
                                    </td>
                                    <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700">
                                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{range.qtyMin}</span>
                                    </td>
                                    
                                    {/* Coût Exp */}
                                    {showDetails && (
                                      <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-purple-50/50 dark:bg-purple-900/10">
                                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                                          {range.coutExp ? range.coutExp.toFixed(2) : '-'}
                                        </span>
                                      </td>
                                    )}

                                    {/* Dynamic Price Cells */}
                                    {priceColumns.map((colCode) => {
                                        const priceVal = range.columns ? range.columns[colCode] : (colCode === selectedPriceList?.code ? range.unitPrice : null);
                                        const isSelectedList = colCode === selectedPriceList?.code;

                                        return (
                                            <td 
                                                key={colCode} 
                                                className={cn(
                                                    "p-3 text-right border border-neutral-200 dark:border-neutral-700",
                                                    isSelectedList && "bg-amber-50 dark:bg-amber-900/10"
                                                )}
                                            >
                                                <span 
                                                    className={cn(
                                                        "font-mono font-black whitespace-nowrap",
                                                        isSelectedList ? "text-amber-700 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-300"
                                                    )}
                                                    style={{ color: isSelectedList && isFirstRowOfItem ? accentColor : undefined }}
                                                >
                                                    {priceVal ? <AnimatedPrice value={priceVal} /> : '-'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    
                                    {/* Expanded Details Data */}
                                    {showDetails && (
                                      <>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-blue-50/50 dark:bg-blue-900/10">
                                          <span className="font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">{ppc ? ppc.toFixed(2) : '-'}</span>
                                        </td>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-blue-50/50 dark:bg-blue-900/10">
                                          <span className="font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">{ppl ? ppl.toFixed(2) : '-'}</span>
                                        </td>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-orange-50/50 dark:bg-orange-900/10">
                                          <span className="font-mono font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">{range.costingDiscountAmt !== undefined ? range.costingDiscountAmt.toFixed(2) : '-'}</span>
                                        </td>
                                        <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-purple-50/50 dark:bg-purple-900/10">
                                          <span className={cn("font-mono font-bold whitespace-nowrap", marginExp && marginExp > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                            {marginExp ? `${marginExp.toFixed(1)}%` : '-'}
                                          </span>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                              
                              {/* Separator */}
                              {itemIndex < classItems.length - 1 && (
                                <tr className="h-px bg-neutral-200 dark:bg-neutral-700">
                                  <td colSpan={100} className="p-0"></td>
                                </tr>
                              )}
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
                <p className="text-xl font-bold text-neutral-600 dark:text-neutral-400">
                  Aucun prix trouvé
                </p>
                <p className="text-neutral-500 mt-1">
                  Aucun article avec prix pour cette sélection.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!loading && itemsWithPrices.length > 0 && (
          <div className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-800 px-4 py-3 text-center">
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
              {itemsWithPrices.length} article(s) {showDetails && " • Détails activés"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper component to replace Fragment because using <></> inside map sometimes causes issues without keys
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

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="min-h-screen flex flex-col">
        
        {/* MAIN CONTENT - Vertically Centered */}
        <main className="flex-1 p-4 md:p-6 flex flex-col justify-center items-center">
          <div className="w-full max-w-3xl">
            
            {/* Selection Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg p-5 md:p-8">
              
              {/* BRANDING HEADER (INSIDE CARD) */}
              <div className="flex items-center gap-4 mb-8">
                <Image 
                  src="/sinto-logo.svg" 
                  alt="SINTO Logo" 
                  width={64} 
                  height={64} 
                  className="h-16 w-16 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                    Catalogue SINTO
                  </h1>
                  <p className="text-sm text-neutral-500">Générateur de liste de prix</p>
                </div>
              </div>

              {/* SEARCH BAR (INSIDE CARD) */}
              <div className="mb-8 relative">
                <input 
                  type="search" 
                  placeholder="Recherche rapide par code article..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 px-5 rounded-xl text-base font-medium bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent focus:ring-0 focus:outline-none transition-colors"
                  style={{ '--focus-color': accentColor } as React.CSSProperties}
                />
                <style jsx>{`
                  input[type="search"]:focus {
                    border-color: var(--focus-color) !important;
                  }
                `}</style>

                {/* Search Dropdown */}
                {searchQuery.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-72 overflow-y-auto z-50">
                    {isSearching ? (
                      <div className="p-6 flex justify-center">
                        <div 
                          className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin" 
                          style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
                        />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button 
                          key={item.itemId}
                          onClick={() => handleSearchResultClick(item)}
                          className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span 
                              className="font-mono font-black text-sm"
                              style={{ color: accentColor }}
                            >
                              {item.itemCode}
                            </span>
                            <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                              {item.description}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 mt-1">
                            {item.categoryName} → {item.className}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-neutral-500">
                        Aucun résultat
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FORM FIELDS */}
              <div className="space-y-5">
                
                {/* Step 1: Price List */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    1. Liste de Prix
                  </label>
                  <select
                    value={selectedPriceList?.priceId || ""}
                    onChange={(e) => handlePriceListChange(e.target.value)}
                    className="w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-colors"
                    style={{ '--focus-color': accentColor } as React.CSSProperties}
                  >
                    <option value="" disabled>Sélectionner...</option>
                    {priceLists.map(pl => (
                      <option key={pl.priceId} value={pl.priceId}>
                        {pl.code} - {pl.name}
                      </option>
                    ))}
                  </select>
                  <style jsx>{`select:focus { border-color: var(--focus-color) !important; }`}</style>
                </div>

                {/* Step 2: Category */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    2. Catégorie
                  </label>
                  <select
                    value={selectedProduct?.prodId || ""}
                    onChange={(e) => handleProductChange(e.target.value)}
                    disabled={!selectedPriceList}
                    className={cn(
                      "w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all",
                      !selectedPriceList && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ '--focus-color': accentColor } as React.CSSProperties}
                  >
                    <option value="" disabled>Sélectionner...</option>
                    {products.map(p => (
                      <option key={p.prodId} value={p.prodId}>
                        {p.name} ({p.itemCount})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Class (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    3. Classe <span className="text-neutral-400 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <select
                    value={selectedType?.itemTypeId || ""}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={!selectedProduct || loadingTypes}
                    className={cn(
                      "w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all",
                      (!selectedProduct || loadingTypes) && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ '--focus-color': accentColor } as React.CSSProperties}
                  >
                    <option value="">
                      {loadingTypes ? "Chargement..." : "Toutes les classes"}
                    </option>
                    {itemTypes.map(t => (
                      <option key={t.itemTypeId} value={t.itemTypeId}>
                        {t.description} ({t.itemCount})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 4: Item (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    4. Article <span className="text-neutral-400 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <select
                    value={selectedItem?.itemId || ""}
                    onChange={(e) => handleItemChange(e.target.value)}
                    disabled={!selectedType || loadingItems}
                    className={cn(
                      "w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all",
                      (!selectedType || loadingItems) && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ '--focus-color': accentColor } as React.CSSProperties}
                  >
                    <option value="">
                      {loadingItems ? "Chargement..." : "Tous les articles"}
                    </option>
                    {items.map(i => (
                      <option key={i.itemId} value={i.itemId}>
                        {i.itemCode} - {i.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generate Button */}
                <div className="pt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={cn(
                      "w-full h-16 rounded-xl font-black text-lg uppercase tracking-wide transition-all shadow-lg",
                      !canGenerate && "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none"
                    )}
                    style={canGenerate ? { 
                      backgroundColor: accentColor, 
                      color: '#ffffff',
                      boxShadow: `0 10px 15px -3px ${accentColor}40`
                    } : {}}
                  >
                    GÉNÉRER LA LISTE
                  </button>
                </div>

              </div>
            </div>

            {/* Selected Item Preview */}
            {selectedItem && (
              <div 
                className="mt-4 p-4 rounded-xl border"
                style={{ 
                  backgroundColor: `${accentColor}10`, // 10% opacity hex
                  borderColor: `${accentColor}30` 
                }}
              >
                <div className="font-bold" style={{ color: accentColor }}>
                  {selectedItem.itemCode}
                </div>
                <div className="text-sm opacity-80" style={{ color: accentColor }}>
                  {selectedItem.description}
                </div>
              </div>
            )}

          </div>
        </main>

      </div>

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
        accentColor={accentColor}
        accentMuted={accentMuted}
      />
    </div>
  );
}
