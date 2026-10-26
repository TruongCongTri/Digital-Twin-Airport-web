"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore } from "@/src/store/useUIStore";
import { VehicleFocusPanel } from "@/src/components/panels/VehicleFocusPanel";
import { preloadArcGIS } from "@/src/components/map/arcgis-modules";
import { AppHeader } from "@/src/components/twin/layout/AppHeader";
import { ExplorerPanel } from "@/src/components/twin/layout/ExplorerPanel";
import { InspectorPanel } from "@/src/components/twin/layout/InspectorPanel";
import { StatusBar } from "@/src/components/twin/layout/StatusBar";
import { MapBadges } from "@/src/components/twin/map/MapBadges";
import {
  ColumnLegend,
  ExplorerReopenButton,
  ViewToolbar,
} from "@/src/components/twin/map/ViewportControls";
import { useAttributionInset } from "@/src/components/twin/map/useAttributionInset";
import { SensorAnalyticsPanel } from "@/src/components/twin/sensors/SensorAnalyticsPanel";
import { PlaneAnalyticsPanel } from "@/src/components/twin/assets/PlaneAnalyticsPanel";
import {
  OperationsAnalytics,
  OperationsOverview,
} from "@/src/components/twin/dashboard/OperationsDashboard";
import { Button } from "@/src/components/ui-kit";

// Start downloading the ArcGIS SDK as soon as this page's JS runs (client only),
// in parallel with hydration and the initial telemetry fetch.
preloadArcGIS();

const ArcGISMap = dynamic(
  () => import("@/src/components/map/ArcGISMap").then((m) => m.ArcGISMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-twin-canvas text-[12px] text-twin-ink-3">
        <div className="w-8 h-8 border-2 border-twin-line rounded-full animate-spin border-t-twin-accent" />
        Loading 3D viewer…
      </div>
    ),
  },
);

export default function HomePage() {
  const selectedEntityId = useAirportStore((s) => s.selectedEntityId);
  const selectedEntityType = useAirportStore((s) => s.selectedEntityType);
  const selectedSensor = useAirportStore((s) => s.getSelectedSensor());
  const selectedPlane = useAirportStore((s) => s.getSelectedPlane());
  const isDashboardOpen = useAirportStore((s) => s.isDashboardOpen);
  const explorerOpen = useUIStore((s) => s.explorerOpen);
  const analyticsOpen = useUIStore((s) => s.analyticsOpen);
  const setAnalyticsOpen = useUIStore((s) => s.setAnalyticsOpen);
  const attributionInset = useAttributionInset();

  const dashboardOpen = isDashboardOpen && !selectedEntityId;
  const showAnalytics = analyticsOpen && !!selectedEntityId;
  const sensorAnalytics =
    showAnalytics && selectedEntityType === "sensor" && !!selectedSensor;
  const planeAnalytics =
    showAnalytics && selectedEntityType === "plane" && !!selectedPlane;
  // Vehicle deep-dives still float over the viewport (view padding keeps the focus visible)
  const floatingAnalytics = showAnalytics && selectedEntityType === "vehicle";

  // Analytics belongs to a selection; drop it when the selection goes away
  useEffect(() => {
    if (!selectedEntityId) setAnalyticsOpen(false);
  }, [selectedEntityId, setAnalyticsOpen]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-twin-canvas text-twin-ink">
      <AppHeader />
      <div className="flex-1 min-h-0 flex">
        {dashboardOpen ? (
          <OperationsOverview />
        ) : (
          explorerOpen && !floatingAnalytics && <ExplorerPanel />
        )}

        <main
          className="relative flex-1 min-w-0 overflow-hidden"
          aria-label="3D viewport"
        >
          <ArcGISMap />
          <MapBadges />
          {!floatingAnalytics && (
            <>
              <ViewToolbar />
              {!dashboardOpen && <ExplorerReopenButton />}
              <ColumnLegend />
            </>
          )}

          {floatingAnalytics && (
            <>
              <div
                data-viewport-overlay
                className="absolute inset-0 pointer-events-none"
              >
                <VehicleFocusPanel />
              </div>
              <Button
                variant="solid"
                icon={<X size={14} />}
                onClick={() => setAnalyticsOpen(false)}
                className="absolute left-1/2 -translate-x-1/2 z-40 shadow-lg"
                style={{ bottom: attributionInset + 8 }}
              >
                Back to inspector
              </Button>
            </>
          )}
        </main>

        {dashboardOpen ? (
          <OperationsAnalytics />
        ) : sensorAnalytics ? (
          <SensorAnalyticsPanel sensor={selectedSensor!} />
        ) : planeAnalytics ? (
          <PlaneAnalyticsPanel plane={selectedPlane!} />
        ) : (
          selectedEntityId && !floatingAnalytics && <InspectorPanel />
        )}
      </div>
      <StatusBar />
    </div>
  );
}
