import React from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={"w-full " + (className ?? "")}> 
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight truncate">{title}</h1>
          {subtitle ? (
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="-mx-1 px-1 overflow-x-auto sm:overflow-visible">
            <div className="flex flex-row items-center gap-2 flex-nowrap">
              {actions}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;
