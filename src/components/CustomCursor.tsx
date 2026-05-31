"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCustomCursor } from "@/src/hooks/useCustomCursor";
import { Plus } from "lucide-react";

export function CustomCursor() {
  const { cursorRef, cursorType } = useCustomCursor();

  const variants = {
    default: {
      width: 24,
      height: 24,
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      border: "2px solid rgba(30, 58, 138, 0.8)",
      borderRadius: "50%",
      x: -12,
      y: -12,
    },
    pointer: {
      width: 48,
      height: 48,
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      border: "2px solid rgba(59, 130, 246, 1)",
      borderRadius: "50%",
      x: -24,
      y: -24,
    },
    crosshair: {
      width: 40,
      height: 40,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      border: "1px solid rgba(30, 58, 138, 0.5)",
      borderRadius: "50%",
      x: -20,
      y: -20,
    },
    lens: {
      width: 120,
      height: 120,
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      border: "3px solid rgba(203, 213, 225, 0.8)",
      boxShadow:
        "inset 0 0 20px rgba(255,255,255,0.6), inset 10px 0 40px rgba(255,255,255,0.4), 0 10px 25px rgba(0,0,0,0.15)",
      backdropFilter: "blur(2px) contrast(1.2) saturate(1.2)",
      borderRadius: "50%",
      x: -60,
      y: -60,
    },
  };

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
    >
      <motion.div
        variants={variants}
        initial="default"
        animate={cursorType}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex items-center justify-center backdrop-blur-[2px] shadow-sm relative"
      >
        <AnimatePresence mode="wait">
          {cursorType === "pointer" && (
            <motion.div
              key="dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute w-2.5 h-2.5 bg-[#1e3a8a] rounded-full"
            />
          )}
          {cursorType === "crosshair" && (
            <motion.div
              key="cross"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute text-[#1e3a8a]"
            >
              <Plus size={20} strokeWidth={1} />
            </motion.div>
          )}
          {cursorType === "lens" && (
            <motion.div
              key="glare"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 left-2 w-16 h-8 rounded-full bg-gradient-to-b from-white/40 to-transparent transform -rotate-45"
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
