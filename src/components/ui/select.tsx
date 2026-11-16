
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

  <SelectPrimitive.Trigger
    ref={ref}

    className={cn(
      "flex h-11 w-full items-center justify-between rounded-m3-sm border border-m3-outline bg-m3-surface-container-lowest px-4 py-2 text-sm text-m3-on-surface ring-offset-bg-base placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-38 [&>span]:line-clamp-1 hover:border-m3-on-surface",
      // Enhanced for mobile
      "active:outline-none focus:outline-none",
      className

    )}

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

  <SelectPrimitive.ScrollUpButton
    ref={ref}

    className="hidden" // Completely hide
    {...props}
  />
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<React.ElementRef<typeof SelectPrimitive.ScrollDownButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>>(({
  className,
  ...props
}, ref) => (

  <SelectPrimitive.ScrollDownButton
    ref={ref}

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

    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[200] min-w-[8rem] overflow-hidden rounded-m3-sm border border-m3-outline-variant bg-m3-surface-container text-m3-on-surface shadow-m3-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
        // Non-transparent background + larger mobile height
        className
      )}

      position={position}
      {...props}
    >
      {/* No scroll buttons needed with enhanced natural scrolling */}

      <SelectPrimitive.Viewport

        className={cn(
          "p-1",
          position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]"
        )}
        style={{
          maxHeight: 'min(45vh, 320px)',
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

  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "py-1.5 pl-8 pr-2 text-sm font-semibold",
      className
    )}
    {...props}

  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(({
  className,
  children,
  ...props
}, ref) => (

  <SelectPrimitive.Item
    ref={ref}

    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-m3-xs py-2.5 px-3 text-sm outline-none transition-colors duration-m3-short ease-m3-standard",
      // M3 menu item: hover/focus state layer, checked item uses secondary container
      "hover:bg-[color-mix(in_srgb,var(--m3-on-surface)_8%,transparent)] focus:bg-[color-mix(in_srgb,var(--m3-on-surface)_10%,transparent)]",
      "data-[state=checked]:bg-m3-secondary-container data-[state=checked]:text-m3-on-secondary-container data-[state=checked]:font-semibold",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-38",
      // Enhanced for mobile touch targets
      "py-2.5 text-base sm:py-2.5 sm:text-sm",
      className

    )}

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

  <SelectPrimitive.Separator
    ref={ref}
    className={cn(
      "-mx-1 my-1 h-px bg-muted",
      className
    )}
    {...props}

  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;


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

};

