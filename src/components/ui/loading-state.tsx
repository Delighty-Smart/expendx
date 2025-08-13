import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner"

interface LoadingStateProps {
  message?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "default" | "muted" | "white" | "accent"
  className?: string
  children?: React.ReactNode
}

export function LoadingState({ 
  message = "Loading...", 
  size = "md",
  variant = "default",
  className,
  children 
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 py-8",
      className
    )}>
      <LoadingSpinner size={size} variant={variant} />
      {children ? children : (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}

interface ButtonLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  loadingText,
  size = "sm",
  className 
}: ButtonLoadingProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <LoadingSpinner size={size} variant="white" />
        {loadingText && <span>{loadingText}</span>}
      </div>
    )
  }
  
  return <>{children}</>
}