import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAirportStore } from "../store/airport-store";
import type { AIPredictionPayload, Plane } from "@/types";
import { toast } from "sonner";

interface FlightTelemetryPayload {
  flightId: string;
  flightNumber: string;
  status: string;
  speed: number;
  alt: number;
  heading: number;
  lng: number;
  lat: number;
  assignedRunway?: string | null;
}

interface SensorStreamPayload {
  sensorId: string;
  value: number;
}

export function useSocket() {
  const updatePlaneTelemetry = useAirportStore(
    (state) => state.updatePlaneTelemetry,
  );
  const updateSensorTelemetry = useAirportStore(
    (state) => state.updateSensorTelemetry,
  );

  useEffect(() => {
    // 1. STRIP THE API PATH: Socket.io must connect to the root server, not /api/v1
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
    const socketUrl = apiUrl.replace("/api/v1", "");

    // 2. FORCE WEBSOCKETS: Bypasses strict CORS polling issues
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    // 3. DEBUGGING: Check your browser console!
    socket.on("connect", () => console.log("🟢 Socket Connected:", socket.id));
    socket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      toast.error("Telemetry Connection Lost", {
        description: "Showing last known cached data. Awaiting reconnect...",
        duration: 10000,
      });
      // Optionally reset simulation mode so the UI button resets
      useAirportStore.getState().setSimulationMode("NONE");
    });
    socket.on("connect_error", (err) =>
      console.error("❌ Socket Error:", err.message),
    );

    socket.on("flight:telemetry", (data: FlightTelemetryPayload) => {
      // console.log('✈️ Flight Data Received:', data); // Uncomment to debug
      updatePlaneTelemetry({
        id: data.flightId,
        callsign: data.flightNumber,
        status: data.status.toLowerCase() as Plane["status"],
        speed: data.speed,
        altitude: data.alt,
        heading: data.heading,
        position: { longitude: data.lng, latitude: data.lat, z: data.alt },
        assignedRunway: data.assignedRunway || undefined,
      });
    });

    socket.on("sensor:stream", (data: SensorStreamPayload) => {
      // console.log('📡 Sensor Data Received:', data); // Uncomment to debug
      updateSensorTelemetry(data.sensorId, data.value);
    });

    // Inside your use-socket hook's useEffect:
    socket.on("ai:prediction:stream", (payload: AIPredictionPayload) => {
      // Pass the incoming AI data directly into Zustand
      useAirportStore.getState().updateAIForecast(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [updatePlaneTelemetry, updateSensorTelemetry]);
}
