"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Plane, Sensor, Vehicle } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";

// ==========================================
// 1. PLANE TOOLTIP
// ==========================================
const PlaneTooltip = React.memo(function PlaneTooltip({
  plane,
  x,
  y,
}: {
  plane: Plane;
  x: number;
  y: number;
}) {
  const destinationText =
    plane.status === "TAXIING"
      ? `Next: Runway ${plane.assignedRunway || "Pending"}`
      : `Gate: ${plane.parkingStand?.code || plane.gate || "Pending"}`;

  const callsign = plane.callsign || plane.flightNumber || "UNKNOWN";
  const status = plane.status || "UNKNOWN";

  return (
    <div
      className="absolute z-20 pointer-events-auto cursor-pointer"
      style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}
      onClick={() => useAirportStore.getState().selectEntity(plane.id, "plane")}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="flex flex-col items-center pb-2 hover:-translate-y-1 transition-transform"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-200/80 text-left whitespace-nowrap min-w-[120px] hover:border-[#1e3a8a] transition-colors">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1 mb-1">
            <div
              className={`w-2 h-2 rounded-sm rotate-45 ${status === "TAXIING" ? "bg-blue-500" : "bg-gray-400"}`}
            />
            <span className="text-[11px] font-bold text-gray-800">
              {callsign}
            </span>
          </div>
          <div className="text-[10px] font-bold text-gray-600 uppercase">
            {status}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">
            {destinationText}
          </div>
        </div>
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95 drop-shadow-md" />
      </motion.div>
    </div>
  );
});

// ==========================================
// 2. SENSOR TOOLTIP
// ==========================================
const SensorTooltip = React.memo(function SensorTooltip({
  sensor,
  x,
  y,
}: {
  sensor: Sensor;
  x: number;
  y: number;
}) {
  const status = sensor.status || "UNKNOWN";
  const historyLen = sensor.history?.length || 0;
  const lastVal =
    historyLen > 0 ? sensor.history[historyLen - 1].value : sensor.currentValue;
  const prevVal =
    historyLen > 1 ? sensor.history[historyLen - 2].value : lastVal;
  const trend = lastVal > prevVal ? "↑" : lastVal < prevVal ? "↓" : "→";

  return (
    <div
      className="absolute z-20 pointer-events-auto cursor-pointer"
      style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}
      onClick={() =>
        useAirportStore.getState().selectEntity(sensor.id, "sensor")
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="flex flex-col items-center hover:-translate-y-1 transition-transform"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-xl border border-gray-200/80 text-left whitespace-nowrap min-w-[110px]">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1 mb-1">
            <div
              className={`w-2 h-2 rounded-full ${status === "CRITICAL" ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            />
            <span className="text-[11px] font-black text-gray-800 tracking-tight">
              {sensor.name || "Unknown Sensor"}
            </span>
          </div>
          <div className="flex justify-between items-end gap-3 mt-1">
            <span className="text-sm font-black text-[#1e3a8a] font-mono leading-none">
              {Number(sensor.currentValue).toFixed(
                sensor.type.includes("TILT") ? 3 : 1,
              )}
              <span className="text-[9px] text-gray-400 font-sans font-bold ml-0.5">
                {sensor.unit}
              </span>
            </span>
            <span
              className={`text-[10px] font-black ${trend === "↑" ? "text-red-500" : trend === "↓" ? "text-blue-500" : "text-gray-400"}`}
            >
              {trend}
            </span>
          </div>
        </div>
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95 drop-shadow-md" />
      </motion.div>
    </div>
  );
});

// ==========================================
// 3. VEHICLE TOOLTIP
// ==========================================
const VehicleTooltip = React.memo(function VehicleTooltip({
  vehicle,
  x,
  y,
}: {
  vehicle: Vehicle;
  x: number;
  y: number;
}) {
  const status = vehicle.status || "UNKNOWN";
  const speed =
    vehicle.speed !== undefined ? `${Math.round(vehicle.speed)} kts` : "0 kts";

  return (
    <div
      className="absolute z-20 pointer-events-auto cursor-pointer"
      style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}
      onClick={() =>
        useAirportStore.getState().selectEntity(vehicle.id, "vehicle")
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="flex flex-col items-center pb-2 hover:-translate-y-1 transition-transform"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-200/80 text-left whitespace-nowrap min-w-[120px] hover:border-amber-500 transition-colors">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-sm ${status === "EXITING" ? "bg-red-500" : "bg-amber-500"}`}
              />
              {/* ✅ UPDATED: Render License Plate */}
              <span className="text-[11px] font-bold text-gray-800">
                {vehicle.licensePlate || "Unknown"}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-[9px] font-bold text-gray-600 uppercase">
              {status.replace(/_/g, " ")}
            </span>
            <span className="text-[9px] font-mono text-gray-500">{speed}</span>
          </div>
        </div>
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95 drop-shadow-md" />
      </motion.div>
    </div>
  );
});

// ==========================================
// MASTER RENDERER
// ==========================================
export function MapTooltips() {
  const tooltips = useAirportStore((state) => state.tooltips);
  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);
  const EMPTY_VEHICLES: Vehicle[] = [];
  const vehicles = useAirportStore((state) => state.vehicles ?? EMPTY_VEHICLES);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);

  // O(1) Lookup Maps
  const planesMap = useMemo(() => {
    return planes.reduce(
      (acc, plane) => {
        acc[plane.id] = plane;
        return acc;
      },
      {} as Record<string, Plane>,
    );
  }, [planes]);

  const sensorsMap = useMemo(() => {
    return sensors.reduce(
      (acc, sensor) => {
        acc[sensor.id] = sensor;
        return acc;
      },
      {} as Record<string, Sensor>,
    );
  }, [sensors]);

  const vehiclesMap = useMemo(() => {
    return vehicles.reduce(
      (acc, vehicle) => {
        acc[vehicle.id] = vehicle;
        return acc;
      },
      {} as Record<string, Vehicle>,
    );
  }, [vehicles]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <AnimatePresence>
        {tooltips
          .filter((t) => {
            if (!t.visible) return false;
            // ISOLATION: If an entity is focused, ONLY show its tooltip
            if (selectedEntityId) return t.entityId === selectedEntityId;
            return true;
          })
          .map((t) => {
            if (t.entityType === "plane") {
              const plane = planesMap[t.entityId];
              if (!plane) return null;
              return (
                <PlaneTooltip
                  key={t.entityId}
                  plane={plane}
                  x={t.screenX}
                  y={t.screenY}
                />
              );
            }

            if (t.entityType === "sensor") {
              const sensor = sensorsMap[t.entityId];
              if (!sensor) return null;
              return (
                <SensorTooltip
                  key={t.entityId}
                  sensor={sensor}
                  x={t.screenX}
                  y={t.screenY}
                />
              );
            }

            if (t.entityType === "vehicle") {
              const vehicle = vehiclesMap[t.entityId];
              if (!vehicle) return null;
              return (
                <VehicleTooltip
                  key={t.entityId}
                  vehicle={vehicle}
                  x={t.screenX}
                  y={t.screenY}
                />
              );
            }

            return null; // Fallback if type is unrecognized
          })}
      </AnimatePresence>
    </div>
  );
}
