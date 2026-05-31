"use client";

import dynamic from "next/dynamic";
import { useAirportStore } from "@/src/store/airport-store";
import { AirportDashboard } from "@/src/components/dashboard/AirportDashboard";
import { MapTooltips } from "@/src/components/map/MapTooltips";
import { PlaneFocusPanel } from "@/src/components/panels/PlaneFocusPanel";
import { SensorFocusPanel } from "@/src/components/panels/SensorFocusPanel";
import { DashboardToggle } from "@/src/components/DashboardToggle";
import { TopBar } from "@/src/components/TopBar";

// 1. Delegate the loading state directly to the dynamic map import
const ArcGISMap = dynamic(
  () => import("@/src/components/map/ArcGISMap").then((m) => m.ArcGISMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#F7F7F8]">
        <div className="w-12 h-12 border-4 border-[#e5e7eb] rounded-full animate-spin border-t-[#1e3a8a]" />
      </div>
    ),
  },
);

export function ClientPageRoot() {
  const selectedEntityType = useAirportStore(
    (state) => state.selectedEntityType,
  );

  // 2. The `mounted` state and `useEffect` are completely removed!

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#F7F7F8] cursor-none">
      {/* Base Layer - Now handles its own loading state seamlessly */}
      <ArcGISMap />
      <MapTooltips />

      {/* Floating UI - Renders instantly */}
      <TopBar />
      <AirportDashboard />

      {/* Context Panels */}
      {selectedEntityType === "plane" && <PlaneFocusPanel />}
      {selectedEntityType === "sensor" && <SensorFocusPanel />}

      {/* Core Controllers */}
      <DashboardToggle />
    </main>
  );
}
