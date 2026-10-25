"use client";
import { Car, Plane, Radio, X } from "lucide-react";
import { useAirportStore } from "@/src/store/airport-store";
import { getSensorMeta } from "@/src/lib/sensor-meta";
import {
  IconButton,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/src/components/ui-kit";
import { SensorInspector } from "../sensors/SensorInspector";
import { PlaneInspector, VehicleInspector } from "../assets/AssetInspectors";

/** Right dock: properties + live data for the selected sensor, aircraft or vehicle. */
export function InspectorPanel() {
  const type = useAirportStore((s) => s.selectedEntityType);
  const sensor = useAirportStore((s) => s.getSelectedSensor());
  const plane = useAirportStore((s) => s.getSelectedPlane());
  const vehicle = useAirportStore((s) => s.getSelectedVehicle());
  const clearSelection = useAirportStore((s) => s.clearSelection);

  const header =
    type === "sensor" && sensor
      ? {
          icon: <Radio size={15} />,
          title: sensor.name,
          subtitle: `Sensor · ${getSensorMeta(sensor.type).label}`,
        }
      : type === "plane" && plane
        ? {
            icon: <Plane size={15} className="-rotate-45" />,
            title: plane.callsign || plane.flightNumber,
            subtitle: `Aircraft · ${plane.airline}`,
          }
        : type === "vehicle" && vehicle
          ? {
              icon: <Car size={15} />,
              title: vehicle.licensePlate,
              subtitle: "Landside vehicle",
            }
          : null;

  if (!header) return null;

  return (
    <Panel as="aside" className="w-[360px] shrink-0 border-l">
      <PanelHeader
        icon={header.icon}
        title={header.title}
        subtitle={header.subtitle}
        actions={
          <IconButton label="Close inspector" onClick={clearSelection}>
            <X size={16} />
          </IconButton>
        }
      />
      <PanelBody>
        {type === "sensor" && sensor && <SensorInspector sensor={sensor} />}
        {type === "plane" && plane && <PlaneInspector plane={plane} />}
        {type === "vehicle" && vehicle && (
          <VehicleInspector vehicle={vehicle} />
        )}
      </PanelBody>
    </Panel>
  );
}
