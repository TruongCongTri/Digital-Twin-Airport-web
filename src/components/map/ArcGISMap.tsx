"use client";
import { useAirportStore } from "@/src/store/airport-store";
import { useEffect, useRef, useCallback, useState, ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Map as MapIcon,
  Globe,
  Moon,
  Navigation,
  Compass,
  Sun,
  Filter,
  X,
} from "lucide-react";

import type SceneView from "@arcgis/core/views/SceneView";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type EsriMap from "@arcgis/core/Map";
import type Point from "@arcgis/core/geometry/Point";
import type Graphic from "@arcgis/core/Graphic";
import type SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import type PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
import type Polyline from "@arcgis/core/geometry/Polyline";
import type SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import type Color from "@arcgis/core/Color";
import { TooltipData } from "@/types";
import { APP_CONFIG } from "@/constants/app.constant";
import { toast } from "sonner";
import { LONG_THANH_COORDS } from "@/constants/airport-coordinate";

type BasemapOption = { id: string; label: string; icon: ElementType };

interface WatchHandle {
  remove: () => void;
}

type TrailData = {
  points: number[][];
  direction: "inbound" | "outbound" | "unknown";
};

const BASEMAP_OPTIONS: BasemapOption[] = [
  { id: "osm-3d", label: "OpenStreetMap 3D", icon: MapIcon },
  { id: "streets-3d", label: "Streets 3D (Đường phố)", icon: Navigation },
  { id: "streets-dark-3d", label: "Streets Dark 3D", icon: Moon },
  { id: "navigation-3d", label: "Navigation 3D", icon: Compass },
  { id: "topo-3d", label: "Topographic 3D (Địa hình)", icon: Globe },
  { id: "gray-3d", label: "Light Canvas (Giản lược)", icon: Sun },
  { id: "dark-gray-3d", label: "Dark Canvas 3D", icon: Layers },
  { id: "satellite", label: "Satellite Imagery 3D", icon: Globe },
];

const GROUND_ACTIVE_STATUSES = [
  "LANDED",
  "TAXIING",
  "PARKED",
  "BOARDING",
  "PUSHBACK",
];

export function ArcGISMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const mapInstanceRef = useRef<EsriMap | null>(null);

  const planeLayerRef = useRef<GraphicsLayer | null>(null);
  const sensorLayerRef = useRef<GraphicsLayer | null>(null);
  const pathLayerRef = useRef<GraphicsLayer | null>(null);
  const staticRoutesLayerRef = useRef<GraphicsLayer | null>(null);
  // ✅ FIX: Added the missing ref for the airline flags
  const airlineLabelLayerRef = useRef<GraphicsLayer | null>(null);

  const flightTrailsRef = useRef<Map<string, TrailData>>(new Map());

  const PointRef = useRef<typeof Point | null>(null);
  const GraphicRef = useRef<typeof Graphic | null>(null);
  const SimpleMarkerRef = useRef<typeof SimpleMarkerSymbol | null>(null);
  const PictureMarkerRef = useRef<typeof PictureMarkerSymbol | null>(null);
  const PolylineRef = useRef<typeof Polyline | null>(null);
  const LineRef = useRef<typeof SimpleLineSymbol | null>(null);
  const ColorRef = useRef<typeof Color | null>(null);

  const [currentBasemap, setCurrentBasemap] = useState("osm-3d");
  const [isBasemapMenuOpen, setIsBasemapMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);
  const updateAllTooltips = useAirportStore((state) => state.updateAllTooltips);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);
  const selectedEntityType = useAirportStore(
    (state) => state.selectedEntityType,
  );

  const mapFilters = useAirportStore((state) => state.mapFilters);
  const toggleMapFilter = useAirportStore((state) => state.toggleMapFilter);

  const handleBasemapChange = useCallback((basemapId: string) => {
    setCurrentBasemap(basemapId);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.basemap = basemapId as string;
    }
    setIsBasemapMenuOpen(false);
  }, []);

  const syncTooltips = useCallback((view: SceneView) => {
    if (!view?.ready || view.destroyed) return;
    const PointClass = PointRef.current;
    if (!PointClass) return;

    const store = useAirportStore.getState();
    const rawTooltips: TooltipData[] = [];

    if (store.mapFilters["planes"]) {
      store.planes.forEach((plane) => {
        if (!GROUND_ACTIVE_STATUSES.includes(plane.status)) return;

        const pt = new PointClass({
          longitude: plane.position.longitude,
          latitude: plane.position.latitude,
        });
        const screen = view.toScreen(pt);
        if (screen) {
          rawTooltips.push({
            entityId: plane.id,
            entityType: "plane",
            screenX: Math.round(screen.x),
            screenY: Math.round(screen.y),
            visible: true,
          });
        }
      });
    }

    store.sensors.forEach((sensor) => {
      if (!store.mapFilters[sensor.type]) return;
      const pt = new PointClass({
        longitude: sensor.position.longitude,
        latitude: sensor.position.latitude,
      });
      const screen = view.toScreen(pt);
      if (screen) {
        rawTooltips.push({
          entityId: sensor.id,
          entityType: "sensor",
          screenX: Math.round(screen.x),
          screenY: Math.round(screen.y),
          visible: true,
        });
      }
    });

    const visibleTooltips: TooltipData[] = [];
    const COLLISION_RADIUS = 40;

    for (const tooltip of rawTooltips) {
      if (tooltip.entityId === store.selectedEntityId) {
        visibleTooltips.push(tooltip);
        continue;
      }
      const hasCollision = visibleTooltips.some(
        (v) =>
          Math.abs(v.screenX - tooltip.screenX) < COLLISION_RADIUS &&
          Math.abs(v.screenY - tooltip.screenY) < COLLISION_RADIUS,
      );
      if (!hasCollision) {
        visibleTooltips.push(tooltip);
      }
    }

    store.updateAllTooltips(visibleTooltips);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let destroyed = false;
    let watchHandle: WatchHandle | null = null;
    let handleMapReset: () => void;

    const init = async () => {
      const [
        { default: ArcMap },
        { default: SceneView },
        { default: GraphicsLayer },
        { default: GraphicClass },
        { default: PointClass },
        { default: SimpleMarkerClass },
        { default: PictureMarkerClass },
        { default: PolylineClass },
        { default: LineClass },
        { default: ColorClass },
        reactiveUtils,
      ] = await Promise.all([
        import("@arcgis/core/Map"),
        import("@arcgis/core/views/SceneView"),
        import("@arcgis/core/layers/GraphicsLayer"),
        import("@arcgis/core/Graphic"),
        import("@arcgis/core/geometry/Point"),
        import("@arcgis/core/symbols/SimpleMarkerSymbol"),
        import("@arcgis/core/symbols/PictureMarkerSymbol"),
        import("@arcgis/core/geometry/Polyline"),
        import("@arcgis/core/symbols/SimpleLineSymbol"),
        import("@arcgis/core/Color"),
        import("@arcgis/core/core/reactiveUtils"),
      ]);

      if (destroyed) return;

      PointRef.current = PointClass;
      GraphicRef.current = GraphicClass;
      SimpleMarkerRef.current = SimpleMarkerClass;
      PictureMarkerRef.current = PictureMarkerClass;
      PolylineRef.current = PolylineClass;
      LineRef.current = LineClass;
      ColorRef.current = ColorClass;

      const map = new ArcMap({ basemap: currentBasemap });
      mapInstanceRef.current = map;

      const staticRoutesLayer = new GraphicsLayer({ title: "Taxi Routes" });
      const pathLayer = new GraphicsLayer({ title: "Paths" });
      const sensorLayer = new GraphicsLayer({
        title: "Sensors",
        screenSizePerspectiveEnabled: false,
      });
      const planeLayer = new GraphicsLayer({
        title: "Planes",
        screenSizePerspectiveEnabled: false,
      });
      const labelLayer = new GraphicsLayer({
        title: "Airline Labels",
        screenSizePerspectiveEnabled: false,
      });

      map.addMany([
        staticRoutesLayer,
        pathLayer,
        sensorLayer,
        planeLayer,
        labelLayer,
      ]);

      staticRoutesLayerRef.current = staticRoutesLayer;
      airlineLabelLayerRef.current = labelLayer;

      const view = new SceneView({
        container: mapContainerRef.current!,
        map,
        center: [APP_CONFIG.COORDINATE.X, APP_CONFIG.COORDINATE.Y],
        zoom: 15,
        environment: {
          background: { type: "color", color: [247, 247, 248, 1] },
          atmosphereEnabled: false,
          starsEnabled: false,
        },
        ui: { components: [] },
      });

      viewRef.current = view;
      planeLayerRef.current = planeLayer;
      sensorLayerRef.current = sensorLayer;
      pathLayerRef.current = pathLayer;

      await view.when();
      if (destroyed) return;

      sensors.forEach((sensor) => {
        const statusColor =
          sensor.status === "ACTIVE"
            ? [34, 197, 94]
            : sensor.status === "WARNING"
              ? [245, 158, 11]
              : [239, 68, 68];
        sensorLayer.add(
          new GraphicClass({
            geometry: new PointClass({
              longitude: sensor.position.longitude,
              latitude: sensor.position.latitude,
            }),
            symbol: new SimpleMarkerClass({
              style: "square",
              color: new ColorClass([...statusColor, 0.8]),
              size: 10,
              outline: { color: [255, 255, 255, 0.8], width: 1.5 },
            }),
            attributes: { id: sensor.id, type: "sensor" },
          }),
        );
      });

      const terminals = ["T1", "T2", "T3"] as const;

      terminals.forEach((term) => {
        const routes = LONG_THANH_COORDS.ROUTES[term];

        const inboundGraphic = new GraphicClass({
          geometry: new PolylineClass({
            paths: [routes.inbound.map((pt) => [pt.lng, pt.lat])],
          }),
          symbol: new LineClass({
            color: new ColorClass([16, 185, 129, 0.35]),
            width: 3,
            style: "short-dash",
          }),
        });

        const outboundGraphic = new GraphicClass({
          geometry: new PolylineClass({
            paths: [routes.outbound.map((pt) => [pt.lng, pt.lat])],
          }),
          symbol: new LineClass({
            color: new ColorClass([245, 158, 11, 0.35]),
            width: 3,
            style: "short-dash",
          }),
        });

        staticRoutesLayer.addMany([inboundGraphic, outboundGraphic]);
      });

      view.on("click", async (event) => {
        try {
          const response = await view.hitTest(event);
          const hit = response.results.find(
            (r) => r.type === "graphic" && r.graphic?.attributes?.type,
          );
          if (hit && hit.type === "graphic") {
            const { id, type } = hit.graphic.attributes;
            // Ignore label clicks since they belong to planes
            if (type !== "label") {
              selectEntity(id, type);
            }
          }
        } catch (error) {
          console.error("HitTest Error:", error);
        }
      });

      handleMapReset = () => {
        if (!view.destroyed) {
          view.goTo(
            {
              center: [APP_CONFIG.COORDINATE.X, APP_CONFIG.COORDINATE.Y],
              zoom: 15,
              tilt: 60,
            },
            { duration: 1500, easing: "ease-in-out" },
          );
        }
      };
      window.addEventListener("reset-map-view", handleMapReset);

      let hoverDebounce: ReturnType<typeof setTimeout>;
      view.on("pointer-move", (event) => {
        clearTimeout(hoverDebounce);
        hoverDebounce = setTimeout(async () => {
          try {
            if (view.destroyed) return;
            const response = await view.hitTest(event);
            const hit = response.results.find(
              (r) =>
                r.type === "graphic" &&
                (r.graphic?.attributes?.type === "plane" ||
                  r.graphic?.attributes?.type === "sensor"),
            );
            window.dispatchEvent(
              new CustomEvent("setMapCursor", {
                detail: { type: hit ? "pointer" : "default" },
              }),
            );
          } catch (err) {}
        }, 12);
      });

      watchHandle = reactiveUtils.watch(
        () => view?.camera,
        () => {
          if (!destroyed && view && !view.destroyed) {
            syncTooltips(view);
          }
        },
      );

      await syncTooltips(view);
    };

    init();
    return () => {
      destroyed = true;
      if (watchHandle) watchHandle.remove();
      if (handleMapReset)
        window.removeEventListener("reset-map-view", handleMapReset);
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  // Main Graphics Rendering Loop
  useEffect(() => {
    const PointClass = PointRef.current;
    const GraphicClass = GraphicRef.current;
    const PictureMarkerClass = PictureMarkerRef.current;
    const PolylineClass = PolylineRef.current;
    const LineClass = LineRef.current;
    const ColorClass = ColorRef.current;

    if (
      !planeLayerRef.current ||
      !pathLayerRef.current ||
      !viewRef.current?.ready
    )
      return;
    if (
      !PointClass ||
      !GraphicClass ||
      !PictureMarkerClass ||
      !PolylineClass ||
      !LineClass ||
      !ColorClass
    )
      return;

    pathLayerRef.current.removeAll();

    planes.forEach((plane) => {
      const existingPlane = planeLayerRef.current?.graphics.find(
        (g) => g.attributes.id === plane.id,
      );
      const existingText = airlineLabelLayerRef.current?.graphics.find(
        (g) => g.attributes.id === `${plane.id}_text`,
      );
      const existingLogo = airlineLabelLayerRef.current?.graphics.find(
        (g) => g.attributes.id === `${plane.id}_logo`,
      );

      // Clean up planes that aren't ground active
      if (!GROUND_ACTIVE_STATUSES.includes(plane.status)) {
        if (existingPlane) planeLayerRef.current?.remove(existingPlane);
        if (existingText) airlineLabelLayerRef.current?.remove(existingText);
        if (existingLogo) airlineLabelLayerRef.current?.remove(existingLogo);
        flightTrailsRef.current.delete(plane.id);
        return;
      }

      // --- 1. DRAW PLANE ICON ---
      let trailData = flightTrailsRef.current.get(plane.id);
      if (!trailData) {
        trailData = {
          points: [],
          direction: ["LANDED", "APPROACHING"].includes(plane.status)
            ? "inbound"
            : "outbound",
        };
      }
      if (["LANDED", "APPROACHING"].includes(plane.status))
        trailData.direction = "inbound";
      if (plane.status === "PUSHBACK") trailData.direction = "outbound";

      let visualHeading = plane.heading;
      if (trailData.direction === "inbound")
        visualHeading = (visualHeading + 180) % 360;

      const planeGeom = new PointClass({
        longitude: plane.position.longitude,
        latitude: plane.position.latitude,
      });

      if (existingPlane) {
        existingPlane.geometry = planeGeom;
        if (existingPlane.symbol) {
          const symbol = existingPlane.symbol.clone() as PictureMarkerSymbol;
          symbol.angle = visualHeading;
          existingPlane.symbol = symbol;
        }
      } else {
        planeLayerRef.current?.add(
          new GraphicClass({
            geometry: planeGeom,
            symbol: new PictureMarkerClass({
              url: "/plane.svg",
              width: "28px",
              height: "28px",
              angle: visualHeading,
            }),
            attributes: { id: plane.id, type: "plane" },
          }),
        );
      }

      // --- 2. DRAW AIRLINE FLAG (TEXT) ---
      // const textGraphic = new GraphicClass({
      //   geometry: planeGeom,
      //   symbol: {
      //     type: "text",
      //     text: ` ${plane.airline}`,
      //     color: "white",
      //     backgroundColor: [30, 58, 138, 0.9],
      //     borderLineColor: "white",
      //     borderLineSize: 1,
      //     yoffset: 35,
      //     xoffset: 12,
      //     horizontalAlignment: "left",
      //     font: { size: 9, weight: "bold", family: "sans-serif" }
      //   } as any,
      //   attributes: { id: `${plane.id}_text`, type: "label" }
      // });

      // if (existingText) existingText.geometry = planeGeom;
      // else airlineLabelLayerRef.current?.add(textGraphic);

      // --- 3. DRAW AIRLINE FLAG (LOGO) ---
      if (plane.logoUrl) {
        const logoGraphic = new GraphicClass({
          geometry: planeGeom,
          symbol: new PictureMarkerClass({
            url: plane.logoUrl,
            width: "40px",
            height: "40px",
            yoffset: 35,
            xoffset: -6,
          }),
          attributes: { id: `${plane.id}_logo`, type: "label" },
        });

        if (existingLogo) existingLogo.geometry = planeGeom;
        else airlineLabelLayerRef.current?.add(logoGraphic);
      }

      // --- 4. DRAW GROUND TRAIL ---
      const newLng = plane.position.longitude;
      const newLat = plane.position.latitude;
      const lastPt = trailData.points[trailData.points.length - 1];

      if (!lastPt || lastPt[0] !== newLng || lastPt[1] !== newLat) {
        trailData.points.push([newLng, newLat]);
      }
      flightTrailsRef.current.set(plane.id, trailData);

      if (trailData.points.length > 1) {
        const trailColor =
          trailData.direction === "inbound"
            ? [6, 182, 212, 1]
            : [217, 70, 239, 1];
        pathLayerRef.current?.add(
          new GraphicClass({
            geometry: new PolylineClass({ paths: [trailData.points] }),
            symbol: new LineClass({
              style: "solid",
              color: new ColorClass(trailColor),
              width: 4,
            }),
            attributes: { planeId: plane.id },
          }),
        );
      }
    });

    syncTooltips(viewRef.current);
  }, [planes, syncTooltips]);

  const trackingRef = useRef<number | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.destroyed) return;

    if (trackingRef.current) cancelAnimationFrame(trackingRef.current);

    if (!selectedEntityId) {
      view.goTo(
        {
          center: [APP_CONFIG.COORDINATE.X, APP_CONFIG.COORDINATE.Y],
          zoom: 15,
          tilt: 60,
        },
        { duration: 1500, easing: "ease-in-out" },
      );
      return;
    }

    const store = useAirportStore.getState();
    const targetPlane = store.planes.find((p) => p.id === selectedEntityId);
    const targetSensor = store.sensors.find((s) => s.id === selectedEntityId);

    if (targetPlane && !GROUND_ACTIVE_STATUSES.includes(targetPlane.status)) {
      toast.info(
        `Flight ${targetPlane.flightNumber || targetPlane.callsign} is not active on the ground.`,
      );
      view.goTo(
        {
          center: [APP_CONFIG.COORDINATE.X, APP_CONFIG.COORDINATE.Y],
          zoom: 15,
          tilt: 60,
        },
        { duration: 1500, easing: "ease-in-out" },
      );
      return;
    }

    const target = targetPlane || targetSensor;
    if (!target?.position) return;

    view.goTo(
      {
        center: [target.position.longitude, target.position.latitude],
        zoom: 21.5,
        tilt: 65,
      },
      { duration: 1200, easing: "ease-in-out" },
    );

    const handleRecenter = () => {
      const currentStore = useAirportStore.getState();
      const currentTarget =
        currentStore.planes.find((p) => p.id === selectedEntityId) ||
        currentStore.sensors.find((s) => s.id === selectedEntityId);
      if (currentTarget?.position && !view.destroyed) {
        view.goTo(
          {
            center: [
              currentTarget.position.longitude,
              currentTarget.position.latitude,
            ],
            zoom: 21.5,
            tilt: 65,
          },
          { duration: 1000, easing: "ease-in-out" },
        );
      }
    };
    window.addEventListener("recenter-entity", handleRecenter);

    if (selectedEntityType === "plane") {
      const plane = store.planes.find((p) => p.id === selectedEntityId);
      if (
        plane &&
        ["TAXIING", "APPROACHING", "PUSHBACK"].includes(plane.status)
      ) {
        let lastTime = 0;
        const track = (time: number) => {
          if (time - lastTime > 2000) {
            if (!view.interacting && !view.navigating) {
              const currentPlane = useAirportStore
                .getState()
                .planes.find((p) => p.id === selectedEntityId);
              if (currentPlane?.position) {
                view.goTo(
                  {
                    center: [
                      currentPlane.position.longitude,
                      currentPlane.position.latitude,
                    ],
                  },
                  { duration: 1000 },
                );
              }
            }
            lastTime = time;
          }
          trackingRef.current = requestAnimationFrame(track);
        };
        trackingRef.current = requestAnimationFrame(track);
      }
    }

    return () => {
      if (trackingRef.current) cancelAnimationFrame(trackingRef.current);
      window.removeEventListener("recenter-entity", handleRecenter);
    };
  }, [selectedEntityId, selectedEntityType]);

  return (
    <>
      <div
        id="map-container"
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: "#f7f7f8" }}
        data-cursor="zoom"
      />

      <div className="absolute bottom-8 left-6 z-40 pointer-events-auto flex flex-col items-start">
        <AnimatePresence>
          {isBasemapMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="mb-3 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-xl overflow-hidden flex flex-col origin-bottom-left"
            >
              <div className="bg-gray-50/80 p-2.5 border-b border-gray-200/60 flex items-center gap-2">
                <Layers size={14} className="text-[#1e3a8a]" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Topology Matrix
                </span>
              </div>
              <div className="p-1 max-h-64 overflow-y-auto custom-scrollbar flex flex-col">
                {BASEMAP_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = currentBasemap === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleBasemapChange(option.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#1e3a8a] text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={isActive ? "opacity-100" : "opacity-60"}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsBasemapMenuOpen(!isBasemapMenuOpen)}
          className={`flex items-center justify-center p-3.5 rounded-2xl shadow-lg border transition-all ${
            isBasemapMenuOpen
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white/95 backdrop-blur-md text-gray-700 border-gray-200/80 hover:bg-gray-50 hover:text-[#1e3a8a]"
          }`}
        >
          <Layers size={20} />
        </motion.button>
      </div>

      <div className="absolute bottom-8 right-[464px] z-40 pointer-events-auto flex flex-col items-end">
        <AnimatePresence>
          {isFilterMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="mb-3 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-xl overflow-hidden flex flex-col origin-bottom-right"
            >
              <div className="bg-gray-50/80 p-2.5 border-b border-gray-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-[#1e3a8a]" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Map Filters
                  </span>
                </div>
                <button
                  onClick={() => setIsFilterMenuOpen(false)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                {Object.keys(mapFilters).map((key) => {
                  const isActive = mapFilters[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleMapFilter(key)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-blue-50 text-[#1e3a8a]"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{key.replace(/_/g, " ")}</span>
                      <div
                        className={`w-3 h-3 rounded-full border ${isActive ? "bg-[#1e3a8a] border-[#1e3a8a]" : "border-gray-300"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          className={`flex items-center justify-center p-3.5 rounded-2xl shadow-lg border transition-all ${
            isFilterMenuOpen
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white/95 backdrop-blur-md text-gray-700 border-gray-200/80 hover:bg-gray-50 hover:text-[#1e3a8a]"
          }`}
        >
          <Filter size={20} />
        </motion.button>
      </div>
    </>
  );
}
