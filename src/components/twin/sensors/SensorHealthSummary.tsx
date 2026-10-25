"use client";
import { useMemo } from "react";
import type { Sensor } from "@/types";
import {
  getSensorHealth,
  HEALTH_ORDER,
  HEALTH_STYLES,
  type SensorHealth,
} from "@/src/lib/sensor-meta";
import { HEALTH_ICONS, SegmentedControl } from "@/src/components/ui-kit";

export const countSensorHealth = (sensors: Sensor[]) => {
  const counts: Record<SensorHealth, number> = {
    normal: 0,
    warning: 0,
    critical: 0,
    offline: 0,
  };
  for (const s of sensors)
    counts[getSensorHealth(s.type, s.currentValue, s.status)]++;
  return counts;
};

/**
 * Health filter as a segmented toggle row with live counts. Status options show
 * icon + count (full label in tooltip / accessible name) so they fit one row.
 */
export function SensorHealthSummary({
  sensors,
  value,
  onChange,
  className,
}: {
  sensors: Sensor[];
  value: SensorHealth | "all";
  onChange: (value: SensorHealth | "all") => void;
  className?: string;
}) {
  const counts = useMemo(() => countSensorHealth(sensors), [sensors]);

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      ariaLabel="Filter sensors by health"
      className={className}
      options={[
        {
          value: "all",
          label: "All",
          count: sensors.length,
          title: `All sensors (${sensors.length})`,
        },
        ...HEALTH_ORDER.map((h) => {
          const Icon = HEALTH_ICONS[h];
          return {
            value: h,
            icon: (
              <Icon
                size={13}
                style={{ color: HEALTH_STYLES[h].color }}
                strokeWidth={2.4}
              />
            ),
            label: <span className="tabular-nums">{counts[h]}</span>,
            title: `${HEALTH_STYLES[h].label} (${counts[h]})`,
          };
        }),
      ]}
    />
  );
}
