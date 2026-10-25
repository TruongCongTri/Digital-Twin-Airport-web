"use client";
import { useEffect, useState } from "react";

export interface Occlusion {
  left: number;
  right: number;
}

/**
 * How much of the map viewport (from its left / right edge, in px) is covered by
 * floating overlay columns rendered inside `[data-viewport-overlay]`. Used as view
 * padding so a focused entity is centred in the part of the map that is visible.
 */
export function useViewportOcclusion(): Occlusion {
  const [occlusion, setOcclusion] = useState<Occlusion>({ left: 0, right: 0 });

  useEffect(() => {
    const GAP = 12;
    const measure = () => {
      const container = document.getElementById("map-container");
      const overlay = document.querySelector("[data-viewport-overlay]");
      let left = 0;
      let right = 0;
      if (container && overlay) {
        const view = container.getBoundingClientRect();
        const mid = view.left + view.width / 2;
        for (const el of Array.from(
          overlay.querySelectorAll(":scope > *, :scope > * > *"),
        )) {
          const r = (el as HTMLElement).getBoundingClientRect();
          // Only tall floating columns count (skip buttons / tooltips)
          if (r.width < 120 || r.height < view.height * 0.4) continue;
          if (r.left + r.width / 2 < mid)
            left = Math.max(left, r.right - view.left + GAP);
          else right = Math.max(right, view.right - r.left + GAP);
        }
      }
      setOcclusion((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right },
      );
    };

    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      mutations.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return occlusion;
}
