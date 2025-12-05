"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { 
  Search, Package, X, ChevronDown, ChevronRight,
  Loader2, AlertCircle, Layers, Grid3X3, Tag,
  Sparkles, ArrowRight
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
}

interface ItemPriceData {
  itemId: number;
  itemCode: string;
  description: string;
  format: number | null;
  udm: number | null; // NetWeight = units per case/box
  categoryName: string;
  className: string;
  priceListName: string;
  priceCode: string;
  currency: string;
  ranges: PriceRange[];
}

// --- Animated Select Component (iPad-Optimized) ---
interface StepSelectProps {
  label: string;
  stepNumber: number;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

function StepSelect({ 
  label, stepNumber, value, onChange, options, 
  disabled, loading, placeholder = "Sélectionner...", icon, highlight 
}: StepSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={cn(
      "relative transition-all duration-500 ease-out",
      disabled && "opacity-40 pointer-events-none scale-[0.98]",
      highlight && "animate-pulse-subtle"
    )}>
      {/* Step Badge */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
          value ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
        )}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : stepNumber}
        </div>
        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        {value && <ChevronRight className="w-4 h-4 text-emerald-500 animate-bounce-x" />}
      </div>

      {/* Big Touch-Friendly Button */}
      <button
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled || loading}
        className={cn(
          "w-full min-h-[72px] px-6 py-4 rounded-2xl text-left transition-all duration-300",
          "bg-white dark:bg-neutral-800/80 backdrop-blur-xl",
          "border-2 border-neutral-200/50 dark:border-neutral-700/50",
          "shadow-lg shadow-neutral-200/30 dark:shadow-neutral-900/50",
          "hover:border-emerald-400 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20",
          "active:scale-[0.98] active:shadow-inner",
          value && "border-emerald-300 dark:border-emerald-600/50",
          "group"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                value ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-400"
              )}>
                {icon}
              </div>
            )}
            <div>
              {selectedOption ? (
                <>
                  <div className="text-lg font-bold text-neutral-900 dark:text-white">
                    {selectedOption.label}
                  </div>
                  {selectedOption.sublabel && (
                    <div className="text-sm text-neutral-500">{selectedOption.sublabel}</div>
                  )}
                </>
              ) : (
                <div className="text-lg text-neutral-400">{placeholder}</div>
              )}
            </div>
          </div>
          <ChevronDown className={cn(
            "w-6 h-6 text-neutral-400 transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </div>
      </button>

      {/* Fullscreen Modal Picker (iPad-Style) */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className={cn(
            "relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden",
            "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          )}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{label}</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Options List */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4">
              <div className="grid gap-3">
                {options.map((option, idx) => (
                  <button
                    key={option.value}
                    onClick={() => { onChange(option.value); setIsOpen(false); }}
                    className={cn(
                      "w-full p-5 rounded-2xl text-left transition-all duration-200",
                      "border-2 hover:border-emerald-400",
                      "active:scale-[0.98]",
                      value === option.value 
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600" 
                        : "bg-neutral-50 dark:bg-neutral-800/50 border-transparent",
                      "animate-in fade-in slide-in-from-bottom-2"
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-neutral-900 dark:text-white">
                          {option.label}
                        </div>
                        {option.sublabel && (
                          <div className="text-sm text-neutral-500 mt-0.5">{option.sublabel}</div>
                        )}
                      </div>
                      {value === option.value && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Price Modal Component ---
interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];
  priceList: PriceList | null;
  loading: boolean;
}

function PriceModal({ isOpen, onClose, data, priceList, loading }: PriceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-lg animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal - Full screen style */}
      <div className={cn(
        "relative w-full max-w-[95vw] max-h-[92vh] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden",
        "animate-in zoom-in-95 slide-in-from-bottom-6 duration-400",
        "flex flex-col"
      )}>
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 md:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  Liste de Prix
                </h2>
                <p className="text-emerald-100 text-sm md:text-base">
                  {priceList?.code} - {priceList?.name}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-neutral-50 dark:bg-neutral-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
              <p className="text-neutral-500 font-medium">Chargement des prix...</p>
            </div>
          ) : data.length > 0 ? (
            <div className="space-y-6">
              {data.map((item, idx) => (
                <div 
                  key={item.itemId}
                  className={cn(
                    "bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-xl border border-neutral-200 dark:border-neutral-800",
                    "animate-in fade-in slide-in-from-bottom-4"
                  )}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Item Header - Red like reference image */}
                  <div className="bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-black text-white tracking-wide">
                        {item.description.split(' ')[0]}
                      </h3>
                      <p className="text-red-100 text-sm">
                        {item.className}
                      </p>
                    </div>
                  </div>
                  
                  {/* Spreadsheet Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm md:text-base">
                      <thead>
                        <tr className="bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-200 dark:border-neutral-700">
                          <th className="text-left p-3 md:p-4 font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap min-w-[160px]">
                            Article
                          </th>
                          <th className="text-center p-3 md:p-4 font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            Format
                          </th>
                          <th className="text-center p-3 md:p-4 font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            UDM
                          </th>
                          <th className="text-center p-3 md:p-4 font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            Qte/Qty
                          </th>
                          <th className="text-center p-3 md:p-4 font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            (+) Unit
                          </th>
                          <th className="text-right p-3 md:p-4 font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap min-w-[140px]">
                            {priceList?.name || 'Prix'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {/* Main item row */}
                        <tr className="bg-white dark:bg-neutral-900 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                          <td className="p-3 md:p-4">
                            <span className="font-black text-neutral-900 dark:text-white">
                              {item.itemCode}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-center">
                            <span className="font-mono text-neutral-600 dark:text-neutral-400">
                              {item.format?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-center">
                            <span className="font-bold text-neutral-700 dark:text-neutral-300">
                              {item.udm ? `${item.udm}` : '-'}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-center">
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">
                              {item.ranges[0]?.qtyMin || 1}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-center">
                            <span className="font-mono text-neutral-600 dark:text-neutral-400">
                              {item.format ? (item.format * (item.ranges[0]?.qtyMin || 1)).toFixed(2) : '-'}
                            </span>
                          </td>
                          <td className="p-3 md:p-4 text-right">
                            <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                              {item.ranges[0]?.unitPrice.toFixed(2) || '-'}
                            </span>
                          </td>
                        </tr>
                        
                        {/* Quantity break rows */}
                        {item.ranges.slice(1).map((range, rIdx) => (
                          <tr 
                            key={range.id} 
                            className="bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
                          >
                            <td className="p-3 md:p-4">
                              <span className="text-neutral-400 dark:text-neutral-500 italic text-sm pl-4">
                                {item.itemCode}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-center">
                              <span className="font-mono text-neutral-500">
                                {item.format?.toFixed(3) || '-'}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-center">
                              <span className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded text-xs font-bold">
                                {item.udm ? `${item.udm}` : '-'}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-center">
                              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                {range.qtyMin}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-center">
                              <span className="font-mono text-neutral-500">
                                -
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-right">
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                {range.unitPrice.toFixed(2)}
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
              <AlertCircle className="w-16 h-16 text-neutral-300" />
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-600 dark:text-neutral-400">
                  Aucun prix trouvé
                </p>
                <p className="text-neutral-500 mt-1">
                  Vérifiez vos sélections et réessayez.
                </p>
              </div>
            </div>
          )}
        </div>
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
    const item = items.find(i => i.itemId === parseInt(itemId));
    if (item) setSelectedItem(item);
  };

  const handleSearchResultClick = (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedItem(item);
    
    // Auto-fill context
    const prod = products.find(p => p.prodId === item.prodId);
    if (prod) setSelectedProduct(prod);
  };

  const handleGenerate = async () => {
    if (!selectedPriceList || !selectedProduct) return;

    setLoadingPrices(true);
    setShowPriceModal(true);

    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&prodId=${selectedProduct.prodId}`;
      
      if (selectedItem) {
        url += `&itemId=${selectedItem.itemId}`;
      } else if (selectedType) {
        url += `&typeId=${selectedType.itemTypeId}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        setPriceData(await res.json());
      }
    } catch (err) {
      console.error("Price fetch failed", err);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Check if generate is enabled
  const canGenerate = selectedPriceList && selectedProduct && (selectedType || selectedItem);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-50 to-emerald-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20">
      
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 opacity-30 dark:opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] [background-size:40px_40px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        
        {/* HEADER */}
        <header className="flex-shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 px-4 md:px-8 py-4 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                  Catalogue
                </h1>
                <p className="text-sm text-neutral-500">SINTO - Liste de Prix</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 w-full md:max-w-lg relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Recherche rapide par code ou description..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full h-14 pl-12 pr-12 rounded-2xl text-base font-medium",
                    "bg-neutral-100 dark:bg-neutral-800",
                    "border-2 border-transparent focus:border-emerald-400",
                    "outline-none transition-all duration-300",
                    "placeholder:text-neutral-400"
                  )}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {searchQuery.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {isSearching ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, idx) => (
                      <button 
                        key={item.itemId}
                        onClick={() => handleSearchResultClick(item)}
                        className={cn(
                          "w-full p-4 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors",
                          "animate-in fade-in slide-in-from-top-1"
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                            {item.itemCode}
                          </span>
                          <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                            {item.description}
                          </span>
                        </div>
                        {item.categoryName && (
                          <div className="text-xs text-neutral-400 mt-1 pl-1">
                            {item.categoryName} → {item.className}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-neutral-500">
                      Aucun résultat pour "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Selection Flow Card */}
            <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl rounded-[2rem] border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl shadow-neutral-200/50 dark:shadow-neutral-950/50 p-6 md:p-10">
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Sélection des produits
                </h2>
              </div>

              <div className="space-y-6">
                
                {/* Step 1: Price List */}
                <StepSelect
                  label="Liste de Prix"
                  stepNumber={1}
                  value={selectedPriceList?.priceId.toString() || ""}
                  onChange={handlePriceListChange}
                  options={priceLists.map(pl => ({
                    value: pl.priceId.toString(),
                    label: `${pl.code} - ${pl.name}`,
                    sublabel: pl.currency
                  }))}
                  icon={<Tag className="w-6 h-6" />}
                  placeholder="Choisir une liste..."
                />

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-700 to-transparent" />

                {/* Step 2: Category (Products) */}
                <StepSelect
                  label="Catégorie"
                  stepNumber={2}
                  value={selectedProduct?.prodId.toString() || ""}
                  onChange={handleProductChange}
                  options={products.map(p => ({
                    value: p.prodId.toString(),
                    label: p.name,
                    sublabel: `${p.itemCount} articles`
                  }))}
                  disabled={!selectedPriceList}
                  icon={<Grid3X3 className="w-6 h-6" />}
                  placeholder="Choisir une catégorie..."
                />

                {/* Step 3: Class (ItemType) */}
                <StepSelect
                  label="Classe"
                  stepNumber={3}
                  value={selectedType?.itemTypeId.toString() || ""}
                  onChange={handleTypeChange}
                  options={itemTypes.map(t => ({
                    value: t.itemTypeId.toString(),
                    label: t.description,
                    sublabel: `${t.itemCount} articles`
                  }))}
                  disabled={!selectedProduct}
                  loading={loadingTypes}
                  icon={<Layers className="w-6 h-6" />}
                  placeholder="Choisir une classe..."
                />

                {/* Step 4: Item */}
                <StepSelect
                  label="Article"
                  stepNumber={4}
                  value={selectedItem?.itemId.toString() || ""}
                  onChange={handleItemChange}
                  options={items.map(i => ({
                    value: i.itemId.toString(),
                    label: i.itemCode,
                    sublabel: i.description
                  }))}
                  disabled={!selectedType}
                  loading={loadingItems}
                  icon={<Package className="w-6 h-6" />}
                  placeholder="Choisir un article (optionnel)..."
                />

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-700 to-transparent" />

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={cn(
                    "w-full h-20 rounded-2xl font-bold text-xl transition-all duration-300",
                    "flex items-center justify-center gap-3",
                    "shadow-xl",
                    canGenerate 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.98]"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-6 h-6" />
                  GÉNÉRER LA LISTE DE PRIX
                  <ArrowRight className="w-6 h-6" />
                </button>

              </div>
            </div>

            {/* Selected Item Preview (if selected via search) */}
            {selectedItem && !selectedType && (
              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-800 dark:text-emerald-300">
                      {selectedItem.itemCode}
                    </div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400">
                      {selectedItem.description}
                    </div>
                  </div>
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
        priceList={selectedPriceList}
        loading={loadingPrices}
      />

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
