"use client";
import { create } from "zustand";
import type {
  AppState,
  EntityType,
  Plane,
  Sensor,
  TooltipData,
  AirportMetrics,
  PlaneStatus,
  SensorStatus,
  SimulationMode,
  AIPredictionPayload,
  PlaneDirection,
} from "@/types";
import {
  fetchAllSensorLogs,
  fetchFlights,
  fetchSensors,
  fetchSimulationStatus,
  fetchStaticFlights,
  fetchStaticSensors,
  FlightQueryParams,
  SensorQueryParams,
  startSimulation,
} from "../lib/api-client";

interface AirportStore {
  appState: AppState;
  isDashboardOpen: boolean;
  selectedEntityId: string | null;
  selectedEntityType: EntityType;
  isCameraTracking: boolean;
  analysisMode: boolean;
  simulationMode: SimulationMode;

  planes: Plane[];
  sensors: Sensor[];
  metrics: AirportMetrics;
  tooltips: TooltipData[];

  mapFilters: Record<string, boolean>;

  // Dedicated buffers for the slow-path charts
  historicalData: Record<string, { timestamp: string; value: number }[]>;
  aiForecasts: Record<string, AIPredictionPayload>;

  isImmersiveActive: boolean;

  // --- Actions ---
  toggleDashboard: () => void;
  selectEntity: (id: string, type: EntityType) => void;
  clearSelection: () => void;
  setCameraTracking: (tracking: boolean) => void;
  setAnalysisMode: (mode: boolean) => void;
  updateTooltip: (tooltip: TooltipData) => void;

  hydrateStaticData: () => Promise<void>;
  syncHeavyData: () => Promise<void>;

  // Data Loading Actions
  setInitialData: (sensors: Sensor[], planes: Plane[]) => void;
  loadPlanes: (params?: FlightQueryParams) => Promise<void>;
  loadSensors: (params?: SensorQueryParams) => Promise<void>;

  updatePlaneTelemetry: (telemetry: Partial<Plane>) => void;
  updatePlaneTelemetryBatch: (telemetryBatch: Partial<Plane>[]) => void;
  updateSensorTelemetry: (id: string, value: number, status?: string) => void;
  updateAllTooltips: (tooltips: TooltipData[]) => void;

  setSimulationMode: (mode: SimulationMode) => void;

  getSelectedPlane: () => Plane | null;
  getSelectedSensor: () => Sensor | null;

  updateAIForecast: (payload: AIPredictionPayload) => void;
  toggleMapFilter: (filterKey: string) => void;
  syncSimulationStatus: () => Promise<void>;

  setImmersiveActive: (active: boolean) => void;
}

const getActiveFlightCount = (planes: Plane[]) => {
  return planes.filter(
    (p) => !["DEPARTED", "CANCELLED", "SCHEDULED"].includes(p.status),
  ).length;
};

const getUnitForType = (type: string): string => {
  const t = type?.toUpperCase();
  if (t === "TEMPERATURE" || t === "TARMAC_TEMP") return "°C";
  if (t === "HUMIDITY") return "%";
  if (t === "CO2") return "ppm";
  if (t === "WIND_INDOOR" || t === "WIND_OUTDOOR") return "m/s";
  if (t === "LIGHT_DENSITY") return "lux";
  if (t === "TILT_STRUCTURAL") return "deg";
  if (t === "CAMERA_AI_CROWD") return "pax";
  return "";
};

export const useAirportStore = create<AirportStore>((set, get) => ({
  appState: "normal",
  isDashboardOpen: false,
  selectedEntityId: null,
  selectedEntityType: null,
  isCameraTracking: false,
  analysisMode: false,
  planes: [],
  sensors: [],
  tooltips: [],
  historicalData: {},
  aiForecasts: {},
  metrics: {
    activeFlights: 0,
    departuresToday: 186,
    arrivalsToday: 193,
    avgDelay: 12,
    runwayStatus: "open",
    visibility: 9.8,
    windSpeed: 14,
    windDirection: 240,
    temperature: 22,
    alertCount: 0,
  },
  simulationMode: "NONE",
  isImmersiveActive: false,

  setSimulationMode: (mode) => set({ simulationMode: mode }),
  setImmersiveActive: (active) => set({ isImmersiveActive: active }),
  toggleDashboard: () => {
    const { isDashboardOpen, selectedEntityId } = get();
    const next = !isDashboardOpen;
    set({
      isDashboardOpen: next,
      isImmersiveActive: false, // ✅ Reset on toggle
      appState: next
        ? "dashboard"
        : selectedEntityId
          ? "entity-focus"
          : "normal",
    });
  },

  selectEntity: (id, type) =>
    set({
      selectedEntityId: id,
      selectedEntityType: type,
      appState: "entity-focus",
      isDashboardOpen: true,
      analysisMode: false,
    }),

  clearSelection: () =>
    set({
      selectedEntityId: null,
      selectedEntityType: null,
      appState: "normal",
      isDashboardOpen: false,
      isCameraTracking: false,
      analysisMode: false,
      isImmersiveActive: false, // ✅ Reset on clear
    }),

  setCameraTracking: (tracking) => set({ isCameraTracking: tracking }),
  setAnalysisMode: (mode) => set({ analysisMode: mode }),

  // Data Loading Implementation
  loadPlanes: async (params) => {
    try {
      const data = await fetchFlights(params);
      const cleanPlanes: Plane[] = data.map((p: Plane) => ({
        ...p,
        status: p.status as PlaneStatus,
      }));
      set({
        planes: cleanPlanes,
        metrics: {
          ...get().metrics,
          activeFlights: getActiveFlightCount(cleanPlanes),
        },
      });
    } catch (e) {
      console.error("Failed to load planes:", e);
    }
  },

  loadSensors: async (params) => {
    try {
      const data = await fetchSensors(params);
      const cleanSensors: Sensor[] = data.map((s: Sensor) => ({
        ...s,
        status: s.status as SensorStatus,
      }));
      set({ sensors: cleanSensors });
    } catch (e) {
      console.error("Failed to load sensors:", e);
    }
  },

  hydrateStaticData: async () => {
    try {
      const [staticFlights, staticSensors] = await Promise.all([
        fetchStaticFlights(),
        fetchStaticSensors(),
      ]);

      const cleanPlanes = staticFlights.map((f: Plane) => ({
        ...f,
        status: "UNKNOWN",
        speed: 0,
        altitude: 0,
        heading: 0,
        position: { longitude: 0, latitude: 0, z: 0 },
        path: [],
      }));

      const cleanSensors = staticSensors.map((s: Sensor) => ({
        ...s,
        status: "ACTIVE",
        currentValue: 0,
        unit: getUnitForType(s.type),
        history: [],
        position: { longitude: s.x, latitude: s.y, z: s.z },
      }));

      set({
        planes: cleanPlanes,
        sensors: cleanSensors,
        metrics: {
          ...get().metrics,
          activeFlights: getActiveFlightCount(cleanPlanes),
        },
      });
    } catch (e) {
      console.error("Failed to hydrate static data:", e);
    }
  },

  // 5-Minute Polling Action for Charts
  syncHeavyData: async () => {
    try {
      const logs = await fetchAllSensorLogs();

      const newHistory: Record<string, { timestamp: string; value: number }[]> =
        {};

      logs.forEach(
        (log: { sensorId: string; timestamp: string; value: number }) => {
          if (!newHistory[log.sensorId]) newHistory[log.sensorId] = [];
          newHistory[log.sensorId].push({
            timestamp: log.timestamp,
            value: log.value,
          });
        },
      );

      // Sort and keep only the last 60 points for charting
      Object.keys(newHistory).forEach((key) => {
        newHistory[key].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        newHistory[key] = newHistory[key].slice(-60);
      });

      set({
        historicalData: newHistory,
      });
    } catch (error) {
      console.error("Failed to sync chart history arrays:", error);
    }
  },

  updateTooltip: (tooltip) =>
    set((state) => {
      const existingIdx = state.tooltips.findIndex(
        (t) => t.entityId === tooltip.entityId,
      );

      if (existingIdx >= 0) {
        const current = state.tooltips[existingIdx];
        if (
          Math.abs(current.screenX - tooltip.screenX) < 1 &&
          Math.abs(current.screenY - tooltip.screenY) < 1 &&
          current.visible === tooltip.visible
        ) {
          return state;
        }
        const next = [...state.tooltips];
        next[existingIdx] = tooltip;
        return { tooltips: next };
      }
      return { tooltips: [...state.tooltips, tooltip] };
    }),

  updateAllTooltips: (newTooltips) =>
    set((state) => {
      let hasChanges = state.tooltips.length !== newTooltips.length;
      if (!hasChanges) {
        for (const nt of newTooltips) {
          const existing = state.tooltips.find(
            (t) => t.entityId === nt.entityId,
          );
          if (
            !existing ||
            Math.abs(existing.screenX - nt.screenX) > 1 ||
            Math.abs(existing.screenY - nt.screenY) > 1 ||
            existing.visible !== nt.visible
          ) {
            hasChanges = true;
            break;
          }
        }
      }
      if (!hasChanges) return state;
      return { tooltips: newTooltips };
    }),

  // Safely accepts data since api-client.ts now maps it perfectly
  setInitialData: (sensors, planes) => {
    const cleanPlanes = planes.map((plane) => ({
      ...plane,
      status: plane.status as PlaneStatus,
    }));
    const cleanSensors = sensors.map((sensor) => ({
      ...sensor,
      status: sensor.status as SensorStatus,
    }));
    set({
      sensors: cleanSensors,
      planes: cleanPlanes,
      metrics: {
        ...get().metrics,
        activeFlights: getActiveFlightCount(cleanPlanes),
      },
    });
  },

  updatePlaneTelemetry: (telemetry) =>
    set((state) => {
      const cleanStatus = telemetry.status as PlaneStatus | undefined;
      const existingIdx = state.planes.findIndex((p) => p.id === telemetry.id);

      if (existingIdx >= 0) {
        const updatedPlanes = [...state.planes];
        const existingPlane = updatedPlanes[existingIdx];

        let newPath = [...(existingPlane.path || [])];
        if (telemetry.position) {
          const lastPos = newPath[newPath.length - 1];
          if (lastPos) {
            const diffX = Math.abs(
              telemetry.position.longitude - lastPos.longitude,
            );
            const diffY = Math.abs(
              telemetry.position.latitude - lastPos.latitude,
            );
            if (diffX > 0.05 || diffY > 0.05) {
              newPath = [];
            }
          }
          newPath.push(telemetry.position);
        }

        updatedPlanes[existingIdx] = {
          ...existingPlane,
          ...telemetry,
          ...(cleanStatus && { status: cleanStatus }),
          path: newPath.slice(-30), // Keeps the last 90 seconds of trail
        };
        const activeCount = getActiveFlightCount(updatedPlanes);
        return {
          planes: updatedPlanes,
          ...(activeCount !== state.metrics.activeFlights && {
            metrics: { ...state.metrics, activeFlights: activeCount },
          }),
        };
      }
      return state;
    }),

  updatePlaneTelemetryBatch: (telemetryBatch) =>
    set((state) => {
      const updatedPlanes = [...state.planes];
      let hasChanges = false;

      telemetryBatch.forEach((telemetry) => {
        const existingIdx = updatedPlanes.findIndex(
          (p) => p.id === telemetry.id,
        );
        if (existingIdx >= 0) {
          hasChanges = true;
          const existingPlane = updatedPlanes[existingIdx];
          const cleanStatus = telemetry.status as PlaneStatus | undefined;

          let newPath = [...(existingPlane.path || [])];
          if (telemetry.position) {
            const lastPos = newPath[newPath.length - 1];
            if (lastPos) {
              const diffX = Math.abs(
                telemetry.position.longitude - lastPos.longitude,
              );
              const diffY = Math.abs(
                telemetry.position.latitude - lastPos.latitude,
              );
              if (diffX > 0.05 || diffY > 0.05) {
                newPath = [];
              }
            }
            newPath.push(telemetry.position);
          }

          updatedPlanes[existingIdx] = {
            ...existingPlane,
            ...telemetry,
            ...(cleanStatus && { status: cleanStatus }),
            path: newPath.slice(-30),
          };
        }
      });

      if (!hasChanges) return state;

      const activeCount = getActiveFlightCount(updatedPlanes);
      return {
        planes: updatedPlanes,
        ...(activeCount !== state.metrics.activeFlights && {
          metrics: { ...state.metrics, activeFlights: activeCount },
        }),
      };
    }),

  // Only updates the primitive live values.
  // The history arrays (which cause Recharts to redraw) are NO LONGER touched here.
  updateSensorTelemetry: (id, value, status) =>
    set((state) => {
      const existingIdx = state.sensors.findIndex((s) => s.id === id);
      if (existingIdx >= 0) {
        const updatedSensors = [...state.sensors];
        const sensor = updatedSensors[existingIdx];

        updatedSensors[existingIdx] = {
          ...sensor,
          currentValue: value,
          ...(status && { status: status as SensorStatus }),
        };
        return { sensors: updatedSensors };
      }
      return state;
    }),

  getSelectedPlane: () => {
    const { selectedEntityId, selectedEntityType, planes } = get();
    if (selectedEntityType !== "plane" || !selectedEntityId) return null;
    return planes.find((p) => p.id === selectedEntityId) ?? null;
  },

  getSelectedSensor: () => {
    const { selectedEntityId, selectedEntityType, sensors } = get();
    if (selectedEntityType !== "sensor" || !selectedEntityId) return null;
    return sensors.find((s) => s.id === selectedEntityId) ?? null;
  },

  updateAIForecast: (payload) =>
    set((state) => ({
      aiForecasts: {
        ...state.aiForecasts,
        [payload.sensorId]: payload,
      },
    })),

  mapFilters: {
    planes: true,
    TEMPERATURE: true,
    TARMAC_TEMP: true,
    HUMIDITY: true,
    CO2: true,
    WIND_INDOOR: true,
    WIND_OUTDOOR: true,
    LIGHT_DENSITY: true,
    TILT_STRUCTURAL: true,
    CAMERA_AI_CROWD: true,
  },
  toggleMapFilter: (key) =>
    set((state) => ({
      mapFilters: { ...state.mapFilters, [key]: !state.mapFilters[key] },
    })),

  syncSimulationStatus: async () => {
    try {
      const status = await fetchSimulationStatus();
      if (!status) return;

      if (!status.isRunning) {
        console.log("Simulation asleep. Auto-igniting engine...");
        await startSimulation(); // Ensure this is imported from api-client
        set({ simulationMode: "GENERAL" });
      } else if (status.activeScenario && status.activeScenario !== "NONE") {
        set({ simulationMode: status.activeScenario as SimulationMode });
      } else {
        set({ simulationMode: "GENERAL" });
      }
    } catch (error) {
      console.error("Failed to sync simulation status:", error);
    }
  },
}));
