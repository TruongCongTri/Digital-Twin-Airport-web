"use client";
import { BentoPanel, BentoBox } from "./BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import {
  MapPin,
  X,
  Battery,
  Wifi,
  Cpu,
  HardDrive,
  Image as ImageIcon,
  LineChart as ChartIcon,
  Settings,
  Shield,
  Server,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Users,
  Navigation as NavigationIcon,
  Thermometer,
  CircleDashed,
  Sun,
  BrainCircuit, // Added for AI indication
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Scatter,
  Line,
  ReferenceArea,
  LineChart,
  ReferenceLine,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SENSOR_STATUS_CONFIG } from "@/src/lib/status-config";

const boxClass =
  "bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-sm p-5 pointer-events-auto";

export function SensorFocusPanel() {
  // ✅ FIX: Strict selectors to prevent massive re-renders
  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const clearSelection = useAirportStore((state) => state.clearSelection);
  const sensor = useAirportStore((state) => state.getSelectedSensor());

  // ✅ FIX: Only subscribe to this specific sensor's forecast, not the entire AI state map
  const forecast = useAirportStore((state) =>
    sensor ? state.aiForecasts[sensor.id] : undefined,
  );

  // ✅ FIX: Extract primitives so we don't subscribe to the entire array of moving sensors
  const totalSensors = useAirportStore((state) => state.sensors.length);
  const currentIndex = useAirportStore((state) =>
    sensor ? state.sensors.findIndex((s) => s.id === sensor.id) : -1,
  );

  if (!isDashboardOpen || !sensor) return null;

  const handlePrev = () => {
    // ✅ Grab the state statically only when clicked
    const sensors = useAirportStore.getState().sensors;
    const prevIndex = currentIndex <= 0 ? totalSensors - 1 : currentIndex - 1;
    selectEntity(sensors[prevIndex].id, "sensor");
  };

  const handleNext = () => {
    const sensors = useAirportStore.getState().sensors;
    const nextIndex = currentIndex >= totalSensors - 1 ? 0 : currentIndex + 1;
    selectEntity(sensors[nextIndex].id, "sensor");
  };

  const typeStr = String(sensor.type);
  const isTilt = typeStr.includes("TILT_STRUCTURAL");
  const isLight = typeStr.includes("LIGHT_DENSITY");
  const isWind = typeStr.includes("WIND");
  const isCrowd = typeStr.includes("CROWD");

  // Helper for dynamic colors based on strict status
  const statusColor =
    sensor.status === "CRITICAL"
      ? "#ef4444"
      : sensor.status === "WARNING"
        ? "#f59e0b"
        : "#10b981";

  // ==========================================
  // DATA PREPARATION: Merging Real + AI Data
  // ==========================================
  let nowLabel = "";

  // 1. Define the explicit shape of a chart data point so TS knows what to expect
  interface ChartDataPoint {
    time: string;
    value?: number;
    realValue?: number;
    predictedValue?: number;
    confRange?: [number, number];
    isPrediction?: boolean;
    trend?: number; // Used later for the Tilt regression line
  }

  // 2. Apply the interface to the base data
  const baseChartData: ChartDataPoint[] = sensor.history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: h.value,
    realValue: h.value,
  }));

  // 3. Apply the interface to the merged array
  let mergedChartData: ChartDataPoint[] = [...baseChartData];

  // B. Bridge and Append AI Data
  if (forecast && forecast.predictions.length > 0) {
    const lastRealPoint = baseChartData[baseChartData.length - 1];
    if (lastRealPoint) {
      nowLabel = lastRealPoint.time;
      // Bridge the gap: make the last real point the starting point of the AI prediction
      lastRealPoint.predictedValue = lastRealPoint.value;

      // Safely ensure we have a number before creating the range array
      const safeVal = lastRealPoint.value || 0;
      lastRealPoint.confRange = [safeVal, safeVal];
    }

    const predictedData: ChartDataPoint[] = forecast.predictions.map((p) => {
      // Create dynamic margin of error based on AI confidence
      const errorMargin = 1 - p.confidenceScore;
      const offset = Math.max(
        p.predictedValue * errorMargin,
        isTilt ? 0.005 : 2,
      );

      return {
        time: p.horizonLabel,
        predictedValue: p.predictedValue,
        confRange: [
          Math.max(0, p.predictedValue - offset),
          p.predictedValue + offset,
        ],
        isPrediction: true,
      };
    });

    mergedChartData = [...mergedChartData, ...predictedData];
  }

  return (
    <>
      {/* LEFT PANEL: Overview & Diagnostics */}
      <BentoPanel
        direction="left"
        isOpen={true}
        className="absolute top-20 left-6 w-[360px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
      >
        <BentoBox
          className={`${boxClass} py-4 flex justify-between items-start shrink-0 sticky top-0 z-50`}
        >
          {" "}
          <div>
            <h2 className="text-base font-bold text-gray-800">{sensor.name}</h2>
            <div className="flex items-center gap-1 text-xs text-[#1e3a8a] mt-1 font-semibold">
              <MapPin size={12} />{" "}
              {typeof sensor.zone === "string"
                ? sensor.zone
                : sensor.zone?.name}
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
                {currentIndex + 1}/{totalSensors}
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

        {/* Interactive Hero Box */}
        <BentoBox
          role="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("recenter-entity"))
          }
          className={`${boxClass} shrink-0 hover:bg-[#1e3a8a] hover:border-[#1e3a8a] text-[#1e3a8a] text-center relative overflow-hidden shrink-0 group transition-all  cursor-none min-h-[160px] flex flex-col items-center justify-center`}
        >
          <div className="absolute top-3 left-3 bg-gray-100 p-1.5 rounded-full text-gray-500 group-hover:bg-black/20 group-hover:text-white group-hover:scale-110 transition-all z-20">
            <LocateFixed size={14} strokeWidth={2.5} />
          </div>

          <div className="absolute -right-4 -top-4 opacity-10 text-gray-500 group-hover:text-white group-hover:scale-110 transition-all duration-500">
            {typeStr.includes("TEMP") && <Thermometer size={100} />}
            {isWind && <NavigationIcon size={100} />}
            {(typeStr.includes("CO2") || typeStr.includes("HUMIDITY")) && (
              <CircleDashed size={100} />
            )}
            {isTilt && <Shield size={100} />}
            {isCrowd && <Users size={100} />}
            {isLight && <Sun size={100} />}
            {!typeStr.includes("TEMP") &&
              !isWind &&
              !typeStr.includes("CO2") &&
              !typeStr.includes("HUMIDITY") &&
              !isTilt &&
              !isCrowd &&
              !isLight && <Wifi size={100} />}
          </div>

          <div className="text-[10px] text-gray-400 group-hover:text-blue-200 absolute top-3 right-3 uppercase font-bold tracking-widest z-10 transition-colors">
            Live{" "}
            {isTilt
              ? "Deflection"
              : isCrowd
                ? "Volume"
                : isWind
                  ? "Velocity"
                  : isLight
                    ? "Luminance"
                    : "Reading"}
          </div>

          <div className="w-full flex items-center justify-center gap-6 mt-4 pointer-events-none z-10">
            {/* 1. TEMPERATURE */}
            {typeStr.includes("TEMP") && (
              <>
                <div className="relative w-6 h-20 bg-gray-100 group-hover:bg-black/20 rounded-full border border-gray-200 group-hover:border-white/10 shadow-inner overflow-hidden flex flex-col justify-end transition-colors">
                  <div
                    className={`w-full transition-all duration-1000 ease-out ${sensor.currentValue > 35 ? "bg-red-500" : sensor.currentValue < 15 ? "bg-blue-400 group-hover:bg-blue-300" : "bg-gradient-to-t from-orange-400 to-red-400 group-hover:from-orange-300 group-hover:to-red-300"}`}
                    style={{
                      height: `${Math.min(Math.max(((sensor.currentValue + 10) / 60) * 100, 0), 100)}%`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/40 group-hover:from-white/20 to-transparent w-1/3 transition-colors" />
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-5xl font-bold font-mono text-gray-800 group-hover:text-white tracking-tighter transition-colors">
                    {sensor.currentValue.toFixed(1)}
                  </div>
                  <div className="text-sm font-bold text-gray-400 group-hover:text-blue-200 ml-1 transition-colors">
                    {sensor.unit}
                  </div>
                </div>
              </>
            )}

            {/* 2. WIND */}
            {isWind && (
              <>
                <div className="relative w-20 h-20 rounded-full border-4 border-gray-100 group-hover:border-white/10 flex items-center justify-center shadow-inner transition-colors">
                  <div className="absolute inset-2 border-2 border-dashed border-gray-200 group-hover:border-white/20 rounded-full animate-spin-slow transition-colors" />
                  <NavigationIcon
                    size={24}
                    className="text-[#1e3a8a] group-hover:text-white absolute transition-all duration-1000"
                    style={{
                      transform: `rotate(${sensor.currentValue * 12}deg)`,
                    }}
                  />
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-5xl font-bold font-mono text-gray-800 group-hover:text-white tracking-tighter transition-colors">
                    {sensor.currentValue.toFixed(1)}
                  </div>
                  <div className="text-sm font-bold text-gray-400 group-hover:text-blue-200 ml-1 transition-colors">
                    {sensor.unit}
                  </div>
                </div>
              </>
            )}

            {/* 3. CO2 & HUMIDITY */}
            {(typeStr.includes("CO2") || typeStr.includes("HUMIDITY")) &&
              (() => {
                const max = typeStr.includes("CO2") ? 1000 : 100;
                const percent = Math.min(sensor.currentValue / max, 1);
                return (
                  <div className="flex flex-col items-center w-full px-4">
                    <div className="relative w-32 h-16 overflow-hidden flex justify-center">
                      <svg
                        viewBox="0 0 100 50"
                        className="w-full h-full overflow-visible drop-shadow-sm"
                      >
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="currentColor"
                          className="text-slate-100 group-hover:text-white/10 transition-colors"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 50 A 40 40 0 0 1 60 15.3"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeLinecap="round"
                          opacity="0.2"
                        />
                        <path
                          d="M 60 15.3 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="12"
                          strokeLinecap="round"
                          opacity="0.2"
                        />
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke={
                            percent > 0.8
                              ? "#ef4444"
                              : percent > 0.5
                                ? "#f59e0b"
                                : "#10b981"
                          }
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray="125.6"
                          strokeDashoffset={125.6 * (1 - percent)}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute bottom-0 text-3xl font-bold font-mono text-gray-800 group-hover:text-white transition-colors">
                        {sensor.currentValue.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 group-hover:text-blue-200 mt-1 uppercase tracking-widest transition-colors">
                      {sensor.unit}
                    </div>
                  </div>
                );
              })()}

            {/* 4. STRUCTURAL TILT */}
            {isTilt && (
              <>
                <div className="relative w-20 h-20 rounded-full border-4 border-[#1e3a8a] group-hover:border-white/20 bg-blue-50/50 group-hover:bg-black/20 shadow-inner flex items-center justify-center overflow-hidden transition-colors">
                  <div className="absolute w-full h-[1px] bg-[#1e3a8a]/30 group-hover:bg-white/20 transition-colors" />
                  <div className="absolute h-full w-[1px] bg-[#1e3a8a]/30 group-hover:bg-white/20 transition-colors" />
                  <div className="absolute w-8 h-8 rounded-full border border-[#1e3a8a]/40 group-hover:border-white/30 transition-colors" />
                  <div
                    className="absolute w-4 h-4 rounded-full bg-blue-500 group-hover:bg-white shadow-sm border border-blue-400 group-hover:border-white transition-all duration-300"
                    style={{
                      transform: `translate(${sensor.currentValue * 150}px, ${-sensor.currentValue * 80}px)`,
                    }}
                  />
                  <div className="absolute top-1 left-2 w-10 h-4 rounded-full bg-white/40 group-hover:bg-white/10 transform -rotate-45 transition-colors" />
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-4xl font-bold font-mono text-gray-800 group-hover:text-white tracking-tighter transition-colors">
                    {sensor.currentValue.toFixed(4)}
                  </div>
                  <div className="text-sm font-bold text-gray-400 group-hover:text-blue-200 ml-1 transition-colors">
                    {sensor.unit}
                  </div>
                </div>
              </>
            )}

            {/* 5. CROWD AI */}
            {isCrowd && (
              <div className="flex items-center justify-center gap-6">
                <div className="relative">
                  <Users
                    size={42}
                    className="text-[#1e3a8a] group-hover:text-white transition-colors"
                    strokeWidth={1.5}
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white group-hover:border-[#1e3a8a] transition-colors animate-pulse" />
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-5xl font-bold font-mono text-gray-800 group-hover:text-white tracking-tighter transition-colors">
                    {sensor.currentValue.toFixed(0)}
                  </div>
                  <div className="text-xs font-bold text-gray-400 group-hover:text-blue-200 mt-1 uppercase tracking-widest transition-colors">
                    {sensor.unit}
                  </div>
                </div>
              </div>
            )}

            {/* 6. LIGHT DENSITY */}
            {isLight && (
              <div className="flex items-center justify-center gap-5">
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 group-hover:bg-yellow-400/20 border-2 border-yellow-100 group-hover:border-yellow-400/30 transition-colors shadow-inner">
                  <Sun
                    size={32}
                    className="text-yellow-500 group-hover:text-yellow-300 transition-all duration-700"
                    style={{
                      opacity: Math.max(
                        0.4,
                        Math.min(sensor.currentValue / 1000, 1),
                      ),
                      transform: `scale(${Math.max(0.8, Math.min(sensor.currentValue / 800, 1.2))})`,
                    }}
                  />
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-5xl font-bold font-mono text-gray-800 group-hover:text-white tracking-tighter transition-colors">
                    {sensor.currentValue.toFixed(0)}
                  </div>
                  <div className="text-xs font-bold text-gray-400 group-hover:text-blue-200 mt-1 uppercase tracking-widest transition-colors">
                    {sensor.unit}
                  </div>
                </div>
              </div>
            )}
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Shield size={12} /> Physical Constraints
          </h3>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-y-3">
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                IP Rating
              </span>
              <span className="text-xs font-bold text-gray-800">
                IP67 (Outdoor)
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Power Source
              </span>
              <span className="text-xs font-bold text-gray-800">
                PoE+ (802.3at)
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Control Limit (UCL)
              </span>
              <span className="text-xs font-bold text-red-600">
                {(sensor.currentValue * 1.2).toFixed(1)} {sensor.unit}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase block">
                Control Limit (LCL)
              </span>
              <span className="text-xs font-bold text-blue-600">
                {(sensor.currentValue * 0.8).toFixed(1)} {sensor.unit}
              </span>
            </div>
          </div>
        </BentoBox>

        <BentoBox
          className={`${boxClass} flex items-center justify-center relative group p-0 overflow-hidden h-32 shrink-0 bg-gray-50`}
        >
          {sensor.imageUrl ? (
            <img
              src={sensor.imageUrl}
              alt={sensor.name}
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <ImageIcon size={32} className="text-gray-600" />
          )}
          <div className="absolute bottom-2 right-2 text-[8px] font-bold uppercase text-gray-400 bg-white/80 px-2 py-1 rounded shadow-sm">
            ID: {sensor.id.split("-")[0]}
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Settings size={12} /> Diagnostics
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
              <Battery size={16} className="text-green-500" />
              <div>
                <div className="text-[9px] text-gray-400">Battery</div>
                <div className="text-xs font-bold">85%</div>
              </div>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
              <Wifi size={16} className="text-blue-500" />
              <div>
                <div className="text-[9px] text-gray-400">Signal</div>
                <div className="text-xs font-bold">-45 dBm</div>
              </div>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
              <Cpu size={16} className="text-orange-500" />
              <div>
                <div className="text-[9px] text-gray-400">Temp</div>
                <div className="text-xs font-bold">42°C</div>
              </div>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
              <HardDrive size={16} className="text-purple-500" />
              <div>
                <div className="text-[9px] text-gray-400">Memory</div>
                <div className="text-xs font-bold">67%</div>
              </div>
            </div>
          </div>
        </BentoBox>
        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Server size={12} /> Data Pipeline (MQTT)
          </h3>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[10px] text-slate-500 uppercase">
                Topic
              </span>
              <span className="text-xs font-bold font-mono text-slate-800">
                /v1/sgn/{typeStr.toLowerCase()}/{sensor.id.split("-")[0]}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <span className="text-[10px] text-slate-500 uppercase">
                Payload Size / QoS
              </span>
              <span className="text-xs font-bold font-mono text-slate-800">
                256 bytes / QoS 1
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase">
                  Latency
                </span>
              </div>
              <span className="text-xs font-bold font-mono text-green-600">
                14 ms (TLS 1.3)
              </span>
            </div>
          </div>
        </BentoBox>
      </BentoPanel>

      {/* RIGHT PANEL: Analytics & Data */}
      <BentoPanel
        direction="right"
        isOpen={true}
        className="absolute top-20 right-6 w-[420px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pl-2 pointer-events-auto"
      >
        <BentoBox
          className={`${boxClass} py-3 flex justify-between items-center shrink-0 sticky top-0 z-50`}
        >
          {" "}
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ChartIcon size={16} className="text-[#1e3a8a]" /> Trajectory
            Analysis
          </h2>
          <div className="flex gap-2">
            {forecast && (
              <Badge
                variant="outline"
                className="border-amber-500 text-amber-600 bg-amber-50 gap-1 px-2"
              >
                <BrainCircuit size={10} /> AI FORECAST ACTIVE
              </Badge>
            )}
            <Badge
              variant="outline"
              className="border-[statusColor] text-[statusColor] bg-[statusBg]"
              style={{
                borderColor: SENSOR_STATUS_CONFIG[sensor.status].color,
                color: SENSOR_STATUS_CONFIG[sensor.status].color,
                backgroundColor: `${SENSOR_STATUS_CONFIG[sensor.status].color}10`,
              }}
            >
              {SENSOR_STATUS_CONFIG[sensor.status].label.toUpperCase()}
            </Badge>
          </div>
        </BentoBox>

        {/* ========================================== */}
        {/* CHART BLOCK 1: Smooth / Natural Curves */}
        {/* ========================================== */}
        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex justify-between">
            <span>
              {isWind
                ? "Wind Rose Distribution"
                : isCrowd
                  ? "Crowd Volume Flow"
                  : isTilt
                    ? "Structural Micro-Deflection"
                    : "Environmental Envelope"}
            </span>
            <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              NATURAL
            </span>
          </h3>
          <div className="h-52 w-full relative" data-cursor="crosshair">
            <ResponsiveContainer
              minWidth={0}
              minHeight={0}
              width="100%"
              height="100%"
            >
              {(() => {
                // 1. WIND ROSE (With AI Prediction Overlay)
                if (isWind) {
                  const windData = [
                    "N",
                    "NE",
                    "E",
                    "SE",
                    "S",
                    "SW",
                    "W",
                    "NW",
                  ].map((dir, i) => {
                    // Extract historical value
                    const histValue =
                      sensor.history[i % Math.max(1, sensor.history.length)]
                        ?.value || sensor.currentValue;

                    // Extract AI predicted value (fallback to history if no AI data exists yet)
                    const predValue =
                      forecast?.predictions && forecast.predictions.length > 0
                        ? forecast.predictions[
                            i % Math.max(1, forecast.predictions.length)
                          ]?.predictedValue
                        : histValue;

                    return {
                      direction: dir,
                      speed: histValue,
                      aiSpeed: predValue,
                    };
                  });

                  return (
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      data={windData}
                    >
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="direction"
                        tick={{
                          fontSize: 10,
                          fill: "#64748b",
                          fontWeight: "bold",
                        }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, "dataMax + 2"]}
                        tick={false}
                        axisLine={false}
                      />

                      {/* AI Predicted Wind Envelope (Amber, Dashed, Transparent) */}
                      <Radar
                        name="AI Forecast"
                        dataKey="aiSpeed"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fill="#f59e0b"
                        fillOpacity={0.15}
                        isAnimationActive={false}
                      />

                      {/* Real Historical Wind Envelope (Blue, Solid) */}
                      <Radar
                        name="Real Speed"
                        dataKey="speed"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="#93c5fd"
                        fillOpacity={0.6}
                        isAnimationActive={false}
                      />

                      <Tooltip
                        contentStyle={{
                          fontSize: "10px",
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                    </RadarChart>
                  );
                }

                // 2. STRUCTURAL TILT (ComposedChart with Scatter + AI Prediction)
                if (isTilt) {
                  // Basic linear regression on historical data for the trendline
                  const n = baseChartData.length;
                  let sumX = 0,
                    sumY = 0,
                    sumXY = 0,
                    sumXX = 0;
                  baseChartData.forEach((d, i) => {
                    const val = d.value ?? 0;
                    sumX += i;
                    sumY += val;
                    sumXY += i * val;
                    sumXX += i * i;
                  });
                  const slope =
                    n > 1
                      ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
                      : 0;
                  const intercept =
                    n > 1
                      ? (sumY - slope * sumX) / n
                      : baseChartData[0]?.value || 0;

                  const tiltData = mergedChartData.map((d, i) => ({
                    ...d,
                    trend: !d.isPrediction ? slope * i + intercept : undefined, // Only draw trend on history
                  }));

                  return (
                    <ComposedChart
                      data={tiltData}
                      margin={{ left: -25, top: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={true}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: "10px",
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        cursor={{ strokeDasharray: "3 3" }}
                      />

                      {nowLabel && (
                        <ReferenceLine
                          x={nowLabel}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* AI Confidence Band */}
                      <Area
                        type="monotone"
                        dataKey="confRange"
                        stroke="none"
                        fill="#f59e0b"
                        fillOpacity={0.15}
                        isAnimationActive={false}
                      />

                      {/* AI Predicted Line */}
                      <Line
                        name="AI Forecast"
                        type="monotone"
                        dataKey="predictedValue"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        isAnimationActive={false}
                      />

                      {/* Real Data Points */}
                      <Scatter
                        name="Sensor Reading"
                        dataKey="realValue"
                        fill="#38bdf8"
                      />
                      <Line
                        name="Historical Trend"
                        type="linear"
                        dataKey="trend"
                        stroke="#0f172a"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  );
                }

                // 3 & 4. CROWD & ENVIRONMENTAL AI (Smooth Composed Chart)
                return (
                  <ComposedChart
                    data={mergedChartData}
                    margin={{ left: -25, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorEnv" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={isCrowd ? "#8b5cf6" : statusColor}
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="100%"
                          stopColor={isCrowd ? "#8b5cf6" : statusColor}
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: "10px", borderRadius: "8px" }}
                    />

                    {nowLabel && (
                      <ReferenceLine
                        x={nowLabel}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* 1. AI Confidence Band (Translucent Area bounded by array) */}
                    <Area
                      type="natural"
                      dataKey="confRange"
                      stroke="none"
                      fill="#f59e0b"
                      fillOpacity={0.15}
                      isAnimationActive={false}
                    />

                    {/* 2. Real Historical Data */}
                    <Area
                      type="natural"
                      dataKey="realValue"
                      stroke={isCrowd ? "#7c3aed" : statusColor}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEnv)"
                      isAnimationActive={false}
                    />

                    {/* 3. AI Predicted Future Line */}
                    <Line
                      type="natural"
                      dataKey="predictedValue"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </BentoBox>

        {/* ========================================== */}
        {/* CHART BLOCK 2: Strict / Control Charts     */}
        {/* ========================================== */}
        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex justify-between">
            <span>
              {isWind
                ? "Wind Velocity Timeline"
                : isCrowd
                  ? "Crowd Volume Flow"
                  : isTilt
                    ? "Structural Micro-Deflection"
                    : "Environmental Envelope"}
            </span>
            <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              CONTROL/STEP
            </span>
          </h3>
          <div className="h-52 w-full relative" data-cursor="crosshair">
            <ResponsiveContainer
              minWidth={0}
              minHeight={0}
              width="100%"
              height="100%"
            >
              {(() => {
                // WIND, CROWD, TILT, ENV all use the same base structure here, just styled differently
                return (
                  <ComposedChart
                    data={mergedChartData}
                    margin={{ left: -25, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorStep"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={
                            isWind
                              ? "#3b82f6"
                              : isCrowd
                                ? "#8b5cf6"
                                : statusColor
                          }
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="95%"
                          stopColor={
                            isWind
                              ? "#3b82f6"
                              : isCrowd
                                ? "#8b5cf6"
                                : statusColor
                          }
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={
                        isTilt
                          ? ["dataMin - 0.05", "dataMax + 0.05"]
                          : ["auto", "auto"]
                      }
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: "10px",
                        borderRadius: "8px",
                        border: "none",
                      }}
                      cursor={{ strokeDasharray: "3 3" }}
                    />

                    {nowLabel && (
                      <ReferenceLine
                        x={nowLabel}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Optional: Add static Control Limits for specific sensors */}
                    {isTilt && (
                      <>
                        <ReferenceLine
                          y={0.05}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          label={{
                            value: "UCL",
                            fill: "#ef4444",
                            fontSize: 9,
                            position: "insideTopRight",
                          }}
                        />
                        <ReferenceLine
                          y={-0.05}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          label={{
                            value: "LCL",
                            fill: "#ef4444",
                            fontSize: 9,
                            position: "insideBottomRight",
                          }}
                        />
                      </>
                    )}
                    {!isTilt && !isWind && !isCrowd && (
                      <ReferenceArea
                        y1={sensor.currentValue * 0.9}
                        y2={sensor.currentValue * 1.1}
                        fill="#f8fafc"
                        fillOpacity={0.5}
                      />
                    )}

                    {/* AI Confidence Band (Step) */}
                    <Area
                      type="stepAfter"
                      dataKey="confRange"
                      stroke="none"
                      fill="#f59e0b"
                      fillOpacity={0.15}
                      isAnimationActive={false}
                    />

                    {/* Real Data (Step Area for most, Step Line for Tilt) */}
                    {isTilt ? (
                      <Line
                        type="stepAfter"
                        dataKey="realValue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ) : (
                      <Area
                        type="stepAfter"
                        dataKey="realValue"
                        stroke={
                          isWind ? "#3b82f6" : isCrowd ? "#7c3aed" : statusColor
                        }
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorStep)"
                        isAnimationActive={false}
                      />
                    )}

                    {/* AI Predicted Line (Step) */}
                    <Line
                      type="stepAfter"
                      dataKey="predictedValue"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </BentoBox>

        <BentoBox className={`${boxClass} flex flex-col h-[280px] shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 shrink-0">
            Raw Data Logs
          </h3>
          {/* ✅ FIX: Added min-h-0 to force flexbox to allow scrolling, and removed the old overflow-hidden */}
          <div className="border border-gray-100 rounded-xl shadow-inner bg-gray-50 flex-1 overflow-y-auto custom-scrollbar min-h-0 relative">
            <Table>
              <TableHeader className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] py-2 h-auto font-bold text-gray-500">
                    Time
                  </TableHead>
                  <TableHead className="text-[10px] py-2 h-auto font-bold text-right text-gray-500">
                    Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...baseChartData].reverse().map((row, i) => (
                  <TableRow
                    key={i}
                    className="bg-white hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="py-1.5 text-[10px] font-mono text-gray-500 border-b border-gray-50">
                      {row.time}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs font-bold text-right text-gray-800 border-b border-gray-50">
                      {row.value} {sensor.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </BentoBox>
      </BentoPanel>
    </>
  );
}
