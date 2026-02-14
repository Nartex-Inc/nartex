import * as React from "react";
import { cn } from "@/lib/utils";

type TabsCtx = { value: string; set: (v: string) => void };
const Ctx = React.createContext<TabsCtx | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [value, set] = React.useState(defaultValue);
  return (
    <div className={cn(className)}>
      <Ctx.Provider value={{ value, set }}>{children}</Ctx.Provider>
    </div>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-xl bg-[hsl(var(--bg-muted))] p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.set(value)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-primary))] shadow-sm"
          : "text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx)!;
  return ctx.value === value ? <div className={cn(className)}>{children}</div> : null;
}
