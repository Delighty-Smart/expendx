import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const spinnerVariants = cva(
  "relative inline-block animate-spin",
  {
    variants: {
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        white: "text-white",
        accent: "text-accent-foreground",
      },
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4", 
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function LoadingSpinner({ 
  className, 
  variant, 
  size, 
  ...props 
}: LoadingSpinnerProps) {
  return (
    <div 
      className={cn(spinnerVariants({ variant, size }), className)} 
      {...props}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

export { LoadingSpinner, spinnerVariants }