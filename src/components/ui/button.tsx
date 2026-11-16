
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "m3-state-layer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-m3-full text-sm font-semibold transition-all duration-m3-short ease-m3-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        /* M3 filled */
        default: "bg-m3-primary text-m3-on-primary hover:shadow-m3-1",
        /* M3 tonal */
        tonal: "bg-m3-secondary-container text-m3-on-secondary-container",
        /* M3 elevated */
        elevated:
          "bg-m3-surface-container-low text-m3-primary shadow-m3-1 hover:shadow-m3-2",
        /* M3 outlined */
        outline:
          "border border-m3-outline bg-transparent text-m3-primary hover:bg-[color-mix(in_srgb,var(--m3-primary)_8%,transparent)]",
        /* M3 filled tonal (legacy "action") */
        action:
          "bg-m3-secondary-container text-m3-on-secondary-container hover:shadow-m3-1",
        /* M3 error container */
        destructive:
          "bg-m3-error-container text-m3-on-error-container hover:shadow-m3-1",
        secondary:
          "bg-m3-secondary-container text-m3-on-secondary-container",
        /* M3 text button */
        ghost:
          "text-m3-primary bg-transparent hover:bg-[color-mix(in_srgb,var(--m3-primary)_8%,transparent)]",
        /* M3 text button with underline */
        link: "text-m3-primary underline-offset-4 hover:underline h-auto p-0",
        /* M3 FAB */
        fab: "h-[56px] w-[56px] min-h-[56px] min-w-[56px] rounded-m3-full bg-m3-primary-container text-m3-on-primary-container shadow-m3-3 hover:shadow-m3-4 active:scale-[0.96]",
      },
      size: {
        default: "h-10 px-6 min-h-10 min-w-[120px] text-sm font-semibold [&_svg]:size-4",
        sm: "h-8 px-4 min-h-8 text-xs font-semibold [&_svg]:size-3.5",
        lg: "h-12 px-7 min-h-12 min-w-[140px] text-base font-semibold [&_svg]:size-5",
        icon: "h-10 w-10 min-h-10 min-w-10 p-0 rounded-m3-full [&_svg]:size-4",
        xs: "h-7 px-3 text-xs min-h-7 rounded-m3-full [&_svg]:size-3.5",
        compact: "h-[38px] px-3.5 text-xs min-h-[38px] [&_svg]:size-3.5",
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

