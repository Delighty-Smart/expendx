
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] text-sm font-semibold ring-offset-bg-base transition-all duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-active shadow-sm dark:shadow-none", // Primary CTA (52px height spec)
        action: "bg-bg-surface text-text-primary border border-border-default hover:bg-bg-sidebar-hover hover:border-border-strong", // Action Button
        destructive: "bg-semantic-danger-bg text-semantic-danger-text hover:bg-semantic-danger-bgSubtle border border-semantic-danger-border",
        outline: "border-[1.5px] border-border-default bg-transparent text-text-primary hover:bg-bg-sidebar-hover hover:border-border-strong",
        secondary: "border-[1.5px] border-border-default bg-transparent text-text-primary hover:bg-bg-sidebar-hover",
        ghost: "hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary bg-transparent underline-offset-4 active:underline",
        link: "text-brand-primary underline-offset-4 hover:underline h-auto p-0",
        fab: "h-[56px] w-[56px] min-h-[56px] min-w-[56px] rounded-full bg-brand-primary text-text-inverse shadow-[var(--elevation-3)] hover:bg-brand-primary-hover active:scale-[0.97]",
      },
      size: {
        default: "h-[44px] px-5 min-h-[44px] min-w-[120px] text-sm font-semibold [&_svg]:size-4",
        sm: "h-[36px] px-3.5 min-h-[36px] text-xs font-semibold [&_svg]:size-3.5",
        lg: "h-[48px] px-6 min-h-[48px] min-w-[140px] text-base font-semibold [&_svg]:size-5",
        icon: "h-[40px] w-[40px] min-h-[40px] min-w-[40px] p-0 rounded-full [&_svg]:size-4.5",
        xs: "h-[32px] px-3 text-xs min-h-[32px] rounded-[8px] [&_svg]:size-3.5",
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

