"use client";
import {
  ElementType,
  ReactNode,
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { BentoPanel } from "./BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import {
  MapPin,
  X,
  Image as ImageIcon,
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
  Activity,
  Ruler,
  Fingerprint,
  Wifi,
  BrainCircuit,
  LineChart as ChartIcon,
  Clock,
  Layers,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
  ReferenceLine,
  Bar,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

export interface ComponentTheme {
  hex: string;
  bg: string;
  text: string;
  border: string;
  solidBg: string;
}

export interface SensorData {
  id: string;
  name: string;
  type: string;
  status: string;
  zone?: string | { name: string };
  unit: string;
  currentValue: number;
  imageUrl?: string | null;
  position: { longitude: number; latitude: number };
  history?: { timestamp: string | number; value: number }[];
}

interface HeatmapConfig {
  container: HTMLDivElement;
  radius?: number;
  maxOpacity?: number;
  minOpacity?: number;
  blur?: number;
  gradient?: Record<string, string>;
}

interface HeatmapInstance {
  setData: (data: {
    min?: number;
    max: number;
    data: { x: number; y: number; value: number }[];
  }) => void;
}

interface HeatmapAPI {
  create: (config: HeatmapConfig) => HeatmapInstance;
}

interface HeatmapModuleExport extends HeatmapAPI {
  default?: HeatmapAPI;
}

interface ChartDataPoint {
  time: string;
  realValue?: number;
  value?: number;
  gust?: number;
  indoorTemp?: number;
  tarmacTemp?: number;
  crowdDensity?: number;
  co2Level?: number;
  humidity?: number;
  windOutdoor?: number;
  windIndoor?: number;
  structTilt?: number;
  lightDensity?: number;
  predictedValue?: number;
  predictedIndoorTemp?: number;
  predictedTarmacTemp?: number;
  predictedCrowdDensity?: number;
  predictedCo2Level?: number;
  predictedHumidity?: number;
  predictedWindOutdoor?: number;
  predictedWindIndoor?: number;
  predictedStructTilt?: number;
  predictedLightDensity?: number;
  confRange?: [number, number];
  isPrediction?: boolean;
}

const EMPTY_ARRAY: { timestamp: string | number; value: number }[] = [];

const STATUS_COLORS: Record<string, ComponentTheme> = {
  ACTIVE: {
    hex: "#10b981",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    solidBg: "bg-emerald-500",
  },
  WARNING: {
    hex: "#f59e0b",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    solidBg: "bg-amber-500",
  },
  CRITICAL: {
    hex: "#ef4444",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    solidBg: "bg-red-500",
  },
  DEFAULT: {
    hex: "#64748b",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    solidBg: "bg-slate-500",
  },
};

const SyncBadge = ({ className = "" }: { className?: string }) => (
  <div
    className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-slate-50/80 backdrop-blur border border-slate-200 text-slate-400 rounded text-[7px] font-black uppercase tracking-widest shadow-sm z-10 ${className}`}
  >
    <Clock size={8} /> 5-MIN UPDATE
  </div>
);

const FauxBarcode = ({ className = "h-8" }: { className?: string }) => (
  <div className={`flex gap-[3px] items-end opacity-80 shrink-0 ${className}`}>
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-[2px] h-full bg-gray-800 rounded-sm" />
    <div className="w-1.5 h-full bg-gray-800 rounded-sm" />
    <div className="w-[2px] h-[80%] bg-gray-800 rounded-sm" />
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-[3px] h-full bg-gray-800 rounded-sm" />
    <div className="w-[1px] h-[60%] bg-gray-800 rounded-sm" />
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-[2px] h-[90%] bg-gray-800 rounded-sm" />
  </div>
);

interface HardwareReceiptCardProps {
  title: string;
  vendorId: string;
  icon: ElementType;
  footerText?: string;
  theme: ComponentTheme;
  children: ReactNode;
  bgImage?: string | null;
}

const HardwareReceiptCard = ({
  title,
  vendorId,
  icon: Icon,
  footerText = "CERTIFIED VENDOR EQUIPMENT",
  theme,
  children,
  bgImage,
}: HardwareReceiptCardProps) => {
  const hasImage = !!bgImage;

  return (
    <div className="w-full relative mt-1 mb-4 filter drop-shadow-md font-mono shrink-0 flex flex-col pointer-events-auto group">
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-xl z-20 ${theme.solidBg}`}
      />

      <div
        className={`w-full px-5 py-5 pt-6 flex flex-col relative z-10 border-t border-x border-gray-300 rounded-t-xl flex-1 min-h-0 overflow-hidden ${hasImage ? "text-white" : "bg-[#fcfbf9]"}`}
      >
        {hasImage && (
          <>
            <div className="absolute inset-0 bg-[#1a1a1a] z-0" />
            <img
              src={bgImage}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 mix-blend-screen"
            />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-400/60 shadow-[0_0_12px_rgba(96,165,250,0.8)] animate-[scan_2s_ease-in-out_infinite] z-0" />
          </>
        )}

        <div
          className={`text-center border-b-2 border-dashed ${hasImage ? "border-white/30" : theme.border} pb-3 mb-4 shrink-0 relative z-10`}
        >
          <div
            className={`text-sm font-black uppercase tracking-widest ${hasImage ? "text-white drop-shadow-md" : theme.text} flex items-center justify-center gap-2`}
          >
            <Icon size={16} /> {title}
          </div>
          <div
            className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${hasImage ? "text-gray-300" : "text-gray-500"}`}
          >
            VENDOR ID: {vendorId}
          </div>
          <div
            className={`text-[9px] mt-1 uppercase ${hasImage ? "text-gray-400" : "text-gray-400"}`}
          >
            PRINTED: {new Date().toLocaleString()}
          </div>
        </div>

        <div
          className={`text-xs flex flex-col gap-2 min-h-0 flex-1 relative z-10 ${hasImage ? "text-gray-100 drop-shadow-sm" : "text-gray-800"}`}
        >
          {children}
        </div>

        <div
          className={`mt-auto flex flex-col items-center pt-4 border-t-2 border-dashed ${hasImage ? "border-white/30 opacity-100" : `${theme.border} opacity-80`} shrink-0 relative z-10`}
        >
          <FauxBarcode
            className={`h-8 mb-2 ${hasImage ? "invert brightness-0 opacity-90" : ""}`}
          />
          <span
            className={`text-[9px] tracking-widest text-center font-bold uppercase ${hasImage ? "text-gray-200 drop-shadow" : theme.text}`}
          >
            {footerText}
          </span>
        </div>
      </div>

      <div
        className={`relative h-2 w-full z-10 shrink-0 ${hasImage ? "text-[#1a1a1a]" : "text-[#fcfbf9]"}`}
      >
        <svg
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="w-full h-full block drop-shadow-sm"
        >
          <polygon
            points="0,0 2,10 4,0 6,10 8,0 10,10 12,0 14,10 16,0 18,10 20,0 22,10 24,0 26,10 28,0 30,10 32,0 34,10 36,0 38,10 40,0 42,10 44,0 46,10 48,0 50,10 52,0 54,10 56,0 58,10 60,0 62,10 64,0 66,10 68,0 70,10 72,0 74,10 76,0 78,10 80,0 82,10 84,0 86,10 88,0 90,10 92,0 94,10 96,0 98,10 100,0"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
};

const SpatialHeatmapCard = ({
  focusedSensor,
  allSensors,
}: {
  focusedSensor: SensorData;
  allSensors: SensorData[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapInstanceRef = useRef<HeatmapInstance | null>(null);

  const [isReady, setIsReady] = useState(false);
  const setImmersiveActive = useAirportStore((s) => s.setImmersiveActive);

  const type = focusedSensor.type;
  const isTarmac = type === "TARMAC_TEMP" || type === "WIND_OUTDOOR";
  const isIndoor = !isTarmac;

  const BLUEPRINT_TERMINAL = useMemo(
    () => [
      { lat: 10.773008718159797, lng: 107.04086105423717 },
      { lat: 10.774047198116524, lng: 107.04275931075628 },
      { lat: 10.77463901841647, lng: 107.04257744187701 },
      { lat: 10.778050337347418, lng: 107.04374822289273 },
      { lat: 10.778206665272192, lng: 107.04329923409708 },
      { lat: 10.775303419099764, lng: 107.04214550329326 },
      { lat: 10.774733595328735, lng: 107.04002158723031 },
      { lat: 10.777674917076357, lng: 107.03771685590925 },
      { lat: 10.777429254734203, lng: 107.03734512504121 },
      { lat: 10.774209067672718, lng: 107.03939978281073 },
      { lat: 10.772529245082518, lng: 107.03829810775669 },
      { lat: 10.77231013706672, lng: 107.03506066991201 },
      { lat: 10.771838722376199, lng: 107.03505391116936 },
      { lat: 10.771958236029533, lng: 107.03878473711923 },
      { lat: 10.77153329837997, lng: 107.0392646078483 },
    ],
    [],
  );

  const BLUEPRINT_TARMAC = useMemo(
    () => [
      { lat: 10.802400383552415, lng: 107.06490466155752 },
      { lat: 10.800358431900554, lng: 107.06668061126459 },
      { lat: 10.770569539611992, lng: 107.02693198473341 },
      { lat: 10.773454446867156, lng: 107.02503613419944 },
    ],
    [],
  );

  const layout = useMemo(() => {
    const activePoints = isTarmac ? BLUEPRINT_TARMAC : BLUEPRINT_TERMINAL;
    const lats = activePoints.map((p) => p.lat);
    const lngs = activePoints.map((p) => p.lng);

    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);

    const ymin = Math.min(...lats) - latSpan * 0.2;
    const ymax = Math.max(...lats) + latSpan * 0.2;
    const xmin = Math.min(...lngs) - lngSpan * 0.2;
    const xmax = Math.max(...lngs) + lngSpan * 0.2;

    const mapToPct = (p: { lat: number; lng: number }) => {
      const xPct = ((p.lng - xmin) / (xmax - xmin)) * 100;
      const yPct = 100 - ((p.lat - ymin) / (ymax - ymin)) * 100;
      return { x: xPct, y: yPct };
    };

    const terminalPct = BLUEPRINT_TERMINAL.map(mapToPct);
    const tarmacPct = BLUEPRINT_TARMAC.map(mapToPct);

    return {
      terminalPointsStr: terminalPct
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(" "),
      terminalClipStr: `polygon(${terminalPct.map((p) => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`).join(", ")})`,
      tarmacPointsStr: tarmacPct
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(" "),
      tarmacClipStr: `polygon(${tarmacPct.map((p) => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`).join(", ")})`,
      xmin,
      xmax,
      ymin,
      ymax,
    };
  }, [BLUEPRINT_TERMINAL, BLUEPRINT_TARMAC, isTarmac]);

  const getThemeGradient = (sensorType: string): Record<string, string> => {
    if (sensorType.includes("CO2") || sensorType.includes("HUMIDITY")) {
      return {
        ".1": "#22c55e",
        ".4": "#eab308",
        ".7": "#ef4444",
        ".95": "#7e22ce",
      };
    }
    if (sensorType.includes("WIND")) {
      return {
        ".1": "#cffafe",
        ".4": "#38bdf8",
        ".7": "#4f46e5",
        ".95": "#312e81",
      };
    }
    if (sensorType.includes("CROWD")) {
      return {
        ".1": "#fef08a",
        ".4": "#f97316",
        ".7": "#ef4444",
        ".95": "#450a0a",
      };
    }
    if (sensorType.includes("TILT")) {
      return {
        ".1": "#f8fafc",
        ".4": "#94a3b8",
        ".7": "#475569",
        ".95": "#0f172a",
      };
    }
    if (sensorType.includes("LIGHT")) {
      return {
        ".1": "#422006",
        ".4": "#ca8a04",
        ".7": "#fef08a",
        ".95": "#ffffff",
      };
    }
    return {
      ".1": "#3b82f6",
      ".4": "#10b981",
      ".7": "#eab308",
      ".95": "#ef4444",
    };
  };

  useEffect(() => {
    let isMounted = true;
    const containerNode = containerRef.current;
    if (!containerNode || typeof window === "undefined") return;

    if (heatmapInstanceRef.current) {
      containerNode.innerHTML = "";
      heatmapInstanceRef.current = null;
    }

    setIsReady(false);

    import("heatmap.js")
      .then((RawModule) => {
        if (!isMounted) return;
        const HeatmapModule = RawModule as unknown as HeatmapModuleExport;
        const h337 = HeatmapModule.default || HeatmapModule;

        heatmapInstanceRef.current = h337.create({
          container: containerNode,
          radius: 90,
          maxOpacity: 0.85,
          minOpacity: 0.15,
          blur: 0.85,
          gradient: getThemeGradient(type),
        });
        setIsReady(true);
      })
      .catch((err: Error) => console.warn("heatmap.js not installed.", err));

    return () => {
      isMounted = false;
      if (containerNode) containerNode.innerHTML = "";
      heatmapInstanceRef.current = null;
      setIsReady(false);
    };
  }, [type, layout]);

  useEffect(() => {
    if (!isReady || !heatmapInstanceRef.current || !containerRef.current)
      return;

    let animationFrameId: number;

    const drawHeatmap = () => {
      if (!heatmapInstanceRef.current || !containerRef.current) return;

      const relevantSensors = allSensors.filter(
        (s) =>
          s.type === type &&
          s.position.longitude !== 0 &&
          s.position.latitude !== 0,
      );

      const width = containerRef.current.clientWidth || 400;
      const height = containerRef.current.clientHeight || 250;

      if (width === 0 || height === 0) return;

      let maxVal = Math.max(...relevantSensors.map((s) => s.currentValue), 1);
      const minVal = Math.min(...relevantSensors.map((s) => s.currentValue), 0);
      if (maxVal <= minVal) maxVal = minVal + 0.1;

      const basePoints = relevantSensors.map((s) => {
        const xPct =
          (s.position.longitude - layout.xmin) / (layout.xmax - layout.xmin);
        const yPct =
          1 - (s.position.latitude - layout.ymin) / (layout.ymax - layout.ymin);

        const clampedXPct = Math.max(0.02, Math.min(0.98, xPct));
        const clampedYPct = Math.max(0.02, Math.min(0.98, yPct));

        return {
          x: Math.round(width * clampedXPct),
          y: Math.round(height * clampedYPct),
          value: s.currentValue,
        };
      });

      heatmapInstanceRef.current.setData({
        min: minVal,
        max: maxVal * 1.1,
        data: basePoints,
      });
    };

    drawHeatmap();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(drawHeatmap);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [allSensors, type, layout, isReady, focusedSensor.id]);

  const activeClipPath = isIndoor
    ? layout.terminalClipStr
    : layout.tarmacClipStr;

  const hasValidCoords =
    focusedSensor.position.longitude !== 0 &&
    focusedSensor.position.latitude !== 0;
  const focusedXPct = hasValidCoords
    ? ((focusedSensor.position.longitude - layout.xmin) /
        (layout.xmax - layout.xmin)) *
      100
    : -10;
  const focusedYPct = hasValidCoords
    ? 100 -
      ((focusedSensor.position.latitude - layout.ymin) /
        (layout.ymax - layout.ymin)) *
        100
    : -10;

  return (
    <div className="flex flex-col gap-1 w-full pt-2">
      <div className="flex justify-between items-center ml-8 mb-2 pr-4">
        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest flex items-center gap-2">
          Spatial Heatmap: {focusedSensor.type.replace("_", " ")} Topology
        </span>
        <div className="flex items-center gap-2 whitespace-nowrap flex-nowrap shrink-0">
          {/* <button
            onClick={() => setImmersiveActive(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e3a8a] text-white text-[8px] font-bold uppercase tracking-widest rounded shadow hover:bg-blue-800 transition-colors cursor-pointer pointer-events-auto shrink-0"
          >
            <Layers size={10} /> View on Map
          </button> */}
          <SyncBadge />
        </div>
      </div>

      <div className="relative w-[calc(100%-2rem)] mx-auto h-64 border border-gray-200 rounded-lg overflow-hidden bg-[#f8fafc]">
        <div
          className="absolute inset-0 z-10 mix-blend-multiply transition-all duration-700"
          style={{ clipPath: activeClipPath }}
        >
          <div ref={containerRef} className="w-full h-full" />
        </div>

        <svg
          className="absolute inset-0 w-full h-full z-20 pointer-events-none drop-shadow-sm"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {!isTarmac && (
            <>
              <polygon
                points={layout.terminalPointsStr}
                fill="transparent"
                stroke="#64748b"
                strokeWidth="0.4"
                strokeDasharray="1 1.5"
              />
              <text
                x="50"
                y="50"
                fontSize="3.5"
                fill="#475569"
                textAnchor="middle"
                className="font-mono uppercase font-bold tracking-widest"
              >
                Terminal Footprint
              </text>
            </>
          )}
          {isTarmac && (
            <>
              <polygon
                points={layout.tarmacPointsStr}
                fill="transparent"
                stroke="#64748b"
                strokeWidth="0.4"
                strokeDasharray="2 2"
              />
              <text
                x="50"
                y="50"
                fontSize="3.5"
                fill="#475569"
                textAnchor="middle"
                className="font-mono uppercase font-bold tracking-widest"
              >
                Tarmac Corridor
              </text>
            </>
          )}

          {hasValidCoords && (
            <g>
              <circle
                cx={`${focusedXPct}%`}
                cy={`${focusedYPct}%`}
                r="1.5"
                fill="#1e3a8a"
              />
              <text
                x={`${focusedXPct}%`}
                y={`${focusedYPct - 4}%`}
                fontSize="2.5"
                fill="#1e3a8a"
                textAnchor="middle"
                className="font-bold tracking-widest bg-white/50"
              >
                {/* {focusedSensor.id.split("-").pop()} */}
                {focusedSensor.name}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export function SensorFocusPanel() {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const clearSelection = useAirportStore((state) => state.clearSelection);
  const sensor = useAirportStore((state) => state.getSelectedSensor());

  const isImmersiveActive = useAirportStore((state) => state.isImmersiveActive);
  const setImmersiveActive = useAirportStore(
    (state) => state.setImmersiveActive,
  );

  const [throttledHeavy, setThrottledHeavy] = useState(() => {
    const state = useAirportStore.getState();
    return {
      history: state.historicalData,
      forecasts: state.aiForecasts,
      sensors: state.sensors,
      lastUpdated: Date.now(),
    };
  });

  useEffect(() => {
    if (!isDashboardOpen) return;
    const syncData = () => {
      const state = useAirportStore.getState();
      setThrottledHeavy({
        history: state.historicalData,
        forecasts: state.aiForecasts,
        sensors: state.sensors,
        lastUpdated: Date.now(),
      });
    };

    syncData();
    const interval = setInterval(syncData, 300000);
    return () => clearInterval(interval);
  }, [isDashboardOpen, sensor?.id]);

  const history = (sensor && throttledHeavy.history[sensor.id]) || EMPTY_ARRAY;
  const storeForecast = sensor
    ? throttledHeavy.forecasts[sensor.id]
    : undefined;
  const throttledSensors = throttledHeavy.sensors as SensorData[];

  const [fallbackTime] = useState(() => Date.now());

  const nowMs = useMemo(() => {
    if (history.length > 0) {
      return new Date(history[history.length - 1].timestamp).getTime();
    }
    return fallbackTime;
  }, [history, fallbackTime]);

  const totalSensors = useAirportStore((state) => state.sensors.length);
  const sensorId = sensor?.id;

  const currentIndex = useMemo(() => {
    return sensorId
      ? useAirportStore.getState().sensors.findIndex((s) => s.id === sensorId)
      : -1;
  }, [sensorId]);

  // --- Strict Environmental Categorization ---
  const typeStr = String(sensor?.type || "UNKNOWN").toUpperCase();

  // Outdoor Entities
  const isTilt = typeStr === "TILT_STRUCTURAL" || typeStr.includes("TILT");
  const isOutdoorWind = typeStr === "WIND_OUTDOOR";
  const isTarmacTemp = typeStr === "TARMAC_TEMP";

  // Indoor Entities
  const isIndoorWind = typeStr === "WIND_INDOOR";
  const isIndoorTemp = typeStr === "TEMPERATURE" || typeStr === "INDOOR_TEMP";
  const isCO2 = typeStr === "CO2";
  const isHumidity = typeStr === "HUMIDITY";
  const isCrowd = typeStr === "CAMERA_AI_CROWD" || typeStr.includes("CROWD");

  // General fallback groupings
  const isLight = typeStr.includes("LIGHT");
  const isTemp = isIndoorTemp || isTarmacTemp;
  const isWind = isIndoorWind || isOutdoorWind;

  const status = sensor?.status || "UNKNOWN";
  const theme = STATUS_COLORS[status] || STATUS_COLORS["DEFAULT"];

  const zoneName =
    typeof sensor?.zone === "string"
      ? sensor.zone
      : sensor?.zone?.name || "Unknown Zone";
  const unit = sensor?.unit || "";

  const currentVal = sensor?.currentValue || 0;

  const forecast = useMemo(() => {
    if (storeForecast && storeForecast.predictions?.length > 0)
      return storeForecast;

    const preds = [];
    for (let i = 1; i <= 6; i++) {
      preds.push({
        horizonLabel: `+${i * 10}m`,
        predictedValue: currentVal * (1 + Math.sin(i) * 0.05),
        confidenceScore: Math.max(0.6, 0.95 - i * 0.05),
      });
    }
    return { predictions: preds };
  }, [storeForecast, currentVal]);

  const { chartData, nowLabel } = useMemo(() => {
    let nowLabelStr = "";
    const DATA_POINTS = 20;
    let baseData: ChartDataPoint[] = [];

    for (let i = 0; i < DATA_POINTS; i++) {
      const histIndex =
        history.length > 0
          ? Math.floor((i / DATA_POINTS) * history.length)
          : -1;
      const h = history[histIndex] || history[history.length - 1];

      const t = new Date(nowMs - (DATA_POINTS - 1 - i) * 60000);
      const time = t.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const val = h ? h.value : currentVal;
      const noise = Math.sin(i) * 2;

      baseData.push({
        time,
        realValue: val,
        value: val,
        gust: val * 1.4,
        indoorTemp: isIndoorTemp ? val : 22 + noise,
        tarmacTemp: isTarmacTemp ? val : 35 + noise,
        crowdDensity: isCrowd ? val : Math.floor(200 + noise * 50),
        co2Level: isCO2 ? val : 420 + noise * 5,
        humidity: isHumidity ? val : 50 + noise * 3,
        windOutdoor: isOutdoorWind ? val : 10 + noise,
        windIndoor: isIndoorWind ? val : 2 + noise,
        structTilt: isTilt ? val : 0.01 + Math.abs(noise) * 0.005,
        lightDensity: isLight ? val : 800 + noise * 100,
      });
    }

    if (forecast && forecast.predictions?.length > 0) {
      const lastRealPoint = baseData[baseData.length - 1];
      if (lastRealPoint) {
        nowLabelStr = lastRealPoint.time;
        lastRealPoint.predictedValue = lastRealPoint.realValue;
        lastRealPoint.predictedIndoorTemp = lastRealPoint.indoorTemp;
        lastRealPoint.predictedTarmacTemp = lastRealPoint.tarmacTemp;
        lastRealPoint.predictedCrowdDensity = lastRealPoint.crowdDensity;
        lastRealPoint.predictedCo2Level = lastRealPoint.co2Level;
        lastRealPoint.predictedHumidity = lastRealPoint.humidity;
        lastRealPoint.predictedWindOutdoor = lastRealPoint.windOutdoor;
        lastRealPoint.predictedWindIndoor = lastRealPoint.windIndoor;
        lastRealPoint.predictedStructTilt = lastRealPoint.structTilt;
        lastRealPoint.predictedLightDensity = lastRealPoint.lightDensity;
        lastRealPoint.confRange = [
          lastRealPoint.realValue ?? 0,
          lastRealPoint.realValue ?? 0,
        ];
      }

      const predictedData = forecast.predictions.map((p, i) => {
        const errorMargin = 1 - (p.confidenceScore || 0);
        const offset = Math.max(
          (p.predictedValue || 0) * errorMargin,
          isTilt ? 0.005 : 2,
        );
        const pVal = p.predictedValue;
        const noise = Math.sin(baseData.length + i) * 2;

        return {
          time: p.horizonLabel,
          predictedValue: pVal,
          confRange: [
            Math.max(0, (pVal ?? 0) - offset),
            (pVal ?? 0) + offset,
          ] as [number, number],
          isPrediction: true,
          predictedIndoorTemp: isIndoorTemp ? pVal : 22 + noise,
          predictedTarmacTemp: isTarmacTemp ? pVal : 35 + noise,
          predictedCrowdDensity: isCrowd ? pVal : Math.floor(200 + noise * 50),
          predictedCo2Level: isCO2 ? pVal : 420 + noise * 5,
          predictedHumidity: isHumidity
            ? pVal
            : 50 + noise * 3 + Math.sin(i) * 2,
          predictedWindOutdoor: isOutdoorWind ? pVal : 10 + noise,
          predictedWindIndoor: isIndoorWind ? pVal : 2 + noise,
          predictedStructTilt: isTilt ? pVal : 0.01 + Math.abs(noise) * 0.005,
          predictedLightDensity: isLight ? pVal : 800 + noise * 100,
        };
      });
      baseData = [...baseData, ...predictedData];
    }

    return { chartData: baseData, nowLabel: nowLabelStr };
  }, [history, forecast, typeStr, currentVal, nowMs]);

  const windRadarData = useMemo(() => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions.map((dir, i) => {
      const histVal =
        chartData[i % Math.max(1, history.length)]?.realValue || currentVal;
      const predVal = forecast?.predictions?.length
        ? forecast.predictions[i % Math.max(1, forecast.predictions.length)]
            ?.predictedValue
        : histVal;
      return {
        direction: dir,
        speed: histVal * (1 + Math.sin(i) * 0.2),
        predictedSpeed: (predVal ?? 0) * (1 + Math.cos(i) * 0.2),
      };
    });
  }, [chartData, currentVal, history.length, forecast]);

  const dualWindRadarData = useMemo(() => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions.map((dir, i) => {
      const outVal =
        chartData[i % Math.max(1, chartData.length)]?.windOutdoor || 10;
      const inVal =
        chartData[i % Math.max(1, chartData.length)]?.windIndoor || 2;
      return {
        direction: dir,
        outdoor: outVal * (1 + Math.sin(i) * 0.2),
        indoor: inVal * (1 + Math.cos(i) * 0.2),
      };
    });
  }, [chartData]);

  const aiRecommendations = useMemo(() => {
    const recs = [];
    const nextVal = forecast?.predictions?.[0]?.predictedValue || currentVal;
    const trend = nextVal - currentVal;

    if (isCrowd) {
      if (trend > 10)
        recs.push({
          priority: "HIGH",
          text: "Crowd surge predicted. Deploy 2 additional security personnel.",
        });
      else if (trend < -10)
        recs.push({
          priority: "LOW",
          text: "Traffic clearing. Begin partial staff rotation.",
        });
      else
        recs.push({
          priority: "LOW",
          text: "Flow stable. Maintain current staffing levels.",
        });
    } else if (isCO2) {
      if (nextVal > 600)
        recs.push({
          priority: "MEDIUM",
          text: "CO2 levels rising. Open fresh air intake damper to 40%.",
        });
      else
        recs.push({
          priority: "LOW",
          text: "Air quality optimal. No HVAC adjustments needed.",
        });
    } else if (isOutdoorWind) {
      if (nextVal > 25)
        recs.push({
          priority: "CRITICAL",
          text: "High wind warning. Secure loose tarmac equipment immediately.",
        });
      else if (nextVal > 15)
        recs.push({
          priority: "MEDIUM",
          text: "Elevated winds. Alert baggage handling crews.",
        });
      else
        recs.push({
          priority: "LOW",
          text: "Wind conditions safe for standard operations.",
        });
    } else if (isIndoorWind) {
      if (nextVal > 5)
        recs.push({
          priority: "MEDIUM",
          text: "Draft detected. Reduce local HVAC blower fan speed.",
        });
      else
        recs.push({ priority: "LOW", text: "Indoor air circulation nominal." });
    } else if (isTarmacTemp) {
      if (nextVal > 40)
        recs.push({
          priority: "HIGH",
          text: "Extreme surface heat. Increase aircraft turnaround cooling.",
        });
      else
        recs.push({
          priority: "LOW",
          text: "Surface temperature within safe operational limits.",
        });
    } else if (isIndoorTemp) {
      if (nextVal > 25)
        recs.push({
          priority: "MEDIUM",
          text: "Zone warming up. Increase cooling load by 10%.",
        });
      else if (nextVal < 20)
        recs.push({
          priority: "MEDIUM",
          text: "Zone over-cooled. Reduce chiller output.",
        });
      else
        recs.push({
          priority: "LOW",
          text: "Temperature stable. Energy saving mode active.",
        });
    } else if (isHumidity) {
      if (nextVal > 60)
        recs.push({
          priority: "MEDIUM",
          text: "High humidity. Activate dehumidifier cycle in HVAC.",
        });
      else recs.push({ priority: "LOW", text: "Humidity nominal." });
    } else if (isTilt) {
      if (nextVal > 0.05)
        recs.push({
          priority: "CRITICAL",
          text: "Deflection exceeding bounds. Inspect structural joints.",
        });
      else recs.push({ priority: "LOW", text: "Structural load nominal." });
    } else {
      recs.push({
        priority: "LOW",
        text: "All parameters nominal. Continue automated monitoring.",
      });
    }
    return recs;
  }, [
    isCrowd,
    isCO2,
    isOutdoorWind,
    isIndoorWind,
    isTarmacTemp,
    isIndoorTemp,
    isHumidity,
    isTilt,
    forecast,
    currentVal,
  ]);

  const vendorId = sensor?.id.split("-")[0].toUpperCase() || "UNKNOWN";

  const configMap = {
    value: { label: "Level", color: theme.hex },
    realValue: { label: "Recorded", color: theme.hex },
    predictedValue: { label: "AI Forecast", color: "#f59e0b" },
    confRange: { label: "Confidence", color: "#fcd34d" },
    gust: { label: "Gust", color: "#1e3a8a" },

    indoorTemp: { label: "Indoor Temp (°C)", color: "#0ea5e9" },
    predictedIndoorTemp: { label: "Predicted Indoor (°C)", color: "#7dd3fc" },

    tarmacTemp: { label: "Tarmac Temp (°C)", color: "#ef4444" },
    predictedTarmacTemp: { label: "Predicted Tarmac (°C)", color: "#fca5a5" },

    crowdDensity: { label: "Crowd Flow", color: "#8b5cf6" },
    predictedCrowdDensity: { label: "Predicted Crowd Flow", color: "#c4b5fd" },

    co2Level: { label: "CO2 (ppm)", color: "#10b981" },
    predictedCo2Level: { label: "Predicted CO2 (ppm)", color: "#6ee7b7" },

    humidity: { label: "Humidity (%)", color: "#06b6d4" },
    predictedHumidity: { label: "Predicted Hum. (%)", color: "#67e8f9" },

    windOutdoor: { label: "Outdoor Wind (kts)", color: "#3b82f6" },
    predictedWindOutdoor: {
      label: "Predicted Outdoor (kts)",
      color: "#93c5fd",
    },

    windIndoor: { label: "Indoor Draft (kts)", color: "#6366f1" },
    predictedWindIndoor: { label: "Predicted Indoor (kts)", color: "#a5b4fc" },

    structTilt: { label: "Tilt (°)", color: "#0f172a" },
    predictedStructTilt: { label: "Predicted Tilt (°)", color: "#64748b" },

    lightDensity: { label: "Light (lux)", color: "#f59e0b" },
    predictedLightDensity: { label: "Predicted Light (lux)", color: "#fcd34d" },

    speed: { label: "Real Speed", color: "#1e3a8a" },
    predictedSpeed: { label: "Forecast Speed", color: "#f59e0b" },

    outdoor: { label: "Outdoor Matrix", color: "#3b82f6" },
    indoor: { label: "Indoor Matrix", color: "#6366f1" },
  } satisfies ChartConfig;

  if (!isDashboardOpen || !sensor) return null;

  if (isImmersiveActive) {
    return (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <button
          onClick={() => setImmersiveActive(false)}
          className="flex items-center gap-2 px-6 py-3 bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl rounded-full text-[11px] font-black text-gray-800 uppercase tracking-widest hover:bg-gray-50 transition-all hover:scale-105"
        >
          <ChevronLeft size={18} className="text-[#1e3a8a]" />
          Exit Immersive Heatmap
        </button>
      </div>
    );
  }

  const handlePrev = () => {
    const sensors = useAirportStore.getState().sensors;
    selectEntity(
      sensors[currentIndex <= 0 ? totalSensors - 1 : currentIndex - 1].id,
      "sensor",
    );
  };
  const handleNext = () => {
    const sensors = useAirportStore.getState().sensors;
    selectEntity(
      sensors[currentIndex >= totalSensors - 1 ? 0 : currentIndex + 1].id,
      "sensor",
    );
  };

  return (
    <>
      {/* LEFT PANEL */}
      <BentoPanel
        direction="left"
        isOpen={true}
        className="absolute top-20 left-6 w-[380px] z-30 flex flex-col gap-2 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
      >
        <div className="flex justify-between items-center w-full bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/80 p-2 shrink-0 sticky top-0 z-50 mb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-mono font-bold text-gray-500 w-10 text-center select-none tracking-widest">
              {currentIndex + 1}/{totalSensors}
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

        <HardwareReceiptCard
          title="Hardware Identity"
          vendorId={vendorId}
          icon={Fingerprint}
          footerText="NETWORK: IOT-VLAN-4"
          theme={theme}
        >
          <div className="flex justify-between items-center pb-2">
            <div className="flex flex-col items-start">
              <div className="text-xl font-black text-gray-800 tracking-tighter truncate max-w-[190px]">
                {sensor.name}
              </div>
              <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
                <MapPin size={10} className="text-[#1e3a8a]" /> {zoneName}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center bg-white shadow-inner">
                {isTemp && <Thermometer size={18} className="text-gray-400" />}
                {isWind && (
                  <NavigationIcon size={18} className="text-gray-400" />
                )}
                {isCO2 && <CircleDashed size={18} className="text-gray-400" />}
                {isHumidity && <Droplets size={18} className="text-gray-400" />}
                {isTilt && <Shield size={18} className="text-gray-400" />}
                {isCrowd && <Users size={18} className="text-gray-400" />}
                {isLight && <Sun size={18} className="text-gray-400" />}
                {!isTemp &&
                  !isWind &&
                  !isCO2 &&
                  !isHumidity &&
                  !isTilt &&
                  !isCrowd &&
                  !isLight && <Wifi size={18} className="text-gray-400" />}
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">
                Category
              </span>
              <span className="text-xs font-black text-gray-800">
                {typeStr.replace("_", " ")}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">
                Health Status
              </span>
              <span className={`text-xs font-black uppercase ${theme.text}`}>
                {status}
              </span>
            </div>
          </div>
        </HardwareReceiptCard>

        <div
          role="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("recenter-entity"))
          }
          className="w-full cursor-none group"
        >
          <HardwareReceiptCard
            title="Live Telemetry HUD"
            vendorId={vendorId}
            icon={LocateFixed}
            footerText="CLICK TO RECENTER"
            theme={theme}
          >
            <div className="flex items-center justify-center py-6 relative overflow-hidden bg-gray-50 border border-gray-200 rounded-md shadow-inner group-hover:bg-blue-50 transition-colors">
              <div className="absolute inset-0 flex items-center justify-center opacity-5 group-hover:opacity-10 transition-opacity">
                {isTemp && <Thermometer size={100} />}
                {isWind && <NavigationIcon size={100} />}
                {isTilt && <Shield size={100} />}
                {isCrowd && <Users size={100} />}
                {isLight && <Sun size={100} />}
                {isCO2 && <CircleDashed size={100} />}
                {isHumidity && <Droplets size={100} />}
              </div>
              <div className="flex flex-col items-center z-10">
                <div className="text-6xl font-black font-mono text-gray-800 tracking-tighter group-hover:text-[#1e3a8a] transition-colors">
                  {currentVal.toFixed(isTilt ? 4 : 1)}
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {unit}
                </div>
              </div>
            </div>
          </HardwareReceiptCard>
        </div>

        <HardwareReceiptCard
          title="Tolerances & Specs"
          vendorId={vendorId}
          icon={Ruler}
          footerText="CALIBRATED"
          theme={theme}
        >
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">
                Upper Limit (UCL)
              </span>
              <span className="text-xs font-bold font-mono text-red-600">
                {(currentVal * 1.2).toFixed(isTilt ? 4 : 1)} {unit}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">
                Lower Limit (LCL)
              </span>
              <span className="text-xs font-bold font-mono text-blue-600">
                {(currentVal * 0.8).toFixed(isTilt ? 4 : 1)} {unit}
              </span>
            </div>
          </div>
        </HardwareReceiptCard>

        <HardwareReceiptCard
          title="Hardware Schematic"
          vendorId={vendorId}
          icon={ImageIcon}
          footerText="VISUAL CONFIRMATION"
          theme={theme}
          bgImage={sensor.imageUrl}
        >
          <div className="flex-1 min-h-[140px] flex items-center justify-center relative">
            {!sensor.imageUrl && (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={40} className="mb-2 opacity-50" />
                <span className="text-[10px] font-bold tracking-widest uppercase">
                  No Image On File
                </span>
              </div>
            )}

            <div
              className={`absolute bottom-0 right-0 text-[10px] font-bold uppercase tracking-widest ${sensor.imageUrl ? "text-white" : "text-gray-500"}`}
            >
              SN: {sensor.id.split("-")[0].toUpperCase()}
            </div>
          </div>
        </HardwareReceiptCard>
      </BentoPanel>

      {/* RIGHT PANEL */}
      <BentoPanel
        direction="right"
        isOpen={true}
        className="absolute top-20 right-6 w-[440px] z-30 flex flex-col gap-2 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pl-2 pointer-events-auto"
      >
        <div className="flex justify-between items-center w-full bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/80 p-2 shrink-0 sticky top-0 z-50 mb-2">
          <div className="flex items-center gap-2 px-2">
            <Activity size={14} className="text-[#1e3a8a]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-800">
              Live Telemetry
            </span>
          </div>
          {forecast && (
            <Badge
              variant="outline"
              className="border-amber-500 text-amber-600 bg-amber-50 gap-1 px-2 pointer-events-none"
            >
              <BrainCircuit size={10} /> AI FORECAST
            </Badge>
          )}
        </div>

        {/* AI Recommendations Box */}
        <HardwareReceiptCard
          title="AI Recommended Actions"
          vendorId={vendorId}
          icon={BrainCircuit}
          footerText="PREDICTIVE LOGIC ENGINE"
          theme={{
            ...theme,
            hex: "#8b5cf6",
            bg: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200",
            solidBg: "bg-purple-500",
          }}
        >
          <div className="flex flex-col gap-2 pt-1 pb-1">
            {aiRecommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-3 items-center p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm relative overflow-hidden group"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${rec.priority === "CRITICAL" ? "bg-red-500" : rec.priority === "HIGH" ? "bg-orange-500" : rec.priority === "MEDIUM" ? "bg-amber-500" : "bg-green-500"}`}
                />
                <div className="ml-1 flex items-center justify-center text-gray-400 group-hover:text-[#1e3a8a] transition-colors">
                  {rec.priority === "CRITICAL" || rec.priority === "HIGH" ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                </div>
                <div className="flex flex-col flex-1">
                  <span
                    className={`text-[9px] font-bold tracking-widest ${rec.priority === "CRITICAL" ? "text-red-500" : rec.priority === "HIGH" ? "text-orange-500" : rec.priority === "MEDIUM" ? "text-amber-500" : "text-green-600"}`}
                  >
                    {rec.priority} PRIORITY
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-800 leading-tight mt-0.5">
                    {rec.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </HardwareReceiptCard>

        <HardwareReceiptCard
          title={`${typeStr.replace("_", " ")} Dynamics Log`}
          vendorId={vendorId}
          icon={Activity}
          footerText="RECORDING ACTIVE"
          theme={theme}
        >
          <div
            className="flex flex-col gap-6 w-full -ml-3 mt-2"
            data-cursor="crosshair"
          >
            <div className="relative w-full">
              <SyncBadge className="absolute top-0 right-4" />
              <ChartContainer config={configMap} className="h-48 w-full pt-4">
                <ComposedChart
                  data={chartData}
                  margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorEnv" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={theme.hex}
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="100%"
                        stopColor={theme.hex}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#d1d5db"
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
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                  />

                  {nowLabel && (
                    <ReferenceLine
                      x={nowLabel}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={{
                        position: "insideTopLeft",
                        value: "FORECAST",
                        fill: "#ef4444",
                        fontSize: 9,
                      }}
                    />
                  )}

                  <Area
                    type="step"
                    dataKey="confRange"
                    stroke="none"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />

                  {isTemp && (
                    <Area
                      type="monotone"
                      dataKey="realValue"
                      stroke="var(--color-realValue)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEnv)"
                      isAnimationActive={false}
                    />
                  )}
                  {isCO2 && (
                    <Bar
                      dataKey="realValue"
                      fill="var(--color-realValue)"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  )}
                  {isHumidity && (
                    <Area
                      type="monotone"
                      dataKey="realValue"
                      stroke="var(--color-realValue)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEnv)"
                      isAnimationActive={false}
                    />
                  )}
                  {isCrowd && (
                    <Area
                      type="step"
                      dataKey="realValue"
                      stroke="var(--color-realValue)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEnv)"
                      isAnimationActive={false}
                    />
                  )}
                  {isLight && (
                    <Line
                      type="monotone"
                      dataKey="realValue"
                      stroke="var(--color-realValue)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "var(--color-realValue)" }}
                      isAnimationActive={false}
                    />
                  )}
                  {isTilt && (
                    <Line
                      type="step"
                      dataKey="realValue"
                      stroke="var(--color-realValue)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--color-realValue)" }}
                      isAnimationActive={false}
                    />
                  )}
                  {isWind && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="realValue"
                        stroke="var(--color-realValue)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "var(--color-realValue)" }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="gust"
                        stroke="var(--color-gust)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </>
                  )}

                  {/* Forecast Line */}
                  <Line
                    type={isTilt || isCrowd ? "step" : "monotone"}
                    dataKey="predictedValue"
                    stroke="var(--color-predictedValue)"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ChartContainer>
            </div>

            {isWind && (
              <>
                <div className="h-px bg-gray-200 border-b border-dashed border-gray-300 w-full ml-4" />
                <div className="flex justify-between items-center ml-8 mt-2 pr-4">
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                    Directional Plot Matrix
                  </span>
                  <SyncBadge />
                </div>

                <ChartContainer config={configMap} className="h-56 w-full mt-2">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    data={windRadarData}
                  >
                    <PolarGrid stroke="#cbd5e1" />
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

                    <Radar
                      name="Real Speed"
                      dataKey="speed"
                      stroke="var(--color-speed)"
                      strokeWidth={2}
                      fill="var(--color-speed)"
                      fillOpacity={0.3}
                      isAnimationActive={false}
                    />
                    {forecast && (
                      <Radar
                        name="Forecast Speed"
                        dataKey="predictedSpeed"
                        stroke="var(--color-predictedSpeed)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fill="var(--color-predictedSpeed)"
                        fillOpacity={0.15}
                        isAnimationActive={false}
                      />
                    )}
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              </>
            )}
          </div>
        </HardwareReceiptCard>

        <HardwareReceiptCard
          title="Hardware Diagnostics"
          vendorId={vendorId}
          icon={Settings}
          footerText="UPTIME: 99.9%"
          theme={theme}
        >
          <div className="flex flex-col space-y-3 pt-2">
            <div className="flex justify-between items-end border-b border-dotted border-gray-300 pb-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Battery Level
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                85%
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-gray-300 pb-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Signal (dBm)
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                -45
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-gray-300 pb-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Core Temp
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                42°C
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-dotted border-gray-300 pb-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Memory Load
              </span>
              <span className="text-xs font-bold font-mono text-gray-800">
                67%
              </span>
            </div>
          </div>
        </HardwareReceiptCard>

        <HardwareReceiptCard
          title="Network Profile"
          vendorId={vendorId}
          icon={Server}
          footerText="QoS: 1"
          theme={theme}
        >
          <div className="space-y-4 pt-1">
            <div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                MQTT Topic Route
              </span>
              <span className="text-[10px] font-bold font-mono text-gray-800 break-all leading-tight block">
                /v1/sgn/{typeStr.toLowerCase().split("_")[0]}/
                {sensor.id.split("-")[0]}
              </span>
            </div>
            <div className="flex justify-between items-end border-t border-dashed border-gray-300 pt-3">
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
                  Payload
                </span>
                <span className="text-xs font-bold font-mono text-gray-800">
                  256 bytes
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 justify-end mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />{" "}
                  Latency
                </span>
                <span className="text-xs font-bold font-mono text-gray-800">
                  14ms (TLS 1.3)
                </span>
              </div>
            </div>
          </div>
        </HardwareReceiptCard>
      </BentoPanel>

      {/* NEW CENTER PANEL (ANALYSIS) WITH INTEGRATED TOGGLE (DOCKED TO RIGHT) */}
      <div className="absolute top-20 right-[472px] z-40 flex flex-col items-end pointer-events-none">
        {/* 1. SQUARE TOGGLE BUTTON */}
        <button
          onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
          className="p-2 rounded-xl shadow-md border flex items-center justify-center transition-all duration-300 pointer-events-auto bg-white/95 backdrop-blur-md text-[#1e3a8a] border-gray-200/80 hover:bg-blue-50 z-50 relative"
        >
          {isAnalysisOpen ? <X size={20} /> : <ChartIcon size={20} />}
        </button>

        {/* 2. EXPANDING PANEL */}
        <div
          className={`
            mt-2 w-[500px] flex flex-col h-[calc(100vh-140px)] pointer-events-auto relative
            transition-all duration-500 ease-out origin-top-right pt-2
            ${
              isAnalysisOpen
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-y-0 scale-x-90 -translate-y-8 pointer-events-none"
            }
          `}
        >
          <div className="flex-1 w-full overflow-y-auto custom-scrollbar drop-shadow-2xl">
            <HardwareReceiptCard
              title="Diagnostic Correlations"
              vendorId={vendorId}
              icon={BrainCircuit}
              footerText="AI ANALYSIS ENGINE"
              theme={theme}
            >
              <div
                className="flex flex-col gap-8 w-full -ml-3 mt-2"
                data-cursor="crosshair"
              >
                {/* ========================================================
                    INDOOR CORRELATIONS
                    All indoor sensors triangulate with camera_ai_crowd
                ======================================================== */}
                {(isCO2 || isCrowd) && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Air Quality Matrix: CO2 vs Temp vs Crowd Flow
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="co2Grad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-co2Level)"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-co2Level)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 9, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="crowd"
                          orientation="left"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-crowdDensity)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="co2"
                          orientation="right"
                          tick={{ fontSize: 9, fill: "var(--color-co2Level)" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="temp"
                          orientation="right"
                          hide={true}
                          domain={["auto", "auto"]}
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            yAxisId="crowd"
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Bar
                          yAxisId="crowd"
                          dataKey="crowdDensity"
                          fill="var(--color-crowdDensity)"
                          opacity={0.15}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          yAxisId="crowd"
                          dataKey="predictedCrowdDensity"
                          fill="var(--color-predictedCrowdDensity)"
                          opacity={0.15}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />

                        <Area
                          yAxisId="co2"
                          type="monotone"
                          dataKey="co2Level"
                          stroke="none"
                          fill="url(#co2Grad)"
                          fillOpacity={1}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="co2"
                          type="monotone"
                          dataKey="co2Level"
                          stroke="var(--color-co2Level)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="co2"
                          type="monotone"
                          dataKey="predictedCo2Level"
                          stroke="var(--color-predictedCo2Level)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="indoorTemp"
                          stroke="var(--color-indoorTemp)"
                          strokeWidth={4}
                          strokeLinecap="round"
                          style={{
                            filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))",
                          }}
                          dot={{
                            r: 2,
                            fill: "var(--color-indoorTemp)",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="predictedIndoorTemp"
                          stroke="var(--color-predictedIndoorTemp)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {(isIndoorTemp || isHumidity) && !isCO2 && !isCrowd && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Thermal Comfort Matrix: Temp vs Humidity vs Crowd Flow
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="humGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-humidity)"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-humidity)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 9, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="crowd"
                          orientation="left"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-crowdDensity)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="humidity"
                          orientation="right"
                          tick={{ fontSize: 9, fill: "var(--color-humidity)" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="temp"
                          orientation="right"
                          hide={true}
                          domain={["auto", "auto"]}
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            yAxisId="crowd"
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Bar
                          yAxisId="crowd"
                          dataKey="crowdDensity"
                          fill="var(--color-crowdDensity)"
                          opacity={0.15}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          yAxisId="crowd"
                          dataKey="predictedCrowdDensity"
                          fill="var(--color-predictedCrowdDensity)"
                          opacity={0.15}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />

                        <Area
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="humidity"
                          stroke="none"
                          fill="url(#humGrad)"
                          fillOpacity={1}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="humidity"
                          stroke="var(--color-humidity)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="predictedHumidity"
                          stroke="var(--color-predictedHumidity)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="indoorTemp"
                          stroke="var(--color-indoorTemp)"
                          strokeWidth={4}
                          strokeLinecap="round"
                          style={{
                            filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))",
                          }}
                          dot={{
                            r: 2,
                            fill: "var(--color-indoorTemp)",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="predictedIndoorTemp"
                          stroke="var(--color-predictedIndoorTemp)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {isIndoorWind && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        HVAC Draft Analysis: Indoor Wind vs Temp vs Crowd
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="windInGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-windIndoor)"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-windIndoor)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 9, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="crowd"
                          orientation="left"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-crowdDensity)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="wind"
                          orientation="right"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-windIndoor)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="temp"
                          orientation="right"
                          hide={true}
                          domain={["auto", "auto"]}
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            yAxisId="crowd"
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Bar
                          yAxisId="crowd"
                          dataKey="crowdDensity"
                          fill="var(--color-crowdDensity)"
                          opacity={0.15}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          yAxisId="crowd"
                          dataKey="predictedCrowdDensity"
                          fill="var(--color-predictedCrowdDensity)"
                          opacity={0.15}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />

                        <Area
                          yAxisId="wind"
                          type="monotone"
                          dataKey="windIndoor"
                          stroke="none"
                          fill="url(#windInGrad)"
                          fillOpacity={1}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="wind"
                          type="monotone"
                          dataKey="windIndoor"
                          stroke="var(--color-windIndoor)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="wind"
                          type="monotone"
                          dataKey="predictedWindIndoor"
                          stroke="var(--color-predictedWindIndoor)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="indoorTemp"
                          stroke="var(--color-indoorTemp)"
                          strokeWidth={4}
                          strokeLinecap="round"
                          style={{
                            filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))",
                          }}
                          dot={{
                            r: 2,
                            fill: "var(--color-indoorTemp)",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="predictedIndoorTemp"
                          stroke="var(--color-predictedIndoorTemp)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {/* ========================================================
                    OUTDOOR CORRELATIONS
                    Wind_Outdoor receives BOTH Heat Dissipation and Shear
                ======================================================== */}
                {(isTarmacTemp || isOutdoorWind) && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Surface Thermal Dissipation: Tarmac Temp vs Outdoor Wind
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="tarmacGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-tarmacTemp)"
                              stopOpacity={0.7}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-tarmacTemp)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 9, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="temp"
                          orientation="left"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-tarmacTemp)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                        />
                        <YAxis
                          yAxisId="wind"
                          orientation="right"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-windOutdoor)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            yAxisId="temp"
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Area
                          yAxisId="temp"
                          type="monotone"
                          dataKey="tarmacTemp"
                          stroke="none"
                          fill="url(#tarmacGrad)"
                          fillOpacity={1}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="tarmacTemp"
                          stroke="var(--color-tarmacTemp)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="predictedTarmacTemp"
                          stroke="var(--color-predictedTarmacTemp)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          yAxisId="wind"
                          type="step"
                          dataKey="windOutdoor"
                          stroke="var(--color-windOutdoor)"
                          strokeWidth={4}
                          style={{
                            filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))",
                          }}
                          dot={{
                            r: 2,
                            fill: "var(--color-windOutdoor)",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="wind"
                          type="step"
                          dataKey="predictedWindOutdoor"
                          stroke="var(--color-predictedWindOutdoor)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {(isTilt || isOutdoorWind) && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Structural Shear Load: Deflection vs Outdoor Wind
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="windOutGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-windOutdoor)"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-windOutdoor)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 9, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="wind"
                          orientation="left"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-windOutdoor)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="tilt"
                          orientation="right"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-structTilt)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            yAxisId="wind"
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Area
                          yAxisId="wind"
                          type="monotone"
                          dataKey="windOutdoor"
                          stroke="none"
                          fill="url(#windOutGrad)"
                          fillOpacity={1}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="wind"
                          type="monotone"
                          dataKey="windOutdoor"
                          stroke="var(--color-windOutdoor)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="wind"
                          type="monotone"
                          dataKey="predictedWindOutdoor"
                          stroke="var(--color-predictedWindOutdoor)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          yAxisId="tilt"
                          type="step"
                          dataKey="structTilt"
                          stroke="var(--color-structTilt)"
                          strokeWidth={3}
                          dot={{ r: 3, fill: "var(--color-structTilt)" }}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="tilt"
                          type="step"
                          dataKey="predictedStructTilt"
                          stroke="var(--color-predictedStructTilt)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{
                            r: 3,
                            fill: "var(--color-predictedStructTilt)",
                          }}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {/* ========================================================
                    INDOOR VS OUTDOOR COMPARISONS
                ======================================================== */}
                {isTemp && (
                  <div className="flex flex-col gap-1 border-t border-dashed border-gray-200 pt-4">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Thermal Efficiency Delta: Indoor Temp vs Tarmac Temp
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="tarmacBaseGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-tarmacTemp)"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-tarmacTemp)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
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

                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="tarmacTemp"
                          stroke="none"
                          fill="url(#tarmacBaseGrad)"
                          fillOpacity={1}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="tarmacTemp"
                          stroke="var(--color-tarmacTemp)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="predictedTarmacTemp"
                          stroke="var(--color-predictedTarmacTemp)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="indoorTemp"
                          stroke="var(--color-indoorTemp)"
                          strokeWidth={4}
                          style={{
                            filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))",
                          }}
                          dot={{
                            r: 2,
                            fill: "var(--color-indoorTemp)",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="predictedIndoorTemp"
                          stroke="var(--color-predictedIndoorTemp)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {isWind && (
                  <div className="flex flex-col gap-1 border-t border-dashed border-gray-200 pt-4">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Wind Velocity Delta: Indoor Draft vs Outdoor Shear
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer
                      config={configMap}
                      className="h-64 w-full mt-2"
                    >
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        data={dualWindRadarData}
                      >
                        <PolarGrid stroke="#cbd5e1" />
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

                        <Radar
                          name="Outdoor Matrix"
                          dataKey="outdoor"
                          stroke="var(--color-windOutdoor)"
                          strokeWidth={2}
                          fill="var(--color-windOutdoor)"
                          fillOpacity={0.3}
                          isAnimationActive={false}
                        />
                        <Radar
                          name="Indoor Matrix"
                          dataKey="indoor"
                          stroke="var(--color-windIndoor)"
                          strokeWidth={2}
                          fill="var(--color-windIndoor)"
                          fillOpacity={0.5}
                          isAnimationActive={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RadarChart>
                    </ChartContainer>
                  </div>
                )}

                {/* ========================================================
                    FALLBACKS / SPATIAL MAPPING
                ======================================================== */}
                {isLight && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center ml-8 mb-2 pr-4">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                        Solar Gain: Light Intensity vs Ambient Temp
                      </span>
                      <SyncBadge />
                    </div>
                    <ChartContainer config={configMap} className="h-64 w-full">
                      <ComposedChart
                        data={chartData}
                        margin={{ left: -10, right: -10, top: 10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#d1d5db"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 9, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-lightDensity)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{
                            fontSize: 9,
                            fill: "var(--color-tarmacTemp)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        {nowLabel && (
                          <ReferenceLine
                            yAxisId="left"
                            x={nowLabel}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "FORECAST",
                              fill: "#ef4444",
                              fontSize: 9,
                            }}
                          />
                        )}
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="lightDensity"
                          stroke="var(--color-lightDensity)"
                          fill="var(--color-lightDensity)"
                          fillOpacity={0.3}
                          isAnimationActive={false}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="predictedLightDensity"
                          stroke="var(--color-predictedLightDensity)"
                          fill="var(--color-predictedLightDensity)"
                          fillOpacity={0.3}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="tarmacTemp"
                          stroke="var(--color-tarmacTemp)"
                          strokeWidth={3}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="predictedTarmacTemp"
                          stroke="var(--color-predictedTarmacTemp)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                )}

                {!isTilt && (
                  <SpatialHeatmapCard
                    focusedSensor={sensor as SensorData}
                    allSensors={throttledSensors}
                  />
                )}
              </div>
            </HardwareReceiptCard>
          </div>
        </div>
      </div>
    </>
  );
}
