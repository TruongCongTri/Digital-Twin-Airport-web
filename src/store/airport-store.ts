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
} from "@/types";
import {
  fetchFlights,
  fetchSensors,
  FlightQueryParams,
  SensorQueryParams,
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

  // --- Actions ---
  toggleDashboard: () => void;
  selectEntity: (id: string, type: EntityType) => void;
  clearSelection: () => void;
  setCameraTracking: (tracking: boolean) => void;
  setAnalysisMode: (mode: boolean) => void;
  updateTooltip: (tooltip: TooltipData) => void;

  // Data Loading Actions
  setInitialData: (sensors: Sensor[], planes: Plane[]) => void;
  loadPlanes: (params?: FlightQueryParams) => Promise<void>;
  loadSensors: (params?: SensorQueryParams) => Promise<void>;

  updatePlaneTelemetry: (telemetry: Partial<Plane>) => void;
  updateSensorTelemetry: (id: string, value: number, status?: string) => void;
  updateAllTooltips: (tooltips: TooltipData[]) => void;

  setSimulationMode: (mode: SimulationMode) => void;

  getSelectedPlane: () => Plane | null;
  getSelectedSensor: () => Sensor | null;

  aiForecasts: Record<string, AIPredictionPayload>;
  updateAIForecast: (payload: AIPredictionPayload) => void;

  mapFilters: Record<string, boolean>;
  toggleMapFilter: (filterKey: string) => void;
}

const sanitizePlaneStatus = (status: string): PlaneStatus => {
  const s = status.toUpperCase();
  if (s === "LANDING") return "LANDED";
  return s as PlaneStatus;
};

const sanitizeSensorStatus = (status: string): SensorStatus => {
  const s = status.toUpperCase();
  if (s === "NORMAL" || s === "OK") return "ACTIVE";
  if (s === "ERROR" || s === "DANGER") return "CRITICAL";
  return s as SensorStatus;
};

const getActiveFlightCount = (planes: Plane[]) => {
  return planes.filter(
    (p) => !["DEPARTED", "CANCELLED", "SCHEDULED"].includes(p.status),
  ).length;
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

  setSimulationMode: (mode) => set({ simulationMode: mode }),
  toggleDashboard: () => {
    const { isDashboardOpen, selectedEntityId } = get();
    const next = !isDashboardOpen;
    set({
      isDashboardOpen: next,
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
    }),

  setCameraTracking: (tracking) => set({ isCameraTracking: tracking }),
  setAnalysisMode: (mode) => set({ analysisMode: mode }),

  // Data Loading Implementation
  loadPlanes: async (params) => {
    try {
      const data = await fetchFlights(params);
      const cleanPlanes: Plane[] = data.map((p: Plane) => ({
        ...p,
        status: sanitizePlaneStatus(String(p.status)),
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
        status: sanitizeSensorStatus(String(s.status)),
      }));
      set({ sensors: cleanSensors });
    } catch (e) {
      console.error("Failed to load sensors:", e);
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
      status: sanitizePlaneStatus(plane.status),
    }));
    const cleanSensors = sensors.map((sensor) => ({
      ...sensor,
      status: sanitizeSensorStatus(sensor.status),
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
      const cleanStatus = telemetry.status
        ? sanitizePlaneStatus(telemetry.status)
        : undefined;
      const existingIdx = state.planes.findIndex((p) => p.id === telemetry.id);

      if (existingIdx >= 0) {
        const updatedPlanes = [...state.planes];
        const existingPlane = updatedPlanes[existingIdx];

        const newPath = [...(existingPlane.path || [])];
        if (telemetry.position) newPath.push(telemetry.position);

        updatedPlanes[existingIdx] = {
          ...existingPlane,
          ...telemetry,
          ...(cleanStatus && { status: cleanStatus }),
          path: newPath.slice(-30),
        };
        const activeCount = getActiveFlightCount(updatedPlanes);
        return {
          planes: updatedPlanes,
          ...(activeCount !== state.metrics.activeFlights && {
            metrics: { ...state.metrics, activeFlights: activeCount },
          }),
        };
      }

      const newPlanes = [
        ...state.planes,
        {
          ...telemetry,
          ...(cleanStatus && { status: cleanStatus }),
          path: [telemetry.position],
        } as Plane,
      ];

      return {
        planes: newPlanes,
        metrics: {
          ...state.metrics,
          activeFlights: getActiveFlightCount(newPlanes),
        },
      };
    }),

  updateSensorTelemetry: (id, value, status) =>
    set((state) => {
      const existingIdx = state.sensors.findIndex((s) => s.id === id);
      if (existingIdx >= 0) {
        const updatedSensors = [...state.sensors];
        const sensor = updatedSensors[existingIdx];
        const newHistory = [
          ...sensor.history,
          { timestamp: new Date().toISOString(), value },
        ].slice(-20);

        updatedSensors[existingIdx] = {
          ...sensor,
          currentValue: value,
          history: newHistory,
          ...(status && { status: sanitizeSensorStatus(status) }),
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

  aiForecasts: {},

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
}));
