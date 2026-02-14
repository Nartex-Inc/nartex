import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: string;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors";

  const map: Record<string, string> = {
    default: "bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] border-[hsl(var(--border-default))]",
    secondary: "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] border-transparent",
    destructive: "bg-[hsl(var(--danger-muted))] text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.2)]",
    outline: "bg-transparent text-[hsl(var(--text-secondary))] border-[hsl(var(--border-default))]",
    success: "bg-[hsl(var(--success-muted))] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]",
    warning: "bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]",
    accent: "bg-[hsl(var(--accent-muted))] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.2)]",
    info: "bg-[hsl(var(--info-muted))] text-[hsl(var(--info))] border-[hsl(var(--info)/0.2)]",
  };

  const styles = map[variant] ?? map.default;

  return <span className={cn(base, styles, className)} {...props} />;
}

export default Badge;
