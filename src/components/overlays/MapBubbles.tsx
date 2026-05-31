"use client";

import { useAirportStore } from "@/src/store/airport-store";
import { useTelemetryStore } from "@/src/store/useTelemetryStore";
import { useUIStore } from "@/src/store/useUIStore";
import {
  Thermometer,
  Wind,
  CircleDashed,
  Users,
  Sun,
  Shield,
  PlaneTakeoff,
  Navigation,
  Wifi,
} from "lucide-react";

export default function MapBubbles() {
  const tooltips = useAirportStore((state) => state.tooltips);
  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);

  const getSensorIcon = (type: string) => {
    if (!type) return <Wifi size={12} className="text-gray-400" />;
    if (type.includes("TEMP"))
      return <Thermometer size={12} className="text-red-500" />;
    if (type.includes("WIND"))
      return <Wind size={12} className="text-blue-500" />;
    if (type.includes("CO2") || type.includes("HUMIDITY"))
      return <CircleDashed size={12} className="text-amber-500" />;
    if (type.includes("CROWD"))
      return <Users size={12} className="text-purple-500" />;
    if (type.includes("LIGHT"))
      return <Sun size={12} className="text-yellow-500" />;
    if (type.includes("TILT"))
      return <Shield size={12} className="text-[#1e3a8a]" />;
    return <Wifi size={12} className="text-gray-400" />;
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {tooltips
        .filter((p) => p.visible)
        .map((tip) => {
          const isSelected = tip.entityId === selectedEntityId;
          const zIndex = isSelected ? "z-50" : "z-10";
          const opacity = isSelected
            ? "opacity-100"
            : "opacity-85 hover:opacity-100";

          // -----------------------
          // RENDER PLANE BUBBLE
          // -----------------------
          if (tip.entityType === "plane") {
            const plane = planes.find((p) => p.id === tip.entityId);
            if (!plane) return null;

            // ✅ SAFE FALLBACKS
            const airline = plane.airline || "Unknown";
            const callsign = plane.callsign || plane.flightNumber || "N/A";
            const firstLetter = airline.charAt(0).toUpperCase() || "U";
            const speed = plane.speed || 0;

            return (
              <div
                key={`bubble-${tip.entityId}`}
                className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-[calc(100%+15px)] cursor-pointer transition-all duration-200 hover:-translate-y-[calc(100%+20px)] ${zIndex} ${opacity}`}
                style={{ left: `${tip.screenX}px`, top: `${tip.screenY}px` }}
                onClick={() => selectEntity(tip.entityId, "plane")}
              >
                <div
                  className={`border ${isSelected ? "border-[#1e3a8a] shadow-md" : "border-gray-200 shadow-sm"} bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1.5 min-w-[100px] flex items-center gap-2`}
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white bg-blue-900 shrink-0">
                    {firstLetter}
                  </div>
                  {plane.logoUrl && (
                    <img
                      src={plane.logoUrl}
                      alt={callsign}
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  <div className="flex flex-col pr-1">
                    <span className="text-[#1e3a8a] font-bold text-xs tracking-wider leading-tight">
                      {callsign}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-[9px] uppercase font-bold truncate max-w-[60px]">
                        {airline}
                      </span>
                      <span className="text-[8px] text-gray-400 font-mono">
                        ({Math.floor(speed)}kts)
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={`mx-auto w-[1px] h-[15px] ${isSelected ? "bg-[#1e3a8a]" : "bg-gray-400"} opacity-50`}
                ></div>
              </div>
            );
          }

          // -----------------------
          // RENDER SENSOR BUBBLE
          // -----------------------
          const sensor = sensors.find((s) => s.id === tip.entityId);
          if (!sensor) return null;

          const statusColor =
            sensor.status === "ACTIVE"
              ? "bg-green-500"
              : sensor.status === "WARNING"
                ? "bg-amber-500"
                : "bg-red-500";

          return (
            <div
              key={`bubble-${tip.entityId}`}
              className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-[calc(100%+10px)] cursor-pointer transition-all duration-200 hover:-translate-y-[calc(100%+15px)] ${zIndex} ${opacity}`}
              style={{ left: `${tip.screenX}px`, top: `${tip.screenY}px` }}
              onClick={() => selectEntity(tip.entityId, "sensor")}
            >
              <div
                className={`border ${isSelected ? "border-gray-500 shadow-md" : "border-gray-200 shadow-sm"} bg-white/95 backdrop-blur-sm rounded px-2 py-1 min-w-[70px] flex flex-col items-center`}
              >
                <div className="flex items-center gap-1.5 w-full justify-between border-b border-gray-100 pb-0.5 mb-0.5">
                  {getSensorIcon(sensor.type)}
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${statusColor} shrink-0`}
                  />
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-gray-800 font-bold font-mono text-sm leading-none tracking-tight">
                    {typeof sensor.currentValue === "number"
                      ? sensor.currentValue.toFixed(0)
                      : sensor.currentValue || 0}
                  </span>
                  <span className="text-gray-400 text-[8px] font-bold uppercase">
                    {sensor.unit || ""}
                  </span>
                </div>
              </div>
              <div
                className={`mx-auto w-[1px] h-[10px] ${isSelected ? "bg-gray-600" : "bg-gray-300"}`}
              ></div>
            </div>
          );
        })}
    </div>
  );
}
