"use client";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Car,
  Eye,
  EyeOff,
  Layers,
  MessageSquare,
  MessageSquareOff,
  PanelLeftClose,
  Plane,
  Radio,
  ScanLine,
  SplitSquareVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sensor, SensorType } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore, type ExplorerTab } from "@/src/store/useUIStore";
import { getAirportConfig } from "@/constants/airports";
import { BASEMAP_OPTIONS } from "@/src/lib/basemaps";
import { useBimManifest } from "@/src/lib/bim-manifest";
import {
  getSensorHealth,
  getZoneName,
  HEALTH_ORDER,
  SENSOR_META,
  SENSOR_TYPES,
} from "@/src/lib/sensor-meta";
import {
  ControlRow,
  EmptyState,
  IconButton,
  Panel,
  PanelBody,
  PanelSection,
  SearchField,
  SegmentedControl,
  Select,
  Switch,
} from "@/src/components/ui-kit";
import { SensorRow } from "../sensors/SensorRow";
import { SensorHealthSummary } from "../sensors/SensorHealthSummary";
import { PlaneRow, VehicleRow } from "../assets/AssetRows";

const EMPTY_VEHICLES: never[] = [];

// --- Sensors tab: health filter, search, rows grouped by zone ---
function SensorsTab() {
  const sensors = useAirportStore((s) => s.sensors);
  const selectedEntityId = useAirportStore((s) => s.selectedEntityId);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const search = useUIStore((s) => s.sensorSearch);
  const setSearch = useUIStore((s) => s.setSensorSearch);
  const healthFilter = useUIStore((s) => s.sensorHealthFilter);
  const setHealthFilter = useUIStore((s) => s.setSensorHealthFilter);
  const typeFilter = useUIStore((s) => s.sensorTypeFilter);
  const setTypeFilter = useUIStore((s) => s.setSensorTypeFilter);

  const typeOptions = useMemo(() => {
    const counts = new Map<SensorType, number>();
    for (const s of sensors) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    return [
      { value: "all" as const, label: "All types", count: sensors.length },
      ...SENSOR_TYPES.filter((t) => counts.has(t)).map((t) => {
        const Icon = SENSOR_META[t].icon;
        return {
          value: t,
          label: SENSOR_META[t].label,
          icon: <Icon size={14} />,
          count: counts.get(t),
        };
      }),
    ];
  }, [sensors]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const severity = (s: Sensor) =>
      HEALTH_ORDER.indexOf(getSensorHealth(s.type, s.currentValue, s.status));
    const filtered = sensors.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (
        healthFilter !== "all" &&
        getSensorHealth(s.type, s.currentValue, s.status) !== healthFilter
      )
        return false;
      if (!q) return true;
      return [s.name, SENSOR_META[s.type]?.label, getZoneName(s)].some((t) =>
        t?.toLowerCase().includes(q),
      );
    });
    const byZone = new Map<string, { floor: number; sensors: Sensor[] }>();
    for (const s of filtered) {
      const zone = getZoneName(s);
      const floor = typeof s.zone === "object" ? (s.zone?.floorLevel ?? 0) : 0;
      if (!byZone.has(zone)) byZone.set(zone, { floor, sensors: [] });
      byZone.get(zone)!.sensors.push(s);
    }
    return [...byZone.entries()]
      .map(([zone, g]) => ({
        zone,
        floor: g.floor,
        alerts: g.sensors.filter((s) => severity(s) < 2).length,
        sensors: g.sensors.sort(
          (a, b) => severity(a) - severity(b) || a.name.localeCompare(b.name),
        ),
      }))
      .sort(
        (a, b) =>
          b.alerts - a.alerts ||
          b.floor - a.floor ||
          a.zone.localeCompare(b.zone),
      );
  }, [sensors, search, healthFilter, typeFilter]);

  return (
    <>
      <div className="flex flex-col gap-2 p-3 border-b border-twin-line">
        <SensorHealthSummary
          sensors={sensors}
          value={healthFilter}
          onChange={setHealthFilter}
        />
        <div className="flex gap-2">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search sensors, zones"
            className="flex-1 min-w-0"
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            ariaLabel="Sensor type"
            className="w-[136px] shrink-0"
            width={250}
          />
        </div>
      </div>
      <PanelBody>
        {groups.length === 0 ? (
          <EmptyState
            icon={<Radio size={20} />}
            title="No sensors match"
            hint="Clear the search, health or type filter."
          />
        ) : (
          groups.map((g) => (
            <PanelSection
              key={g.zone}
              title={g.zone}
              meta={
                g.alerts > 0
                  ? `${g.sensors.length} · ${g.alerts} alert${g.alerts > 1 ? "s" : ""}`
                  : g.sensors.length
              }
            >
              {g.sensors.map((s) => (
                <SensorRow
                  key={s.id}
                  sensor={s}
                  selected={s.id === selectedEntityId}
                  onSelect={(id) => selectEntity(id, "sensor")}
                />
              ))}
            </PanelSection>
          ))
        )}
      </PanelBody>
    </>
  );
}

// --- Assets tab: flights and landside vehicles ---
function AssetsTab() {
  const planes = useAirportStore((s) => s.planes);
  const vehicles = useAirportStore((s) => s.vehicles ?? EMPTY_VEHICLES);
  const selectedEntityId = useAirportStore((s) => s.selectedEntityId);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const [kind, setKind] = useState<"flights" | "vehicles">("flights");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const flights = planes.filter(
    (p) =>
      !q ||
      [p.flightNumber, p.airline, p.origin, p.destination, p.status].some((t) =>
        t?.toLowerCase().includes(q),
      ),
  );
  const cars = vehicles.filter(
    (v) =>
      !q ||
      [v.licensePlate, v.companyName, v.type, v.status].some((t) =>
        t?.toLowerCase().includes(q),
      ),
  );

  return (
    <>
      <div className="flex flex-col gap-2 p-3 border-b border-twin-line">
        <SegmentedControl
          value={kind}
          onChange={setKind}
          ariaLabel="Asset type"
          options={[
            {
              value: "flights",
              label: "Flights",
              icon: <Plane size={13} className="-rotate-45" />,
              count: planes.length,
            },
            {
              value: "vehicles",
              label: "Vehicles",
              icon: <Car size={13} />,
              count: vehicles.length,
            },
          ]}
        />
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={
            kind === "flights"
              ? "Flight, airline, route, status"
              : "Plate, operator, status"
          }
        />
      </div>
      <PanelBody>
        {kind === "flights"
          ? flights.map((p) => (
              <PlaneRow
                key={p.id}
                plane={p}
                selected={p.id === selectedEntityId}
                onSelect={(id) => selectEntity(id, "plane")}
              />
            ))
          : cars.map((v) => (
              <VehicleRow
                key={v.id}
                vehicle={v}
                selected={v.id === selectedEntityId}
                onSelect={(id) => selectEntity(id, "vehicle")}
              />
            ))}
        {(kind === "flights" ? flights : cars).length === 0 && (
          <EmptyState title="Nothing to show" hint="Try a different search." />
        )}
      </PanelBody>
    </>
  );
}

// --- Layers tab: BIM storeys, overlays, sensor types, basemap ---
function VisibilityToggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <IconButton
      size="sm"
      label={`${on ? "Hide" : "Show"} ${label}`}
      onClick={onToggle}
    >
      {on ? (
        <Eye size={14} />
      ) : (
        <EyeOff size={14} className="text-twin-ink-3" />
      )}
    </IconButton>
  );
}

function BadgeToggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <IconButton
      size="sm"
      label={`${on ? "Hide" : "Show"} ${label} badges`}
      onClick={onToggle}
    >
      {on ? (
        <MessageSquare size={14} />
      ) : (
        <MessageSquareOff size={14} className="text-twin-ink-3" />
      )}
    </IconButton>
  );
}

function ModelSection({ baseUrl }: { baseUrl: string }) {
  const { data: manifest } = useBimManifest(baseUrl);
  const mapFilters = useAirportStore((s) => s.mapFilters);
  const toggleMapFilter = useAirportStore((s) => s.toggleMapFilter);
  const xray = useUIStore((s) => s.bimXray);
  const setXray = useUIStore((s) => s.setBimXray);
  const autoSection = useUIStore((s) => s.autoSection);
  const setAutoSection = useUIStore((s) => s.setAutoSection);
  const hidden = useUIStore((s) => s.hiddenStoreys);
  const toggleStorey = useUIStore((s) => s.toggleStorey);
  const setHidden = useUIStore((s) => s.setHiddenStoreys);
  const modelOn = mapFilters["bim"] !== false;
  const storeys = manifest?.storeys ?? [];

  return (
    <PanelSection
      title="BIM model"
      meta={manifest ? `${storeys.length} storeys` : undefined}
    >
      <ControlRow icon={<Boxes size={14} />} label="Terminal model">
        <Switch
          checked={modelOn}
          onChange={() => toggleMapFilter("bim")}
          label="Show BIM model"
        />
      </ControlRow>
      <ControlRow
        icon={<ScanLine size={14} />}
        label="X-ray (see sensors inside)"
        muted={!modelOn}
      >
        <Switch checked={xray} onChange={setXray} label="X-ray mode" />
      </ControlRow>
      <ControlRow
        icon={<SplitSquareVertical size={14} />}
        label="Cut away when a sensor is selected"
        muted={!modelOn}
      >
        <Switch
          checked={autoSection}
          onChange={setAutoSection}
          label="Auto cut-away on selection"
        />
      </ControlRow>
      <div className="mt-1 mx-3.5 mb-1 text-[10px] font-semibold uppercase tracking-wide text-twin-ink-3">
        Storeys
      </div>
      {[...storeys].reverse().map((st) => {
        const visible = !hidden.includes(st.id);
        return (
          <ControlRow
            key={st.id}
            label={st.name}
            meta={`${st.elevation >= 0 ? "+" : ""}${st.elevation.toFixed(1)} m`}
            muted={!visible || !modelOn}
            className="pl-6"
          >
            <IconButton
              size="sm"
              label={`Section at ${st.name} (hide storeys above)`}
              onClick={() =>
                setHidden(
                  storeys
                    .filter((o) => o.elevation > st.elevation)
                    .map((o) => o.id),
                )
              }
            >
              <SplitSquareVertical size={14} />
            </IconButton>
            <VisibilityToggle
              on={visible}
              onToggle={() => toggleStorey(st.id)}
              label={st.name}
            />
          </ControlRow>
        );
      })}
      {hidden.length > 0 && (
        <button
          type="button"
          onClick={() => setHidden([])}
          className="twin-focus mx-3.5 mt-1 text-[11px] font-medium text-twin-accent hover:underline"
        >
          Show all storeys
        </button>
      )}
    </PanelSection>
  );
}

function LayersTab() {
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const sensors = useAirportStore((s) => s.sensors);
  const mapFilters = useAirportStore((s) => s.mapFilters);
  const toggleMapFilter = useAirportStore((s) => s.toggleMapFilter);
  const badgeMode = useUIStore((s) => s.badgeMode);
  const setBadgeMode = useUIStore((s) => s.setBadgeMode);
  const basemap = useUIStore((s) => s.basemap);
  const setBasemap = useUIStore((s) => s.setBasemap);
  const airport = getAirportConfig(activeAirport);
  const on = (key: string) => mapFilters[key] !== false;

  const typeCounts = useMemo(() => {
    const counts = {} as Record<SensorType, number>;
    for (const s of sensors) counts[s.type] = (counts[s.type] ?? 0) + 1;
    return counts;
  }, [sensors]);
  const presentTypes = SENSOR_TYPES.filter((t) => typeCounts[t]);
  const allColumnsOn = presentTypes.every((t) => on(`cylinders_${t}`));

  return (
    <PanelBody>
      {airport.model && <ModelSection baseUrl={airport.model.baseUrl} />}

      <PanelSection title="Live overlays">
        <div className="px-3.5 pb-2">
          <p className="text-[11px] text-twin-ink-2 mb-1.5">Map badges</p>
          <SegmentedControl
            size="sm"
            value={badgeMode}
            onChange={setBadgeMode}
            ariaLabel="Map badge mode"
            options={[
              { value: "all", label: "All" },
              { value: "alerts", label: "Alerts only" },
              { value: "off", label: "Off" },
            ]}
          />
        </div>
        <ControlRow icon={<BarChart3 size={14} />} label="Sensor value columns">
          <Switch
            checked={allColumnsOn}
            onChange={(next) =>
              presentTypes.forEach(
                (t) =>
                  on(`cylinders_${t}`) !== next &&
                  toggleMapFilter(`cylinders_${t}`),
              )
            }
            label="Sensor value columns"
          />
        </ControlRow>
        <ControlRow
          icon={<Plane size={14} className="-rotate-45" />}
          label="Aircraft"
        >
          <BadgeToggle
            on={on("tooltips_planes")}
            onToggle={() => toggleMapFilter("tooltips_planes")}
            label="aircraft"
          />
          <VisibilityToggle
            on={on("planes")}
            onToggle={() => toggleMapFilter("planes")}
            label="aircraft"
          />
        </ControlRow>
        <ControlRow icon={<Car size={14} />} label="Landside vehicles">
          <BadgeToggle
            on={on("tooltips_vehicles")}
            onToggle={() => toggleMapFilter("tooltips_vehicles")}
            label="vehicle"
          />
          <VisibilityToggle
            on={on("vehicles")}
            onToggle={() => toggleMapFilter("vehicles")}
            label="vehicles"
          />
        </ControlRow>
      </PanelSection>

      <PanelSection title="Sensor types" meta={presentTypes.length}>
        {presentTypes.map((type) => {
          const meta = SENSOR_META[type];
          const Icon = meta.icon;
          const visible = on(type);
          return (
            <ControlRow
              key={type}
              icon={<Icon size={14} />}
              label={meta.label}
              meta={typeCounts[type]}
              muted={!visible}
            >
              <IconButton
                size="sm"
                label={`${on(`cylinders_${type}`) ? "Hide" : "Show"} ${meta.label} columns`}
                onClick={() => toggleMapFilter(`cylinders_${type}`)}
              >
                <BarChart3
                  size={14}
                  className={cn(!on(`cylinders_${type}`) && "text-twin-ink-3")}
                />
              </IconButton>
              <BadgeToggle
                on={on(`tooltips_${type}`)}
                onToggle={() => toggleMapFilter(`tooltips_${type}`)}
                label={meta.label}
              />
              <VisibilityToggle
                on={visible}
                onToggle={() => toggleMapFilter(type)}
                label={meta.label}
              />
            </ControlRow>
          );
        })}
      </PanelSection>

      <PanelSection title="Basemap" defaultOpen={false}>
        <div role="radiogroup" aria-label="Basemap">
          {BASEMAP_OPTIONS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={basemap === b.id}
              onClick={() => setBasemap(b.id)}
              className="twin-focus w-full flex items-center gap-2 h-8 px-3.5 text-left text-[12px] text-twin-ink hover:bg-twin-raised"
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded-full border shrink-0",
                  basemap === b.id
                    ? "border-twin-accent border-[4px]"
                    : "border-twin-line-strong",
                )}
              />
              {b.label}
            </button>
          ))}
        </div>
      </PanelSection>
    </PanelBody>
  );
}

const TABS: { id: ExplorerTab; label: string; icon: typeof Layers }[] = [
  { id: "sensors", label: "Sensors", icon: Radio },
  { id: "assets", label: "Assets", icon: Plane },
  { id: "layers", label: "Layers", icon: Layers },
];

/** Left dock: navigable inventory of the twin (sensors, assets) and viewer layers. */
export function ExplorerPanel() {
  const tab = useUIStore((s) => s.explorerTab);
  const setTab = useUIStore((s) => s.setExplorerTab);
  const setOpen = useUIStore((s) => s.setExplorerOpen);
  const activeAirport = useAirportStore((s) => s.activeAirport);

  return (
    <Panel as="aside" className="w-[340px] shrink-0 border-r">
      <div className="flex items-center h-11 px-2 gap-1 border-b border-twin-line shrink-0">
        <div role="tablist" className="flex gap-0.5 flex-1">
          {TABS.map(({ id, label, icon: Icon }) => (
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
              <Icon
                size={14}
                className={id === "assets" ? "-rotate-45" : undefined}
              />
              {label}
            </button>
          ))}
        </div>
        <IconButton label="Collapse explorer" onClick={() => setOpen(false)}>
          <PanelLeftClose size={16} />
        </IconButton>
      </div>
      {/* key: reset per-airport local state (searches, open sections) */}
      <div key={activeAirport} className="flex flex-col flex-1 min-h-0">
        {tab === "sensors" && <SensorsTab />}
        {tab === "assets" && <AssetsTab />}
        {tab === "layers" && <LayersTab />}
      </div>
    </Panel>
  );
}
