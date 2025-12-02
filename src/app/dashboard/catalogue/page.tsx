"use client";

import { useState, useMemo } from "react";
import { 
  Search, Package, Layers, Tag, X, Check, 
  ArrowRight, Scale, ChevronRight, Zap, ArrowLeft, Trash2 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface Product {
  prodId: number;
  name: string;
  itemCount: number;
  color: string; 
  bg: string; // Helper for dynamic backgrounds
}

interface ItemType {
  itemTypeId: number;
  prodId: number;
  description: string;
  itemCount: number;
}

interface Item {
  itemId: number;
  itemCode: string;
  description: string;
  prodId: number;
  itemSubTypeId: number;
  price: number;
}

// --- Mock Data ---
const MOCK_PRODUCTS: Product[] = [
  { prodId: 1, name: "100(G)-TRAITEMENT DE CARBURANT", itemCount: 45, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { prodId: 2, name: "110-HUILES MOTEUR", itemCount: 128, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { prodId: 3, name: "120-HUILES HYDRAULIQUES", itemCount: 89, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  { prodId: 4, name: "130-HUILES TRANSMISSION", itemCount: 67, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { prodId: 5, name: "140-GRAISSES INDUSTRIELLES", itemCount: 156, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { prodId: 6, name: "190-ÉQUIPEMENTS", itemCount: 43, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-900/30" },
];

const MOCK_ITEM_TYPES: ItemType[] = [
  { itemTypeId: 101, prodId: 1, description: "100.1-DIESEL ADDITIFS", itemCount: 15 },
  { itemTypeId: 102, prodId: 1, description: "100.2-ESSENCE ADDITIFS", itemCount: 12 },
  { itemTypeId: 201, prodId: 2, description: "110.1-HUILE HME 0W20", itemCount: 22 },
  { itemTypeId: 202, prodId: 2, description: "110.2-HUILE HME 5W30", itemCount: 35 },
];

const MOCK_ITEMS: Item[] = [
  { itemId: 1, itemCode: "DC-001", description: "Additif diesel premium 1L", prodId: 1, itemSubTypeId: 101, price: 14.50 },
  { itemId: 2, itemCode: "DC-002", description: "Additif diesel premium 4L", prodId: 1, itemSubTypeId: 101, price: 45.99 },
  { itemId: 3, itemCode: "HME-0W20-1L", description: "Huile moteur synthétique 0W20 1L", prodId: 2, itemSubTypeId: 201, price: 12.99 },
  { itemId: 4, itemCode: "HME-0W20-4L", description: "Huile moteur synthétique 0W20 4L", prodId: 2, itemSubTypeId: 201, price: 42.50 },
  { itemId: 5, itemCode: "HME-5W30-1L", description: "Huile moteur synthétique 5W30 1L", prodId: 2, itemSubTypeId: 202, price: 11.99 },
];

export default function CataloguePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [compareList, setCompareList] = useState<Item[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // --- Filtering Logic ---
  const filteredTypes = useMemo(() => {
    if (!selectedProduct) return [];
    return MOCK_ITEM_TYPES.filter(t => t.prodId === selectedProduct.prodId);
  }, [selectedProduct]);

  const filteredItems = useMemo(() => {
    let items = MOCK_ITEMS;
    if (selectedProduct) items = items.filter(i => i.prodId === selectedProduct.prodId);
    if (selectedType) items = items.filter(i => i.itemSubTypeId === selectedType.itemTypeId);
    
    if (searchQuery.length > 1) {
      items = MOCK_ITEMS.filter(i => 
        i.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  }, [selectedProduct, selectedType, searchQuery]);

  // --- Actions ---
  const toggleCompare = (item: Item) => {
    setCompareList(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) return prev.filter(i => i.itemId !== item.itemId);
      if (prev.length >= 2) return [prev[1], item];
      return [...prev, item];
    });
  };

  const resetNav = () => {
    setSelectedProduct(null);
    setSelectedType(null);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans">
      
      {/* 1. Large Touch Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
          
          {/* Breadcrumbs - Large touch targets */}
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
                        onClick={() => setSelectedType(null)}
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
                        {selectedType.description.split('-')[1]}
                     </span>
                   </>
                )}
             </div>
          </div>

          {/* Search Bar - Tall and easy to tap */}
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-12 text-lg bg-neutral-100 dark:bg-neutral-800 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 active:bg-neutral-200 dark:active:bg-neutral-700 rounded-full"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 pb-40">
        
        {/* VIEW 1: CATEGORIES (Large Cards) */}
        {!selectedProduct && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <Layers className="w-8 h-8 text-neutral-400" /> 
              Catégories Principales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_PRODUCTS.map((prod) => (
                <button
                  key={prod.prodId}
                  onClick={() => setSelectedProduct(prod)}
                  className="group relative h-48 bg-white dark:bg-neutral-800 rounded-3xl p-8 text-left border-2 border-transparent hover:border-emerald-500 transition-all shadow-md active:scale-[0.98]"
                >
                  {/* Dynamic Background Blob */}
                  <div className={`absolute top-0 right-0 w-40 h-40 opacity-10 rounded-bl-[100px] transition-transform group-hover:scale-110 ${prod.bg.replace('bg-', 'bg-')}`} />
                  
                  <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center shadow-sm ${prod.bg}`}>
                    <Package className={`w-7 h-7 ${prod.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold pr-10 leading-tight">{prod.name}</h3>
                  
                  <div className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: TYPES (Medium Cards) */}
        {selectedProduct && !selectedType && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
             {/* Back Button for Touch */}
             <button 
                onClick={() => setSelectedProduct(null)}
                className="mb-8 flex items-center gap-2 px-6 py-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 font-semibold active:scale-95 transition-transform"
             >
                <ArrowLeft className="w-5 h-5" /> Retour
             </button>

            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full ${selectedProduct.bg.split(' ')[0]}`} />
              {selectedProduct.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTypes.map((type) => (
                <button
                  key={type.itemTypeId}
                  onClick={() => setSelectedType(type)}
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
          </div>
        )}

        {/* VIEW 3: ITEMS (Touch List) */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
               {filteredItems.map((item) => {
                 const isCompared = compareList.some(c => c.itemId === item.itemId);
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
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Prix Unitaire</p>
                            <p className="text-2xl font-bold">{item.price.toFixed(2)} $</p>
                         </div>
                         <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm font-semibold active:bg-neutral-200 transition-colors">
                            {isCompared ? "Sélectionné" : "Comparer"}
                         </button>
                      </div>
                   </div>
                 );
               })}
            </div>

            {filteredItems.length === 0 && (
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
                       onClick={() => toggleCompare(item)}
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
              disabled={compareList.length < 2}
              onClick={() => setShowCompareModal(true)}
              className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:bg-neutral-700 text-white rounded-2xl font-bold text-lg flex items-center gap-2 transition-all active:scale-95 shadow-lg"
            >
              <Scale className="w-5 h-5" />
              COMPARER
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN COMPARISON MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 md:p-8">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-[90vh] md:h-auto rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
              <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" /> 
                Comparaison
              </h3>
              <button 
                 onClick={() => setShowCompareModal(false)} 
                 className="p-4 bg-neutral-200 dark:bg-neutral-700 rounded-full hover:bg-neutral-300 transition-colors active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-700">
              {compareList.map((item) => (
                <div key={item.itemId} className="p-8 space-y-8">
                  <div className="inline-block px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-mono font-bold mb-2">
                    {item.itemCode}
                  </div>
                  <h4 className="text-3xl font-bold leading-tight">{item.description}</h4>
                  
                  <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800 flex flex-col items-center text-center">
                    <span className="text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-2">Prix Unitaire</span>
                    <span className="text-5xl font-mono font-bold text-emerald-600">{item.price.toFixed(2)} $</span>
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
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 flex justify-between items-center">
               <button 
                  onClick={() => { setCompareList([]); setShowCompareModal(false); }}
                  className="px-6 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
               >
                  <Trash2 className="w-5 h-5" /> Tout effacer
               </button>
               <span className="text-sm text-neutral-400 hidden md:block">* Prix sujets à changement</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
