"use client";
import { useMemo, useState } from "react";
import type { Plane, Sensor, Vehicle } from "@/types";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore } from "@/src/store/useUIStore";
import { getSensorHealth } from "@/src/lib/sensor-meta";
import { SensorBadge } from "../sensors/SensorBadge";
import { PlaneBadge, VehicleBadge } from "../assets/AssetBadges";

const EMPTY_VEHICLES: Vehicle[] = [];

/**
 * HTML callouts positioned over the 3D view. Screen positions (and collision
 * culling) come from the map's tooltip sync; this layer decides what to show.
 */
export function MapBadges() {
  const tooltips = useAirportStore((s) => s.tooltips);
  const planes = useAirportStore((s) => s.planes);
  const sensors = useAirportStore((s) => s.sensors);
  const vehicles = useAirportStore((s) => s.vehicles ?? EMPTY_VEHICLES);
  const selectedEntityId = useAirportStore((s) => s.selectedEntityId);
  const selectEntity = useAirportStore((s) => s.selectEntity);
  const isImmersiveActive = useAirportStore((s) => s.isImmersiveActive);
  const badgeMode = useUIStore((s) => s.badgeMode);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, Plane | Sensor | Vehicle>();
    planes.forEach((p) => map.set(p.id, p));
    sensors.forEach((s) => map.set(s.id, s));
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [planes, sensors, vehicles]);

  if (badgeMode === "off" && !selectedEntityId) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {tooltips.map((t) => {
        if (!t.visible) return null;
        const entity = lookup.get(t.entityId);
        if (!entity) return null;
        const isSelected = t.entityId === selectedEntityId;

        if (!isSelected) {
          if (badgeMode === "off") return null;
          if (selectedEntityId && isImmersiveActive) return null;
          if (badgeMode === "alerts") {
            if (t.entityType !== "sensor") return null;
            const s = entity as Sensor;
            const health = getSensorHealth(s.type, s.currentValue, s.status);
            if (health !== "critical" && health !== "warning") return null;
          }
        }

        const expanded = isSelected || hoveredId === t.entityId;
        return (
          <div
            key={t.entityId}
            className="absolute pointer-events-auto"
            style={{
              left: t.screenX,
              top: t.screenY,
              transform: "translate(-50%, calc(-100% - 6px))",
              zIndex: expanded ? 30 : isSelected ? 20 : 1,
            }}
            onPointerEnter={() => setHoveredId(t.entityId)}
            onPointerLeave={() =>
              setHoveredId((id) => (id === t.entityId ? null : id))
            }
          >
            {t.entityType === "sensor" && (
              <SensorBadge
                sensor={entity as Sensor}
                expanded={expanded}
                selected={isSelected}
                onSelect={() => selectEntity(t.entityId, "sensor")}
              />
            )}
            {t.entityType === "plane" && (
              <PlaneBadge
                plane={entity as Plane}
                selected={isSelected}
                onSelect={() => selectEntity(t.entityId, "plane")}
              />
            )}
            {t.entityType === "vehicle" && (
              <VehicleBadge
                vehicle={entity as Vehicle}
                selected={isSelected}
                onSelect={() => selectEntity(t.entityId, "vehicle")}
              />
            )}
            {/* Leader line from badge to the anchor point */}
            <span
              className="absolute left-1/2 -bottom-[6px] w-px h-[6px] bg-twin-ink/40"
              aria-hidden
            />
          </div>
        );
      })}
    </div>
  );
}
