"use client";
import { BentoPanel, BentoBox } from "./BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import { PlaneStatus } from "@/types";
import {
  Plane,
  Navigation,
  X,
  Calendar,
  ShieldCheck,
  Truck,
  Users,
  Route,
  Weight,
  Radio,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Check,
  Clock,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const boxClass =
  "bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-sm p-5 pointer-events-auto";

export function PlaneFocusPanel() {
  // ✅ FIX: Strict selectors to prevent massive re-renders
  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const clearSelection = useAirportStore((state) => state.clearSelection);
  const plane = useAirportStore((state) => state.getSelectedPlane());

  // ✅ FIX: Extract primitives so we don't subscribe to the entire array of moving planes
  const totalPlanes = useAirportStore((state) => state.planes.length);
  const currentIndex = useAirportStore((state) =>
    plane ? state.planes.findIndex((p) => p.id === plane.id) : -1,
  );

  if (!isDashboardOpen || !plane) return null;

  const speedHistory =
    plane.path?.map((p, i) => ({
      time: `-${plane.path!.length - i}s`,
      speed: Math.max(0, plane.speed - Math.abs(Math.sin(i * 12.9898)) * 5),
      altitude: plane.altitude,
    })) || [];

  const handlePrev = () => {
    // ✅ Grab the state statically only when clicked
    const planes = useAirportStore.getState().planes;
    const prevIndex = currentIndex <= 0 ? totalPlanes - 1 : currentIndex - 1;
    selectEntity(planes[prevIndex].id, "plane");
  };

  const handleNext = () => {
    const planes = useAirportStore.getState().planes;
    const nextIndex = currentIndex >= totalPlanes - 1 ? 0 : currentIndex + 1;
    selectEntity(planes[nextIndex].id, "plane");
  };

  // Safe Fallbacks for Optional Fields
  const aircraftType = plane.aircraftType || "A350-900";
  const weight = plane.weight || 245000;
  const gate = plane.parkingStand?.code || plane.gate || "TBA";

  // Strict Enum Mapping for the Ground Lifecycle
  const lifecycleSteps = [
    { label: "Landed", keys: ["APPROACHING", "LANDED"] },
    { label: "Taxiing", keys: ["TAXIING"] },
    { label: "Parked", keys: ["PARKED"] },
    { label: "Pushback", keys: ["PUSHBACK"] },
    { label: "Departed", keys: ["DEPARTED", "SCHEDULED"] }, // Scheduled planes wait at the end of the line
  ];

  const getLifecycleIndex = (status: PlaneStatus): number => {
    const map: Record<PlaneStatus, number> = {
      SCHEDULED: 0,
      PUSHBACK: 1,
      TAXIING: 2,
      PARKED: 3,
      APPROACHING: 4,
      LANDED: 4,
      DEPARTED: 5,
      DELAYED: 0,
      DIVERTED: 0,
      CANCELLED: 0,
    };
    return map[status] ?? 0;
  };

  // const currentStepIndex = Math.max(
  //   0,
  //   lifecycleSteps.findIndex((step) => step.keys.includes(plane.status)),
  // );
  const currentStepIndex = getLifecycleIndex(plane.status);
  const isInbound = ["APPROACHING", "LANDED", "TAXIING"].includes(plane.status);

  return (
    <>
      <BentoPanel
        direction="left"
        isOpen={true}
        className="absolute top-20 left-6 w-[360px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
      >
        {/* LEFT PANEL HEADER */}
        <BentoBox
          className={`${boxClass} py-4 flex justify-between items-start shrink-0 sticky top-0 z-50`}
        >
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {plane.callsign || plane.flightNumber}
            </h2>
            <div className="text-[10px] font-bold text-white bg-[#1e3a8a] px-2 py-0.5 rounded inline-block mt-1 tracking-widest">
              {plane.status}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-0.5 shadow-sm">
              <button
                onClick={handlePrev}
                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-400 hover:text-[#1e3a8a]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[9px] font-mono font-bold text-gray-400 px-1 w-8 text-center select-none">
                {currentIndex + 1}/{totalPlanes}
              </span>
              <button
                onClick={handleNext}
                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-400 hover:text-[#1e3a8a]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </BentoBox>

        <BentoBox
          className={`${boxClass} shrink-0 p-4 h-24 flex items-center justify-center bg-white relative overflow-hidden`}
        >
          {plane.logoUrl ? (
            <img
              src={plane.logoUrl}
              alt={plane.airline}
              className="max-w-full max-h-full object-contain relative z-10 drop-shadow-sm"
            />
          ) : (
            <div className="text-xl font-bold text-gray-300 tracking-widest uppercase relative z-10 flex items-center gap-3">
              <Plane size={24} /> {plane.airline}
            </div>
          )}
        </BentoBox>

        <BentoBox
          role="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("recenter-entity"))
          }
          className={`${boxClass} p-0 h-40 bg-gray-50 hover:bg-gray-100 flex items-center justify-center relative overflow-hidden shrink-0 group transition-colors cursor-none`}
        >
          <div className="absolute top-3 left-3 bg-white/90 p-1.5 rounded-full shadow-sm text-gray-500 group-hover:text-[#1e3a8a] group-hover:scale-110 transition-all z-10">
            <LocateFixed size={14} strokeWidth={2.5} />
          </div>

          {plane.imageUrl ? (
            <img
              src={plane.imageUrl}
              alt={plane.callsign}
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
            />
          ) : (
            <Plane
              size={48}
              className="text-gray-600 absolute group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3 pointer-events-none">
            <span className="text-white text-xs font-bold tracking-wider">
              {plane.airline}
            </span>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0 pb-6`}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Clock size={12} /> Ground Lifecycle
            </h3>
            <span className="text-[9px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {isInbound ? "INBOUND" : "OUTBOUND"}
            </span>
          </div>

          <div className="relative flex justify-between items-center w-full px-2">
            {/* Background Track */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-100 rounded-full z-0" />

            {/* Directional Chevrons */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 flex justify-evenly items-center z-0 pointer-events-none">
              {[1, 2, 3, 4].map((i) => (
                <ChevronRight key={i} size={14} className="text-gray-200" />
              ))}
            </div>

            {/* FIXED: Blue Progress Line capped at 100% of the track length */}
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-[#1e3a8a] rounded-full z-0 transition-all duration-700 ease-out"
              style={{
                width: `calc((100% - 48px) * ${Math.min(1, Math.max(0, currentStepIndex / (lifecycleSteps.length - 1)))})`,
              }}
            />

            {lifecycleSteps.map((step, index) => {
              const isPast = currentStepIndex > index;
              const isActive = currentStepIndex === index;

              return (
                <div
                  key={step.label}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-white ${
                      isPast
                        ? "border-[#1e3a8a] text-[#1e3a8a]"
                        : isActive
                          ? "border-[#1e3a8a] shadow-[0_0_15px_rgba(30,58,138,0.4)] animate-pulse"
                          : "border-gray-200 text-transparent"
                    }`}
                  >
                    {isPast && <Check size={10} strokeWidth={4} />}
                    {isActive && (
                      <div className="w-2 h-2 bg-[#1e3a8a] rounded-full" />
                    )}
                  </div>
                  <span
                    className={`absolute top-7 text-[8px] font-bold uppercase tracking-wider ${isActive ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Weight size={12} /> Weight & Balance (Loadsheet)
          </h3>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-y-3">
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">
                Zero Fuel (ZFW)
              </span>
              <span className="text-xs font-bold text-slate-800">
                {Math.floor(weight * 0.6).toLocaleString()} kg
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">
                Trip Fuel
              </span>
              <span className="text-xs font-bold text-blue-600">
                {Math.floor(weight * 0.2).toLocaleString()} kg
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">
                Takeoff Wt (TOW)
              </span>
              <span className="text-xs font-bold text-slate-800">
                {weight.toLocaleString()} kg
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">
                CG (MAC %)
              </span>
              <span className="text-xs font-bold text-slate-800">26.4%</span>
            </div>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Radio size={12} /> ATC Radio Clearance
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600">Delivery (118.1)</span>
              <span className="text-[10px] font-bold text-green-600">
                CLEARED
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600">Ground (121.9)</span>
              <span className="text-[10px] font-bold text-green-600">
                CLEARED
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600">Tower (118.7)</span>
              <span className="text-[10px] font-bold text-amber-600">
                STANDBY
              </span>
            </div>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <ShieldCheck size={12} /> Registry Document
          </h3>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-y-3">
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Aircraft Type
              </span>
              <span className="text-xs font-bold text-gray-800">
                {aircraftType}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Operator
              </span>
              <span className="text-xs font-bold text-gray-800">
                {plane.airline}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Flight No.
              </span>
              <span className="text-xs font-bold text-[#1e3a8a]">
                {plane.flightNumber}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Tail Number
              </span>
              <span className="text-xs font-bold font-mono text-[#1e3a8a]">
                VN-A814
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Max Takeoff Wt
              </span>
              <span className="text-xs font-bold text-gray-800">
                {weight.toLocaleString()} kg
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Wake Category
              </span>
              <span className="text-xs font-bold text-gray-800">
                {weight > 136000 ? "Heavy (H)" : "Medium (M)"}
              </span>
            </div>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Truck size={12} /> Ground Support (GSE)
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" /> Fuel
              </span>
              <span className="text-[10px] font-bold">Dispatched</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />{" "}
                Catering
              </span>
              <span className="text-[10px] font-bold">Servicing</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> Baggage
              </span>
              <span className="text-[10px] font-bold text-amber-600">
                Pending Load
              </span>
            </div>
          </div>
        </BentoBox>
      </BentoPanel>

      <BentoPanel
        direction="right"
        isOpen={true}
        className="absolute top-20 right-6 w-[420px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pl-2 pointer-events-auto"
      >
        {/* RIGHT PANEL HEADER */}
        <BentoBox
          className={`${boxClass} py-3 flex justify-between items-center shrink-0 sticky top-0 z-50`}
        >
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            Live Flight Ops
          </h2>
          <div className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Gate {gate}
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Navigation size={12} /> ADS-B Navigational Vectors
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center">
              <div className="text-[9px] text-gray-500 font-bold">SQUAWK</div>
              <div className="text-sm font-bold font-mono text-[#1e3a8a]">
                7700
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center">
              <div className="text-[9px] text-gray-500 font-bold">VERT/S</div>
              <div className="text-sm font-bold font-mono text-gray-800">
                -850 <span className="text-[9px]">fpm</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center">
              <div className="text-[9px] text-gray-500 font-bold">TRACK</div>
              <div className="text-sm font-bold font-mono text-gray-800">
                {Math.floor(plane.heading)}°
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center">
              <div className="text-[9px] text-gray-500 font-bold">MACH</div>
              <div className="text-sm font-bold font-mono text-gray-800">
                {(plane.speed / 666).toFixed(2)}
              </div>
            </div>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Ground Speed Profile
            </h3>
            <div className="text-lg font-bold text-[#1e3a8a]">
              {Math.floor(plane.speed)}{" "}
              <span className="text-[10px] text-gray-400">kts</span>
            </div>
          </div>
          <div className="h-40 w-full relative">
            <ResponsiveContainer
              minWidth={0}
              minHeight={0}
              width="100%"
              height="100%"
            >
              <ComposedChart
                data={speedHistory}
                margin={{ left: -25, top: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ fontSize: "10px" }} />
                <ReferenceLine y={25} stroke="red" strokeDasharray="3 3" />
                <Bar
                  dataKey="speed"
                  fill="#93c5fd"
                  radius={[2, 2, 0, 0]}
                  barSize={8}
                  name="Speed (kts)"
                />
                <Line
                  type="monotone"
                  dataKey="altitude"
                  stroke="#1e3a8a"
                  strokeWidth={2}
                  dot={false}
                  name="Alt (ft)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Users size={12} /> Passenger Manifest
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-center">
              <div className="text-[9px] text-blue-500 font-bold">FIRST</div>
              <div className="text-sm font-bold text-blue-900">12</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-center">
              <div className="text-[9px] text-blue-500 font-bold">BUSINESS</div>
              <div className="text-sm font-bold text-blue-900">34</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
              <div className="text-[9px] text-gray-500 font-bold">ECONOMY</div>
              <div className="text-sm font-bold text-gray-800">184</div>
            </div>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Route size={12} /> Filed Flight Plan
          </h3>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <span className="text-[10px] text-gray-500 uppercase">
                Routing
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                SGN..VUNG TAU..BITIS..{plane.destination}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <span className="text-[10px] text-gray-500 uppercase">
                SID / STAR
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                BITIS1A / RNAV
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 uppercase">
                Transponder (Squawk)
              </span>
              <span className="text-xs font-bold font-mono text-[#1e3a8a]">
                6432
              </span>
            </div>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Calendar size={12} /> Route Logistics
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <div>
                <div className="text-[9px] text-gray-400 uppercase">From</div>
                <div className="text-xs font-bold text-gray-800">
                  {plane.origin}
                </div>
              </div>
              <Navigation size={14} className="text-[#1e3a8a] rotate-90" />
              <div className="text-right">
                <div className="text-[9px] text-gray-400 uppercase">To</div>
                <div className="text-xs font-bold text-gray-800">
                  {plane.destination}
                </div>
              </div>
            </div>
          </div>
        </BentoBox>
      </BentoPanel>
    </>
  );
}
