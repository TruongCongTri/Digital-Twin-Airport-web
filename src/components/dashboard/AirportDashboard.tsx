"use client";
import {
  useMemo,
  useState,
  ElementType,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { BentoPanel, BentoBox } from "@/src/components/panels/BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import {
  LayoutDashboard,
  BarChart3,
  ShieldAlert,
  Truck,
  ListFilter,
  Navigation,
  Plane as PlaneIcon,
  ThermometerSun,
  Wind,
  Activity,
  FileText,
  Clock,
  Zap,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLANE_STATUS_CONFIG } from "@/src/lib/status-config";
import { PlaneStatus } from "@/types";

export interface TimeDataPoint {
  time: string;
  temp: number;
  hum: number;
  wind: number;
  tilt: number;
  co2: number;
  flights: number;
  capacity: number;
  taxiIn: number;
  taxiOut: number;
  secT1: number;
  secT2: number;
  secT3: number;
  powerT1: number;
  powerT2: number;
  powerT3: number;
  gseFuel: number;
  gseBag: number;
}

export interface AirlineDataPoint {
  name: string;
  count: number;
}

type ViewMode = "standard" | "analytics";
type AnalyticsTab = "AIR_TRAFFIC" | "GROUND_OPS" | "ENVIRONMENT";
type ListFilter = "planes" | "sensors";

const boxClass =
  "bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-sm p-5 pointer-events-auto";

const FauxBarcode = ({ className = "h-6" }: { className?: string }) => (
  <div className={`flex gap-0.75 items-end opacity-60 shrink-0 ${className}`}>
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-0.5 h-full bg-gray-800 rounded-sm" />
    <div className="w-1.5 h-full bg-gray-800 rounded-sm" />
    <div className="w-0.5 h-[80%] bg-gray-800 rounded-sm" />
    <div className="w-1 h-full bg-gray-800 rounded-sm" />
    <div className="w-0.5 h-full bg-gray-800 rounded-sm" />
  </div>
);

// 5-Min Sync Badge
const SyncBadge = ({ className = "" }: { className?: string }) => (
  <div
    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest shadow-sm z-10 ${className}`}
  >
    <Clock size={8} /> 5-MIN UPDATE
  </div>
);

// REUSABLE BRIEFING DOSSIER CARD
interface BriefingCardProps {
  title: string;
  tag: string;
  icon: ElementType;
  footerText: string;
  theme?: "slate" | "blue" | "emerald";
  children: ReactNode;
  showSyncBadge?: boolean;
}

const BriefingCard = ({
  title,
  tag,
  icon: Icon,
  footerText,
  theme = "slate",
  children,
  showSyncBadge,
}: BriefingCardProps) => {
  const themes = {
    slate: "bg-slate-800 text-white",
    blue: "bg-[#1e3a8a] text-white",
    emerald: "bg-emerald-700 text-white",
  };

  return (
    <div className="w-full rounded-2xl flex flex-col shadow-lg border border-gray-200/80 bg-white shrink-0 relative overflow-hidden mt-1 mb-2">
      <div
        className={`absolute -left-3 top-[36px] w-6 h-6 bg-[#f7f7f8] rounded-full border-r border-gray-200 z-10 shadow-inner`}
      />
      <div
        className={`absolute -right-3 top-[36px] w-6 h-6 bg-[#f7f7f8] rounded-full border-l border-gray-200 z-10 shadow-inner`}
      />

      <div
        className={`${themes[theme]} px-4 py-2.5 flex justify-between items-center relative z-0`}
      >
        <span className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          <Icon size={12} /> {title}
        </span>
        <div className="flex items-center gap-2">
          {showSyncBadge && (
            <SyncBadge className="bg-white/10 text-white/90 border border-white/20" />
          )}
          <span className="text-[10px] font-mono opacity-80 font-bold tracking-wider">
            {tag}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 bg-white border-b border-dashed border-gray-300">
        {children}
      </div>
      <div className="bg-[#fafafa] px-4 py-2 flex justify-between items-center">
        <span
          className={`text-[10px] font-bold text-gray-500 tracking-widest uppercase`}
        >
          {footerText}
        </span>
        <FauxBarcode />
      </div>
    </div>
  );
};

// RUBBER STAMP COMPONENT
const RubberStamp = ({
  text,
  type = "neutral",
}: {
  text: string;
  type?: "danger" | "warning" | "success" | "neutral" | "info";
}) => {
  const colors = {
    danger: "border-red-600 text-red-600 bg-red-50",
    warning: "border-amber-600 text-amber-600 bg-amber-50",
    success: "border-emerald-600 text-emerald-600 bg-emerald-50",
    neutral: "border-gray-500 text-gray-500 bg-gray-50",
    info: "border-blue-600 text-blue-600 bg-blue-50",
  };
  return (
    <span
      className={`px-2 py-0.5 border-2 ${colors[type]} text-[9px] font-black tracking-widest uppercase inline-block rounded-sm`}
    >
      {text}
    </span>
  );
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-24 opacity-80 relative" data-cursor="crosshair">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
        debounce={50}
      >
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AirportDashboard() {
  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);

  // DASHBOARD THROTTLING ENGINE (5 MINUTE POLLING)
  // Completely decouples all heavy tables and charts from the 100ms WebSocket
  const storePlanes = useAirportStore((state) => state.planes);
  const storeSensors = useAirportStore((state) => state.sensors);
  const storeMetrics = useAirportStore((state) => state.metrics);
  const storeHistoricalData = useAirportStore((state) => state.historicalData);

  const latestRef = useRef({
    planes: storePlanes,
    sensors: storeSensors,
    metrics: storeMetrics,
    historicalData: storeHistoricalData,
  });

  useEffect(() => {
    latestRef.current = {
      planes: storePlanes,
      sensors: storeSensors,
      metrics: storeMetrics,
      historicalData: storeHistoricalData,
    };
  }, [storePlanes, storeSensors, storeMetrics, storeHistoricalData]);

  const [throttledData, setThrottledData] = useState(() => ({
    planes: storePlanes,
    sensors: storeSensors,
    metrics: storeMetrics,
    historicalData: storeHistoricalData,
    lastUpdated: Date.now(), // Pure because it only runs once on mount
  }));

  useEffect(() => {
    if (!isDashboardOpen) return;

    const syncData = () => {
      setThrottledData({
        ...latestRef.current,
        lastUpdated: Date.now(), // ✅ PURE: Allowed inside effects!
      });
    };

    syncData(); // Sync immediately on open
    const interval = setInterval(syncData, 300000); // 300,000ms = 5 minutes

    return () => clearInterval(interval);
  }, [isDashboardOpen]);

  const { planes, sensors, metrics, historicalData, lastUpdated } =
    throttledData;

  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("AIR_TRAFFIC");
  const [listFilter, setListFilter] = useState<ListFilter>("planes");

  const showDashboard = isDashboardOpen && !selectedEntityId;

  const planeStatuses = useMemo(() => {
    return (Object.keys(PLANE_STATUS_CONFIG) as PlaneStatus[])
      .map((status) => ({
        name: PLANE_STATUS_CONFIG[status].label,
        value: planes.filter((p) => p.status === status).length,
        color: PLANE_STATUS_CONFIG[status].color,
      }))
      .filter((d) => d.value > 0);
  }, [planes]);

  const { timeData, airlineData } = useMemo(() => {
    const airlineCounts = planes.reduce(
      (acc, p) => {
        if (!p.airline) return acc;
        acc[p.airline] = (acc[p.airline] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const airlineData = Object.keys(airlineCounts)
      .map((k) => ({ name: k, count: airlineCounts[k] }))
      .sort((a, b) => b.count - a.count);

    // Force exactly 20 data points so the chart canvas is always full
    const DATA_POINTS = 20;
    const data: TimeDataPoint[] = [];
    const activeGroundPlanes = planes.filter((p) =>
      ["LANDED", "TAXIING", "PARKED", "BOARDING", "PUSHBACK"].includes(
        p.status as string,
      ),
    ).length;

    const tempSensors = sensors.filter((s) => s.type.includes("TEMP"));
    const humSensors = sensors.filter((s) => s.type.includes("HUMIDITY"));
    const windSensors = sensors.filter((s) => s.type.includes("WIND"));
    const tiltSensors = sensors.filter((s) => s.type.includes("TILT"));
    const co2Sensors = sensors.filter((s) => s.type.includes("CO2"));

    const getAvg = (sensorGroup: typeof sensors, index: number) => {
      if (!sensorGroup.length) return 0;
      let sum = 0,
        count = 0;
      for (const s of sensorGroup) {
        const histArr = historicalData[s.id] || [];
        const histIndex = Math.floor((index / DATA_POINTS) * histArr.length);
        const h = histArr[histIndex] || histArr[histArr.length - 1];

        if (h) {
          sum += h.value;
          count++;
        } else {
          sum += s.currentValue;
          count++;
        } // Fallback to current live value if history is missing
      }
      return count ? sum / count : 0;
    };

    for (let i = 0; i < DATA_POINTS; i++) {
      const t = new Date(lastUpdated - (DATA_POINTS - 1 - i) * 60000);
      const timeLabel = t.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const noise = Math.sin(i) * 2;
      const baseSec = 5;
      const basePower = 200;

      data.push({
        time: timeLabel,
        temp: Number(getAvg(tempSensors, i).toFixed(1)),
        hum: Number(getAvg(humSensors, i).toFixed(1)),
        wind: Number(getAvg(windSensors, i).toFixed(1)),
        tilt: Number((getAvg(tiltSensors, i) * 1000).toFixed(2)),
        co2: Number(getAvg(co2Sensors, i).toFixed(0)),
        flights: Math.max(
          5,
          Math.floor(activeGroundPlanes * 1.2 + 15 + noise * 2.5),
        ),
        capacity: 50,
        taxiIn: Math.max(
          2,
          Math.floor(activeGroundPlanes * 0.4 + 8 + Math.cos(i) * 2),
        ),
        taxiOut: Math.max(
          2,
          Math.floor(activeGroundPlanes * 0.5 + 10 + noise * 1.5),
        ),
        secT1: Math.max(2, baseSec + activeGroundPlanes * 0.4 + noise),
        secT2: Math.max(
          2,
          baseSec - 1 + activeGroundPlanes * 0.35 + noise * 0.8,
        ),
        secT3: Math.max(
          2,
          baseSec - 2 + activeGroundPlanes * 0.25 + noise * 0.5,
        ),
        powerT1: basePower + activeGroundPlanes * 12 + noise * 10,
        powerT2: basePower - 20 + activeGroundPlanes * 10 + noise * 8,
        powerT3: basePower - 50 + activeGroundPlanes * 7 + noise * 6,
        gseFuel: Math.max(2, Math.floor(activeGroundPlanes * 0.3)),
        gseBag: Math.max(4, Math.floor(activeGroundPlanes * 0.8)),
      });
    }
    return { timeData: data, airlineData };
  }, [sensors, planes, historicalData, lastUpdated]);

  const latestData = timeData[timeData.length - 1] || {
    secT1: 18,
    secT2: 4,
    gseFuel: 14,
    gseBag: 42,
  };

  return (
    <>
      {/* --- LEFT PANEL: System Overview & Snapshots --- */}
      <BentoPanel
        direction="left"
        isOpen={showDashboard}
        className="absolute top-20 left-6 w-[380px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
      >
        <BentoBox
          className={`${boxClass} flex justify-between items-center py-3 shrink-0 sticky top-0 z-50`}
        >
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboard size={16} className="text-[#1e3a8a]" /> Control
            Ledger
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("standard")}
              className={`px-3 py-1.5 text-[10px] rounded-md font-bold transition-all uppercase tracking-widest ${viewMode === "standard" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
            >
              Roster
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`px-3 py-1.5 text-[10px] rounded-md font-bold transition-all uppercase tracking-widest ${viewMode === "analytics" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
            >
              Analytics
            </button>
          </div>
        </BentoBox>

        <BriefingCard
          title="Terminal Overview"
          tag="OPS-01"
          icon={FileText}
          footerText="LIVE SNAPSHOT"
          theme="slate"
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                Active Flights
              </div>
              <div className="text-4xl font-black text-gray-800 tracking-tighter">
                {metrics.activeFlights}
              </div>
            </div>
            <Sparkline data={timeData.map((d) => d.flights)} color="#3b82f6" />
          </div>
          <div className="h-px bg-gray-200 border-b border-dashed border-gray-300 w-full my-4" />
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                System Alerts
              </div>
              <div className="text-3xl font-black text-red-600 tracking-tighter">
                {metrics.alertCount}
              </div>
            </div>
            <Sparkline
              data={[0, 1, 0, 3, 2, 4, metrics.alertCount]}
              color="#ef4444"
            />
          </div>
        </BriefingCard>

        <BriefingCard
          title="Security Throughput"
          tag="SEC-04"
          icon={ShieldAlert}
          footerText="SLA MONITORED"
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  T1 Domestic Wait
                </span>
                <span className="text-xs font-black text-red-600 font-mono">
                  {Math.round(latestData.secT1)} MIN
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.min((latestData.secT1 / 30) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  T2 Int&apos;l Wait
                </span>
                <span className="text-xs font-black text-emerald-600 font-mono">
                  {Math.round(latestData.secT2)} MIN
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.min((latestData.secT2 / 30) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </BriefingCard>

        <BriefingCard
          title="GSE Fleet Allocation"
          tag="LOG-12"
          icon={Truck}
          footerText="DISPATCHED"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center border-r border-dashed border-gray-300">
              <div className="text-2xl font-black text-gray-800 font-mono tracking-tighter">
                {latestData.gseFuel}
                <span className="text-xs text-gray-400">/20</span>
              </div>
              <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1">
                Fuel Trucks
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-gray-800 font-mono tracking-tighter">
                {latestData.gseBag}
                <span className="text-xs text-gray-400">/45</span>
              </div>
              <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1">
                Baggage Tugs
              </div>
            </div>
          </div>
        </BriefingCard>

        <div className="grid grid-cols-2 gap-4 shrink-0">
          <BriefingCard
            title="Fleet Profile"
            tag="PIE"
            icon={PlaneIcon}
            footerText="RATIO"
          >
            <div className="h-20 w-full relative -ml-4" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
                debounce={50}
              >
                <PieChart>
                  <Pie
                    data={planeStatuses}
                    innerRadius={20}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {planeStatuses.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: "10px",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </BriefingCard>

          <BriefingCard
            title="Sensor Health"
            tag="PIE"
            icon={Activity}
            footerText="RATIO"
          >
            <div className="h-20 w-full relative -ml-4" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
                debounce={50}
              >
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Active",
                        value: sensors.filter((s) => s.status === "ACTIVE")
                          .length,
                        color: "#10b981",
                      },
                      {
                        name: "Critical",
                        value: sensors.filter((s) => s.status !== "ACTIVE")
                          .length,
                        color: "#ef4444",
                      },
                    ]}
                    innerRadius={20}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {[{ color: "#10b981" }, { color: "#ef4444" }].map(
                      (e, i) => (
                        <Cell key={i} fill={e.color} />
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: "10px",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </BriefingCard>
        </div>
      </BentoPanel>

      {/* --- RIGHT PANEL: Standard View (Live Directory) --- */}
      {/* ✅ FIXED WIDTH: w-[420px] */}
      {viewMode === "standard" && (
        <BentoPanel
          direction="right"
          isOpen={showDashboard}
          className="absolute top-20 right-6 w-[420px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
          delay={0.1}
        >
          <BentoBox
            className={`${boxClass} py-3 px-4 flex justify-between items-center shrink-0 sticky top-0 z-50`}
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ListFilter size={16} className="text-[#1e3a8a]" /> Master
              Directory
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setListFilter("planes")}
                className={`px-4 py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-widest ${listFilter === "planes" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
              >
                Planes
              </button>
              <button
                onClick={() => setListFilter("sensors")}
                className={`px-4 py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-widest ${listFilter === "sensors" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
              >
                Sensors
              </button>
            </div>
          </BentoBox>

          {listFilter === "planes" && (
            <BriefingCard
              title="Flight Roster"
              tag="MANIFEST"
              icon={PlaneIcon}
              footerText="LIVE TRACKING"
            >
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar min-w-0 max-h-[600px] -mx-5 -my-4">
                <Table>
                  <TableHeader className="bg-[#fafafa] sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500">
                        Flight / Airline
                      </TableHead>
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500">
                        Route
                      </TableHead>
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500">
                        Status
                      </TableHead>
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500 text-right">
                        Telemetry
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planes.map((p) => {
                      const isAnomalous = [
                        "DELAYED",
                        "CRITICAL",
                        "CANCELLED",
                        "DIVERTED",
                      ].includes(String(p.status).toUpperCase());
                      const isSuccess = [
                        "LANDED",
                        "DEPARTED",
                        "ACTIVE",
                      ].includes(String(p.status).toUpperCase());
                      const stampType = isAnomalous
                        ? "danger"
                        : isSuccess
                          ? "success"
                          : "info";

                      return (
                        <TableRow
                          key={p.id}
                          onClick={() =>
                            useAirportStore
                              .getState()
                              .selectEntity(p.id, "plane")
                          }
                          className="cursor-pointer bg-white hover:bg-gray-50 border-b border-dashed border-gray-200 transition-colors"
                        >
                          <TableCell className="py-3">
                            <span className="font-black text-gray-800 font-mono text-xs block">
                              {p.callsign}
                            </span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                              {p.airline}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-700 font-mono font-bold">
                              <span>{p.origin}</span>
                              <Navigation
                                size={10}
                                className="rotate-90 opacity-40 text-[#1e3a8a]"
                              />
                              <span>{p.destination}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <RubberStamp
                              text={String(p.status)}
                              type={stampType}
                            />
                          </TableCell>
                          <TableCell className="py-3 text-[10px] font-mono text-right text-gray-500">
                            <div className="block font-black text-[#1e3a8a] text-xs">
                              {p.speed > 0
                                ? `${Math.floor(p.speed)} KTS`
                                : `GATE ${p.parkingStand?.code || p.gate || "TBA"}`}
                            </div>
                            {p.altitude > 0 && (
                              <div className="text-[9px] text-gray-400 font-bold tracking-widest">
                                {Math.floor(p.altitude)} FT
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </BriefingCard>
          )}

          {listFilter === "sensors" && (
            <BriefingCard
              title="Hardware Roster"
              tag="INVENTORY"
              icon={Activity}
              footerText="LIVE POLLING"
            >
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar min-w-0 max-h-[600px] -mx-5 -my-4">
                <Table>
                  <TableHeader className="bg-[#fafafa] sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500">
                        Sensor Matrix
                      </TableHead>
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500">
                        Location
                      </TableHead>
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500">
                        Health
                      </TableHead>
                      <TableHead className="text-[9px] py-3 font-bold uppercase tracking-widest text-gray-500 text-right">
                        Reading
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensors.map((s) => {
                      const isAnomalous = [
                        "WARNING",
                        "CRITICAL",
                        "OFFLINE",
                      ].includes(String(s.status).toUpperCase());
                      const stampType =
                        String(s.status).toUpperCase() === "CRITICAL"
                          ? "danger"
                          : String(s.status).toUpperCase() === "WARNING"
                            ? "warning"
                            : "success";

                      return (
                        <TableRow
                          key={s.id}
                          onClick={() =>
                            useAirportStore
                              .getState()
                              .selectEntity(s.id, "sensor")
                          }
                          className="cursor-pointer bg-white hover:bg-gray-50 border-b border-dashed border-gray-200 transition-colors"
                        >
                          <TableCell className="py-3">
                            <span className="font-black text-gray-800 text-xs block truncate max-w-[120px] tracking-tight">
                              {s.name}
                            </span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                              {s.type.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-[10px] text-gray-600 font-bold uppercase tracking-widest truncate max-w-[100px]">
                            {typeof s.zone === "string"
                              ? s.zone
                              : s.zone?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="py-3">
                            <RubberStamp
                              text={String(s.status)}
                              type={stampType}
                            />
                          </TableCell>
                          <TableCell className="py-3 text-[10px] font-mono text-right text-gray-500">
                            <span className="font-black text-[#1e3a8a] text-sm">
                              {s.currentValue}
                            </span>{" "}
                            <span className="text-[9px] text-gray-400 font-bold">
                              {s.unit}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </BriefingCard>
          )}
        </BentoPanel>
      )}

      {/* --- RIGHT PANEL: Analytics View (Tabbed Charts) --- */}
      {/* ✅ FIXED WIDTH: w-[540px] (Provides extra room for grid-cols-2) */}
      {viewMode === "analytics" && (
        <BentoPanel
          direction="right"
          isOpen={showDashboard}
          className="absolute top-20 right-6 w-[540px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
          delay={0.1}
        >
          <BentoBox
            className={`${boxClass} py-3 px-4 flex justify-between items-center shrink-0 sticky top-0 z-50`}
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#1e3a8a]" /> Analytics
              Addendum
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setAnalyticsTab("AIR_TRAFFIC")}
                className={`px-4 py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-widest ${analyticsTab === "AIR_TRAFFIC" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
              >
                Air Traffic
              </button>
              <button
                onClick={() => setAnalyticsTab("GROUND_OPS")}
                className={`px-4 py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-widest ${analyticsTab === "GROUND_OPS" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
              >
                Ground Ops
              </button>
              <button
                onClick={() => setAnalyticsTab("ENVIRONMENT")}
                className={`px-4 py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-widest ${analyticsTab === "ENVIRONMENT" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
              >
                Environment
              </button>
            </div>
          </BentoBox>

          <div className="grid grid-cols-2 gap-4">
            {/* --- TAB 1: AIR TRAFFIC --- */}
            {analyticsTab === "AIR_TRAFFIC" && (
              <>
                <div className="col-span-2">
                  <BriefingCard
                    title="Traffic vs Runway Capacity"
                    tag="CHART-01"
                    icon={Activity}
                    footerText="EVALUATED"
                    theme="blue"
                  >
                    <div
                      className="h-48 w-full relative -ml-3"
                      data-cursor="crosshair"
                    >
                      <ResponsiveContainer
                        minWidth={0}
                        minHeight={0}
                        width="100%"
                        height="100%"
                        debounce={50}
                      >
                        <ComposedChart data={timeData} margin={{ left: -25 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
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
                          <Legend
                            iconSize={8}
                            wrapperStyle={{ fontSize: "10px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "10px",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <ReferenceLine
                            y={50}
                            stroke="red"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "Capacity",
                              fill: "red",
                              fontSize: 9,
                            }}
                          />
                          <Bar
                            dataKey="flights"
                            fill="#93c5fd"
                            radius={[4, 4, 0, 0]}
                            name="Active Flights"
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="capacity"
                            stroke="#1e3a8a"
                            strokeWidth={3}
                            name="Scheduled"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </BriefingCard>
                </div>

                <BriefingCard
                  title="Fleet by Operator"
                  tag="CHART-02"
                  icon={PlaneIcon}
                  footerText="EVALUATED"
                >
                  <div
                    className="h-48 w-full relative -ml-3"
                    data-cursor="crosshair"
                  >
                    <ResponsiveContainer
                      minWidth={0}
                      minHeight={0}
                      width="100%"
                      height="100%"
                      debounce={50}
                    >
                      <ComposedChart
                        data={airlineData.slice(0, 5)}
                        margin={{ left: -25, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis
                          tick={{ fontSize: 9 }}
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
                          cursor={{ fill: "rgba(0,0,0,0.05)" }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#1e3a8a"
                          radius={[4, 4, 0, 0]}
                          name="Active Aircraft"
                          isAnimationActive={false}
                        >
                          {airlineData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index % 2 === 0 ? "#1e3a8a" : "#3b82f6"}
                            />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </BriefingCard>

                <BriefingCard
                  title="Average Taxi Times"
                  tag="CHART-03"
                  icon={Clock}
                  footerText="EVALUATED"
                >
                  <div
                    className="h-48 w-full relative -ml-3"
                    data-cursor="crosshair"
                  >
                    <ResponsiveContainer
                      minWidth={0}
                      minHeight={0}
                      width="100%"
                      height="100%"
                      debounce={50}
                    >
                      <ComposedChart data={timeData} margin={{ left: -25 }}>
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
                        <Legend
                          iconSize={8}
                          wrapperStyle={{ fontSize: "10px" }}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: "10px",
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="taxiIn"
                          stackId="a"
                          fill="#1e3a8a"
                          name="Taxi-In (Arrival)"
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="taxiOut"
                          stackId="a"
                          fill="#93c5fd"
                          radius={[4, 4, 0, 0]}
                          name="Taxi-Out (Depart)"
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </BriefingCard>
              </>
            )}

            {/* --- TAB 2: GROUND OPS --- */}
            {analyticsTab === "GROUND_OPS" && (
              <>
                <div className="col-span-2">
                  <BriefingCard
                    title="Security Queue Times"
                    tag="CHART-04"
                    icon={ShieldAlert}
                    footerText="EVALUATED"
                    theme="blue"
                  >
                    <div
                      className="h-48 w-full relative -ml-3"
                      data-cursor="crosshair"
                    >
                      <ResponsiveContainer
                        minWidth={0}
                        minHeight={0}
                        width="100%"
                        height="100%"
                        debounce={50}
                      >
                        <LineChart data={timeData} margin={{ left: -25 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
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
                          <Legend
                            iconSize={8}
                            wrapperStyle={{ fontSize: "10px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "10px",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <ReferenceLine
                            y={20}
                            stroke="red"
                            strokeDasharray="3 3"
                            label={{
                              position: "insideTopLeft",
                              value: "SLA Limit",
                              fill: "red",
                              fontSize: 9,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="secT1"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="T1"
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="secT2"
                            stroke="#22c55e"
                            strokeWidth={2}
                            name="T2"
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="secT3"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="T3"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </BriefingCard>
                </div>

                <BriefingCard
                  title="GSE Active Deployment"
                  tag="CHART-05"
                  icon={Truck}
                  footerText="EVALUATED"
                >
                  <div className="h-48 w-full relative -ml-3">
                    <ResponsiveContainer
                      minWidth={0}
                      minHeight={0}
                      width="100%"
                      height="100%"
                      debounce={50}
                    >
                      <ComposedChart data={timeData} margin={{ left: -25 }}>
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
                        <Legend
                          iconSize={8}
                          wrapperStyle={{ fontSize: "10px" }}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: "10px",
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="gseFuel"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          name="Fuel Trucks"
                          stackId="gse"
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="gseBag"
                          fill="#9ca3af"
                          radius={[4, 4, 0, 0]}
                          name="Baggage Tugs"
                          stackId="gse"
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </BriefingCard>

                <BriefingCard
                  title="Grid Power Load (kWh)"
                  tag="CHART-06"
                  icon={Zap}
                  footerText="EVALUATED"
                >
                  <div
                    className="h-48 w-full relative -ml-3"
                    data-cursor="crosshair"
                  >
                    <ResponsiveContainer
                      minWidth={0}
                      minHeight={0}
                      width="100%"
                      height="100%"
                      debounce={50}
                    >
                      <AreaChart data={timeData} margin={{ left: -25 }}>
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
                        <Legend
                          iconSize={8}
                          wrapperStyle={{ fontSize: "10px" }}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: "10px",
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="powerT1"
                          stackId="1"
                          stroke="#d97706"
                          fill="#f59e0b"
                          name="T1"
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="powerT2"
                          stackId="1"
                          stroke="#b45309"
                          fill="#fbbf24"
                          name="T2"
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="powerT3"
                          stackId="1"
                          stroke="#92400e"
                          fill="#fcd34d"
                          name="T3"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </BriefingCard>
              </>
            )}

            {/* --- TAB 3: ENVIRONMENT --- */}
            {analyticsTab === "ENVIRONMENT" && (
              <>
                <div className="col-span-2">
                  <BriefingCard
                    title="Humidity vs Temp"
                    tag="CHART-07"
                    icon={ThermometerSun}
                    footerText="EVALUATED"
                    theme="emerald"
                  >
                    <div
                      className="h-48 w-full relative -ml-3"
                      data-cursor="crosshair"
                    >
                      <ResponsiveContainer
                        minWidth={0}
                        minHeight={0}
                        width="100%"
                        height="100%"
                        debounce={50}
                      >
                        <ComposedChart data={timeData} margin={{ left: -25 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                          />
                          <Legend
                            iconSize={8}
                            wrapperStyle={{ fontSize: "10px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "10px",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="hum"
                            fill="#93c5fd"
                            radius={[2, 2, 0, 0]}
                            name="Humidity (%)"
                            isAnimationActive={false}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="temp"
                            stroke="#ef4444"
                            strokeWidth={3}
                            name="Temp (°C)"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </BriefingCard>
                </div>

                <div className="col-span-2">
                  <BriefingCard
                    title="Wind vs Struct Tilt"
                    tag="CHART-08"
                    icon={Wind}
                    footerText="EVALUATED"
                  >
                    <div
                      className="h-48 w-full relative -ml-3"
                      data-cursor="crosshair"
                    >
                      <ResponsiveContainer
                        minWidth={0}
                        minHeight={0}
                        width="100%"
                        height="100%"
                        debounce={50}
                      >
                        <ComposedChart data={timeData} margin={{ left: -25 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                          />
                          <Legend
                            iconSize={8}
                            wrapperStyle={{ fontSize: "10px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "10px",
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="wind"
                            fill="#ccfbf1"
                            stroke="#14b8a6"
                            name="Wind (m/s)"
                            isAnimationActive={false}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="tilt"
                            stroke="#6366f1"
                            strokeWidth={3}
                            name="Deflection (x1000)"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </BriefingCard>
                </div>
              </>
            )}
          </div>
        </BentoPanel>
      )}
    </>
  );
}
