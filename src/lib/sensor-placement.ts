// Turns raw sensor coordinates into where (and how big) each sensor is drawn in 3D.
// Shared by the value columns, map badges, camera fly-to and the immersive heatmap,
// so every view agrees on a sensor's position.
import type { Sensor } from "@/types";
import type { AirportConfig } from "@/constants/airports";
import { getSensorEnvironment, type SensorEnvironment } from "./sensor-meta";

export interface SensorPlacement {
  lon: number;
  lat: number;
  z: number; // metres above ground at the column base
  environment: SensorEnvironment;
  columnHeight: number; // full-scale track height (m)
  columnWidth: number; // m
}

// Column sizes per airport scale. BIM airports show sensors at true size inside the
// model; "site" airports (no BIM, viewed from far) need much larger markers.
const COLUMN_SIZES = {
  bim: {
    // Fits within one storey (~6.5 m floor-to-floor in the IFC) and stays legible at building scale
    indoor: { height: 5, width: 2.2, spread: 7 },
    outdoor: { height: 18, width: 4, spread: 18 },
  },
  site: {
    indoor: { height: 45, width: 9, spread: 40 },
    outdoor: { height: 60, width: 12, spread: 45 },
  },
} as const;

// Sits columns just above the slab top at each storey elevation
const SLAB_CLEARANCE = 0.3;
const METRES_PER_DEG = 111_320;

let cacheKey = "";
let cache = new Map<string, SensorPlacement>();

/**
 * Places every sensor. Sensors that share a mounting point (several types on one
 * device cluster) are fanned out evenly on a small ring so each column stays readable.
 * Positions never change at runtime, so the result is cached by sensor ids.
 */
export const getSensorPlacements = (
  sensors: Sensor[],
  airport: AirportConfig,
): Map<string, SensorPlacement> => {
  const key = `${airport.id}|${sensors.map((s) => s.id).join(",")}`;
  if (key === cacheKey) return cache;

  const sizes = COLUMN_SIZES[airport.model ? "bim" : "site"];
  const groups = new Map<string, Sensor[]>();
  for (const sensor of sensors) {
    const groupKey = `${sensor.x.toFixed(6)}|${sensor.y.toFixed(6)}|${Math.round(sensor.z ?? 0)}`;
    const group = groups.get(groupKey);
    if (group) group.push(sensor);
    else groups.set(groupKey, [sensor]);
  }

  const placements = new Map<string, SensorPlacement>();
  for (const group of groups.values()) {
    // Stable order so a sensor keeps its slot on the ring
    group.sort(
      (a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
    );
    group.forEach((sensor, i) => {
      const environment = getSensorEnvironment(sensor);
      const size = sizes[environment];
      const radius = group.length > 1 ? size.spread : 0;
      const angle = (2 * Math.PI * i) / group.length;
      const east = Math.cos(angle) * radius;
      const north = Math.sin(angle) * radius;
      placements.set(sensor.id, {
        lon:
          sensor.x +
          east / (METRES_PER_DEG * Math.cos((sensor.y * Math.PI) / 180)),
        lat: sensor.y + north / METRES_PER_DEG,
        z: Math.max(0, sensor.z ?? 0) + SLAB_CLEARANCE,
        environment,
        columnHeight: size.height,
        columnWidth: size.width,
      });
    });
  }

  cacheKey = key;
  cache = placements;
  return placements;
};
