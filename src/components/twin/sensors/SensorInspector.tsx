"use client";
import { Crosshair, Flame, LineChart } from "lucide-react";
import type { Sensor } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore } from "@/src/store/useUIStore";
import { getAirportConfig } from "@/constants/airports";
import { HEALTH_STYLES, getSensorEnvironment } from "@/src/lib/sensor-meta";
import { dispatchMapCommand } from "@/src/lib/map-commands";
import {
  Button,
  HealthPill,
  KeyValueList,
  PanelSection,
  RangeBar,
  Sparkline,
  ValueReadout,
} from "@/src/components/ui-kit";
import { useSensorView } from "./useSensorView";

const formatTime = (t: number | string | null | undefined) =>
  t
    ? new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

export function SensorInspector({ sensor }: { sensor: Sensor }) {
  const { meta, health, valueText, delta, history, zoneName } =
    useSensorView(sensor);
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const lastTelemetryAt = useAirportStore((s) => s.lastTelemetryAt);
  const isImmersiveActive = useAirportStore((s) => s.isImmersiveActive);
  const setImmersiveActive = useAirportStore((s) => s.setImmersiveActive);
  const setAnalyticsOpen = useUIStore((s) => s.setAnalyticsOpen);
  const airport = getAirportConfig(activeAirport);
  const Icon = meta.icon;
  const floorLevel =
    typeof sensor.zone === "object" ? sensor.zone?.floorLevel : undefined;
  const fmt = (v: number) => v.toFixed(meta.decimals);

  // Trend domain: recent samples padded, so live movement is readable; thresholds
  // and the normal band only draw where they fall inside this window
  const lo = history.length ? Math.min(...history) : meta.min;
  const hi = history.length ? Math.max(...history) : meta.max;
  const pad = Math.max((hi - lo) * 0.3, (meta.max - meta.min) * 0.02);
  const trendDomain: [number, number] = [
    Math.max(meta.min, lo - pad),
    Math.min(meta.max, hi + pad),
  ];

  const thresholds = [
    meta.bands.critHigh !== undefined && {
      label: "Critical above",
      value: `${fmt(meta.bands.critHigh)} ${meta.unit}`,
    },
    meta.bands.warnHigh !== undefined && {
      label: "Warning above",
      value: `${fmt(meta.bands.warnHigh)} ${meta.unit}`,
    },
    meta.bands.warnLow !== undefined && {
      label: "Warning below",
      value: `${fmt(meta.bands.warnLow)} ${meta.unit}`,
    },
    meta.bands.critLow !== undefined && {
      label: "Critical below",
      value: `${fmt(meta.bands.critLow)} ${meta.unit}`,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      {/* Live value hero */}
      <div className="px-3.5 pt-3.5 pb-4 border-b border-twin-line">
        <div className="flex items-center gap-1.5 text-[11px] text-twin-ink-2 mb-2">
          <Icon size={13} />
          <span className="font-medium">{meta.label}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <ValueReadout
            value={valueText}
            unit={meta.unit}
            delta={delta}
            deltaDecimals={meta.decimals}
            size="lg"
          />
          <HealthPill health={health} />
        </div>
        <RangeBar
          className="mt-4"
          value={sensor.currentValue}
          min={meta.min}
          max={meta.max}
          bands={meta.bands}
          unit={meta.unit}
          formatValue={fmt}
        />
      </div>

      <div className="flex gap-1.5 px-3.5 py-2.5 border-b border-twin-line">
        <Button
          icon={<Crosshair size={13} />}
          onClick={() => dispatchMapCommand({ type: "focus-selection" })}
        >
          Locate
        </Button>
        <Button
          icon={<Flame size={13} />}
          variant={isImmersiveActive ? "solid" : "outline"}
          onClick={() => setImmersiveActive(!isImmersiveActive)}
        >
          Heatmap
        </Button>
        <Button
          icon={<LineChart size={13} />}
          onClick={() => setAnalyticsOpen(true)}
          className="ml-auto"
        >
          Analytics
        </Button>
      </div>

      <PanelSection title="Live trend" meta={`${history.length} samples`}>
        <div className="pl-[72px] pr-3.5 pt-2">
          <Sparkline
            values={history}
            width={256}
            height={84}
            domain={trendDomain}
            bands={meta.bands}
            showThresholds
            showRange
            endColor={HEALTH_STYLES[health].color}
            formatValue={(v) => `${fmt(v)} ${meta.unit}`}
            ariaLabel={`${sensor.name} live trend with thresholds`}
          />
          <p className="mt-2 text-[10px] text-twin-ink-3">
            Shaded band = normal range · dashed lines = warning / critical
            thresholds
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Location">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Airport", value: `${airport.name} (${airport.id})` },
            { label: "Zone", value: zoneName },
            {
              label: "Level",
              value:
                floorLevel !== undefined
                  ? `L${String(floorLevel).padStart(2, "0")}`
                  : "—",
            },
            { label: "Elevation", value: `${(sensor.z ?? 0).toFixed(1)} m` },
            {
              label: "Placement",
              value:
                getSensorEnvironment(sensor) === "indoor"
                  ? "Inside building"
                  : "Airside / outdoor",
            },
            {
              label: "Coordinates",
              value: `${sensor.y.toFixed(5)}, ${sensor.x.toFixed(5)}`,
            },
          ]}
        />
      </PanelSection>

      <PanelSection title="Thresholds" defaultOpen={false}>
        <KeyValueList className="px-3.5" items={thresholds} />
      </PanelSection>

      <PanelSection title="Device" defaultOpen={false}>
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Sensor ID", value: sensor.id.slice(0, 8).toUpperCase() },
            { label: "Device status", value: sensor.status ?? "—" },
            {
              label: "Last sample",
              value: formatTime(lastTelemetryAt ?? sensor.lastReadAt),
            },
            { label: "Network", value: `IOT-VLAN-${airport.iotVlan}` },
          ]}
        />
      </PanelSection>
    </>
  );
}
