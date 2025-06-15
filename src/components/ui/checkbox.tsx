
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Responsive size classes for "sm": smaller for mobile, current for md+
// "md:" prefix applies styles at 768px and up.
const sizeClasses = {
  sm: "h-3 w-3 md:h-3.5 md:w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5"
};

// Responsive icon sizes
const iconSizes = {
  sm: "h-2 w-2 md:h-2.5 md:w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5"
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { 
    size?: 'sm' | 'md' | 'lg'
  }
>(({ className, size = 'sm', ...props }, ref) => {
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
        <Check className={iconSizes[size]} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
