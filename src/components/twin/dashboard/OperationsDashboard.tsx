"use client";
import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CloudSun,
  LayoutDashboard,
  Plane as PlaneIcon,
  Radio,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plane, Sensor } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";
import { getAirportConfig } from "@/constants/airports";
import {
  formatSensorValue,
  getSensorHealth,
  getSensorMeta,
  getZoneName,
  HEALTH_ORDER,
  HEALTH_STYLES,
} from "@/src/lib/sensor-meta";
import {
  BarList,
  DataTable,
  EmptyState,
  HEALTH_ICONS,
  HealthPill,
  IconButton,
  Panel,
  PanelBody,
  PanelHeader,
  PanelSection,
  SearchField,
  Stat,
  StatusTag,
  TimeSeriesChart,
  type DataColumn,
} from "@/src/components/ui-kit";
import { SensorRow } from "../sensors/SensorRow";
import { countSensorHealth } from "../sensors/SensorHealthSummary";
import { humanize, PLANE_TONE } from "../assets/asset-status";
import {
  useOperationsMetrics,
  type TimeDataPoint,
} from "./useOperationsMetrics";

const GROUND = ["LANDED", "TAXIING", "PARKED", "BOARDING", "PUSHBACK"];
const EMPTY: never[] = [];

/** Left dock: KPIs, health, alerts and live operational state. */
export function OperationsOverview() {
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const planes = useAirportStore((s) => s.planes);
  const sensors = useAirportStore((s) => s.sensors);
  const vehicles = useAirportStore((s) => s.vehicles ?? EMPTY);
  const selectedEntityId = useAirportStore((s) => s.selectedEntityId);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const toggleDashboard = useAirportStore((s) => s.toggleDashboard);
  const { latestData, planeStatuses } = useOperationsMetrics(true);
  const airport = getAirportConfig(activeAirport);

  const health = useMemo(() => countSensorHealth(sensors), [sensors]);
  const alerts = useMemo(
    () =>
      sensors
        .filter((s) => {
          const h = getSensorHealth(s.type, s.currentValue, s.status);
          return h === "critical" || h === "warning";
        })
        .sort(
          (a, b) =>
            HEALTH_ORDER.indexOf(
              getSensorHealth(a.type, a.currentValue, a.status),
            ) -
            HEALTH_ORDER.indexOf(
              getSensorHealth(b.type, b.currentValue, b.status),
            ),
        ),
    [sensors],
  );
  const onGround = planes.filter((p) => GROUND.includes(p.status)).length;

  return (
    <Panel as="aside" className="w-[340px] shrink-0 border-r">
      <PanelHeader
        icon={<LayoutDashboard size={15} />}
        title="Operations"
        subtitle={`${airport.fullName} · live`}
        actions={
          <IconButton label="Close dashboard" onClick={toggleDashboard}>
            <X size={16} />
          </IconButton>
        }
      />
      <PanelBody>
        <div className="grid grid-cols-2 gap-px bg-twin-line border-b border-twin-line">
          {[
            {
              label: "Flights tracked",
              value: planes.length,
              hint: `${onGround} on ground`,
            },
            {
              label: "Sensor alerts",
              value: health.critical + health.warning,
              hint: `${health.critical} critical`,
            },
            {
              label: "Sensors online",
              value: sensors.length - health.offline,
              hint: `of ${sensors.length}`,
            },
            {
              label: "Landside vehicles",
              value: vehicles.length,
              hint: "on curb loop",
            },
          ].map((k) => (
            <div key={k.label} className="bg-twin-surface px-3.5 py-3">
              <Stat label={k.label} value={k.value} hint={k.hint} />
            </div>
          ))}
        </div>

        <PanelSection title="Sensor health" meta={sensors.length}>
          <BarList
            className="px-3.5"
            items={HEALTH_ORDER.map((h) => {
              const Icon = HEALTH_ICONS[h];
              return {
                label: HEALTH_STYLES[h].label,
                value: health[h],
                color: HEALTH_STYLES[h].color,
                icon: (
                  <Icon
                    size={13}
                    style={{ color: HEALTH_STYLES[h].color }}
                    strokeWidth={2.4}
                  />
                ),
              };
            })}
          />
        </PanelSection>

        <PanelSection title="Active alerts" meta={alerts.length}>
          {alerts.length === 0 ? (
            <p className="px-3.5 pb-1 text-[12px] text-twin-ink-3">
              All sensors are within their normal range.
            </p>
          ) : (
            alerts
              .slice(0, 8)
              .map((s) => (
                <SensorRow
                  key={s.id}
                  sensor={s}
                  selected={s.id === selectedEntityId}
                  onSelect={(id) => selectEntity(id, "sensor")}
                />
              ))
          )}
        </PanelSection>

        <PanelSection title="Security queues" meta="Simulated">
          <BarList
            className="px-3.5"
            formatValue={(v) => `${Math.round(v)} min`}
            items={[
              { label: "T1 domestic wait", value: latestData.secT1 ?? 0 },
              { label: "T2 international wait", value: latestData.secT2 ?? 0 },
            ]}
          />
        </PanelSection>

        <PanelSection title="Ground support (GSE)" meta="Simulated">
          <div className="grid grid-cols-2 gap-3 px-3.5">
            <Stat
              label="Fuel trucks"
              value={`${latestData.gseFuel ?? 0} / 20`}
              hint="dispatched"
            />
            <Stat
              label="Baggage tugs"
              value={`${latestData.gseBag ?? 0} / 45`}
              hint="dispatched"
            />
          </div>
        </PanelSection>

        <PanelSection title="Flight status" meta={planes.length}>
          <BarList
            className="px-3.5"
            items={planeStatuses.map((s) => ({
              label: s.name,
              value: s.value,
            }))}
          />
        </PanelSection>
      </PanelBody>
    </Panel>
  );
}

// --- Right dock ---
type AnalyticsTab =
  | "traffic"
  | "ground"
  | "environment"
  | "flights"
  | "sensors";
const TABS: { id: AnalyticsTab; label: string; icon: typeof Activity }[] = [
  { id: "traffic", label: "Air traffic", icon: PlaneIcon },
  { id: "ground", label: "Ground ops", icon: Truck },
  { id: "environment", label: "Environment", icon: CloudSun },
  { id: "flights", label: "Flights", icon: BarChart3 },
  { id: "sensors", label: "Sensors", icon: Radio },
];

function chart(
  data: TimeDataPoint[],
  keys: { key: keyof TimeDataPoint; label: string; dashed?: boolean }[],
  unit?: string,
  decimals = 0,
) {
  return (
    <div className="px-3.5">
      <TimeSeriesChart
        data={data as unknown as Record<string, number | string>[]}
        xKey="time"
        series={keys.map((k) => ({
          key: k.key,
          label: k.label,
          dashed: k.dashed,
        }))}
        formatX={(t) => String(t).slice(0, 5)}
        formatY={(v) => v.toFixed(decimals)}
        unit={unit}
        height={170}
      />
    </div>
  );
}

function FlightsTable() {
  const planes = useAirportStore((s) => s.planes);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const [q, setQ] = useState("");
  const rows = planes.filter(
    (p) =>
      !q ||
      [p.flightNumber, p.airline, p.origin, p.status].some((t) =>
        t?.toLowerCase().includes(q.toLowerCase()),
      ),
  );
  const columns: DataColumn<Plane>[] = [
    {
      key: "f",
      header: "Flight",
      render: (p) => <span className="font-medium">{p.flightNumber}</span>,
      sortValue: (p) => p.flightNumber,
    },
    {
      key: "a",
      header: "Airline",
      render: (p) => p.airline,
      sortValue: (p) => p.airline,
    },
    {
      key: "r",
      header: "Route",
      render: (p) => `${p.origin} → ${p.destination}`,
    },
    {
      key: "s",
      header: "Status",
      render: (p) => (
        <StatusTag tone={PLANE_TONE[p.status] ?? "neutral"}>
          {humanize(p.status)}
        </StatusTag>
      ),
      sortValue: (p) => p.status,
    },
    { key: "g", header: "Stand", render: (p) => p.parkingStand?.code ?? "—" },
    {
      key: "v",
      header: "Speed",
      align: "right",
      render: (p) => `${Math.round(p.speed ?? 0)} kt`,
      sortValue: (p) => p.speed ?? 0,
    },
  ];
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3.5 py-3 border-b border-twin-line">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Flight, airline, origin, status"
        />
      </div>
      <DataTable
        bare
        className="flex-1 border-t-0"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={(p) => selectEntity(p.id, "plane")}
        pageSize={50}
      />
    </div>
  );
}

function SensorsTable() {
  const sensors = useAirportStore((s) => s.sensors);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const [q, setQ] = useState("");
  const rows = sensors.filter(
    (s) =>
      !q ||
      [s.name, getSensorMeta(s.type).label, getZoneName(s)].some((t) =>
        t?.toLowerCase().includes(q.toLowerCase()),
      ),
  );
  const columns: DataColumn<Sensor>[] = [
    {
      key: "n",
      header: "Sensor",
      render: (s) => <span className="font-medium">{s.name}</span>,
      sortValue: (s) => s.name,
    },
    {
      key: "t",
      header: "Type",
      render: (s) => getSensorMeta(s.type).label,
      sortValue: (s) => s.type,
    },
    {
      key: "z",
      header: "Zone",
      render: (s) => getZoneName(s),
      sortValue: (s) => getZoneName(s),
    },
    {
      key: "v",
      header: "Value",
      align: "right",
      render: (s) =>
        `${formatSensorValue(s.type, s.currentValue)} ${getSensorMeta(s.type).unit}`,
      sortValue: (s) => s.currentValue,
    },
    {
      key: "h",
      header: "Status",
      render: (s) => (
        <HealthPill
          size="sm"
          health={getSensorHealth(s.type, s.currentValue, s.status)}
        />
      ),
      sortValue: (s) =>
        HEALTH_ORDER.indexOf(getSensorHealth(s.type, s.currentValue, s.status)),
    },
  ];
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3.5 py-3 border-b border-twin-line">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Sensor, type, zone"
        />
      </div>
      <DataTable
        bare
        className="flex-1 border-t-0"
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        initialSort={{ key: "h", dir: "asc" }}
        onRowClick={(s) => selectEntity(s.id, "sensor")}
        pageSize={50}
      />
    </div>
  );
}

/** Right dock: operational trends and the directory tables. */
export function OperationsAnalytics() {
  const [tab, setTab] = useState<AnalyticsTab>("traffic");
  const { timeData, airlineData } = useOperationsMetrics(true);

  return (
    <Panel as="aside" className="w-[600px] max-w-[48vw] shrink-0 border-l">
      <PanelHeader
        icon={<BarChart3 size={15} />}
        title="Operations analytics"
        subtitle="Last 20 minutes · 1 min resolution"
      />
      <div
        role="tablist"
        className="flex gap-0.5 px-2 h-10 items-center border-b border-twin-line shrink-0 overflow-x-auto"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "twin-focus flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap",
              tab === id
                ? "bg-twin-accent-soft text-twin-accent"
                : "text-twin-ink-2 hover:bg-twin-raised",
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <PanelBody
        className={cn(
          (tab === "flights" || tab === "sensors") && "flex flex-col",
        )}
      >
        <div
          className={cn(
            "flex flex-col",
            (tab === "flights" || tab === "sensors") && "flex-1 min-h-0",
          )}
        >
          {tab === "traffic" && (
            <>
              <PanelSection title="Traffic vs runway capacity" meta="Simulated">
                {chart(timeData, [
                  { key: "flights", label: "Movements / h" },
                  { key: "capacity", label: "Runway capacity", dashed: true },
                ])}
              </PanelSection>
              <PanelSection
                title="Fleet by operator"
                meta={`${airlineData.length} airlines`}
              >
                {airlineData.length ? (
                  <BarList
                    className="px-3.5"
                    items={airlineData.map((a) => ({
                      label: a.name,
                      value: a.count,
                    }))}
                  />
                ) : (
                  <EmptyState title="No flights loaded" />
                )}
              </PanelSection>
              <PanelSection title="Average taxi times" meta="Simulated">
                {chart(
                  timeData,
                  [
                    { key: "taxiIn", label: "Taxi-in" },
                    { key: "taxiOut", label: "Taxi-out" },
                  ],
                  "min",
                )}
              </PanelSection>
            </>
          )}
          {tab === "ground" && (
            <>
              <PanelSection title="Security queue times" meta="Simulated">
                {chart(
                  timeData,
                  [
                    { key: "secT1", label: "T1" },
                    { key: "secT2", label: "T2" },
                    { key: "secT3", label: "T3" },
                  ],
                  "min",
                  1,
                )}
              </PanelSection>
              <PanelSection title="GSE deployed" meta="Simulated">
                {chart(timeData, [
                  { key: "gseFuel", label: "Fuel trucks" },
                  { key: "gseBag", label: "Baggage tugs" },
                ])}
              </PanelSection>
              <PanelSection title="Grid power load" meta="Simulated">
                {chart(
                  timeData,
                  [
                    { key: "powerT1", label: "T1" },
                    { key: "powerT2", label: "T2" },
                    { key: "powerT3", label: "T3" },
                  ],
                  "kWh",
                )}
              </PanelSection>
            </>
          )}
          {tab === "environment" && (
            <>
              {/* One measure per chart: no dual axes */}
              <PanelSection title="Indoor temperature (avg)" meta="Sensor logs">
                {chart(
                  timeData,
                  [{ key: "temp", label: "Temperature" }],
                  "°C",
                  1,
                )}
              </PanelSection>
              <PanelSection title="Relative humidity (avg)" meta="Sensor logs">
                {chart(timeData, [{ key: "hum", label: "Humidity" }], "%", 1)}
              </PanelSection>
              <PanelSection title="CO₂ concentration (avg)" meta="Sensor logs">
                {chart(timeData, [{ key: "co2", label: "CO₂" }], "ppm")}
              </PanelSection>
              <PanelSection title="Wind speed (avg)" meta="Sensor logs">
                {chart(timeData, [{ key: "wind", label: "Wind" }], "m/s", 1)}
              </PanelSection>
              <PanelSection
                title="Structural tilt (avg)"
                meta="Sensor logs · milli-degrees"
              >
                {chart(timeData, [{ key: "tilt", label: "Tilt" }], "m°", 2)}
              </PanelSection>
            </>
          )}
          {tab === "flights" && <FlightsTable />}
          {tab === "sensors" && <SensorsTable />}
        </div>
      </PanelBody>
    </Panel>
  );
}
