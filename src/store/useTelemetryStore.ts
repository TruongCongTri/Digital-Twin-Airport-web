/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface TelemetryState {
  sensors: Record<string, any>;
  flights: Record<string, any>;
  screenPoints: any[]; // 2D HTML bubbles overlaying 3D map
  setInitialData: (sensors: any[], flights: any[]) => void;
  updateSensor: (id: string, value: number) => void;
  updateFlight: (id: string, flightData: any) => void;
  setScreenPoints: (points: any[]) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  sensors: {},
  flights: {},
  screenPoints: [],

  setInitialData: (sensors, flights) => {
    const sensorDict = sensors.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
    const flightDict = flights.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});
    set({ sensors: sensorDict, flights: flightDict });
  },

  updateSensor: (id, value) =>
    set((state) => ({
      sensors: { ...state.sensors, [id]: { ...state.sensors[id], value } },
    })),

  updateFlight: (id, flightData) =>
    set((state) => ({
      flights: { ...state.flights, [id]: flightData },
    })),

  setScreenPoints: (points) => set({ screenPoints: points }),
}));
