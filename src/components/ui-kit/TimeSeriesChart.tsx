"use client";
import type { ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

// Categorical slots in the validated order (first three pass all-pairs CVD checks)
export const SERIES_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
] as const;

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

export interface ChartThreshold {
  value: number;
  label: string;
  tone: "warning" | "critical";
}

type Row = Record<
  string,
  number | string | [number, number] | null | undefined
>;

/**
 * Single-axis time series: 2px lines, optional min–max band, dashed thresholds,
 * crosshair tooltip and a legend when there is more than one series.
 */
export function TimeSeriesChart({
  data,
  xKey,
  series,
  band,
  thresholds = [],
  height = 180,
  formatX = (v) => String(v),
  formatY = (v) => String(v),
  unit,
  yDomain,
  className,
  emptyText = "No data for this period",
}: {
  data: Row[];
  xKey: string;
  series: ChartSeries[];
  /** Key whose value is [low, high]; drawn as a translucent range band under the lines */
  band?: { key: string; label: string };
  thresholds?: ChartThreshold[];
  height?: number;
  formatX?: (v: number | string) => string;
  formatY?: (v: number) => string;
  unit?: string;
  yDomain?: [
    number | "auto" | "dataMin" | "dataMax",
    number | "auto" | "dataMin" | "dataMax",
  ];
  className?: string;
  emptyText?: string;
}) {
  const colored = series.map((s, i) => ({
    ...s,
    color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  // Y ticks from the data extent, de-duplicated by their formatted label so a narrow
  // range (e.g. 23.7–23.9 °C at 1 decimal) never shows the same label twice
  const { domain, ticks } = (() => {
    if (yDomain) return { domain: yDomain, ticks: undefined };
    const values: number[] = [];
    for (const row of data) {
      for (const s of series) {
        const v = row[s.key];
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
      const r = band ? row[band.key] : undefined;
      if (Array.isArray(r)) values.push(...r.filter((v) => Number.isFinite(v)));
    }
    if (!values.length)
      return { domain: ["auto", "auto"] as const, ticks: undefined };
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (hi - lo < 1e-9) {
      lo -= Math.abs(lo) * 0.05 || 1;
      hi += Math.abs(hi) * 0.05 || 1;
    }
    const pad = (hi - lo) * 0.1;
    lo -= pad;
    hi += pad;
    const seen = new Set<string>();
    const out: number[] = [];
    for (let i = 0; i <= 4; i++) {
      const v = lo + ((hi - lo) * i) / 4;
      const label = formatY(v);
      if (!seen.has(label)) {
        seen.add(label);
        out.push(v);
      }
    }
    return { domain: [lo, hi] as [number, number], ticks: out };
  })();

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[12px] text-twin-ink-3 border border-dashed border-twin-line rounded-md",
          className,
        )}
        style={{ height }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {(colored.length > 1 || band) && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px] text-twin-ink-2">
          {colored.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-[2px] rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </li>
          ))}
          {band && (
            <li className="flex items-center gap-1.5">
              <span
                className="w-3 h-2 rounded-sm"
                style={{ backgroundColor: colored[0]?.color, opacity: 0.18 }}
              />
              {band.label}
            </li>
          )}
        </ul>
      )}
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 320, height }}
        >
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#e1e0d9" strokeWidth={1} />
            <XAxis
              dataKey={xKey}
              tickFormatter={formatX}
              tick={{ fontSize: 10, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={formatY}
              tick={{ fontSize: 10, fill: "#898781" }}
              axisLine={false}
              tickLine={false}
              width={46}
              domain={domain}
              ticks={ticks}
            />
            <Tooltip
              cursor={{
                stroke: "#0f172a",
                strokeOpacity: 0.25,
                strokeWidth: 1,
              }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip title={formatX(label as string)}>
                    {payload
                      .filter((p) => p.dataKey !== band?.key)
                      .map((p) => (
                        <TooltipRow
                          key={String(p.dataKey)}
                          color={p.color}
                          label={String(p.name)}
                        >
                          {formatY(Number(p.value))}
                          {unit ? ` ${unit}` : ""}
                        </TooltipRow>
                      ))}
                    {band &&
                      (() => {
                        const range = payload[0]?.payload?.[band.key] as
                          | [number, number]
                          | undefined;
                        return range ? (
                          <TooltipRow
                            color={colored[0]?.color}
                            label={band.label}
                            faint
                          >
                            {formatY(range[0])} – {formatY(range[1])}
                            {unit ? ` ${unit}` : ""}
                          </TooltipRow>
                        ) : null;
                      })()}
                  </ChartTooltip>
                ) : null
              }
            />
            {band && (
              <Area
                dataKey={band.key}
                name={band.label}
                stroke="none"
                fill={colored[0]?.color}
                fillOpacity={0.15}
                isAnimationActive={false}
                activeDot={false}
              />
            )}
            {thresholds.map((t) => (
              <ReferenceLine
                key={`${t.tone}-${t.value}`}
                y={t.value}
                stroke={t.tone === "critical" ? "#d03b3b" : "#fab219"}
                strokeDasharray="4 4"
                ifOverflow="hidden"
                label={{
                  value: t.label,
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#52514e",
                }}
              />
            ))}
            {colored.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "4 3" : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[140px] rounded-md border border-twin-line bg-twin-surface px-2.5 py-2 shadow-md text-[11px]">
      <p className="font-medium text-twin-ink mb-1">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  children,
  faint,
}: {
  color?: string;
  label: string;
  children: ReactNode;
  faint?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2.5 h-[2px] rounded-full"
        style={{ backgroundColor: color, opacity: faint ? 0.4 : 1 }}
      />
      <span className="text-twin-ink-2 flex-1">{label}</span>
      <span className="text-twin-ink font-medium tabular-nums">{children}</span>
    </div>
  );
}

/** Horizontal bar list (part-to-whole / ranking). Labels and values stay in ink. */
export function BarList({
  items,
  formatValue = (v) => String(v),
  className,
}: {
  items: { label: string; value: number; color?: string; icon?: ReactNode }[];
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-1.5 text-twin-ink min-w-0">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="text-twin-ink font-medium tabular-nums">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-twin-raised overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? SERIES_COLORS[0],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
