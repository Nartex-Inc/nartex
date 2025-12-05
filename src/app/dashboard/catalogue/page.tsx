"use client";

import { useState, useEffect, useRef } from "react";
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
}

interface ItemPriceData {
  itemId: number;
  itemCode: string;
  description: string;
  udm: number | null;
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
}

function PriceModal({ 
  isOpen, onClose, data, priceLists, 
  selectedPriceList, onPriceListChange, loading, error
}: PriceModalProps) {
  if (!isOpen) return null;

  const itemsWithPrices = data.filter(item => item.ranges && item.ranges.length > 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-[96vw] max-h-[94vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="flex-shrink-0 bg-emerald-600 px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Liste de Prix
            </h2>
            
            <div className="flex items-center gap-3">
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
        
        <div className="flex-1 overflow-auto p-3 md:p-5 bg-neutral-100 dark:bg-neutral-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-neutral-500 font-medium">Chargement des prix...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl text-red-300">!</div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-600 dark:text-red-400">Erreur</p>
                <p className="text-neutral-500 mt-1">{error}</p>
              </div>
            </div>
          ) : itemsWithPrices.length > 0 ? (
            <div className="space-y-4">
              {itemsWithPrices.map((item) => (
                <div 
                  key={item.itemId}
                  className="bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="bg-red-600 px-4 py-3">
                    <h3 className="text-lg font-black text-white">
                      {item.description.split(' ')[0].toUpperCase()}
                    </h3>
                    <p className="text-red-100 text-sm">
                      {item.className || item.description}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm md:text-base border-collapse">
                      <thead>
                        <tr className="bg-neutral-200 dark:bg-neutral-800">
                          <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                            Article
                          </th>
                          <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                            UDM
                          </th>
                          <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                            Qte/Qty
                          </th>
                          <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                            (+) Unit
                          </th>
                          <th className="text-right p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                            {selectedPriceList?.name || 'Prix'}
                          </th>
                          <th className="text-right p-3 font-bold text-amber-700 dark:text-amber-400 border border-neutral-300 dark:border-neutral-700 bg-amber-50 dark:bg-amber-900/20">
                            PDS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.ranges.map((range, rIdx) => (
                          <tr 
                            key={range.id} 
                            className={cn(
                              "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors",
                              rIdx === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50 dark:bg-neutral-800/50"
                            )}
                          >
                            <td className="p-3 border border-neutral-200 dark:border-neutral-700">
                              <span className={cn(
                                "font-mono",
                                rIdx === 0 ? "font-black text-neutral-900 dark:text-white" : "text-neutral-400 text-sm pl-2"
                              )}>
                                {item.itemCode}
                              </span>
                            </td>
                            <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700">
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                {item.udm || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700">
                              <span className="font-mono font-bold text-neutral-900 dark:text-white">
                                {range.qtyMin}
                              </span>
                            </td>
                            <td className="p-3 text-center border border-neutral-200 dark:border-neutral-700">
                              <span className="font-mono text-neutral-600 dark:text-neutral-400">
                                {item.udm ? (item.udm * range.qtyMin).toFixed(2) : '-'}
                              </span>
                            </td>
                            <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700">
                              <span className={cn(
                                "font-mono font-black",
                                rIdx === 0 ? "text-lg text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
                              )}>
                                <AnimatedPrice value={range.unitPrice} />
                              </span>
                            </td>
                            <td className="p-3 text-right border border-neutral-200 dark:border-neutral-700 bg-amber-50/50 dark:bg-amber-900/10">
                              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                {range.pdsPrice !== null ? (
                                  <AnimatedPrice value={range.pdsPrice} />
                                ) : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
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
        
        {!loading && itemsWithPrices.length > 0 && (
          <div className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-800 px-4 py-3 text-center">
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
              {itemsWithPrices.length} article(s) avec prix
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function CataloguePage() {
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
      // If neither typeId nor itemId, API will return all items for the category
      
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
    // Handle "Toutes les classes" selection
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

  // --- Search Result Click - Auto-fill ALL dropdowns ---
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

  // Can generate if we have priceList + product (class and article are now optional)
  const canGenerate = selectedPriceList && selectedProduct;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="min-h-screen flex flex-col">
        
        {/* HEADER */}
        <header className="flex-shrink-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-6 py-4 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Catalogue SINTO
              </h1>
              <p className="text-sm text-neutral-500">Liste de Prix</p>
            </div>

            {/* Search Bar */}
            <div className="flex-1 w-full md:max-w-md relative">
              <input 
                type="search" 
                placeholder="Recherche par code article..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 px-5 rounded-xl text-base font-medium bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent focus:border-emerald-500 outline-none transition-colors"
              />

              {/* Search Dropdown */}
              {searchQuery.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-72 overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-6 flex justify-center">
                      <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <button 
                        key={item.itemId}
                        onClick={() => handleSearchResultClick(item)}
                        className="w-full p-4 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
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
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            
            {/* Selection Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg p-5 md:p-8">
              
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">
                Sélection des produits
              </h2>

              <div className="space-y-5">
                
                {/* Step 1: Price List */}
                <div>
                  <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    1. Liste de Prix
                  </label>
                  <select
                    value={selectedPriceList?.priceId || ""}
                    onChange={(e) => handlePriceListChange(e.target.value)}
                    className="w-full h-16 px-4 text-lg font-bold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-emerald-500 outline-none transition-colors"
                  >
                    <option value="" disabled>Sélectionner...</option>
                    {priceLists.map(pl => (
                      <option key={pl.priceId} value={pl.priceId}>
                        {pl.code} - {pl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Category */}
                <div>
                  <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    2. Catégorie
                  </label>
                  <select
                    value={selectedProduct?.prodId || ""}
                    onChange={(e) => handleProductChange(e.target.value)}
                    disabled={!selectedPriceList}
                    className={cn(
                      "w-full h-16 px-4 text-lg font-bold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-emerald-500 outline-none transition-all",
                      !selectedPriceList && "opacity-50 cursor-not-allowed"
                    )}
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
                  <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    3. Classe (optionnel)
                  </label>
                  <select
                    value={selectedType?.itemTypeId || ""}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={!selectedProduct || loadingTypes}
                    className={cn(
                      "w-full h-16 px-4 text-lg font-bold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-emerald-500 outline-none transition-all",
                      (!selectedProduct || loadingTypes) && "opacity-50 cursor-not-allowed"
                    )}
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
                  <label className="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    4. Article (optionnel)
                  </label>
                  <select
                    value={selectedItem?.itemId || ""}
                    onChange={(e) => handleItemChange(e.target.value)}
                    disabled={!selectedType || loadingItems}
                    className={cn(
                      "w-full h-16 px-4 text-lg font-bold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-emerald-500 outline-none transition-all",
                      (!selectedType || loadingItems) && "opacity-50 cursor-not-allowed"
                    )}
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
                      "w-full h-20 rounded-xl font-black text-xl uppercase tracking-wide transition-all",
                      canGenerate 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                    )}
                  >
                    GÉNÉRER
                  </button>
                </div>

              </div>
            </div>

            {/* Selected Item Preview */}
            {selectedItem && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  {selectedItem.itemCode}
                </div>
                <div className="text-sm text-emerald-600 dark:text-emerald-400">
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
      />
    </div>
  );
}
