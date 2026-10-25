"use client";
import { memo } from "react";
import { Car, Plane as PlaneIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plane, Vehicle } from "@/types";
import { StatusTag } from "@/src/components/ui-kit";
import { humanize, PLANE_TONE } from "./asset-status";

const badgeClass = (selected?: boolean) =>
  cn(
    "twin-focus flex items-center gap-1.5 h-6 pl-1.5 pr-1 rounded-md border bg-twin-surface/95 backdrop-blur-sm shadow-[0_1px_3px_rgba(15,23,42,0.12)] text-left",
    selected
      ? "border-twin-accent ring-2 ring-twin-accent/25"
      : "border-twin-line hover:border-twin-line-strong",
  );

/** Map callout for an aircraft on the ground. */
export const PlaneBadge = memo(function PlaneBadge({
  plane,
  selected,
  onSelect,
}: {
  plane: Plane;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={badgeClass(selected)}
      aria-label={`Flight ${plane.flightNumber}`}
    >
      <PlaneIcon size={12} className="text-twin-ink-2 -rotate-45" />
      <span className="text-[12px] font-semibold text-twin-ink">
        {plane.callsign || plane.flightNumber}
      </span>
      <StatusTag tone={PLANE_TONE[plane.status] ?? "neutral"}>
        {humanize(plane.status)}
      </StatusTag>
    </button>
  );
});

/** Map callout for a landside vehicle. */
export const VehicleBadge = memo(function VehicleBadge({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: Vehicle;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={badgeClass(selected)}
      aria-label={`Vehicle ${vehicle.licensePlate}`}
    >
      <Car size={12} className="text-twin-ink-2" />
      <span className="text-[11px] font-semibold text-twin-ink tabular-nums">
        {vehicle.licensePlate}
      </span>
      <span className="text-[10px] text-twin-ink-3 tabular-nums pr-0.5">
        {Math.round(vehicle.speed ?? 0)} kt
      </span>
    </button>
  );
});
