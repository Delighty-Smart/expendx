
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(({
  className,
  children,
  ...props
}, ref) => (
<<<<<<< HEAD
  <SelectPrimitive.Trigger
    ref={ref}
=======
  <SelectPrimitive.Trigger 
    ref={ref} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      // Enhanced for mobile
      "active:outline-none focus:outline-none",
      className
<<<<<<< HEAD
    )}
=======
    )} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// Hide scroll buttons completely
const SelectScrollUpButton = React.forwardRef<React.ElementRef<typeof SelectPrimitive.ScrollUpButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>>(({
  className,
  ...props
}, ref) => (
<<<<<<< HEAD
  <SelectPrimitive.ScrollUpButton
    ref={ref}
=======
  <SelectPrimitive.ScrollUpButton 
    ref={ref} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    className="hidden" // Completely hide
    {...props}
  />
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<React.ElementRef<typeof SelectPrimitive.ScrollDownButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>>(({
  className,
  ...props
}, ref) => (
<<<<<<< HEAD
  <SelectPrimitive.ScrollDownButton
    ref={ref}
=======
  <SelectPrimitive.ScrollDownButton 
    ref={ref} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    className="hidden" // Completely hide
    {...props}
  />
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(({
  className,
  children,
  position = "popper",
  ...props
}, ref) => (
  <SelectPrimitive.Portal>
<<<<<<< HEAD
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[200] min-w-[8rem] overflow-hidden rounded-md border bg-background text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
        // Non-transparent background + larger mobile height
        className
      )}
=======
    <SelectPrimitive.Content 
      ref={ref} 
      className={cn(
        "relative z-[200] min-w-[8rem] overflow-hidden rounded-md border bg-background text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:translate-x-1 data-[side=right]:slide-in-from-left-2 data-[side=top]:-translate-y-1 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
        // Non-transparent background + larger mobile height
        className
      )} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      position={position}
      {...props}
    >
      {/* No scroll buttons needed with enhanced natural scrolling */}
<<<<<<< HEAD
      <SelectPrimitive.Viewport
=======
      <SelectPrimitive.Viewport 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
        className={cn(
          "p-1",
          position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
        style={{
          maxHeight: 'min(70vh, 480px)',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          msOverflowStyle: 'auto',
          scrollbarWidth: 'thin',
          scrollPadding: '0.5rem'
        }}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Label>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>>(({
  className,
  ...props
}, ref) => (
<<<<<<< HEAD
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "py-1.5 pl-8 pr-2 text-sm font-semibold",
      className
    )}
    {...props}
=======
  <SelectPrimitive.Label 
    ref={ref} 
    className={cn(
      "py-1.5 pl-8 pr-2 text-sm font-semibold",
      className
    )} 
    {...props} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(({
  className,
  children,
  ...props
}, ref) => (
<<<<<<< HEAD
  <SelectPrimitive.Item
    ref={ref}
=======
  <SelectPrimitive.Item 
    ref={ref} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-2 px-3 text-sm outline-none transition-colors duration-200",
      // Modern selection styling - no checkmark overlap
      "hover:bg-accent/50 hover:text-accent-foreground",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:font-medium data-[state=checked]:border-l-2 data-[state=checked]:border-primary",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      // Enhanced for mobile touch targets
      "py-2.5 text-base sm:py-2 sm:text-sm",
      className
<<<<<<< HEAD
    )}
=======
    )} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    {...props}
  >
    {/* Modern indicator - small dot on the right instead of checkmark on left */}
    <SelectPrimitive.ItemText className="flex-1">{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="ml-2 flex h-2 w-2 items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-primary animate-scale-in" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>>(({
  className,
  ...props
}, ref) => (
<<<<<<< HEAD
  <SelectPrimitive.Separator
    ref={ref}
    className={cn(
      "-mx-1 my-1 h-px bg-muted",
      className
    )}
    {...props}
=======
  <SelectPrimitive.Separator 
    ref={ref} 
    className={cn(
      "-mx-1 my-1 h-px bg-muted",
      className
    )} 
    {...props} 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

<<<<<<< HEAD
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton
=======
export { 
  Select, 
  SelectGroup, 
  SelectValue, 
  SelectTrigger, 
  SelectContent, 
  SelectLabel, 
  SelectItem, 
  SelectSeparator, 
  SelectScrollUpButton, 
  SelectScrollDownButton 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
};
