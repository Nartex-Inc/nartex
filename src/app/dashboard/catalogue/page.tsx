"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, Package, Layers, Tag, X, ChevronDown, 
  ArrowRight, Scale, Zap, Trash2, Loader2, AlertCircle, Plus 
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
  
  // --- Selection State (Dropdowns) ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // --- Price View State ---
  const [activePriceListId, setActivePriceListId] = useState<number | null>(null);
  const [pricesCache, setPricesCache] = useState<Record<number, ItemPrices>>({});
  
  // --- Search & Compare State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Comparison State (The "Two Circles")
  const [compareItem1, setCompareItem1] = useState<Item | null>(null);
  const [compareItem2, setCompareItem2] = useState<Item | null>(null);
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

  // --- 2. Search Logic (Fast Search Bar) ---
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(searchQuery)}`);
          if (res.ok) setSearchResults(await res.json());
        } finally { setIsSearching(false); }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // --- 3. Step Logic & Auto-Fill ---

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

  const handleItemChange = async (itemId: string | number) => {
    const item = items.find(i => i.itemId === (typeof itemId === 'string' ? parseInt(itemId) : itemId));
    if (!item) return;

    setSelectedItem(item);
    fetchPricesForItem(item.itemId);
  };

  // --- Special: Handle Selection from Search Results ---
  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery(""); // Clear search bar
    setSearchResults([]); // Hide dropdown
    
    setLoadingStep("loading_types"); // Generic loading indicator
    
    try {
      // Find product (local)
      const prod = products.find(p => p.prodId === item.prodId);
      if (prod) setSelectedProduct(prod);

      // Fetch Types for this product
      const typeRes = await fetch(`/api/catalogue/itemtypes?prodId=${item.prodId}`);
      if (typeRes.ok) {
        const types: ItemType[] = await typeRes.json();
        setItemTypes(types);
        
        // Find Type (local)
        const type = types.find(t => t.itemTypeId === item.itemSubTypeId);
        if (type) setSelectedType(type);
      }

      // Fetch Items for this type
      const itemsRes = await fetch(`/api/catalogue/items?itemTypeId=${item.itemSubTypeId}`);
      if (itemsRes.ok) {
        const itemList: Item[] = await itemsRes.json();
        setItems(itemList);
      }

      // Finally select the item
      setSelectedItem(item);
      fetchPricesForItem(item.itemId);

    } catch (e) {
      console.error("Auto-fill failed", e);
    } finally {
      setLoadingStep("idle");
    }
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

  // --- Compare Logic (The Circles) ---
  const addToCompare = (item: Item) => {
    // If Item 1 is empty, fill it
    if (!compareItem1) {
      setCompareItem1(item);
      fetchPricesForItem(item.itemId);
    } 
    // If Item 1 is full but Item 2 is empty, fill Item 2 AND OPEN MODAL
    else if (!compareItem2) {
      // Prevent duplicate
      if (compareItem1.itemId === item.itemId) return;
      
      setCompareItem2(item);
      fetchPricesForItem(item.itemId);
      setShowCompareModal(true); // DIRECTLY OPEN MODAL
    } 
    // If both are full, replace Item 2
    else {
      setCompareItem2(item);
      fetchPricesForItem(item.itemId);
      setShowCompareModal(true);
    }
  };

  const clearCompareSlot = (slot: 1 | 2) => {
    if (slot === 1) {
      setCompareItem1(compareItem2); // Shift 2 to 1
      setCompareItem2(null);
    } else {
      setCompareItem2(null);
    }
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

          <div className="relative w-full md:w-96 z-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Recherche rapide (Code, Description)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {/* SEARCH DROPDOWN */}
            {searchQuery.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(item => (
                    <button 
                      key={item.itemId}
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full text-left p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-0 flex items-center gap-3"
                    >
                      <span className="font-mono font-bold text-emerald-600 text-sm">{item.itemCode}</span>
                      <span className="truncate text-sm">{item.description}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-neutral-500 text-sm">Aucun résultat</div>
                )}
              </div>
            )}
            
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-neutral-200 dark:bg-neutral-700 rounded-full">
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
        {selectedItem && (
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
                    onClick={() => addToCompare(selectedItem)}
                    className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter
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

      </main>

      {/* =====================================================================================
          COMPARE FLOATING BAR (Appears when items are added to compare list)
         ===================================================================================== */}
      {(compareItem1 || compareItem2) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-[500px] animate-in slide-in-from-bottom-24">
          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[2rem] p-4 shadow-2xl flex items-center justify-between ring-4 ring-white/20 backdrop-blur-md">
            
            <div className="flex items-center gap-4">
               {/* SLOT 1 */}
               <div className="relative w-14 h-14 rounded-full border-2 border-neutral-700 dark:border-neutral-200 bg-neutral-800 dark:bg-neutral-100 flex items-center justify-center overflow-hidden">
                 {compareItem1 ? (
                   <>
                     <span className="font-bold text-xs">{compareItem1.itemCode}</span>
                     <button onClick={() => clearCompareSlot(1)} className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                       <X className="w-6 h-6 text-white" />
                     </button>
                   </>
                 ) : (
                   <span className="text-neutral-500 font-bold">1</span>
                 )}
               </div>

               {/* VS Badge */}
               <div className="text-sm font-bold text-neutral-500">VS</div>

               {/* SLOT 2 */}
               <div className="relative w-14 h-14 rounded-full border-2 border-neutral-700 dark:border-neutral-200 bg-neutral-800 dark:bg-neutral-100 flex items-center justify-center overflow-hidden">
                 {compareItem2 ? (
                   <>
                     <span className="font-bold text-xs">{compareItem2.itemCode}</span>
                     <button onClick={() => clearCompareSlot(2)} className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                       <X className="w-6 h-6 text-white" />
                     </button>
                   </>
                 ) : (
                   <span className="text-neutral-500 font-bold">2</span>
                 )}
               </div>
            </div>

            <button 
              disabled={!compareItem1 || !compareItem2}
              onClick={() => setShowCompareModal(true)}
              className="h-12 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-700 disabled:opacity-50 text-white rounded-xl font-bold text-base flex items-center gap-2 transition-all active:scale-95 shadow-lg"
            >
              COMPARER
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================================
          FULL SCREEN COMPARISON MODAL
         ===================================================================================== */}
      {showCompareModal && compareItem1 && compareItem2 && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-6 h-6 text-emerald-500" /> Comparaison</h2>
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
                {[compareItem1, compareItem2].map((item, index) => {
                  const ranges = getCurrentPriceRanges(item.itemId);
                  return (
                    <div key={item.itemId} className="space-y-4">
                      <div className={cn("p-4 rounded-xl border-2", index === 0 ? "border-emerald-500/30 bg-emerald-50/50" : "border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10")}>
                        <div className="font-mono text-lg font-bold mb-1">{item.itemCode}</div>
                        <div className="font-bold text-xl leading-tight">{item.description}</div>
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
                          {ranges.length > 0 ? ranges.map(r => (
                            <tr key={r.id}>
                              <td className="p-3 font-mono font-bold">{Math.floor(r.qtyMin)}+</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600">{r.unitPrice.toFixed(2)} $</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={2} className="p-4 text-center text-sm text-neutral-400">Aucun prix</td></tr>
                          )}
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
