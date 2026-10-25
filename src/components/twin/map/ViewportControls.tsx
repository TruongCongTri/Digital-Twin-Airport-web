"use client";
import { useState } from "react";
import {
  ChevronDown,
  Compass,
  Home,
  Minus,
  PanelLeftOpen,
  Plus,
  Rotate3d,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/src/store/useUIStore";
import { dispatchMapCommand } from "@/src/lib/map-commands";
import { HEALTH_ORDER, HEALTH_STYLES } from "@/src/lib/sensor-meta";
import {
  HEALTH_ICONS,
  IconButton,
  Toolbar,
  ToolbarDivider,
} from "@/src/components/ui-kit";
import { useAttributionInset } from "./useAttributionInset";

/** Floating camera toolbar (top-right of the viewport). */
export function ViewToolbar() {
  return (
    <Toolbar className="absolute top-3 right-3 z-20">
      <IconButton
        label="Home view"
        onClick={() => dispatchMapCommand({ type: "home" })}
      >
        <Home size={16} />
      </IconButton>
      <ToolbarDivider />
      <IconButton
        label="Zoom in"
        onClick={() => dispatchMapCommand({ type: "zoom", delta: 1 })}
      >
        <Plus size={16} />
      </IconButton>
      <IconButton
        label="Zoom out"
        onClick={() => dispatchMapCommand({ type: "zoom", delta: -1 })}
      >
        <Minus size={16} />
      </IconButton>
      <ToolbarDivider />
      <IconButton
        label="Toggle 2D / 3D tilt"
        onClick={() => dispatchMapCommand({ type: "toggle-tilt" })}
      >
        <Rotate3d size={16} />
      </IconButton>
      <IconButton
        label="Reset to north"
        onClick={() => dispatchMapCommand({ type: "north" })}
      >
        <Compass size={16} />
      </IconButton>
    </Toolbar>
  );
}

/** Reopens the explorer when it is collapsed. */
export function ExplorerReopenButton() {
  const open = useUIStore((s) => s.explorerOpen);
  const setOpen = useUIStore((s) => s.setExplorerOpen);
  if (open) return null;
  return (
    <Toolbar className="absolute top-3 left-3 z-20">
      <IconButton label="Open explorer" onClick={() => setOpen(true)}>
        <PanelLeftOpen size={16} />
      </IconButton>
    </Toolbar>
  );
}

/** Explains how sensor value columns encode data (fill = value in range, colour = health). */
export function ColumnLegend() {
  const [open, setOpen] = useState(true);
  const attributionInset = useAttributionInset();
  return (
    <div
      className="absolute left-3 z-20 w-[220px] bg-twin-surface/95 backdrop-blur-sm border border-twin-line rounded-lg shadow-sm transition-[bottom] duration-150"
      style={{ bottom: attributionInset + 8 }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="twin-focus w-full flex items-center justify-between h-8 px-3 text-[11px] font-semibold uppercase tracking-wide text-twin-ink-2"
      >
        Sensor columns
        <ChevronDown
          size={14}
          className={cn(
            "text-twin-ink-3 transition-transform",
            !open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 flex gap-3">
          {/* Mini column diagram */}
          <div className="flex flex-col items-center gap-1 pt-0.5" aria-hidden>
            <div className="relative w-3 h-12 rounded-sm bg-[#2a78d6]/15 border border-[#2a78d6]/30 overflow-hidden">
              <div className="absolute bottom-0 inset-x-0 h-[60%] bg-[#2a78d6]" />
            </div>
            <span className="text-[9px] text-twin-ink-3">value</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-twin-ink-2 leading-snug mb-2">
              Fill height = reading within the sensor&apos;s range. Indoor
              columns stand on their storey.
            </p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
              {HEALTH_ORDER.map((h) => {
                const Icon = HEALTH_ICONS[h];
                return (
                  <li
                    key={h}
                    className="flex items-center gap-1 text-[11px] text-twin-ink"
                  >
                    <Icon
                      size={12}
                      style={{ color: HEALTH_STYLES[h].color }}
                      strokeWidth={2.4}
                    />
                    {HEALTH_STYLES[h].label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
