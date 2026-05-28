"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAirportStore } from "@/src/store/airport-store";
import {
  Plane,
  Radio,
  ChevronUp,
  ChevronDown,
  ListFilter,
  MapPin,
  Filter,
} from "lucide-react";

export function DirectoryDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"planes" | "sensors">("planes");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);
  const selectEntity = useAirportStore((state) => state.selectEntity);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAirline, setSelectedAirline] = useState<string | null>(null);

  // Constants
  const PLANE_STATUSES = [
    "SCHEDULED",
    "DELAYED",
    "APPROACHING",
    "LANDED",
    "TAXIING",
    "PARKED",
    "BOARDING",
    "PUSHBACK",
    "DEPARTED",
    "DIVERTED",
    "CANCELLED",
  ];
  const SENSOR_STATUSES = [
    "ACTIVE",
    "WARNING",
    "CRITICAL",
    "MAINTENANCE",
    "CALIBRATING",
    "OFFLINE",
    "UNREACHABLE",
  ];
  const SENSOR_TYPES = [
    "CO2",
    "TEMPERATURE",
    "HUMIDITY",
    "WIND_INDOOR",
    "WIND_OUTDOOR",
    "TILT_STRUCTURAL",
    "LIGHT_DENSITY",
    "TARMAC_TEMP",
    "CAMERA_AI_CROWD",
  ];

  // --- DERIVED COUNTS LOGIC ---
  const AIRLINES = useMemo(
    () => Array.from(new Set(planes.map((p) => p.airline))),
    [planes],
  );

  const counts = useMemo(() => {
    // 1. Planes Status Counts
    const planeStatusCounts = planes.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 2. Planes Airline Counts
    const planeAirlineCounts = planes.reduce(
      (acc, p) => {
        acc[p.airline] = (acc[p.airline] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 3. Sensors Type Counts (Cross-filtered by selected Status)
    const sensorsFilteredByStatus = sensors.filter((s) =>
      selectedStatus ? s.status === selectedStatus : true,
    );
    const sensorTypeCounts = sensorsFilteredByStatus.reduce(
      (acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 4. Sensors Status Counts (Cross-filtered by selected Type)
    const sensorsFilteredByType = sensors.filter((s) =>
      selectedType ? s.type === selectedType : true,
    );
    const sensorStatusCounts = sensorsFilteredByType.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      planeStatusCounts,
      planeAirlineCounts,
      sensorTypeCounts,
      sensorStatusCounts,
    };
  }, [planes, sensors, selectedStatus, selectedType]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTabSwitch = (tab: "planes" | "sensors") => {
    setActiveTab(tab);
    setSelectedStatus(null);
    setSelectedType(null);
  };

  const filteredPlanes = planes.filter(
    (p) =>
      (selectedStatus ? p.status === selectedStatus : true) &&
      (selectedAirline ? p.airline === selectedAirline : true),
  );

  const filteredSensors = sensors.filter(
    (s) =>
      (selectedType ? s.type === selectedType : true) &&
      (selectedStatus ? s.status === selectedStatus : true),
  );

  return (
    <div ref={dropdownRef} className="relative flex flex-col items-center">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[calc(100%+12px)] w-80 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200/80 shadow-2xl flex flex-col origin-bottom"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-800 uppercase">
                {activeTab === "planes"
                  ? `Planes (${filteredPlanes.length})`
                  : `Sensors (${filteredSensors.length})`}
              </span>
              <button
                onClick={() => {
                  setSelectedStatus(null);
                  setSelectedType(null);
                }}
                className="text-[9px] text-red-500 font-bold uppercase hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              <button
                onClick={() => handleTabSwitch("planes")}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === "planes" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-500"}`}
              >
                PLANES
              </button>
              <button
                onClick={() => handleTabSwitch("sensors")}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === "sensors" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-500"}`}
              >
                SENSORS
              </button>
            </div>

            <div className="space-y-4 mb-4">
              {/* Status Filters */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(activeTab === "planes"
                    ? PLANE_STATUSES
                    : SENSOR_STATUSES
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setSelectedStatus(selectedStatus === s ? null : s)
                      }
                      className={`px-2 py-1 text-[9px] font-bold rounded border ${selectedStatus === s ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                    >
                      {s}{" "}
                      <span className="opacity-50">
                        {/* FIXED TERNARY OPERATOR HERE */}(
                        {activeTab === "planes"
                          ? counts.planeStatusCounts[s] || 0
                          : counts.sensorStatusCounts[s] || 0}
                        )
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Airline Filter (Planes Only) */}
              {activeTab === "planes" && (
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">
                    Airline
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AIRLINES.map((a) => (
                      <button
                        key={a}
                        onClick={() =>
                          setSelectedAirline(selectedAirline === a ? null : a)
                        }
                        className={`px-2 py-1 text-[9px] font-bold rounded border ${selectedAirline === a ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                      >
                        {a}{" "}
                        <span className="opacity-50">
                          ({counts.planeAirlineCounts[a] || 0})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Type Filter (Sensors Only) */}
              {activeTab === "sensors" && (
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">
                    Sensor Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SENSOR_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setSelectedType(selectedType === t ? null : t)
                        }
                        className={`px-2 py-1 text-[9px] font-bold rounded border ${selectedType === t ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                      >
                        {t.replace("_", " ")}{" "}
                        <span className="opacity-50">
                          ({counts.sensorTypeCounts[t] || 0})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List - Separated Maps to fix Type Inference */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar pt-2 border-t border-gray-100">
              {activeTab === "planes" &&
                filteredPlanes.map((plane) => (
                  <button
                    key={plane.id}
                    onClick={() => {
                      selectEntity(plane.id, "plane");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold text-gray-800">
                        {plane.callsign}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400">
                        {plane.airline}
                      </span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${["CRITICAL", "WARNING", "DELAYED", "CANCELLED"].includes(plane.status) ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}
                    >
                      {plane.status}
                    </div>
                  </button>
                ))}

              {activeTab === "sensors" &&
                filteredSensors.map((sensor) => (
                  <button
                    key={sensor.id}
                    onClick={() => {
                      selectEntity(sensor.id, "sensor");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold text-gray-800">
                        {sensor.name}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400">
                        {sensor.type.replace("_", " ")}
                      </span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${["CRITICAL", "WARNING", "DELAYED", "CANCELLED"].includes(sensor.status) ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}
                    >
                      {sensor.status}
                    </div>
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs bg-white/95 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all"
      >
        <ListFilter size={16} /> Directory
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </div>
  );
}
