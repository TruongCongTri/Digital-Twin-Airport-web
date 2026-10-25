"use client";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HEALTH_STYLES, type SensorHealth } from "@/src/lib/sensor-meta";

export const HEALTH_ICONS: Record<SensorHealth, LucideIcon> = {
  normal: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertOctagon,
  offline: WifiOff,
};

/** Small status dot. Pair with text or an icon elsewhere — colour is never the only cue. */
export function HealthDot({
  health,
  pulse,
  className,
}: {
  health: SensorHealth;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex w-2 h-2 shrink-0", className)}
      aria-hidden
    >
      {pulse && health === "critical" && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-60"
          style={{ backgroundColor: HEALTH_STYLES[health].color }}
        />
      )}
      <span
        className="relative w-2 h-2 rounded-full"
        style={{ backgroundColor: HEALTH_STYLES[health].color }}
      />
    </span>
  );
}

/** Icon + label status pill. Text stays in ink (yellow text fails contrast); colour carries via icon and tint. */
export function HealthPill({
  health,
  size = "md",
  className,
}: {
  health: SensorHealth;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = HEALTH_ICONS[health];
  const style = HEALTH_STYLES[health];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium text-twin-ink whitespace-nowrap",
        size === "sm" ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-[11px]",
        className,
      )}
      style={{ backgroundColor: style.tint }}
    >
      <Icon
        size={size === "sm" ? 11 : 12}
        style={{ color: style.color }}
        strokeWidth={2.4}
      />
      {style.label}
    </span>
  );
}

/** Generic neutral/coloured pill for non-sensor statuses (flight / vehicle states). */
export function StatusTag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "warning" | "critical" | "good";
  className?: string;
}) {
  const tones = {
    neutral: "bg-twin-raised text-twin-ink-2 border-twin-line",
    accent: "bg-twin-accent-soft text-twin-accent border-transparent",
    good: "bg-[#e7f6e7] text-[#006300] border-transparent",
    warning: "bg-[#fef5e1] text-twin-ink border-transparent",
    critical: "bg-[#fbe9e9] text-[#a12828] border-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-1.5 rounded border text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
