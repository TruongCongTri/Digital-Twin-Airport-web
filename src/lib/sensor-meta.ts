// Single source of truth for how every sensor type is labelled, scaled and judged.
// Badges, list rows, 3D value columns and the inspector all read from here.
import {
  Thermometer,
  Droplets,
  Wind,
  Fan,
  Sun,
  Users,
  Activity,
  Gauge,
  CloudFog,
  type LucideIcon,
} from "lucide-react";
import type { Sensor, SensorStatus, SensorType } from "@/types";

export type SensorHealth = "normal" | "warning" | "critical" | "offline";
export type SensorEnvironment = "indoor" | "outdoor";

interface Bands {
  warnLow?: number;
  critLow?: number;
  warnHigh?: number;
  critHigh?: number;
}

export interface SensorTypeMeta {
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  icon: LucideIcon;
  // Value domain used to normalise columns, range bars and sparklines
  min: number;
  max: number;
  bands: Bands;
  defaultEnvironment: SensorEnvironment;
}

export const SENSOR_META: Record<SensorType, SensorTypeMeta> = {
  TEMPERATURE: {
    label: "Indoor temperature",
    shortLabel: "Temp",
    unit: "°C",
    decimals: 1,
    icon: Thermometer,
    min: 15,
    max: 35,
    bands: { warnLow: 18, critLow: 16, warnHigh: 26, critHigh: 29 },
    defaultEnvironment: "indoor",
  },
  HUMIDITY: {
    label: "Relative humidity",
    shortLabel: "RH",
    unit: "%",
    decimals: 0,
    icon: Droplets,
    min: 0,
    max: 100,
    bands: { warnLow: 30, critLow: 25, warnHigh: 65, critHigh: 75 },
    defaultEnvironment: "indoor",
  },
  CO2: {
    label: "CO₂ concentration",
    shortLabel: "CO₂",
    unit: "ppm",
    decimals: 0,
    icon: CloudFog,
    min: 300,
    max: 2000,
    bands: { warnHigh: 1000, critHigh: 1500 },
    defaultEnvironment: "indoor",
  },
  WIND_INDOOR: {
    label: "Indoor airflow",
    shortLabel: "Airflow",
    unit: "m/s",
    decimals: 2,
    icon: Fan,
    min: 0,
    max: 3,
    bands: { warnHigh: 0.8, critHigh: 1.5 },
    defaultEnvironment: "indoor",
  },
  LIGHT_DENSITY: {
    label: "Illuminance",
    shortLabel: "Light",
    unit: "lux",
    decimals: 0,
    icon: Sun,
    min: 0,
    max: 1200,
    bands: { warnLow: 300, critLow: 150, warnHigh: 1100 },
    defaultEnvironment: "indoor",
  },
  CAMERA_AI_CROWD: {
    label: "Crowd density (AI)",
    shortLabel: "Crowd",
    unit: "pax",
    decimals: 0,
    icon: Users,
    min: 0,
    max: 2000,
    bands: { warnHigh: 800, critHigh: 1200 },
    defaultEnvironment: "indoor",
  },
  TILT_STRUCTURAL: {
    label: "Structural tilt",
    shortLabel: "Tilt",
    unit: "°",
    decimals: 3,
    icon: Activity,
    min: 0,
    max: 0.1,
    bands: { warnHigh: 0.02, critHigh: 0.05 },
    defaultEnvironment: "outdoor",
  },
  WIND_OUTDOOR: {
    label: "Surface wind",
    shortLabel: "Wind",
    unit: "m/s",
    decimals: 1,
    icon: Wind,
    min: 0,
    max: 35,
    bands: { warnHigh: 10, critHigh: 17 },
    defaultEnvironment: "outdoor",
  },
  TARMAC_TEMP: {
    label: "Pavement temperature",
    shortLabel: "Tarmac",
    unit: "°C",
    decimals: 1,
    icon: Gauge,
    min: 10,
    max: 75,
    bands: { warnHigh: 60, critHigh: 65 },
    defaultEnvironment: "outdoor",
  },
};

export const SENSOR_TYPES = Object.keys(SENSOR_META) as SensorType[];

// Status palette (state only, never reused for identity). Normal uses the brand
// data blue so a healthy site reads calm; colour always ships with icon + label.
export const HEALTH_STYLES: Record<
  SensorHealth,
  { label: string; color: string; rgb: [number, number, number]; tint: string }
> = {
  normal: {
    label: "Normal",
    color: "#2a78d6",
    rgb: [42, 120, 214],
    tint: "#e8f1fc",
  },
  warning: {
    label: "Warning",
    color: "#fab219",
    rgb: [250, 178, 25],
    tint: "#fef5e1",
  },
  critical: {
    label: "Critical",
    color: "#d03b3b",
    rgb: [208, 59, 59],
    tint: "#fbe9e9",
  },
  offline: {
    label: "Offline",
    color: "#898781",
    rgb: [137, 135, 129],
    tint: "#f0efec",
  },
};

export const HEALTH_ORDER: SensorHealth[] = [
  "critical",
  "warning",
  "normal",
  "offline",
];

const OFFLINE_STATUSES: SensorStatus[] = [
  "OFFLINE",
  "MAINTENANCE",
  "CALIBRATING",
];
const OUTDOOR_ZONE_TYPES = ["RUNWAY", "TAXIWAY", "APRON"];

export const getSensorMeta = (type: SensorType): SensorTypeMeta =>
  SENSOR_META[type] ?? SENSOR_META.TEMPERATURE;

export const getSensorHealth = (
  type: SensorType,
  value: number,
  status?: SensorStatus,
): SensorHealth => {
  if (status && OFFLINE_STATUSES.includes(status)) return "offline";
  if (value === null || value === undefined || Number.isNaN(value))
    return "offline";
  const { bands } = getSensorMeta(type);
  if (
    (bands.critHigh !== undefined && value >= bands.critHigh) ||
    (bands.critLow !== undefined && value <= bands.critLow)
  )
    return "critical";
  if (
    (bands.warnHigh !== undefined && value >= bands.warnHigh) ||
    (bands.warnLow !== undefined && value <= bands.warnLow)
  )
    return "warning";
  return "normal";
};

// 0..1 position of a value within the type's domain
export const normalizeSensorValue = (type: SensorType, value: number) => {
  const { min, max } = getSensorMeta(type);
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
};

export const formatSensorValue = (type: SensorType, value: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: getSensorMeta(type).decimals,
    maximumFractionDigits: getSensorMeta(type).decimals,
  });
};

export const getZoneName = (sensor: Pick<Sensor, "zone">) =>
  typeof sensor.zone === "string"
    ? sensor.zone
    : (sensor.zone?.name ?? "Unassigned zone");

export const getSensorEnvironment = (
  sensor: Pick<Sensor, "type" | "zone">,
): SensorEnvironment => {
  const zoneType =
    typeof sensor.zone === "object" ? sensor.zone?.type : undefined;
  if (zoneType)
    return OUTDOOR_ZONE_TYPES.includes(zoneType) ? "outdoor" : "indoor";
  return getSensorMeta(sensor.type).defaultEnvironment;
};
