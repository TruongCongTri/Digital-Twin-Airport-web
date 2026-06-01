import axios from "axios";
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
} from "@/types";

export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://digital-twin-airport-api-1.onrender.com/api/v1",
  withCredentials: true,
  timeout: 10000,
});

//
export const fetchStaticFlights = async () => {
  const res = await apiClient.get("/flights/static");
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

// Bulk fetch endpoints for the 5-minute Slow Path
export const fetchAllSensorLogs = async () => {
  try {
    const res = await apiClient.get("/sensors/logs/all");
    return res.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch bulk sensor logs", error);
    return [];
  }
};

// --- STRICT BACKEND DTOs (Data Transfer Objects) ---
// These perfectly match the JSON payloads returned by your server

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

export interface SensorQueryParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  zoneId?: string;
}

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

// --- API METHODS ---

export const fetchInitialTelemetry = async () => {
  // 1. Fetch EVERYTHING in parallel for maximum speed
  const [sensorsRes, flightsRes, logsRes, zonesRes] = await Promise.all([
    apiClient.get("/sensors?limit=100"),
    apiClient.get("/flights?limit=100"),
    apiClient.get("/sensors/logs/all"),
    apiClient.get("/zones"),
  ]);

  // Strongly type the raw arrays
  const rawSensors: RawSensor[] = sensorsRes.data?.data || [];
  const rawFlights: RawFlight[] = flightsRes.data?.data || [];
  const rawLogs: RawSensorLog[] = logsRes.data?.data || [];
  const rawZones: RawZone[] = zonesRes.data?.data || [];

  // 2. Create a high-performance Lookup Map for Zone Names
  const zoneMap = new Map<string, RawZone>();
  rawZones.forEach((z) => zoneMap.set(z.id, z));

  // 3. Map Raw Sensor Data
  const mappedSensors: Sensor[] = rawSensors.map((item: RawSensor) => {
    // Strongly type the history array mapping
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
      type: item.type as SensorType, // Cast to strict UI enum
      status: item.status as SensorStatus, // Cast to strict UI enum
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

  // 4. Map Raw Flight Data
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
      status: item.status as PlaneStatus, // Cast to strict UI enum
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

      // Default telemetry (Wait for WebSockets to populate live data)
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

  return {
    sensors: mappedSensors,
    flights: mappedFlights,
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
  const res = await apiClient.get(`/sensors/${sensorId}/history`);
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
