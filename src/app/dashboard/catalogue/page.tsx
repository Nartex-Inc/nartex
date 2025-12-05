"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, Package, Layers, Tag, X, ChevronDown, 
  Loader2, AlertCircle, RefreshCw, FileText, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface Product {
  prodId: number;
  name: string;
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
  unitPrice: number;
}

interface ItemPrices {
  itemId: number;
  itemCode: string;
  description: string;
  ranges: PriceRange[];
}

export default function CataloguePage() {
  // --- Data State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  
  // --- Selection State ---
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // --- Result State ---
  const [generatedPrices, setGeneratedPrices] = useState<ItemPrices[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStep, setLoadingStep] = useState<"idle" | "loading_types" | "loading_items" | "generating">("idle");

  // --- 1. Initial Data Fetch ---
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
    setShowResults(false); // Reset results on change
    
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
    setShowResults(false);
    
    setLoadingStep("loading_items");
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
      if (res.ok) setItems(await res.json());
    } finally { setLoadingStep("idle"); }
  };

  const handleItemChange = (itemId: string) => {
    const item = items.find(i => i.itemId === parseInt(itemId));
    if (item) setSelectedItem(item);
    setShowResults(false);
  };

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
    
    // Auto-fill context
    const prod = products.find(p => p.prodId === item.prodId);
    if (prod) {
        setSelectedProduct(prod);
        // Fetch types to fill dropdown
        const typeRes = await fetch(`/api/catalogue/itemtypes?prodId=${prod.prodId}`);
        if (typeRes.ok) {
            const types: ItemType[] = await typeRes.json();
            setItemTypes(types);
            const type = types.find(t => t.itemTypeId === item.itemSubTypeId);
            if (type) {
                setSelectedType(type);
                // Fetch items to fill dropdown
                const itemRes = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
                if(itemRes.ok) setItems(await itemRes.json());
            }
        }
    }
    setSelectedItem(item);
  };

  const handleGenerate = async () => {
    if (!selectedPriceList || !selectedProduct) return;

    setLoadingStep("generating");
    try {
      // Determine scope of generation
      let url = `/api/catalogue/prices/generate?priceId=${selectedPriceList.priceId}&prodId=${selectedProduct.prodId}`;
      
      if (selectedType) {
        url += `&typeId=${selectedType.itemTypeId}`;
      }
      if (selectedItem) {
        url += `&itemId=${selectedItem.itemId}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGeneratedPrices(data);
        setShowResults(true);
      }
    } catch (e) {
      console.error("Generation failed", e);
    } finally {
      setLoadingStep("idle");
    }
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setSelectedType(null);
    setSelectedItem(null);
    setItems([]);
    setSearchQuery("");
    setShowResults(false);
    setGeneratedPrices([]);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-600" />
              Catalogue SINTO
            </h1>
            <button onClick={handleReset} className="text-sm font-medium text-neutral-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
              <RefreshCw className="w-4 h-4" /> Réinitialiser
            </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* 1. FAST SEARCH BAR (Centered Top) */}
        <div className="relative z-50">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input 
                type="text" 
                placeholder="Recherche rapide (Code, Description)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl text-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                />
                {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                    <X className="w-4 h-4 text-neutral-500" />
                </button>
                )}
            </div>

            {/* Search Dropdown */}
            {searchQuery.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-96 overflow-y-auto z-50">
                {isSearching ? (
                  <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(item => (
                    <button 
                      key={item.itemId}
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-0 flex items-center gap-3"
                    >
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">{item.itemCode}</span>
                      <span className="truncate text-sm font-medium">{item.description}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-neutral-500 text-sm">Aucun résultat</div>
                )}
              </div>
            )}
        </div>

        {/* 2. STACKED DROPDOWNS */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6 md:p-8 space-y-6">
            
            {/* Price List */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Liste de Prix</label>
              <div className="relative">
                <select 
                  value={selectedPriceList?.priceId || ""}
                  onChange={(e) => {
                    const pl = priceLists.find(p => p.priceId === parseInt(e.target.value));
                    if (pl) setSelectedPriceList(pl);
                  }}
                  className="w-full h-16 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold text-lg appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  {priceLists.map(pl => (
                    <option key={pl.priceId} value={pl.priceId}>{pl.code} - {pl.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none w-6 h-6" />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Catégorie</label>
              <div className="relative">
                <select 
                  value={selectedProduct?.prodId || ""}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-16 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold text-lg appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  <option value="" disabled>Choisir...</option>
                  {products.map(p => (
                    <option key={p.prodId} value={p.prodId}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none w-6 h-6" />
              </div>
            </div>

            {/* Class */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Classe</label>
              <div className={cn("relative transition-opacity", !selectedProduct && "opacity-50 pointer-events-none")}>
                <select 
                  value={selectedType?.itemTypeId || ""}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full h-16 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold text-lg appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  <option value="" disabled>Tout afficher (Optionnel)</option>
                  {itemTypes.map(t => (
                    <option key={t.itemTypeId} value={t.itemTypeId}>{t.description}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  {loadingStep === "loading_types" ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500"/> : <ChevronDown className="w-6 h-6" />}
                </div>
              </div>
            </div>

            {/* Item */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1">Article</label>
              <div className={cn("relative transition-opacity", !selectedType && "opacity-50 pointer-events-none")}>
                <select 
                  value={selectedItem?.itemId || ""}
                  onChange={(e) => handleItemChange(e.target.value)}
                  disabled={!selectedType}
                  className="w-full h-16 pl-4 pr-10 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-emerald-500 rounded-xl font-bold text-lg appearance-none cursor-pointer focus:border-emerald-500 focus:ring-0 transition-all"
                >
                  <option value="" disabled>Tout afficher (Optionnel)</option>
                  {items.map(i => (
                    <option key={i.itemId} value={i.itemId}>{i.itemCode} - {i.description}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  {loadingStep === "loading_items" ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500"/> : <ChevronDown className="w-6 h-6" />}
                </div>
              </div>
            </div>
            
            {/* 3. BIG GENERATE BUTTON */}
            <button 
              onClick={handleGenerate}
              disabled={!selectedProduct || loadingStep === "generating"}
              className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-2xl font-black text-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] mt-4"
            >
               {loadingStep === "generating" ? (
                 <>
                   <Loader2 className="w-8 h-8 animate-spin" />
                   GÉNÉRATION...
                 </>
               ) : (
                 <>
                   <Zap className="w-8 h-8 fill-current" />
                   GÉNÉRER LISTE DE PRIX
                 </>
               )}
            </button>

        </div>

        {/* 4. RESULTS GRID (Like the Reference Image) */}
        {showResults && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {generatedPrices.length === 0 ? (
               <div className="p-12 text-center text-neutral-500 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800">
                 <AlertCircle className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                 <p className="text-lg font-medium">Aucun prix trouvé pour cette sélection.</p>
               </div>
            ) : (
               <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold">Résultats ({generatedPrices.length} articles)</h2>
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm">
                      {selectedPriceList?.name}
                    </span>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    {generatedPrices.map((item) => (
                      <div key={item.itemId} className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            {/* Item Info */}
                            <div className="flex-1">
                               <div className="inline-block px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-emerald-600 font-mono font-bold text-lg mb-2">
                                 {item.itemCode}
                               </div>
                               <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{item.description}</h3>
                            </div>

                            {/* Price Grid */}
                            <div className="flex-shrink-0">
                               <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {item.ranges.map((range) => (
                                    <div key={range.id} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-100 dark:border-neutral-700 text-center min-w-[100px]">
                                       <div className="text-xs text-neutral-500 font-bold uppercase mb-1">
                                          {Math.floor(range.qtyMin)}+
                                       </div>
                                       <div className="text-lg font-bold text-emerald-600">
                                          {range.unitPrice.toFixed(2)} $
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
