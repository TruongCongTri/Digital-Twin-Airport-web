"use client";
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mutually exclusive options in one pill row (tabs, modes, filters). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  // `title` names icon-only options for tooltips and screen readers
  options: {
    value: T;
    label?: ReactNode;
    icon?: ReactNode;
    count?: number;
    title?: string;
  }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex p-0.5 rounded-md bg-twin-raised border border-twin-line",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.title}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "twin-focus flex-1 min-w-0 inline-flex items-center justify-center gap-1 rounded font-medium transition-colors whitespace-nowrap",
              size === "sm" ? "h-6 px-1.5 text-[11px]" : "h-7 px-2 text-[12px]",
              active
                ? "bg-twin-surface text-twin-ink shadow-sm"
                : "text-twin-ink-2 hover:text-twin-ink",
            )}
          >
            {o.icon}
            {o.label}
            {o.count !== undefined && (
              <span className="text-twin-ink-3 tabular-nums">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "twin-focus relative inline-flex w-7 h-4 rounded-full transition-colors shrink-0",
        checked ? "bg-twin-accent" : "bg-twin-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-3",
        )}
      />
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-1.5 h-8 px-2 rounded-md border border-twin-line bg-twin-surface focus-within:border-twin-accent focus-within:ring-2 focus-within:ring-twin-accent-soft",
        className,
      )}
    >
      <Search size={14} className="text-twin-ink-3 shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-[12px] text-twin-ink placeholder:text-twin-ink-3 outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="text-twin-ink-3 hover:text-twin-ink"
        >
          <X size={13} />
        </button>
      )}
    </label>
  );
}

/** Two-column property list used by the inspector (label left, value right). */
export function KeyValueList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[minmax(92px,auto)_1fr] gap-x-3 gap-y-1.5 text-[12px]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-twin-ink-3">{item.label}</dt>
          <dd className="text-twin-ink font-medium text-right truncate tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Row with a label on the left and controls (switches / icon buttons) on the right. */
export function ControlRow({
  icon,
  label,
  meta,
  children,
  muted,
  className,
}: {
  icon?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 h-8 px-3.5 hover:bg-twin-raised",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "shrink-0",
            muted ? "text-twin-ink-3" : "text-twin-ink-2",
          )}
        >
          {icon}
        </span>
      )}
      <span
        className={cn(
          "flex-1 min-w-0 truncate text-[12px]",
          muted ? "text-twin-ink-3" : "text-twin-ink",
        )}
      >
        {label}
      </span>
      {meta != null && (
        <span className="text-[11px] text-twin-ink-3 tabular-nums shrink-0">
          {meta}
        </span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">{children}</div>
    </div>
  );
}
