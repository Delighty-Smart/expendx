import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 relative group",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted/40 data-[state=unchecked]:border-border/60 shadow-inner",
      className
    )}
    {...props}
    ref={ref}
  >
    <div className="absolute inset-0 flex items-center justify-between px-2.5 w-full pointer-events-none select-none">
      <span className="text-[9px] font-black tracking-tighter text-primary-foreground opacity-0 group-data-[state=checked]:opacity-100 transition-all duration-200 translate-x-1 group-data-[state=checked]:translate-x-0">
        ON
      </span>
      <span className="text-[9px] font-black tracking-tighter text-muted-foreground/60 opacity-100 group-data-[state=checked]:opacity-0 transition-all duration-200 group-data-[state=unchecked]:translate-x-0 -translate-x-1">
        OFF
      </span>
    </div>
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-all duration-200 group-data-[state=checked]:translate-x-9 group-data-[state=unchecked]:translate-x-0 z-10"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
