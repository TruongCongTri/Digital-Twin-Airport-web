"use client";
import { useEffect, useState } from "react";
import { Boxes, Clock, Radio } from "lucide-react";
import { useAirportStore } from "@/src/store/airport-store";
import { getAirportConfig } from "@/constants/airports";
import { useBimManifest } from "@/src/lib/bim-manifest";
import { formatScenarioName } from "@/src/hooks/useSimulationControls";

function useSecondsSince(timestamp: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return timestamp ? Math.max(0, Math.round((now - timestamp) / 1000)) : null;
}

/** Bottom strip: data freshness, stream size, model source, coordinates, engine mode. */
export function StatusBar() {
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const sensors = useAirportStore((s) => s.sensors);
  const lastTelemetryAt = useAirportStore((s) => s.lastTelemetryAt);
  const simulationMode = useAirportStore((s) => s.simulationMode);
  const airport = getAirportConfig(activeAirport);
  const { data: manifest } = useBimManifest(airport.model?.baseUrl);
  const age = useSecondsSince(lastTelemetryAt);
  const stale = age !== null && age > 15;

  return (
    <footer className="h-7 shrink-0 flex items-center gap-4 px-3 bg-twin-surface border-t border-twin-line text-[11px] text-twin-ink-2 z-20">
      <span className="flex items-center gap-1.5">
        <Clock size={12} />
        {age === null ? "Waiting for telemetry" : `Updated ${age}s ago`}
        {stale && <span className="text-[#a12828] font-medium">· stale</span>}
      </span>
      <span className="flex items-center gap-1.5">
        <Radio size={12} />
        <span className="tabular-nums">{sensors.length}</span> streams
      </span>
      {manifest && (
        <span
          className="hidden md:flex items-center gap-1.5 truncate"
          title={manifest.source}
        >
          <Boxes size={12} />
          {manifest.schema ?? "IFC4"} · {manifest.storeys.length} storeys ·{" "}
          {manifest.source}
        </span>
      )}
      <span className="flex-1" />
      <span className="hidden md:inline tabular-nums text-twin-ink-3">
        {airport.center.lat.toFixed(5)}°N {airport.center.lng.toFixed(5)}°E ·
        WGS84
      </span>
      <span>
        Engine:{" "}
        {simulationMode === "NONE" || simulationMode === "GENERAL"
          ? "Normal"
          : formatScenarioName(simulationMode)}
      </span>
    </footer>
  );
}
