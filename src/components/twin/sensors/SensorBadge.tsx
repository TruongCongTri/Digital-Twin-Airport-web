"use client";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Sensor } from "@/types";
import { HEALTH_STYLES } from "@/src/lib/sensor-meta";
import {
  DeltaIndicator,
  HEALTH_ICONS,
  HealthPill,
  Sparkline,
} from "@/src/components/ui-kit";
import { useSensorView } from "./useSensorView";

/**
 * Map callout for a sensor, anchored at the top of its value column.
 * compact: type icon + live value + unit, with a status stripe and (for alerts) status icon.
 * expanded: adds name, zone, status pill, delta and a mini trend (hover / selection).
 */
export const SensorBadge = memo(function SensorBadge({
  sensor,
  expanded = false,
  selected = false,
  onSelect,
}: {
  sensor: Sensor;
  expanded?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { meta, health, valueText, delta, history, zoneName } =
    useSensorView(sensor);
  const Icon = meta.icon;
  const style = HEALTH_STYLES[health];
  const StatusIcon = HEALTH_ICONS[health];
  const isAlert = health === "critical" || health === "warning";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${sensor.name}: ${valueText} ${meta.unit}, ${style.label}`}
      className={cn(
        "twin-focus group flex flex-col text-left bg-twin-surface/95 backdrop-blur-sm rounded-md border shadow-[0_1px_3px_rgba(15,23,42,0.12)] overflow-hidden transition-shadow",
        selected
          ? "border-twin-accent ring-2 ring-twin-accent/25"
          : "border-twin-line hover:border-twin-line-strong",
      )}
    >
      <div className="flex items-stretch">
        <span
          className="w-[3px] shrink-0"
          style={{ backgroundColor: style.color }}
          aria-hidden
        />
        <div className="flex items-center gap-1.5 pl-1.5 pr-2 h-6">
          <Icon size={12} className="text-twin-ink-2 shrink-0" />
          <span className="text-[12px] font-semibold text-twin-ink tabular-nums">
            {valueText}
          </span>
          <span className="text-[10px] text-twin-ink-3">{meta.unit}</span>
          {isAlert && (
            <StatusIcon
              size={12}
              style={{ color: style.color }}
              strokeWidth={2.5}
              aria-hidden
            />
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 px-2.5 pt-1.5 pb-2 border-t border-twin-line w-[200px]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-twin-ink truncate">
              {sensor.name}
            </p>
            <p className="text-[10px] text-twin-ink-3 truncate">
              {meta.label} · {zoneName}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <HealthPill health={health} size="sm" />
            {delta !== null && (
              <DeltaIndicator delta={delta} decimals={meta.decimals} />
            )}
          </div>
          <Sparkline
            values={history}
            width={176}
            height={28}
            endColor={style.color}
            formatValue={(v) => `${v.toFixed(meta.decimals)} ${meta.unit}`}
            ariaLabel={`${sensor.name} recent trend`}
          />
        </div>
      )}
    </button>
  );
});
