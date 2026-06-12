"use client";

import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSocket } from "@/src/hooks/use-socket";
import { useAirportStore } from "@/src/store/airport-store";
import {
  fetchInitialTelemetry,
  fetchSensorHistory,
} from "@/src/lib/api-client";

interface AppBootstrapperProps {
  children: ReactNode;
}

/**
 * @description
 * This component orchestrates the entire data engine on app mount.
 * 1. Initializes the fast-path WebSocket stream (Zustand).
 * 2. Fetches the heavy initial telemetry via React Query.
 * 3. Hydrates the Zustand store once the initial data arrives.
 * 4. Manages automatic background polling for selected entities.
 */
export function AppBootstrapper({ children }: AppBootstrapperProps) {
  const setInitialData = useAirportStore((state) => state.setInitialData);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);
  const selectedEntityType = useAirportStore(
    (state) => state.selectedEntityType,
  );
  const activeAirport = useAirportStore((state) => state.activeAirport);
  // 1. Ignite WebSockets (Fast Path - Streams directly into Zustand)
  useSocket();

  // 2. Fetch Initial Heavy Data (Slow Path - Managed by React Query)
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["initialTelemetry", activeAirport],
    queryFn: () => fetchInitialTelemetry(activeAirport),
    staleTime: Infinity, // Sockets handle the live updates, so this never goes "stale"
    gcTime: Infinity, // Never garbage collect the initial airport state
  });

  // 3. Hydrate Zustand (Bridging Server State to Client State)
  useEffect(() => {
    if (initialData) {
      setInitialData(
        initialData.sensors,
        initialData.flights,
        initialData.vehicles,
      );
      console.log("[System]: Initial airport telemetry hydrated.");
    }
  }, [initialData, setInitialData]);

  // 4. Auto-Polling for Active Sensor History (Replaces manual setInterval)
  // This ONLY runs if a user is actively looking at a sensor, saving massive bandwidth.
  useQuery({
    queryKey: ["sensorHistory", selectedEntityId],
    queryFn: () => fetchSensorHistory(selectedEntityId as string),
    enabled: selectedEntityType === "sensor" && !!selectedEntityId,
    refetchInterval: 300000, // Background poll every 5 minutes
  });

  // Optional: You can return a global loading screen here if you don't want
  // the map to render empty while the initial fetch happens.
  // if (isLoading) return <GlobalAirportLoader />;

  return <>{children}</>;
}
