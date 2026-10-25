"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAirportStore } from "@/src/store/airport-store";
import {
  fetchSimulationStatus,
  forceFlightPipeline,
  rebootSimulation,
  startScenario,
} from "@/src/lib/api-client";
import type { Scenario } from "@/types";

export const DEMO_SCENARIOS: Scenario[] = [
  "TROPICAL_SQUALL",
  "TARMAC_OVERHEAT",
  "AC_FAILURE",
  "HEAVY_LOAD",
  "EARTHQUAKE",
];

export const formatScenarioName = (name: string) =>
  name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Simulation engine controls: status polling, scenario injection, reboot, flight pipeline. */
export function useSimulationControls() {
  const simulationMode = useAirportStore((s) => s.simulationMode);
  const setSimulationMode = useAirportStore((s) => s.setSimulationMode);
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["simulationStatus"],
    queryFn: fetchSimulationStatus,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Reflect the engine's real state, including scenarios started elsewhere or expired
  const engineScenario: string | undefined = status?.activeScenario;
  useEffect(() => {
    if (!engineScenario) return;
    const next =
      engineScenario === "NONE" ? "GENERAL" : (engineScenario as Scenario);
    if (useAirportStore.getState().simulationMode !== next)
      setSimulationMode(next);
  }, [engineScenario, setSimulationMode]);

  const scenario = useMutation({
    mutationFn: (next: Scenario | "NONE") => startScenario(next as Scenario),
    onMutate: (next) => {
      setSimulationMode(next === "NONE" ? "GENERAL" : next);
      return { isClearing: next === "NONE" };
    },
    onSuccess: (_data, _vars, context) => {
      toast.success(
        context?.isClearing
          ? "Normal operations restored"
          : "Scenario injected",
      );
      queryClient.invalidateQueries({ queryKey: ["simulationStatus"] });
    },
    onError: () => {
      toast.error("Scenario injection failed");
      setSimulationMode("GENERAL");
    },
  });

  const reboot = useMutation({
    mutationFn: rebootSimulation,
    onMutate: () => setSimulationMode("GENERAL"),
    onSuccess: () => toast.success("Simulation engine rebooted"),
    onError: () => toast.error("Reboot failed"),
  });

  const pipeline = useMutation({
    mutationFn: () => forceFlightPipeline(activeAirport),
    onSuccess: (data) =>
      toast.success("Flight pipeline triggered", {
        description: data?.message,
      }),
    onError: () => toast.error("Failed to trigger the flight pipeline"),
  });

  const isNormal = simulationMode === "NONE" || simulationMode === "GENERAL";

  return {
    simulationMode,
    isNormal,
    activeScenario: isNormal ? null : simulationMode,
    injectScenario: (s: Scenario) => scenario.mutate(s),
    clearScenario: () => scenario.mutate("NONE"),
    reboot: () => reboot.mutate(),
    forcePipeline: () => pipeline.mutate(),
    isBusy: scenario.isPending || reboot.isPending || pipeline.isPending,
  };
}
