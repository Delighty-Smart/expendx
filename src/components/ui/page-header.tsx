import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Path to navigate back to. If provided, shows a back chevron. */
  backTo?: string;
  /** If true, uses browser history instead of navigating to backTo */
  backHistory?: boolean;
  /** Hide the back button even on sub-pages */
  hideBack?: boolean;
}

export function PageHeader({ title, subtitle, actions, className, backTo, backHistory, hideBack }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const showBack = !hideBack;

  return (
    <header className={"sticky safe-top-header lg:!top-0 z-20 bg-background pb-3 mb-2 space-y-2.5 " + (className ?? "")}>
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-8 h-8 -ml-1 bg-muted/60 hover:bg-muted dark:bg-muted/30 text-foreground border border-border/40 transition-all touch-manipulation shrink-0 active:scale-95"
              style={{ borderRadius: "9999px" }}
              aria-label="Go back"
            >
              <ChevronLeft className="h-4.5 w-4.5 text-foreground" strokeWidth={2.5} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight truncate">{title}</h1>
            {subtitle ? (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex items-center justify-end gap-2 flex-wrap pt-0.5">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeader;
