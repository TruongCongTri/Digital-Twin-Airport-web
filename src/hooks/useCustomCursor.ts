import { useEffect, useRef, useState } from "react";

export type CursorType = "default" | "pointer" | "text" | "crosshair" | "lens";

export function useCustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorType, setCursorType] = useState<CursorType>("default");

  useEffect(() => {
    // 1. Direct DOM manipulation for movement (Zero React lag)
    const updatePosition = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    // 2. Detect what we are hovering over
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1. Check for the new "Lens" trigger on numbers
      const lensTarget = target.closest('[data-cursor="lens"]');
      if (lensTarget) {
        setCursorType("lens");
        return;
      }

      // 2. Check for Graphs (Crosshair)
      if (target.closest('[data-cursor="crosshair"]')) {
        setCursorType("crosshair");
        return;
      }

      // 3. Check for standard clickable UI
      if (target.closest('button, a, select, [role="button"], tr, th')) {
        setCursorType("pointer");
        return;
      }

      // Revert to normal
      setCursorType("default");
    };

    // 4. Custom Event Listener so ArcGISMap can trigger pointer state
    const handleMapHover = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: CursorType }>;
      if (customEvent.detail && customEvent.detail.type) {
        setCursorType(customEvent.detail.type);
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
    };
  }, []);

  return { cursorRef, cursorType };
}
