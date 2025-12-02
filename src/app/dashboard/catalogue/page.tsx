"use client";

import { useState, useMemo } from "react";
import { 
  Search, Package, Layers, Tag, X, Check, 
  ArrowRight, Scale, ChevronRight, Zap, ArrowLeft 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types based on your Schema ---
interface Product {
  prodId: number;
  name: string;
  itemCount: number;
  color: string; // UI helper
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
  { prodId: 1, name: "100(G)-TRAITEMENT DE CARBURANT", itemCount: 45, color: "bg-emerald-500" },
  { prodId: 2, name: "110-HUILES MOTEUR", itemCount: 128, color: "bg-blue-500" },
  { prodId: 3, name: "120-HUILES HYDRAULIQUES", itemCount: 89, color: "bg-indigo-500" },
  { prodId: 4, name: "130-HUILES TRANSMISSION", itemCount: 67, color: "bg-violet-500" },
  { prodId: 5, name: "140-GRAISSES INDUSTRIELLES", itemCount: 156, color: "bg-amber-500" },
  { prodId: 6, name: "190-ÉQUIPEMENTS", itemCount: 43, color: "bg-slate-500" },
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

export default function CatalogueBrowser() {
  // Navigation State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Comparison State
  const [compareList, setCompareList] = useState<Item[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // --- Helpers ---
  const filteredTypes = useMemo(() => {
    if (!selectedProduct) return [];
    return MOCK_ITEM_TYPES.filter(t => t.prodId === selectedProduct.prodId);
  }, [selectedProduct]);

  const filteredItems = useMemo(() => {
    let items = MOCK_ITEMS;
    
    // Filter by Hierarchy
    if (selectedProduct) items = items.filter(i => i.prodId === selectedProduct.prodId);
    if (selectedType) items = items.filter(i => i.itemSubTypeId === selectedType.itemTypeId);

    // Filter by Search (Overrides hierarchy if search is deep)
    if (searchQuery.length > 1) {
      items = MOCK_ITEMS.filter(i => 
        i.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return items;
  }, [selectedProduct, selectedType, searchQuery]);

  const toggleCompare = (item: Item) => {
    setCompareList(prev => {
      const exists = prev.find(i => i.itemId === item.itemId);
      if (exists) return prev.filter(i => i.itemId !== item.itemId);
      if (prev.length >= 2) return [prev[1], item]; // Keep max 2, rotate
      return [...prev, item];
    });
  };

  const resetNav = () => {
    setSelectedProduct(null);
    setSelectedType(null);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      
      {/* 1. Header & Global Search */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
                onClick={resetNav}
                className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 transition-colors"
             >
                <Package className="w-6 h-6 text-emerald-600" />
             </button>
             <div>
                <h1 className="text-xl font-bold leading-none">Catalogue SINTO</h1>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                   <span onClick={resetNav} className="cursor-pointer hover:text-emerald-500">Accueil</span>
                   {selectedProduct && <ChevronRight className="w-3 h-3" />}
                   {selectedProduct && <span onClick={() => setSelectedType(null)} className="cursor-pointer hover:text-emerald-500">{selectedProduct.name.split('-')[0]}</span>}
                   {selectedType && <ChevronRight className="w-3 h-3" />}
                   {selectedType && <span className="font-semibold text-emerald-600">{selectedType.description.split('-')[1]}</span>}
                </div>
             </div>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Rechercher code, description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 pb-32">
        
        {/* VIEW 1: PRODUCT CATEGORIES (Root Level) */}
        {!selectedProduct && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Layers className="w-6 h-6 text-neutral-400" /> 
              Catégories Principales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_PRODUCTS.map((prod) => (
                <button
                  key={prod.prodId}
                  onClick={() => setSelectedProduct(prod)}
                  className="group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl p-6 text-left border border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-full transition-transform group-hover:scale-110 ${prod.color}`} />
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white shadow-lg ${prod.color}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold pr-8">{prod.name}</h3>
                  <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
                    <span>{prod.itemCount} articles</span>
                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: ITEM TYPES (Sub-Category Level) */}
        {selectedProduct && !selectedType && !searchQuery && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Retour aux catégories
            </button>
            
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${selectedProduct.color}`} />
              {selectedProduct.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTypes.map((type) => (
                <button
                  key={type.itemTypeId}
                  onClick={() => setSelectedType(type)}
                  className="flex items-center gap-4 p-5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 transition-all hover:shadow-md text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 transition-colors">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{type.description}</h4>
                    <p className="text-sm text-neutral-500">{type.itemCount} variantes</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-emerald-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: ITEMS LIST (Leaf Level) - Or Search Results */}
        {(selectedType || searchQuery) && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
             {!searchQuery && (
               <button 
                 onClick={() => setSelectedType(null)} 
                 className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-emerald-600 transition-colors"
               >
                 <ArrowLeft className="w-4 h-4" /> Retour aux types
               </button>
             )}

            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="p-4 font-semibold text-sm text-neutral-500">Code</th>
                      <th className="p-4 font-semibold text-sm text-neutral-500">Description</th>
                      <th className="p-4 font-semibold text-sm text-neutral-500 text-right">Prix (CAD)</th>
                      <th className="p-4 font-semibold text-sm text-neutral-500 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {filteredItems.map((item) => {
                      const isCompared = compareList.some(c => c.itemId === item.itemId);
                      return (
                        <tr key={item.itemId} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                          <td className="p-4 font-mono font-medium text-emerald-600">{item.itemCode}</td>
                          <td className="p-4">{item.description}</td>
                          <td className="p-4 font-mono text-right">{item.price.toFixed(2)} $</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompare(item); }}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 mx-auto",
                                isCompared 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300"
                              )}
                            >
                              {isCompared ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                              {isCompared ? "Comparé" : "Comparer"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredItems.length === 0 && (
                <div className="p-12 text-center text-neutral-500">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Aucun article trouvé.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* BIG COMPARER BUTTON / FLOATING DOCK */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-bottom-20 duration-500">
          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 ring-1 ring-white/20">
            <div className="flex -space-x-3">
              {compareList.map((item, i) => (
                <div key={item.itemId} className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-neutral-900 dark:border-white flex items-center justify-center text-xs font-bold text-white relative group">
                  {i + 1}
                  <button 
                    onClick={() => toggleCompare(item)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              ))}
              {compareList.length < 2 && (
                <div className="w-10 h-10 rounded-full bg-neutral-800 dark:bg-neutral-200 border-2 border-dashed border-neutral-600 flex items-center justify-center">
                  <span className="text-xs opacity-50">+</span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p className="font-semibold text-sm">Comparateur</p>
              <p className="text-xs opacity-70">{compareList.length} article(s) sélectionné(s)</p>
            </div>

            <button 
              disabled={compareList.length < 2}
              onClick={() => setShowCompareModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <Scale className="w-4 h-4" />
              COMPARER
            </button>
          </div>
        </div>
      )}

      {/* COMPARISON MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" /> 
                Comparaison Côte-à-Côte
              </h3>
              <button onClick={() => setShowCompareModal(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-700">
              {compareList.map((item) => (
                <div key={item.itemId} className="p-8 space-y-6">
                  <div className="inline-block px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-mono mb-2">
                    {item.itemCode}
                  </div>
                  <h4 className="text-2xl font-bold">{item.description}</h4>
                  
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <span className="text-sm text-neutral-500 block mb-1">Prix Unitaire</span>
                    <span className="text-3xl font-mono font-bold text-emerald-600">{item.price.toFixed(2)} $</span>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex justify-between border-b border-dashed border-neutral-200 pb-2">
                      <span className="text-neutral-500">ID Produit</span>
                      <span className="font-mono">{item.prodId}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-neutral-200 pb-2">
                      <span className="text-neutral-500">Sous-Type</span>
                      <span className="font-mono">{item.itemSubTypeId}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 text-center text-sm text-neutral-500">
              * Les prix peuvent varier selon le volume et le contrat client.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
