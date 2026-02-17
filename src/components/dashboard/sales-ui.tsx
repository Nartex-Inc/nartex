"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  X as CloseIcon,
  Loader2,
  Lock,
} from "lucide-react";
import type { ThemeTokens } from "@/lib/theme-tokens";
import { currency, formatNumber, percentage } from "@/lib/dashboard-formatters";
import { ALLOWED_ROLES } from "@/lib/dashboard-constants";

/* ─── Skeletons ─────────────────────────────────────────────────────────────── */

export const SkeletonPulse = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded bg-[hsl(var(--bg-muted))] ${className}`}
  />
);

export const KpiSkeleton = ({ t: _t }: { t: ThemeTokens }) => (
  <div className="space-y-3">
    <SkeletonPulse className="h-8 w-24" />
    <div className="flex items-center gap-2 mt-3">
      <SkeletonPulse className="h-6 w-16 rounded-md" />
      <SkeletonPulse className="h-4 w-12" />
    </div>
  </div>
);

export const ChartSkeleton = ({ height = 280, accentColor }: { height?: number; accentColor: string }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <div className="flex flex-col items-center gap-3">
      <Loader2
        className="h-8 w-8 animate-spin"
        style={{ color: accentColor }}
      />
      <span className="text-sm text-[hsl(var(--text-muted))]">Chargement...</span>
    </div>
  </div>
);

/* ─── Animated Number ───────────────────────────────────────────────────────── */

export const AnimatedNumber = ({
  value,
  format,
  duration = 600,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * eased;
      setDisplayValue(currentValue);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
      }
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      previousValueRef.current = value;
    };
  }, [value, duration]);

  return <>{format(displayValue)}</>;
};

/* ─── YOY Badge ─────────────────────────────────────────────────────────────── */

export const YOYBadge = ({ current, previous }: { current: number; previous: number }) => {
  const change = previous > 0 ? (current - previous) / previous : 0;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.001;

  const badgeClass = isNeutral
    ? "badge-neutral"
    : isPositive
    ? "badge-positive"
    : "badge-negative";

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2 mt-3">
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass}`}>
        <Icon className="w-2.5 h-2.5" />
        <span className="font-mono-data">{percentage(Math.abs(change))}</span>
      </div>
    </div>
  );
};

/* ─── Custom Tooltip ────────────────────────────────────────────────────────── */

export function CustomTooltip({ active, payload, label, format = "currency", t }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm animate-scale-in shadow-lg"
      style={{
        background: t.tooltipBg,
        borderLeft: `3px solid ${t.accent}`,
      }}
    >
      <p className="text-label mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: t.textSecondary }}>{entry.name}:</span>
          <span className="font-mono-data font-medium" style={{ color: t.textPrimary }}>
            {format === "number"
              ? formatNumber(entry.value)
              : format === "percentage"
              ? percentage(entry.value)
              : currency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Custom Legend ──────────────────────────────────────────────────────────── */

export const CustomLegend = ({
  payload,
  onLegendClick,
  selectedItems = [],
  t,
}: any) => {
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {(payload || []).map((entry: any) => {
        const isSelected = selectedItems.length === 0 || selectedItems.includes(entry.value);
        return (
          <li
            key={entry.value}
            className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md transition-all duration-200 ${
              isSelected ? "opacity-100" : "opacity-30"
            }`}
            onClick={() => onLegendClick?.(entry.value)}
            style={{
              background: isSelected ? t.surface3 : "transparent",
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span style={{ color: t.textSecondary }}>{entry.value}</span>
          </li>
        );
      })}
    </ul>
  );
};

/* ─── Error / Access Denied ─────────────────────────────────────────────────── */

export const ErrorState = ({ message }: { message: string }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-8 max-w-md text-center animate-scale-in">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center badge-negative">
        <TrendingDown className="w-8 h-8" />
      </div>
      <h3 className="text-title mb-2">Erreur de chargement</h3>
      <p className="text-caption mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-lg font-medium transition-all badge-negative hover:opacity-80"
      >
        Recharger
      </button>
    </div>
  </div>
);

export const AccessDenied = ({ role, email }: { role: string | undefined; email: string | undefined | null }) => (
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="surface-card p-10 max-w-lg text-center animate-scale-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center surface-inset">
        <Lock className="w-10 h-10 text-[hsl(var(--danger))]" />
      </div>
      <h3 className="text-headline mb-3">Accès restreint</h3>
      <p className="text-caption leading-relaxed mb-4">
        Vous ne disposez pas des autorisations nécessaires pour consulter ces données.
        Veuillez contacter votre département TI pour obtenir l&apos;accès approprié.
      </p>
      <div className="bg-[hsl(var(--bg-muted))] p-4 rounded-lg text-left text-xs font-mono text-[hsl(var(--text-secondary))]">
        <p>DEBUG INFO:</p>
        <p>Email: {email || "Not Found"}</p>
        <p>Role Detected: {role || "Undefined/Null"}</p>
        <p>Allowed: {ALLOWED_ROLES.join(", ")}</p>
      </div>
    </div>
  </div>
);

/* ─── KPI Card ──────────────────────────────────────────────────────────────── */

export function KpiCard({
  title,
  icon: _Icon,
  children,
  className = "",
  t,
  onClick,
  accentColor: _accentColor,
  isLoading = false,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  onClick?: () => void;
  accentColor?: string;
  isLoading?: boolean;
}) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => isClickable && (e.key === "Enter" || e.key === " ") && onClick?.()}
      className={`
        rounded-2xl p-6 transition-all duration-200
        ${isClickable ? "cursor-pointer" : ""}
        ${className}
      `}
      style={{
        background: t.surface1,
      }}
      onMouseEnter={isClickable ? (e) => { e.currentTarget.style.background = t.surface2; } : undefined}
      onMouseLeave={isClickable ? (e) => { e.currentTarget.style.background = t.surface1; } : undefined}
    >
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.08em]" style={{ color: t.textMuted }}>{title}</span>

      <div className="mt-3">{isLoading ? <KpiSkeleton t={t} /> : children}</div>
    </div>
  );
}

/* ─── Chart Card ────────────────────────────────────────────────────────────── */

export function ChartCard({
  title,
  children,
  className = "",
  t,
  action,
  isLoading = false,
  height = 320,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  t: ThemeTokens;
  action?: React.ReactNode;
  isLoading?: boolean;
  height?: number;
}) {
  return (
    <div
      className={`rounded-2xl pt-6 px-5 pb-5 h-full flex flex-col animate-fade-in ${className}`}
      style={{
        background: t.surface1,
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[0.75rem] font-semibold uppercase tracking-[0.08em]" style={{ color: t.textTertiary }}>
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-grow">
        {isLoading ? <ChartSkeleton height={height} accentColor={t.accent} /> : children}
      </div>
    </div>
  );
}

/* ─── Segmented Control ─────────────────────────────────────────────────────── */

export function SegmentedControl({
  options,
  value,
  onChange,
  t,
}: {
  options: { key: string; label: string; color?: string }[];
  value: string;
  onChange: (key: string) => void;
  t: ThemeTokens;
}) {
  return (
    <div
      className="inline-flex rounded-full p-1"
      style={{ background: t.surface2, border: `1px solid ${t.borderSubtle}` }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 rounded-full text-[0.8125rem] font-medium transition-all duration-200"
            style={{
              background: active ? (opt.color || t.accent) : "transparent",
              color: active ? t.void : t.textTertiary,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Modal ─────────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  t,
  width = "max-w-4xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  t: ThemeTokens;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
      <div
        className="absolute inset-0 backdrop-blur-sm animate-fade-in"
        style={{ background: "hsl(0, 0%, 0% / 0.5)" }}
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} rounded-2xl overflow-hidden shadow-2xl animate-scale-in`}
        style={{ background: t.surface1 }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
        >
          <div>
            <h3 className="text-title">{title}</h3>
            {subtitle && <p className="text-caption mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ color: t.textTertiary }}
            aria-label="Fermer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
