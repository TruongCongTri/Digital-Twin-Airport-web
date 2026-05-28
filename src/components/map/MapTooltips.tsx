"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Plane, Sensor } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";

function PlaneTooltip({ plane, x, y }: { plane: Plane; x: number; y: number }) {
  const { selectEntity } = useAirportStore();
  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center"
      >
        {/* Tooltip Box */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-200/80 text-left whitespace-nowrap min-w-[120px]">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1 mb-1">
            <div
              className={`w-2 h-2 rounded-sm rotate-45 ${plane.status === "TAXIING" ? "bg-blue-500" : "bg-gray-400"}`}
            />
            <span className="text-[11px] font-bold text-gray-800">
              {plane.callsign}
            </span>
          </div>
          <div className="text-[10px] font-bold text-gray-600 uppercase">
            {plane.status}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">
            {plane.status === "TAXIING"
              ? `Next: Runaway ${plane.assignedRunway || "Pending"}`
              : `Gate: ${plane.gate}`}
          </div>
        </div>

        {/* Dashed Connector Line */}
        <div className="h-6 border-l-2 border-dashed border-gray-400 w-px my-0.5" />

        {/* Anchor Dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      </motion.div>
    </div>
  );
}

function SensorTooltip({
  sensor,
  x,
  y,
}: {
  sensor: Sensor;
  x: number;
  y: number;
}) {
  const { selectEntity } = useAirportStore();
  const dotColor =
    sensor.status === "ACTIVE"
      ? "bg-green-500"
      : sensor.status === "CRITICAL"
        ? "bg-amber-500"
        : "bg-red-500";

  const lastVal =
    sensor.history[sensor.history.length - 1]?.value || sensor.currentValue;
  const prevVal = sensor.history[sensor.history.length - 2]?.value || lastVal;
  const trend = lastVal > prevVal ? "↑" : lastVal < prevVal ? "↓" : "→";

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center"
      >
        {/* Tooltip Box */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-200/80 text-left whitespace-nowrap min-w-[110px]">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1 mb-1">
            <div
              className={`w-2 h-2 rounded-full ${sensor.status === "CRITICAL" ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            />
            <span className="text-[11px] font-bold text-gray-800">
              {sensor.name}
            </span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-[11px] font-mono text-gray-700">
              {sensor.currentValue} {sensor.unit}
            </span>
            <span
              className={`text-[10px] font-bold ${trend === "↑" ? "text-red-500" : "text-blue-500"}`}
            >
              {trend}
            </span>
          </div>
        </div>

        {/* Dashed Connector Line */}
        <div className="h-4 border-l-2 border-dashed border-gray-400 w-px my-0.5" />

        {/* Anchor Dot */}
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      </motion.div>
    </div>
  );
}

export function MapTooltips() {
  const { tooltips, planes, sensors, selectedEntityId } = useAirportStore();

  if (selectedEntityId) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <AnimatePresence>
        {tooltips
          .filter((t) => t.visible && t.entityId !== selectedEntityId)
          .map((t) => {
            if (t.entityType === "plane") {
              const plane = planes.find((p) => p.id === t.entityId);
              if (!plane) return null;
              return (
                <PlaneTooltip
                  key={t.entityId}
                  plane={plane}
                  x={t.screenX}
                  y={t.screenY}
                />
              );
            } else if (t.entityType === "sensor") {
              const sensor = sensors.find((s) => s.id === t.entityId);
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
            return null;
          })}
      </AnimatePresence>
    </div>
  );
}
