"use client";
import { memo } from "react";
import { Car, Crown, Plane as PlaneIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plane, Vehicle } from "@/types";
import { StatusTag } from "@/src/components/ui-kit";
import { humanize, PLANE_TONE, VEHICLE_TONE } from "./asset-status";

const rowClass = (selected?: boolean) =>
  cn(
    "twin-focus w-full flex items-center gap-2.5 h-11 pl-3 pr-3.5 text-left border-l-2 transition-colors",
    selected
      ? "bg-twin-accent-soft border-twin-accent"
      : "border-transparent hover:bg-twin-raised",
  );

export const PlaneRow = memo(function PlaneRow({
  plane,
  selected,
  onSelect,
}: {
  plane: Plane;
  selected?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plane.id)}
      className={rowClass(selected)}
      aria-current={selected}
    >
      <span className="w-7 h-7 rounded-md bg-twin-raised border border-twin-line flex items-center justify-center shrink-0 overflow-hidden">
        {plane.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plane.logoUrl} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <PlaneIcon size={14} className="text-twin-ink-2 -rotate-45" />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-medium text-twin-ink truncate">
          {plane.callsign || plane.flightNumber}
        </span>
        <span className="block text-[11px] text-twin-ink-3 truncate">
          {plane.origin} → {plane.destination} · {plane.airline}
        </span>
      </span>
      <StatusTag tone={PLANE_TONE[plane.status] ?? "neutral"}>
        {humanize(plane.status)}
      </StatusTag>
    </button>
  );
});

export const VehicleRow = memo(function VehicleRow({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: Vehicle;
  selected?: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = vehicle.type === "VIP_TRANSFER" ? Crown : Car;
  return (
    <button
      type="button"
      onClick={() => onSelect(vehicle.id)}
      className={rowClass(selected)}
      aria-current={selected}
    >
      <span className="w-7 h-7 rounded-md bg-twin-raised border border-twin-line flex items-center justify-center shrink-0">
        <Icon size={14} className="text-twin-ink-2" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-medium text-twin-ink truncate tabular-nums">
          {vehicle.licensePlate}
        </span>
        <span className="block text-[11px] text-twin-ink-3 truncate">
          {humanize(vehicle.type)}
          {vehicle.companyName ? ` · ${vehicle.companyName}` : ""}
        </span>
      </span>
      <StatusTag tone={VEHICLE_TONE[vehicle.status] ?? "neutral"}>
        {humanize(vehicle.status)}
      </StatusTag>
    </button>
  );
});
