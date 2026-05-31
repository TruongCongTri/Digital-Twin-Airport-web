"use client";
import { useEffect, useRef, useState } from "react";

export type CursorType = "default" | "pointer" | "text" | "crosshair" | "lens";

export function useCustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorType, setCursorType] = useState<CursorType>("default");

  // ✅ OPTIMIZATION 3: Synchronous guard to prevent redundant React renders
  const currentTypeRef = useRef<CursorType>("default");

  useEffect(() => {
    // Helper to safely trigger React state only when it actually changes
    const updateCursorState = (newType: CursorType) => {
      if (currentTypeRef.current !== newType) {
        currentTypeRef.current = newType;
        setCursorType(newType);
      }
    };

    // ✅ OPTIMIZATION 1: requestAnimationFrame syncs movement to monitor refresh rate
    let rafId: number | null = null;
    let mouseX = 0;
    let mouseY = 0;

    const updatePosition = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
          }
          rafId = null;
        });
      }
    };

    // 2. Detect what we are hovering over
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1. Check for the new "Lens" trigger on numbers
      if (target.closest('[data-cursor="lens"]')) {
        updateCursorState("lens");
        return;
      }

      // 2. Check for Graphs (Crosshair)
      if (target.closest('[data-cursor="crosshair"]')) {
        updateCursorState("crosshair");
        return;
      }

      // ✅ OPTIMIZATION 2: If we are hovering over the ArcGIS Map, DO NOT override.
      // We must let the map's hit-test logic control the cursor via 'setMapCursor'
      if (
        target.closest("#map-container") ||
        target.closest(".esri-view-surface")
      ) {
        return;
      }

      // 3. Check for standard clickable UI
      if (target.closest('button, a, select, input, [role="button"], tr, th')) {
        updateCursorState("pointer");
        return;
      }

      // Revert to normal
      updateCursorState("default");
    };

    // 4. Custom Event Listener so ArcGISMap can trigger pointer state
    const handleMapHover = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: CursorType }>;
      if (customEvent.detail && customEvent.detail.type) {
        updateCursorState(customEvent.detail.type);
      }
    };

    window.addEventListener("mousemove", updatePosition, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("setMapCursor", handleMapHover as EventListener);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener(
        "setMapCursor",
        handleMapHover as EventListener,
      );
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { cursorRef, cursorType };
}
