export type EntityType = "plane" | "sensor" | null;
export type AppState = "normal" | "dashboard" | "entity-focus";
export type PlaneStatus =
  | "SCHEDULED"
  | "DELAYED"
  | "APPROACHING"
  | "DELAYED"
  | "LANDED"
  | "TAXIING"
  | "PARKED"
  | "PUSHBACK"
  | "DEPARTED"
  | "DIVERTED"
  | "CANCELLED";
export type ZoneType =
  | "TERMINAL_DOMESTIC"
  | "TERMINAL_INTERNATIONAL"
  | "CHECK_IN"
  | "SECURITY_GATE"
  | "WAITING_LOUNGE"
  | "BAGGAGE_CLAIM"
  | "RUNWAY"
  | "TAXIWAY"
  | "APRON";

export type SensorStatus =
  | "ACTIVE"
  | "WARNING" // Approaching safety thresholds (Yellow)
  | "CRITICAL" // Breached safety thresholds (Red)
  | "MAINTENANCE" // Hardware being physically repaired
  | "CALIBRATING" // Online, but data should be ignored by AI
  | "OFFLINE";
export type SensorType =
  | "CO2"
  | "TEMPERATURE"
  | "HUMIDITY" // Indoor environmental comfort
  | "WIND_INDOOR"
  | "LIGHT_DENSITY"
  | "TILT_STRUCTURAL" // Structural tilt/deformation monitoring
  | "CAMERA_AI_CROWD" // Crowd flow tracking and AI prediction
  | "WIND_OUTDOOR"
  | "TARMAC_TEMP";
export type Scenario = "TROPICAL_SQUALL" | "TARMAC_OVERHEAT" | "AC_FAILURE";
export type SimulationMode =
  | "NONE"
  | "GENERAL"
  | "TROPICAL_SQUALL"
  | "TARMAC_OVERHEAT"
  | "AC_FAILURE";

export interface MapPoint {
  longitude: number;
  latitude: number;
  z?: number;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  floorLevel: number;
  maxCapacity: number;
  currentDensity: number;
  gisItemId: string | null;
  gisSceneUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParkingStand {
  id: string;
  code: string;
  x: number;
  y: number;
  z: number;
  isOccupied: boolean;
  zoneId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SensorLog {
  id: string;
  sensorId: string;
  value: number;
  timestamp: string;
  sensor?: {
    name: string;
    type: SensorType;
    zoneId: string;
  };
}

export interface FlightTelemetry {
  id: string;
  flightId: string;
  longitude: number;
  latitude: number;
  altitude: number;
  heading: number;
  speed: number;
  timestamp: string;
}

// --- MAIN ENTITIES (Mapped for Frontend UI) ---
export interface Plane {
  id: string;
  flightNumber: string; // From BE
  callsign?: string; // Optional mapped fallback
  airline: string;
  origin: string;
  destination: string;
  status: PlaneStatus;

  // Relations
  assignedRunway: string | null;
  parkingStandId: string | null;
  parkingStand?: ParkingStand | null;

  // Telemetry (Mapped on frontend)
  speed: number;
  altitude: number;
  heading: number;
  position: MapPoint;
  path?: MapPoint[];

  // Optional/Future fields
  cargo?: string;
  weight?: number;
  gate?: string;
  eta?: string;
  aircraftType?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  logoUrl?: string;
}

export interface SensorReading {
  timestamp: string;
  value: number;
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  status: SensorStatus;

  // Raw BE Coordinates
  x: number;
  y: number;
  z: number;

  // Relations
  zoneId: string;
  zone?: Zone | string; // Can hold the nested object or string fallback
  gisFeatureId: string | null;

  // State
  currentValue: number;
  lastReadAt: string;
  createdAt?: string;
  updatedAt?: string;

  // Frontend Exclusives (Added by api-client.ts)
  position: MapPoint;
  unit: string;
  history: SensorReading[];

  imageUrl?: string;
}

// --- UI & DASHBOARD TYPES ---

export interface TooltipData {
  entityId: string;
  entityType: EntityType;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface AirportMetrics {
  activeFlights: number;
  departuresToday: number;
  arrivalsToday: number;
  avgDelay: number;
  runwayStatus: "open" | "closed" | "maintenance";
  visibility: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  alertCount: number;
}

export interface AirportCoordinate {
  latitude: number;
  longitude: number;
}

export interface AIPrediction {
  timestamp: string;
  horizonLabel: string;
  predictedValue: number;
  confidenceScore: number;
}

export interface AIPredictionPayload {
  sensorId: string;
  type: string; // or SensorType if you imported the enum
  predictions: AIPrediction[];
}
