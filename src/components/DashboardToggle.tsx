"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  X,
  Plane,
  Play,
  StopCircle,
  AlertOctagon,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAirportStore } from "../store/airport-store";
import { DirectoryDropdown } from "./DirectoryDropdown";
import { toast } from "sonner";
import {
  startSimulation,
  stopSimulation,
  startScenario,
} from "../lib/api-client";
import { Scenario } from "@/types";

const DEMO_SCENARIOS = [
  "TROPICAL_SQUALL",
  "TARMAC_OVERHEAT",
  "AC_FAILURE",
] as const;

export function DashboardToggle() {
  const {
    isDashboardOpen,
    toggleDashboard,
    selectedEntityId,
    clearSelection,
    metrics,
  } = useAirportStore();

  const simulationMode = useAirportStore((state) => state.simulationMode);
  const setSimulationMode = useAirportStore((state) => state.setSimulationMode);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStop = async () => {
    if (simulationMode === "NONE") return;
    const tId = toast.loading("Halting simulation engine...");
    try {
      await stopSimulation();
      setSimulationMode("NONE");
      toast.success("Simulation Stopped", { id: tId });
    } catch (e) {
      toast.error("Failed to halt simulation", { id: tId });
    }
  };

  const handleLive = async () => {
    if (simulationMode === "GENERAL") return;
    const tId = toast.loading("Igniting simulation engine...");
    try {
      await startSimulation();
      setSimulationMode("GENERAL");
      toast.success("General Simulation Active", {
        id: tId,
        description: "Standard traffic routing applied.",
      });
    } catch (e) {
      toast.error("Ignition failed", { id: tId });
    }
  };

  const handleFireScenario = async (scenario: Scenario) => {
    const tId = toast.loading(`Injecting ${formatScenarioName(scenario)}...`);
    try {
      await startScenario(scenario);
      setSimulationMode(scenario);
      setIsMenuOpen(false);
      toast.success("Scenario Active!", {
        id: tId,
        description: "Monitoring system anomalies.",
      });
    } catch (e) {
      toast.error("Scenario injection failed", { id: tId });
    }
  };

  const formatScenarioName = (name: string) =>
    name.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Determine button color based on current mode
  const getSimBtnClass = () => {
    if (simulationMode === "NONE")
      return "bg-gray-100 text-green-600 hover:bg-green-50";
    if (simulationMode === "GENERAL")
      return "bg-green-500 text-white shadow-md animate-pulse";
    return "bg-red-500 text-white shadow-md animate-pulse"; // Scenario active
  };

  const isScenarioActive =
    simulationMode !== "NONE" && simulationMode !== "GENERAL";

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
      {/* 1. Floating Map Reset Button (On Top) */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          clearSelection(); // Closes any open panels
          window.dispatchEvent(new CustomEvent("reset-map-view")); // Tells the map to fly home
        }}
        className="pointer-events-auto bg-white/90 backdrop-blur-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-white text-xs font-bold px-4 py-2 rounded-full shadow-sm flex items-center gap-2 transition-colors"
      >
        <Plane size={14} className="text-[#1e3a8a]" />
        Long Thanh · Digital Twin
      </motion.button>
      {/* 2. Main Control Bar */}
      <div className="flex items-center gap-3 pointer-events-none">
        {/* 1. Alerts Badge */}
        {metrics.alertCount > 0 && !isDashboardOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            {metrics.alertCount} Alert{metrics.alertCount > 1 ? "s" : ""}
          </motion.div>
        )}
        {/* 2. Directory Dropdown */}
        <div className="pointer-events-auto shrink-0 flex items-center shadow-lg rounded-2xl">
          <DirectoryDropdown />
        </div>
        {/* Main Control Pill - Standalone */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-full border border-gray-200/80 shadow-lg shrink-0">
          {/* Dashboard UI Toggle */}
          <motion.button
            onClick={selectedEntityId ? clearSelection : toggleDashboard}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-colors shrink-0",
              isDashboardOpen
                ? "bg-gray-800 text-white hover:bg-gray-700"
                : "bg-white text-gray-800 border border-gray-200 hover:border-gray-300 hover:bg-gray-50",
            )}
          >
            {selectedEntityId ? (
              <>
                <X size={15} /> Close Focus
              </>
            ) : isDashboardOpen ? (
              <>
                <X size={15} /> Close Dashboard
              </>
            ) : (
              <>
                <LayoutDashboard size={15} /> Dashboard
              </>
            )}
          </motion.button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1 shrink-0" />

          {/* 3-Stage Segmented Control (Stop / Live / Scenarios) */}
          <div className="flex bg-gray-100/80 p-1 rounded-full border border-gray-200/60 shadow-inner shrink-0">
            {/* STOP Segment */}
            <button
              onClick={handleStop}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                simulationMode === "NONE"
                  ? "bg-white shadow-sm text-red-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <StopCircle
                size={14}
                className={`shrink-0 ${simulationMode === "NONE" ? "animate-pulse" : ""}`}
              />{" "}
              Stop
            </button>

            {/* LIVE Segment */}
            <button
              onClick={handleLive}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                simulationMode === "GENERAL"
                  ? "bg-green-500 shadow-sm text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Play
                size={14}
                className="shrink-0"
                fill={simulationMode === "GENERAL" ? "currentColor" : "none"}
              />{" "}
              Live
            </button>

            {/* SCENARIO Segment + Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isScenarioActive
                    ? "bg-amber-500 shadow-sm text-white"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <AlertOctagon size={14} className="shrink-0" />
                <span>
                  {isScenarioActive
                    ? formatScenarioName(simulationMode)
                    : "Scenarios"}
                </span>
                <ChevronUp
                  size={12}
                  className={`shrink-0 ml-0.5 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-[calc(100%+12px)] right-0 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-xl overflow-hidden origin-bottom-right flex flex-col"
                  >
                    <div className="bg-gray-50/80 p-3 border-b border-gray-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertOctagon size={12} className="text-amber-500" />{" "}
                        Inject Extreme Event
                      </span>
                    </div>
                    <div className="p-1.5 flex flex-col gap-1">
                      {DEMO_SCENARIOS.map((scenario) => {
                        const isActive = simulationMode === scenario;
                        return (
                          <button
                            key={scenario}
                            onClick={() => handleFireScenario(scenario)}
                            disabled={isActive}
                            className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${
                              isActive
                                ? "bg-amber-500 text-white shadow-sm cursor-not-allowed"
                                : "text-gray-700 hover:bg-amber-50 hover:text-amber-700"
                            }`}
                          >
                            {formatScenarioName(scenario)}
                            {isActive && (
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
