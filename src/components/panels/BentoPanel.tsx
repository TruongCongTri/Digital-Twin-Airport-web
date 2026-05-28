"use client";
import {
  motion,
  AnimatePresence,
  type Variants,
  HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { createContext, useContext } from "react";

type Direction = "left" | "right" | "top" | "bottom";

const DirectionContext = createContext<Direction>("left");

interface BentoPanelProps {
  children: React.ReactNode;
  direction?: Direction;
  isOpen: boolean;
  className?: string;
  delay?: number;
}

// 1. The Panel controls the stagger orchestration (Wait for children)
const containerVariants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: {
      staggerChildren: 0.08, // Time between each box appearing
      delayChildren: delay,
    },
  }),
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1, // -1 means it reverses (bottom-to-top) on exit!
    },
  },
};

export function BentoPanel({
  children,
  direction = "left",
  isOpen,
  className,
  delay = 0,
}: BentoPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <DirectionContext.Provider value={direction}>
          <motion.div
            custom={delay}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            className={cn("pointer-events-none", className)}
          >
            {children}
          </motion.div>
        </DirectionContext.Provider>
      )}
    </AnimatePresence>
  );
}

interface BentoBoxProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

// 2. The Box handles the actual slide-in physics
export function BentoBox({ children, className, ...props }: BentoBoxProps) {
  const direction = useContext(DirectionContext);

  const boxVariants: Variants = {
    hidden: {
      opacity: 0,
      x: direction === "left" ? -60 : direction === "right" ? 60 : 0,
      y: direction === "top" ? -60 : direction === "bottom" ? 60 : 0,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 150, damping: 20 },
    },
    exit: {
      opacity: 0,
      x: direction === "left" ? -40 : direction === "right" ? 40 : 0,
      y: direction === "top" ? -40 : direction === "bottom" ? 40 : 0,
      scale: 0.95,
      transition: { duration: 0.15 },
    },
  };

  return (
    <motion.div variants={boxVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}
