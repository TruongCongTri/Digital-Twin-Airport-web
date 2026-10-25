import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAirportStore } from "../store/airport-store";
import type {
  AIPredictionPayload,
  Plane,
  Vehicle,
  VehicleStatus,
} from "@/types";
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

interface VehicleTelemetryPayload {
  id: string;
  sts: string;
  lat: number;
  lng: number;
  spd: number;
  hdg: number;
}

export function useSocket() {
  const updatePlaneTelemetryBatch = useAirportStore(
    (state) => state.updatePlaneTelemetryBatch,
  );
  const updateSensorTelemetry = useAirportStore(
    (state) => state.updateSensorTelemetry,
  );
  const updateSensorTelemetryBatch = useAirportStore(
    (state) => state.updateSensorTelemetryBatch,
  );
  const updateVehicleTelemetryBatch = useAirportStore(
    (state) => state.updateVehicleTelemetryBatch,
  );
  const setSimulationMode = useAirportStore((state) => state.setSimulationMode);
  const setConnection = useAirportStore((state) => state.setConnection);
  const updateAIForecastBatch = useAirportStore(
    (state) => state.updateAIForecastBatch,
  );

  useEffect(() => {
    // 1. STRIP THE API PATH: Socket.io connects to root, not /api/v1
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://digital-twin-airport-api-1.onrender.com/api/v1";
    const socketUrl = apiUrl.replace("/api/v1", "");

    // 2. FORCE WEBSOCKETS (FAST PATH)
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    setConnection("connecting");
    socket.on("connect", () => setConnection("live"));

    socket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setConnection("offline");
      toast.error("Telemetry Connection Lost", {
        description: "Showing last known cached data. Awaiting reconnect...",
        duration: 10000,
      });
      setSimulationMode("NONE");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket Error:", err.message);
      setConnection("offline");
    });

    // 3. FLIGHTS
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

    // 4. SENSORS (batched: one store update per tick for all sensors)
    socket.on("sensors:telemetry:batch", (batch: SensorTelemetryPayload[]) => {
      updateSensorTelemetryBatch(
        batch.map((data) => ({
          id: data.id,
          value: data.val,
          status: data.sts,
        })),
      );
    });

    // Legacy per-sensor event, kept while an older API build is still deployed
    socket.on("sensor:telemetry", (data: SensorTelemetryPayload) => {
      updateSensorTelemetry(data.id, data.val, data.sts);
    });

    // ✅ 5. GROUND VEHICLES (CIVILIAN TRAFFIC)
    socket.on(
      "vehicles:telemetry:batch",
      (batch: VehicleTelemetryPayload[]) => {
        const mappedBatch: Partial<Vehicle>[] = batch.map((data) => ({
          id: data.id,
          status: data.sts?.toUpperCase() as VehicleStatus,
          speed: data.spd,
          heading: data.hdg,
          position: { longitude: data.lng, latitude: data.lat, z: 0 }, // ✅ Explicitly defined z axis
        }));
        updateVehicleTelemetryBatch(mappedBatch);
      },
    );

    // AI forecasts from the simulation engine (one batch for all sensors)
    socket.on("ai:predictions:batch", (batch: AIPredictionPayload[]) => {
      updateAIForecastBatch(batch);
    });

    // Single vehicle status updates (e.g. from an admin panel overriding status)
    socket.on("vehicle:status-changed", (vehicle: Vehicle) => {
      updateVehicleTelemetryBatch([
        {
          id: vehicle.id,
          status: vehicle.status as VehicleStatus,
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [
    updatePlaneTelemetryBatch,
    updateSensorTelemetry,
    updateSensorTelemetryBatch,
    updateVehicleTelemetryBatch,
    setSimulationMode,
    setConnection,
    updateAIForecastBatch,
  ]);
}
