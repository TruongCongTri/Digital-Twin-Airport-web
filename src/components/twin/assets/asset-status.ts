import type { PlaneStatus, VehicleStatus } from "@/types";

type Tone = "neutral" | "accent" | "warning" | "critical" | "good";

export const PLANE_TONE: Record<PlaneStatus, Tone> = {
  SCHEDULED: "neutral",
  PARKED: "neutral",
  BOARDING: "accent",
  PUSHBACK: "accent",
  TAXIING: "accent",
  APPROACHING: "accent",
  LANDED: "good",
  DEPARTED: "good",
  DELAYED: "warning",
  DIVERTED: "critical",
  CANCELLED: "critical",
};

export const VEHICLE_TONE: Record<VehicleStatus, Tone> = {
  APPROACHING_DROP_OFF: "accent",
  DROPPING_OFF: "good",
  PARKED: "neutral",
  APPROACHING_PICK_UP: "accent",
  PICKING_UP: "good",
  EXITING: "neutral",
};

export const humanize = (value: string | null | undefined) =>
  (value ?? "Unknown")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
