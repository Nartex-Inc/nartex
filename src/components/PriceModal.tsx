"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X, Loader2, FileText } from "lucide-react";

// ============================================================================
// INTERFACES
// ============================================================================

interface PriceList {
  priceId: number;
  name: string;
  code: string;
  currency: string;
}

interface PriceColumnConfig {
  priceId: number;
  label: string;
  code: string;
}

interface PriceRange {
  rangeId: number;
  qtyMin: number;
  unitPrice: number;
  prices: Record<number, number>; // priceListId -> price
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
  ranges: PriceRange[];
}

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];
  priceLists: PriceList[];
  selectedPriceList: PriceList | null;
  columnsConfig: PriceColumnConfig[];
  primaryPriceId: number;
  onPriceListChange: (priceId: number, includeMultipleColumns: boolean) => void;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// HELPER: ANIMATED PRICE
// ============================================================================

function AnimatedPrice({ value, duration = 400 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * easeOut);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  return <span>{displayValue.toFixed(2)}</span>;
}

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

function Toggle({ 
  enabled, 
  onChange, 
  label 
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void; 
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-white text-sm font-medium hidden md:inline-block">{label}</span>
      <div 
        onClick={() => onChange(!enabled)} 
        className={cn(
          "relative w-12 h-6 rounded-full transition-colors cursor-pointer", 
          enabled ? "bg-white" : "bg-white/30"
        )}
      >
        <div 
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm", 
            enabled ? "left-7 bg-red-600" : "left-1 bg-white"
          )} 
        />
      </div>
    </label>
  );
}

// ============================================================================
// PDS PRICE ID CONSTANT
// ============================================================================
const PDS_PRICE_ID = 17;

// ============================================================================
// PRICE MODAL COMPONENT
// ============================================================================

export function PriceModal({ 
  isOpen, 
  onClose, 
  data, 
  priceLists, 
  selectedPriceList, 
  columnsConfig,
  primaryPriceId,
  onPriceListChange, 
  loading, 
  error
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  // When toggle changes, refetch with multiple columns
  useEffect(() => {
    if (selectedPriceList && isOpen) {
      onPriceListChange(selectedPriceList.priceId, showDetails);
    }
  }, [showDetails]);

  if (!isOpen) return null;

  const itemsWithPrices = data.filter(item => item.ranges && item.ranges.length > 0);

  // Get all price columns to display (excluding PDS which is always last)
  const priceColumns = showDetails ? columnsConfig : [];
  const pdsColumn = columnsConfig.find(c => c.priceId === PDS_PRICE_ID);
  
  // When not showing details, just show the selected price list column
  const displayColumns = showDetails 
    ? columnsConfig.filter(c => c.priceId !== PDS_PRICE_ID)
    : [{ priceId: selectedPriceList?.priceId || 0, label: selectedPriceList?.code || "Prix", code: selectedPriceList?.code || "" }];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-[98vw] max-h-[94vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
      >
        {/* Modal Header - Red Banner */}
        <div className="flex-shrink-0 bg-red-600 px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Liste de Prix</h2>
                <p className="text-white/70 text-sm">{selectedPriceList?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Toggle for multi-column details */}
              <Toggle 
                enabled={showDetails} 
                onChange={setShowDetails} 
                label="Afficher détails" 
              />

              {/* Price list selector */}
              <select
                value={selectedPriceList?.priceId || ""}
                onChange={(e) => onPriceListChange(parseInt(e.target.value), showDetails)}
                disabled={loading}
                className="h-12 px-4 bg-white/20 text-white rounded-xl font-bold text-base border-2 border-white/30 focus:border-white outline-none min-w-[200px] disabled:opacity-50"
              >
                {priceLists.map(pl => (
                  <option key={pl.priceId} value={pl.priceId} className="text-neutral-900 bg-white">
                    {pl.code} - {pl.name}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={onClose} 
                className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-3 md:p-5 bg-neutral-100 dark:bg-neutral-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-red-500" />
              <p className="text-neutral-500 font-medium">Chargement des prix...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl text-red-300">!</div>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">Erreur</p>
              <p className="text-neutral-500 mt-1">{error}</p>
            </div>
          ) : itemsWithPrices.length > 0 ? (
            <div className="space-y-6">
              {/* Group by class/category */}
              {groupByClass(itemsWithPrices).map(group => (
                <div key={group.className} className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                  {/* Class Header */}
                  <div className="bg-red-600 px-4 py-3">
                    <h3 className="font-bold text-white text-lg">{group.className}</h3>
                    {group.categoryName && (
                      <p className="text-white/70 text-sm">{group.categoryName}</p>
                    )}
                  </div>
                  
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-neutral-200 dark:bg-neutral-800">
                          <th className="px-3 py-3 text-left font-bold text-neutral-700 dark:text-neutral-300 sticky left-0 bg-neutral-200 dark:bg-neutral-800 z-10">
                            Article
                          </th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 dark:text-neutral-300">
                            CAISSE
                          </th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 dark:text-neutral-300">
                            Format
                          </th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 dark:text-neutral-300">
                            Qte/Qty
                          </th>
                          
                          {/* Dynamic Price Columns */}
                          {displayColumns.map(col => (
                            <th 
                              key={col.priceId}
                              className={cn(
                                "px-3 py-3 text-right font-bold",
                                col.priceId === primaryPriceId 
                                  ? "text-yellow-600 dark:text-yellow-400" 
                                  : "text-neutral-700 dark:text-neutral-300"
                              )}
                            >
                              {col.label}
                            </th>
                          ))}
                          
                          {/* PDS Column (always shown) */}
                          <th className="px-3 py-3 text-right font-bold text-red-600 dark:text-red-400">
                            PDS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item, itemIdx) => (
                          item.ranges.map((range, rangeIdx) => (
                            <tr 
                              key={`${item.itemId}-${range.rangeId}`}
                              className={cn(
                                "border-t border-neutral-200 dark:border-neutral-800",
                                itemIdx % 2 === 0 
                                  ? "bg-white dark:bg-neutral-900" 
                                  : "bg-neutral-50 dark:bg-neutral-900/50"
                              )}
                            >
                              {/* Article - only show on first row of item */}
                              <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                                {rangeIdx === 0 && (
                                  <div className="font-bold text-neutral-900 dark:text-white">
                                    {item.itemCode}
                                  </div>
                                )}
                              </td>
                              
                              {/* Caisse */}
                              <td className="px-3 py-2 text-center text-neutral-600 dark:text-neutral-400">
                                {rangeIdx === 0 && item.caisse}
                              </td>
                              
                              {/* Format */}
                              <td className="px-3 py-2 text-center font-medium text-neutral-700 dark:text-neutral-300">
                                {rangeIdx === 0 && item.format}
                              </td>
                              
                              {/* Qty */}
                              <td className="px-3 py-2 text-center font-medium text-neutral-700 dark:text-neutral-300">
                                {range.qtyMin}
                              </td>
                              
                              {/* Dynamic Price Columns */}
                              {displayColumns.map(col => {
                                const price = range.prices[col.priceId] ?? range.unitPrice;
                                const isPrimary = col.priceId === primaryPriceId;
                                
                                return (
                                  <td 
                                    key={col.priceId}
                                    className={cn(
                                      "px-3 py-2 text-right font-semibold tabular-nums",
                                      isPrimary 
                                        ? "text-yellow-600 dark:text-yellow-400" 
                                        : "text-neutral-700 dark:text-neutral-300"
                                    )}
                                  >
                                    {price !== undefined ? (
                                      <AnimatedPrice value={price} />
                                    ) : (
                                      <span className="text-neutral-400">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              
                              {/* PDS Column */}
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-red-600 dark:text-red-400">
                                {range.prices[PDS_PRICE_ID] !== undefined ? (
                                  <AnimatedPrice value={range.prices[PDS_PRICE_ID]} />
                                ) : (
                                  <span className="text-neutral-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl text-neutral-300 dark:text-neutral-700">📋</div>
              <p className="text-xl font-bold text-neutral-500">Aucun prix trouvé</p>
              <p className="text-neutral-400">Essayez une autre sélection</p>
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="flex-shrink-0 px-4 md:px-6 py-3 bg-neutral-200 dark:bg-neutral-800 border-t border-neutral-300 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {itemsWithPrices.length} article(s)
            </p>
            {showDetails && (
              <p className="text-sm text-neutral-500">
                {displayColumns.length + 1} colonnes de prix affichées
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// HELPER: GROUP ITEMS BY CLASS
// ============================================================================

function groupByClass(items: ItemPriceData[]): { 
  className: string; 
  categoryName: string; 
  items: ItemPriceData[];
}[] {
  const groups = new Map<string, { categoryName: string; items: ItemPriceData[] }>();
  
  for (const item of items) {
    const key = item.className || "Sans classe";
    if (!groups.has(key)) {
      groups.set(key, { categoryName: item.categoryName || "", items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  
  return Array.from(groups.entries()).map(([className, data]) => ({
    className,
    categoryName: data.categoryName,
    items: data.items,
  }));
}

export default PriceModal;
