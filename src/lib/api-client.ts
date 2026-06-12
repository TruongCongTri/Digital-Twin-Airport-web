import axios, { AxiosRequestConfig } from "axios";
import type {
  Sensor,
  Plane,
  SensorType,
  SensorStatus,
  PlaneStatus,
  ZoneType,
  Zone,
  Scenario,
  PlaneDirection,
  Vehicle, // ✅ Added Vehicle export
  VehicleStatus,
  VehicleType, // ✅ Added VehicleStatus export
} from "@/types"; // Make sure Vehicle and VehicleStatus are exported from your types file, or import from store

export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://digital-twin-airport-api-1.onrender.com/api/v1",
  withCredentials: true,
  timeout: 10000,
});

// --- STRICT BACKEND DTOs (Data Transfer Objects) ---

interface RawSensorLog {
  id: string;
  sensorId: string;
  value: number;
  timestamp: string;
}

interface RawParkingStand {
  id: string;
  code: string;
  x: number;
  y: number;
  z: number;
  isOccupied: boolean;
  zoneId: string;
}

interface RawFlight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  status: string;
  direction: string;
  assignedRunway: string | null;
  parkingStandId: string | null;
  createdAt: string;
  updatedAt: string;
  parkingStand: RawParkingStand | null;
  imageUrl?: string;
  logoUrl?: string;
}

// ✅ Updated to match the new civilian traffic backend schema
interface RawVehicle {
  id: string;
  licensePlate: string;
  type: string;
  status: string;
  brand: string | null;
  carModel: string | null;
  companyName: string | null;
  airportId: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  logoUrl?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  x?: number;
  y?: number;
  heading?: number;
  speed?: number;
}

interface RawSensor {
  id: string;
  name: string;
  type: string;
  status: string;
  x: number;
  y: number;
  z: number;
  currentValue: number;
  lastReadAt: string;
  zoneId: string;
  gisFeatureId: string | null;
  createdAt: string;
  updatedAt: string;
  zone?: RawZone;
  imageUrl?: string;
}

interface RawZone {
  id: string;
  name: string;
  type: string;
  floorLevel: number;
  maxCapacity: number;
  gisItemId: string | null;
  gisSceneUrl: string | null;
  currentDensity: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlightQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  airline?: string;
}
export interface VehicleQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}
export interface SensorQueryParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  zoneId?: string;
}

export const fetchStaticFlights = async () => {
  const res = await apiClient.get("/flights/static");
  return res.data?.data || [];
};

export const fetchStaticVehicles = async () => {
  const res = await apiClient.get("/ground-vehicles/static");
  return res.data?.data || [];
};

export const fetchStaticSensors = async () => {
  const res = await apiClient.get("/sensors/static");
  return res.data?.data || [];
};

export const fetchStaticZones = async () => {
  const res = await apiClient.get("/zones/static");
  return res.data?.data || [];
};
export const fetchAllSensorLogs = async (airportId?: string) => {
  try {
    const res = await apiClient.get("/sensors/logs/all", {
      params: { airportId },
    });
    return res.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch bulk sensor logs", error);
    return [];
  }
};

// --- MAPPING HELPERS ---
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

// ✅ Helper to extract arrays safely regardless of API wrapper
const extractArray = <T = unknown>(res: unknown): T[] => {
  if (res && typeof res === "object" && "data" in res) {
    const resData = (res as { data: unknown }).data;
    if (!resData) return [];
    if (Array.isArray(resData)) return resData as T[];

    if (typeof resData === "object") {
      const innerData = (resData as { data?: unknown }).data;
      if (Array.isArray(innerData)) return innerData as T[];

      const innerItems = (resData as { items?: unknown }).items;
      if (Array.isArray(innerItems)) return innerItems as T[];
    }
  }
  return [];
};

// --- API METHODS ---
export const fetchInitialTelemetry = async (airportId: string) => {
  // ✅ Wrapped in .catch() so one missing endpoint doesn't crash the whole UI
  const safeGet = (url: string, config: AxiosRequestConfig) =>
    apiClient.get(url, config).catch((err: Error) => {
      console.warn(`[API Warning] Failed to fetch ${url}`, err.message);
      return { data: [] };
    });

  const [sensorsRes, flightsRes, vehiclesRes, logsRes, zonesRes] =
    await Promise.all([
      safeGet("/sensors", { params: { limit: 100, airportId } }),
      safeGet("/flights", { params: { limit: 100, airportId } }),
      safeGet("/ground-vehicles", { params: { limit: 100, airportId } }),
      safeGet("/sensors/logs/all", { params: { airportId } }),
      safeGet("/zones", { params: { airportId } }),
    ]);

  // ✅ Safely extract arrays
  const rawSensors: RawSensor[] = extractArray(sensorsRes);
  const rawFlights: RawFlight[] = extractArray(flightsRes);
  const rawVehicles: RawVehicle[] = extractArray(vehiclesRes);
  const rawLogs: RawSensorLog[] = extractArray(logsRes);
  const rawZones: RawZone[] = extractArray(zonesRes);

  const zoneMap = new Map<string, RawZone>();
  rawZones.forEach((z) => zoneMap.set(z.id, z));

  const mappedSensors: Sensor[] = rawSensors.map((item: RawSensor) => {
    const historicalData = rawLogs
      .filter((log: RawSensorLog) => log.sensorId === item.id)
      .map((log: RawSensorLog) => ({
        timestamp: log.timestamp,
        value: log.value,
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    const resolvedZone =
      (zoneMap.get(item.zoneId) as unknown as Zone) ||
      ({
        id: item.zoneId,
        name: item.zone?.name || "Unknown Zone",
        type: "OTHER" as ZoneType,
        floorLevel: 0,
        maxCapacity: 0,
        currentDensity: 0,
      } as Zone);

    return {
      id: item.id,
      name: item.name,
      type: item.type as SensorType,
      status: item.status as SensorStatus,
      x: item.x,
      y: item.y,
      z: item.z,
      position: {
        longitude: item.x,
        latitude: item.y,
        z: item.z || 0,
      },
      unit: getUnitForType(item.type),
      currentValue: item.currentValue,
      lastReadAt: item.lastReadAt,
      history:
        historicalData.length > 0
          ? historicalData
          : [
              {
                timestamp: item.lastReadAt || new Date().toISOString(),
                value: item.currentValue,
              },
            ],
      zoneId: item.zoneId,
      zone: resolvedZone,
      gisFeatureId: item.gisFeatureId || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      imageUrl: item.imageUrl,
    };
  });

  const mappedFlights: Plane[] = rawFlights.map((item: RawFlight) => {
    let fallbackPosition = { longitude: 0, latitude: 0, z: 0 };
    if (item.parkingStand) {
      fallbackPosition = {
        longitude: item.parkingStand.x,
        latitude: item.parkingStand.y,
        z: item.parkingStand.z || 0,
      };
    }

    return {
      id: item.id,
      flightNumber: item.flightNumber,
      callsign: item.flightNumber,
      airline: item.airline,
      origin: item.origin,
      destination: item.destination,
      status: item.status as PlaneStatus,
      direction: item.direction as PlaneDirection,
      assignedRunway: item.assignedRunway || null,
      parkingStandId: item.parkingStandId || null,
      parkingStand: item.parkingStand
        ? {
            id: item.parkingStand.id,
            code: item.parkingStand.code,
            x: item.parkingStand.x,
            y: item.parkingStand.y,
            z: item.parkingStand.z,
            isOccupied: item.parkingStand.isOccupied,
            zoneId: item.parkingStand.zoneId,
          }
        : null,

      speed: 0,
      altitude: 0,
      heading: 0,
      position: fallbackPosition,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      imageUrl: item.imageUrl,
      logoUrl: item.logoUrl,
    };
  });

  // ✅ 5. Map Raw Vehicle Data
  const mappedVehicles: Vehicle[] = rawVehicles.map((item: RawVehicle) => ({
    id: item.id,
    callsign: item.licensePlate,
    licensePlate: item.licensePlate,
    type: item.type as VehicleType,
    status: item.status as VehicleStatus,
    brand: item.brand,
    carModel: item.carModel,
    companyName: item.companyName,
    speed: item.speed ?? 0,
    heading: item.heading ?? 0,
    // Safely parse initial coordinates to prevent 0,0 (Null Island) spawns
    position: {
      longitude: item.longitude ?? item.lng ?? item.x ?? 0,
      latitude: item.latitude ?? item.lat ?? item.y ?? 0,
      z: 0,
    },
    path: [],
    imageUrl: item.imageUrl,
    logoUrl: item.logoUrl,
  }));

  return {
    sensors: mappedSensors,
    flights: mappedFlights,
    vehicles: mappedVehicles,
    logs: rawLogs,
  };
};

export const fetchFlights = async (params?: FlightQueryParams) => {
  const res = await apiClient.get("/flights", {
    params: { limit: 100, ...params },
  });
  return res.data;
};

export const fetchFlightTelemetry = async (flightId: string) => {
  const res = await apiClient.get(`/flights/${flightId}/telemetry`);
  return res.data?.data || [];
};

// ✅ Ground Vehicle Endpoints
export const fetchVehicles = async (params?: VehicleQueryParams) => {
  const res = await apiClient.get("/ground-vehicles", {
    params: { limit: 100, ...params },
  });
  return res.data;
};

export const fetchVehicleDetail = async (vehicleId: string) => {
  const res = await apiClient.get(`/ground-vehicles/${vehicleId}`);
  return res.data?.data || null;
};

export const fetchVehicleTelemetry = async (vehicleId: string) => {
  const res = await apiClient.get(`/ground-vehicles/${vehicleId}/telemetry`);
  return res.data?.data || [];
};

export const fetchSensors = async (params?: SensorQueryParams) => {
  const res = await apiClient.get("/sensors", {
    params: { limit: 100, ...params },
  });
  return res.data;
};

export const fetchSensorDetail = async (sensorId: string) => {
  const res = await apiClient.get(`/sensors/${sensorId}`);
  return res.data?.data || null;
};

export const fetchSensorHistory = async (sensorId: string) => {
  const res = await apiClient.get(`/sensors/${sensorId}/history?limit=100`);
  return res.data?.data || [];
};

export const startSimulation = async () => {
  const res = await apiClient.post("/simulation/start");
  return res.data;
};

export const stopSimulation = async () => {
  const res = await apiClient.post("/simulation/stop");
  return res.data;
};
export const rebootSimulation = async () => {
  const res = await apiClient.post("/simulation/reboot");
  return res.data?.data || null;
};

export const startScenario = async (scenario: Scenario) => {
  const res = await apiClient.post("/simulation/scenario", { scenario });
  return res.data;
};

export const fetchSimulationStatus = async () => {
  const res = await apiClient.get("/simulation/status");
  return res.data?.data || null;
};

export const forceFlightPipeline = async (airportCode: string) => {
  const res = await apiClient.post("/simulation/pipeline/force", {
    airportCode,
  });
  return res.data;
};
