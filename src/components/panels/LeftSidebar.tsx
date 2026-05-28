/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useTelemetryStore } from "@/src/store/useTelemetryStore";
import { useUIStore } from "@/src/store/useUIStore";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function LeftSidebar() {
  const {
    leftSidebarOpen,
    setSidebarState,
    toggleSensorSelection,
    selectedSensorIds,
  } = useUIStore();
  const sensors = useTelemetryStore((state) => state.sensors);

  return (
    <div
      className="absolute top-16 bottom-0 left-0 z-30 flex transition-transform duration-300 ease-in-out"
      style={{
        transform: leftSidebarOpen
          ? "translateX(0)"
          : "translateX(calc(-100% + 2rem))",
      }}
    >
      <aside className="w-[320px] h-full bg-[#FFFFFF]/95 backdrop-blur-md border-r border-[#E2E8F0] pointer-events-auto flex flex-col shadow-[4px_0_24px_rgba(42,67,101,0.03)]">
        <div className="p-4 border-b border-[#E2E8F0]">
          <h2 className="text-xs uppercase tracking-widest font-bold text-[#2A4365] mb-3">
            Sensor Library
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {Object.values(sensors).map((s: any) => (
            <div
              key={s.id}
              onClick={() => toggleSensorSelection(s.id)}
              className={`p-3 rounded-md border cursor-pointer transition-colors ${
                selectedSensorIds.includes(s.id)
                  ? "border-[#2A4365] bg-[#2A4365]/5"
                  : "border-[#E2E8F0] bg-white hover:bg-[#F8F9FA]"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#2D3748]">
                  {s.name}
                </span>
                <span className="text-[10px] text-[#718096]">{s.type}</span>
              </div>
              <div className="mt-2 text-lg font-mono text-[#2A4365]">
                {s.value}{" "}
                <span className="text-[10px] text-[#718096]">
                  {s.unit || ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <button
        onClick={() => setSidebarState("left", !leftSidebarOpen)}
        className="pointer-events-auto w-8 h-12 mt-4 flex items-center justify-center rounded-r-md border border-l-0 border-[#E2E8F0] bg-white text-[#2A4365] hover:bg-[#F4F5F7] shadow-sm"
      >
        {leftSidebarOpen ? (
          <ChevronLeft size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>
    </div>
  );
}
