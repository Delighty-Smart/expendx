
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-m3-sm border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-m3-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-m3-primary-container text-m3-on-primary-container",
        secondary:
          "border-transparent bg-m3-secondary-container text-m3-on-secondary-container",
        destructive:
          "border-transparent bg-m3-error-container text-m3-on-error-container",
        outline: "border-m3-outline-variant text-m3-on-surface-variant",

        alert:

          "border-transparent bg-m3-error text-m3-on-error min-w-5 h-5 flex items-center justify-center p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,

  VariantProps<typeof badgeVariants> { }


function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

