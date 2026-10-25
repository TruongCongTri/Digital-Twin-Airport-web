"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Docked workspace panel: white surface, hairline border, header + scrollable body. */
export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "aside" | "div";
}) {
  return (
    <Tag
      className={cn(
        "flex flex-col min-h-0 bg-twin-surface border-twin-line text-twin-ink",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center gap-2.5 px-3.5 h-11 shrink-0 border-b border-twin-line",
        className,
      )}
    >
      {icon && <span className="text-twin-ink-2 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-semibold leading-tight truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-twin-ink-3 leading-tight truncate">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-0.5 shrink-0">{actions}</div>
      )}
    </header>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("twin-scroll flex-1 min-h-0", className)}>
      {children}
    </div>
  );
}

/** Collapsible titled group inside a panel body. */
export function PanelSection({
  title,
  meta,
  actions,
  children,
  defaultOpen = true,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("border-b border-twin-line last:border-b-0", className)}>
      <div className="flex items-center gap-1 pl-2 pr-2.5 h-9">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="twin-focus flex items-center gap-1.5 flex-1 min-w-0 h-7 px-1.5 rounded-md hover:bg-twin-raised text-left"
        >
          <ChevronDown
            size={14}
            className={cn(
              "text-twin-ink-3 transition-transform shrink-0",
              !open && "-rotate-90",
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-twin-ink-2 truncate">
            {title}
          </span>
          {meta != null && (
            <span className="text-[11px] text-twin-ink-3 tabular-nums">
              {meta}
            </span>
          )}
        </button>
        {actions}
      </div>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 px-6 py-10 text-twin-ink-3">
      {icon}
      <p className="text-[13px] font-medium text-twin-ink-2">{title}</p>
      {hint && <p className="text-[12px]">{hint}</p>}
    </div>
  );
}
