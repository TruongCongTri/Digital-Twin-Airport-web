"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAirportStore } from "@/src/store/airport-store";
import { useSocket } from "@/src/hooks/use-socket";
import { fetchInitialTelemetry } from "@/src/lib/api-client";
import { AirportDashboard } from "@/src/components/dashboard/AirportDashboard";
import { MapTooltips } from "@/src/components/map/MapTooltips";
import { PlaneFocusPanel } from "@/src/components/panels/PlaneFocusPanel";
import { SensorFocusPanel } from "@/src/components/panels/SensorFocusPanel";
import { DashboardToggle } from "@/src/components/DashboardToggle";
import { TopBar } from "@/src/components/TopBar";

const ArcGISMap = dynamic(
  () => import("@/src/components/map/ArcGISMap").then((m) => m.ArcGISMap),
  { ssr: false },
);

export default function HomePage() {
  const selectedEntityType = useAirportStore(
    (state) => state.selectedEntityType,
  );
  const setInitialData = useAirportStore((state) => state.setInitialData);
  const [loading, setLoading] = useState(true);

  // 1. Connect Live Sockets
  useSocket();

  // 2. Hydrate Base Data
  useEffect(() => {
    fetchInitialTelemetry()
      .then(({ sensors, flights }) => {
        setInitialData(sensors, flights);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch initial telemetry.", err);
        setLoading(false);
      });
  }, [setInitialData]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#F7F7F8] cursor-none">
      {/* Base Layer */}
      {!loading && <ArcGISMap />}
      {!loading && <MapTooltips />}

      {/* Floating UI */}
      <TopBar />
      <AirportDashboard />

      {/* Context Panels */}
      {selectedEntityType === "plane" && <PlaneFocusPanel />}
      {selectedEntityType === "sensor" && <SensorFocusPanel />}

      <DashboardToggle />

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F7F7F8]/80 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-[#e5e7eb] rounded-full animate-spin border-t-[#1e3a8a]"></div>
        </div>
      )}
    </main>
  );
}
