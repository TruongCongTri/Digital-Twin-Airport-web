"use client";
import { useId, useMemo, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

export interface SparkBands {
  warnLow?: number;
  critLow?: number;
  warnHigh?: number;
  critHigh?: number;
}

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Fixed y-domain; defaults to the data's own extent */
  domain?: [number, number];
  /** Shaded "normal" band and dashed threshold lines (inspector-size charts) */
  bands?: SparkBands;
  showThresholds?: boolean;
  showRange?: boolean;
  color?: string;
  endColor?: string;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
  className?: string;
}

const PAD_Y = 4;
const END_R = 3.5;

/**
 * Single-series trend line (2px) with an end marker and a hover crosshair + readout.
 * Sized for list rows by default; pass bands/showThresholds/showRange for the inspector.
 */
export function Sparkline({
  values,
  width = 88,
  height = 26,
  domain,
  bands,
  showThresholds = false,
  showRange = false,
  color = "#2a78d6",
  endColor,
  formatValue = (v) => v.toFixed(1),
  ariaLabel,
  className,
}: SparklineProps) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { points, yOf, lo, hi } = useMemo(() => {
    const finite = values.filter((v) => Number.isFinite(v));
    let lo = domain ? domain[0] : Math.min(...finite);
    let hi = domain ? domain[1] : Math.max(...finite);
    if (!finite.length) {
      lo = 0;
      hi = 1;
    }
    if (hi - lo < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    const yOf = (v: number) =>
      PAD_Y +
      (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) *
        (height - PAD_Y * 2);
    const step =
      values.length > 1 ? (width - END_R * 2) / (values.length - 1) : 0;
    const points = values.map((v, i) => [END_R + i * step, yOf(v)] as const);
    return { points, yOf, lo, hi };
  }, [values, domain, width, height]);

  if (values.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[10px] text-twin-ink-3",
          className,
        )}
        style={{ width, height }}
      >
        collecting…
      </div>
    );
  }

  const path = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join("");
  const last = points[points.length - 1];
  const hovered = hover !== null ? points[hover] : null;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const step = (width - END_R * 2) / (values.length - 1);
    setHover(
      Math.max(0, Math.min(values.length - 1, Math.round((x - END_R) / step))),
    );
  };

  const bandTop = bands?.warnHigh !== undefined ? yOf(bands.warnHigh) : PAD_Y;
  const bandBottom =
    bands?.warnLow !== undefined ? yOf(bands.warnLow) : height - PAD_Y;
  const thresholds =
    showThresholds && bands
      ? (
          [
            ["warnHigh", bands.warnHigh, "#fab219"],
            ["critHigh", bands.critHigh, "#d03b3b"],
            ["warnLow", bands.warnLow, "#fab219"],
            ["critLow", bands.critLow, "#d03b3b"],
          ] as const
        ).filter(([, v]) => v !== undefined && v > lo && v < hi)
      : [];

  return (
    <div
      className={cn("relative inline-flex", className)}
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="overflow-visible"
      >
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
        {bands && (
          <rect
            x={0}
            y={Math.min(bandTop, bandBottom)}
            width={width}
            height={Math.abs(bandBottom - bandTop)}
            fill="#2a78d6"
            opacity={0.06}
            clipPath={`url(#${clipId})`}
          />
        )}
        {thresholds.map(([key, v, stroke]) => (
          <line
            key={key}
            x1={0}
            x2={width}
            y1={yOf(v!)}
            y2={yOf(v!)}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hovered && (
          <line
            x1={hovered[0]}
            x2={hovered[0]}
            y1={0}
            y2={height}
            stroke="#0f172a"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        )}
        <circle
          cx={(hovered ?? last)[0]}
          cy={(hovered ?? last)[1]}
          r={END_R}
          fill={hovered ? color : (endColor ?? color)}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </svg>
      {showRange && (
        <>
          <span className="absolute -left-1 -translate-x-full top-0 text-[10px] text-twin-ink-3 tabular-nums">
            {formatValue(hi)}
          </span>
          <span className="absolute -left-1 -translate-x-full bottom-0 text-[10px] text-twin-ink-3 tabular-nums">
            {formatValue(lo)}
          </span>
        </>
      )}
      {hovered && hover !== null && (
        <span
          className="pointer-events-none absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-twin-ink text-white text-[10px] font-medium tabular-nums whitespace-nowrap z-10"
          style={{ left: Math.min(Math.max(hovered[0], 16), width - 16) }}
        >
          {formatValue(values[hover])}
        </span>
      )}
    </div>
  );
}
