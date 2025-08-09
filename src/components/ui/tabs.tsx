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
  return <div className={cn("flex gap-2", className)}>{children}</div>;
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
        "rounded-md px-3 py-1.5 text-sm",
        active ? "font-semibold border" : "opacity-70 hover:opacity-100",
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
