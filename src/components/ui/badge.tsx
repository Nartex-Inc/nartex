import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  // accept any variant to avoid TS breaks during CI generation
  variant?: string;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs";

  const map: Record<string, string> = {
    default: "bg-background",
    secondary: "bg-muted text-foreground",
    destructive: "bg-red-600 text-white border-transparent",
    outline: "bg-transparent border",
  };

  const styles = map[variant] ?? map.default;

  return <span className={cn(base, styles, className)} {...props} />;
}

export default Badge;
