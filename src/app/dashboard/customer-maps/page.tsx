// src/app/dashboard/customer-maps/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import {
  MapPin,
  Filter,
  Users,
  DollarSign,
  Package,
  Calendar,
  RotateCcw,
  Loader2,
  ChevronDown,
  Lock,
  Search,
  X,
  TrendingUp,
  Building2,
} from "lucide-react";
import { THEME, ThemeTokens } from "@/lib/theme-tokens";
import { useCurrentAccent } from "@/components/accent-color-provider";

/* ═══════════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════════ */
type CustomerMapData = {
  customerId: string;
  customerName: string;
  address: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  phone: string;
  salesRepName: string;
  totalSales: number;
  transactionCount: number;
  firstInvoice: string;
  lastInvoice: string;
  productsPurchased: string;
  pinColor: string;
  pinSize: string;
};

type FilterOptions = {
  salesReps: string[];
  products: { code: string; description: string }[];
};

type Filters = {
  salesRep: string;
  product: string;
  minSales: number;
  startDate: string;
  endDate: string;
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════════ */
const ALLOWED_ROLES = [
  "ventes-exec",
  "ventes_exec",
  "gestionnaire",
  "expert",
  "admin",
  "facturation",
];

const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

// Quebec center as default
const DEFAULT_CENTER = {
  lat: 46.8139,
  lng: -71.2082,
};

const PIN_COLORS: Record<string, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

const PIN_SIZES: Record<string, number> = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Formatters
   ═══════════════════════════════════════════════════════════════════════════════ */
const currency = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-CA").format(Math.round(n));

/* ═══════════════════════════════════════════════════════════════════════════════
   Helper: Check if user is authorized
   ═══════════════════════════════════════════════════════════════════════════════ */
function isUserAuthorized(
  role: string | undefined | null,
  email: string | undefined | null
): boolean {
  if (email && BYPASS_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  if (role && ALLOWED_ROLES.includes(role.toLowerCase().trim())) {
    return true;
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Access Denied Component
   ═══════════════════════════════════════════════════════════════════════════════ */
const AccessDenied = ({ role, email }: { role: string | undefined; email: string | undefined | null }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-10 max-w-lg text-center animate-scale-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center surface-inset">
        <Lock className="w-10 h-10 text-[hsl(var(--danger))]" />
      </div>
      <h3 className="text-headline mb-3">Accès restreint</h3>
      <p className="text-caption leading-relaxed mb-4">
        Vous ne disposez pas des autorisations nécessaires pour consulter cette carte.
        Veuillez contacter votre département TI pour obtenir l&apos;accès approprié.
      </p>
      <div className="bg-[hsl(var(--bg-muted))] p-4 rounded-lg text-left text-xs font-mono text-[hsl(var(--text-secondary))]">
        <p>DEBUG INFO:</p>
        <p>Email: {email || "Not Found"}</p>
        <p>Role Detected: {role || "Undefined/Null"}</p>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════════════════════════════════════ */
const MapSkeleton = ({ accentColor }: { accentColor: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin" style={{ color: accentColor }} />
      <span className="text-sm text-[hsl(var(--text-muted))]">
        Chargement de la carte...
      </span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Filter Panel Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function FilterPanel({
  filters,
  stagedFilters,
  setStagedFilters,
  filterOptions,
  onApply,
  onReset,
  isLoading,
  totalCustomers,
  t,
}: {
  filters: Filters;
  stagedFilters: Filters;
  setStagedFilters: React.Dispatch<React.SetStateAction<Filters>>;
  filterOptions: FilterOptions | null;
  onApply: () => void;
  onReset: () => void;
  isLoading: boolean;
  totalCustomers: number;
  t: ThemeTokens;
}) {
  const hasChanges = JSON.stringify(filters) !== JSON.stringify(stagedFilters);

  return (
    <div
      className="rounded-xl p-5 space-y-5"
      style={{
        background: t.surface1,
        border: `1px solid ${t.borderSubtle}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" style={{ color: t.accent }} />
          <h2 className="font-semibold" style={{ color: t.textPrimary }}>
            Filtres
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: t.accent }} />
          ) : (
            <span
              className="text-sm px-2 py-1 rounded-md"
              style={{ background: t.surface2, color: t.textSecondary }}
            >
              {formatNumber(totalCustomers)} clients
            </span>
          )}
        </div>
      </div>

      {/* Sales Rep Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: t.textSecondary }}>
          <Users className="h-4 w-4 inline mr-2" />
          Expert (Représentant)
        </label>
        <select
          value={stagedFilters.salesRep}
          onChange={(e) =>
            setStagedFilters((prev) => ({ ...prev, salesRep: e.target.value }))
          }
          className="w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            background: t.surface2,
            border: `1px solid ${t.borderSubtle}`,
            color: t.textPrimary,
          }}
        >
          <option value="">Tous les experts</option>
          {filterOptions?.salesReps.map((rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ))}
        </select>
      </div>

      {/* Product Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: t.textSecondary }}>
          <Package className="h-4 w-4 inline mr-2" />
          Produit
        </label>
        <select
          value={stagedFilters.product}
          onChange={(e) =>
            setStagedFilters((prev) => ({ ...prev, product: e.target.value }))
          }
          className="w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            background: t.surface2,
            border: `1px solid ${t.borderSubtle}`,
            color: t.textPrimary,
          }}
        >
          <option value="">Tous les produits</option>
          {filterOptions?.products.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} - {p.description}
            </option>
          ))}
        </select>
      </div>

      {/* Minimum Sales Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: t.textSecondary }}>
          <DollarSign className="h-4 w-4 inline mr-2" />
          Ventes minimum: {currency(stagedFilters.minSales)}
        </label>
        <input
          type="range"
          min={0}
          max={10000}
          step={100}
          value={stagedFilters.minSales}
          onChange={(e) =>
            setStagedFilters((prev) => ({
              ...prev,
              minSales: Number(e.target.value),
            }))
          }
          className="w-full accent-current"
          style={{ accentColor: t.accent }}
        />
        <div
          className="flex justify-between text-xs"
          style={{ color: t.textTertiary }}
        >
          <span>$0</span>
          <span>$10,000+</span>
        </div>
        {/* Quick presets */}
        <div className="flex flex-wrap gap-1 mt-2">
          {[0, 300, 500, 1000, 2500, 5000].map((amount) => (
            <button
              key={amount}
              onClick={() =>
                setStagedFilters((prev) => ({ ...prev, minSales: amount }))
              }
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background:
                  stagedFilters.minSales === amount ? t.accent : t.surface2,
                color:
                  stagedFilters.minSales === amount ? t.void : t.textTertiary,
              }}
            >
              {amount === 0 ? "Tous" : `$${amount}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: t.textSecondary }}>
          <Calendar className="h-4 w-4 inline mr-2" />
          Période
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={stagedFilters.startDate}
            onChange={(e) =>
              setStagedFilters((prev) => ({ ...prev, startDate: e.target.value }))
            }
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: t.surface2,
              border: `1px solid ${t.borderSubtle}`,
              color: t.textPrimary,
            }}
          />
          <span style={{ color: t.textTertiary }}>à</span>
          <input
            type="date"
            value={stagedFilters.endDate}
            onChange={(e) =>
              setStagedFilters((prev) => ({ ...prev, endDate: e.target.value }))
            }
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: t.surface2,
              border: `1px solid ${t.borderSubtle}`,
              color: t.textPrimary,
            }}
          />
        </div>
        {/* Quick date presets */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => {
              const today = new Date();
              const yearStart = new Date(today.getFullYear(), 0, 1);
              setStagedFilters((prev) => ({
                ...prev,
                startDate: yearStart.toISOString().slice(0, 10),
                endDate: today.toISOString().slice(0, 10),
              }));
            }}
            className="px-2 py-1 rounded text-xs font-medium transition-all"
            style={{ background: t.surface2, color: t.textTertiary }}
          >
            YTD
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const yearAgo = new Date(today);
              yearAgo.setFullYear(yearAgo.getFullYear() - 1);
              setStagedFilters((prev) => ({
                ...prev,
                startDate: yearAgo.toISOString().slice(0, 10),
                endDate: today.toISOString().slice(0, 10),
              }));
            }}
            className="px-2 py-1 rounded text-xs font-medium transition-all"
            style={{ background: t.surface2, color: t.textTertiary }}
          >
            12 mois
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const sixMonths = new Date(today);
              sixMonths.setMonth(sixMonths.getMonth() - 6);
              setStagedFilters((prev) => ({
                ...prev,
                startDate: sixMonths.toISOString().slice(0, 10),
                endDate: today.toISOString().slice(0, 10),
              }));
            }}
            className="px-2 py-1 rounded text-xs font-medium transition-all"
            style={{ background: t.surface2, color: t.textTertiary }}
          >
            6 mois
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onApply}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
          style={{
            background: t.accent,
            color: t.void,
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            "Appliquer"
          )}
        </button>
        <button
          onClick={onReset}
          className="p-2.5 rounded-lg transition-all"
          style={{
            background: t.surface2,
            color: t.textTertiary,
          }}
          title="Réinitialiser"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div
        className="pt-4 mt-4 space-y-2"
        style={{ borderTop: `1px solid ${t.borderSubtle}` }}
      >
        <h4 className="text-xs font-semibold" style={{ color: t.textSecondary }}>
          Légende (par ventes)
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: PIN_COLORS.green }}
            />
            <span style={{ color: t.textTertiary }}>$10,000+</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: PIN_COLORS.blue }}
            />
            <span style={{ color: t.textTertiary }}>$5,000+</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: PIN_COLORS.yellow }}
            />
            <span style={{ color: t.textTertiary }}>$2,000+</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: PIN_COLORS.orange }}
            />
            <span style={{ color: t.textTertiary }}>$500+</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: PIN_COLORS.red }}
            />
            <span style={{ color: t.textTertiary }}>&lt;$500</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Customer Info Window Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function CustomerInfoWindow({
  customer,
  t,
}: {
  customer: CustomerMapData;
  t: ThemeTokens;
}) {
  return (
    <div className="p-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: `${t.accent}15` }}
        >
          <Building2 className="h-5 w-5" style={{ color: t.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm leading-tight truncate"
            style={{ color: t.textPrimary }}
          >
            {customer.customerName}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: t.textTertiary }}>
            {customer.address}
          </p>
          <p className="text-xs" style={{ color: t.textTertiary }}>
            {customer.city}, {customer.postalCode}
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-3 py-3"
        style={{ borderTop: `1px solid ${t.borderSubtle}` }}
      >
        <div>
          <p className="text-xs" style={{ color: t.textTertiary }}>
            Ventes totales
          </p>
          <p
            className="font-semibold font-mono text-sm"
            style={{ color: t.accent }}
          >
            {currency(customer.totalSales)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: t.textTertiary }}>
            Transactions
          </p>
          <p
            className="font-semibold font-mono text-sm"
            style={{ color: t.textPrimary }}
          >
            {customer.transactionCount}
          </p>
        </div>
      </div>

      <div
        className="py-3 space-y-2"
        style={{ borderTop: `1px solid ${t.borderSubtle}` }}
      >
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" style={{ color: t.textTertiary }} />
          <span className="text-xs" style={{ color: t.textSecondary }}>
            {customer.salesRepName}
          </span>
        </div>
        {customer.phone && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: t.textTertiary }}>
              📞
            </span>
            <span className="text-xs" style={{ color: t.textSecondary }}>
              {customer.phone}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" style={{ color: t.textTertiary }} />
          <span className="text-xs" style={{ color: t.textTertiary }}>
            Dernière facture: {customer.lastInvoice?.slice(0, 10) || "N/A"}
          </span>
        </div>
      </div>

      {customer.productsPurchased && (
        <div
          className="pt-3"
          style={{ borderTop: `1px solid ${t.borderSubtle}` }}
        >
          <p className="text-xs mb-1" style={{ color: t.textTertiary }}>
            Produits achetés:
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: t.textSecondary }}
          >
            {customer.productsPurchased.length > 100
              ? customer.productsPurchased.slice(0, 100) + "..."
              : customer.productsPurchased}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Map Content Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function CustomerMapContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { color: accentColor, muted: accentMuted } = useCurrentAccent();
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";

  const t = useMemo(
    () => ({
      ...THEME[mode],
      accent: accentColor,
      accentMuted: accentMuted || (mode === "dark" ? "#1A2A3D" : "#DBEAFE"),
    }),
    [mode, accentColor, accentMuted]
  );

  // Google Maps loader
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Default date range (last 12 months)
  const defaultFilters = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return {
      salesRep: "",
      product: "",
      minSales: 300,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, []);

  // State
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [stagedFilters, setStagedFilters] = useState<Filters>(defaultFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [customers, setCustomers] = useState<CustomerMapData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch("/api/customers/map/filters");
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(data);
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch customers based on filters
  const fetchCustomers = useCallback(async (currentFilters: Filters) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (currentFilters.salesRep) params.set("salesRep", currentFilters.salesRep);
      if (currentFilters.product) params.set("product", currentFilters.product);
      params.set("minSales", String(currentFilters.minSales));
      params.set("startDate", currentFilters.startDate);
      params.set("endDate", currentFilters.endDate);

      const res = await fetch(`/api/customers/map?${params.toString()}`);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setCustomers(data.customers || []);

      // Fit bounds to show all markers
      if (data.customers?.length > 0 && mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        data.customers.forEach((c: CustomerMapData) => {
          if (c.lat && c.lng) {
            bounds.extend({ lat: c.lat, lng: c.lng });
          }
        });
        mapRef.current.fitBounds(bounds, 50);
      }
    } catch (err: any) {
      setError(err.message);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCustomers(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply filters
  const handleApplyFilters = () => {
    setFilters(stagedFilters);
    fetchCustomers(stagedFilters);
    setSelectedCustomer(null);
  };

  // Reset filters
  const handleResetFilters = () => {
    setStagedFilters(defaultFilters);
    setFilters(defaultFilters);
    fetchCustomers(defaultFilters);
    setSelectedCustomer(null);
  };

  // Create marker icon
  const createMarkerIcon = useCallback(
    (customer: CustomerMapData) => {
      const color = PIN_COLORS[customer.pinColor] || PIN_COLORS.red;
      const size = PIN_SIZES[customer.pinSize] || PIN_SIZES.sm;

      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: "#fff",
        strokeWeight: 2,
        scale: size,
      };
    },
    []
  );

  // Map styles for dark mode
  const mapStyles = useMemo(() => {
    if (mode === "dark") {
      return [
        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
        {
          featureType: "administrative.country",
          elementType: "geometry.stroke",
          stylers: [{ color: "#4b6878" }],
        },
        {
          featureType: "administrative.land_parcel",
          elementType: "labels.text.fill",
          stylers: [{ color: "#64779e" }],
        },
        {
          featureType: "administrative.province",
          elementType: "geometry.stroke",
          stylers: [{ color: "#4b6878" }],
        },
        {
          featureType: "landscape.man_made",
          elementType: "geometry.stroke",
          stylers: [{ color: "#334e87" }],
        },
        {
          featureType: "landscape.natural",
          elementType: "geometry",
          stylers: [{ color: "#023e58" }],
        },
        {
          featureType: "poi",
          elementType: "geometry",
          stylers: [{ color: "#283d6a" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6f9ba5" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry.fill",
          stylers: [{ color: "#023e58" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#304a7d" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#98a5be" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#2c6675" }],
        },
        {
          featureType: "transit",
          elementType: "labels.text.fill",
          stylers: [{ color: "#98a5be" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#0e1626" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#4e6d70" }],
        },
      ];
    }
    return [];
  }, [mode]);

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Filter Panel - Left Side */}
      <div className="w-80 flex-shrink-0 p-4 overflow-y-auto">
        <FilterPanel
          filters={filters}
          stagedFilters={stagedFilters}
          setStagedFilters={setStagedFilters}
          filterOptions={filterOptions}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          isLoading={isLoading}
          totalCustomers={customers.length}
          t={t}
        />
      </div>

      {/* Map Container - Right Side */}
      <div className="flex-1 relative">
        {!mapsLoaded ? (
          <MapSkeleton accentColor={t.accent} />
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={DEFAULT_CENTER}
            zoom={7}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            options={{
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
              styles: mapStyles,
            }}
          >
            {/* Customer Markers */}
            {customers.map((customer) => (
              <MarkerF
                key={customer.customerId}
                position={{ lat: customer.lat, lng: customer.lng }}
                icon={createMarkerIcon(customer)}
                onClick={() => setSelectedCustomer(customer)}
                title={customer.customerName}
              />
            ))}

            {/* Info Window */}
            {selectedCustomer && (
              <InfoWindowF
                position={{ lat: selectedCustomer.lat, lng: selectedCustomer.lng }}
                onCloseClick={() => setSelectedCustomer(null)}
              >
                <CustomerInfoWindow customer={selectedCustomer} t={t} />
              </InfoWindowF>
            )}
          </GoogleMap>
        )}

        {/* Loading Overlay */}
        {isLoading && mapsLoaded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            <div
              className="flex items-center gap-3 px-6 py-4 rounded-xl"
              style={{ background: t.surface1 }}
            >
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: t.accent }} />
              <span style={{ color: t.textPrimary }}>Chargement des clients...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl"
            style={{
              background: t.surface1,
              border: `1px solid ${t.danger}`,
              color: t.danger,
            }}
          >
            {error}
          </div>
        )}

        {/* Stats Bar */}
        <div
          className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-3 rounded-xl"
          style={{
            background: `${t.surface1}ee`,
            border: `1px solid ${t.borderSubtle}`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: t.accent }} />
              <span className="text-sm font-medium" style={{ color: t.textPrimary }}>
                {formatNumber(customers.length)} clients affichés
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: t.success }} />
              <span className="text-sm" style={{ color: t.textSecondary }}>
                Total:{" "}
                <span className="font-mono font-medium" style={{ color: t.textPrimary }}>
                  {currency(customers.reduce((sum, c) => sum + c.totalSales, 0))}
                </span>
              </span>
            </div>
          </div>
          <div className="text-xs" style={{ color: t.textTertiary }}>
            {filters.startDate} → {filters.endDate}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CustomerMapsPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || status === "loading") {
    return null;
  }

  const userRole = (session as any)?.user?.role;
  const userEmail = session?.user?.email;

  const isAuthorized = isUserAuthorized(userRole, userEmail);

  if (status === "unauthenticated" || !isAuthorized) {
    return <AccessDenied role={userRole} email={userEmail} />;
  }

  return <CustomerMapContent />;
}
