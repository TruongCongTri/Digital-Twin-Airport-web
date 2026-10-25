// Operator guidance per sensor, driven by the same health bands as the colours
// (sensor-meta) plus the next forecast step, so advice never contradicts status.
import type { SensorType } from "@/types";
import {
  getSensorHealth,
  getSensorMeta,
  type SensorHealth,
} from "./sensor-meta";

export interface Recommendation {
  severity: SensorHealth;
  text: string;
}

const ADVICE: Record<
  SensorType,
  Partial<Record<SensorHealth, string>> & {
    normal: string;
    high?: string;
    low?: string;
  }
> = {
  TEMPERATURE: {
    normal:
      "Temperature in comfort band. Energy-saving setpoints can stay active.",
    high: "Zone warming. Increase cooling load on the serving AHU by 10%.",
    low: "Zone over-cooled. Reduce chiller output for this zone.",
  },
  HUMIDITY: {
    normal: "Humidity nominal.",
    high: "High humidity. Run the HVAC dehumidification cycle.",
    low: "Air too dry. Check humidifier and fresh-air mix.",
  },
  CO2: {
    normal: "Air quality good. No ventilation change needed.",
    high: "CO₂ rising. Open fresh-air intake dampers to at least 40%.",
  },
  WIND_INDOOR: {
    normal: "Indoor air circulation nominal.",
    high: "Draught detected. Reduce local blower fan speed.",
  },
  LIGHT_DENSITY: {
    normal: "Lighting within task range.",
    low: "Illuminance low. Check fixtures and daylight blinds in this zone.",
    high: "Glare risk. Lower artificial lighting or deploy blinds.",
  },
  CAMERA_AI_CROWD: {
    normal: "Passenger flow stable. Keep current staffing.",
    high: "Crowd building. Open extra lanes and deploy floor staff.",
  },
  TILT_STRUCTURAL: {
    normal: "Structure within movement tolerance.",
    high: "Structural movement above tolerance. Notify facilities engineering and inspect.",
  },
  WIND_OUTDOOR: {
    normal: "Wind safe for standard apron operations.",
    high: "High wind. Secure loose apron equipment and alert ramp crews.",
  },
  TARMAC_TEMP: {
    normal: "Pavement temperature within operating limits.",
    high: "Extreme surface heat. Increase turnaround cooling and limit crew exposure.",
  },
};

/** Advice for the worse of the current reading and the next forecast step. */
export const getRecommendation = (
  type: SensorType,
  current: number,
  nextForecast?: number,
): Recommendation => {
  const meta = getSensorMeta(type);
  const value =
    nextForecast !== undefined &&
    getSensorHealth(type, nextForecast) !== "normal" &&
    getSensorHealth(type, current) === "normal"
      ? nextForecast
      : current;
  const severity = getSensorHealth(type, value);
  const advice = ADVICE[type];
  if (severity === "normal" || severity === "offline")
    return { severity, text: advice.normal };

  const isLow =
    (meta.bands.warnLow !== undefined && value <= meta.bands.warnLow) ||
    (meta.bands.critLow !== undefined && value <= meta.bands.critLow);
  const text =
    (isLow ? advice.low : advice.high) ??
    advice.high ??
    advice.low ??
    advice.normal;
  const forecastNote = value !== current ? " (forecast)" : "";
  return { severity, text: text + forecastNote };
};
