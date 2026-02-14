
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-95 transition-transform",
  {
    variants: {
      variant: {

        default: "bg-black text-white hover:bg-black/90 active:scale-95 shadow-lg shadow-black/20 rounded-[24px]", // Primary CTA
        action: "bg-white text-black border border-transparent shadow-[0_6px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] rounded-full", // Action Button
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 rounded-[24px]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 rounded-[24px]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 rounded-[24px]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 rounded-full",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3 min-h-[48px] text-base font-semibold [&_svg]:size-5",
        sm: "h-10 rounded-[20px] px-4 min-h-[40px] text-sm [&_svg]:size-4",
        lg: "h-14 rounded-[28px] px-8 min-h-[56px] text-lg [&_svg]:size-6",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px] [&_svg]:size-5",
        xs: "h-8 px-3 text-xs min-h-[36px] [&_svg]:size-3.5",
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

