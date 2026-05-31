import { PlaneStatus, SensorStatus } from "@/types";

export const PLANE_STATUS_CONFIG: Record<
  PlaneStatus,
  { label: string; color: string; bgColor: string }
> = {
  SCHEDULED: { label: "Scheduled", color: "#6b7280", bgColor: "#f3f4f6" },
  DELAYED: { label: "Delayed", color: "#f59e0b", bgColor: "#fef3c7" },
  APPROACHING: { label: "Approaching", color: "#3b82f6", bgColor: "#dbeafe" },
  LANDED: { label: "Landed", color: "#10b981", bgColor: "#d1fae5" },
  TAXIING: { label: "Taxiing", color: "#3b82f6", bgColor: "#dbeafe" },
  PARKED: { label: "Parked", color: "#6b7280", bgColor: "#f3f4f6" },
  BOARDING: { label: "Boarding", color: "#8b5cf6", bgColor: "#ede9fe" },
  PUSHBACK: { label: "Pushback", color: "#8b5cf6", bgColor: "#ede9fe" },
  DEPARTED: { label: "Departed", color: "#10b981", bgColor: "#d1fae5" },
  DIVERTED: { label: "Diverted", color: "#ef4444", bgColor: "#fee2e2" },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bgColor: "#fee2e2" },
};

export const getPlaneStatusConfig = (status: PlaneStatus) => {
  return PLANE_STATUS_CONFIG[status];
};

export const SENSOR_STATUS_CONFIG: Record<
  SensorStatus,
  { label: string; color: string; animate?: boolean }
> = {
  ACTIVE: { label: "Active", color: "#22c55e" },
  WARNING: { label: "Warning", color: "#f59e0b" },
  CRITICAL: { label: "Critical", color: "#ef4444", animate: true },
  MAINTENANCE: { label: "Maint.", color: "#6366f1" },
  CALIBRATING: { label: "Calib.", color: "#a855f7" },
  OFFLINE: { label: "Offline", color: "#9ca3af" },
};
