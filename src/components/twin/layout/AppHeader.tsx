"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  Boxes,
  Check,
  ChevronDown,
  LayoutDashboard,
  Plane,
  Play,
  Power,
  RotateCcw,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAirportStore } from "@/src/store/airport-store";
import { AIRPORTS, getAirportConfig } from "@/constants/airports";
import { useAirportUrlSync } from "@/src/hooks/useAirportUrlSync";
import {
  DEMO_SCENARIOS,
  formatScenarioName,
  useSimulationControls,
} from "@/src/hooks/useSimulationControls";
import {
  Button,
  HEALTH_ICONS,
  Menu,
  MenuDivider,
  MenuItem,
  MenuLabel,
} from "@/src/components/ui-kit";
import { HEALTH_STYLES } from "@/src/lib/sensor-meta";
import { countSensorHealth } from "../sensors/SensorHealthSummary";

function AirportSwitcher() {
  const { activeAirport, switchAirport } = useAirportUrlSync();
  const current = getAirportConfig(activeAirport);
  return (
    <Menu
      width={280}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="twin-focus flex items-center gap-2 h-8 pl-2 pr-1.5 rounded-md hover:bg-twin-raised"
        >
          <span className="text-[11px] font-semibold text-twin-accent bg-twin-accent-soft rounded px-1.5 h-5 inline-flex items-center">
            {current.id}
          </span>
          <span className="text-[13px] font-medium text-twin-ink">
            {current.fullName}
          </span>
          <ChevronDown size={14} className="text-twin-ink-3" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Facilities</MenuLabel>
          {AIRPORTS.map((a) => (
            <MenuItem
              key={a.id}
              active={a.id === activeAirport}
              icon={
                a.id === activeAirport ? (
                  <Check size={14} />
                ) : (
                  <span className="w-3.5" />
                )
              }
              hint={
                a.model ? (
                  <span className="inline-flex items-center gap-1">
                    <Boxes size={12} /> BIM
                  </span>
                ) : (
                  a.code
                )
              }
              onSelect={() => {
                switchAirport(a.id);
                close();
              }}
            >
              <span className="font-medium">{a.fullName}</span>
              <span className="text-twin-ink-3"> · {a.id}</span>
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

function SimulationMenu() {
  const sim = useSimulationControls();
  return (
    <Menu
      align="right"
      width={250}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            "twin-focus flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[12px] font-medium",
            sim.isNormal
              ? "border-twin-line text-twin-ink hover:border-twin-line-strong"
              : "border-[#f3c1c1] bg-[#fbe9e9] text-[#a12828]",
          )}
        >
          {sim.isNormal ? (
            <Play size={13} className="text-[#0ca30c]" fill="currentColor" />
          ) : (
            <AlertOctagon size={13} />
          )}
          {sim.isNormal
            ? "Live operations"
            : formatScenarioName(sim.activeScenario!)}
          <ChevronDown size={13} className="text-twin-ink-3" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Inject scenario</MenuLabel>
          {DEMO_SCENARIOS.map((s) => (
            <MenuItem
              key={s}
              active={sim.activeScenario === s}
              disabled={sim.isBusy}
              icon={
                sim.activeScenario === s ? (
                  <Check size={14} />
                ) : (
                  <span className="w-3.5" />
                )
              }
              onSelect={() => {
                sim.injectScenario(s);
                close();
              }}
            >
              {formatScenarioName(s)}
            </MenuItem>
          ))}
          {!sim.isNormal && (
            <MenuItem
              icon={<RotateCcw size={14} />}
              onSelect={() => {
                sim.clearScenario();
                close();
              }}
            >
              Restore normal operations
            </MenuItem>
          )}
          <MenuDivider />
          <MenuLabel>Engine</MenuLabel>
          <MenuItem
            icon={<Workflow size={14} />}
            disabled={sim.isBusy}
            onSelect={() => {
              sim.forcePipeline();
              close();
            }}
          >
            Force flight pipeline
          </MenuItem>
          <MenuItem
            tone="danger"
            icon={<Power size={14} />}
            disabled={sim.isBusy}
            onSelect={() => {
              sim.reboot();
              close();
            }}
          >
            Hard reset engine
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

function ConnectionStatus() {
  const connection = useAirportStore((s) => s.connection);
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const label = { live: "Live", connecting: "Connecting", offline: "Offline" }[
    connection
  ];
  const color = { live: "#0ca30c", connecting: "#fab219", offline: "#d03b3b" }[
    connection
  ];
  return (
    <div className="flex items-center gap-2 pl-3 border-l border-twin-line h-6">
      <span className="flex items-center gap-1.5 text-[12px] text-twin-ink-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {label}
      </span>
      <span className="text-[12px] text-twin-ink-3 tabular-nums whitespace-nowrap">
        {time}
      </span>
    </div>
  );
}

function KpiStrip() {
  const planes = useAirportStore((s) => s.planes);
  const sensors = useAirportStore((s) => s.sensors);
  const health = useMemo(() => countSensorHealth(sensors), [sensors]);
  const onGround = planes.filter((p) =>
    ["TAXIING", "PUSHBACK", "LANDED", "PARKED", "BOARDING"].includes(p.status),
  ).length;
  const moving = planes.filter((p) =>
    ["TAXIING", "PUSHBACK", "LANDED"].includes(p.status),
  ).length;
  const CritIcon = HEALTH_ICONS.critical;
  const WarnIcon = HEALTH_ICONS.warning;

  return (
    <div className="hidden lg:flex items-center gap-4 text-[12px] text-twin-ink-2">
      <span className="flex items-center gap-1.5">
        <Plane size={13} className="-rotate-45" />
        <b className="text-twin-ink tabular-nums">{onGround}</b> on ground
        <span className="text-twin-ink-3">· {moving} moving</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Activity size={13} />
        <b className="text-twin-ink tabular-nums">{sensors.length}</b> sensors
      </span>
      <span className="flex items-center gap-1" title="Critical sensors">
        <CritIcon size={13} style={{ color: HEALTH_STYLES.critical.color }} />
        <b className="text-twin-ink tabular-nums">{health.critical}</b> critical
      </span>
      <span className="flex items-center gap-1" title="Warning sensors">
        <WarnIcon size={13} style={{ color: HEALTH_STYLES.warning.color }} />
        <b className="text-twin-ink tabular-nums">{health.warning}</b> warning
      </span>
    </div>
  );
}

export function AppHeader() {
  const isDashboardOpen = useAirportStore((s) => s.isDashboardOpen);
  const selectedEntityId = useAirportStore((s) => s.selectedEntityId);
  const toggleDashboard = useAirportStore((s) => s.toggleDashboard);
  const clearSelection = useAirportStore((s) => s.clearSelection);
  const dashboardActive = isDashboardOpen && !selectedEntityId;

  return (
    <header className="h-12 shrink-0 flex items-center gap-3 px-3 bg-twin-surface border-b border-twin-line z-30">
      <div className="flex items-center gap-2 pr-3 border-r border-twin-line h-6">
        <span className="w-7 h-7 rounded-md bg-twin-accent text-white flex items-center justify-center">
          <Plane size={15} className="-rotate-45" />
        </span>
        <span className="text-[14px] font-semibold text-twin-ink tracking-tight">
          AeroTwin
        </span>
        <span className="hidden md:inline text-[11px] text-twin-ink-3">
          Airport Digital Twin
        </span>
      </div>
      <AirportSwitcher />
      <div className="flex-1" />
      <KpiStrip />
      <SimulationMenu />
      <Button
        icon={<LayoutDashboard size={14} />}
        variant={dashboardActive ? "solid" : "outline"}
        onClick={() => {
          // Selecting an entity also sets isDashboardOpen, so clear it first then toggle
          if (selectedEntityId) clearSelection();
          toggleDashboard();
        }}
      >
        Dashboard
      </Button>
      <ConnectionStatus />
    </header>
  );
}
