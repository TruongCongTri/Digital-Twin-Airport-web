"use client";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Sensor } from "@/types";
import { HEALTH_STYLES } from "@/src/lib/sensor-meta";
import { HealthDot, Sparkline } from "@/src/components/ui-kit";
import { useSensorView } from "./useSensorView";

/** Dense list row: type icon, name + type, live trend, value + unit, status. */
export const SensorRow = memo(function SensorRow({
  sensor,
  selected,
  onSelect,
}: {
  sensor: Sensor;
  selected?: boolean;
  onSelect: (id: string) => void;
}) {
  const { meta, health, valueText, history } = useSensorView(sensor);
  const Icon = meta.icon;
  const style = HEALTH_STYLES[health];

  return (
    <button
      type="button"
      onClick={() => onSelect(sensor.id)}
      aria-current={selected}
      className={cn(
        "twin-focus w-full flex items-center gap-2.5 h-11 pl-3 pr-3.5 text-left border-l-2 transition-colors",
        selected
          ? "bg-twin-accent-soft border-twin-accent"
          : "border-transparent hover:bg-twin-raised",
      )}
    >
      <span className="w-7 h-7 rounded-md bg-twin-raised border border-twin-line flex items-center justify-center shrink-0">
        <Icon size={14} className="text-twin-ink-2" />
      </span>
      <span className="flex-1 min-w-0" title={sensor.name}>
        <span className="block text-[12px] font-medium text-twin-ink truncate">
          {meta.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-twin-ink-3 min-w-0">
          <HealthDot health={health} pulse />
          <span className="shrink-0">{style.label}</span>
          <span className="truncate">· {sensor.name}</span>
        </span>
      </span>
      {/* Auto-scaled to recent samples so small live changes are visible */}
      <Sparkline
        values={history}
        width={56}
        height={22}
        endColor={style.color}
        formatValue={(v) => v.toFixed(meta.decimals)}
        ariaLabel={`${sensor.name} trend`}
        className="shrink-0"
      />
      <span className="w-[68px] text-right shrink-0">
        <span className="text-[13px] font-semibold text-twin-ink tabular-nums">
          {valueText}
        </span>
        <span className="block text-[10px] text-twin-ink-3 leading-none">
          {meta.unit}
        </span>
      </span>
    </button>
  );
});
