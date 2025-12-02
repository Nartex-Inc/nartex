"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Search, Package, Layers, Tag, X, Check, 
  ArrowRight, Scale, ChevronRight, Zap, ArrowLeft, Trash2, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface Product {
  prodId: number;
  name: string;
  itemCount: number;
  // UI Helpers added on client side
  color?: string; 
  bg?: string; 
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
}

interface PriceList {
  priceId: number;
  name: string;
  currency: string;
}

interface PriceRange {
  id: number;
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

// --- UI Constants ---
const UI_COLORS = [
  { text: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { text: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { text: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  { text: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { text: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { text: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-900/30" },
];

export default function CataloguePage() {
  // --- Data State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  
  // --- Selection State ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  
  // --- Search & Compare State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [compareList, setCompareList] = useState<Item[]>([]);
  const [pricesMap, setPricesMap] = useState<Record<number, ItemPrices>>({}); // Cache for fetched prices
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [loadingState, setLoadingState] = useState<"idle" | "loading_types" | "loading_items">("idle");

  // --- Initial Fetch (Products & PriceLists) ---
  useEffect(() => {
    async function initData() {
      try {
        const [prodRes, plRes] = await Promise.all([
          fetch("/api/catalogue/products"),
          fetch("/api/catalogue/pricelists")
        ]);
        
        if (prodRes.ok) {
          const prods: Product[] = await prodRes.json();
          // Assign UI colors cyclically
          const coloredProds = prods.map((p, i) => ({
            ...p,
            ...UI_COLORS[i % UI_COLORS.length]
          }));
          setProducts(coloredProds);
        }

        if (plRes.ok) {
          const pls: PriceList[] = await plRes.json();
          setPriceLists(pls);
          if (pls.length > 0) setSelectedPriceList(pls[0]);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    initData();
  }, []);

  // --- Search Effect ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setItems(data);
            // Clear hierarchy selection when searching
            setSelectedProduct(null);
            setSelectedType(null);
          }
        } catch (error) {
          console.error("Search error", error);
        } finally {
          setIsSearching(false);
        }
      } else if (searchQuery === "") {
        // Reset to empty items if search cleared and no hierarchy selected
        if (!selectedType) setItems([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedType]);

  // --- Handlers ---

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setSelectedType(null);
    setSearchQuery("");
    setLoadingState("loading_types");
    
    try {
      const res = await fetch(`/api/catalogue/itemtypes?prodId=${product.prodId}`);
      if (res.ok) {
        const data = await res.json();
        setItemTypes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingState("idle");
    }
  };

  const handleSelectType = async (type: ItemType) => {
    setSelectedType(type);
    setLoadingState("loading_items");
    
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingState("idle");
    }
  };

  const toggleCompare = async (item: Item) => {
    // 1. Update List
    setCompareList(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) return prev.filter(i => i.itemId !== item.itemId);
      if (prev.length >= 2) return [prev[1], item]; // Rotate max 2
      return [...prev, item];
    });

    // 2. Fetch Prices if not in cache
    if (!pricesMap[item.itemId]) {
      try {
        const res = await fetch(`/api/catalogue/prices?itemId=${item.itemId}`);
        if (res.ok) {
          const priceData: ItemPrices = await res.json();
          setPricesMap(prev => ({ ...prev, [item.itemId]: priceData }));
        }
      } catch (err) {
        console.error("Price fetch error", err);
      }
    }
  };

  const resetNav = () => {
    setSelectedProduct(null);
    setSelectedType(null);
    setSearchQuery("");
    setItems([]);
  };

  // --- Helper to get price for current selected list ---
  const getPriceForList = (itemId: number): PriceRange[] => {
    if (!selectedPriceList || !pricesMap[itemId]) return [];
    const list = pricesMap[itemId].priceLists.find(pl => pl.priceId === selectedPriceList.priceId);
    return list?.ranges || [];
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans">
      
      {/* 1. Large Touch Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar">
             <button 
                onClick={resetNav}
                className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-2xl active:scale-95 transition-all"
             >
                <Package className="w-6 h-6 text-emerald-600" />
             </button>

             <div className="flex items-center gap-2 text-lg whitespace-nowrap">
                <span onClick={resetNav} className="font-medium cursor-pointer active:opacity-60">Catalogue</span>
                
                {selectedProduct && (
                   <>
                     <ChevronRight className="w-5 h-5 text-neutral-400" />
                     <button 
                        onClick={() => { setSelectedType(null); setSearchQuery(""); }}
                        className="font-bold px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl active:scale-95 transition-all"
                     >
                        {selectedProduct.name.split('-')[0]}
                     </button>
                   </>
                )}
                
                {selectedType && (
                   <>
                     <ChevronRight className="w-5 h-5 text-neutral-400" />
                     <span className="font-bold text-emerald-600 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        {selectedType.description.split('-')[1] || selectedType.description}
                     </span>
                   </>
                )}
             </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Rechercher code, description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-12 text-lg bg-neutral-100 dark:bg-neutral-800 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all shadow-sm"
            />
            {isSearching ? (
               <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-emerald-500" />
            ) : searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); if(!selectedProduct) setItems([]); }} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 active:bg-neutral-200 dark:active:bg-neutral-700 rounded-full"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 pb-40">
        
        {/* VIEW 1: CATEGORIES (Level 1) */}
        {!selectedProduct && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <Layers className="w-8 h-8 text-neutral-400" /> 
              Catégories Principales
            </h2>
            {products.length === 0 ? (
               <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-neutral-300" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <button
                    key={prod.prodId}
                    onClick={() => handleSelectProduct(prod)}
                    className="group relative h-48 bg-white dark:bg-neutral-800 rounded-3xl p-8 text-left border-2 border-transparent hover:border-emerald-500 transition-all shadow-md active:scale-[0.98]"
                  >
                    {/* Dynamic Background Blob */}
                    <div className={cn("absolute top-0 right-0 w-40 h-40 opacity-10 rounded-bl-[100px] transition-transform group-hover:scale-110", prod.bg?.replace('bg-', 'bg-') || "bg-neutral-100")} />
                    
                    <div className={cn("w-14 h-14 rounded-2xl mb-4 flex items-center justify-center shadow-sm", prod.bg || "bg-neutral-100")}>
                      <Package className={cn("w-7 h-7", prod.color || "text-neutral-600")} />
                    </div>
                    
                    <h3 className="text-xl font-bold pr-10 leading-tight">{prod.name}</h3>
                    <p className="text-neutral-500 mt-2 font-medium">{prod.itemCount} articles</p>
                    
                    <div className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TYPES (Level 2) */}
        {selectedProduct && !selectedType && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
             <button 
                onClick={() => setSelectedProduct(null)}
                className="mb-8 flex items-center gap-2 px-6 py-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 font-semibold active:scale-95 transition-transform"
             >
                <ArrowLeft className="w-5 h-5" /> Retour
             </button>

            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <span className={cn("w-4 h-4 rounded-full", selectedProduct.bg?.split(' ')[0] || "bg-emerald-500")} />
              {selectedProduct.name}
            </h2>

            {loadingState === "loading_types" ? (
               <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-neutral-300" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {itemTypes.map((type) => (
                  <button
                    key={type.itemTypeId}
                    onClick={() => handleSelectType(type)}
                    className="flex items-center gap-6 p-6 h-32 bg-white dark:bg-neutral-800 rounded-3xl border-2 border-transparent hover:border-emerald-500 shadow-md active:scale-[0.98] transition-all text-left group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 transition-colors">
                      <Tag className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold truncate">{type.description}</h4>
                      <p className="text-neutral-500 mt-1">{type.itemCount} produits</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-neutral-300 group-hover:text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ITEMS (Level 3 or Search Results) */}
        {(selectedType || searchQuery) && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             {!searchQuery && (
               <button 
                 onClick={() => setSelectedType(null)} 
                 className="mb-8 flex items-center gap-2 px-6 py-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 font-semibold active:scale-95 transition-transform"
               >
                 <ArrowLeft className="w-5 h-5" /> Retour aux types
               </button>
             )}

             {loadingState === "loading_items" ? (
               <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-neutral-300" /></div>
             ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item) => {
                  const isCompared = compareList.some(c => c.itemId === item.itemId);
                  // Ensure we have fetched price for this item if it's selected
                  const prices = getPriceForList(item.itemId);
                  const lowestPrice = prices.length > 0 ? prices[prices.length -1].unitPrice : 0; // Usually last tier is cheapest

                  return (
                    <div 
                        key={item.itemId}
                        onClick={() => toggleCompare(item)}
                        className={cn(
                          "relative p-6 bg-white dark:bg-neutral-800 rounded-3xl border-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]",
                          isCompared 
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" 
                            : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-600"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-mono text-lg font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">
                            {item.itemCode}
                          </span>
                          <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                              isCompared ? "bg-emerald-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-400"
                          )}>
                              {isCompared ? <Check className="w-5 h-5" /> : <Scale className="w-4 h-4" />}
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg leading-snug mb-4 min-h-[3rem]">
                          {item.description}
                        </h3>
                        
                        <div className="flex items-end justify-between">
                          <div>
                              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
                                {lowestPrice > 0 ? "Prix (Approx)" : "Sélectionner pour prix"}
                              </p>
                              {lowestPrice > 0 ? (
                                <p className="text-2xl font-bold">{lowestPrice.toFixed(2)} $</p>
                              ) : (
                                <p className="text-lg text-neutral-400 font-medium">---</p>
                              )}
                          </div>
                          <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm font-semibold active:bg-neutral-200 transition-colors">
                              {isCompared ? "Sélectionné" : "Comparer"}
                          </button>
                        </div>
                    </div>
                  );
                })}
              </div>
             )}

            {!loadingState && items.length === 0 && (
                <div className="p-16 text-center text-neutral-500 bg-white dark:bg-neutral-800 rounded-3xl border-dashed border-2 border-neutral-300">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-medium">Aucun article trouvé.</p>
                </div>
            )}
          </div>
        )}
      </main>

      {/* FLOATING ACTION BAR (iPad Thumb Zone) */}
      {compareList.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[90%] md:w-[600px] animate-in slide-in-from-bottom-24 duration-500">
          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[2rem] p-4 pr-5 shadow-2xl flex items-center justify-between gap-4 ring-4 ring-white/20 backdrop-blur-md">
            
            <div className="flex items-center gap-4">
               <div className="flex -space-x-4 pl-2">
                 {compareList.map((item, i) => (
                   <div key={item.itemId} className="w-14 h-14 rounded-full bg-emerald-500 border-4 border-neutral-900 dark:border-white flex items-center justify-center text-lg font-bold text-white shadow-lg relative">
                     {i + 1}
                     <button 
                       onClick={() => {
                         setCompareList(prev => prev.filter(p => p.itemId !== item.itemId));
                       }}
                       className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-neutral-900"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 ))}
                 {compareList.length < 2 && (
                   <div className="w-14 h-14 rounded-full bg-neutral-800 dark:bg-neutral-200 border-4 border-neutral-900 dark:border-white border-dashed flex items-center justify-center opacity-50">
                     <span className="text-xl">+</span>
                   </div>
                 )}
               </div>
               
               <div className="hidden sm:block">
                 <p className="font-bold text-lg">Comparateur</p>
                 <p className="text-sm opacity-70">{compareList.length} / 2 sélectionnés</p>
               </div>
            </div>

            <button 
              // Enable for 1 item (view price) or 2 (compare)
              onClick={() => setShowCompareModal(true)}
              className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-lg flex items-center gap-2 transition-all active:scale-95 shadow-lg"
            >
              {compareList.length === 1 ? <Zap className="w-5 h-5"/> : <Scale className="w-5 h-5" />}
              {compareList.length === 1 ? "VOIR PRIX" : "COMPARER"}
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN COMPARISON MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 md:p-8">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-[90vh] md:h-auto max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" /> 
                    {compareList.length === 1 ? "Détail du prix" : "Comparaison"}
                  </h3>
                  
                  {/* PRICE LIST DROPDOWN */}
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm font-semibold text-neutral-500">Liste:</span>
                    <select 
                      className="bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 font-medium"
                      value={selectedPriceList?.priceId}
                      onChange={(e) => {
                        const pl = priceLists.find(p => p.priceId === parseInt(e.target.value));
                        if (pl) setSelectedPriceList(pl);
                      }}
                    >
                      {priceLists.map(pl => (
                        <option key={pl.priceId} value={pl.priceId}>{pl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                   onClick={() => setShowCompareModal(false)} 
                   className="p-4 bg-neutral-200 dark:bg-neutral-700 rounded-full hover:bg-neutral-300 transition-colors active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Comparison Content */}
            <div className={`flex-1 overflow-y-auto grid ${compareList.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x"} divide-neutral-200 dark:divide-neutral-700`}>
              {compareList.map((item) => {
                const ranges = getPriceForList(item.itemId);
                return (
                  <div key={item.itemId} className="p-8 space-y-8">
                    <div className="inline-block px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-mono font-bold mb-2">
                      {item.itemCode}
                    </div>
                    <h4 className="text-3xl font-bold leading-tight">{item.description}</h4>
                    
                    {/* PRICE MATRIX */}
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                          <tr>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Quantité</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right">Prix Unitaire</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                          {ranges.length > 0 ? (
                            ranges.map((range) => (
                              <tr key={range.id}>
                                <td className="p-4 font-mono font-medium">
                                  {range.qtyMin} {range.qtyMax ? `à ${range.qtyMax}` : "+"}
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-lg text-emerald-600">
                                  {range.unitPrice.toFixed(2)} $
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="p-8 text-center text-neutral-500">
                                Aucun prix disponible pour cette liste.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-6 pt-4">
                      <div className="flex justify-between items-center border-b border-dashed border-neutral-200 dark:border-neutral-700 pb-4">
                        <span className="text-lg text-neutral-500">ID Produit</span>
                        <span className="text-lg font-mono font-bold">{item.prodId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-dashed border-neutral-200 dark:border-neutral-700 pb-4">
                        <span className="text-lg text-neutral-500">Sous-Type</span>
                        <span className="text-lg font-mono font-bold">{item.itemSubTypeId}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 flex justify-between items-center">
               <button 
                  onClick={() => { setCompareList([]); setShowCompareModal(false); }}
                  className="px-6 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
               >
                  <Trash2 className="w-5 h-5" /> Tout effacer
               </button>
               <span className="text-sm text-neutral-400 hidden md:block">* Prix sujets à changement selon le volume.</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
