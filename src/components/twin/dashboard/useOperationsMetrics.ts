"use client";
// Live operations metrics for the dashboard. Sensor averages come from logged sensor
// history; flight counts from live state. Throughput, taxi, GSE and power series are
// simulated from the live ground traffic (there are no real feeds for them yet).
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAirportStore } from "@/src/store/airport-store";
import { fetchAllSensorLogs } from "@/src/lib/api-client";
import { PLANE_STATUS_CONFIG } from "@/src/lib/status-config";
import type { PlaneStatus } from "@/types";

export interface TimeDataPoint {
  time: string;
  temp: number;
  hum: number;
  wind: number;
  tilt: number;
  co2: number;
  flights: number;
  capacity: number;
  taxiIn: number;
  taxiOut: number;
  secT1: number;
  secT2: number;
  secT3: number;
  powerT1: number;
  powerT2: number;
  powerT3: number;
  gseFuel: number;
  gseBag: number;
}

interface SensorLogPayload {
  id: string;
  sensorId: string;
  value: number;
  timestamp: string;
}

export function useOperationsMetrics(enabled: boolean) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);
  const activeAirport = useAirportStore((state) => state.activeAirport);

  // --- 1. PURE CLOCK HYDRATION (Fixed Cascade Render Error) ---
  useEffect(() => {
    if (!enabled) return;

    const initTimer = setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [enabled]);

  // --- 2. TANSTACK QUERY ---
  const { data: rawLogs = [] } = useQuery({
    // Add activeAirport to the queryKey so it refetches cleanly when switching airports
    queryKey: ["allSensorLogs", activeAirport],
    queryFn: () => fetchAllSensorLogs(activeAirport),
    enabled: enabled,
    refetchInterval: 300000, // 5 mins
  });

  // --- 3. FIX: TRANSFORM ARRAY TO DICTIONARY ---
  const historicalData = useMemo(() => {
    const dict: Record<string, { timestamp: string; value: number }[]> = {};
    if (Array.isArray(rawLogs)) {
      rawLogs.forEach((log: SensorLogPayload) => {
        if (!dict[log.sensorId]) {
          dict[log.sensorId] = [];
        }
        dict[log.sensorId].push({
          timestamp: log.timestamp,
          value: log.value,
        });
      });
    }
    // The API returns newest first; the series below index oldest -> newest
    for (const list of Object.values(dict))
      list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return dict;
  }, [rawLogs]);

  const planeStatuses = useMemo(() => {
    return (Object.keys(PLANE_STATUS_CONFIG) as PlaneStatus[])
      .map((status) => ({
        name: PLANE_STATUS_CONFIG[status].label,
        value: planes.filter((p) => p.status === status).length,
        color: PLANE_STATUS_CONFIG[status].color,
      }))
      .filter((d) => d.value > 0);
  }, [planes]);

  const { timeData, airlineData } = useMemo(() => {
    const airlineCounts = planes.reduce(
      (acc, p) => {
        if (!p.airline) return acc;
        acc[p.airline] = (acc[p.airline] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const airlineData = Object.keys(airlineCounts)
      .map((k) => ({ name: k, count: airlineCounts[k] }))
      .sort((a, b) => b.count - a.count);

    const data: TimeDataPoint[] = [];

    if (currentTime !== 0) {
      const DATA_POINTS = 20;
      const activeGroundPlanes = planes.filter((p) =>
        ["LANDED", "TAXIING", "PARKED", "BOARDING", "PUSHBACK"].includes(
          p.status as string,
        ),
      ).length;

      const tempSensors = sensors.filter((s) => s.type.includes("TEMP"));
      const humSensors = sensors.filter((s) => s.type.includes("HUMIDITY"));
      const windSensors = sensors.filter((s) => s.type.includes("WIND"));
      const tiltSensors = sensors.filter((s) => s.type.includes("TILT"));
      const co2Sensors = sensors.filter((s) => s.type.includes("CO2"));

      const getAvg = (sensorGroup: typeof sensors, index: number) => {
        if (!sensorGroup.length) return 0;
        let sum = 0,
          count = 0;
        for (const s of sensorGroup) {
          const histArr = historicalData[s.id] || [];
          const histIndex = Math.floor((index / DATA_POINTS) * histArr.length);
          const h = histArr[histIndex] || histArr[histArr.length - 1];

          if (h) {
            sum += h.value;
            count++;
          } else {
            sum += s.currentValue;
            count++;
          }
        }
        return count ? sum / count : 0;
      };

      for (let i = 0; i < DATA_POINTS; i++) {
        const t = new Date(currentTime - (DATA_POINTS - 1 - i) * 60000);
        const timeLabel = t.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const noise = Math.sin(i) * 2;
        const baseSec = 5;
        const basePower = 200;

        data.push({
          time: timeLabel,
          temp: Number(getAvg(tempSensors, i).toFixed(1)),
          hum: Number(getAvg(humSensors, i).toFixed(1)),
          wind: Number(getAvg(windSensors, i).toFixed(1)),
          tilt: Number((getAvg(tiltSensors, i) * 1000).toFixed(2)),
          co2: Number(getAvg(co2Sensors, i).toFixed(0)),
          flights: Math.max(
            5,
            Math.floor(activeGroundPlanes * 1.2 + 15 + noise * 2.5),
          ),
          capacity: 50,
          taxiIn: Math.max(
            2,
            Math.floor(activeGroundPlanes * 0.4 + 8 + Math.cos(i) * 2),
          ),
          taxiOut: Math.max(
            2,
            Math.floor(activeGroundPlanes * 0.5 + 10 + noise * 1.5),
          ),
          secT1: Math.max(2, baseSec + activeGroundPlanes * 0.4 + noise),
          secT2: Math.max(
            2,
            baseSec - 1 + activeGroundPlanes * 0.35 + noise * 0.8,
          ),
          secT3: Math.max(
            2,
            baseSec - 2 + activeGroundPlanes * 0.25 + noise * 0.5,
          ),
          powerT1: basePower + activeGroundPlanes * 12 + noise * 10,
          powerT2: basePower - 20 + activeGroundPlanes * 10 + noise * 8,
          powerT3: basePower - 50 + activeGroundPlanes * 7 + noise * 6,
          gseFuel: Math.max(2, Math.floor(activeGroundPlanes * 0.3)),
          gseBag: Math.max(4, Math.floor(activeGroundPlanes * 0.8)),
        });
      }
    }

    return { timeData: data, airlineData };
  }, [sensors, planes, historicalData, currentTime]);

  const latestData = timeData[timeData.length - 1] || {
    secT1: 18,
    secT2: 4,
    gseFuel: 14,
    gseBag: 42,
  };

  return { timeData, airlineData, planeStatuses, latestData };
}
