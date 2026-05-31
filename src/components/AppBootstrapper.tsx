"use client";

import { ReactNode } from "react";
import { useSocket } from "@/src/hooks/use-socket";

interface AppBootstrapperProps {
  children: ReactNode;
}

/**
 * @description
 * This component runs exactly once when the React app mounts.
 * It triggers Phase 3's `useSocket` hook, which immediately:
 * 1. Hydrates the heavy static data from Redis.
 * 2. Connects the lightweight WebSocket telemetry stream.
 */
export function AppBootstrapper({ children }: AppBootstrapperProps) {
  // Ignite the entire data engine
  useSocket();

  return <>{children}</>;
}
