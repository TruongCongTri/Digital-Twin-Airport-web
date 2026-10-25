"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "outline" | "solid";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // accessible name + native tooltip
  active?: boolean;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  ghost: "text-twin-ink-2 hover:bg-twin-raised hover:text-twin-ink",
  outline:
    "border border-twin-line bg-twin-surface text-twin-ink-2 hover:border-twin-line-strong hover:text-twin-ink",
  solid: "bg-twin-accent text-white hover:bg-twin-accent-hover",
};

/** Square icon-only button with a required label (aria + tooltip). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      active,
      variant = "ghost",
      size = "md",
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={active}
        className={cn(
          "twin-focus inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0",
          size === "sm" ? "w-7 h-7" : "w-8 h-8",
          VARIANTS[variant],
          active &&
            "bg-twin-accent-soft text-twin-accent hover:bg-twin-accent-soft hover:text-twin-accent",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/** Text button with optional leading icon, same visual language as IconButton. */
export function Button({
  children,
  icon,
  variant = "outline",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      type="button"
      className={cn(
        "twin-focus inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Groups icon buttons into a floating vertical/horizontal toolbar. */
export function Toolbar({
  children,
  orientation = "vertical",
  className,
}: {
  children: ReactNode;
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-orientation={orientation}
      className={cn(
        "flex gap-0.5 p-1 bg-twin-surface border border-twin-line rounded-lg shadow-sm",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolbarDivider({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <div
      className={cn(
        "bg-twin-line shrink-0",
        orientation === "vertical" ? "h-px mx-1" : "w-px my-1",
      )}
    />
  );
}
