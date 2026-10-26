"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crosshair,
  LayoutGrid,
  Plane as PlaneIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plane } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore } from "@/src/store/useUIStore";
import { dispatchMapCommand } from "@/src/lib/map-commands";
import { getAirportName } from "@/constants/airports";
import {
  IconButton,
  KeyValueList,
  Panel,
  PanelBody,
  PanelHeader,
  PanelSection,
  Stat,
  StatusTag,
  TimeSeriesChart,
} from "@/src/components/ui-kit";
import { humanize, PLANE_TONE } from "./asset-status";

type Tab = "overview" | "operations" | "aircraft";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "operations", label: "Operations", icon: ClipboardList },
  { id: "aircraft", label: "Aircraft", icon: PlaneIcon },
];

// --- flight phase model ---
const PHASES = {
  OUTBOUND: {
    title: "Departure sequence",
    steps: ["Gate", "Pushback", "Taxi out", "Takeoff", "Airborne"],
    index: (s: string) => ({ PUSHBACK: 1, TAXIING: 2, DEPARTED: 4 })[s] ?? 0,
  },
  TURNAROUND: {
    title: "Turnaround",
    steps: ["Arrival", "De-board", "Service", "Boarding", "Ready"],
    index: (s: string) => ({ PARKED: 2, BOARDING: 3 })[s] ?? 0,
  },
  INBOUND: {
    title: "Arrival sequence",
    steps: ["En route", "Approach", "Landed", "Taxi in", "At gate"],
    index: (s: string) =>
      ({ APPROACHING: 1, LANDED: 2, TAXIING: 3, PARKED: 4 })[s] ?? 0,
  },
} as const;

const phaseFor = (plane: Plane) => {
  const phase = PHASES[plane.direction] ?? PHASES.INBOUND;
  return { ...phase, current: phase.index(plane.status) };
};

// --- live telemetry trail (the store only keeps the latest sample) ---
interface Sample {
  t: number;
  speed: number;
  altitude: number;
}
const MAX_SAMPLES = 60;

function useTelemetryTrail(plane: Plane) {
  const [trail, setTrail] = useState<{ id: string; samples: Sample[] }>({
    id: plane.id,
    samples: [],
  });
  const { id, speed, altitude } = plane;
  const { latitude, longitude } = plane.position ?? {};

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- appends each socket update
    setTrail((prev) => ({
      id,
      samples: [
        ...(prev.id === id ? prev.samples : []),
        { t: Date.now(), speed: speed ?? 0, altitude: altitude ?? 0 },
      ].slice(-MAX_SAMPLES),
    }));
  }, [id, speed, altitude, latitude, longitude]);

  return trail.id === id ? trail.samples : [];
}

const verticalSpeed = (samples: Sample[]) => {
  if (samples.length < 2) return null;
  const a = samples[samples.length - 2];
  const b = samples[samples.length - 1];
  const minutes = (b.t - a.t) / 60_000;
  return minutes > 0 ? (b.altitude - a.altitude) / minutes : null;
};

const relativeTime = (samples: Sample[]) => (t: number | string) => {
  const last = samples[samples.length - 1]?.t ?? 0;
  const s = Math.round((last - Number(t)) / 1000);
  return s === 0 ? "now" : `-${s}s`;
};

// --- Overview tab ---
function PhaseTracker({ plane }: { plane: Plane }) {
  const { steps, current } = phaseFor(plane);
  return (
    <ol className="grid grid-cols-5 px-3.5 pt-1 pb-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className="relative flex flex-col items-center gap-1.5"
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-2.5 right-1/2 w-full h-0.5 -translate-y-1/2",
                  i <= current ? "bg-twin-accent" : "bg-twin-line",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 bg-twin-surface",
                done && "border-twin-accent bg-twin-accent text-white",
                active && "border-twin-accent",
                !done && !active && "border-twin-line-strong",
              )}
            >
              {done && <Check size={11} strokeWidth={3} />}
              {active && (
                <span className="w-2 h-2 rounded-full bg-twin-accent" />
              )}
            </span>
            <span
              className={cn(
                "text-[11px] text-center leading-tight",
                active ? "text-twin-ink font-semibold" : "text-twin-ink-3",
              )}
              aria-current={active ? "step" : undefined}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OverviewTab({ plane }: { plane: Plane }) {
  const samples = useTelemetryTrail(plane);
  const vs = verticalSpeed(samples);
  const phase = phaseFor(plane);
  const formatX = relativeTime(samples);
  // A single point is not a trend; show the empty state until a second update arrives
  const trend = samples.length > 1 ? samples : [];
  const stand = plane.parkingStand?.code ?? plane.gate ?? "Unassigned";
  const anomaly =
    plane.status === "DELAYED" ||
    plane.status === "DIVERTED" ||
    plane.status === "CANCELLED";

  return (
    <>
      {/* Route strip (same anatomy as the inspector hero, wider) */}
      <div className="px-3.5 pt-3.5 pb-4 border-b border-twin-line">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {plane.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plane.logoUrl}
                alt=""
                className="w-6 h-6 object-contain shrink-0"
              />
            )}
            <span className="text-[12px] text-twin-ink-2 truncate">
              {plane.airline} · {plane.flightNumber}
            </span>
          </div>
          <StatusTag tone={PLANE_TONE[plane.status] ?? "neutral"}>
            {humanize(plane.status)}
          </StatusTag>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[32px] font-semibold text-twin-ink leading-none tracking-tight">
              {plane.origin || "—"}
            </p>
            <p className="text-[11px] text-twin-ink-3 mt-1">Origin</p>
          </div>
          <div
            className="flex-1 flex items-center mx-4 text-twin-ink-3"
            aria-hidden
          >
            <span className="flex-1 border-t border-dashed border-twin-line-strong" />
            <PlaneIcon size={14} className="mx-2 rotate-45" />
            <span className="flex-1 border-t border-dashed border-twin-line-strong" />
          </div>
          <div className="text-right">
            <p className="text-[32px] font-semibold text-twin-ink leading-none tracking-tight">
              {plane.destination || "—"}
            </p>
            <p className="text-[11px] text-twin-ink-3 mt-1">Destination</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-twin-line border-b border-twin-line">
        {[
          {
            label: "Ground speed",
            value: `${Math.round(plane.speed ?? 0)} kt`,
            hint: `Mach ${((plane.speed ?? 0) / 666).toFixed(2)}`,
          },
          {
            label: "Altitude",
            value: `${Math.round(plane.altitude ?? 0).toLocaleString()} ft`,
            hint:
              vs == null
                ? undefined
                : `${vs > 0 ? "+" : ""}${Math.round(vs).toLocaleString()} fpm`,
          },
          {
            label: "Heading",
            value: `${Math.round(plane.heading ?? 0)}°`,
          },
          {
            label: "Stand",
            value: stand,
            hint: plane.assignedRunway
              ? `Runway ${plane.assignedRunway}`
              : undefined,
          },
        ].map((k) => (
          <div key={k.label} className="bg-twin-surface px-3.5 py-3">
            <Stat label={k.label} value={k.value} hint={k.hint} />
          </div>
        ))}
      </div>

      <PanelSection title={phase.title} meta={humanize(plane.direction)}>
        <PhaseTracker plane={plane} />
        {anomaly && (
          <p className="mx-3.5 mt-1 px-2.5 py-2 rounded-md bg-twin-raised text-[12px] text-twin-ink">
            Flight is <strong>{humanize(plane.status).toLowerCase()}</strong>;
            the sequence is on hold until operations update it.
          </p>
        )}
      </PanelSection>

      <PanelSection
        title="Ground speed"
        meta={`${samples.length} samples · live`}
      >
        <div className="px-3.5">
          <TimeSeriesChart
            data={trend.map((s) => ({ t: s.t, speed: s.speed }))}
            xKey="t"
            series={[{ key: "speed", label: "Ground speed" }]}
            formatX={formatX}
            formatY={(v) => Math.round(v).toString()}
            unit="kt"
            height={150}
            emptyText="Collecting live telemetry…"
          />
        </div>
      </PanelSection>

      <PanelSection title="Altitude" meta="live">
        <div className="px-3.5">
          <TimeSeriesChart
            data={trend.map((s) => ({ t: s.t, altitude: s.altitude }))}
            xKey="t"
            series={[{ key: "altitude", label: "Altitude" }]}
            formatX={formatX}
            formatY={(v) => Math.round(v).toLocaleString()}
            unit="ft"
            height={150}
            emptyText="Collecting live telemetry…"
          />
        </div>
      </PanelSection>
    </>
  );
}

// --- Operations tab (dispatch data is simulated; the API has no source for it yet) ---
function OperationsTab({ plane }: { plane: Plane }) {
  const weight = plane.weight ?? 245000;
  const kg = (v: number) => `${Math.floor(v).toLocaleString()} kg`;
  const outbound = plane.direction === "OUTBOUND";

  return (
    <>
      <PanelSection title="ATC clearance" meta="Simulated">
        <KeyValueList
          className="px-3.5"
          items={[
            {
              label: "Delivery 118.1",
              value: <StatusTag tone="good">Cleared</StatusTag>,
            },
            {
              label: "Ground 121.9",
              value: <StatusTag tone="good">Cleared</StatusTag>,
            },
            {
              label: "Tower 118.7",
              value: <StatusTag tone="warning">Standby</StatusTag>,
            },
            { label: "Squawk", value: "7700" },
          ]}
        />
      </PanelSection>

      <PanelSection title="Weight & balance" meta="Simulated">
        <div className="grid grid-cols-4 gap-px bg-twin-line border-y border-twin-line">
          {[
            { label: "Zero fuel", value: kg(weight * 0.6) },
            { label: "Trip fuel", value: kg(weight * 0.2) },
            {
              label: outbound ? "Takeoff wt" : "Landing wt",
              value: kg(weight),
            },
            { label: "CG", value: "26.4%", hint: "of MAC" },
          ].map((k) => (
            <div key={k.label} className="bg-twin-surface px-3.5 py-3">
              <Stat label={k.label} value={k.value} hint={k.hint} />
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Passenger manifest" meta="Simulated">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Total souls", value: "296 (284 pax / 12 crew)" },
            { label: "Class breakdown", value: "J 32 · Y 252" },
            { label: "Checked bags", value: "312 (4,680 kg)" },
            { label: "Special handling", value: "4 WCHR · 1 AVIH" },
          ]}
        />
      </PanelSection>
    </>
  );
}

// --- Aircraft tab ---
function AircraftTab({ plane }: { plane: Plane }) {
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  return (
    <>
      {plane.imageUrl && brokenImage !== plane.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={plane.imageUrl}
          alt=""
          onError={() => setBrokenImage(plane.imageUrl ?? null)}
          className="w-full h-40 object-cover border-b border-twin-line"
        />
      )}
      <PanelSection title="Flight">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Flight", value: plane.flightNumber },
            { label: "Callsign", value: plane.callsign ?? plane.flightNumber },
            { label: "Airline", value: plane.airline },
            { label: "Aircraft type", value: plane.aircraftType ?? "—" },
            { label: "Direction", value: humanize(plane.direction) },
            { label: "Status", value: humanize(plane.status) },
          ]}
        />
      </PanelSection>
      <PanelSection title="Location">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Airport", value: getAirportName(activeAirport) },
            {
              label: "Stand",
              value: plane.parkingStand?.code ?? plane.gate ?? "Unassigned",
            },
            { label: "Runway", value: plane.assignedRunway ?? "—" },
            {
              label: "Coordinates",
              value: `${(plane.position?.latitude ?? 0).toFixed(6)}, ${(plane.position?.longitude ?? 0).toFixed(6)}`,
            },
            {
              label: "Last update",
              value: plane.updatedAt
                ? new Date(plane.updatedAt).toLocaleString()
                : "—",
            },
          ]}
        />
      </PanelSection>
    </>
  );
}

/** Wide right dock: live telemetry, flight phase and dispatch data for the selected aircraft. */
export function PlaneAnalyticsPanel({ plane }: { plane: Plane }) {
  const [tab, setTab] = useState<Tab>("overview");
  const setAnalyticsOpen = useUIStore((s) => s.setAnalyticsOpen);
  const clearSelection = useAirportStore((s) => s.clearSelection);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const planes = useAirportStore((s) => s.planes);

  const index = useMemo(
    () => planes.findIndex((p) => p.id === plane.id),
    [planes, plane.id],
  );
  const step = (dir: 1 | -1) => {
    if (!planes.length) return;
    const next = planes[(index + dir + planes.length) % planes.length];
    selectEntity(next.id, "plane");
  };

  return (
    <Panel as="aside" className="w-[640px] max-w-[52vw] shrink-0 border-l">
      <PanelHeader
        icon={<PlaneIcon size={15} className="-rotate-45" />}
        title={plane.callsign || plane.flightNumber}
        subtitle={`Analytics · ${plane.airline}`}
        actions={
          <>
            <IconButton label="Previous aircraft" onClick={() => step(-1)}>
              <ChevronLeft size={16} />
            </IconButton>
            <span className="text-[11px] text-twin-ink-3 tabular-nums w-10 text-center select-none">
              {index + 1}/{planes.length}
            </span>
            <IconButton label="Next aircraft" onClick={() => step(1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton
              label="Locate on map"
              onClick={() => dispatchMapCommand({ type: "focus-selection" })}
            >
              <Crosshair size={16} />
            </IconButton>
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
        {tab === "overview" && <OverviewTab plane={plane} />}
        {tab === "operations" && <OperationsTab plane={plane} />}
        {tab === "aircraft" && <AircraftTab plane={plane} />}
      </PanelBody>
    </Panel>
  );
}
