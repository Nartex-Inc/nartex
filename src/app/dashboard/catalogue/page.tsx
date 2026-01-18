"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { startRegistration } from "@simplewebauthn/browser";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Search,
  X,
  RotateCcw,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Filter,
  Sparkles,
  Package,
  Layers,
  Tag,
  FileText,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Inbox,
  Check,
  Trash2,
  SlidersHorizontal,
  ChevronUp
} from "lucide-react";

/* =========================
   Types
========================= */
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
  expBasePrice: number | null;
  coutExp: number | null;
  costingDiscountAmt?: number;
  columns?: Record<string, number | null>;
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
  priceListName: string;
  priceCode: string;
  ranges: PriceRange[];
}

/* =========================
   Utilities
========================= */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

async function getDataUri(url: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.setAttribute("crossOrigin", "anonymous");
    image.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve("");
    image.src = url;
  });
}

function abbreviateColumnName(name: string): string {
  let result = name.trim();
  if (result === "04-GROSEXP") return "4-GREXP";
  result = result.replace(/^0(\d+-)/, "$1");
  return result;
}

/* =========================
   UI Components
========================================================= */

const ToggleButton = ({ active, onClick, icon: Icon, title, loading }: { active: boolean; onClick: () => void; icon: any; title?: string; loading?: boolean }) => (
  <button 
    onClick={onClick}
    title={title}
    disabled={loading}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
      active 
        ? "bg-red-600 text-white shadow-md shadow-red-900/20" 
        : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600",
      loading && "opacity-70 cursor-wait"
    )}
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
  </button>
);

const ActionButton = ({ onClick, disabled, icon: Icon, title, primary, label, loading }: { onClick: () => void; disabled?: boolean; icon: any; title?: string; primary?: boolean; label?: string; loading?: boolean }) => (
  <button 
    onClick={onClick}
    disabled={disabled || loading}
    title={title}
    className={cn(
      "h-10 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
      label ? "px-5" : "w-10",
      primary 
        ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20" 
        : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
    )}
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
    {label && <span className="text-sm font-bold">{label}</span>}
  </button>
);

const Dropdown = ({ 
    id, 
    label, 
    icon: Icon, 
    value, 
    placeholder, 
    options, 
    disabled, 
    renderOption,
    openDropdown,
    setOpenDropdown
  }: {
    id: string;
    label: string;
    icon: any;
    value: string | undefined | null;
    placeholder: string;
    options: any[];
    disabled?: boolean;
    renderOption: (opt: any) => ReactNode;
    openDropdown: string | null;
    setOpenDropdown: (val: string | null) => void;
  }) => (
    <div className="relative flex-1 min-w-0">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">{label}</label>
      <button 
        onClick={() => !disabled && setOpenDropdown(openDropdown === id ? null : id)}
        disabled={disabled}
        className={cn(
          "w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left flex items-center gap-2 text-sm",
          openDropdown === id && "border-red-500 ring-1 ring-red-500/20"
        )}
      >
        <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span className={cn("truncate flex-1 font-medium", value ? "text-white" : "text-slate-500")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-500 flex-shrink-0 transition-transform", openDropdown === id && "rotate-180")} />
      </button>
      {openDropdown === id && (
        <>
        <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
        <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl shadow-black/50 overflow-hidden max-h-64 overflow-y-auto">
          {options.map(opt => renderOption(opt))}
        </div>
        </>
      )}
    </div>
);

const QuickAddPanel = ({
  onAddItems,
  onClose,
  accentColor,
}: {
  onAddItems: (itemIds: number[]) => void;
  onClose: () => void;
  accentColor: string;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length > 1) {
        setSearching(true);
        try {
          const res = await fetch(`/api/catalogue/items?search=${encodeURIComponent(query)}`);
          if (res.ok) setResults(await res.json());
        } finally {
          setSearching(false);
        }
      } else setResults([]);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAdd = () => {
    onAddItems(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 font-['DM_Sans',system-ui,sans-serif]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        
        {/* Mobile Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-700" />
        </div>

        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Recherche rapide</h3>
              <p className="text-sm text-slate-400">Ajoutez des articles par code ou description</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="search"
              className="w-full h-14 pl-12 pr-4 rounded-xl text-base font-medium bg-slate-950 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none text-white placeholder:text-slate-500 transition-all"
              placeholder="Ex: SYN-5W30..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                {searching ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <Search className="w-5 h-5 text-slate-500" />}
            </div>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-2 py-2 bg-slate-950/50">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item) => {
                const isSelected = selectedIds.has(item.itemId);
                return (
                  <button
                    key={item.itemId}
                    onClick={() => toggleSelect(item.itemId)}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-left group",
                      isSelected ? "bg-red-500/10 border border-red-500/30" : "hover:bg-slate-800 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      isSelected ? "bg-red-500 border-red-500" : "border-slate-600 group-hover:border-slate-500"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                         <span className="font-mono font-bold text-sm text-red-400">{item.itemCode}</span>
                         <span className="text-[10px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{item.itemId}</span>
                      </div>
                      <div className="text-xs text-slate-300 truncate mt-0.5">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.length > 1 && !searching ? (
            <div className="py-12 text-center">
              <Inbox className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Aucun résultat trouvé</p>
            </div>
          ) : (
            <div className="py-12 text-center">
                <p className="text-slate-600 text-sm">Commencez à taper pour rechercher...</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900">
          <button
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className="w-full h-14 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Ajouter {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmailModal = ({
  isOpen,
  onClose,
  onSend,
  sending,
  accentColor,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  sending: boolean;
  accentColor: string;
}) => {
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 font-['DM_Sans',system-ui,sans-serif]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Envoyer par courriel</h3>
              <p className="text-sm text-slate-400">La liste sera jointe en PDF</p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="email"
            className="w-full h-12 px-4 rounded-xl text-sm font-medium bg-slate-950 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none text-white placeholder:text-slate-500 transition-all"
            placeholder="nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} disabled={sending} className="flex-1 h-12 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50">
            Annuler
          </button>
          <button 
            onClick={() => onSend(email)} 
            disabled={!email || sending} 
            className="flex-1 h-12 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : <><Send className="w-4 h-4" /> Envoyer</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Main Full Screen Page
========================= */
export default function CataloguePage() {
  const router = useRouter();
  const { color: accentColor } = useCurrentAccent();
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);

  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

  const [showDetails, setShowDetails] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // UI State
  const [showFilters, setShowFilters] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, plRes] = await Promise.all([
          fetch("/api/catalogue/products"),
          fetch("/api/catalogue/pricelists"),
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (plRes.ok) {
          const pls: PriceList[] = await plRes.json();
          setPriceLists(pls);
          const defaultList = pls.find((p) => p.code.startsWith("03")) || pls[0];
          if (defaultList) setSelectedPriceList(defaultList);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    })();
  }, []);

  // --- HANDLERS ---
  const handlePriceListChange = async (pl: PriceList) => {
    setSelectedPriceList(pl);
    setOpenDropdown(null);
    
    if (priceData.length > 0) {
      setLoadingPrices(true);
      const allIds = Array.from(new Set(priceData.map((i) => i.itemId))).join(",");
      try {
        const url = `/api/catalogue/prices?priceId=${pl.priceId}&itemIds=${allIds}`;
        const res = await fetch(url);
        if (res.ok) setPriceData(await res.json());
      } finally {
        setLoadingPrices(false);
      }
    }
  };

  const handleProductChange = async (prodId: string) => {
    const prod = products.find((p) => p.prodId === parseInt(prodId));
    if (!prod) {
        setSelectedProduct(null);
        return;
    }
    
    setSelectedProduct(prod);
    setSelectedType(null);
    setSelectedItemIds(new Set());
    setItems([]);
    setOpenDropdown(null);
    
    setLoadingTypes(true);
    try {
      const res = await fetch(`/api/catalogue/itemtypes?prodId=${prod.prodId}`);
      if (res.ok) setItemTypes(await res.json());
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleTypeChange = async (typeId: string) => {
    if (!typeId) {
      setSelectedType(null);
      setSelectedItemIds(new Set());
      setItems([]);
      return;
    }
    const type = itemTypes.find((t) => t.itemTypeId === parseInt(typeId));
    if (!type) return;
    
    setSelectedType(type);
    setSelectedItemIds(new Set());
    setOpenDropdown(null);
    
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoadingItems(false);
    }
  };

  const handleLoadSelection = async () => {
    if (!selectedPriceList) return;
    
    if (selectedItemIds.size > 0) {
      await handleAddItems(Array.from(selectedItemIds));
      return;
    }

    setLoadingPrices(true);
    setPriceError(null);
    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}`;
      if (selectedProduct) url += `&prodId=${selectedProduct.prodId}`;
      if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur lors du chargement des prix");
      
      const newItems: ItemPriceData[] = await res.json();
      setPriceData((prev) => {
        const existingIds = new Set(prev.map((i) => i.itemId));
        const filteredNew = newItems.filter((i) => !existingIds.has(i.itemId));
        return [...prev, ...filteredNew];
      });
    } catch (err: any) {
      setPriceError(err.message);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleAddItems = async (itemIds: number[]) => {
    if (!selectedPriceList || itemIds.length === 0) return;
    setLoadingPrices(true);
    try {
      const idsString = itemIds.join(",");
      const url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&itemIds=${idsString}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch items");
      const newItems: ItemPriceData[] = await res.json();
      setPriceData((prev) => {
        const existingIds = new Set(prev.map((i) => i.itemId));
        const filteredNew = newItems.filter((i) => !existingIds.has(i.itemId));
        return [...prev, ...filteredNew];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleToggleDetails = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    setIsAuthenticating(true);
    try {
      const resp = await fetch("/api/auth/challenge");
      if (!resp.ok) throw new Error("Challenge fetch failed");
      const options = await resp.json();
      const authResp = await startRegistration(options);
      const verifyResp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResp),
      });
      const verification = await verifyResp.json();
      if (verification.verified) setShowDetails(true);
      else {
        alert("Vérification échouée.");
        setShowDetails(false);
      }
    } catch (e) {
      console.error("Auth error", e);
      alert("Authentification annulée ou impossible.");
      setShowDetails(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailPDF = async (recipientEmail: string) => {
    setIsSendingEmail(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const corporateRed: [number, number, number] = [200, 30, 30];
      const black: [number, number, number] = [0, 0, 0];
      const darkGray: [number, number, number] = [51, 51, 51];
      const mediumGray: [number, number, number] = [102, 102, 102];
      const borderGray: [number, number, number] = [200, 200, 200];
      const white: [number, number, number] = [255, 255, 255];

      const logoData = await getDataUri("/sinto-logo.svg");
      if (logoData) {
        const tempImg = new window.Image();
        tempImg.src = logoData;
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.onerror = resolve;
        });
        const naturalWidth = tempImg.naturalWidth || 200;
        const naturalHeight = tempImg.naturalHeight || 50;
        const aspectRatio = naturalWidth / naturalHeight;
        const logoWidth = 36;
        const logoHeight = logoWidth / aspectRatio;
        doc.addImage(logoData, "PNG", 15, 14, logoWidth, logoHeight);
      }
      
      doc.setTextColor(...black);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SINTO", pageWidth - 15, 15, { align: "right" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mediumGray);
      doc.text("3750, 14e Avenue", pageWidth - 15, 21, { align: "right" });
      doc.text("Saint-Georges (Qc) G5Y 8E3", pageWidth - 15, 26, { align: "right" });
      doc.text("Tél: (418) 227-6442 | 1-800-463-0025", pageWidth - 15, 31, { align: "right" });
      
      doc.setFillColor(...corporateRed);
      doc.rect(15, 38, pageWidth - 30, 10, "F");
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const priceListTitle = `${abbreviateColumnName(selectedPriceList?.code || "")} - ${selectedPriceList?.name || ""}`.toUpperCase();
      doc.text(priceListTitle, pageWidth / 2, 45, { align: "center" });
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Effective: ${new Date().toLocaleDateString("fr-CA")}`, pageWidth / 2, 54, { align: "center" });

      let finalY = 62;

      const groupedForPdf = priceData.reduce((acc, item) => {
        const key = item.className || "Articles Ajoutés";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, ItemPriceData[]>);

      for (const [className, classItems] of Object.entries(groupedForPdf)) {
        if (finalY > 250) {
          doc.addPage();
          doc.setFillColor(...black);
          doc.rect(15, 10, pageWidth - 30, 8, "F");
          doc.setTextColor(...white);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(priceListTitle, pageWidth / 2, 15.5, { align: "center" });
          finalY = 25;
        }
        
        doc.setFillColor(...black);
        doc.rect(15, finalY, pageWidth - 30, 8, "F");
        doc.setTextColor(...white);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(className.toUpperCase(), 18, finalY + 5.5);
        doc.setTextColor(...corporateRed);
        doc.setFontSize(8);
        doc.text(`${classItems.length} article(s)`, pageWidth - 18, finalY + 5.5, { align: "right" });
        
        finalY += 12;

        const firstItem = classItems[0];
        let priceColumns = firstItem.ranges[0]?.columns
          ? Object.keys(firstItem.ranges[0].columns).sort()
          : [selectedPriceList?.code || "Prix"];
        if (!showDetails && selectedPriceList?.code !== "01-EXP") {
          priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
        }
        const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
        const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS");

        const tableBody: any[] = [];
        const itemStartRows: number[] = [];
        let rowIndex = 0;

        classItems.forEach((item) => {
          itemStartRows.push(rowIndex);
          item.ranges.forEach((range, idx) => {
            const row: string[] = [];
            if (idx === 0) {
              row.push(item.itemCode);
              row.push(item.caisse ? Math.round(item.caisse).toString() : "-");
              row.push(item.format || "-");
            } else {
              row.push("");
              row.push("");
              row.push("");
            }
            row.push(range.qtyMin.toString());
            standardColumns.forEach((col) => {
              const val = range.columns?.[col] ?? null;
              row.push(val ? val.toFixed(2) : "-");
              if (showDetails && col.trim() === selectedPriceList?.code?.trim()) {
                const ppc = calcPricePerCaisse(val || 0, item.caisse);
                const ppl = calcPricePerLitre(val || 0, item.volume);
                const expVal = range.columns?.["01-EXP"] ?? null;
                const pExp = calcMargin(val, expVal);
                row.push(ppc ? ppc.toFixed(2) : "-");
                row.push(ppl ? ppl.toFixed(2) : "-");
                row.push(pExp ? `${pExp.toFixed(1)}%` : "-");
              }
            });
            if (hasPDS) {
              const p = range.columns?.["08-PDS"] ?? null;
              row.push(p ? p.toFixed(2) : "-");
            }
            tableBody.push(row);
            rowIndex++;
          });
        });

        const headRow = ["Article", "Cs", "Fmt", "Qty"];
        standardColumns.forEach((c) => {
          headRow.push(abbreviateColumnName(c));
          if (showDetails && c.trim() === selectedPriceList?.code?.trim()) {
            headRow.push("$/Cs");
            headRow.push("$/L");
            headRow.push("%Exp");
          }
        });
        if (hasPDS) headRow.push(abbreviateColumnName("08-PDS"));

        autoTable(doc, {
          startY: finalY,
          head: [headRow],
          body: tableBody,
          margin: { left: 15, right: 15 },
          styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: "helvetica",
            lineColor: borderGray,
            lineWidth: 0.3,
            textColor: darkGray,
          },
          headStyles: { 
            fillColor: corporateRed,
            textColor: white,
            fontStyle: "bold",
            halign: "center",
            lineColor: corporateRed,
            lineWidth: 0.3,
          },
          columnStyles: { 
            0: { fontStyle: "bold", halign: "left", cellWidth: 30 },
            1: { halign: "center", cellWidth: 12 },
            2: { halign: "center", cellWidth: 15 },
            3: { halign: "center", cellWidth: 12 },
          },
          theme: "grid",
          didParseCell: function (d) {
            if (d.section === "body" && d.column.index >= 4) {
              d.cell.styles.halign = "right";
            }
            if (d.section === "body" && d.column.index === 0 && d.cell.raw) {
              d.cell.styles.textColor = corporateRed;
              d.cell.styles.fontStyle = "bold";
            }
            if (d.section === "body") {
              let itemIndex = 0;
              for (let i = 0; i < itemStartRows.length; i++) {
                if (d.row.index >= itemStartRows[i]) {
                  itemIndex = i;
                }
              }
              if (itemIndex % 2 === 1) {
                d.cell.styles.fillColor = [250, 250, 250];
              }
            }
          },
          didDrawCell: function(d) {
            if (d.section === "body" && d.column.index === 0) {
              const nextRowIndex = d.row.index + 1;
              if (itemStartRows.includes(nextRowIndex) && nextRowIndex < tableBody.length) {
                doc.setDrawColor(...black);
                doc.setLineWidth(1);
                doc.line(d.cell.x, d.cell.y + d.cell.height, pageWidth - 15, d.cell.y + d.cell.height);
              }
            }
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...black);
        doc.setLineWidth(0.5);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        doc.setTextColor(...mediumGray);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("SINTO - Experts en lubrification | 3750, 14e Avenue, Saint-Georges (Qc) G5Y 8E3 | Tél: (418) 227-6442 | 1-800-463-0025", 15, pageHeight - 10);
        doc.text(`Page ${i} / ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
      }

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("file", pdfBlob, "ListePrix_SINTO.pdf");
      formData.append("to", recipientEmail);
      formData.append("subject", `Liste de prix SINTO : ${selectedPriceList?.name}`);
      formData.append(
        "message",
        "Bonjour,\n\nVeuillez trouver ci-joint la liste de prix que vous avez demandée.\n\nCordialement,\n\nSINTO\nExperts en lubrification\n3750, 14e Avenue\nSaint-Georges (Qc) G5Y 8E3\nTél: (418) 227-6442\n1-800-463-0025"
      );
      const res = await fetch("/api/catalogue/email", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erreur envoi");
      alert("Courriel envoyé avec succès!");
      setShowEmailModal(false);
    } catch (e: any) {
      console.error(e);
      alert("Erreur: " + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const calcPricePerCaisse = (price: number, caisse: number | null) => caisse ? price * caisse : null;
  const calcPricePerLitre = (price: number, volume: number | null) => volume ? price / volume : null;
  const calcMargin = (sell: number | null, cost: number | null) => {
    if (!sell || !cost || sell === 0) return null;
    return ((sell - cost) / sell) * 100;
  };

  const itemsWithPrices = priceData.filter((item) => item.ranges && item.ranges.length > 0);
  const groupedItems = itemsWithPrices.reduce((acc, item) => {
    const key = item.className || "Articles Ajoutés";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ItemPriceData[]>);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['DM_Sans',system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Left: Logo, Price List & Controls */}
          <div className="flex items-center gap-3">
            {/* Logo Icon (Using existing Next.js Image component for consistency) */}
            <div className="flex-shrink-0 bg-white p-1 rounded-sm">
                <Image
                    src="/sinto-logo.svg"
                    alt="SINTO"
                    width={80}
                    height={28}
                    className="h-7 w-auto object-contain"
                />
            </div>

            <div className="w-px h-8 bg-slate-700 mx-1" />

            {/* Price List Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setOpenDropdown(openDropdown === 'pricelist' ? null : 'pricelist')}
                className={cn(
                  "h-9 px-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-red-500/50 transition-all flex items-center gap-2 text-sm min-w-[240px]",
                  openDropdown === 'pricelist' && "border-red-500"
                )}
              >
                <span className="truncate flex-1 text-left">
                  {selectedPriceList ? (
                    <>
                      <span className="text-white font-medium">{selectedPriceList.code}</span>
                      <span className="text-slate-400 ml-2">- {selectedPriceList.name}</span>
                    </>
                  ) : "Sélectionner une liste..."}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", openDropdown === 'pricelist' && "rotate-180")} />
              </button>
              {openDropdown === 'pricelist' && (
                <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                <div className="absolute z-40 top-full left-0 mt-1 bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden w-80 max-h-96 overflow-y-auto">
                  {priceLists.map(list => (
                    <button
                      key={list.priceId}
                      onClick={() => handlePriceListChange(list)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700 transition-colors flex items-center justify-between",
                        selectedPriceList?.priceId === list.priceId && "bg-red-600/20 text-red-400"
                      )}
                    >
                      <span className="truncate">{list.code} - {list.name}</span>
                      {selectedPriceList?.priceId === list.priceId && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
                </>
              )}
            </div>

            {/* Eye Toggle for Details */}
            <ToggleButton 
                active={showDetails} 
                onClick={handleToggleDetails} 
                icon={showDetails ? Eye : EyeOff} 
                title="Afficher/Masquer les détails (marges, coûts)"
                loading={isAuthenticating}
            />

            {/* Filters Toggle */}
            <ToggleButton 
                active={showFilters} 
                onClick={() => setShowFilters(!showFilters)} 
                icon={SlidersHorizontal} 
                title="Afficher/Masquer les filtres"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ActionButton 
                onClick={() => setShowQuickAdd(true)} 
                icon={Search} 
                title="Recherche rapide par code"
            />
            
            <ActionButton 
                onClick={handleLoadSelection} 
                disabled={(!selectedCategory && selectedItemIds.size === 0)}
                icon={Plus} 
                title="Ajouter la sélection à la liste"
                primary 
                label={!isMobile ? "Ajouter" : undefined}
                loading={loadingPrices}
            />

            <ActionButton 
                onClick={() => setPriceData([])} 
                disabled={priceData.length === 0} 
                icon={Trash2} 
                title="Effacer tout" 
            />

            <ActionButton 
                onClick={() => setShowEmailModal(true)} 
                disabled={priceData.length === 0}
                icon={Mail} 
                title="Envoyer par courriel"
                primary 
                label={!isMobile ? "Envoyer" : undefined}
            />

            <div className="w-px h-8 bg-slate-700 mx-1" />

            <ActionButton 
                onClick={() => router.back()} 
                icon={X} 
                title="Fermer" 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                {/* Category Dropdown */}
                <Dropdown
                    id="category"
                    label="Catégorie"
                    icon={Layers}
                    value={selectedProduct?.name}
                    placeholder="Sélectionner..."
                    options={products}
                    disabled={loadingTypes}
                    openDropdown={openDropdown}
                    setOpenDropdown={setOpenDropdown}
                    renderOption={(prod: Product) => (
                        <button
                            key={prod.prodId}
                            onClick={() => handleProductChange(prod.prodId.toString())}
                            className={cn(
                                "w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center justify-between",
                                selectedProduct?.prodId === prod.prodId && "bg-red-600/20 text-red-400"
                            )}
                        >
                            <span>{prod.name}</span>
                            <span className="text-xs text-slate-500">{prod.itemCount}</span>
                        </button>
                    )}
                />

                {/* Class Dropdown */}
                <Dropdown
                    id="class"
                    label="Classe (Opt.)"
                    icon={Package}
                    value={selectedType?.description}
                    placeholder="Toutes"
                    options={itemTypes}
                    disabled={!selectedProduct || loadingItems}
                    openDropdown={openDropdown}
                    setOpenDropdown={setOpenDropdown}
                    renderOption={(type: ItemType) => (
                        <button
                            key={type.itemTypeId}
                            onClick={() => handleTypeChange(type.itemTypeId.toString())}
                            className={cn(
                                "w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center justify-between",
                                selectedType?.itemTypeId === type.itemTypeId && "bg-red-600/20 text-red-400"
                            )}
                        >
                            <span>{type.description}</span>
                            <span className="text-xs text-slate-500">{type.itemCount}</span>
                        </button>
                    )}
                />
                
                {/* Items MultiSelect Dropdown */}
                <div className="relative flex-1 min-w-0 w-full">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">Articles (Opt.)</label>
                    <button 
                        onClick={() => !(!selectedType && !selectedProduct) && setOpenDropdown(openDropdown === 'items' ? null : 'items')}
                        disabled={!selectedType && !selectedProduct}
                        className={cn(
                        "w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left flex items-center gap-2 text-sm",
                        openDropdown === 'items' && "border-red-500 ring-1 ring-red-500/20"
                        )}
                    >
                        <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className={cn("truncate flex-1 font-medium", selectedItemIds.size > 0 ? "text-white" : "text-slate-500")}>
                        {selectedItemIds.size > 0 ? `${selectedItemIds.size} article(s) sélectionné(s)` : "Sélectionner..."}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-500 flex-shrink-0 transition-transform", openDropdown === 'items' && "rotate-180")} />
                    </button>
                    {openDropdown === 'items' && (
                        <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                        <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl shadow-black/50 overflow-hidden max-h-80 flex flex-col">
                            <div className="p-3 border-b border-slate-700 bg-slate-900 sticky top-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input 
                                        autoFocus
                                        placeholder="Filtrer..." 
                                        className="w-full bg-slate-950 text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-white placeholder:text-slate-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                            <div className="overflow-y-auto p-1">
                                {items.length > 0 ? items.map(item => (
                                    <button
                                        key={item.itemId}
                                        onClick={() => {
                                            const next = new Set(selectedItemIds);
                                            if (next.has(item.itemId)) next.delete(item.itemId);
                                            else next.add(item.itemId);
                                            setSelectedItemIds(next);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center justify-between rounded-lg group",
                                            selectedItemIds.has(item.itemId) && "bg-red-900/10"
                                        )}
                                    >
                                        <div className="truncate pr-2 flex-1">
                                            <span className={cn("font-mono font-bold mr-2", selectedItemIds.has(item.itemId) ? "text-red-400" : "text-slate-400 group-hover:text-white")}>{item.itemCode}</span>
                                            <span className="text-slate-400 group-hover:text-slate-300 text-xs">{item.description}</span>
                                        </div>
                                        {selectedItemIds.has(item.itemId) && <Check className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                    </button>
                                )) : (
                                    <div className="p-8 text-center text-sm text-slate-500">Aucun article disponible</div>
                                )}
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* Results Area */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-h-[400px] flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h2 className="font-semibold text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Aperçu de la liste
                </h2>
                {itemsWithPrices.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 text-xs font-bold border border-red-900/50">
                    {itemsWithPrices.length}
                    </span>
                )}
            </div>

            {loadingPrices ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                    <p className="text-slate-400 font-medium">Chargement des prix...</p>
                </div>
            ) : itemsWithPrices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6">
                        <Inbox className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-slate-300 text-lg font-bold">La liste est vide</p>
                    <p className="text-slate-500 text-sm mt-2 max-w-sm">Utilisez les filtres ci-dessus ou la recherche rapide pour commencer à ajouter des produits.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto">
                    {Object.entries(groupedItems).map(([className, classItems]) => (
                        <div key={className} className="border-b border-slate-800 last:border-0">
                            <div className="bg-slate-950/30 px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-l-4 border-red-600/50">
                                <span>{className}</span>
                                <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px]">{classItems.length} items</span>
                            </div>
                            <div className="divide-y divide-slate-800/50">
                                {classItems.map(item => (
                                    <div key={item.itemId} className="p-4 sm:p-6 hover:bg-slate-800/20 transition-colors group">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <span className="font-mono font-bold text-lg text-white group-hover:text-red-400 transition-colors">{item.itemCode}</span>
                                                    {item.format && <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs font-medium text-slate-400 border border-slate-700">{item.format}</span>}
                                                    {item.caisse && <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs font-medium text-slate-400 border border-slate-700">{Math.round(item.caisse)}/Cs</span>}
                                                </div>
                                                <div className="text-sm text-slate-400 font-medium">{item.description}</div>
                                            </div>
                                            <button 
                                                onClick={() => setPriceData(prev => prev.filter(i => i.itemId !== item.itemId))}
                                                className="text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg p-2 transition-all self-start sm:self-center"
                                                title="Retirer de la liste"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Pricing Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                            {item.ranges.map(range => {
                                                const price = range.unitPrice; 
                                                return (
                                                    <div key={range.id} className="bg-slate-950 rounded-xl border border-slate-800 p-3 text-center group/card hover:border-slate-600 transition-all">
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wide">
                                                            Qté {range.qtyMin}+
                                                        </div>
                                                        <div className="text-lg font-bold text-white group-hover/card:text-red-400 transition-colors">
                                                            {price.toFixed(2)}$
                                                        </div>
                                                        {showDetails && (
                                                            <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-1 text-[10px]">
                                                                <div className="text-blue-400 font-medium" title="Prix au litre">
                                                                    {calcPricePerLitre(price, item.volume)?.toFixed(2) || '-'}/L
                                                                </div>
                                                                <div className={cn("font-bold", (calcMargin(price, range.expBasePrice || null) || 0) < 0 ? "text-red-500" : "text-emerald-500")} title="Marge">
                                                                    {calcMargin(price, range.expBasePrice || null)?.toFixed(0)}%
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddPanel 
            accentColor={accentColor} 
            onClose={() => setShowQuickAdd(false)} 
            onAddItems={handleAddItems} 
        />
      )}

      {/* Email Modal */}
      <EmailModal 
        isOpen={showEmailModal} 
        onClose={() => setShowEmailModal(false)} 
        onSend={handleEmailPDF} 
        sending={isSendingEmail} 
        accentColor={accentColor} 
      />

    </div>
  );
}
