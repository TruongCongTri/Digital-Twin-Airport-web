"use client";
import { useMemo, useState } from "react";
import { BentoPanel, BentoBox } from "@/src/components/panels/BentoPanel";
import { useAirportStore } from "@/src/store/airport-store";
import {
  LayoutDashboard,
  BarChart3,
  Filter,
  Play,
  ShieldAlert,
  Truck,
  ListFilter,
  Navigation,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  PLANE_STATUS_CONFIG,
  SENSOR_STATUS_CONFIG,
} from "@/src/lib/status-config";
import { PlaneStatus } from "@/types";

type ViewMode = "standard" | "analytics";
type AnalyticsFilter = "ALL" | "PLANES" | "SENSORS";
type ListFilter = "planes" | "sensors";

const boxClass =
  "bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-sm p-4 pointer-events-auto min-w-0 overflow-hidden";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-20 opacity-80 relative" data-cursor="crosshair">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
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
  const metrics = useAirportStore((state) => state.metrics);
  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);

  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [analyticsFilter, setAnalyticsFilter] =
    useState<AnalyticsFilter>("ALL");
  const [listFilter, setListFilter] = useState<ListFilter>("planes");

  const showDashboard = isDashboardOpen && !selectedEntityId;

  // UPDATED: Now uses strict Uppercase Enums matching PlaneStatus
  const planeStatuses = (Object.keys(PLANE_STATUS_CONFIG) as PlaneStatus[])
    .map((status) => ({
      name: PLANE_STATUS_CONFIG[status].label,
      value: planes.filter((p) => p.status === status).length,
      color: PLANE_STATUS_CONFIG[status].color,
    }))
    .filter((d) => d.value > 0);

  const mixedData = [
    { time: "08:00", volume: 45, load: 30 },
    { time: "10:00", volume: 70, load: 45 },
    { time: "12:00", volume: 90, load: 60 },
    { time: "14:00", volume: 85, load: 80 },
  ];

  const sensorStatusData = [
    {
      name: "Active",
      value: sensors.filter((s) => s.status === "ACTIVE").length,
      color: SENSOR_STATUS_CONFIG["ACTIVE"].color,
    },
    {
      name: "Critical",
      value: sensors.filter((s) => s.status === "CRITICAL").length,
      color: SENSOR_STATUS_CONFIG["CRITICAL"].color,
    },
    {
      name: "Warning",
      value: sensors.filter((s) => s.status === "WARNING").length,
      color: SENSOR_STATUS_CONFIG["WARNING"].color,
    },
    {
      name: "Other",
      value: sensors.filter(
        (s) => !["ACTIVE", "CRITICAL", "WARNING"].includes(s.status),
      ).length,
      color: "#9ca3af",
    },
  ].filter((d) => d.value > 0);

  const hourlyMetrics = [
    {
      time: "04:00",
      flights: 12,
      capacity: 50,
      co2: 410,
      temp: 21,
      taxiIn: 10,
      taxiOut: 12,
      powerT1: 250,
      powerT2: 200,
      secT1: 2,
      secT2: 1,
      gseFuel: 4,
      gseBag: 10,
    },
    {
      time: "08:00",
      flights: 48,
      capacity: 50,
      co2: 520,
      temp: 23,
      taxiIn: 18,
      taxiOut: 22,
      powerT1: 450,
      powerT2: 410,
      secT1: 18,
      secT2: 12,
      gseFuel: 14,
      gseBag: 38,
    },
    {
      time: "12:00",
      flights: 65,
      capacity: 50,
      co2: 680,
      temp: 26,
      taxiIn: 24,
      taxiOut: 26,
      powerT1: 580,
      powerT2: 520,
      secT1: 25,
      secT2: 20,
      gseFuel: 18,
      gseBag: 42,
    },
    {
      time: "16:00",
      flights: 55,
      capacity: 50,
      co2: 610,
      temp: 27,
      taxiIn: 20,
      taxiOut: 21,
      powerT1: 540,
      powerT2: 490,
      secT1: 20,
      secT2: 15,
      gseFuel: 16,
      gseBag: 40,
    },
    {
      time: "20:00",
      flights: 35,
      capacity: 50,
      co2: 490,
      temp: 24,
      taxiIn: 15,
      taxiOut: 16,
      powerT1: 420,
      powerT2: 380,
      secT1: 10,
      secT2: 8,
      gseFuel: 10,
      gseBag: 25,
    },
    {
      time: "00:00",
      flights: 18,
      capacity: 50,
      co2: 430,
      temp: 22,
      taxiIn: 11,
      taxiOut: 10,
      powerT1: 300,
      powerT2: 250,
      secT1: 4,
      secT2: 2,
      gseFuel: 5,
      gseBag: 12,
    },
  ];

  const analyticsFilters: AnalyticsFilter[] = ["ALL", "PLANES", "SENSORS"];

  const memoizedAnalyticsGrid = useMemo(
    () => (
      <div className="grid grid-cols-2 gap-4">
        {(analyticsFilter === "ALL" || analyticsFilter === "PLANES") && (
          <BentoBox className={boxClass}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Traffic vs Runway Capacity
            </h3>
            <div className="h-48 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <ComposedChart data={hourlyMetrics} margin={{ left: -25 }}>
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
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
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
          </BentoBox>
        )}

        {(analyticsFilter === "ALL" || analyticsFilter === "SENSORS") && (
          <BentoBox className={boxClass}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Terminal Environment (CO2 vs Temp)
            </h3>
            <div className="h-48 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <ComposedChart data={hourlyMetrics} margin={{ left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                    domain={[300, 800]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[18, 30]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="co2"
                    fill="#fcd34d"
                    radius={[4, 4, 0, 0]}
                    name="CO2 (ppm)"
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
          </BentoBox>
        )}

        {(analyticsFilter === "ALL" || analyticsFilter === "PLANES") && (
          <BentoBox className={boxClass}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Average Taxi Times (Mins)
            </h3>
            <div className="h-48 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <ComposedChart data={hourlyMetrics} margin={{ left: -25 }}>
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
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
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
          </BentoBox>
        )}

        {analyticsFilter === "ALL" && (
          <BentoBox className={boxClass}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Security Checkpoint Queue Times
            </h3>
            <div className="h-48 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <LineChart data={hourlyMetrics} margin={{ left: -25 }}>
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
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
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
                    strokeWidth={3}
                    name="T1 Domestic"
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="secT2"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="T2 International"
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </BentoBox>
        )}

        {(analyticsFilter === "ALL" || analyticsFilter === "SENSORS") && (
          <BentoBox className={boxClass}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Grid Power Load (kWh)
            </h3>
            <div className="h-48 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <AreaChart data={hourlyMetrics} margin={{ left: -25 }}>
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
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="powerT1"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#fcd34d"
                    name="Terminal 1"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="powerT2"
                    stackId="1"
                    stroke="#d97706"
                    fill="#f59e0b"
                    name="Terminal 2"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </BentoBox>
        )}

        {(analyticsFilter === "ALL" || analyticsFilter === "PLANES") && (
          <BentoBox className={boxClass}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              GSE Active Deployment
            </h3>
            <div className="h-48 w-full relative">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <ComposedChart data={hourlyMetrics} margin={{ left: -25 }}>
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
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
                  <Bar
                    dataKey="gseFuel"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Fuel Trucks"
                    barSize={15}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="gseBag"
                    fill="#9ca3af"
                    radius={[4, 4, 0, 0]}
                    name="Baggage Tugs"
                    barSize={15}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </BentoBox>
        )}
      </div>
    ),
    [analyticsFilter],
  );

  return (
    <>
      <BentoPanel
        direction="left"
        isOpen={showDashboard}
        className="absolute top-20 left-6 w-80 z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
      >
        {/* system overview */}
        <BentoBox
          className={`${boxClass} flex justify-between items-center py-3 shrink-0`}
        >
          <h2 className="text-sm font-bold text-gray-800">System Overview</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("standard")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "standard" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
            >
              <LayoutDashboard size={14} />
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "analytics" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-400"}`}
            >
              <BarChart3 size={14} />
            </button>
          </div>
        </BentoBox>

        {/* active flights */}
        <BentoBox
          className={`${boxClass} flex justify-between items-center bg-blue-50/50 shrink-0`}
        >
          <div>
            <div className="text-[10px] text-blue-500 font-bold uppercase mb-1">
              Active Flights
            </div>
            <div
              className="text-3xl font-bold text-blue-900 transition-transform duration-300 ease-out hover:scale-[1.3] origin-left relative z-50 cursor-none"
              data-cursor="lens"
            >
              {metrics.activeFlights}
            </div>
          </div>
          <Sparkline data={[12, 14, 15, 13, 18, 22, 21]} color="#3b82f6" />
        </BentoBox>

        {/* total alerts */}
        <BentoBox
          className={`${boxClass} flex justify-between items-center bg-red-50/50 shrink-0`}
        >
          <div>
            <div className="text-[10px] text-red-500 font-bold uppercase mb-1">
              Total Alerts
            </div>
            <div className="text-3xl font-bold text-red-900">
              {metrics.alertCount}
            </div>
          </div>
          <Sparkline
            data={[0, 1, 0, 3, 2, 4, metrics.alertCount]}
            color="#ef4444"
          />
        </BentoBox>

        {/* Security Checkpoint Status */}
        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <ShieldAlert size={12} /> Security Throughput
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">T1 Domestic (Wait)</span>
              <span className="text-xs font-bold text-red-600">18 mins</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full w-[85%]" />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-600">
                T2 Int&apos;l (Wait)
              </span>
              <span className="text-xs font-bold text-green-600">4 mins</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full w-[30%]" />
            </div>
          </div>
        </BentoBox>

        {/* Ground Support Equipment */}
        <BentoBox className={`${boxClass} shrink-0`}>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Truck size={12} /> GSE Fleet Allocation
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-800">14/20</div>
              <div className="text-[9px] text-gray-500 uppercase">
                Fuel Trucks
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-800">42/45</div>
              <div className="text-[9px] text-gray-500 uppercase">
                Baggage Tugs
              </div>
            </div>
          </div>
        </BentoBox>

        <div className="grid grid-cols-2 gap-4 shrink-0">
          <BentoBox className={`${boxClass} flex flex-col items-center`}>
            <span className="text-[9px] uppercase font-bold text-gray-400 mb-1">
              Fleet Status
            </span>
            <div className="h-20 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
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
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </BentoBox>
          <BentoBox className={`${boxClass} flex flex-col items-center`}>
            <span className="text-[9px] uppercase font-bold text-gray-400 mb-1">
              Sensor Health
            </span>
            <div className="h-20 w-full relative" data-cursor="crosshair">
              <ResponsiveContainer
                minWidth={0}
                minHeight={0}
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Normal",
                        value: sensors.filter((s) => s.status === "ACTIVE")
                          .length,
                        color: "#22c55e",
                      },
                      {
                        name: "Critical",
                        // UPDATED: Strict Enums
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
                    {[{ color: "#22c55e" }, { color: "#ef4444" }].map(
                      (e, i) => (
                        <Cell key={i} fill={e.color} />
                      ),
                    )}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </BentoBox>
        </div>
      </BentoPanel>

      {viewMode === "standard" && (
        <BentoPanel
          direction="right"
          isOpen={showDashboard}
          className="absolute top-20 right-6 left-[360px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
          delay={0.1}
        >
          {/* UPDATED: Split Live Directory into Header and Condensed Tables */}

          {/* 1. Header Controls Box */}
          <BentoBox
            className={`${boxClass} py-3 px-4 flex justify-between items-center shrink-0`}
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ListFilter size={16} className="text-[#1e3a8a]" /> Live Directory
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setListFilter("planes")}
                className={`text-[10px] px-3 py-1.5 rounded-md font-bold transition-all ${listFilter === "planes" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-500 hover:text-gray-700"}`}
              >
                Planes
              </button>
              <button
                onClick={() => setListFilter("sensors")}
                className={`text-[10px] px-3 py-1.5 rounded-md font-bold transition-all ${listFilter === "sensors" ? "bg-white shadow-sm text-[#1e3a8a]" : "text-gray-500 hover:text-gray-700"}`}
              >
                Sensors
              </button>
            </div>
          </BentoBox>

          {/* Planes Condensed Table Box */}
          {listFilter === "planes" && (
            <BentoBox
              className={`${boxClass} p-0 overflow-hidden shrink-0 max-h-[400px] flex flex-col shadow-inner`}
            >
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar bg-gray-50 min-w-0">
                <Table>
                  <TableHeader className="bg-gray-100 sticky top-0 z-10">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500">
                        Flight / Airline
                      </TableHead>
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500">
                        Route
                      </TableHead>
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500 text-right">
                        Telemetry
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planes.map((p) => (
                      <TableRow
                        key={p.id}
                        onClick={() =>
                          useAirportStore.getState().selectEntity(p.id, "plane")
                        }
                        className="cursor-pointer bg-white hover:bg-blue-50 border-b border-gray-100 transition-colors"
                      >
                        <TableCell className="py-2">
                          <span className="font-bold text-[#1e3a8a] block">
                            {p.callsign}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase">
                            {p.airline}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                            <span>{p.origin}</span>
                            <Navigation
                              size={8}
                              className="rotate-90 opacity-50"
                            />
                            <span>{p.destination}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] h-5 px-1.5 font-bold border-gray-200 text-gray-600"
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-[10px] font-mono text-right text-gray-500">
                          <div className="block font-bold text-gray-700">
                            {p.speed > 0
                              ? `${Math.floor(p.speed)} kts`
                              : p.parkingStand?.code || p.gate || "GATE"}
                          </div>
                          {p.altitude > 0 && (
                            <div className="text-[9px] text-gray-400">
                              {Math.floor(p.altitude)} ft
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </BentoBox>
          )}

          {/* Sensors Condensed Table Box */}
          {listFilter === "sensors" && (
            <BentoBox
              className={`${boxClass} p-0 overflow-hidden shrink-0 max-h-[400px] flex flex-col shadow-inner`}
            >
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar bg-gray-50 min-w-0">
                <Table>
                  <TableHeader className="bg-gray-100 sticky top-0 z-10">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500">
                        Sensor Matrix
                      </TableHead>
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500">
                        Location
                      </TableHead>
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500">
                        Health
                      </TableHead>
                      <TableHead className="text-[10px] py-1.5 h-auto font-bold uppercase text-gray-500 text-right">
                        Reading
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensors.map((s) => (
                      <TableRow
                        key={s.id}
                        onClick={() =>
                          useAirportStore
                            .getState()
                            .selectEntity(s.id, "sensor")
                        }
                        className="cursor-pointer bg-white hover:bg-blue-50 border-b border-gray-100 transition-colors"
                      >
                        <TableCell className="py-2">
                          <span className="font-bold text-gray-800 block truncate max-w-[100px]">
                            {s.name}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase">
                            {s.type.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-[10px] text-gray-600 truncate max-w-[90px]">
                          {typeof s.zone === "string"
                            ? s.zone
                            : s.zone?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-2 h-2 rounded-full shadow-sm ${s.status === "ACTIVE" ? "bg-green-500" : s.status === "WARNING" ? "bg-yellow-500" : "bg-red-500 animate-pulse"}`}
                            />
                            <span className="text-[9px] uppercase font-bold text-gray-500">
                              {s.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-[10px] font-mono text-right text-gray-500">
                          <span className="font-bold text-gray-700 text-xs">
                            {s.currentValue}
                          </span>{" "}
                          <span className="text-[9px]">{s.unit}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </BentoBox>
          )}
        </BentoPanel>
      )}

      {viewMode === "analytics" && (
        <BentoPanel
          direction="right"
          isOpen={showDashboard}
          className="absolute top-20 right-6 left-[360px] z-30 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-4 pr-2 pointer-events-auto"
          delay={0.1}
        >
          <BentoBox
            className={`${boxClass} flex justify-between items-center py-3 shrink-0 sticky top-0 z-10`}
          >
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Filter size={18} className="text-[#1e3a8a]" /> Global Metrics
              Grid
            </h2>
            <div className="flex gap-2">
              {analyticsFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => setAnalyticsFilter(f)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${analyticsFilter === f ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-gray-500 hover:bg-gray-50 shadow-sm"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </BentoBox>

          {memoizedAnalyticsGrid}
        </BentoPanel>
      )}
    </>
  );
}
