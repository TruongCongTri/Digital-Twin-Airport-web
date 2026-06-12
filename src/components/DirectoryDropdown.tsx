"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAirportStore } from "@/src/store/airport-store";
import {
  ChevronUp,
  ChevronDown,
  ListFilter,
  Building2,
  MapPin,
  Car, // ✅ Imported Car for civilian vehicles
  Crown, // ✅ Imported Crown for VIP vehicles
} from "lucide-react";
import { Vehicle } from "@/types";

const FACILITIES = [
  {
    id: "VVLT",
    name: "Long Thanh Int'l",
    code: "LTN",
    coords: [107.04036041678714, 10.773641336829593],
  },
  {
    id: "VVTS",
    name: "Tan Son Nhat Int'l",
    code: "SGN",
    coords: [106.65638055031799, 10.817694586314753],
  },
] as const;

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

// ✅ UPDATED: Civilian Vehicle Statuses
const VEHICLE_STATUSES = [
  "APPROACHING_DROP_OFF",
  "DROPPING_OFF",
  "PARKED",
  "APPROACHING_PICK_UP",
  "PICKING_UP",
  "EXITING",
];

// ✅ UPDATED: Civilian Vehicle Types
const VEHICLE_TYPES = ["PERSONAL_CAR", "TAXI", "RIDE_HAIL", "VIP_TRANSFER"];

export function DirectoryDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"planes" | "sensors" | "vehicles">(
    "planes",
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Zustand
  const planes = useAirportStore((state) => state.planes || []);
  const sensors = useAirportStore((state) => state.sensors || []);
  const EMPTY_VEHICLES: Vehicle[] = [];
  const vehicles = useAirportStore((state) => state.vehicles ?? EMPTY_VEHICLES);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const clearSelection = useAirportStore((state) => state.clearSelection);

  const activeAirport = useAirportStore((state) => state.activeAirport);
  const setActiveAirport = useAirportStore((state) => state.setActiveAirport);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAirline, setSelectedAirline] = useState<string | null>(null);

  // Two-Way URL Sync: Listen for URL changes on load/navigation
  useEffect(() => {
    const urlAirport = searchParams.get("airport");
    if (urlAirport && urlAirport !== activeAirport) {
      const targetFacility = FACILITIES.find((f) => f.id === urlAirport);
      if (targetFacility) {
        setActiveAirport(urlAirport);
        clearSelection();
        window.dispatchEvent(
          new CustomEvent("switch-airport", {
            detail: {
              facilityId: targetFacility.id,
              coords: targetFacility.coords,
            },
          }),
        );
      }
    }
  }, [searchParams, activeAirport, setActiveAirport, clearSelection]);

  const AIRLINES = useMemo(() => {
    if (!isOpen) return [];
    return Array.from(new Set(planes.map((p) => p.airline || "UNKNOWN")));
  }, [planes, isOpen]);

  const counts = useMemo(() => {
    if (!isOpen) {
      return {
        planeStatusCounts: {},
        planeAirlineCounts: {},
        sensorTypeCounts: {},
        sensorStatusCounts: {},
        vehicleTypeCounts: {},
        vehicleStatusCounts: {},
      };
    }

    return {
      planeStatusCounts: planes.reduce(
        (acc, p) => {
          acc[p.status || "UNKNOWN"] = (acc[p.status || "UNKNOWN"] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      planeAirlineCounts: planes.reduce(
        (acc, p) => {
          acc[p.airline || "UNKNOWN"] = (acc[p.airline || "UNKNOWN"] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      sensorTypeCounts: sensors
        .filter((s) => (selectedStatus ? s.status === selectedStatus : true))
        .reduce(
          (acc, s) => {
            acc[s.type || "UNKNOWN"] = (acc[s.type || "UNKNOWN"] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      sensorStatusCounts: sensors
        .filter((s) => (selectedType ? s.type === selectedType : true))
        .reduce(
          (acc, s) => {
            acc[s.status || "UNKNOWN"] = (acc[s.status || "UNKNOWN"] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      vehicleTypeCounts: vehicles
        .filter((v) => (selectedStatus ? v.status === selectedStatus : true))
        .reduce(
          (acc, v) => {
            acc[v.type || "UNKNOWN"] = (acc[v.type || "UNKNOWN"] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      vehicleStatusCounts: vehicles
        .filter((v) => (selectedType ? v.type === selectedType : true))
        .reduce(
          (acc, v) => {
            acc[v.status || "UNKNOWN"] = (acc[v.status || "UNKNOWN"] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
    };
  }, [planes, sensors, vehicles, selectedStatus, selectedType, isOpen]);

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

  const handleTabSwitch = (tab: "planes" | "sensors" | "vehicles") => {
    setActiveTab(tab);
    setSelectedStatus(null);
    setSelectedType(null);
    setSelectedAirline(null);
  };

  const handleFacilityChange = useCallback(
    (facilityId: string, coords: readonly [number, number]) => {
      if (activeAirport === facilityId) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("airport", facilityId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setSelectedStatus(null);
      setSelectedType(null);
      setSelectedAirline(null);
    },
    [activeAirport, pathname, router, searchParams],
  );

  const { filteredPlanes, filteredSensors, filteredVehicles } = useMemo(() => {
    if (!isOpen)
      return { filteredPlanes: [], filteredSensors: [], filteredVehicles: [] };

    return {
      filteredPlanes: planes.filter(
        (p) =>
          (selectedStatus ? p.status === selectedStatus : true) &&
          (selectedAirline ? p.airline === selectedAirline : true),
      ),
      filteredSensors: sensors.filter(
        (s) =>
          (selectedType ? s.type === selectedType : true) &&
          (selectedStatus ? s.status === selectedStatus : true),
      ),
      filteredVehicles: vehicles.filter(
        (v) =>
          (selectedType ? v.type === selectedType : true) &&
          (selectedStatus ? v.status === selectedStatus : true),
      ),
    };
  }, [
    planes,
    sensors,
    vehicles,
    selectedStatus,
    selectedAirline,
    selectedType,
    isOpen,
  ]);

  return (
    <div ref={dropdownRef} className="relative flex flex-col items-center">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[calc(100%+12px)] w-80 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200/80 shadow-2xl flex flex-col origin-bottom"
          >
            {/* FACILITY SELECTOR */}
            <div className="mb-3 pb-3 border-b border-dashed border-gray-300">
              <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                <Building2 size={12} className="text-[#1e3a8a]" /> Active
                Facility
              </label>
              <div className="flex gap-2">
                {FACILITIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFacilityChange(f.id, f.coords)}
                    className={`flex-1 p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                      activeAirport === f.id
                        ? "bg-[#1e3a8a] border-[#1e3a8a] text-white shadow-md"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest ${activeAirport === f.id ? "text-blue-200" : "text-gray-400"}`}
                      >
                        {f.code}
                      </span>
                      {activeAirport === f.id && (
                        <MapPin
                          size={10}
                          className="text-white animate-pulse"
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold leading-tight line-clamp-1">
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-gray-800 uppercase">
                {activeTab === "planes" && `Planes (${filteredPlanes.length})`}
                {activeTab === "sensors" &&
                  `Sensors (${filteredSensors.length})`}
                {activeTab === "vehicles" &&
                  `Vehicles (${filteredVehicles.length})`}
              </span>
              <button
                onClick={() => {
                  setSelectedStatus(null);
                  setSelectedType(null);
                  setSelectedAirline(null);
                }}
                className="text-[9px] text-red-500 font-bold uppercase hover:underline"
              >
                Clear Filters
              </button>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
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
              <button
                onClick={() => handleTabSwitch("vehicles")}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === "vehicles" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-500"}`}
              >
                VEHICLES
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-3">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(activeTab === "planes"
                    ? PLANE_STATUSES
                    : activeTab === "sensors"
                      ? SENSOR_STATUSES
                      : VEHICLE_STATUSES
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setSelectedStatus(selectedStatus === s ? null : s)
                      }
                      className={`px-2 py-1 text-[9px] font-bold rounded border ${selectedStatus === s ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                    >
                      {s.replace(/_/g, " ")}{" "}
                      <span className="opacity-50">
                        (
                        {activeTab === "planes"
                          ? counts.planeStatusCounts[s] || 0
                          : activeTab === "sensors"
                            ? counts.sensorStatusCounts[s] || 0
                            : counts.vehicleStatusCounts[s] || 0}
                        )
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "planes" && (
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 block">
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

              {activeTab === "sensors" && (
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 block">
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
                        {t.replace(/_/g, " ")}{" "}
                        <span className="opacity-50">
                          ({counts.sensorTypeCounts[t] || 0})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "vehicles" && (
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 block">
                    Vehicle Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {VEHICLE_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setSelectedType(selectedType === t ? null : t)
                        }
                        className={`px-2 py-1 text-[9px] font-bold rounded border ${selectedType === t ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                      >
                        {t.replace(/_/g, " ")}{" "}
                        <span className="opacity-50">
                          ({counts.vehicleTypeCounts[t] || 0})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar pt-2 border-t border-gray-100">
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
                    <div className="flex items-center gap-2.5">
                      {plane.logoUrl ? (
                        <img
                          src={plane.logoUrl}
                          alt={plane.airline}
                          className="w-5 h-5 object-contain shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-200 rounded-md flex items-center justify-center text-[8px] font-bold text-gray-500 shrink-0">
                          {plane.airline?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-bold text-gray-800">
                          {plane.callsign || plane.flightNumber || "N/A"}
                        </span>
                        <span className="text-[9px] font-medium text-gray-400">
                          {plane.airline || "Unknown"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${["CRITICAL", "WARNING", "DELAYED", "CANCELLED"].includes(plane.status || "") ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        {plane.status}
                      </div>
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
                        {sensor.name || "Unknown"}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400">
                        {(sensor.type || "UNKNOWN").replace("_", " ")}
                      </span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${["CRITICAL", "WARNING", "DELAYED", "CANCELLED"].includes(sensor.status || "") ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}
                    >
                      {sensor.status}
                    </div>
                  </button>
                ))}

              {/* ✅ UPDATED: Render Vehicles With Dynamic Icons and Colors */}
              {activeTab === "vehicles" &&
                filteredVehicles.map((vehicle) => {
                  const isVip = vehicle.type === "VIP_TRANSFER";
                  const isTaxi = vehicle.type === "TAXI";
                  const isRideHail = vehicle.type === "RIDE_HAIL";

                  let IconClass = "text-gray-500";
                  let bgClass = "bg-gray-100 border-gray-200";
                  let VehicleIcon = Car;

                  if (isVip) {
                    VehicleIcon = Crown;
                    IconClass = "text-purple-500";
                    bgClass = "bg-purple-50 border-purple-200";
                  } else if (isTaxi) {
                    IconClass = "text-amber-500";
                    bgClass = "bg-amber-50 border-amber-200";
                  } else if (isRideHail) {
                    IconClass = "text-blue-500";
                    bgClass = "bg-blue-50 border-blue-200";
                  }

                  return (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        selectEntity(vehicle.id, "vehicle");
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 border rounded-md flex items-center justify-center shrink-0 ${bgClass}`}
                        >
                          <VehicleIcon size={12} className={IconClass} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-gray-800">
                            {vehicle.callsign ||
                              vehicle.licensePlate ||
                              "Unknown"}
                          </span>
                          <span className="text-[9px] font-medium text-gray-400">
                            {(vehicle.type || "UNKNOWN").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${["EXITING"].includes(vehicle.status || "") ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        {vehicle.status.replace(/_/g, " ")}
                      </div>
                    </button>
                  );
                })}
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
