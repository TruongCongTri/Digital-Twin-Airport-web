"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dropdown anchored to a trigger. Closes on outside click, Escape, or item select. */
export function Menu({
  trigger,
  children,
  align = "left",
  width = 240,
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 py-1 bg-twin-surface border border-twin-line rounded-lg shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  hint,
  onSelect,
  active,
  disabled,
  tone = "default",
}: {
  icon?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  onSelect: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "twin-focus w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] disabled:opacity-40",
        tone === "danger"
          ? "text-[#a12828] hover:bg-[#fbe9e9]"
          : "text-twin-ink hover:bg-twin-raised",
        active && "bg-twin-accent-soft",
      )}
    >
      {icon && <span className="shrink-0 text-twin-ink-2">{icon}</span>}
      <span className="flex-1 min-w-0">{children}</span>
      {hint != null && (
        <span className="shrink-0 text-[11px] text-twin-ink-3">{hint}</span>
      )}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-twin-ink-3">
      {children}
    </div>
  );
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-twin-line" />;
}
