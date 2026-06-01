import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAirportStore } from "../store/airport-store";
import type { Plane } from "@/types";
import { toast } from "sonner";

interface FlightTelemetryPayload {
  id: string;
  sts: string;
  dir: string;
  spd: number;
  alt: number;
  hdg: number;
  lng: number;
  lat: number;
}

interface SensorTelemetryPayload {
  id: string;
  val: number;
  sts?: string;
}

export function useSocket() {
  const updatePlaneTelemetryBatch = useAirportStore(
    (state) => state.updatePlaneTelemetryBatch,
  );
  const updateSensorTelemetry = useAirportStore(
    (state) => state.updateSensorTelemetry,
  );
  const hydrateStaticData = useAirportStore((state) => state.hydrateStaticData);
  const syncHeavyData = useAirportStore((state) => state.syncHeavyData);

  useEffect(() => {
    // 1. Initial Boot: Load Heavy Static Data Once
    hydrateStaticData();

    // 2. INITIALIZE SLOW PATH: Fetch heavy arrays for charts every 5 mins
    syncHeavyData(); // Fetch immediately on mount
    const chartDataInterval = setInterval(() => {
      syncHeavyData();
    }, 300000); // 300,000ms = 5 Minutes

    // 3. STRIP THE API PATH: Socket.io connects to root, not /api/v1
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://digital-twin-airport-api-1.onrender.com/api/v1";
    const socketUrl = apiUrl.replace("/api/v1", "");

    // 4. FORCE WEBSOCKETS (FAST PATH)
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => console.log("🟢 Socket Connected:", socket.id));

    socket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      toast.error("Telemetry Connection Lost", {
        description: "Showing last known cached data. Awaiting reconnect...",
        duration: 10000,
      });
      useAirportStore.getState().setSimulationMode("NONE");
    });

    socket.on("connect_error", (err) =>
      console.error("❌ Socket Error:", err.message),
    );

    // 5. FAST PATH LISTENER: Does NOT re-render charts
    socket.on("flights:telemetry:batch", (batch: FlightTelemetryPayload[]) => {
      const mappedBatch: Partial<Plane>[] = batch.map((data) => ({
        id: data.id,
        status: data.sts?.toUpperCase() as Plane["status"],
        direction: data.dir?.toUpperCase() as Plane["direction"],
        speed: data.spd,
        altitude: data.alt,
        heading: data.hdg,
        position: { longitude: data.lng, latitude: data.lat, z: data.alt },
      }));
      updatePlaneTelemetryBatch(mappedBatch);
    });

    // 6. FAST PATH LISTENER: Does NOT re-render charts
    socket.on("sensor:telemetry", (data: SensorTelemetryPayload) => {
      updateSensorTelemetry(data.id, data.val, data.sts);
    });

    return () => {
      clearInterval(chartDataInterval); // Clean up the polling timer
      socket.disconnect();
    };
  }, [
    updatePlaneTelemetryBatch,
    updateSensorTelemetry,
    hydrateStaticData,
    syncHeavyData,
  ]);
}
