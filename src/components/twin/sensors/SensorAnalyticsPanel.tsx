"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  History,
  LayoutGrid,
  Radio,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sensor } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore } from "@/src/store/useUIStore";
import { getAirportConfig } from "@/constants/airports";
import {
  formatSensorValue,
  getSensorEnvironment,
  getSensorHealth,
  HEALTH_STYLES,
  type SensorHealth,
} from "@/src/lib/sensor-meta";
import { getRecommendation } from "@/src/lib/sensor-recommendations";
import {
  browserTimeZone,
  effectiveEnd,
  periodFor,
  type Period,
} from "@/src/lib/periods";
import {
  fetchSensorSeries,
  type SensorSeries,
  type SensorSeriesRow,
  type SeriesGranularity,
} from "@/src/lib/api-client";
import {
  Button,
  DataTable,
  HEALTH_ICONS,
  HealthPill,
  IconButton,
  KeyValueList,
  Panel,
  PanelBody,
  PanelHeader,
  PanelSection,
  PeriodPicker,
  RangeBar,
  Select,
  Stat,
  TimeSeriesChart,
  ValueReadout,
  type ChartThreshold,
  type DataColumn,
} from "@/src/components/ui-kit";
import { useSensorView } from "./useSensorView";

type Tab = "overview" | "history" | "device";

const TABS: { id: Tab; label: string; icon: typeof History }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "history", label: "History", icon: History },
  { id: "device", label: "Device", icon: Radio },
];

// --- shared helpers ---
const worstHealth = (
  sensor: Sensor,
  row: Pick<SensorSeriesRow, "min" | "max">,
): SensorHealth => {
  const a = getSensorHealth(sensor.type, row.min);
  const b = getSensorHealth(sensor.type, row.max);
  const rank = { critical: 0, warning: 1, normal: 2, offline: 3 };
  return rank[a] <= rank[b] ? a : b;
};

const thresholdsFor = (
  sensor: Sensor,
  meta: ReturnType<typeof useSensorView>["meta"],
): ChartThreshold[] => {
  const fmt = (v: number) => formatSensorValue(sensor.type, v);
  const { warnHigh, critHigh, warnLow, critLow } = meta.bands;
  return [
    warnHigh !== undefined && {
      value: warnHigh,
      label: `Warn ${fmt(warnHigh)}`,
      tone: "warning" as const,
    },
    critHigh !== undefined && {
      value: critHigh,
      label: `Crit ${fmt(critHigh)}`,
      tone: "critical" as const,
    },
    warnLow !== undefined && {
      value: warnLow,
      label: `Warn ${fmt(warnLow)}`,
      tone: "warning" as const,
    },
    critLow !== undefined && {
      value: critLow,
      label: `Crit ${fmt(critLow)}`,
      tone: "critical" as const,
    },
  ].filter(Boolean) as ChartThreshold[];
};

const bucketLabel = (
  iso: string,
  granularity: SensorSeries["granularity"],
  multiDay: boolean,
) => {
  const d = new Date(iso);
  if (granularity === "day")
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return multiDay
    ? `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${time}`
    : time;
};

// Render-stable clock, refreshed once a minute (the API flushes samples every minute)
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useSeries(
  sensorId: string,
  period: Period,
  granularity: SeriesGranularity,
) {
  const now = useMinuteClock();
  const end = effectiveEnd(period, new Date(now));
  const live = period.end.getTime() > now;
  return useQuery({
    queryKey: [
      "sensor-series",
      sensorId,
      period.start.toISOString(),
      live ? "live" : end.toISOString(),
      granularity,
    ],
    queryFn: () =>
      fetchSensorSeries(sensorId, {
        startDate: period.start.toISOString(),
        endDate: effectiveEnd(period).toISOString(),
        granularity,
        tz: browserTimeZone(),
      }),
    staleTime: 30_000,
    refetchInterval: live ? 60_000 : false, // the API flushes samples once a minute
    retry: false,
  });
}

// --- Overview tab ---
function OverviewTab({ sensor }: { sensor: Sensor }) {
  const { meta, health, valueText, delta, history } = useSensorView(sensor);
  const forecast = useAirportStore((s) => s.aiForecasts[sensor.id]);
  const thresholds = thresholdsFor(sensor, meta);
  const fmt = (v: number) => formatSensorValue(sensor.type, v);

  // Last 24 h from hourly rollups
  const [dayPeriod] = useState<Period>(() => {
    const end = new Date();
    return {
      kind: "custom",
      start: new Date(end.getTime() - 24 * 3600e3),
      end: new Date(end.getTime() + 3600e3),
    };
  });
  const { data: day } = useSeries(sensor.id, dayPeriod, "hour");

  const recommendation = getRecommendation(
    sensor.type,
    sensor.currentValue,
    forecast?.predictions?.[0]?.predictedValue,
  );
  const RecIcon = HEALTH_ICONS[recommendation.severity];

  const forecastColumns: DataColumn<
    NonNullable<typeof forecast>["predictions"][number]
  >[] = [
    { key: "h", header: "Horizon", render: (p) => p.horizonLabel },
    {
      key: "t",
      header: "Time",
      render: (p) =>
        new Date(p.timestamp).toLocaleString(undefined, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "v",
      header: `Predicted (${meta.unit})`,
      align: "right",
      render: (p) => fmt(p.predictedValue),
    },
    {
      key: "c",
      header: "Confidence",
      align: "right",
      render: (p) => `${Math.round(p.confidenceScore * 100)}%`,
    },
    {
      key: "s",
      header: "Status",
      render: (p) => (
        <HealthPill
          size="sm"
          health={getSensorHealth(sensor.type, p.predictedValue)}
        />
      ),
    },
  ];

  return (
    <>
      {/* Live value strip (same anatomy as the inspector hero) */}
      <div className="px-3.5 pt-3.5 pb-4 border-b border-twin-line">
        <div className="flex items-end justify-between gap-3">
          <ValueReadout
            label={meta.label}
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
      {day?.summary.samples ? (
        <div className="grid grid-cols-4 gap-px bg-twin-line border-b border-twin-line">
          {[
            {
              label: "24h min",
              value: `${fmt(day.summary.min!)} ${meta.unit}`,
            },
            {
              label: "24h avg",
              value: `${fmt(day.summary.avg!)} ${meta.unit}`,
            },
            {
              label: "24h max",
              value: `${fmt(day.summary.max!)} ${meta.unit}`,
            },
            { label: "Samples", value: day.summary.samples.toLocaleString() },
          ].map((k) => (
            <div key={k.label} className="bg-twin-surface px-3.5 py-3">
              <Stat label={k.label} value={k.value} />
            </div>
          ))}
        </div>
      ) : null}

      <PanelSection title="Recommended action" meta="Rule engine">
        <div className="flex items-start gap-2.5 px-3.5 pb-1">
          <RecIcon
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: HEALTH_STYLES[recommendation.severity].color }}
          />
          <p className="text-[13px] text-twin-ink leading-snug">
            {recommendation.text}
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Live trend" meta={`${history.length} samples · 3 s`}>
        <div className="px-3.5">
          <TimeSeriesChart
            data={history.map((v, i) => ({ i, value: v }))}
            xKey="i"
            series={[{ key: "value", label: meta.label }]}
            thresholds={thresholds}
            formatX={(i) => `-${(history.length - 1 - Number(i)) * 3}s`}
            formatY={fmt}
            unit={meta.unit}
            height={150}
          />
        </div>
      </PanelSection>

      <PanelSection title="Last 24 hours" meta="Hourly rollups">
        <div className="px-3.5">
          <TimeSeriesChart
            data={(day?.rows ?? []).map((r) => ({
              t: r.bucket,
              avg: r.avg,
              range: [r.min, r.max] as [number, number],
            }))}
            xKey="t"
            series={[{ key: "avg", label: "Hourly average" }]}
            band={{ key: "range", label: "Min–max" }}
            thresholds={thresholds}
            formatX={(t) => bucketLabel(String(t), "hour", false)}
            formatY={fmt}
            unit={meta.unit}
            height={170}
            emptyText="History is still being collected for this sensor"
          />
        </div>
      </PanelSection>

      <PanelSection
        title="AI forecast"
        meta={forecast ? "Simulation engine" : "Waiting for forecast"}
      >
        {forecast?.predictions?.length ? (
          <DataTable
            bare
            columns={forecastColumns}
            rows={forecast.predictions}
            rowKey={(p) => p.horizonLabel}
            pageSize={10}
          />
        ) : (
          <p className="px-3.5 pb-1 text-[12px] text-twin-ink-3">
            Forecasts arrive every few seconds from the simulation engine.
          </p>
        )}
      </PanelSection>
    </>
  );
}

// --- History tab (datatable) ---
const GRANULARITY_OPTIONS: { value: SeriesGranularity; label: string }[] = [
  { value: "auto", label: "Auto resolution" },
  { value: "raw", label: "Raw (1 min)" },
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
];

function downloadCsv(sensor: Sensor, unit: string, series: SensorSeries) {
  const header = [
    "bucket_utc",
    "local_time",
    `avg_${unit}`,
    `min_${unit}`,
    `max_${unit}`,
    "samples",
  ];
  const lines = series.rows.map((r) =>
    [
      r.bucket,
      new Date(r.bucket).toLocaleString(),
      r.avg,
      r.min,
      r.max,
      r.count,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sensor.name}_${series.granularity}_${series.startDate.slice(0, 10)}_${series.endDate.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function HistoryTab({ sensor }: { sensor: Sensor }) {
  const { meta } = useSensorView(sensor);
  const [period, setPeriod] = useState<Period>(() =>
    periodFor("day", new Date()),
  );
  const [granularity, setGranularity] = useState<SeriesGranularity>("auto");
  const { data, isFetching, error } = useSeries(sensor.id, period, granularity);
  const fmt = (v: number) => formatSensorValue(sensor.type, v);
  const multiDay = period.end.getTime() - period.start.getTime() > 24 * 3600e3;

  const columns = useMemo<DataColumn<SensorSeriesRow>[]>(
    () => [
      {
        key: "time",
        header:
          data?.granularity === "day"
            ? "Day"
            : data?.granularity === "hour"
              ? "Hour starting"
              : "Time",
        render: (r) =>
          data?.granularity === "day"
            ? new Date(r.bucket).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : new Date(r.bucket).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
        sortValue: (r) => r.bucket,
      },
      {
        key: "avg",
        header: `Avg (${meta.unit})`,
        align: "right",
        render: (r) => fmt(r.avg),
        sortValue: (r) => r.avg,
      },
      ...(data?.granularity === "raw"
        ? []
        : [
            {
              key: "min",
              header: "Min",
              align: "right" as const,
              render: (r: SensorSeriesRow) => fmt(r.min),
              sortValue: (r: SensorSeriesRow) => r.min,
            },
            {
              key: "max",
              header: "Max",
              align: "right" as const,
              render: (r: SensorSeriesRow) => fmt(r.max),
              sortValue: (r: SensorSeriesRow) => r.max,
            },
            {
              key: "n",
              header: "Samples",
              align: "right" as const,
              render: (r: SensorSeriesRow) => r.count.toLocaleString(),
              sortValue: (r: SensorSeriesRow) => r.count,
            },
          ]),
      {
        key: "status",
        header: "Status",
        render: (r) => <HealthPill size="sm" health={worstHealth(sensor, r)} />,
        sortValue: (r) =>
          ({ critical: 0, warning: 1, normal: 2, offline: 3 })[
            worstHealth(sensor, r)
          ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.granularity, meta.unit, sensor.type],
  );

  const alertRows =
    data?.rows.filter((r) => worstHealth(sensor, r) !== "normal").length ?? 0;

  return (
    <>
      {/* Query controls */}
      <div className="flex flex-col gap-2 px-3.5 py-3 border-b border-twin-line">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="flex items-center gap-2">
          <Select
            value={granularity}
            onChange={setGranularity}
            options={GRANULARITY_OPTIONS}
            ariaLabel="Resolution"
            align="left"
            className="w-[170px]"
            width={200}
          />
          <span className="text-[11px] text-twin-ink-3 flex-1 truncate">
            {data
              ? `Showing ${data.granularity === "raw" ? "raw minute samples" : `${data.granularity === "hour" ? "hourly" : "daily"} rollups`}`
              : ""}
            {isFetching ? " · updating…" : ""}
          </span>
          <Button
            icon={<Download size={13} />}
            disabled={!data?.rows.length}
            onClick={() => data && downloadCsv(sensor, meta.unit, data)}
          >
            CSV
          </Button>
        </div>
      </div>

      {error ? (
        <div className="px-3.5 py-3 border-b border-twin-line bg-[#fbe9e9] text-[12px] text-[#a12828]">
          {(error as Error).message}
        </div>
      ) : null}

      {/* Period summary */}
      <div className="grid grid-cols-5 gap-px bg-twin-line border-b border-twin-line">
        {[
          {
            label: "Samples",
            value: data ? data.summary.samples.toLocaleString() : "—",
          },
          {
            label: "Min",
            value:
              data?.summary.min != null
                ? `${fmt(data.summary.min)} ${meta.unit}`
                : "—",
          },
          {
            label: "Average",
            value:
              data?.summary.avg != null
                ? `${fmt(data.summary.avg)} ${meta.unit}`
                : "—",
          },
          {
            label: "Max",
            value:
              data?.summary.max != null
                ? `${fmt(data.summary.max)} ${meta.unit}`
                : "—",
          },
          {
            label: "In alert",
            value: data ? `${alertRows} / ${data.rows.length}` : "—",
            hint: "rows",
          },
        ].map((k) => (
          <div key={k.label} className="bg-twin-surface px-3.5 py-3">
            <Stat label={k.label} value={k.value} hint={k.hint} />
          </div>
        ))}
      </div>

      <PanelSection
        title="Trend"
        meta={data ? `${data.rows.length} rows` : undefined}
      >
        <div className="px-3.5">
          <TimeSeriesChart
            data={(data?.rows ?? []).map((r) => ({
              t: r.bucket,
              avg: r.avg,
              range: [r.min, r.max] as [number, number],
            }))}
            xKey="t"
            series={[
              {
                key: "avg",
                label: data?.granularity === "raw" ? "Reading" : "Average",
              },
            ]}
            band={
              data && data.granularity !== "raw"
                ? { key: "range", label: "Min–max" }
                : undefined
            }
            thresholds={thresholdsFor(sensor, meta)}
            formatX={(t) =>
              bucketLabel(String(t), data?.granularity ?? "hour", multiDay)
            }
            formatY={fmt}
            unit={meta.unit}
            height={180}
          />
        </div>
      </PanelSection>

      <PanelSection
        title="Data"
        meta={data ? `${data.rows.length} rows` : undefined}
      >
        <DataTable
          bare
          className="h-[420px]"
          columns={columns}
          rows={data?.rows ?? []}
          rowKey={(r) => r.bucket}
          initialSort={{ key: "time", dir: "desc" }}
          emptyText={isFetching ? "Loading…" : "No samples in this period"}
          pageSize={50}
        />
        {data && (
          <p className="px-3.5 pt-2.5 text-[11px] text-twin-ink-3">
            Raw samples are stored once a minute and kept for{" "}
            {data.retention.rawHours} h; hourly rollups are kept for{" "}
            {data.retention.rollupDays} days. Times shown in {data.tz}.
          </p>
        )}
      </PanelSection>
    </>
  );
}

// --- Device tab ---
function DeviceTab({ sensor }: { sensor: Sensor }) {
  const { meta, zoneName } = useSensorView(sensor);
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const airport = getAirportConfig(activeAirport);
  const floorLevel =
    typeof sensor.zone === "object" ? sensor.zone?.floorLevel : undefined;
  return (
    <>
      {sensor.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sensor.imageUrl}
          alt=""
          className="w-full h-36 object-cover border-b border-twin-line"
        />
      )}
      <PanelSection title="Device">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Sensor ID", value: sensor.id },
            { label: "Name", value: sensor.name },
            { label: "Type", value: meta.label },
            { label: "Device status", value: sensor.status },
            {
              label: "Last DB flush",
              value: sensor.lastReadAt
                ? new Date(sensor.lastReadAt).toLocaleString()
                : "—",
            },
          ]}
        />
      </PanelSection>
      <PanelSection title="Location">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Airport", value: `${airport.fullName} (${airport.id})` },
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
              value: `${sensor.y.toFixed(6)}, ${sensor.x.toFixed(6)}`,
            },
          ]}
        />
      </PanelSection>
      <PanelSection title="Network">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "VLAN", value: `IOT-VLAN-${airport.iotVlan}` },
            {
              label: "MQTT topic",
              value: `/v1/${airport.id.toLowerCase()}/${sensor.type.toLowerCase()}/${sensor.id.slice(0, 8)}`,
            },
            { label: "Telemetry rate", value: "3 s (live) · 60 s (stored)" },
          ]}
        />
      </PanelSection>
    </>
  );
}

/** Wide right dock: deep analytics + history datatable for the selected sensor. */
export function SensorAnalyticsPanel({ sensor }: { sensor: Sensor }) {
  const [tab, setTab] = useState<Tab>("overview");
  const setAnalyticsOpen = useUIStore((s) => s.setAnalyticsOpen);
  const clearSelection = useAirportStore((s) => s.clearSelection);
  const { meta, zoneName } = useSensorView(sensor);
  const Icon = meta.icon;

  return (
    <Panel as="aside" className="w-[640px] max-w-[52vw] shrink-0 border-l">
      <PanelHeader
        icon={<Icon size={15} />}
        title={sensor.name}
        subtitle={`Analytics · ${meta.label} · ${zoneName}`}
        actions={
          <>
            <IconButton
              label="Back to inspector"
              onClick={() => setAnalyticsOpen(false)}
            >
              <ArrowLeft size={16} />
            </IconButton>
            <IconButton label="Close" onClick={clearSelection}>
              <X size={16} />
            </IconButton>
          </>
        }
      />
      <div
        role="tablist"
        className="flex gap-0.5 px-2 h-10 items-center border-b border-twin-line shrink-0"
      >
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "twin-focus flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium",
              tab === id
                ? "bg-twin-accent-soft text-twin-accent"
                : "text-twin-ink-2 hover:bg-twin-raised",
            )}
          >
            <TabIcon size={14} />
            {label}
          </button>
        ))}
      </div>
      <PanelBody>
        {tab === "overview" && <OverviewTab sensor={sensor} />}
        {tab === "history" && <HistoryTab sensor={sensor} />}
        {tab === "device" && <DeviceTab sensor={sensor} />}
      </PanelBody>
    </Panel>
  );
}
