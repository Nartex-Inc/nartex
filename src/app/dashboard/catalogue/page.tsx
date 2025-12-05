"use client";

import { useState, useEffect } from "react";
import { 
  Search, Package, Tag, X, ChevronDown, 
  Loader2, AlertCircle, RefreshCw, Layers
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
  code: string;
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
  // --- Data & Selection State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  
  // Selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  
  // Data Cache
  const [pricesCache, setPricesCache] = useState<Record<number, ItemPrices>>({});
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
          // Default to first price list
          if (pls.length > 0) setSelectedPriceList(pls[0]);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    }
    initData();
  }, []);

  // --- 2. Search Logic ---
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

  // --- 3. Handlers ---

  const handleProductChange = async (prodId: string) => {
    const prod = products.find(p => p.prodId === parseInt(prodId));
    if (!prod) return;

    setSelectedProduct(prod);
    setSelectedType(null); 
    setSelectedItem(null); 
    setItems([]);          
    
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
    setSelectedItem(null); 
    
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

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedItem(item);
    
    // Auto-fill context (optional, but good UX)
    const prod = products.find(p => p.prodId === item.prodId);
    if(prod) setSelectedProduct(prod);
    
    fetchPricesForItem(item.itemId);
  };

  const fetchPricesForItem = async (itemId: number) => {
    if (pricesCache[itemId]) return; 

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

  const handleReset = () => {
    setSelectedProduct(null);
    setSelectedType(null);
    setSelectedItem(null);
    setItems([]);
    setSearchQuery("");
  };

  // --- Helper: Get Current Prices ---
  const currentPriceRanges = selectedItem && selectedPriceList && pricesCache[selectedItem.itemId] 
    ? pricesCache[selectedItem.itemId].priceLists.find(pl => pl.priceId === selectedPriceList.priceId)?.ranges || []
    : [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 shadow-sm sticky top-0 z-40">
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
              placeholder="Recherche rapide..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {/* Search Dropdown */}
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
        
        {/* NAVIGATION CARD */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              Navigation & Sélection
            </h2>
            <button onClick={handleReset} className="text-sm font-medium text-neutral-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
              <RefreshCw className="w-4 h-4" /> Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. PRICE LIST SELECTOR (Step 1/Context) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Liste de Prix</label>
              <div className="relative group">
                <select 
                  value={selectedPriceList?.priceId || ""}
                  onChange={(e) => {
                    const pl = priceLists.find(p => p.priceId === parseInt(e.target.value));
                    if (pl) setSelectedPriceList(pl);
                  }}
                  className="w-full h-14 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  {priceLists.map(pl => (
                    <option key={pl.priceId} value={pl.priceId}>{pl.code} - {pl.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none w-5 h-5" />
              </div>
            </div>

            {/* 2. CATEGORY SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Catégorie</label>
              <div className="relative group">
                <select 
                  value={selectedProduct?.prodId || ""}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-14 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  <option value="" disabled>Choisir...</option>
                  {products.map(p => (
                    <option key={p.prodId} value={p.prodId}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none w-5 h-5" />
              </div>
            </div>

            {/* 3. CLASS SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Classe</label>
              <div className={cn("relative transition-opacity", !selectedProduct && "opacity-50 pointer-events-none")}>
                <select 
                  value={selectedType?.itemTypeId || ""}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full h-14 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  <option value="" disabled>Choisir...</option>
                  {itemTypes.map(t => (
                    <option key={t.itemTypeId} value={t.itemTypeId}>{t.description}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  {loadingStep === "loading_types" ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500"/> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* 4. ITEM SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Article</label>
              <div className={cn("relative transition-opacity", !selectedType && "opacity-50 pointer-events-none")}>
                <select 
                  value={selectedItem?.itemId || ""}
                  onChange={(e) => handleItemChange(e.target.value)}
                  disabled={!selectedType}
                  className="w-full h-14 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  <option value="" disabled>Choisir...</option>
                  {items.map(i => (
                    <option key={i.itemId} value={i.itemId}>{i.itemCode}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  {loadingStep === "loading_items" ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500"/> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RESULTS CARD */}
        {selectedItem ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden">
              
              {/* Item Header */}
              <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-mono font-bold text-lg">
                      {selectedItem.itemCode}
                    </span>
                    <span className="text-neutral-400">|</span>
                    <span className="text-neutral-500 font-medium">{selectedType?.description}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {selectedItem.description}
                  </h2>
                </div>
              </div>

              {/* Price Table */}
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-500" />
                    Prix ({selectedPriceList?.name})
                  </h3>
                </div>
                
                {loadingStep === "loading_prices" ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border-2 border-neutral-100 dark:border-neutral-800">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                        <tr>
                          <th className="p-5 text-neutral-500 font-bold uppercase text-sm tracking-wider w-1/2">Quantité Min</th>
                          <th className="p-5 text-right text-neutral-500 font-bold uppercase text-sm tracking-wider w-1/2">Prix Unitaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                        {currentPriceRanges.length > 0 ? (
                          currentPriceRanges.map((range) => (
                            <tr key={range.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors">
                              <td className="p-5">
                                <span className="font-mono font-bold text-xl text-neutral-700 dark:text-neutral-200">{Math.floor(range.qtyMin)}+</span>
                              </td>
                              <td className="p-5 text-right">
                                <span className="font-mono font-bold text-2xl text-emerald-600">
                                  {range.unitPrice.toFixed(2)} $
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="p-12 text-center text-neutral-500">
                              <div className="flex flex-col items-center gap-3">
                                <AlertCircle className="w-10 h-10 text-neutral-300" />
                                <span className="font-medium">Aucun prix disponible pour cette liste.</span>
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
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-xl font-bold mb-2">Prêt à chercher</h3>
            <p className="text-base">Utilisez les filtres ci-dessus pour trouver un article.</p>
          </div>
        )}

      </main>
    </div>
  );
}
