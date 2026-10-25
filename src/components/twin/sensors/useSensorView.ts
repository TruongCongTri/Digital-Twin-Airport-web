"use client";
import { useAirportStore } from "@/src/store/airport-store";
import {
  formatSensorValue,
  getSensorHealth,
  getSensorMeta,
  getZoneName,
} from "@/src/lib/sensor-meta";
import type { Sensor } from "@/types";

const EMPTY: number[] = [];

/** Everything a sensor badge / row / inspector needs, derived in one place. */
export function useSensorView(sensor: Sensor) {
  const history = useAirportStore(
    (s) => s.sensorLiveHistory[sensor.id] ?? EMPTY,
  );
  const meta = getSensorMeta(sensor.type);
  const health = getSensorHealth(
    sensor.type,
    sensor.currentValue,
    sensor.status,
  );
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const delta = previous !== null ? sensor.currentValue - previous : null;

  return {
    meta,
    health,
    history,
    delta,
    valueText: formatSensorValue(sensor.type, sensor.currentValue),
    zoneName: getZoneName(sensor),
  };
}
