
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-bg-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98] transition-transform",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-active shadow-sm hover:shadow dark:shadow-none", // Primary CTA
        action: "bg-bg-surface dark:bg-bg-overlay/40 text-text-primary border border-border-default dark:border-zinc-800/80 shadow-xs hover:bg-bg-sidebar-hover dark:hover:bg-bg-overlay/80 hover:border-zinc-300 dark:hover:border-zinc-700", // Action Button
        destructive: "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/20 border border-rose-500/10 dark:border-rose-500/20",
        outline: "border border-border-default dark:border-zinc-800/80 bg-transparent hover:bg-bg-sidebar-hover dark:hover:bg-bg-overlay/60 hover:text-text-primary hover:border-zinc-300 dark:hover:border-zinc-700",
        secondary: "bg-bg-overlay/80 dark:bg-bg-overlay/50 text-text-primary border border-transparent dark:border-zinc-800/20 hover:bg-bg-sidebar-hover dark:hover:bg-bg-overlay/90",
        ghost: "hover:bg-bg-sidebar-hover dark:hover:bg-bg-overlay/60 hover:text-text-primary text-text-secondary bg-transparent",
        link: "text-brand-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 min-h-[44px] text-sm [&_svg]:size-5",
        sm: "h-9 px-4 min-h-[36px] text-xs [&_svg]:size-4",
        lg: "h-[54px] px-8 min-h-[54px] text-base [&_svg]:size-6",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] [&_svg]:size-5",
        xs: "h-8 px-3 text-xs min-h-[32px] [&_svg]:size-3.5",
        compact: "h-10 px-4 text-sm min-h-[40px] [&_svg]:size-4",
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

