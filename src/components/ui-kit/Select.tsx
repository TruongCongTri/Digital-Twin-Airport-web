"use client";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu, MenuItem } from "./Menu";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Compact dropdown select built on Menu (single choice, optional icons + counts). */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  width = 240,
  align = "right",
  className,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  width?: number;
  align?: "left" | "right";
  className?: string;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Menu
      align={align}
      width={width}
      className={className}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${ariaLabel}: ${current?.label}`}
          className={cn(
            "twin-focus w-full flex items-center gap-1.5 h-8 pl-2 pr-1.5 rounded-md border bg-twin-surface text-[12px] text-twin-ink",
            open
              ? "border-twin-accent"
              : "border-twin-line hover:border-twin-line-strong",
          )}
        >
          {current?.icon && (
            <span className="text-twin-ink-2 shrink-0">{current.icon}</span>
          )}
          <span className="flex-1 min-w-0 truncate text-left">
            {current?.label}
          </span>
          <ChevronDown size={14} className="text-twin-ink-3 shrink-0" />
        </button>
      )}
    >
      {(close) =>
        options.map((o) => (
          <MenuItem
            key={o.value}
            active={o.value === value}
            icon={
              o.value === value ? (
                <Check size={14} />
              ) : (
                (o.icon ?? <span className="w-3.5" />)
              )
            }
            hint={o.count}
            onSelect={() => {
              onChange(o.value);
              close();
            }}
          >
            {o.label}
          </MenuItem>
        ))
      }
    </Menu>
  );
}
