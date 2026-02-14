import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-base))] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--accent))] text-white shadow-sm hover:bg-[hsl(var(--accent-hover))] hover:shadow-md",
        destructive:
          "bg-[hsl(var(--danger))] text-white shadow-sm hover:bg-[hsl(var(--danger)/0.9)] hover:shadow-md",
        outline:
          "border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))] shadow-xs hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] hover:shadow-sm",
        secondary:
          "bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-secondary))] shadow-xs hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--text-primary))]",
        ghost: "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]",
        link: "text-[hsl(var(--accent))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
