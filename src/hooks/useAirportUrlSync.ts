"use client";
import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAirportStore } from "@/src/store/airport-store";
import {
  AIRPORTS,
  DEFAULT_AIRPORT,
  getAirportConfig,
} from "@/constants/airports";

/**
 * Keeps ?airport=<ICAO> and the active airport in sync (single owner of this logic).
 * Returns a switcher that updates the URL; the effect then updates the store + camera.
 */
export function useAirportUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeAirport = useAirportStore((s) => s.activeAirport);
  const setActiveAirport = useAirportStore((s) => s.setActiveAirport);
  const clearSelection = useAirportStore((s) => s.clearSelection);

  const setAirportParam = useCallback(
    (airportId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("airport", airportId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const urlAirport = searchParams.get("airport");
    if (!urlAirport || !AIRPORTS.some((a) => a.id === urlAirport)) {
      setAirportParam(DEFAULT_AIRPORT.id);
      return;
    }
    if (urlAirport === activeAirport) return;

    setActiveAirport(urlAirport);
    clearSelection();
    const { center } = getAirportConfig(urlAirport);
    // Let the map remount its layers for the new airport before flying there
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("switch-airport", {
          detail: { facilityId: urlAirport, coords: [center.lng, center.lat] },
        }),
      );
    }, 150);
  }, [
    searchParams,
    activeAirport,
    setActiveAirport,
    clearSelection,
    setAirportParam,
  ]);

  return { activeAirport, switchAirport: setAirportParam };
}
