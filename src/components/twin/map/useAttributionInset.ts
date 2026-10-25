"use client";
import { useEffect, useState } from "react";

/**
 * Distance (px) from the bottom of the map container to the top of the ArcGIS
 * attribution strip. It grows when the attribution is clicked open, so overlays
 * anchored to the bottom of the viewport can sit above it instead of covering it.
 */
export function useAttributionInset(fallback = 20) {
  const [inset, setInset] = useState(fallback);

  useEffect(() => {
    let observed: Element | null = null;
    const resize = new ResizeObserver(() => measure());

    function measure() {
      // The map (and its attribution) mounts lazily and is rebuilt per airport
      const container = document.getElementById("map-container");
      const el = container?.querySelector(".esri-attribution") ?? null;
      if (el !== observed) {
        if (observed) resize.unobserve(observed);
        if (el) resize.observe(el);
        observed = el;
      }
      if (!container || !el) return;
      const next = Math.max(
        0,
        Math.round(
          container.getBoundingClientRect().bottom -
            el.getBoundingClientRect().top,
        ),
      );
      setInset((prev) => (prev === next ? prev : next));
    }

    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    measure();

    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);

  return inset;
}
