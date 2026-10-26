import type { Plane, PlaneStatus } from "@/types";

// Statuses where the aircraft is in the air or elsewhere, not on this airport's surface.
// Keep in sync with OFF_AIRPORT_STATUSES in the API (src/constants/airport-routing.ts).
export const OFF_AIRPORT_STATUSES: PlaneStatus[] = [
  "SCHEDULED",
  "DELAYED",
  "APPROACHING",
  "DEPARTED",
  "DIVERTED",
  "CANCELLED",
];

/**
 * Off-airport flights have no icon on the map: the API pins them to an anchor inside the
 * airport (landing threshold, or take-off end for departures) where only the badge shows.
 */
export const isPlaneOffAirport = (plane: Pick<Plane, "status">) =>
  OFF_AIRPORT_STATUSES.includes(plane.status);
