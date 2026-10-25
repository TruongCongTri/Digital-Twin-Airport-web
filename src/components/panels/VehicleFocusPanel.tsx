"use client";
import { BentoPanel, BentoBox } from "./BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import { useMemo } from "react";
import {
  Navigation,
  X,
  Radio,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Check,
  Activity,
  Car,
  Crown,
  MapPin,
  CarFront,
  ShieldCheck,
  BatteryCharging,
} from "lucide-react";
import { ElementType, ReactNode } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { VehicleType } from "@/types";
import { getAirportName } from "@/constants/airports";
import { DataCard, toDisplayTitle } from "@/src/components/ui-kit";

const boxClass =
  "bg-twin-surface border border-twin-line rounded-lg shadow-sm p-4 pointer-events-auto";

// ✅ VEHICLE BRANDING ENGINE based on VehicleType
const VEHICLE_THEMES: Record<
  string,
  { bg: string; text: string; accent: string }
> = {
  PERSONAL_CAR: {
    bg: "bg-slate-700",
    text: "text-white",
    accent: "bg-slate-300",
  },
  TAXI: { bg: "bg-amber-500", text: "text-black", accent: "bg-yellow-100" },
  RIDE_HAIL: { bg: "bg-[#00AF54]", text: "text-white", accent: "bg-[#008940]" }, // Grab green
  VIP_TRANSFER: {
    bg: "bg-[#2D1B4E]",
    text: "text-white",
    accent: "bg-[#D4AF37]",
  }, // Purple/Gold
  DEFAULT: { bg: "bg-twin-ink", text: "text-white", accent: "bg-blue-500" },
};

// Map tailwind semantic colors to hex for Recharts SVG rendering
const CHART_COLORS: Record<string, string> = {
  "bg-emerald-500": "#10b981",
  "bg-indigo-500": "#6366f1",
  "bg-amber-500": "#f59e0b",
  "bg-red-500": "#ef4444",
  "bg-purple-500": "#a855f7",
  "bg-slate-500": "#64748b",
};

interface DispatchTicketProps {
  title: string;
  tag: string;
  icon: ElementType;
  footerText: string;
  footerColor?: string;
  theme: {
    bg: string;
    text: string;
    accent: string;
  };
  children: ReactNode;
}

// Analytics card in the workspace style (ui-kit DataCard); legacy props are kept so
// the module bodies below stay unchanged. `theme` / `footerColor` are no longer used.
const DispatchTicket = ({
  title,
  tag,
  icon,
  footerText,
  children,
}: DispatchTicketProps) => (
  <DataCard
    title={title}
    icon={icon}
    meta={tag}
    footer={toDisplayTitle(footerText)}
  >
    {children}
  </DataCard>
);

export function VehicleFocusPanel() {
  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const clearSelection = useAirportStore((state) => state.clearSelection);
  const vehicles = useAirportStore((state) => state.vehicles || []);
  const vehicle = useAirportStore((state) => state.getSelectedVehicle());

  const activeAirport =
    useAirportStore((state) => state.activeAirport) || "VVLT";
  const currentAirportName = getAirportName(activeAirport);

  const totalVehicles = vehicles.length;
  const vehicleId = vehicle?.id;

  const currentIndex = useMemo(() => {
    return vehicleId ? vehicles.findIndex((v) => v.id === vehicleId) : -1;
  }, [vehicleId, vehicles]);

  if (!isDashboardOpen || !vehicle) return null;

  const pathLen = vehicle.path?.length || 0;
  const speedHistory =
    vehicle.path?.map((p, i) => ({
      time: `-${pathLen - i}s`,
      speed: Math.max(
        0,
        (vehicle.speed || 0) - Math.abs(Math.sin(i * 12.9898)) * 2,
      ),
    })) || [];

  const handlePrev = () => {
    const prevIndex = currentIndex <= 0 ? totalVehicles - 1 : currentIndex - 1;
    selectEntity(vehicles[prevIndex].id, "vehicle");
  };

  const handleNext = () => {
    const nextIndex = currentIndex >= totalVehicles - 1 ? 0 : currentIndex + 1;
    selectEntity(vehicles[nextIndex].id, "vehicle");
  };

  const licensePlate = vehicle.licensePlate || vehicle.id || "UNKNOWN";
  const typeStr = (vehicle.type || "OTHER") as VehicleType;
  const brandTheme = VEHICLE_THEMES[typeStr] || VEHICLE_THEMES["DEFAULT"];

  const company =
    vehicle.companyName ||
    (typeStr === "PERSONAL_CAR" ? "Private" : "Unknown Auth");
  const model =
    vehicle.brand && vehicle.carModel
      ? `${vehicle.brand} ${vehicle.carModel}`
      : "Standard Sedan";
  const statusStr = (vehicle.status || "UNKNOWN").toUpperCase();

  // ==========================================
  // DIRECTIONAL SEQUENCE & COLOR ENGINE
  // ==========================================
  const sequenceSteps = [
    { label: "En Route" },
    { label: "Drop-off" },
    { label: "Parked" },
    { label: "Pick-up" },
    { label: "Exiting" },
  ];

  let currentStepIndex = 0;
  const trackerTitle = "Terminal Approach Ops";
  const TrackerIcon = CarFront;

  // Dynamic colors based on vehicle type
  let dirColors = {
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    fill: "bg-slate-500",
    shadow: "shadow-[0_0_15px_rgba(100,116,139,0.5)]",
  };

  if (typeStr === "TAXI") {
    dirColors = {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      fill: "bg-amber-500",
      shadow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    };
  } else if (typeStr === "VIP_TRANSFER") {
    dirColors = {
      text: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      fill: "bg-purple-500",
      shadow: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
    };
  } else if (typeStr === "RIDE_HAIL") {
    dirColors = {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      fill: "bg-emerald-500",
      shadow: "shadow-[0_0_15px_rgba(16,185,129,0.5)]",
    };
  }

  if (statusStr === "APPROACHING_DROP_OFF") currentStepIndex = 0;
  else if (statusStr === "DROPPING_OFF") currentStepIndex = 1;
  else if (statusStr === "PARKED") currentStepIndex = 2;
  else if (statusStr === "APPROACHING_PICK_UP" || statusStr === "PICKING_UP")
    currentStepIndex = 3;
  else if (statusStr === "EXITING") currentStepIndex = 4;

  const isExiting = statusStr === "EXITING";
  const origin = isExiting ? "T1" : "CITY";
  const dest = isExiting ? "CITY" : "T1";

  return (
    <>
      <BentoPanel
        direction="left"
        isOpen={true}
        className="absolute top-3 left-3 w-[380px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto twin-scroll pb-4 pr-2 pointer-events-auto"
      >
        {/* TOP CONTROLS */}
        <div className="flex justify-between items-center w-full bg-twin-surface rounded-lg shadow-sm border border-twin-line p-2 shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-twin-raised rounded-lg transition-all text-twin-ink-2 hover:text-twin-ink"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] tabular-nums font-bold text-twin-ink-2 w-10 text-center select-none tracking-wide">
              {currentIndex + 1}/{totalVehicles}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-twin-raised rounded-lg transition-all text-twin-ink-2 hover:text-twin-ink"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-full bg-twin-raised hover:bg-red-50 text-twin-ink-3 hover:text-red-500 transition-colors border border-twin-line"
          >
            <X size={14} />
          </button>
        </div>

        {/* PRIMARY VEHICLE TICKET */}
        <div className="w-full rounded-lg flex flex-col shadow-sm border border-twin-line bg-white shrink-0 relative overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-twin-surface text-twin-ink border-b border-twin-line px-4 py-3 flex justify-between items-center relative z-0">
            <div className="flex items-center gap-3">
              {vehicle.logoUrl ? (
                <div className="bg-white p-1 rounded-md shadow-sm h-8 w-8 flex items-center justify-center">
                  <img
                    src={vehicle.logoUrl}
                    className="max-h-full max-w-full object-contain"
                    alt={company}
                  />
                </div>
              ) : typeStr === "VIP_TRANSFER" ? (
                <Crown size={24} className="opacity-80" />
              ) : (
                <Car size={24} className="opacity-80" />
              )}
              <span className="font-bold text-xs uppercase tracking-wide opacity-90">
                {company}
              </span>
            </div>
            <div
              className={`text-[10px] tabular-nums px-2 py-1 rounded shadow-sm bg-twin-accent-soft text-twin-accent font-semibold tracking-wider`}
            >
              {licensePlate}
            </div>
          </div>

          {/* Ticket Body */}
          <div className="px-6 py-5 flex justify-between items-center bg-twin-raised border-b border-twin-line-strong">
            <div className="text-center w-[30%]">
              <div className="text-3xl font-semibold text-twin-ink tracking-tight">
                {origin}
              </div>
              <div className="text-[10px] text-twin-ink-3 uppercase font-bold tracking-wide mt-1">
                Origin
              </div>
            </div>

            <div className="flex flex-col items-center w-[40%] px-2 relative -top-2">
              <div className="text-[10px] font-bold text-twin-ink-3 uppercase tracking-wide mb-1">
                {typeStr.replace(/_/g, " ")}
              </div>
              <div className="w-full flex items-center relative">
                <div className="w-1.5 h-1.5 rounded-full border border-twin-line-strong bg-white z-10" />
                <div className="flex-1 border-t-2 border-twin-line-strong mx-1" />
                <CarFront
                  size={16}
                  className="text-twin-ink-3 rotate-90 z-10"
                />
                <div className="flex-1 border-t-2 border-twin-line-strong mx-1" />
                <div className="w-1.5 h-1.5 rounded-full border border-twin-line-strong bg-twin-accent z-10" />
              </div>
            </div>

            <div className="text-center w-[30%]">
              <div className="text-3xl font-semibold text-twin-ink tracking-tight">
                {dest}
              </div>
              <div className="text-[10px] text-twin-ink-3 uppercase font-bold tracking-wide mt-1">
                Dest
              </div>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-white p-4 flex justify-between items-end">
            <div className="space-y-3 flex-1">
              <div className="flex justify-between items-center pr-6">
                <div>
                  <div className="text-[10px] text-twin-ink-3 uppercase tracking-wider font-bold">
                    Vehicle Type
                  </div>
                  <div className="text-xs font-semibold text-twin-ink truncate max-w-[80px]">
                    {typeStr.replace(/_/g, " ")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-twin-ink-3 uppercase tracking-wider font-bold">
                    Model
                  </div>
                  <div className="text-xs font-semibold text-twin-accent truncate max-w-[100px]">
                    {model}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-twin-ink-3 uppercase tracking-wider font-bold">
                    Status
                  </div>
                  <div
                    className={`text-[10px] font-semibold uppercase ${dirColors.text}`}
                  >
                    {statusStr.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VIEWFINDER */}
        <BentoBox
          role="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("recenter-entity"))
          }
          className={`${boxClass} p-0 h-32 bg-twin-raised hover:bg-twin-raised flex items-center justify-center relative overflow-hidden shrink-0 group transition-colors cursor-none`}
        >
          <div className="absolute top-3 left-3 bg-twin-surface p-1.5 rounded-full shadow-sm text-twin-ink-2 group-hover:text-twin-accent group-hover:scale-110 transition-all z-10">
            <LocateFixed size={14} strokeWidth={2.5} />
          </div>

          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={licensePlate}
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
            />
          ) : (
            <Car
              size={40}
              className="text-twin-ink-3 absolute group-hover:scale-110 transition-all duration-500"
            />
          )}
        </BentoBox>

        {/* ✅ DYNAMIC DIRECTIONAL SEQUENCE TICKET */}
        <DispatchTicket
          title={trackerTitle}
          tag={statusStr}
          icon={TrackerIcon}
          footerText="Live Curbside Tracking"
          theme={brandTheme}
        >
          <div className="relative flex justify-between items-center w-full px-2 py-4">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full z-0" />
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 flex justify-evenly items-center z-0 pointer-events-none">
              {sequenceSteps.slice(1).map((_, i) => (
                <ChevronRight key={i} size={14} className="text-twin-ink-3" />
              ))}
            </div>

            <div
              className={`absolute left-6 top-1/2 -translate-y-1/2 h-1 rounded-full z-0 transition-all duration-700 ease-out ${dirColors.fill}`}
              style={{
                width: `calc((100% - 48px) * ${Math.min(1, Math.max(0, currentStepIndex / (sequenceSteps.length - 1)))})`,
              }}
            />

            {sequenceSteps.map((step, index) => {
              const isPast = currentStepIndex > index;
              const isActive = currentStepIndex === index;

              return (
                <div
                  key={step.label}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-twin-raised ${
                      isPast
                        ? `${dirColors.border} ${dirColors.text}`
                        : isActive
                          ? `${dirColors.border} ${dirColors.shadow} animate-pulse`
                          : "border-twin-line-strong text-transparent"
                    }`}
                  >
                    {isPast && <Check size={10} strokeWidth={4} />}
                    {isActive && (
                      <div
                        className={`w-2 h-2 rounded-full ${dirColors.fill}`}
                      />
                    )}
                  </div>
                  <span
                    className={`absolute top-7 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                      isActive ? dirColors.text : "text-twin-ink-3"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </DispatchTicket>

        {/* ✅ FLEET DISPATCH CLEARANCE */}
        <DispatchTicket
          title="Security & Auth Clearance"
          tag="DISPATCH"
          icon={ShieldCheck}
          footerText="Zone Authorizations"
          theme={brandTheme}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <span className="text-[10px] text-twin-ink-2 uppercase font-bold tracking-wide block mb-0.5">
                Outer Perimeter (LPR)
              </span>
              <span className="text-xs font-bold tabular-nums text-green-600 tracking-wider">
                CLEARED
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <span className="text-[10px] text-twin-ink-2 uppercase font-bold tracking-wide block mb-0.5">
                Curbside Drop-off
              </span>
              <span className="text-xs font-bold tabular-nums text-green-600 tracking-wider">
                AUTH OK
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-twin-ink-2 uppercase font-bold tracking-wide block mb-0.5">
                VIP Apron Access
              </span>
              <span
                className={`text-xs font-bold tabular-nums tracking-wider ${typeStr === "VIP_TRANSFER" ? "text-green-600" : "text-red-500"}`}
              >
                {typeStr === "VIP_TRANSFER" ? "CLEARED" : "DENIED"}
              </span>
            </div>
          </div>
        </DispatchTicket>
      </BentoPanel>

      <BentoPanel
        direction="right"
        isOpen={true}
        className="absolute top-3 right-3 w-[400px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto twin-scroll pb-4 pl-2 pointer-events-auto"
      >
        {/* RIGHT PANEL HEADER */}
        <BentoBox
          className={`${boxClass} py-3 flex justify-between items-center shrink-0 sticky top-0 z-50`}
        >
          <h2 className="text-sm font-bold text-twin-ink flex items-center gap-2">
            <MapPin size={14} className="text-twin-accent" />{" "}
            {currentAirportName} Terminal
          </h2>
          <div className="text-[10px] font-semibold tracking-wide text-twin-accent bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
            Curbside
          </div>
        </BentoBox>

        {/* ✅ GPS TELEMETRY TICKET */}
        <DispatchTicket
          title="GPS Telemetry Vectors"
          tag="LIVE DATA"
          icon={Navigation}
          footerText="Transmitting"
          footerColor="text-blue-500"
          theme={brandTheme}
        >
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center col-span-2 border-r border-twin-line">
              <div className="text-[10px] text-twin-ink-3 font-bold tracking-wide mb-0.5">
                LATITUDE
              </div>
              <div className="text-xs font-bold tabular-nums text-twin-accent">
                {vehicle.position.latitude.toFixed(6)}°
              </div>
            </div>
            <div className="text-center col-span-2">
              <div className="text-[10px] text-twin-ink-3 font-bold tracking-wide mb-0.5">
                LONGITUDE
              </div>
              <div className="text-xs font-bold tabular-nums text-twin-accent">
                {vehicle.position.longitude.toFixed(6)}°
              </div>
            </div>

            <div className="text-center mt-3 border-t border-twin-line pt-3">
              <div className="text-[10px] text-twin-ink-3 font-bold tracking-wide mb-0.5">
                HEADING
              </div>
              <div className="text-sm font-bold tabular-nums text-twin-ink">
                {Math.floor(vehicle.heading || 0)}°
              </div>
            </div>
            <div className="text-center mt-3 border-t border-twin-line pt-3 col-span-2">
              <div className="text-[10px] text-twin-ink-3 font-bold tracking-wide mb-0.5">
                EST SPEED
              </div>
              <div className="text-sm font-bold tabular-nums text-twin-ink">
                {Math.floor(vehicle.speed || 0)}{" "}
                <span className="text-[10px] text-twin-ink-3">KPH</span>
              </div>
            </div>
            <div className="text-center mt-3 border-t border-twin-line pt-3">
              <div className="text-[10px] text-twin-ink-3 font-bold tracking-wide mb-0.5">
                BATTERY
              </div>
              <div className="text-sm font-bold tabular-nums text-twin-ink flex items-center justify-center gap-1">
                <BatteryCharging size={10} className="text-emerald-500" />
                {vehicle.batteryLevel !== undefined
                  ? `${vehicle.batteryLevel}%`
                  : "N/A"}
              </div>
            </div>
          </div>
        </DispatchTicket>

        {/* ✅ GROUND SPEED PROFILE TICKET */}
        <DispatchTicket
          title="Ground Speed Profile"
          tag="KINEMATIC"
          icon={Activity}
          footerText="Recording"
          footerColor="text-red-500"
          theme={brandTheme}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] text-twin-ink-3 font-bold uppercase tracking-wide block mb-0.5">
              Live Velocity
            </span>
            <div className="text-lg font-semibold text-twin-accent">
              {Math.floor(vehicle.speed || 0)}{" "}
              <span className="text-[10px] text-twin-ink-3 font-bold tracking-wide">
                KPH
              </span>
            </div>
          </div>
          <div className="h-32 w-full relative">
            <ResponsiveContainer
              minWidth={0}
              minHeight={0}
              width="100%"
              height="100%"
              debounce={50}
            >
              <ComposedChart
                data={speedHistory}
                margin={{ left: -25, top: 0, bottom: -10 }}
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
                <ReferenceLine y={40} stroke="red" strokeDasharray="3 3" />
                <Bar
                  dataKey="speed"
                  fill={CHART_COLORS[dirColors.fill] || "#1e3a8a"}
                  radius={[2, 2, 0, 0]}
                  barSize={8}
                  name="Speed (kph)"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DispatchTicket>
      </BentoPanel>
    </>
  );
}
