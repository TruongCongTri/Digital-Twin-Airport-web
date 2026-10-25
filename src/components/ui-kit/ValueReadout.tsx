"use client";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const VALUE_SIZES: Record<Size, string> = {
  sm: "text-[13px]",
  md: "text-[18px]",
  lg: "text-[32px] leading-none",
};

/** A live measurement: value + unit, optional label and change since the previous sample. */
export function ValueReadout({
  value,
  unit,
  label,
  delta,
  deltaDecimals = 1,
  size = "md",
  align = "left",
  className,
}: {
  value: string;
  unit?: string;
  label?: string;
  delta?: number | null;
  deltaDecimals?: number;
  size?: Size;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col min-w-0",
        align === "right" && "items-end",
        className,
      )}
    >
      {label && (
        <span className="text-[11px] text-twin-ink-3 leading-tight truncate">
          {label}
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-semibold text-twin-ink tabular-nums tracking-tight",
            VALUE_SIZES[size],
          )}
        >
          {value}
        </span>
        {unit && (
          <span
            className={cn(
              "text-twin-ink-3 font-medium",
              size === "lg" ? "text-[14px]" : "text-[11px]",
            )}
          >
            {unit}
          </span>
        )}
      </div>
      {delta !== undefined && delta !== null && (
        <DeltaIndicator delta={delta} decimals={deltaDecimals} unit={unit} />
      )}
    </div>
  );
}

/** Direction + magnitude of change. Neutral ink; direction is shown by the arrow, not colour. */
export function DeltaIndicator({
  delta,
  decimals = 1,
  unit,
}: {
  delta: number;
  decimals?: number;
  unit?: string;
}) {
  const flat = Math.abs(delta) < Math.pow(10, -decimals) / 2;
  const Icon = flat ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-twin-ink-2 tabular-nums">
      <Icon size={12} />
      {flat
        ? "steady"
        : `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)}${unit ? ` ${unit}` : ""}`}
    </span>
  );
}

/** Compact stat for KPI rows (header, summaries). */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col min-w-0", className)}>
      <span className="text-[10px] uppercase tracking-wide text-twin-ink-3 font-medium leading-tight">
        {label}
      </span>
      <span className="text-[14px] font-semibold text-twin-ink tabular-nums leading-tight">
        {value}
      </span>
      {hint && (
        <span className="text-[10px] text-twin-ink-3 leading-tight">
          {hint}
        </span>
      )}
    </div>
  );
}
