"use client";

import React, { useEffect, useRef, useState, Fragment } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { startRegistration } from "@simplewebauthn/browser";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// --- Helpers ---
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

function hexToRgbArray(hex: string): [number, number, number] | null {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

// --- Animated Number Component ---
function AnimatedPrice({ value, duration = 600 }: { value: number; duration?: number }) {
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  return <span>{displayValue.toFixed(2)}</span>;
}

// --- Toggle Component ---
function Toggle({
  enabled,
  onChange,
  label,
  accentColor
}: {
  enabled: boolean;
  onChange: (v: boolean) => void | Promise<void>;
  label: string;
  accentColor: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-white text-sm font-medium hidden md:inline-block">{label}</span>
      <div
        onClick={() => onChange(!enabled)}
        className={cn("relative w-12 h-6 rounded-full transition-colors", enabled ? "bg-white" : "bg-white/30")}
      >
        <div
          className={cn("absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm", enabled ? "left-7" : "left-1 bg-white")}
          style={{ backgroundColor: enabled ? accentColor : undefined }}
        />
      </div>
    </label>
  );
}

// --- Quick Add Search Component (Popup) ---
function QuickAddSearch({
  onAddItems,
  onClose,
  accentColor
}: {
  onAddItems: (itemIds: number[]) => void;
  onClose: () => void;
  accentColor: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);

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
      } else {
        setResults([]);
      }
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
    <div className="absolute top-20 right-4 z-[300] w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex gap-2">
        <input
          autoFocus
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 text-sm outline-none"
          placeholder="Rechercher article..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={onClose} className="px-2 text-neutral-400 hover:text-neutral-600">
          ✕
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {searching ? (
          <div className="p-4 text-center text-sm text-neutral-400">Recherche...</div>
        ) : results.length > 0 ? (
          results.map((item) => (
            <div
              key={item.itemId}
              onClick={() => toggleSelect(item.itemId)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800",
                selectedIds.has(item.itemId) && "bg-neutral-100 dark:bg-neutral-800"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  selectedIds.has(item.itemId) ? "bg-black border-black dark:bg-white dark:border-white" : "border-neutral-300"
                )}
              >
                {selectedIds.has(item.itemId) && <span className="text-[10px] text-white dark:text-black">✓</span>}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold truncate">{item.itemCode}</div>
                <div className="text-xs text-neutral-500 truncate">{item.description}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-neutral-400">{query.length > 1 ? "Aucun résultat" : "Tapez pour chercher"}</div>
        )}
      </div>

      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <button
          onClick={handleAdd}
          disabled={selectedIds.size === 0}
          className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: accentColor }}
        >
          Ajouter ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}

// --- MultiSelect Dropdown for Articles (RESTORED & WORKING) ---
function MultiSelectDropdown({
  items,
  selectedIds,
  onChange,
  disabled,
  placeholder = "Articles...",
  accentColor
}: {
  items: Item[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  disabled?: boolean;
  placeholder?: string;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter((i) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return i.itemCode.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
  });

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <div className={cn("relative flex-1 min-w-[180px]", isOpen && "z-[250]")} ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-3 bg-white/20 text-white rounded-lg font-medium text-sm border border-white/30 flex items-center justify-between cursor-pointer transition-all",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-white bg-white/30"
        )}
      >
        <span className="truncate">{selectedIds.size > 0 ? `${selectedIds.size} article(s) sélectionné(s)` : placeholder}</span>
        <span className="text-xs opacity-70 ml-2">▼</span>
      </div>

      {isOpen && (
        <div className="absolute top-12 left-0 w-full min-w-[320px] z-[300] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
            <input
              autoFocus
              className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 text-sm outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
              placeholder="Filtrer les articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.itemId}
                  onClick={() => toggleSelection(item.itemId)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors",
                    selectedIds.has(item.itemId) && "bg-neutral-100 dark:bg-neutral-800"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                      selectedIds.has(item.itemId) ? "border-transparent" : "border-neutral-300 dark:border-neutral-600"
                    )}
                    style={{ backgroundColor: selectedIds.has(item.itemId) ? accentColor : undefined }}
                  >
                    {selectedIds.has(item.itemId) && <span className="text-[10px] text-white font-bold">✓</span>}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">{item.itemCode}</div>
                    <div className="text-xs text-neutral-500 truncate">{item.description}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-neutral-400">{search ? "Aucun article trouvé" : "Aucun article disponible"}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Email Modal Component ---
function EmailModal({
  isOpen,
  onClose,
  onSend,
  sending,
  accentColor
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  sending: boolean;
  accentColor: string;
}) {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold mb-2 text-neutral-900 dark:text-white">Envoyer par Courriel</h3>
        <p className="text-sm text-neutral-500 mb-4">Entrez l'adresse courriel du destinataire.</p>

        <input
          type="email"
          autoFocus
          className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm mb-4 outline-none focus:border-black dark:focus:border-white transition-colors"
          placeholder="nom@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-white"
          >
            Annuler
          </button>
          <button
            onClick={() => onSend(email)}
            disabled={!email || sending}
            className="flex-1 h-10 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Price Modal Component ---
interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ItemPriceData[];

  priceLists: PriceList[];
  products: Product[];
  itemTypes: ItemType[];
  items: Item[];

  selectedPriceList: PriceList | null;
  selectedProduct: Product | null;
  selectedType: ItemType | null;
  selectedItemIds: Set<number>;

  onPriceListChange: (priceId: number) => void;
  onProductChange: (prodId: string) => void;
  onTypeChange: (typeId: string) => void;
  onItemsChange: (ids: Set<number>) => void;

  onAddItems: (itemIds: number[]) => void;
  onReset: () => void;
  onLoadSelection: () => void;

  loading: boolean;
  error: string | null;
  accentColor: string;
  accentMuted: string;
}

function PriceModal({
  isOpen,
  onClose,
  data,
  priceLists,
  products,
  itemTypes,
  items,
  selectedPriceList,
  selectedProduct,
  selectedType,
  selectedItemIds,
  onPriceListChange,
  onProductChange,
  onTypeChange,
  onItemsChange,
  onAddItems,
  onReset,
  onLoadSelection,
  loading,
  error,
  accentColor
}: PriceModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!isOpen) return null;

  const itemsWithPrices = data.filter((item) => item.ranges && item.ranges.length > 0);

  const groupedItems = itemsWithPrices.reduce((acc, item) => {
    const groupKey = item.className || "Articles Ajoutés";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, ItemPriceData[]>);

  const calcPricePerCaisse = (price: number, caisse: number | null) => (caisse ? price * caisse : null);
  const calcPricePerLitre = (price: number, volume: number | null) => (volume ? price / volume : null);

  const calcMargin = (sell: number | null, cost: number | null) => {
    if (sell === null || cost === null || sell === 0) return null;
    return ((sell - cost) / sell) * 100;
  };

  const handleToggleDetails = async (newValue: boolean) => {
    if (!newValue) {
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
        body: JSON.stringify(authResp)
      });

      const verification = await verifyResp.json();

      if (verification.verified) {
        setShowDetails(true);
      } else {
        alert("Vérification échouée.");
        setShowDetails(false);
      }
    } catch (err) {
      console.error("Auth error", err);
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

      const logoData = await getDataUri("/sinto-logo.svg");
      if (logoData) doc.addImage(logoData, "PNG", 15, 10, 40, 0);

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const title = "Liste de Prix SINTO";
      const titleWidth = doc.getTextWidth(title);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(title, (pageWidth - titleWidth) / 2, 25);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Liste: ${selectedPriceList?.code} - ${selectedPriceList?.name}`, 15, 45);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 50);

      const headRgb = hexToRgbArray(accentColor) ?? ([200, 50, 50] as [number, number, number]);

      let finalY = 55;

      for (const [className, classItems] of Object.entries(groupedItems)) {
        if (finalY > 270) {
          doc.addPage();
          finalY = 20;
        }

        // Group header (neutral banner)
        doc.setFillColor(220, 220, 220);
        doc.rect(14, finalY, 182, 8, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(className.toUpperCase(), 16, finalY + 6);
        finalY += 10;

        const firstItem = classItems[0];
        let priceColumns = firstItem.ranges[0]?.columns ? Object.keys(firstItem.ranges[0].columns).sort() : [selectedPriceList?.code || "Prix"];

        if (!showDetails && selectedPriceList?.code !== "01-EXP") {
          priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
        }

        const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
        const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS");

        const tableBody: (string | number)[][] = [];
        const spacerRowIndices: number[] = [];
        let rowIndex = 0;

        classItems.forEach((item, itemIdx) => {
          item.ranges.forEach((range, rIdx) => {
            const row: (string | number)[] = [];

            if (rIdx === 0) {
              row.push(item.itemCode);
              row.push(item.caisse ? Math.round(item.caisse).toString() : "-");
              row.push(item.format || "-");
            } else {
              row.push("");
              row.push("");
              row.push("");
            }

            row.push(range.qtyMin.toString());

            const selectedPriceCode = selectedPriceList?.code || "";
            const selectedPriceVal = range.columns?.[selectedPriceCode] ?? range.unitPrice;
            const pdsVal = range.columns?.["08-PDS"] ?? null;
            const percentMarge = calcMargin(pdsVal, selectedPriceVal);
            row.push(percentMarge !== null ? `${percentMarge.toFixed(1)}%` : "-");

            standardColumns.forEach((col) => {
              const val = range.columns?.[col] ?? null;
              row.push(val !== null ? val.toFixed(2) : "-");

              if (showDetails && col.trim() === selectedPriceList?.code?.trim()) {
                const ppc = calcPricePerCaisse(val || 0, item.caisse);
                const ppl = calcPricePerLitre(val || 0, item.volume);
                const expVal = range.columns?.["01-EXP"] ?? null;
                const pExp = calcMargin(val, expVal);

                row.push(ppc !== null ? ppc.toFixed(2) : "-");
                row.push(ppl !== null ? ppl.toFixed(2) : "-");
                row.push(pExp !== null ? `${pExp.toFixed(1)}%` : "-");
              }
            });

            if (hasPDS) {
              const p = range.columns?.["08-PDS"] ?? null;
              row.push(p !== null ? p.toFixed(2) : "-");
            }

            tableBody.push(row);
            rowIndex++;
          });

          // BLACK spacer row between articles
          if (itemIdx < classItems.length - 1) {
            const columnsCount = 5 + standardColumns.length + (hasPDS ? 1 : 0) + (showDetails ? 3 : 0);
            tableBody.push(new Array(columnsCount).fill(""));
            spacerRowIndices.push(rowIndex);
            rowIndex++;
          }
        });

        const headRow: string[] = ["Article", "Caisse", "Fmt", "Qty", "% Marge"];
        standardColumns.forEach((c) => {
          headRow.push(c);
          if (showDetails && c.trim() === selectedPriceList?.code?.trim()) {
            headRow.push("$/Caisse");
            headRow.push("$/L");
            headRow.push("% Exp");
          }
        });
        if (hasPDS) headRow.push("08-PDS");

        autoTable(doc, {
          startY: finalY,
          head: [headRow],
          body: tableBody,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: headRgb, textColor: 255 },
          columnStyles: {
            0: { fontStyle: "bold" },
            4: { textColor: [0, 150, 0] }
          },
          theme: "grid",
          didParseCell: function (hookData) {
            if (hookData.section === "body" && spacerRowIndices.includes(hookData.row.index)) {
              hookData.cell.styles.fillColor = [0, 0, 0];
              hookData.cell.styles.textColor = [0, 0, 0];
              hookData.cell.styles.minCellHeight = 4;
            }
          }
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("file", pdfBlob, "ListePrix.pdf");
      formData.append("to", recipientEmail);
      formData.append("subject", `Liste de prix SINTO : ${selectedPriceList?.name}`);

      const messageBody = `Liste de Prix SINTO\n\nBonjour,\n\nVeuillez trouver ci-joint la liste de prix que vous avez demandée.`;
      formData.append("message", messageBody);

      const res = await fetch("/api/catalogue/email", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erreur envoi");

      alert("Courriel envoyé avec succès!");
      setShowEmailModal(false);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      alert("Erreur: " + msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[98vw] max-h-[94vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER - SOLID COLOR, NO GRADIENT */}
        <div className="flex-shrink-0 px-4 md:px-6 py-4 flex flex-col gap-4" style={{ backgroundColor: accentColor }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-white">Liste de Prix</h2>
            <div className="flex items-center gap-3">
              {isAuthenticating && (
                <span className="text-white text-xs font-bold animate-pulse uppercase tracking-wider mr-2">Vérification FaceID...</span>
              )}
              <Toggle enabled={showDetails} onChange={handleToggleDetails} label="Détails" accentColor={accentColor} />

              <button
                onClick={() => setShowEmailModal(true)}
                className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Envoyer par courriel"
              >
                <span className="text-lg">✉️</span>
              </button>

              <button
                onClick={onReset}
                className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Réinitialiser"
              >
                <span className="text-xl font-bold">↺</span>
              </button>

              <button
                onClick={onClose}
                className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Row - SOLID */}
          <div className="flex flex-col md:flex-row gap-2 p-2 rounded-xl border border-white/20 items-center" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
            <select
              value={selectedPriceList?.priceId || ""}
              onChange={(e) => onPriceListChange(parseInt(e.target.value))}
              disabled={loading}
              className="h-10 px-3 bg-white/90 text-neutral-900 rounded-lg font-bold text-sm border-2 border-transparent focus:border-white outline-none flex-1 min-w-[200px]"
            >
              {priceLists.map((pl) => (
                <option key={pl.priceId} value={pl.priceId}>
                  {pl.code} - {pl.name}
                </option>
              ))}
            </select>

            <select
              value={selectedProduct?.prodId || ""}
              onChange={(e) => onProductChange(e.target.value)}
              className="h-10 px-3 bg-white/20 text-white rounded-lg font-medium text-sm border border-white/30 focus:border-white outline-none flex-1 min-w-[140px]"
            >
              <option value="" className="text-black">
                Catégorie...
              </option>
              {products.map((p) => (
                <option key={p.prodId} value={p.prodId} className="text-black">
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType?.itemTypeId || ""}
              onChange={(e) => onTypeChange(e.target.value)}
              disabled={!selectedProduct}
              className="h-10 px-3 bg-white/20 text-white rounded-lg font-medium text-sm border border-white/30 focus:border-white outline-none flex-1 min-w-[140px] disabled:opacity-50"
            >
              <option value="" className="text-black">
                Classe...
              </option>
              {itemTypes.map((t) => (
                <option key={t.itemTypeId} value={t.itemTypeId} className="text-black">
                  {t.description}
                </option>
              ))}
            </select>

            {/* MultiSelect: dropdown search MUST overlay everything */}
            <MultiSelectDropdown
              items={items}
              selectedIds={selectedItemIds}
              onChange={onItemsChange}
              disabled={!selectedType && !selectedProduct}
              accentColor={accentColor}
              placeholder="Articles..."
            />

            <div className="flex gap-2 ml-2">
              <button
                onClick={onLoadSelection}
                disabled={loading || (!selectedProduct && selectedItemIds.size === 0)}
                className="h-10 px-4 rounded-lg bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm"
              >
                + Ajouter {selectedItemIds.size > 0 ? `(${selectedItemIds.size})` : ""}
              </button>

              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition-colors"
                title="Recherche Rapide Globale"
              >
                🔍
              </button>
            </div>
          </div>

          {showQuickAdd && <QuickAddSearch accentColor={accentColor} onClose={() => setShowQuickAdd(false)} onAddItems={onAddItems} />}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-3 md:p-5 bg-neutral-100 dark:bg-neutral-950">
          {loading && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div
                className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: accentColor, borderTopColor: "transparent" }}
              />
              <p className="text-neutral-500 font-medium">Chargement des prix...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl" style={{ color: `${accentColor}50` }}>
                !
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: accentColor }}>
                  Erreur
                </p>
                <p className="text-neutral-500 mt-1">{error}</p>
              </div>
            </div>
          ) : Object.keys(groupedItems).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedItems).map(([className, classItems]) => {
                const firstItem = classItems[0];
                let priceColumns = firstItem.ranges[0]?.columns ? Object.keys(firstItem.ranges[0].columns).sort() : [selectedPriceList?.code || "Prix"];

                if (!showDetails && selectedPriceList?.code !== "01-EXP") {
                  priceColumns = priceColumns.filter((c) => c.trim() !== "01-EXP");
                }

                const standardColumns = priceColumns.filter((c) => c.trim() !== "08-PDS");
                const hasPDS = priceColumns.some((c) => c.trim() === "08-PDS");

                return (
                  <div key={className} className="bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800">
                    {/* Class Header - SOLID COLOR */}
                    <div className="px-4 py-3" style={{ backgroundColor: accentColor }}>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">{className}</h3>
                      <p className="text-white/80 text-xs mt-0.5">{classItems.length} article(s) dans cette classe</p>
                    </div>

                    {/* Table with BLACK GRID BORDERS */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full w-full text-sm md:text-base border-collapse">
                        <thead>
                          <tr className="bg-neutral-200 dark:bg-neutral-800">
                            <th className="text-left p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-black dark:border-neutral-600 sticky left-0 z-10 bg-neutral-200 dark:bg-neutral-800 min-w-[200px]">
                              Article
                            </th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-black dark:border-neutral-600 w-24 min-w-[90px]">
                              CAISSE
                            </th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-black dark:border-neutral-600 w-24 min-w-[90px]">
                              Format
                            </th>
                            <th className="text-center p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-black dark:border-neutral-600 w-20 min-w-[80px]">
                              Qty
                            </th>
                            <th className="text-right p-3 font-bold text-green-700 dark:text-green-400 border border-black dark:border-neutral-600 bg-green-50 dark:bg-green-900/20 min-w-[90px]">
                              % Marge
                            </th>

                            {standardColumns.map((colCode) => {
                              const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();
                              return (
                                <Fragment key={colCode}>
                                  <th
                                    className={cn(
                                      "text-right p-3 font-bold border border-black dark:border-neutral-600 whitespace-nowrap min-w-[120px]",
                                      isSelectedList
                                        ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                                        : "text-neutral-700 dark:text-neutral-300"
                                    )}
                                  >
                                    {colCode}
                                  </th>
                                  {showDetails && isSelectedList && (
                                    <>
                                      <th className="text-right p-3 font-bold text-sky-700 dark:text-sky-400 border border-black dark:border-neutral-600 bg-sky-50 dark:bg-sky-900/20 min-w-[110px]">
                                        $/Caisse
                                      </th>
                                      <th className="text-right p-3 font-bold text-sky-700 dark:text-sky-400 border border-black dark:border-neutral-600 bg-sky-50 dark:bg-sky-900/20 min-w-[110px]">
                                        $/L
                                      </th>
                                      <th className="text-right p-3 font-bold text-purple-700 dark:text-purple-400 border border-black dark:border-neutral-600 bg-purple-50 dark:bg-purple-900/20 min-w-[90px]">
                                        % Exp
                                      </th>
                                    </>
                                  )}
                                </Fragment>
                              );
                            })}

                            {hasPDS && (
                              <th className="text-right p-3 font-bold text-neutral-700 dark:text-neutral-300 border border-black dark:border-neutral-600 whitespace-nowrap min-w-[120px]">
                                08-PDS
                              </th>
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {classItems.map((item, itemIndex) => (
                            <Fragment key={item.itemId}>
                              {item.ranges.map((range, rIdx) => {
                                const isFirstRowOfItem = rIdx === 0;
                                const selectedPriceCode = selectedPriceList?.code || "";
                                const selectedPriceVal = range.columns?.[selectedPriceCode] ?? range.unitPrice;
                                const expBaseVal = range.columns?.["01-EXP"] ?? null;
                                const pdsVal = range.columns?.["08-PDS"] ?? null;

                                const percentExp = calcMargin(selectedPriceVal, expBaseVal);
                                const percentMarge = calcMargin(pdsVal, selectedPriceVal);

                                const ppc = calcPricePerCaisse(range.unitPrice, item.caisse);
                                const ppl = calcPricePerLitre(range.unitPrice, item.volume);

                                const rowBg = itemIndex % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/50 dark:bg-neutral-800/30";

                                return (
                                  <tr key={range.id} className={cn("transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-900/10", rowBg)}>
                                    <td className={cn("p-3 border border-black dark:border-neutral-600 align-top sticky left-0 z-10", rowBg)}>
                                      {isFirstRowOfItem && (
                                        <div className="flex flex-col">
                                          <span className="font-mono font-black text-neutral-900 dark:text-white whitespace-nowrap" style={{ color: accentColor }}>
                                            {item.itemCode}
                                          </span>
                                          <span className="text-xs text-neutral-500 truncate max-w-[180px]" title={item.description}>
                                            {item.description}
                                          </span>
                                        </div>
                                      )}
                                    </td>

                                    <td className="p-3 text-center border border-black dark:border-neutral-600 align-top">
                                      {isFirstRowOfItem && <span className="font-black text-neutral-900 dark:text-white">{item.caisse ? Math.round(item.caisse) : "-"}</span>}
                                    </td>

                                    <td className="p-3 text-center border border-black dark:border-neutral-600 align-top">
                                      {isFirstRowOfItem && <span className="font-black text-neutral-900 dark:text-white">{item.format || "-"}</span>}
                                    </td>

                                    <td className="p-3 text-center border border-black dark:border-neutral-600">
                                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{range.qtyMin}</span>
                                    </td>

                                    <td className="p-3 text-right border border-black dark:border-neutral-600 bg-green-50 dark:bg-green-900/10">
                                      <span
                                        className={cn(
                                          "font-mono font-bold whitespace-nowrap",
                                          percentMarge !== null && percentMarge < 0 ? "text-red-600" : "text-green-700 dark:text-green-400"
                                        )}
                                      >
                                        {percentMarge !== null ? `${percentMarge.toFixed(1)}%` : "-"}
                                      </span>
                                    </td>

                                    {standardColumns.map((colCode) => {
                                      const priceVal = range.columns ? range.columns[colCode] : colCode === selectedPriceList?.code ? range.unitPrice : null;
                                      const isSelectedList = colCode.trim() === selectedPriceList?.code?.trim();

                                      return (
                                        <Fragment key={colCode}>
                                          <td className={cn("p-3 text-right border border-black dark:border-neutral-600", isSelectedList && "bg-amber-50 dark:bg-amber-900/10")}>
                                            <span className={cn("font-mono font-black whitespace-nowrap", isSelectedList ? "text-amber-700 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-300")}>
                                              {priceVal !== null && priceVal !== undefined ? <AnimatedPrice value={priceVal} /> : "-"}
                                            </span>
                                          </td>

                                          {showDetails && isSelectedList && (
                                            <>
                                              <td className="p-3 text-right border border-black dark:border-neutral-600 bg-sky-50/50 dark:bg-sky-900/10">
                                                <span className="font-mono text-sky-700 dark:text-sky-400 whitespace-nowrap">{ppc !== null ? ppc.toFixed(2) : "-"}</span>
                                              </td>
                                              <td className="p-3 text-right border border-black dark:border-neutral-600 bg-sky-50/50 dark:bg-sky-900/10">
                                                <span className="font-mono text-sky-700 dark:text-sky-400 whitespace-nowrap">{ppl !== null ? ppl.toFixed(2) : "-"}</span>
                                              </td>
                                              <td className="p-3 text-right border border-black dark:border-neutral-600 bg-purple-50/50 dark:bg-purple-900/10">
                                                <span
                                                  className={cn(
                                                    "font-mono font-bold whitespace-nowrap",
                                                    percentExp !== null && percentExp < 0 ? "text-red-600" : "text-purple-700 dark:text-purple-400"
                                                  )}
                                                >
                                                  {percentExp !== null ? `${percentExp.toFixed(1)}%` : "-"}
                                                </span>
                                              </td>
                                            </>
                                          )}
                                        </Fragment>
                                      );
                                    })}

                                    {hasPDS && (
                                      <td className="p-3 text-right border border-black dark:border-neutral-600">
                                        <span className="font-mono font-black text-neutral-900 dark:text-neutral-300 whitespace-nowrap">
                                          {range.columns?.["08-PDS"] !== null && range.columns?.["08-PDS"] !== undefined ? (
                                            <AnimatedPrice value={range.columns["08-PDS"] as number} />
                                          ) : (
                                            "-"
                                          )}
                                        </span>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}

                              {/* BLACK Spacer Row Between Articles */}
                              {itemIndex < classItems.length - 1 && (
                                <tr className="h-3 bg-black">
                                  <td colSpan={100} className="border-0 bg-black" />
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-6xl text-neutral-300">∅</div>
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-600 dark:text-neutral-400">Aucun prix trouvé</p>
                <p className="text-neutral-500 mt-1">Sélectionnez des articles et cliquez sur Ajouter.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && itemsWithPrices.length > 0 && (
          <div className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-800 px-4 py-3 flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
              {itemsWithPrices.length} article(s) {showDetails && " • Détails activés"}
            </span>
            <span className="text-neutral-500 text-sm">
              Liste: {selectedPriceList?.code} - {selectedPriceList?.name}
            </span>
          </div>
        )}
      </div>

      <EmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSend={handleEmailPDF} sending={isSendingEmail} accentColor={accentColor} />
    </div>
  );
}

// --- Main Page Component ---
export default function CataloguePage() {
  const { color: accentColor, muted: accentMuted } = useCurrentAccent();

  const [products, setProducts] = useState<Product[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceData, setPriceData] = useState<ItemPriceData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [prodRes, plRes] = await Promise.all([fetch("/api/catalogue/products"), fetch("/api/catalogue/pricelists")]);

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
    }
    init();
  }, []);

  // --- MAIN SEARCH BAR MUST BE ON TOP (VISIBLE) ---
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

  const handleLoadSelection = async () => {
    if (!selectedPriceList) return;

    if (selectedItemIds.size > 0) {
      await handleAddItems(Array.from(selectedItemIds));
      return;
    }

    setLoadingPrices(true);
    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}`;
      if (selectedProduct) url += `&prodId=${selectedProduct.prodId}`;
      if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch");
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

  const handlePriceListChange = (priceId: string) => {
    const pl = priceLists.find((p) => p.priceId === parseInt(priceId));
    if (pl) setSelectedPriceList(pl);
  };

  const handleProductChange = async (prodId: string) => {
    const prod = products.find((p) => p.prodId === parseInt(prodId));
    if (!prod) return;

    setSelectedProduct(prod);
    setSelectedType(null);
    setSelectedItem(null);
    setSelectedItemIds(new Set());
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
    if (!typeId) {
      setSelectedType(null);
      setSelectedItem(null);
      setSelectedItemIds(new Set());
      setItems([]);
      return;
    }

    const type = itemTypes.find((t) => t.itemTypeId === parseInt(typeId));
    if (!type) return;

    setSelectedType(type);
    setSelectedItem(null);
    setSelectedItemIds(new Set());
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
    const item = items.find((i) => i.itemId === parseInt(itemId));
    if (item) setSelectedItem(item);
  };

  const handleSearchResultClick = async (item: Item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedItem(item);

    const prod = products.find((p) => p.prodId === item.prodId);
    if (!prod) return;

    setSelectedProduct(prod);

    setLoadingTypes(true);
    try {
      const typesRes = await fetch(`/api/catalogue/itemtypes?prodId=${item.prodId}`);
      if (typesRes.ok) {
        const types: ItemType[] = await typesRes.json();
        setItemTypes(types);

        const type = types.find((t) => t.itemTypeId === item.itemTypeId);
        if (type) {
          setSelectedType(type);

          setLoadingItems(true);
          try {
            const itemsRes = await fetch(`/api/catalogue/items?itemTypeId=${type.itemTypeId}`);
            if (itemsRes.ok) setItems(await itemsRes.json());
          } finally {
            setLoadingItems(false);
          }
        }
      }
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPriceList || !selectedProduct) return;

    setPriceData([]);
    setPriceError(null);
    setShowPriceModal(true);

    setLoadingPrices(true);
    try {
      let url = `/api/catalogue/prices?priceId=${selectedPriceList.priceId}&prodId=${selectedProduct.prodId}`;
      if (selectedType) url += `&typeId=${selectedType.itemTypeId}`;
      if (selectedItem) url += `&itemId=${selectedItem.itemId}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur fetch");

      setPriceData(await res.json());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setPriceError(msg);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleModalPriceListChange = async (priceId: number) => {
    const pl = priceLists.find((p) => p.priceId === priceId);
    if (!pl) return;

    setSelectedPriceList(pl);

    if (priceData.length === 0) return;

    setLoadingPrices(true);
    const allIds = Array.from(new Set(priceData.map((i) => i.itemId))).join(",");
    try {
      const url = `/api/catalogue/prices?priceId=${priceId}&itemIds=${allIds}`;
      const res = await fetch(url);
      if (res.ok) setPriceData(await res.json());
    } finally {
      setLoadingPrices(false);
    }
  };

  const canGenerate = Boolean(selectedPriceList && selectedProduct);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 p-4 md:p-6 flex flex-col justify-center items-center">
          <div className="w-full max-w-3xl">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg p-5 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <Image src="/sinto-logo.svg" alt="SINTO Logo" width={64} height={64} className="h-16 w-16 object-contain" />
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Catalogue SINTO</h1>
                  <p className="text-sm text-neutral-500">Générateur de liste de prix</p>
                </div>
              </div>

              {/* ARTICLE SEARCH BAR (ON TOP, VISIBLE) */}
              <div className="mb-8 relative z-[120]">
                <input
                  type="search"
                  placeholder="Recherche rapide par code article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 px-5 rounded-xl text-base font-medium bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent focus:ring-0 focus:outline-none transition-colors"
                  style={{ borderColor: searchQuery ? accentColor : "transparent" }}
                />

                {searchQuery.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-72 overflow-y-auto z-[200]">
                    {isSearching ? (
                      <div className="p-6 flex justify-center">
                        <div className="w-6 h-6 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: "transparent" }} />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={item.itemId}
                          onClick={() => handleSearchResultClick(item)}
                          className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-sm" style={{ color: accentColor }}>
                              {item.itemCode}
                            </span>
                            <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{item.description}</span>
                          </div>
                          <div className="text-xs text-neutral-400 mt-1">
                            {item.categoryName} → {item.className}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-neutral-500">Aucun résultat</div>
                    )}
                  </div>
                )}
              </div>

              {/* Main Form Fields */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">1. Liste de Prix</label>
                  <select
                    value={selectedPriceList?.priceId || ""}
                    onChange={(e) => handlePriceListChange(e.target.value)}
                    className="w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-colors"
                    style={{ borderColor: selectedPriceList ? accentColor : undefined }}
                  >
                    <option value="" disabled>
                      Sélectionner...
                    </option>
                    {priceLists.map((pl) => (
                      <option key={pl.priceId} value={pl.priceId}>
                        {pl.code} - {pl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">2. Catégorie</label>
                  <select
                    value={selectedProduct?.prodId || ""}
                    onChange={(e) => handleProductChange(e.target.value)}
                    disabled={!selectedPriceList}
                    className={cn(
                      "w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all",
                      !selectedPriceList && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <option value="" disabled>
                      Sélectionner...
                    </option>
                    {products.map((p) => (
                      <option key={p.prodId} value={p.prodId}>
                        {p.name} ({p.itemCount})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    3. Classe <span className="text-neutral-400 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <select
                    value={selectedType?.itemTypeId || ""}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={!selectedProduct || loadingTypes}
                    className={cn(
                      "w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all",
                      (!selectedProduct || loadingTypes) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <option value="">{loadingTypes ? "Chargement..." : "Toutes les classes"}</option>
                    {itemTypes.map((t) => (
                      <option key={t.itemTypeId} value={t.itemTypeId}>
                        {t.description} ({t.itemCount})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                    4. Article <span className="text-neutral-400 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <select
                    value={selectedItem?.itemId || ""}
                    onChange={(e) => handleItemChange(e.target.value)}
                    disabled={!selectedType || loadingItems}
                    className={cn(
                      "w-full h-14 px-4 text-base font-semibold bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-0 focus:outline-none transition-all",
                      (!selectedType || loadingItems) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <option value="">{loadingItems ? "Chargement..." : "Tous les articles"}</option>
                    {items.map((i) => (
                      <option key={i.itemId} value={i.itemId}>
                        {i.itemCode} - {i.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={cn(
                      "w-full h-16 rounded-xl font-black text-lg uppercase tracking-wide transition-all shadow-lg",
                      !canGenerate && "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none"
                    )}
                    style={canGenerate ? { backgroundColor: accentColor, color: "#ffffff", boxShadow: `0 10px 15px -3px ${accentColor}40` } : {}}
                  >
                    GÉNÉRER LA LISTE
                  </button>
                </div>
              </div>
            </div>

            {selectedItem && (
              <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}>
                <div className="font-bold" style={{ color: accentColor }}>
                  {selectedItem.itemCode}
                </div>
                <div className="text-sm opacity-80" style={{ color: accentColor }}>
                  {selectedItem.description}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <PriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        data={priceData}
        priceLists={priceLists}
        products={products}
        itemTypes={itemTypes}
        items={items}
        selectedPriceList={selectedPriceList}
        selectedProduct={selectedProduct}
        selectedType={selectedType}
        selectedItemIds={selectedItemIds}
        onPriceListChange={handleModalPriceListChange}
        onProductChange={handleProductChange}
        onTypeChange={handleTypeChange}
        onItemsChange={setSelectedItemIds}
        onAddItems={handleAddItems}
        onReset={() => setPriceData([])}
        onLoadSelection={handleLoadSelection}
        loading={loadingPrices}
        error={priceError}
        accentColor={accentColor}
        accentMuted={accentMuted}
      />
    </div>
  );
}
