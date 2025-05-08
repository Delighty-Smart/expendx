
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
  // Consistent sizing for both desktop and mobile
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-3.5 w-3.5", // Standardized to small size
    lg: "h-4 w-4"      // Slightly larger but still compact
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
        <Check className={cn(
          size === 'sm' ? "h-2.5 w-2.5" : 
          size === 'md' ? "h-2.5 w-2.5" : // Standardized icon size
          "h-3 w-3"
        )} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
