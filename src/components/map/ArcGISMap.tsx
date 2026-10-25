"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import type Collection from "@arcgis/core/core/Collection";
import type Layer from "@arcgis/core/layers/Layer";
import type SceneView from "@arcgis/core/views/SceneView";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type EsriMap from "@arcgis/core/Map";
import type Point from "@arcgis/core/geometry/Point";
import type Graphic from "@arcgis/core/Graphic";
import type PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
import type Polyline from "@arcgis/core/geometry/Polyline";
import type SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import type Color from "@arcgis/core/Color";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import type Polygon from "@arcgis/core/geometry/Polygon";
import type SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import type PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D";
import type ObjectSymbol3DLayer from "@arcgis/core/symbols/ObjectSymbol3DLayer";
import type Camera from "@arcgis/core/Camera";

// The ArcGIS theme CSS is injected from the CDN by arcgis-modules, so the 340KB
// stylesheet never blocks the first paint of the rest of the UI.
import { loadArcGISModules } from "./arcgis-modules";

import type { Plane, Sensor, TooltipData, Vehicle } from "@/types";
import { getAirportConfig, type AirportConfig } from "@/constants/airports";
import { useAirportStore } from "@/src/store/airport-store";
import { useUIStore } from "@/src/store/useUIStore";
import {
  getSensorPlacements,
  type SensorPlacement,
} from "@/src/lib/sensor-placement";
import {
  getSensorHealth,
  HEALTH_STYLES,
  normalizeSensorValue,
} from "@/src/lib/sensor-meta";
import { loadBimManifest } from "@/src/lib/bim-manifest";
import { onMapCommand } from "@/src/lib/map-commands";
import { useViewportOcclusion } from "@/src/components/twin/map/useViewportOcclusion";

type CoordPoint = { lat: number; lng: number };
const toRing = (area: CoordPoint[]) => area.map((p) => [p.lng, p.lat]);

interface WatchHandle {
  remove: () => void;
}

const AIRBORNE_STATUSES = [
  "AIRBORNE",
  "EN_ROUTE",
  "EN ROUTE",
  "IN_AIR",
  "IN AIR",
  "APPROACHING",
  "DEPARTED",
  "SCHEDULED",
];
const HOME_ORIGINS = ["SGN", "VVTS", "HO CHI MINH", "LONG THANH"];
const OUTBOUND_STATUSES = ["PUSHBACK", "DEPARTED", "SCHEDULED", "BOARDING"];
const INBOUND_STATUSES = ["APPROACHING", "LANDED"];
const GROUND_STATUSES = ["TAXIING", "PUSHBACK", "LANDED"];

const isPlaneOnGround = (plane: Plane) => {
  const status = (plane.status || "").toUpperCase();
  const direction = (plane.direction || "").toUpperCase();
  if (!direction || direction === "UNKNOWN") return false;
  if (AIRBORNE_STATUSES.includes(status)) return false;
  if (typeof plane.altitude === "number" && plane.altitude > 100) return false;
  return true;
};

const isPlaneOutbound = (plane: Plane) => {
  const statusStr = (plane.status || "UNKNOWN").toUpperCase();
  if (OUTBOUND_STATUSES.includes(statusStr)) return true;
  if (INBOUND_STATUSES.includes(statusStr)) return false;
  return HOME_ORIGINS.some((kw) =>
    (plane.origin || "").toUpperCase().includes(kw),
  );
};

const getLon = (e: { position?: { longitude?: number } }) =>
  e.position?.longitude ?? 0;
const getLat = (e: { position?: { latitude?: number } }) =>
  e.position?.latitude ?? 0;

// Home camera per airport: BIM airports open closer and tilted to read the building
const homeCamera = (airport: AirportConfig) => ({
  center: [airport.center.lng, airport.center.lat],
  zoom: airport.model ? 17 : 15,
  tilt: airport.model ? 58 : 45,
  heading: 0,
});

// Camera framing for a selected entity: distance (m) from the look-at point and tilt.
// BIM airports frame closely inside the building; site airports keep a wider view.
type SelectionKind = "sensor-indoor" | "sensor-outdoor" | "plane" | "vehicle";
const FRAMING: Record<
  "bim" | "site",
  Record<SelectionKind, { distance: number; tilt: number }>
> = {
  bim: {
    "sensor-indoor": { distance: 38, tilt: 62 },
    "sensor-outdoor": { distance: 110, tilt: 62 },
    plane: { distance: 140, tilt: 60 },
    vehicle: { distance: 65, tilt: 60 },
  },
  site: {
    "sensor-indoor": { distance: 420, tilt: 58 },
    "sensor-outdoor": { distance: 520, tilt: 58 },
    plane: { distance: 450, tilt: 58 },
    vehicle: { distance: 260, tilt: 58 },
  },
};
const METRES_PER_DEG = 111_320;

/**
 * Camera pose that looks straight at (lon, lat, z) from `distance` metres, keeping the
 * current heading. Unlike goTo({ center }), this honours the target's elevation, so
 * sensors on upper storeys end up centred instead of floating above the frame.
 */
const lookAtPose = (
  lon: number,
  lat: number,
  z: number,
  distance: number,
  tilt: number,
  heading: number,
) => {
  const h = (heading * Math.PI) / 180;
  const t = (tilt * Math.PI) / 180;
  const horizontal = distance * Math.sin(t);
  const east = -Math.sin(h) * horizontal;
  const north = -Math.cos(h) * horizontal;
  return {
    position: {
      longitude:
        lon + east / (METRES_PER_DEG * Math.cos((lat * Math.PI) / 180)),
      latitude: lat + north / METRES_PER_DEG,
      z: z + distance * Math.cos(t),
      spatialReference: { wkid: 4326 },
    },
    heading,
    tilt,
  };
};

// Badge priority: selected > critical > warning > aircraft > vehicles > normal > offline
const BADGE_PRIORITY = {
  critical: 1,
  warning: 2,
  plane: 3,
  vehicle: 4,
  normal: 5,
  offline: 6,
};

const EMPTY_VEHICLES: Vehicle[] = [];

export function ArcGISMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const mapInstanceRef = useRef<EsriMap | null>(null);

  const planeLayerRef = useRef<GraphicsLayer | null>(null);
  const sensorLayerRef = useRef<GraphicsLayer | null>(null);
  const vehicleLayerRef = useRef<GraphicsLayer | null>(null);
  const pathLayerRef = useRef<GraphicsLayer | null>(null);
  const airlineLabelLayerRef = useRef<GraphicsLayer | null>(null);
  const footprintLayerRef = useRef<GraphicsLayer | null>(null);
  const maskLayerRef = useRef<GraphicsLayer | null>(null);
  const heatmapLayerRef = useRef<FeatureLayer | null>(null);
  const bimLayerRef = useRef<GraphicsLayer | null>(null);
  const heatmapSensorIdsRef = useRef<string[]>([]);
  const heatmapEditPendingRef = useRef(false);
  // Last rendered column per sensor + the visual key it was built for, so unchanged
  // columns are not rebuilt on every telemetry tick
  const sensorGraphicsRef = useRef<
    Map<string, { graphic: Graphic; key: string }>
  >(new Map());

  const FeatureLayerRef = useRef<typeof FeatureLayer | null>(null);
  const HeatmapRendererRef = useRef<typeof HeatmapRenderer | null>(null);
  const PointRef = useRef<typeof Point | null>(null);
  const CameraRef = useRef<typeof Camera | null>(null);
  const GraphicRef = useRef<typeof Graphic | null>(null);
  const PointSymbol3DRef = useRef<typeof PointSymbol3D | null>(null);
  const ObjectSymbol3DLayerRef = useRef<typeof ObjectSymbol3DLayer | null>(
    null,
  );
  const PictureMarkerRef = useRef<typeof PictureMarkerSymbol | null>(null);
  const PolylineRef = useRef<typeof Polyline | null>(null);
  const LineRef = useRef<typeof SimpleLineSymbol | null>(null);
  const ColorRef = useRef<typeof Color | null>(null);
  const PolygonRef = useRef<typeof Polygon | null>(null);
  const SimpleFillRef = useRef<typeof SimpleFillSymbol | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [bimReady, setBimReady] = useState(false);

  const activeAirport = useAirportStore((state) => state.activeAirport);
  const planes = useAirportStore((state) => state.planes);
  const sensors = useAirportStore((state) => state.sensors);
  const vehicles = useAirportStore((state) => state.vehicles ?? EMPTY_VEHICLES);
  const selectEntity = useAirportStore((state) => state.selectEntity);
  const selectedEntityId = useAirportStore((state) => state.selectedEntityId);
  const selectedEntityType = useAirportStore(
    (state) => state.selectedEntityType,
  );
  const isImmersiveActive = useAirportStore((state) => state.isImmersiveActive);
  const focusedSensor = useAirportStore((state) => state.getSelectedSensor());
  const mapFilters = useAirportStore((state) => state.mapFilters);

  const basemap = useUIStore((state) => state.basemap);
  const bimXray = useUIStore((state) => state.bimXray);
  const hiddenStoreys = useUIStore((state) => state.hiddenStoreys);
  const occlusion = useViewportOcclusion();
  const autoSection = useUIStore((state) => state.autoSection);

  const placementsFor = useCallback(
    (list: Sensor[]) =>
      getSensorPlacements(
        list,
        getAirportConfig(useAirportStore.getState().activeAirport),
      ),
    [],
  );

  // --- Frame the current selection (sensor column top, aircraft or vehicle) ---
  const focusSelection = useCallback(
    (duration: number) => {
      const view = viewRef.current;
      const CameraClass = CameraRef.current;
      if (!view || view.destroyed || !view.ready || !CameraClass) return;
      const store = useAirportStore.getState();
      const framing =
        FRAMING[getAirportConfig(store.activeAirport).model ? "bim" : "site"];

      let target: {
        lon: number;
        lat: number;
        z: number;
        kind: SelectionKind;
      } | null = null;
      const sensor = store.getSelectedSensor();
      if (sensor) {
        const p = placementsFor(store.sensors).get(sensor.id);
        // Look at the column top: at these framing distances the column below it and the
        // expanded badge above it are about the same height, so the pair is centred
        if (p) {
          target = {
            lon: p.lon,
            lat: p.lat,
            z: p.z + p.columnHeight,
            kind:
              p.environment === "indoor" ? "sensor-indoor" : "sensor-outdoor",
          };
        }
      } else {
        const plane = store.getSelectedPlane();
        const vehicle = store.getSelectedVehicle();
        const entity = plane ?? vehicle;
        if (entity)
          target = {
            lon: getLon(entity),
            lat: getLat(entity),
            z: plane ? 10 : 5,
            kind: plane ? "plane" : "vehicle",
          };
      }
      if (!target) return;

      const { distance, tilt } = framing[target.kind];
      const pose = lookAtPose(
        target.lon,
        target.lat,
        target.z,
        distance,
        tilt,
        view.camera.heading || 0,
      );
      view
        .goTo(new CameraClass(pose), { duration, easing: "ease-in-out" })
        .catch(() => undefined);
    },
    [placementsFor],
  );

  // --- Screen-space badges (positions + collision culling; MapBadges renders them) ---
  const syncTooltips = useCallback(
    (view: SceneView) => {
      if (!view?.ready || view.destroyed) return;
      const PointClass = PointRef.current;
      if (!PointClass) return;

      const store = useAirportStore.getState();
      const raw: (TooltipData & { priority: number })[] = [];
      const toScreen = (lon: number, lat: number, z: number) =>
        view.toScreen(
          new PointClass({
            longitude: lon,
            latitude: lat,
            z,
            spatialReference: { wkid: 4326 },
          }),
        );

      if (
        store.mapFilters["planes"] !== false &&
        store.mapFilters["tooltips_planes"] !== false
      ) {
        store.planes.forEach((plane) => {
          if (!isPlaneOnGround(plane)) return;
          const screen = toScreen(getLon(plane), getLat(plane), 15);
          if (screen)
            raw.push({
              entityId: plane.id,
              entityType: "plane",
              screenX: Math.round(screen.x),
              screenY: Math.round(screen.y),
              visible: true,
              priority: BADGE_PRIORITY.plane,
            });
        });
      }

      if (
        store.mapFilters["vehicles"] !== false &&
        store.mapFilters["tooltips_vehicles"] !== false
      ) {
        store.vehicles?.forEach((vehicle) => {
          if (vehicle.status === "EXITING") return;
          const screen = toScreen(getLon(vehicle), getLat(vehicle), 5);
          if (screen)
            raw.push({
              entityId: vehicle.id,
              entityType: "vehicle",
              screenX: Math.round(screen.x),
              screenY: Math.round(screen.y),
              visible: true,
              priority: BADGE_PRIORITY.vehicle,
            });
        });
      }

      const placements = placementsFor(store.sensors);
      store.sensors.forEach((sensor) => {
        if (
          store.mapFilters[sensor.type] === false ||
          store.mapFilters[`tooltips_${sensor.type}`] === false
        )
          return;
        const p = placements.get(sensor.id);
        if (!p) return;
        // Anchor at the top of the column track (or the sensor point if columns are hidden)
        const columnsOn =
          store.mapFilters[`cylinders_${sensor.type}`] !== false;
        const screen = toScreen(
          p.lon,
          p.lat,
          p.z + (columnsOn ? p.columnHeight : 0) + 0.5,
        );
        if (screen)
          raw.push({
            entityId: sensor.id,
            entityType: "sensor",
            screenX: Math.round(screen.x),
            screenY: Math.round(screen.y),
            visible: true,
            priority:
              BADGE_PRIORITY[
                getSensorHealth(sensor.type, sensor.currentValue, sensor.status)
              ],
          });
      });

      // Place higher-priority badges first so alerts are never culled behind normal readings
      raw.sort(
        (a, b) =>
          (a.entityId === store.selectedEntityId ? -1 : a.priority) -
          (b.entityId === store.selectedEntityId ? -1 : b.priority),
      );

      const visible: TooltipData[] = [];
      const BADGE_W = 86;
      const BADGE_H = 26;
      for (const t of raw) {
        const tooltip: TooltipData = {
          entityId: t.entityId,
          entityType: t.entityType,
          screenX: t.screenX,
          screenY: t.screenY,
          visible: true,
        };
        if (t.entityId === store.selectedEntityId) {
          visible.push(tooltip);
          continue;
        }
        const collides = visible.some(
          (v) =>
            Math.abs(v.screenX - t.screenX) < BADGE_W &&
            Math.abs(v.screenY - t.screenY) < BADGE_H,
        );
        if (!collides) visible.push(tooltip);
      }
      store.updateAllTooltips(visible);
    },
    [placementsFor],
  );

  // --- BIM storey symbols (X-ray = translucent model so indoor sensors stay visible) ---
  const buildBimSymbol = useCallback(
    (href: string, heading: number, xray: boolean) => {
      const PointSymbol3DClass = PointSymbol3DRef.current!;
      const ObjectSymbol3DLayerClass = ObjectSymbol3DLayerRef.current!;
      return new PointSymbol3DClass({
        symbolLayers: [
          new ObjectSymbol3DLayerClass({
            resource: { href },
            anchor: "origin",
            heading,
            ...(xray && { material: { color: [255, 255, 255, 0.28] } }),
          }),
        ],
      });
    },
    [],
  );

  // --- Map initialisation (re-runs per airport) ---
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let destroyed = false;
    let watchHandle: WatchHandle | null = null;
    let handleMapReset: () => void;
    let rAFId: number;

    const init = async () => {
      const [
        { default: ArcMap },
        { default: SceneView },
        { default: GraphicsLayer },
        { default: GraphicClass },
        { default: PointClass },
        { default: PointSymbol3DClass },
        { default: ObjectSymbol3DLayerClass },
        { default: PictureMarkerClass },
        { default: PolylineClass },
        { default: LineClass },
        { default: ColorClass },
        { default: FeatureLayerClass },
        { default: HeatmapRendererClass },
        { default: PolygonClass },
        { default: SimpleFillClass },
        reactiveUtils,
        { default: CameraClass },
      ] = await loadArcGISModules();

      if (destroyed) return;
      PointRef.current = PointClass;
      CameraRef.current = CameraClass;
      GraphicRef.current = GraphicClass;
      PointSymbol3DRef.current = PointSymbol3DClass;
      ObjectSymbol3DLayerRef.current = ObjectSymbol3DLayerClass;
      PictureMarkerRef.current = PictureMarkerClass;
      PolylineRef.current = PolylineClass;
      LineRef.current = LineClass;
      ColorRef.current = ColorClass;
      FeatureLayerRef.current = FeatureLayerClass;
      HeatmapRendererRef.current = HeatmapRendererClass;
      PolygonRef.current = PolygonClass;
      SimpleFillRef.current = SimpleFillClass;

      const airport = getAirportConfig(activeAirport);
      const map = new ArcMap({ basemap: useUIStore.getState().basemap });
      mapInstanceRef.current = map;

      // Pavement + BIM building for airports the basemap does not show (greenfield sites)
      const pavementLayer = new GraphicsLayer({
        title: "Airfield Pavement",
        elevationInfo: { mode: "on-the-ground" },
      });
      const bimLayer = new GraphicsLayer({
        title: "Terminal BIM Model",
        elevationInfo: { mode: "relative-to-ground", offset: 0 },
        visible: useAirportStore.getState().mapFilters["bim"] !== false,
      });
      const staticRoutesLayer = new GraphicsLayer({
        title: "Taxi Routes",
        elevationInfo: { mode: "on-the-ground" },
      });
      const footprintLayer = new GraphicsLayer({
        title: "Footprints",
        elevationInfo: { mode: "relative-to-scene", offset: 5 },
        visible: false,
      });
      const maskLayer = new GraphicsLayer({
        title: "Heatmap Stencil Mask",
        elevationInfo: { mode: "relative-to-scene", offset: 16 },
        visible: false,
      });
      const pathLayer = new GraphicsLayer({
        title: "Paths",
        elevationInfo: { mode: "relative-to-scene", offset: 1 },
      });
      const planeLayer = new GraphicsLayer({
        title: "Planes",
        screenSizePerspectiveEnabled: false,
        elevationInfo: { mode: "relative-to-scene", offset: 10 },
      });
      const vehicleLayer = new GraphicsLayer({
        title: "Vehicles",
        screenSizePerspectiveEnabled: false,
        elevationInfo: { mode: "relative-to-scene", offset: 5 },
      });
      // Columns stand at each sensor's own elevation (storey level inside the BIM)
      const sensorLayer = new GraphicsLayer({
        title: "Sensors",
        elevationInfo: { mode: "relative-to-ground" },
      });
      const labelLayer = new GraphicsLayer({
        title: "Airline Labels",
        screenSizePerspectiveEnabled: false,
        elevationInfo: { mode: "relative-to-scene", offset: 35 },
      });

      map.addMany([
        pavementLayer,
        staticRoutesLayer,
        footprintLayer,
        maskLayer,
        bimLayer,
        pathLayer,
        sensorLayer,
        vehicleLayer,
        planeLayer,
        labelLayer,
      ]);

      airlineLabelLayerRef.current = labelLayer;
      footprintLayerRef.current = footprintLayer;
      maskLayerRef.current = maskLayer;
      vehicleLayerRef.current = vehicleLayer;
      bimLayerRef.current = bimLayer;
      planeLayerRef.current = planeLayer;
      sensorLayerRef.current = sensorLayer;
      pathLayerRef.current = pathLayer;
      sensorGraphicsRef.current = new Map(); // fresh layer, nothing rendered yet

      if (airport.pavedAreas) {
        pavementLayer.add(
          new GraphicClass({
            geometry: new PolygonClass({
              rings: airport.pavedAreas.map(toRing),
            }),
            symbol: new SimpleFillClass({
              color: [120, 124, 130, 0.9],
              outline: { color: [255, 255, 255, 0.6], width: 1 },
            }),
          }),
        );
      }

      footprintLayer.addMany(
        [airport.terminalAreas, airport.runwayAreas].map(
          (areas) =>
            new GraphicClass({
              geometry: new PolygonClass({ rings: areas.map(toRing) }),
              symbol: new SimpleFillClass({
                color: [0, 0, 0, 0],
                outline: {
                  color: [255, 255, 255, 0.8],
                  width: 2,
                  style: "solid",
                },
              }),
            }),
        ),
      );

      const view = new SceneView({
        container: mapContainerRef.current!,
        map,
        center: [airport.center.lng, airport.center.lat],
        zoom: 15,
        environment: {
          background: { type: "color", color: [236, 238, 241, 1] },
          atmosphereEnabled: false,
          starsEnabled: false,
        },
        ui: { components: [] },
        // Clicks are handled by our own hitTest; skips loading the popup widget
        popupEnabled: false,
      });
      viewRef.current = view;

      await view.when();
      if (destroyed) return;
      view.goTo(homeCamera(airport), { animate: false }).catch(() => undefined);

      // BIM storeys (one glTF per IfcBuildingStorey) load in the background
      if (airport.model) {
        const { baseUrl, origin, heading } = airport.model;
        loadBimManifest(baseUrl)
          .then((manifest) => {
            if (destroyed) return;
            const { bimXray, hiddenStoreys } = useUIStore.getState();
            bimLayer.addMany(
              manifest.storeys.map(
                (st) =>
                  new GraphicClass({
                    geometry: new PointClass({
                      longitude: origin.lng,
                      latitude: origin.lat,
                      z: 0,
                      spatialReference: { wkid: 4326 },
                    }),
                    symbol: buildBimSymbol(
                      `${baseUrl}/${st.file}`,
                      heading,
                      bimXray,
                    ),
                    attributes: {
                      storeyId: st.id,
                      href: `${baseUrl}/${st.file}`,
                      elevation: st.elevation,
                    },
                    visible: !hiddenStoreys.includes(st.id),
                  }),
              ),
            );
            setBimReady(true);
          })
          .catch((err) =>
            console.warn("[BIM] Failed to load model manifest", err),
          );
      }

      // Static routes
      airport.routeGroups.forEach((routes) => {
        const inbound = routes.flightInbound || routes.inbound || [];
        const outbound = routes.flightOutbound || routes.outbound || [];
        staticRoutesLayer.addMany([
          new GraphicClass({
            geometry: new PolylineClass({
              paths: [inbound.map((pt) => [pt.lng, pt.lat])],
            }),
            symbol: new LineClass({
              color: new ColorClass([16, 185, 129, 0.35]),
              width: 3,
              style: "short-dash",
            }),
          }),
          new GraphicClass({
            geometry: new PolylineClass({
              paths: [outbound.map((pt) => [pt.lng, pt.lat])],
            }),
            symbol: new LineClass({
              color: new ColorClass([245, 158, 11, 0.35]),
              width: 3,
              style: "short-dash",
            }),
          }),
        ]);
        if (routes.taxiPath && routes.taxiPath.length > 0) {
          staticRoutesLayer.add(
            new GraphicClass({
              geometry: new PolylineClass({
                paths: [routes.taxiPath.map((pt) => [pt.lng, pt.lat])],
              }),
              symbol: new LineClass({
                color: new ColorClass([168, 162, 158, 0.35]),
                width: 2,
                style: "solid",
              }),
            }),
          );
        }
      });

      view.on("click", async (event) => {
        if (useAirportStore.getState().isImmersiveActive) return;
        const response = await view.hitTest(event, {
          include: [sensorLayer, planeLayer, vehicleLayer],
        });
        const hit = response.results.find(
          (r) => r.type === "graphic" && r.graphic?.attributes?.type,
        );
        if (hit && hit.type === "graphic") {
          event.stopPropagation();
          selectEntity(hit.graphic.attributes.id, hit.graphic.attributes.type);
        }
      });

      handleMapReset = () => {
        if (!view.destroyed)
          view.goTo(homeCamera(airport), {
            duration: 1500,
            easing: "ease-in-out",
          });
      };
      window.addEventListener("reset-map-view", handleMapReset);

      let lastCameraHeading = Number.NaN;
      watchHandle = reactiveUtils.watch(
        () => view?.camera,
        () => {
          if (destroyed || !view || view.destroyed) return;
          cancelAnimationFrame(rAFId);
          rAFId = requestAnimationFrame(() => {
            syncTooltips(view);
            const cameraHeading = view.camera.heading || 0;
            // Panning/zooming does not change icon angles; only re-clone symbols on rotation
            if (Math.abs(cameraHeading - lastCameraHeading) < 0.5) return;
            lastCameraHeading = cameraHeading;

            const planeMap = new Map(
              useAirportStore.getState().planes.map((p) => [p.id, p]),
            );
            planeLayerRef.current?.graphics.forEach((g) => {
              const plane = planeMap.get(g.attributes.id);
              if (plane && g.symbol) {
                const baseHeading = isPlaneOutbound(plane)
                  ? plane.heading
                  : plane.heading + 180;
                const updated = g.symbol.clone() as PictureMarkerSymbol;
                updated.angle = baseHeading - cameraHeading;
                g.symbol = updated;
              }
            });
            const vehicleMap = new Map(
              useAirportStore.getState().vehicles.map((v) => [v.id, v]),
            );
            vehicleLayerRef.current?.graphics.forEach((g) => {
              const vehicle = vehicleMap.get(g.attributes.id);
              if (vehicle && g.symbol) {
                const updated = g.symbol.clone() as PictureMarkerSymbol;
                updated.angle = (vehicle.heading || 0) - cameraHeading;
                g.symbol = updated;
              }
            });
          });
        },
      );

      syncTooltips(view);
      setIsMapReady(true);
    };

    init();
    return () => {
      destroyed = true;
      setIsMapReady(false);
      setBimReady(false);
      cancelAnimationFrame(rAFId);
      if (watchHandle) watchHandle.remove();
      if (handleMapReset)
        window.removeEventListener("reset-map-view", handleMapReset);
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [syncTooltips, selectEntity, activeAirport, buildBimSymbol]);

  // --- Basemap switch (no SceneView rebuild) ---
  useEffect(() => {
    if (
      mapInstanceRef.current &&
      mapInstanceRef.current.basemap?.id !== basemap
    ) {
      mapInstanceRef.current.basemap = basemap;
    }
  }, [basemap, isMapReady]);

  // --- BIM: model visibility, storey isolation, X-ray, auto cut-away ---
  // With auto cut-away on, selecting an indoor sensor hides the storeys above its
  // floor and ghosts the model, so the camera can look straight at the sensor.
  const cutAwayFloor =
    autoSection && focusedSensor && getAirportConfig(activeAirport).model
      ? placementsFor(sensors).get(focusedSensor.id)?.environment === "indoor"
        ? (focusedSensor.z ?? 0)
        : null
      : null;
  useEffect(() => {
    const layer = bimLayerRef.current;
    if (!layer || !bimReady) return;
    layer.visible = mapFilters["bim"] !== false && !isImmersiveActive;
    const model = getAirportConfig(activeAirport).model;
    const xray = bimXray || cutAwayFloor !== null;
    layer.graphics.forEach((g) => {
      const cutAway =
        cutAwayFloor !== null && g.attributes.elevation > cutAwayFloor + 0.01;
      g.visible = !hiddenStoreys.includes(g.attributes.storeyId) && !cutAway;
      if (model)
        g.symbol = buildBimSymbol(g.attributes.href, model.heading, xray);
    });
  }, [
    mapFilters,
    isImmersiveActive,
    hiddenStoreys,
    bimXray,
    bimReady,
    activeAirport,
    buildBimSymbol,
    cutAwayFloor,
  ]);

  // --- Camera commands from toolbar / inspector ---
  useEffect(
    () =>
      onMapCommand((command) => {
        const view = viewRef.current;
        if (!view || view.destroyed || !view.ready) return;
        const airport = getAirportConfig(
          useAirportStore.getState().activeAirport,
        );
        const animate = { duration: 900, easing: "ease-in-out" as const };
        switch (command.type) {
          case "home":
            view.goTo(homeCamera(airport), animate).catch(() => undefined);
            break;
          case "zoom":
            view
              .goTo({ zoom: view.zoom + command.delta }, { duration: 300 })
              .catch(() => undefined);
            break;
          case "toggle-tilt":
            view
              .goTo(
                { center: view.center, tilt: view.camera.tilt > 10 ? 0 : 60 },
                animate,
              )
              .catch(() => undefined);
            break;
          case "north":
            view
              .goTo({ center: view.center, heading: 0 }, animate)
              .catch(() => undefined);
            break;
          case "focus-selection":
            focusSelection(900);
            break;
        }
      }),
    [focusSelection],
  );

  // Handle Switch Airport Event smoothly without tearing down the map
  useEffect(() => {
    const handleSwitchAirport = (e: CustomEvent) => {
      const view = viewRef.current;
      if (!view || view.destroyed) return;
      const airport = getAirportConfig(e.detail.facilityId);
      view
        .goTo(homeCamera(airport), { duration: 2000, easing: "ease-in-out" })
        .catch(() => undefined);
    };
    window.addEventListener(
      "switch-airport",
      handleSwitchAirport as EventListener,
    );
    return () =>
      window.removeEventListener(
        "switch-airport",
        handleSwitchAirport as EventListener,
      );
  }, []);

  // --- Camera: fly once per sensor selection (sensors never move) ---
  useEffect(() => {
    if (!isMapReady || isImmersiveActive) return;
    if (!selectedEntityId || selectedEntityType !== "sensor") return;
    focusSelection(1500);
  }, [
    selectedEntityId,
    selectedEntityType,
    isImmersiveActive,
    isMapReady,
    focusSelection,
  ]);

  // --- Camera: follow the selected plane / vehicle as it moves ---
  useEffect(() => {
    if (!isMapReady || isImmersiveActive || !selectedEntityId) return;
    if (selectedEntityType !== "plane" && selectedEntityType !== "vehicle")
      return;
    focusSelection(1500);
  }, [
    selectedEntityId,
    selectedEntityType,
    isImmersiveActive,
    isMapReady,
    planes,
    vehicles,
    focusSelection,
  ]);

  // --- View padding: keep the focus inside the part of the map that is not covered ---
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.destroyed || !isMapReady) return;
    view.padding = {
      left: occlusion.left,
      right: occlusion.right,
      top: 0,
      bottom: 0,
    };
    // Re-frame the selection when overlays open or close beside it
    if (selectedEntityId && !isImmersiveActive) focusSelection(600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    occlusion.left,
    occlusion.right,
    isMapReady,
    selectedEntityType,
    selectedEntityId,
  ]);

  // --- Immersive heatmap (built once per target, values pushed by the next effect) ---
  useEffect(() => {
    if (
      !isMapReady ||
      !FeatureLayerRef.current ||
      !HeatmapRendererRef.current ||
      !GraphicRef.current ||
      !PointRef.current ||
      !PolygonRef.current ||
      !SimpleFillRef.current ||
      !maskLayerRef.current
    )
      return;

    const map = mapInstanceRef.current;
    const toggleBuildings = (layers: Collection<Layer>, visible: boolean) => {
      layers.forEach((l: Layer) => {
        if (
          l.type === "scene" ||
          l.type === "building-scene" ||
          l.title?.toLowerCase().includes("building")
        ) {
          l.visible = visible;
        }
      });
    };

    if (isImmersiveActive && focusedSensor) {
      if (footprintLayerRef.current) footprintLayerRef.current.visible = true;
      const targetType = focusedSensor.type;
      const allSensors = useAirportStore.getState().sensors;
      const placements = placementsFor(allSensors);
      const relevantSensors = allSensors.filter(
        (s) => s.type === targetType && placements.has(s.id),
      );

      if (map?.basemap) {
        toggleBuildings(map.basemap.baseLayers, false);
        toggleBuildings(map.basemap.referenceLayers, false);
      }
      if (heatmapLayerRef.current) map?.remove(heatmapLayerRef.current);

      const isTarmac =
        targetType === "TARMAC_TEMP" || targetType === "WIND_OUTDOOR";
      const airport = getAirportConfig(activeAirport);
      const targetBlueprint: number[][][] = (
        isTarmac ? airport.runwayAreas : airport.terminalAreas
      ).map(toRing);

      // Stencil covering the surroundings of the active airport (~50 km each way)
      const { lng: cLng, lat: cLat } = airport.center;
      const outerRing = [
        [cLng - 0.5, cLat + 0.5],
        [cLng + 0.5, cLat + 0.5],
        [cLng + 0.5, cLat - 0.5],
        [cLng - 0.5, cLat - 0.5],
        [cLng - 0.5, cLat + 0.5],
      ];
      const rings = [
        outerRing,
        ...targetBlueprint.map((bp) => [...bp].reverse()),
      ];

      maskLayerRef.current.removeAll();
      maskLayerRef.current.add(
        new GraphicRef.current({
          geometry: new PolygonRef.current({ rings }),
          symbol: new SimpleFillRef.current({
            color: [236, 238, 241, 1],
            outline: { color: [100, 116, 139, 1], width: 2, style: "solid" },
          }),
        }),
      );
      maskLayerRef.current.visible = true;

      const graphics = relevantSensors.map((s, i) => {
        const p = placements.get(s.id)!;
        return new GraphicRef.current!({
          geometry: new PointRef.current!({
            longitude: p.lon,
            latitude: p.lat,
            spatialReference: { wkid: 4326 },
          }),
          attributes: { ObjectID: i, value: s.currentValue },
        });
      });

      const layer = new FeatureLayerRef.current!({
        source: graphics,
        title: "Immersive Heatmap",
        objectIdField: "ObjectID",
        geometryType: "point",
        spatialReference: { wkid: 4326 },
        fields: [
          { name: "ObjectID", type: "oid" },
          { name: "value", type: "double" },
        ],
        renderer: new HeatmapRendererRef.current!({
          field: "value",
          colorStops: [
            { ratio: 0, color: "rgba(0,0,0,0)" },
            { ratio: 0.5, color: "rgba(208,59,59,0.5)" },
            { ratio: 1, color: "rgba(208,59,59,1)" },
          ],
          radius: 112,
        }),
        elevationInfo: { mode: "on-the-ground" },
      });

      heatmapLayerRef.current = layer;
      heatmapSensorIdsRef.current = relevantSensors.map((s) => s.id);
      map?.add(layer);

      viewRef.current?.goTo(
        {
          target: new PolygonRef.current!({
            rings: [targetBlueprint[0]],
            spatialReference: { wkid: 4326 },
          }),
          tilt: 50,
          zoom: isTarmac ? 15.5 : 16.5,
        },
        { duration: 1500, easing: "ease-in-out" },
      );
    } else {
      if (footprintLayerRef.current) footprintLayerRef.current.visible = false;
      if (maskLayerRef.current) maskLayerRef.current.visible = false;
      if (map?.basemap) {
        toggleBuildings(map.basemap.baseLayers, true);
        toggleBuildings(map.basemap.referenceLayers, true);
      }
      if (heatmapLayerRef.current) {
        map?.remove(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
        heatmapSensorIdsRef.current = [];
      }
    }
    // Live values are pushed by the effect below; rebuilding (and re-flying the camera)
    // only happens when the immersive target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImmersiveActive, focusedSensor?.type, isMapReady, activeAirport]);

  // --- Immersive heatmap live values (in-place edits instead of recreating the layer) ---
  useEffect(() => {
    const layer = heatmapLayerRef.current;
    const GraphicClass = GraphicRef.current;
    if (!layer || !GraphicClass || heatmapEditPendingRef.current) return;
    const sensorsById = new Map(sensors.map((s) => [s.id, s]));
    const updateFeatures = heatmapSensorIdsRef.current.flatMap((id, i) => {
      const sensor = sensorsById.get(id);
      return sensor
        ? [
            new GraphicClass({
              attributes: { ObjectID: i, value: sensor.currentValue },
            }),
          ]
        : [];
    });
    if (updateFeatures.length === 0) return;
    heatmapEditPendingRef.current = true;
    layer
      .applyEdits({ updateFeatures })
      .catch(() => undefined)
      .finally(() => {
        heatmapEditPendingRef.current = false;
      });
  }, [sensors]);

  // --- Sensor value columns ---
  // Track: full-scale translucent cylinder. Fill: reading within the type's range,
  // coloured by health. A selected sensor dims the others instead of hiding them.
  useEffect(() => {
    const sensorLayer = sensorLayerRef.current;
    const PointClass = PointRef.current;
    const GraphicClass = GraphicRef.current;
    const PointSymbol3DClass = PointSymbol3DRef.current;
    const ObjectSymbol3DLayerClass = ObjectSymbol3DLayerRef.current;
    if (
      !isMapReady ||
      !sensorLayer ||
      !PointClass ||
      !GraphicClass ||
      !PointSymbol3DClass ||
      !ObjectSymbol3DLayerClass
    )
      return;

    const placements = placementsFor(sensors);
    const rendered = sensorGraphicsRef.current;
    const visibleIds = new Set<string>();
    const toAdd: Graphic[] = [];
    const focusSensorId =
      selectedEntityType === "sensor" ? selectedEntityId : null;

    const buildSymbol = (
      p: SensorPlacement,
      fraction: number,
      rgb: [number, number, number],
      dim: boolean,
    ) =>
      new PointSymbol3DClass({
        symbolLayers: [
          new ObjectSymbol3DLayerClass({
            resource: { primitive: "cylinder" },
            material: { color: [148, 163, 184, dim ? 0.1 : 0.32] },
            width: p.columnWidth,
            depth: p.columnWidth,
            height: p.columnHeight,
            anchor: "bottom",
          }),
          new ObjectSymbol3DLayerClass({
            resource: { primitive: "cylinder" },
            material: { color: [...rgb, dim ? 0.2 : 0.95] },
            width: p.columnWidth * 0.7,
            depth: p.columnWidth * 0.7,
            height: Math.max(p.columnHeight * fraction, p.columnHeight * 0.04),
            anchor: "bottom",
          }),
        ],
      });

    sensors.forEach((sensor) => {
      if (
        mapFilters[sensor.type] === false ||
        mapFilters[`cylinders_${sensor.type}`] === false
      )
        return;
      const p = placements.get(sensor.id);
      if (!p) return;
      visibleIds.add(sensor.id);

      const health = getSensorHealth(
        sensor.type,
        sensor.currentValue,
        sensor.status,
      );
      // 2% steps: finer changes are invisible but would rebuild the symbol every tick
      const fraction =
        Math.round(
          normalizeSensorValue(sensor.type, sensor.currentValue) * 50,
        ) / 50;
      const dim = !!focusSensorId && focusSensorId !== sensor.id;
      const key = `${fraction}|${health}|${dim}`;

      const existing = rendered.get(sensor.id);
      if (existing?.key === key) return;
      const symbol = buildSymbol(p, fraction, HEALTH_STYLES[health].rgb, dim);

      if (existing) {
        existing.graphic.symbol = symbol;
        existing.key = key;
      } else {
        const graphic = new GraphicClass({
          geometry: new PointClass({
            longitude: p.lon,
            latitude: p.lat,
            z: p.z,
            spatialReference: { wkid: 4326 },
          }),
          symbol,
          attributes: {
            id: sensor.id,
            type: "sensor",
            filterType: sensor.type,
          },
        });
        rendered.set(sensor.id, { graphic, key });
        toAdd.push(graphic);
      }
    });

    const toRemove: Graphic[] = [];
    for (const [id, entry] of rendered) {
      if (!visibleIds.has(id)) {
        toRemove.push(entry.graphic);
        rendered.delete(id);
      }
    }
    if (toRemove.length > 0) sensorLayer.removeMany(toRemove);
    if (toAdd.length > 0) sensorLayer.addMany(toAdd);

    if (viewRef.current) syncTooltips(viewRef.current);
  }, [
    sensors,
    mapFilters,
    isMapReady,
    syncTooltips,
    selectedEntityId,
    selectedEntityType,
    placementsFor,
  ]);

  // --- Aircraft ---
  useEffect(() => {
    const PointClass = PointRef.current;
    const GraphicClass = GraphicRef.current;
    const PictureMarkerClass = PictureMarkerRef.current;
    const PolylineClass = PolylineRef.current;
    if (
      !planeLayerRef.current ||
      !pathLayerRef.current ||
      !viewRef.current?.ready ||
      !isMapReady
    )
      return;
    if (!PointClass || !GraphicClass || !PictureMarkerClass || !PolylineClass)
      return;

    const cameraHeading = viewRef.current.camera.heading || 0;

    planes.forEach((plane) => {
      const existingPlane = planeLayerRef.current?.graphics.find(
        (g) => g.attributes.id === plane.id,
      );
      const existingLogo = airlineLabelLayerRef.current?.graphics.find(
        (g) => g.attributes.id === `${plane.id}_logo`,
      );
      const existingPath = pathLayerRef.current?.graphics.find(
        (g) => g.attributes.planeId === plane.id,
      );

      if (!isPlaneOnGround(plane) || mapFilters["planes"] === false) {
        if (existingPlane) planeLayerRef.current?.remove(existingPlane);
        if (existingLogo) airlineLabelLayerRef.current?.remove(existingLogo);
        if (existingPath) pathLayerRef.current?.remove(existingPath);
        return;
      }

      const outbound = isPlaneOutbound(plane);
      const planeGeom = new PointClass({
        longitude: getLon(plane),
        latitude: getLat(plane),
        spatialReference: { wkid: 4326 },
      });
      const visualHeading =
        (outbound ? plane.heading : plane.heading + 180) - cameraHeading;

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

      if (plane.logoUrl) {
        const proxiedLogoUrl = `https://wsrv.nl/?url=${encodeURIComponent(plane.logoUrl)}&w=64&h=64&output=png`;
        const logoSymbol = () =>
          new PictureMarkerClass({
            url: proxiedLogoUrl,
            width: "40px",
            height: "40px",
            yoffset: 35,
            xoffset: -6,
          });
        if (existingLogo) {
          existingLogo.geometry = planeGeom;
          if (
            (existingLogo.symbol as PictureMarkerSymbol)?.url !== proxiedLogoUrl
          )
            existingLogo.symbol = logoSymbol();
        } else {
          airlineLabelLayerRef.current?.add(
            new GraphicClass({
              geometry: planeGeom,
              symbol: logoSymbol(),
              attributes: { id: `${plane.id}_logo`, type: "label" },
            }),
          );
        }
      }

      const statusStr = (plane.status || "UNKNOWN").toUpperCase();
      const showPath =
        GROUND_STATUSES.includes(statusStr) &&
        plane.altitude < 50 &&
        getLon(plane) !== 0 &&
        getLat(plane) !== 0 &&
        plane.path &&
        plane.path.length > 1;

      if (showPath) {
        const pathCoords = plane.path!.map((pt) => [pt.longitude, pt.latitude]);
        if (existingPath) {
          existingPath.geometry = new PolylineClass({ paths: [pathCoords] });
        } else {
          pathLayerRef.current?.add(
            new GraphicClass({
              geometry: new PolylineClass({ paths: [pathCoords] }),
              symbol: new LineRef.current!({
                style: "solid",
                color: new ColorRef.current!(
                  outbound ? [217, 70, 239, 1] : [6, 182, 212, 1],
                ),
                width: 4,
              }),
              attributes: { planeId: plane.id, type: "path" },
            }),
          );
        }
      } else if (existingPath) {
        pathLayerRef.current?.remove(existingPath);
      }
    });
  }, [planes, mapFilters, isMapReady]);

  // --- Landside vehicles ---
  useEffect(() => {
    const PointClass = PointRef.current;
    const GraphicClass = GraphicRef.current;
    const PictureMarkerClass = PictureMarkerRef.current;
    if (!vehicleLayerRef.current || !viewRef.current?.ready || !isMapReady)
      return;
    if (!PointClass || !GraphicClass || !PictureMarkerClass) return;

    const cameraHeading = viewRef.current.camera.heading || 0;

    vehicles.forEach((vehicle) => {
      const existingVehicle = vehicleLayerRef.current?.graphics.find(
        (g) => g.attributes.id === vehicle.id,
      );
      if (mapFilters["vehicles"] === false || vehicle.status === "EXITING") {
        if (existingVehicle) vehicleLayerRef.current?.remove(existingVehicle);
        return;
      }

      const vehicleGeom = new PointClass({
        longitude: getLon(vehicle),
        latitude: getLat(vehicle),
        spatialReference: { wkid: 4326 },
      });
      const visualHeading = (vehicle.heading || 0) - cameraHeading;
      let iconUrl = "/car.svg";
      if (vehicle.type === "TAXI") iconUrl = "/taxi.svg";
      else if (vehicle.type === "RIDE_HAIL") iconUrl = "/ride-hail.svg";
      else if (vehicle.type === "VIP_TRANSFER") iconUrl = "/vip-car.svg";

      if (existingVehicle) {
        existingVehicle.geometry = vehicleGeom;
        if (existingVehicle.symbol) {
          const symbol = existingVehicle.symbol.clone() as PictureMarkerSymbol;
          symbol.angle = visualHeading;
          if (symbol.url !== iconUrl) symbol.url = iconUrl;
          existingVehicle.symbol = symbol;
        }
      } else {
        vehicleLayerRef.current?.add(
          new GraphicClass({
            geometry: vehicleGeom,
            symbol: new PictureMarkerClass({
              url: iconUrl,
              width: "20px",
              height: "20px",
              angle: visualHeading,
            }),
            attributes: { id: vehicle.id, type: "vehicle" },
          }),
        );
      }
    });
  }, [vehicles, mapFilters, isMapReady]);

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full bg-twin-canvas"
    />
  );
}
