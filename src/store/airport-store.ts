"use client";
import { create } from "zustand";
import { isPlaneOffAirport } from "../lib/flight-location";
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
  Vehicle,
  VehicleStatus,
  VehicleType,
} from "@/types";

export type ConnectionStatus = "connecting" | "live" | "offline";

// Live samples kept per sensor for sparklines (~2 minutes at a 3s tick)
const LIVE_HISTORY_LENGTH = 40;

interface AirportStore {
  // UI & View State
  appState: AppState;
  activeAirport: string;
  isDashboardOpen: boolean;
  selectedEntityId: string | null;
  selectedEntityType: EntityType | "vehicle";
  isCameraTracking: boolean;
  analysisMode: boolean;
  simulationMode: SimulationMode;
  isImmersiveActive: boolean;
  mapFilters: Record<string, boolean>;
  tooltips: TooltipData[];
  aiForecasts: Record<string, AIPredictionPayload>;

  // High-Speed Telemetry State
  connection: ConnectionStatus;
  lastTelemetryAt: number | null;
  sensorLiveHistory: Record<string, number[]>;
  planes: Plane[];
  sensors: Sensor[];
  vehicles: Vehicle[];
  metrics: AirportMetrics;

  // Actions - UI
  setActiveAirport: (airportId: string) => void;
  toggleDashboard: () => void;
  selectEntity: (id: string, type: EntityType | "vehicle") => void;
  clearSelection: () => void;
  setCameraTracking: (tracking: boolean) => void;
  setAnalysisMode: (mode: boolean) => void;
  updateTooltip: (tooltip: TooltipData) => void;
  updateAllTooltips: (tooltips: TooltipData[]) => void;
  setSimulationMode: (mode: SimulationMode) => void;
  setImmersiveActive: (active: boolean) => void;
  toggleMapFilter: (filterKey: string) => void;

  setConnection: (status: ConnectionStatus) => void;

  // Actions - Data Ingestion
  setInitialData: (
    sensors: Sensor[],
    planes: Plane[],
    vehicles: Vehicle[],
  ) => void; // ✅ Unified

  // High Speed Socket Handlers
  updatePlaneTelemetryBatch: (telemetryBatch: Partial<Plane>[]) => void;
  applyFlightUpdate: (plane: Plane) => void;
  updateVehicleTelemetryBatch: (telemetryBatch: Partial<Vehicle>[]) => void;
  updateSensorTelemetry: (id: string, value: number, status?: string) => void;
  updateSensorTelemetryBatch: (
    telemetryBatch: { id: string; value: number; status?: string }[],
  ) => void;
  updateAIForecast: (payload: AIPredictionPayload) => void;
  updateAIForecastBatch: (payloads: AIPredictionPayload[]) => void;

  // Getters
  getSelectedPlane: () => Plane | null;
  getSelectedSensor: () => Sensor | null;
  getSelectedVehicle: () => Vehicle | null;
}

const getActiveFlightCount = (planes: Plane[]) => {
  return planes.filter(
    (p) => !["DEPARTED", "CANCELLED", "SCHEDULED"].includes(p.status),
  ).length;
};

// Default baseline metrics
const DEFAULT_METRICS: AirportMetrics = {
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
};

export const useAirportStore = create<AirportStore>((set, get) => ({
  appState: "normal",
  activeAirport: "VVLT",
  isDashboardOpen: false,
  selectedEntityId: null,
  selectedEntityType: null,
  isCameraTracking: false,
  analysisMode: false,
  connection: "connecting",
  lastTelemetryAt: null,
  sensorLiveHistory: {},
  planes: [],
  sensors: [],
  vehicles: [],
  tooltips: [],
  aiForecasts: {},
  metrics: DEFAULT_METRICS,
  simulationMode: "NONE",
  isImmersiveActive: false,
  mapFilters: {
    planes: true,
    vehicles: true,
    bim: true,
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

  setActiveAirport: (airportId) =>
    set({
      activeAirport: airportId,
      planes: [],
      sensors: [],
      vehicles: [],
      tooltips: [],
      aiForecasts: {},
      sensorLiveHistory: {},
      selectedEntityId: null,
      selectedEntityType: null,
      metrics: DEFAULT_METRICS,
    }),

  setConnection: (status) => set({ connection: status }),
  setSimulationMode: (mode) => set({ simulationMode: mode }),
  setImmersiveActive: (active) => set({ isImmersiveActive: active }),
  setCameraTracking: (tracking) => set({ isCameraTracking: tracking }),
  setAnalysisMode: (mode) => set({ analysisMode: mode }),

  toggleMapFilter: (key) =>
    set((state) => ({
      mapFilters: { ...state.mapFilters, [key]: !state.mapFilters[key] },
    })),

  toggleDashboard: () => {
    const { isDashboardOpen, selectedEntityId } = get();
    const next = !isDashboardOpen;
    set({
      isDashboardOpen: next,
      isImmersiveActive: false,
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
      isImmersiveActive: false,
    }),

  // ✅ Unified Injection
  setInitialData: (sensors, planes, vehicles) => {
    set({
      sensors,
      // Seed sparklines with the logged history so they are not empty on load
      sensorLiveHistory: Object.fromEntries(
        sensors.map((s) => [
          s.id,
          (s.history ?? []).map((h) => h.value).slice(-LIVE_HISTORY_LENGTH),
        ]),
      ),
      planes,
      vehicles,
      metrics: {
        ...get().metrics,
        activeFlights: getActiveFlightCount(planes),
      },
    });
  },

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
              if (diffX > 0.05 || diffY > 0.05) newPath = [];
            }
            newPath.push(telemetry.position);
          }

          updatedPlanes[existingIdx] = {
            ...existingPlane,
            ...telemetry,
            ...(telemetry.status && {
              status: telemetry.status as PlaneStatus,
            }),
            path: newPath.slice(-30),
          };
        }
      });

      if (!hasChanges) return state;

      return {
        planes: updatedPlanes,
        metrics: {
          ...state.metrics,
          activeFlights: getActiveFlightCount(updatedPlanes),
        },
      };
    }),

  // Status / stand change pushed by the API (ATC pipeline, departures, admin overrides).
  // Live telemetry keeps owning the position of aircraft on the airport.
  applyFlightUpdate: (plane) =>
    set((state) => {
      const idx = state.planes.findIndex((p) => p.id === plane.id);
      if (idx < 0) return state; // another airport's flight
      const existing = state.planes[idx];
      const offAirport = isPlaneOffAirport(plane);
      const updatedPlanes = [...state.planes];
      updatedPlanes[idx] = {
        ...existing,
        status: plane.status,
        direction: plane.direction,
        parkingStandId: plane.parkingStandId,
        parkingStand: plane.parkingStand,
        anchor: plane.anchor,
        ...(offAirport && {
          position: plane.position,
          speed: 0,
          altitude: 0,
          path: [],
        }),
      };
      return {
        planes: updatedPlanes,
        metrics: {
          ...state.metrics,
          activeFlights: getActiveFlightCount(updatedPlanes),
        },
      };
    }),

  updateVehicleTelemetryBatch: (telemetryBatch) =>
    set((state) => {
      const updatedVehicles = [...(state.vehicles || [])];
      let hasChanges = false;

      telemetryBatch.forEach((telemetry) => {
        const existingIdx = updatedVehicles.findIndex(
          (v) => v.id === telemetry.id,
        );

        if (existingIdx >= 0) {
          hasChanges = true;
          const existingVehicle = updatedVehicles[existingIdx];

          let newPath = [...(existingVehicle.path || [])];
          if (telemetry.position) {
            const lastPos = newPath[newPath.length - 1];
            if (lastPos) {
              const diffX = Math.abs(
                telemetry.position.longitude - lastPos.longitude,
              );
              const diffY = Math.abs(
                telemetry.position.latitude - lastPos.latitude,
              );
              if (diffX > 0.05 || diffY > 0.05) newPath = [];
            }
            newPath.push(telemetry.position);
          }

          updatedVehicles[existingIdx] = {
            ...existingVehicle,
            ...telemetry,
            ...(telemetry.status && {
              status: telemetry.status as VehicleStatus,
            }),
            ...(telemetry.type && {
              type: telemetry.type as VehicleType,
            }),
            path: newPath.slice(-15),
          };
        }
        // Unknown ids are ignored: the socket stream carries every airport's vehicles,
        // while the active airport's fleet is loaded over REST (setInitialData).
      });

      if (!hasChanges) return state;
      return { vehicles: updatedVehicles };
    }),

  updateSensorTelemetry: (id, value, status) =>
    set((state) => {
      const existingIdx = state.sensors.findIndex((s) => s.id === id);
      if (existingIdx >= 0) {
        const updatedSensors = [...state.sensors];
        updatedSensors[existingIdx] = {
          ...updatedSensors[existingIdx],
          currentValue: value,
          ...(status && { status: status as SensorStatus }),
        };
        return { sensors: updatedSensors };
      }
      return state;
    }),

  // One state update (and one map re-render) per tick for ALL sensors
  updateSensorTelemetryBatch: (telemetryBatch) =>
    set((state) => {
      if (telemetryBatch.length === 0 || state.sensors.length === 0)
        return state;

      const updates = new Map(telemetryBatch.map((t) => [t.id, t]));
      let hasChanges = false;

      const sensorLiveHistory = { ...state.sensorLiveHistory };
      for (const t of telemetryBatch) {
        const series = sensorLiveHistory[t.id];
        if (!series) continue; // sensor belongs to another airport
        sensorLiveHistory[t.id] = [...series, t.value].slice(
          -LIVE_HISTORY_LENGTH,
        );
      }

      const updatedSensors = state.sensors.map((sensor) => {
        const telemetry = updates.get(sensor.id);
        if (!telemetry) return sensor;
        if (
          sensor.currentValue === telemetry.value &&
          (!telemetry.status || sensor.status === telemetry.status)
        )
          return sensor;

        hasChanges = true;
        return {
          ...sensor,
          currentValue: telemetry.value,
          ...(telemetry.status && {
            status: telemetry.status as SensorStatus,
          }),
        };
      });

      return hasChanges
        ? {
            sensors: updatedSensors,
            sensorLiveHistory,
            lastTelemetryAt: Date.now(),
          }
        : state;
    }),

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

  updateAIForecastBatch: (payloads) =>
    set((state) => {
      // Only keep forecasts for sensors of the active airport
      const known = new Set(state.sensors.map((s) => s.id));
      const next = { ...state.aiForecasts };
      let changed = false;
      for (const p of payloads) {
        if (!known.has(p.sensorId)) continue;
        next[p.sensorId] = p;
        changed = true;
      }
      return changed ? { aiForecasts: next } : state;
    }),

  updateAIForecast: (payload) =>
    set((state) => ({
      aiForecasts: { ...state.aiForecasts, [payload.sensorId]: payload },
    })),

  getSelectedPlane: () => {
    const { selectedEntityId, selectedEntityType, planes } = get();
    return selectedEntityType === "plane"
      ? (planes.find((p) => p.id === selectedEntityId) ?? null)
      : null;
  },
  getSelectedSensor: () => {
    const { selectedEntityId, selectedEntityType, sensors } = get();
    return selectedEntityType === "sensor"
      ? (sensors.find((s) => s.id === selectedEntityId) ?? null)
      : null;
  },
  getSelectedVehicle: () => {
    const { selectedEntityId, selectedEntityType, vehicles } = get();
    return selectedEntityType === "vehicle"
      ? (vehicles.find((v) => v.id === selectedEntityId) ?? null)
      : null;
  },
}));
