import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))] p-6 shadow-xs transition-shadow duration-200 hover:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Custom title that accepts an optional `icon` prop (matches your usage) */
export function CardTitle({
  className,
  icon,
  children,
}: {
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-medium tracking-wide text-[hsl(var(--text-primary))]",
        className
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}
