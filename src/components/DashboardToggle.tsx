"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  X,
  Plane,
  Play,
  StopCircle,
  AlertOctagon,
  ChevronUp,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAirportStore } from "../store/airport-store";
import { DirectoryDropdown } from "./DirectoryDropdown";
import { toast } from "sonner";
import {
  startScenario,
  rebootSimulation,
  fetchSimulationStatus,
} from "../lib/api-client";
import { Scenario } from "@/types";

const DEMO_SCENARIOS = [
  "TROPICAL_SQUALL",
  "TARMAC_OVERHEAT",
  "AC_FAILURE",
  "HEAVY_LOAD",
  "EARTHQUAKE",
] as const;

// ✅ Shared facilities list with coordinates
const FACILITIES = [
  {
    id: "VVLT",
    name: "Long Thanh",
    code: "LTN",
    coords: [107.04036041678714, 10.773641336829593],
  },
  {
    id: "VVTS",
    name: "Tan Son Nhat",
    code: "SGN",
    coords: [106.65638055031799, 10.817694586314753],
  },
] as const;

export function DashboardToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Zustand (Client UI State)
  const isDashboardOpen = useAirportStore((state) => state.isDashboardOpen);
  const toggleDashboard = useAirportStore((state) => state.toggleDashboard);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);
  const clearSelection = useAirportStore((state) => state.clearSelection);
  const alertCount = useAirportStore((state) => state.metrics.alertCount);
  const simulationMode = useAirportStore((state) => state.simulationMode);
  const setSimulationMode = useAirportStore((state) => state.setSimulationMode);

  const activeAirport = useAirportStore((state) => state.activeAirport);
  const setActiveAirport = useAirportStore((state) => state.setActiveAirport);

  // Local UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- ✅ MASTER URL SYNC & NAVIGATION GUARD ---
  useEffect(() => {
    const urlAirport = searchParams.get("airport");

    if (!urlAirport) {
      // 1. Force default to VVLT if the URL is naked ("/")
      const params = new URLSearchParams(searchParams.toString());
      params.set("airport", "VVLT");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      // 2. If the URL has an airport, ensure our global store AND 3D map match it
      const targetFacility = FACILITIES.find((f) => f.id === urlAirport);

      // Only execute the fly-to and state update if the store is currently out of sync with the URL
      if (targetFacility && urlAirport !== activeAirport) {
        setActiveAirport(urlAirport);
        clearSelection();

        // Slight timeout ensures the ArcGIS map listener is fully mounted on hard-refreshes
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("switch-airport", {
              detail: {
                facilityId: targetFacility.id,
                coords: targetFacility.coords,
              },
            }),
          );
        }, 150);
      }
    }
  }, [
    searchParams,
    activeAirport,
    pathname,
    router,
    setActiveAirport,
    clearSelection,
  ]);

  // Determine current facility for the button label
  const activeFacility =
    FACILITIES.find((f) => f.id === activeAirport) || FACILITIES[0];

  // --- TANSTACK QUERY: Background Polling for Sim Status ---
  useQuery({
    queryKey: ["simulationStatus"],
    queryFn: fetchSimulationStatus,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // --- TANSTACK MUTATIONS ---
  const scenarioMutation = useMutation({
    mutationFn: (scenario: Scenario | "NONE") =>
      startScenario(scenario as Scenario),
    onMutate: (scenario) => {
      setSimulationMode(scenario === "NONE" ? "GENERAL" : scenario);
      setIsMenuOpen(false);
      return { isClearing: scenario === "NONE" };
    },
    onSuccess: (data, variables, context) => {
      toast.success(
        context.isClearing ? "Normal Operations Restored" : "Scenario Active!",
      );
    },
    onError: () => {
      toast.error("Scenario injection failed. Engine desync.");
      setSimulationMode("GENERAL");
    },
  });

  const rebootMutation = useMutation({
    mutationFn: rebootSimulation,
    onMutate: () => {
      setSimulationMode("GENERAL");
      setIsMenuOpen(false);
    },
    onSuccess: () => toast.success("Engine Rebooted Successfully"),
    onError: () => toast.error("Reboot failed"),
  });

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatScenarioName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isNormalOperations =
    simulationMode === "NONE" || simulationMode === "GENERAL";
  const isScenarioActive = !isNormalOperations;

  if (selectedEntityId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      >
        <button
          onClick={() => {
            clearSelection();
            // Optional: You could also dispatch switch-airport here to return to the airport center
            window.dispatchEvent(
              new CustomEvent("switch-airport", {
                detail: {
                  facilityId: activeFacility.id,
                  coords: activeFacility.coords,
                },
              }),
            );
          }}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl border border-gray-700 font-bold text-sm hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
        >
          <X size={16} /> Close Focus
        </button>
      </motion.div>
    );
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
      {/* ✅ NAVIGATION BUTTON */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          clearSelection();
          // Dispatch specific coords instead of generic reset
          window.dispatchEvent(
            new CustomEvent("switch-airport", {
              detail: {
                facilityId: activeFacility.id,
                coords: activeFacility.coords,
              },
            }),
          );
        }}
        className="pointer-events-auto bg-white/90 backdrop-blur-md border border-gray-200 text-gray-500 hover:text-gray-800 text-xs font-bold px-4 py-2 rounded-full shadow-sm flex items-center gap-2 transition-colors"
      >
        <Plane size={14} className="text-[#1e3a8a]" />
        {activeFacility.name} · Digital Twin
      </motion.button>

      <div className="flex items-center gap-3 pointer-events-none">
        {alertCount > 0 && !isDashboardOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            {alertCount} Alert{alertCount > 1 ? "s" : ""}
          </motion.div>
        )}

        <div className="pointer-events-auto shrink-0 flex items-center shadow-lg rounded-2xl">
          <DirectoryDropdown />
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-full border border-gray-200/80 shadow-lg shrink-0">
          <motion.button
            onClick={toggleDashboard}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-colors shrink-0",
              isDashboardOpen
                ? "bg-gray-800 text-white hover:bg-gray-700"
                : "bg-white text-gray-800 border border-gray-200 hover:border-gray-300",
            )}
          >
            {isDashboardOpen ? (
              <>
                {" "}
                <X size={15} /> Close Dashboard{" "}
              </>
            ) : (
              <>
                {" "}
                <LayoutDashboard size={15} /> Dashboard{" "}
              </>
            )}
          </motion.button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1 shrink-0" />

          <div className="flex bg-gray-100/80 p-1 rounded-full border border-gray-200/60 shadow-inner shrink-0">
            <button
              onClick={() => {
                if (isScenarioActive) scenarioMutation.mutate("NONE");
              }}
              disabled={scenarioMutation.isPending}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${isNormalOperations ? "bg-green-500 shadow-sm text-white" : "text-gray-500 hover:text-gray-800"}`}
            >
              <Play
                size={14}
                className="shrink-0"
                fill={isNormalOperations ? "currentColor" : "none"}
              />{" "}
              Live
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${isScenarioActive ? "bg-amber-500 shadow-sm text-white" : "text-gray-500 hover:text-gray-800"}`}
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
                      {isScenarioActive && (
                        <button
                          onClick={() => scenarioMutation.mutate("NONE")}
                          className="text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center bg-green-50 text-green-700 hover:bg-green-100 mb-1 border border-green-200/50"
                        >
                          <span className="flex items-center gap-2">
                            <RefreshCcw size={12} /> Clear Anomaly
                          </span>
                        </button>
                      )}

                      {DEMO_SCENARIOS.map((scenario) => {
                        const isActive = simulationMode === scenario;
                        return (
                          <button
                            key={scenario}
                            onClick={() => scenarioMutation.mutate(scenario)}
                            disabled={isActive || scenarioMutation.isPending}
                            className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${isActive ? "bg-amber-500 text-white shadow-sm cursor-not-allowed" : "text-gray-700 hover:bg-amber-50 hover:text-amber-700"}`}
                          >
                            {formatScenarioName(scenario)}
                            {isActive && (
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                            )}
                          </button>
                        );
                      })}

                      <div className="h-[1px] bg-gray-200/60 w-full my-1" />

                      <button
                        onClick={() => rebootMutation.mutate()}
                        disabled={rebootMutation.isPending}
                        className="text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/50"
                      >
                        <span className="flex items-center gap-2">
                          <StopCircle size={12} />{" "}
                          {rebootMutation.isPending
                            ? "Rebooting..."
                            : "Hard Reset Engine"}
                        </span>
                      </button>
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
