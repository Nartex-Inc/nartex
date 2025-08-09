import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive";
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs";
  const styles =
    variant === "destructive"
      ? "bg-red-600 text-white border-transparent"
      : variant === "secondary"
      ? "bg-muted text-foreground"
      : "bg-background";
  return <span className={cn(base, styles, className)} {...props} />;
}

export default Badge;
