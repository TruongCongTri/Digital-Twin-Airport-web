"use client";
import { cn } from "@/lib/utils";
import type { SparkBands } from "./Sparkline";

/**
 * Horizontal gauge: the type's full domain split into critical / warning / normal
 * zones, with a marker at the current value. Zones are labelled by position
 * (low/high ends) and by the marker's own status pill elsewhere, never colour alone.
 */
export function RangeBar({
  value,
  min,
  max,
  bands,
  formatValue = (v) => String(v),
  unit,
  className,
}: {
  value: number;
  min: number;
  max: number;
  bands: SparkBands;
  formatValue?: (v: number) => string;
  unit?: string;
  className?: string;
}) {
  const pct = (v: number) =>
    ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;
  // Zones from low to high; undefined bands simply collapse their zone
  type Tone = "critical" | "warning" | "normal";
  const { critLow, warnLow, warnHigh, critHigh } = bands;
  const stops: { from: number; to: number; tone: Tone }[] = [];
  if (critLow !== undefined)
    stops.push({ from: min, to: critLow, tone: "critical" });
  if (warnLow !== undefined)
    stops.push({ from: critLow ?? min, to: warnLow, tone: "warning" });
  stops.push({
    from: warnLow ?? critLow ?? min,
    to: warnHigh ?? critHigh ?? max,
    tone: "normal",
  });
  if (warnHigh !== undefined)
    stops.push({ from: warnHigh, to: critHigh ?? max, tone: "warning" });
  if (critHigh !== undefined)
    stops.push({ from: critHigh, to: max, tone: "critical" });

  const toneColor = {
    normal: "#dce9f9",
    warning: "#fde4a6",
    critical: "#f3c1c1",
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2.5">
        <div className="absolute inset-0 flex gap-[2px]">
          {stops.map((s, i) => (
            <div
              key={i}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct(s.to) - pct(s.from)}%`,
                backgroundColor: toneColor[s.tone],
              }}
            />
          ))}
        </div>
        <div
          className="absolute -top-1 bottom-[-4px] w-[3px] -translate-x-1/2 rounded-full bg-twin-ink ring-2 ring-white"
          style={{ left: `${pct(value)}%` }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-twin-ink-3 tabular-nums">
        <span>
          {formatValue(min)} {unit}
        </span>
        <span>
          {formatValue(max)} {unit}
        </span>
      </div>
    </div>
  );
}
