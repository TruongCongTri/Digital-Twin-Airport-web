"use client";
import { BentoPanel, BentoBox } from "./BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import { PlaneStatus } from "@/types";
import {
  Plane,
  Navigation,
  X,
  ShieldCheck,
  Truck,
  Weight,
  Radio,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Check,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCcw,
  Users,
  Activity,
} from "lucide-react";
import { ElementType, ReactNode } from "react";
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

// ✅ AIRLINE BRANDING ENGINE
const AIRLINE_THEMES: Record<
  string,
  { bg: string; text: string; accent: string }
> = {
  VJ: { bg: "bg-[#DF2027]", text: "text-white", accent: "bg-[#F2B000]" }, // VietJet Air
  VN: { bg: "bg-[#005F6E]", text: "text-white", accent: "bg-[#D4B572]" }, // Vietnam Airlines
  QH: { bg: "bg-[#00894F]", text: "text-white", accent: "bg-[#00A1E4]" }, // Bamboo Airways
  CX: { bg: "bg-[#006564]", text: "text-white", accent: "bg-[#B2A97E]" }, // Cathay Pacific
  SQ: { bg: "bg-[#002244]", text: "text-white", accent: "bg-[#F2A900]" }, // Singapore Airlines
  EK: { bg: "bg-[#D71920]", text: "text-white", accent: "bg-[#D4AF37]" }, // Emirates
  NH: { bg: "bg-[#002B5E]", text: "text-white", accent: "bg-[#00A0E9]" }, // ANA
  DEFAULT: { bg: "bg-gray-800", text: "text-white", accent: "bg-blue-500" },
};

const FauxBarcode = () => (
  <div className="flex gap-[3px] items-end h-6 opacity-60 shrink-0">
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-[2px] h-full bg-gray-800 rounded-sm" />
    <div className="w-1.5 h-full bg-gray-800 rounded-sm" />
    <div className="w-[2px] h-[80%] bg-gray-800 rounded-sm" />
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-[2px] h-full bg-gray-800 rounded-sm" />
  </div>
);

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
// ✅ REUSABLE TICKET WRAPPER FOR DOSSIER MODULES
const DispatchTicket = ({
  title,
  tag,
  icon: Icon,
  footerText,
  footerColor = "text-gray-500",
  theme,
  children,
}: DispatchTicketProps) => (
  <div className="w-full rounded-2xl flex flex-col shadow-lg border border-gray-200/80 bg-white shrink-0 relative overflow-hidden mt-1 mb-2">
    <div
      className={`absolute -left-3 top-[36px] w-6 h-6 bg-[#f7f7f8] rounded-full border-r border-gray-200 z-10 shadow-inner`}
    />
    <div
      className={`absolute -right-3 top-[36px] w-6 h-6 bg-[#f7f7f8] rounded-full border-l border-gray-200 z-10 shadow-inner`}
    />

    <div
      className={`${theme.bg} ${theme.text} px-4 py-2.5 flex justify-between items-center relative z-0`}
    >
      <span className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
        <Icon size={12} /> {title}
      </span>
      <span className="text-[10px] font-mono opacity-80 font-bold tracking-wider">
        {tag}
      </span>
    </div>

    <div className="px-5 py-4 bg-[#fafafa] border-b border-dashed border-gray-300">
      {children}
    </div>
    <div className="bg-white px-4 py-2 flex justify-between items-center">
      <span
        className={`text-[10px] font-bold ${footerColor} tracking-widest uppercase`}
      >
        {footerText}
      </span>
      <FauxBarcode />
    </div>
  </div>
);

export function PlaneFocusPanel() {
  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const clearSelection = useAirportStore((state) => state.clearSelection);
  const plane = useAirportStore((state) => state.getSelectedPlane());

  const totalPlanes = useAirportStore((state) => state.planes.length);
  const currentIndex = useAirportStore((state) =>
    plane ? state.planes.findIndex((p) => p.id === plane.id) : -1,
  );

  if (!isDashboardOpen || !plane) return null;

  const pathLen = plane.path?.length || 0;
  const speedHistory =
    plane.path?.map((p, i) => ({
      time: `-${pathLen - i}s`,
      speed: Math.max(
        0,
        (plane.speed || 0) - Math.abs(Math.sin(i * 12.9898)) * 5,
      ),
      altitude: plane.altitude || 0,
    })) || [];

  const handlePrev = () => {
    const planes = useAirportStore.getState().planes;
    const prevIndex = currentIndex <= 0 ? totalPlanes - 1 : currentIndex - 1;
    selectEntity(planes[prevIndex].id, "plane");
  };

  const handleNext = () => {
    const planes = useAirportStore.getState().planes;
    const nextIndex = currentIndex >= totalPlanes - 1 ? 0 : currentIndex + 1;
    selectEntity(planes[nextIndex].id, "plane");
  };

  const callsign =
    plane.callsign || plane.flightNumber || plane.id || "UNKNOWN";
  const airlineCode = callsign.substring(0, 2).toUpperCase();
  const brandTheme = AIRLINE_THEMES[airlineCode] || AIRLINE_THEMES["DEFAULT"];

  const airline = plane.airline || "Unknown Carrier";
  const aircraftType = plane.aircraftType || "A350-900";
  const weight = plane.weight || 245000;
  const gate = plane.parkingStand?.code || plane.gate || "TBA";
  const status = plane.status || "UNKNOWN";
  const origin = plane.origin || "---";
  const dest = plane.destination || "---";

  const statusStr = (plane.status || "UNKNOWN").toUpperCase();

  const isAirborne = ["APPROACHING", "DEPARTED", "DIVERTED"].includes(
    statusStr,
  );

  // ==========================================
  // DIRECTIONAL SEQUENCE & COLOR ENGINE
  // ==========================================
  const isOutbound = plane.direction === "OUTBOUND";
  const isParked = plane.direction === "TURNAROUND";

  const outboundSteps = [
    { label: "Gate" },
    { label: "Pushback" },
    { label: "Taxi Out" },
    { label: "Takeoff" },
    { label: "Airborne" },
  ];
  const inboundSteps = [
    { label: "En Route" },
    { label: "Approach" },
    { label: "Landed" },
    { label: "Taxi In" },
    { label: "At Gate" },
  ];
  const turnaroundSteps = [
    { label: "Arrival" },
    { label: "De-board" },
    { label: "Service" },
    { label: "Boarding" },
    { label: "Ready" },
  ];

  let activeSteps = inboundSteps;
  let currentStepIndex = 0;
  let trackerTitle = "Arrival Sequence";
  let TrackerIcon = PlaneLanding;
  let dirColors = {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    fill: "bg-emerald-500",
    shadow: "shadow-[0_0_15px_rgba(16,185,129,0.5)]",
  };

  if (isOutbound) {
    activeSteps = outboundSteps;
    trackerTitle = "Departure Sequence";
    TrackerIcon = PlaneTakeoff;
    dirColors = {
      text: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      fill: "bg-indigo-500",
      shadow: "shadow-[0_0_15px_rgba(79,70,229,0.5)]",
    };

    if (["PUSHBACK"].includes(statusStr)) currentStepIndex = 1;
    else if (["TAXIING"].includes(statusStr)) currentStepIndex = 2;
    else if (["DEPARTING", "TAKEOFF"].includes(statusStr)) currentStepIndex = 3;
    else if (["DEPARTED", "EN ROUTE"].includes(statusStr)) currentStepIndex = 4;
    else currentStepIndex = 0;
  } else if (isParked) {
    activeSteps = turnaroundSteps;
    trackerTitle = "Turnaround Ops";
    TrackerIcon = RefreshCcw;
    dirColors = {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      fill: "bg-amber-500",
      shadow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    };

    if (statusStr === "BOARDING") currentStepIndex = 3;
    else if (statusStr === "PARKED") currentStepIndex = 2;
    else currentStepIndex = 0;
  } else {
    // INBOUND
    if (["APPROACHING"].includes(statusStr)) currentStepIndex = 1;
    else if (["LANDED"].includes(statusStr)) currentStepIndex = 2;
    else if (["TAXIING"].includes(statusStr)) currentStepIndex = 3;
    else if (["PARKED"].includes(statusStr)) currentStepIndex = 4;
  }

  // Override colors if there is an operational anomaly
  const isError = ["CANCELLED", "DIVERTED"].includes(statusStr);
  const isWarning = statusStr === "DELAYED";

  if (isError)
    dirColors = {
      text: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-500",
      fill: "bg-red-500",
      shadow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]",
    };
  else if (isWarning)
    dirColors = {
      text: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-500",
      fill: "bg-orange-500",
      shadow: "shadow-[0_0_15px_rgba(249,115,22,0.5)]",
    };

  return (
    <>
      <BentoPanel
        direction="left"
        isOpen={true}
        className="absolute top-20 left-6 w-[380px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
      >
        {/* TOP CONTROLS */}
        <div className="flex justify-between items-center w-full bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/80 p-2 shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-mono font-bold text-gray-500 w-10 text-center select-none tracking-widest">
              {currentIndex + 1}/{totalPlanes}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-full bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors border border-gray-100"
          >
            <X size={14} />
          </button>
        </div>

        {/* PRIMARY FLIGHT TICKET (Special large header) */}
        <div className="w-full rounded-2xl flex flex-col shadow-lg border border-gray-200/80 bg-white shrink-0 relative overflow-hidden">
          {/* Tear-off perforations */}
          <div className="absolute -left-3 top-[56px] w-6 h-6 bg-[#f7f7f8] rounded-full border-r border-gray-200 z-10 shadow-inner" />
          <div className="absolute -right-3 top-[56px] w-6 h-6 bg-[#f7f7f8] rounded-full border-l border-gray-200 z-10 shadow-inner" />

          {/* Ticket Header */}
          <div
            className={`${brandTheme.bg} ${brandTheme.text} px-5 py-3 flex justify-between items-center relative z-0`}
          >
            <div className="flex items-center gap-3">
              {plane.logoUrl ? (
                <div className="bg-white p-1 rounded-md shadow-sm h-8 w-8 flex items-center justify-center">
                  <img
                    src={plane.logoUrl}
                    className="max-h-full max-w-full object-contain"
                    alt={airline}
                  />
                </div>
              ) : (
                <Plane size={24} className="opacity-80" />
              )}
              <span className="font-bold text-xs uppercase tracking-widest opacity-90">
                {airline}
              </span>
            </div>
            <div
              className={`text-[10px] font-mono px-2 py-1 rounded shadow-sm ${brandTheme.accent} text-black font-black tracking-wider`}
            >
              {callsign}
            </div>
          </div>

          {/* Ticket Body */}
          <div className="px-6 py-5 flex justify-between items-center bg-[#fafafa] border-b border-dashed border-gray-300">
            <div className="text-center w-[30%]">
              <div className="text-4xl font-black text-gray-800 tracking-tighter">
                {origin}
              </div>
              <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1">
                Origin
              </div>
            </div>

            <div className="flex flex-col items-center w-[40%] px-2 relative -top-2">
              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Direct
              </div>
              <div className="w-full flex items-center relative">
                <div className="w-1.5 h-1.5 rounded-full border border-gray-300 bg-white z-10" />
                <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-1" />
                <Plane size={16} className="text-gray-400 rotate-90 z-10" />
                <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-1" />
                <div className="w-1.5 h-1.5 rounded-full border border-gray-300 bg-[#1e3a8a] z-10" />
              </div>
            </div>

            <div className="text-center w-[30%]">
              <div className="text-4xl font-black text-gray-800 tracking-tighter">
                {dest}
              </div>
              <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1">
                Dest
              </div>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-white p-4 flex justify-between items-end">
            <div className="space-y-3 flex-1">
              <div className="flex justify-between items-center pr-6">
                <div>
                  <div className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                    Class
                  </div>
                  <div className="text-xs font-black text-gray-800">
                    VIP / ATC
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                    Gate
                  </div>
                  <div className="text-xs font-black text-[#1e3a8a]">
                    {gate}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                    Status
                  </div>
                  <div
                    className={`text-xs font-black uppercase ${dirColors.text}`}
                  >
                    {status}
                  </div>
                </div>
              </div>
            </div>
            <FauxBarcode />
          </div>
        </div>

        {/* VIEWFINDER (Not a ticket) */}
        <BentoBox
          role="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("recenter-entity"))
          }
          className={`${boxClass} p-0 h-32 bg-gray-50 hover:bg-gray-100 flex items-center justify-center relative overflow-hidden shrink-0 group transition-colors cursor-none`}
        >
          <div className="absolute top-3 left-3 bg-white/90 p-1.5 rounded-full shadow-sm text-gray-500 group-hover:text-[#1e3a8a] group-hover:scale-110 transition-all z-10">
            <LocateFixed size={14} strokeWidth={2.5} />
          </div>

          {plane.imageUrl ? (
            <img
              src={plane.imageUrl}
              alt={callsign || plane.id}
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
            />
          ) : (
            <Plane
              size={40}
              className="text-gray-300 absolute group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500"
            />
          )}
        </BentoBox>

        {/* ✅ DYNAMIC DIRECTIONAL SEQUENCE TICKET */}
        <DispatchTicket
          title={trackerTitle}
          tag={plane.direction || "UNKNOWN"}
          icon={TrackerIcon}
          footerText="Live Sequence Tracking"
          theme={brandTheme}
        >
          <div className="relative flex justify-between items-center w-full px-2 py-4">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full z-0" />
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 flex justify-evenly items-center z-0 pointer-events-none">
              {activeSteps.slice(1).map((_, i) => (
                <ChevronRight key={i} size={14} className="text-gray-300" />
              ))}
            </div>

            <div
              className={`absolute left-6 top-1/2 -translate-y-1/2 h-1 rounded-full z-0 transition-all duration-700 ease-out ${dirColors.fill}`}
              style={{
                width: `calc((100% - 48px) * ${Math.min(1, Math.max(0, currentStepIndex / (activeSteps.length - 1)))})`,
              }}
            />

            {activeSteps.map((step, index) => {
              const isPast = currentStepIndex > index;
              const isActive = currentStepIndex === index;

              return (
                <div
                  key={step.label}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-[#fafafa] ${
                      isPast
                        ? `${dirColors.border} ${dirColors.text}`
                        : isActive
                          ? `${dirColors.border} ${dirColors.shadow} animate-pulse`
                          : "border-gray-300 text-transparent"
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
                    className={`absolute top-7 text-[8px] font-bold uppercase tracking-wider whitespace-nowrap ${
                      isActive ? dirColors.text : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </DispatchTicket>

        {/* ✅ ATC RADIO CLEARANCE TICKET */}
        <DispatchTicket
          title="ATC Radio Clearance"
          tag="COMMS"
          icon={Radio}
          footerText="Frequencies Active"
          theme={brandTheme}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-0.5">
                Delivery (118.1)
              </span>
              <span className="text-xs font-bold font-mono text-green-600 tracking-wider">
                CLEARED
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-0.5">
                Ground (121.9)
              </span>
              <span className="text-xs font-bold font-mono text-green-600 tracking-wider">
                CLEARED
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-0.5">
                Tower (118.7)
              </span>
              <span className="text-xs font-bold font-mono text-amber-600 tracking-wider">
                STANDBY
              </span>
            </div>
          </div>
        </DispatchTicket>
      </BentoPanel>

      <BentoPanel
        direction="right"
        isOpen={true}
        className="absolute top-20 right-6 w-[400px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pl-2 pointer-events-auto"
      >
        {/* RIGHT PANEL HEADER (Not a ticket, just a view header) */}
        <BentoBox
          className={`${boxClass} py-3 flex justify-between items-center shrink-0 sticky top-0 z-50`}
        >
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Navigation size={14} className="text-[#1e3a8a]" /> Live Flight Ops
          </h2>
          <div className="text-[10px] font-black tracking-widest text-[#1e3a8a] bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
            Stand {gate}
          </div>
        </BentoBox>

        {/* ✅ ADS-B TELEMETRY TICKET */}
        <DispatchTicket
          title="ADS-B Navigational Vectors"
          tag="TELEMETRY"
          icon={Navigation}
          footerText="Transmitting"
          footerColor="text-blue-500"
          theme={brandTheme}
        >
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-[8px] text-gray-400 font-bold tracking-widest mb-0.5">
                SQUAWK
              </div>
              <div className="text-sm font-bold font-mono text-[#1e3a8a]">
                7700
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-gray-400 font-bold tracking-widest mb-0.5">
                VERT/S
              </div>
              <div className="text-sm font-bold font-mono text-gray-800">
                {isOutbound ? "+" : "-"}
                {(plane.altitude || 0) > 10000 ? 1200 : 850}{" "}
                <span className="text-[8px] text-gray-400">FPM</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-gray-400 font-bold tracking-widest mb-0.5">
                TRACK
              </div>
              <div className="text-sm font-bold font-mono text-gray-800">
                {Math.floor(plane.heading || 0)}°
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-gray-400 font-bold tracking-widest mb-0.5">
                MACH
              </div>
              <div className="text-sm font-bold font-mono text-gray-800">
                {((plane.speed || 0) / 666).toFixed(2)}
              </div>
            </div>
          </div>
        </DispatchTicket>

        {/* ✅ W&B LOADSHEET TICKET */}
        <DispatchTicket
          title="Weight & Balance Payload"
          tag="LOADSHEET"
          icon={Weight}
          footerText="Validated"
          footerColor="text-green-600"
          theme={brandTheme}
        >
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                Zero Fuel (ZFW)
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                {Math.floor(weight * 0.6).toLocaleString()} KG
              </span>
            </div>
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                Trip Fuel
              </span>
              <span className="text-xs font-bold font-mono text-[#1e3a8a]">
                {Math.floor(weight * 0.2).toLocaleString()} KG
              </span>
            </div>
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                {isOutbound ? "Takeoff Wt" : "Landing Wt"}
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                {weight.toLocaleString()} KG
              </span>
            </div>
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                CG (MAC %)
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                26.4%
              </span>
            </div>
          </div>
        </DispatchTicket>

        {/* ✅ PASSENGER MANIFEST TICKET */}
        <DispatchTicket
          title="Passenger Manifest"
          tag="PAX-DOC"
          icon={Users}
          footerText="Finalized"
          footerColor="text-gray-500"
          theme={brandTheme}
        >
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                Total Souls
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                296{" "}
                <span className="text-[9px] text-gray-400 font-sans tracking-normal">
                  (284 Pax / 12 Crew)
                </span>
              </span>
            </div>
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                Class Breakdown
              </span>
              <span className="text-xs font-bold font-mono text-[#1e3a8a]">
                J: 32 | Y: 252
              </span>
            </div>
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                Checked Bags
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                312{" "}
                <span className="text-[9px] text-gray-400 font-sans tracking-normal">
                  (4,680 KG)
                </span>
              </span>
            </div>
            <div>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                Special Hndlg
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                4 WCHR / 1 AVIH
              </span>
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
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
              Live Velocity
            </span>
            <div className="text-lg font-black text-[#1e3a8a]">
              {Math.floor(plane.speed || 0)}{" "}
              <span className="text-[10px] text-gray-400 font-bold tracking-widest">
                KTS
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
                <ReferenceLine y={25} stroke="red" strokeDasharray="3 3" />
                <Bar
                  dataKey="speed"
                  fill={dirColors.fill.replace("bg-", "")}
                  radius={[2, 2, 0, 0]}
                  barSize={8}
                  name="Speed (kts)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="altitude"
                  stroke="#1e3a8a"
                  strokeWidth={2}
                  dot={false}
                  name="Alt (ft)"
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
