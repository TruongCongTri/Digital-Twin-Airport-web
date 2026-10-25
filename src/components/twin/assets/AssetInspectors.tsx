"use client";
import { Crosshair, LineChart } from "lucide-react";
import type { Plane, Vehicle } from "@/types";
import { useUIStore } from "@/src/store/useUIStore";
import { dispatchMapCommand } from "@/src/lib/map-commands";
import {
  Button,
  KeyValueList,
  PanelSection,
  StatusTag,
  ValueReadout,
} from "@/src/components/ui-kit";
import { humanize, PLANE_TONE, VEHICLE_TONE } from "./asset-status";

function InspectorActions() {
  const setAnalyticsOpen = useUIStore((s) => s.setAnalyticsOpen);
  return (
    <div className="flex gap-1.5 px-3.5 py-2.5 border-b border-twin-line">
      <Button
        icon={<Crosshair size={13} />}
        onClick={() => dispatchMapCommand({ type: "focus-selection" })}
      >
        Locate
      </Button>
      <Button
        icon={<LineChart size={13} />}
        onClick={() => setAnalyticsOpen(true)}
        className="ml-auto"
      >
        Analytics
      </Button>
    </div>
  );
}

export function PlaneInspector({ plane }: { plane: Plane }) {
  return (
    <>
      <div className="px-3.5 pt-3.5 pb-4 border-b border-twin-line">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {plane.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plane.logoUrl}
                alt=""
                className="w-6 h-6 object-contain shrink-0"
              />
            )}
            <span className="text-[12px] text-twin-ink-2 truncate">
              {plane.airline}
            </span>
          </div>
          <StatusTag tone={PLANE_TONE[plane.status] ?? "neutral"}>
            {humanize(plane.status)}
          </StatusTag>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[24px] font-semibold text-twin-ink leading-none">
              {plane.origin || "—"}
            </p>
            <p className="text-[10px] text-twin-ink-3 mt-1">Origin</p>
          </div>
          <div
            className="flex-1 mx-3 border-t border-dashed border-twin-line-strong"
            aria-hidden
          />
          <div className="text-right">
            <p className="text-[24px] font-semibold text-twin-ink leading-none">
              {plane.destination || "—"}
            </p>
            <p className="text-[10px] text-twin-ink-3 mt-1">Destination</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <ValueReadout
            label="Ground speed"
            value={Math.round(plane.speed ?? 0).toString()}
            unit="kt"
            size="sm"
          />
          <ValueReadout
            label="Altitude"
            value={Math.round(plane.altitude ?? 0).toString()}
            unit="ft"
            size="sm"
          />
          <ValueReadout
            label="Heading"
            value={Math.round(plane.heading ?? 0).toString()}
            unit="°"
            size="sm"
          />
        </div>
      </div>
      <InspectorActions />
      <PanelSection title="Flight">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Flight", value: plane.flightNumber },
            { label: "Direction", value: humanize(plane.direction) },
            {
              label: "Stand",
              value: plane.parkingStand?.code ?? plane.gate ?? "Unassigned",
            },
            { label: "Runway", value: plane.assignedRunway ?? "—" },
            {
              label: "Position",
              value: `${(plane.position?.latitude ?? 0).toFixed(5)}, ${(plane.position?.longitude ?? 0).toFixed(5)}`,
            },
          ]}
        />
      </PanelSection>
    </>
  );
}

export function VehicleInspector({ vehicle }: { vehicle: Vehicle }) {
  return (
    <>
      <div className="px-3.5 pt-3.5 pb-4 border-b border-twin-line">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-twin-ink-2">
            {humanize(vehicle.type)}
          </span>
          <StatusTag tone={VEHICLE_TONE[vehicle.status] ?? "neutral"}>
            {humanize(vehicle.status)}
          </StatusTag>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <ValueReadout
            label="Speed"
            value={Math.round(vehicle.speed ?? 0).toString()}
            unit="kt"
            size="md"
          />
          <ValueReadout
            label="Heading"
            value={Math.round(vehicle.heading ?? 0).toString()}
            unit="°"
            size="md"
          />
          <ValueReadout
            label="Battery"
            value={
              vehicle.batteryLevel != null ? String(vehicle.batteryLevel) : "—"
            }
            unit={vehicle.batteryLevel != null ? "%" : undefined}
            size="md"
          />
        </div>
      </div>
      <InspectorActions />
      <PanelSection title="Vehicle">
        <KeyValueList
          className="px-3.5"
          items={[
            { label: "Plate", value: vehicle.licensePlate },
            { label: "Operator", value: vehicle.companyName ?? "Private" },
            {
              label: "Model",
              value:
                [vehicle.brand, vehicle.carModel].filter(Boolean).join(" ") ||
                "—",
            },
            {
              label: "Position",
              value: `${(vehicle.position?.latitude ?? 0).toFixed(5)}, ${(vehicle.position?.longitude ?? 0).toFixed(5)}`,
            },
          ]}
        />
      </PanelSection>
    </>
  );
}
