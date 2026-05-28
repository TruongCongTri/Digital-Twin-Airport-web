"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "stable";
  className?: string;
  accent?: boolean;
}

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  className,
  accent,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-4 rounded-2xl",
        accent
          ? "bg-[#1e3a8a] text-white"
          : "bg-gray-50 border border-gray-100",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            accent ? "text-blue-200" : "text-gray-400",
          )}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            size={14}
            className={accent ? "text-blue-300" : "text-gray-400"}
          />
        )}
      </div>
      <div className="flex items-end gap-1 mt-1">
        <span
          className={cn(
            "text-2xl font-bold leading-none",
            accent ? "text-white" : "text-gray-800",
          )}
        >
          {value}
        </span>
        {unit && (
          <span
            className={cn(
              "text-xs mb-0.5",
              accent ? "text-blue-200" : "text-gray-400",
            )}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
