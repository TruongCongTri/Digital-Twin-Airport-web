"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plane, Wifi, Bell } from "lucide-react";
import { useAirportStore } from "../store/airport-store";

export function TopBar() {
  const { metrics } = useAirportStore();
  const [time, setTime] = useState("");

  useEffect(() => {
    // ✅ OPTIMIZATION: Initialize immediately to prevent UI layout shift
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 25 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl px-5 py-2.5 shadow-sm whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] flex items-center justify-center shrink-0">
            <Plane size={14} className="text-white -rotate-45" />
          </div>
          <span className="text-sm font-bold text-gray-800">AeroTwin</span>
        </div>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="text-xs text-gray-500">Live API</span>
        </div>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
          <span>
            <span className="font-semibold text-gray-800">
              {metrics.activeFlights}
            </span>{" "}
            active
          </span>
        </div>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        <div className="flex items-center gap-3 shrink-0">
          <Wifi size={13} className="text-gray-400 shrink-0" />

          {metrics.alertCount > 0 && (
            <div className="relative shrink-0">
              <Bell size={13} className="text-gray-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center">
                {metrics.alertCount}
              </div>
            </div>
          )}

          <span className="text-xs text-gray-500 font-mono min-w-[75px] text-right whitespace-nowrap">
            {time}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
