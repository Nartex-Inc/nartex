"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, Package, Layers, Tag, X, ChevronDown, 
  ArrowRight, Scale, Zap, Trash2, Loader2, AlertCircle, ShoppingCart 
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function CataloguePage() {
  // --- Data State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  
  // --- Selection State (Step 1, 2, 3) ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // --- Price View State ---
  const [activePriceListId, setActivePriceListId] = useState<number | null>(null);
  const [pricesCache, setPricesCache] = useState<Record<number, ItemPrices>>({});
  
  // --- Search & Compare State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [compareList, setCompareList] = useState<Item[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  const [loadingStep, setLoadingStep] = useState<"idle" | "loading_types" | "loading_items" | "loading_prices">("idle");

  // --- 1. Initial Load ---
  useEffect(() => {
    async function initData() {
      try {
        const [prodRes, plRes] = await Promise.all([
          fetch("/api/catalogue/products"),
          fetch("/api/catalogue/pricelists")
        ]);
        
        if (prodRes.ok) setProducts(await prodRes.json());
        if (plRes.ok) {
          const pls: PriceList[] = await plRes.json();
          setPriceLists(pls);
          // Default to the first list (e.g. Distributeur)
          if (pls.length > 0) setActivePriceListId(pls[0].priceId);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    }
    initData();
  }, []);

  // --- 2. Search Effect (Overrides Dropdowns) ---
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        // Clear manual selection to show search results
        setSelectedProduct(null);
        setSelectedType(null);
        setSelectedItem(null);
        
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(searchQuery)}`);
          if (res.ok) setItems(await res.json());
        } finally { setIsSearching(false); }
      } else if (searchQuery === "") {
        // Reset if search cleared
        if (!selectedType) setItems([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // --- 3. Step Logic ---

  // STEP 1 -> 2: Select Product, Fetch Types
  const handleProductChange = async (prodId: string) => {
    const prod = products.find(p => p.prodId === parseInt(prodId));
    if (!prod) return;

    setSelectedProduct(prod);
    setSelectedType(null); // Reset Step 2
    setSelectedItem(null); // Reset Step 3
    setItems([]);          // Clear Items
    setSearchQuery("");
    
    setLoadingStep("loading_types");
    try {
      const res = await fetch(`/api/catalogue/itemtypes?prodId=${prod.prodId}`);
      if (res.ok) setItemTypes(await res.json());
    } finally { setLoadingStep("idle"); }
  };

  // STEP 2 -> 3: Select Type, Fetch Items
  const handleTypeChange = async (typeId: string) => {
    const type = itemTypes.find(t => t.itemTypeId === parseInt(typeId));
    if (!type) return;

    setSelectedType(type);
    setSelectedItem(null); // Reset Step 3
    
    setLoadingStep("loading_items");
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
      if (res.ok) setItems(await res.json());
    } finally { setLoadingStep("idle"); }
  };

  // STEP 3: Select Item, Fetch Prices
  const handleItemChange = async (itemId: string | number) => {
    const item = items.find(i => i.itemId === (typeof itemId === 'string' ? parseInt(itemId) : itemId));
    if (!item) return;

    setSelectedItem(item);
    fetchPricesForItem(item.itemId);
  };

  const fetchPricesForItem = async (itemId: number) => {
    // Always update cache to ensure we have latest data for comparison
    setLoadingStep("loading_prices");
    try {
      const res = await fetch(`/api/catalogue/prices?itemId=${itemId}`);
      if (res.ok) {
        const data = await res.json();
        setPricesCache(prev => ({ ...prev, [itemId]: data }));
      }
    } catch (e) { console.error(e); }
    finally { setLoadingStep("idle"); }
  };

  // --- Helper: Get Current Price Rows ---
  const getCurrentPriceRanges = (itemId: number) => {
    if (!activePriceListId || !pricesCache[itemId]) return [];
    const listData = pricesCache[itemId].priceLists.find(pl => pl.priceId === activePriceListId);
    return listData?.ranges || [];
  };

  // --- Compare Logic ---
  const toggleCompare = (item: Item) => {
    setCompareList(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) return prev.filter(i => i.itemId !== item.itemId);
      
      // Fetch prices for new compare item immediately
      fetchPricesForItem(item.itemId);
      
      if (prev.length >= 2) return [prev[1], item]; // Rotate
      return [...prev, item];
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans pb-40">
      
      {/* HEADER & SEARCH */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Catalogue SINTO</h1>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Recherche rapide (Code, Description)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSelectedItem(null); setSelectedProduct(null); setSelectedType(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* =====================================================================================
            SECTION 1: THE 3-STEP DROPDOWN NAVIGATION (The "Poutine" Fix)
           ===================================================================================== */}
        {!searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* STEP 1: PRODUCT */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wider ml-1">1. Catégorie</label>
              <div className="relative group">
                <select 
                  value={selectedProduct?.prodId || ""}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-16 pl-4 pr-10 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl text-lg font-bold appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-0 transition-all shadow-sm"
                >
                  <option value="" disabled>Sélectionner une catégorie...</option>
                  {products.map(p => (
                    <option key={p.prodId} value={p.prodId}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                  <ChevronDown className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* STEP 2: CLASS / TYPE */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wider ml-1">2. Type / Classe</label>
              <div className={cn("relative transition-opacity", !selectedProduct && "opacity-50 pointer-events-none")}>
                <select 
                  value={selectedType?.itemTypeId || ""}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full h-16 pl-4 pr-10 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl text-lg font-bold appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-0 transition-all shadow-sm disabled:bg-neutral-100 dark:disabled:bg-neutral-800"
                >
                  <option value="" disabled>{loadingStep === "loading_types" ? "Chargement..." : "Sélectionner un type..."}</option>
                  {itemTypes.map(t => (
                    <option key={t.itemTypeId} value={t.itemTypeId}>{t.description}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                  {loadingStep === "loading_types" ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500"/> : <ChevronDown className="w-6 h-6" />}
                </div>
              </div>
            </div>

            {/* STEP 3: ITEM */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wider ml-1">3. Article</label>
              <div className={cn("relative transition-opacity", !selectedType && "opacity-50 pointer-events-none")}>
                <select 
                  value={selectedItem?.itemId || ""}
                  onChange={(e) => handleItemChange(e.target.value)}
                  disabled={!selectedType}
                  className="w-full h-16 pl-4 pr-10 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl text-lg font-bold appearance-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 focus:ring-0 transition-all shadow-sm disabled:bg-neutral-100 dark:disabled:bg-neutral-800"
                >
                  <option value="" disabled>{loadingStep === "loading_items" ? "Chargement..." : "Sélectionner un article..."}</option>
                  {items.map(i => (
                    <option key={i.itemId} value={i.itemId}>{i.itemCode} - {i.description}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                  {loadingStep === "loading_items" ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500"/> : <ChevronDown className="w-6 h-6" />}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* =====================================================================================
            SECTION 2: ITEM DETAILS & PRICE TABLE
           ===================================================================================== */}
        {selectedItem && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden">
              
              {/* Item Header */}
              <div className="p-6 md:p-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-neutral-50/50 dark:bg-neutral-900">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-mono font-bold text-lg">
                      {selectedItem.itemCode}
                    </span>
                    <span className="text-neutral-400">|</span>
                    <span className="text-neutral-500 font-medium">{selectedType?.description}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedItem.description}
                  </h2>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:min-w-[200px]">
                    <select 
                      value={activePriceListId || ""}
                      onChange={(e) => setActivePriceListId(parseInt(e.target.value))}
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-semibold appearance-none focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {priceLists.map(pl => (
                        <option key={pl.priceId} value={pl.priceId}>{pl.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  </div>
                  
                  <button 
                    onClick={() => toggleCompare(selectedItem)}
                    className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl transition-colors"
                    title="Ajouter au comparateur"
                  >
                    <Scale className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* PRICE TABLE - IMPLICIT TOQTY */}
              <div className="p-6 md:p-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-500" />
                  Table de Prix
                </h3>
                
                {loadingStep === "loading_prices" ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                        <tr>
                          <th className="p-4 text-neutral-500 font-semibold uppercase text-sm tracking-wider">Quantité Min</th>
                          <th className="p-4 text-right text-neutral-500 font-semibold uppercase text-sm tracking-wider">Prix Unitaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {getCurrentPriceRanges(selectedItem.itemId).length > 0 ? (
                          getCurrentPriceRanges(selectedItem.itemId).map((range) => (
                            <tr key={range.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                              <td className="p-4">
                                <span className="font-mono font-bold text-lg">{Math.floor(range.qtyMin)}+</span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-mono font-bold text-xl text-emerald-600">
                                  {range.unitPrice.toFixed(2)} $
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="p-8 text-center text-neutral-500">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-8 h-8 text-neutral-300" />
                                <span>Aucun prix disponible pour cette liste.</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================================
            SECTION 3: SEARCH RESULTS (Fallback View)
           ===================================================================================== */}
        {searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isSearching ? (
               <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-neutral-300" /></div>
            ) : items.length > 0 ? (
              items.map(item => (
                <div 
                  key={item.itemId} 
                  onClick={() => handleItemChange(item.itemId)} // Clicking search result loads it into the view
                  className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-2 border-transparent hover:border-emerald-500 cursor-pointer shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">{item.itemCode}</span>
                  </div>
                  <p className="font-semibold text-neutral-700 dark:text-neutral-200">{item.description}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-neutral-500">Aucun résultat.</div>
            )}
          </div>
        )}

      </main>

      {/* =====================================================================================
          COMPARE FLOATING BAR (Appears when items are added to compare list)
         ===================================================================================== */}
      {compareList.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-[600px] animate-in slide-in-from-bottom-24">
          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full p-3 pl-6 pr-3 shadow-2xl flex items-center justify-between ring-4 ring-white/20 backdrop-blur-md">
            <div>
              <span className="font-bold">{compareList.length}</span> article(s) à comparer
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCompareList([])}
                className="w-10 h-10 rounded-full bg-neutral-800 dark:bg-neutral-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowCompareModal(true)}
                className="px-6 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                COMPARER <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================================
          FULL SCREEN COMPARISON MODAL
         ===================================================================================== */}
      {showCompareModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-6 h-6 text-emerald-500" /> Comparateur</h2>
              <button onClick={() => setShowCompareModal(false)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              {/* PRICE LIST SELECTION INSIDE MODAL */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wider block mb-2">Liste de prix</label>
                <select 
                  value={activePriceListId || ""}
                  onChange={(e) => setActivePriceListId(parseInt(e.target.value))}
                  className="w-full md:w-auto min-w-[300px] pl-4 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-semibold appearance-none focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {priceLists.map(pl => (
                    <option key={pl.priceId} value={pl.priceId}>{pl.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {compareList.map(item => {
                  const ranges = getCurrentPriceRanges(item.itemId);
                  return (
                    <div key={item.itemId} className="space-y-4">
                      <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                        <div className="font-mono text-emerald-600 font-bold">{item.itemCode}</div>
                        <div className="font-bold text-xl">{item.description}</div>
                      </div>
                      {/* Comparison Price Table */}
                      <table className="w-full text-left border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                        <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                          <tr>
                            <th className="p-3 text-xs font-bold uppercase text-neutral-500">Qté Min</th>
                            <th className="p-3 text-right text-xs font-bold uppercase text-neutral-500">Prix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {ranges.map(r => (
                            <tr key={r.id}>
                              <td className="p-3 font-mono font-bold">{Math.floor(r.qtyMin)}+</td>
                              <td className="p-3 text-right font-mono text-emerald-600 font-bold">{r.unitPrice.toFixed(2)} $</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
