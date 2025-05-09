
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { 
    size?: 'sm' | 'md' | 'lg'
  }
>(({ className, size = 'md', ...props }, ref) => {
  // All checkbox sizes standardized to exactly 16x16px (h-4 w-4)
  const sizeClasses = {
    sm: "h-4 w-4", // 16x16px
    md: "h-4 w-4", // 16x16px
    lg: "h-4 w-4"  // 16x16px
  };
  
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        `peer shrink-0 rounded-sm border border-primary ring-offset-background 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check className="h-3 w-3" /> {/* Smaller checkmark for 16x16px checkbox */}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
