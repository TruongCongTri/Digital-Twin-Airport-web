"use client";
import { useAirportStore } from "@/src/store/airport-store";
import {
  useEffect,
  useRef,
  useCallback,
  useState,
  ElementType,
  useMemo,
} from "react";
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
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MessageSquareOff,
  BarChart2,
  Car, // ✅ Changed to Car for civilian traffic
} from "lucide-react";

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

import { Plane, TooltipData, Vehicle } from "@/types";
import { APP_CONFIG } from "@/constants/app.constant";
import {
  TAN_SON_NHAT_COORDS,
  LONG_THANH_COORDS,
} from "@/constants/airport-coordinate";

type CoordPoint = { lat: number; lng: number };

type RouteGroup = {
  taxiPath?: CoordPoint[];
  flightInbound?: CoordPoint[];
  inbound?: CoordPoint[];
  flightOutbound?: CoordPoint[];
  outbound?: CoordPoint[];
};

type BasemapOption = { id: string; label: string; icon: ElementType };
interface WatchHandle {
  remove: () => void;
}

const BASEMAP_OPTIONS: BasemapOption[] = [
  { id: "osm-3d", label: "OpenStreetMap 3D", icon: MapIcon },
  { id: "streets-3d", label: "Streets 3D", icon: Navigation },
  { id: "streets-dark-3d", label: "Streets Dark 3D", icon: Moon },
  { id: "navigation-3d", label: "Navigation 3D", icon: Compass },
  { id: "topo-3d", label: "Topographic 3D", icon: Globe },
  { id: "gray-3d", label: "Light Canvas", icon: Sun },
  { id: "dark-gray-3d", label: "Dark Canvas 3D", icon: Layers },
  { id: "satellite", label: "Satellite Imagery 3D", icon: Globe },
];

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

export interface GeographicEntity {
  x?: number;
  y?: number;
  longitude?: number;
  latitude?: number;
  position?: {
    longitude?: number;
    latitude?: number;
  };
  type?: string;
}

const getLon = (entity: GeographicEntity) =>
  entity.x ?? entity.longitude ?? entity.position?.longitude ?? 0;
const getLat = (entity: GeographicEntity) =>
  entity.y ?? entity.latitude ?? entity.position?.latitude ?? 0;

const SENSOR_DISPERSION_ANGLES: Record<string, number> = {
  TEMPERATURE: 0,
  HUMIDITY: 51,
  CO2: 102,
  WIND_INDOOR: 153,
  LIGHT_DENSITY: 204,
  CAMERA_AI_CROWD: 255,
  TILT_STRUCTURAL: 306,
  WIND_OUTDOOR: 0,
  TARMAC_TEMP: 180,
};

const getOffsetCoords = (entity: GeographicEntity) => {
  const baseLon = getLon(entity);
  const baseLat = getLat(entity);
  if (!entity.type || !SENSOR_DISPERSION_ANGLES.hasOwnProperty(entity.type)) {
    return { lon: baseLon, lat: baseLat };
  }
  const radius = 0.0004;
  const angleRad = SENSOR_DISPERSION_ANGLES[entity.type] * (Math.PI / 180);
  return {
    lon: baseLon + Math.cos(angleRad) * radius,
    lat: baseLat + Math.sin(angleRad) * radius,
  };
};

const getSensorColumnProps = (type: string, val: number) => {
  if (type.includes("CO2"))
    return { color: [239, 68, 68, 0.55], height: val / 10 };
  if (type.includes("TEMP"))
    return { color: [234, 179, 8, 0.55], height: val * 1.5 };
  if (type.includes("HUMIDITY"))
    return { color: [56, 189, 248, 0.55], height: val };
  if (type.includes("WIND"))
    return { color: [6, 182, 212, 0.55], height: val * 10 };
  if (type.includes("TILT"))
    return { color: [71, 85, 105, 0.55], height: val * 15000 };
  if (type.includes("LIGHT"))
    return { color: [202, 138, 4, 0.55], height: val / 10 };
  if (type.includes("CROWD"))
    return { color: [168, 85, 247, 0.55], height: val / 4 };
  return { color: [156, 163, 175, 0.55], height: 30 };
};

// ✅ SAFE ARRAY REFERENCE: Must be declared outside component
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

  const FeatureLayerRef = useRef<typeof FeatureLayer | null>(null);
  const HeatmapRendererRef = useRef<typeof HeatmapRenderer | null>(null);
  const PointRef = useRef<typeof Point | null>(null);
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

  const [currentBasemap, setCurrentBasemap] = useState("osm-3d");
  const [isBasemapMenuOpen, setIsBasemapMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSensorsExpanded, setIsSensorsExpanded] = useState(false);

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
  const toggleMapFilter = useAirportStore((state) => state.toggleMapFilter);

  const filterKeys = useMemo(() => Object.keys(mapFilters), [mapFilters]);
  const sensorKeys = useMemo(
    () =>
      filterKeys.filter(
        (k) =>
          !["planes", "vehicles", "tooltips", "cylinders"].includes(k) &&
          !k.startsWith("tooltips_") &&
          !k.startsWith("cylinders_"),
      ),
    [filterKeys],
  );

  const allSensorsVisible = useMemo(
    () => sensorKeys.every((k) => mapFilters[k] !== false),
    [sensorKeys, mapFilters],
  );

  const allSensorTooltipsVisible = useMemo(
    () => sensorKeys.every((k) => mapFilters[`tooltips_${k}`] !== false),
    [sensorKeys, mapFilters],
  );

  const allSensorCylindersVisible = useMemo(
    () => sensorKeys.every((k) => mapFilters[`cylinders_${k}`] !== false),
    [sensorKeys, mapFilters],
  );

  const handleToggleAllSensors = () => {
    const targetState = !allSensorsVisible;
    sensorKeys.forEach((k) => {
      if (
        (mapFilters[k] !== false && !targetState) ||
        (mapFilters[k] === false && targetState)
      ) {
        toggleMapFilter(k);
      }
    });
  };

  const handleToggleAllSensorTooltips = () => {
    const targetState = !allSensorTooltipsVisible;
    sensorKeys.forEach((k) => {
      const current = mapFilters[`tooltips_${k}`] !== false;
      if (current !== targetState) toggleMapFilter(`tooltips_${k}`);
    });
  };

  const handleToggleAllSensorCylinders = () => {
    const targetState = !allSensorCylindersVisible;
    sensorKeys.forEach((k) => {
      const current = mapFilters[`cylinders_${k}`] !== false;
      if (current !== targetState) toggleMapFilter(`cylinders_${k}`);
    });
  };

  const handleBasemapChange = useCallback((basemapId: string) => {
    setCurrentBasemap(basemapId);
    if (mapInstanceRef.current) mapInstanceRef.current.basemap = basemapId;
    setIsBasemapMenuOpen(false);
  }, []);

  const syncTooltips = useCallback((view: SceneView) => {
    if (!view?.ready || view.destroyed) return;
    const PointClass = PointRef.current;
    if (!PointClass) return;

    const store = useAirportStore.getState();
    const rawTooltips: TooltipData[] = [];

    const focusedId = store.selectedEntityId;
    const focusedType = store.selectedEntityType;

    const planesVisible = store.mapFilters["planes"] !== false;
    const planeTooltipsOn = store.mapFilters["tooltips_planes"] !== false;

    if (planesVisible && planeTooltipsOn) {
      store.planes.forEach((plane) => {
        if (!isPlaneOnGround(plane)) return;
        if (focusedType === "plane" && focusedId && focusedId !== plane.id)
          return;

        const screen = view.toScreen(
          new PointClass({
            longitude: getLon(plane),
            latitude: getLat(plane),
            z: 15,
            spatialReference: { wkid: 4326 },
          }),
        );
        if (screen)
          rawTooltips.push({
            entityId: plane.id,
            entityType: "plane",
            screenX: Math.round(screen.x),
            screenY: Math.round(screen.y),
            visible: true,
          });
      });
    }

    const vehiclesVisible = store.mapFilters["vehicles"] !== false;
    const vehicleTooltipsOn = store.mapFilters["tooltips_vehicles"] !== false;

    if (vehiclesVisible && vehicleTooltipsOn && store.vehicles) {
      store.vehicles.forEach((vehicle) => {
        if (focusedType === "vehicle" && focusedId && focusedId !== vehicle.id)
          return;

        const screen = view.toScreen(
          new PointClass({
            longitude: getLon(vehicle),
            latitude: getLat(vehicle),
            z: 5,
            spatialReference: { wkid: 4326 },
          }),
        );
        if (screen)
          rawTooltips.push({
            entityId: vehicle.id,
            entityType: "vehicle",
            screenX: Math.round(screen.x),
            screenY: Math.round(screen.y),
            visible: true,
          });
      });
    }

    store.sensors.forEach((sensor) => {
      const sensorTypeVisible = store.mapFilters[sensor.type] !== false;
      const sensorTooltipOn =
        store.mapFilters[`tooltips_${sensor.type}`] !== false;

      if (!sensorTypeVisible || !sensorTooltipOn) return;
      if (focusedType === "sensor" && focusedId && focusedId !== sensor.id)
        return;

      const colProps = getSensorColumnProps(sensor.type, sensor.currentValue);
      const dynamicHeight = Math.max(colProps.height, 10);
      const zElevation = 25 + dynamicHeight;

      const coords = getOffsetCoords(sensor);

      const screen = view.toScreen(
        new PointClass({
          longitude: coords.lon,
          latitude: coords.lat,
          z: zElevation,
          spatialReference: { wkid: 4326 },
        }),
      );
      if (screen)
        rawTooltips.push({
          entityId: sensor.id,
          entityType: "sensor",
          screenX: Math.round(screen.x),
          screenY: Math.round(screen.y),
          visible: true,
        });
    });

    const visibleTooltips: TooltipData[] = [];
    const COLLISION_RADIUS = 25;

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
      if (!hasCollision) visibleTooltips.push(tooltip);
    }
    store.updateAllTooltips(visibleTooltips);
  }, []);

  // Map Initialization & Core Layout Definition
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
      ] = await Promise.all([
        import("@arcgis/core/Map"),
        import("@arcgis/core/views/SceneView"),
        import("@arcgis/core/layers/GraphicsLayer"),
        import("@arcgis/core/Graphic"),
        import("@arcgis/core/geometry/Point"),
        import("@arcgis/core/symbols/PointSymbol3D"),
        import("@arcgis/core/symbols/ObjectSymbol3DLayer"),
        import("@arcgis/core/symbols/PictureMarkerSymbol"),
        import("@arcgis/core/geometry/Polyline"),
        import("@arcgis/core/symbols/SimpleLineSymbol"),
        import("@arcgis/core/Color"),
        import("@arcgis/core/layers/FeatureLayer"),
        import("@arcgis/core/renderers/HeatmapRenderer"),
        import("@arcgis/core/geometry/Polygon"),
        import("@arcgis/core/symbols/SimpleFillSymbol"),
        import("@arcgis/core/core/reactiveUtils"),
      ]);

      if (destroyed) return;
      PointRef.current = PointClass;
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

      const map = new ArcMap({ basemap: currentBasemap });
      mapInstanceRef.current = map;

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
      const sensorLayer = new GraphicsLayer({
        title: "Sensors",
        elevationInfo: { mode: "relative-to-scene", offset: 25 },
      });
      const labelLayer = new GraphicsLayer({
        title: "Airline Labels",
        screenSizePerspectiveEnabled: false,
        elevationInfo: { mode: "relative-to-scene", offset: 35 },
      });

      map.addMany([
        staticRoutesLayer,
        footprintLayer,
        maskLayer,
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

      // DYNAMIC FOOTPRINTS BASED ON ACTIVE AIRPORT
      const isVVTS = activeAirport === "VVTS";

      const BLUEPRINT_TERMINAL = isVVTS
        ? [
            TAN_SON_NHAT_COORDS.TERMINALS.DOMESTIC.area.map((p) => [
              p.lng,
              p.lat,
            ]),
            TAN_SON_NHAT_COORDS.TERMINALS.INTERNATIONAL.area.map((p) => [
              p.lng,
              p.lat,
            ]),
          ]
        : [LONG_THANH_COORDS.TERMINALS.MAIN.area.map((p) => [p.lng, p.lat])];

      const BLUEPRINT_TARMAC = isVVTS
        ? [
            TAN_SON_NHAT_COORDS.RUNWAYS.RWY_25L_07R.area.map((p) => [
              p.lng,
              p.lat,
            ]),
            TAN_SON_NHAT_COORDS.RUNWAYS.RWY_25R_07L.area.map((p) => [
              p.lng,
              p.lat,
            ]),
          ]
        : [LONG_THANH_COORDS.RUNWAYS.MAIN.area.map((p) => [p.lng, p.lat])];

      footprintLayer.addMany([
        new GraphicClass({
          geometry: new PolygonClass({ rings: BLUEPRINT_TERMINAL }),
          symbol: new SimpleFillClass({
            color: [0, 0, 0, 0],
            outline: { color: [255, 255, 255, 0.8], width: 2, style: "solid" },
          }),
        }),
        new GraphicClass({
          geometry: new PolygonClass({ rings: BLUEPRINT_TARMAC }),
          symbol: new SimpleFillClass({
            color: [0, 0, 0, 0],
            outline: { color: [255, 255, 255, 0.8], width: 2, style: "solid" },
          }),
        }),
      ]);

      const initialCenter = isVVTS
        ? TAN_SON_NHAT_COORDS.CENTER
        : LONG_THANH_COORDS.CENTER;

      const view = new SceneView({
        container: mapContainerRef.current!,
        map,
        center: [initialCenter.lng, initialCenter.lat],
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

      // Draw Routes
      const routeGroups: RouteGroup[] = isVVTS
        ? [
            TAN_SON_NHAT_COORDS.ROUTES.DOMESTIC,
            TAN_SON_NHAT_COORDS.ROUTES.INTERNATIONAL,
          ]
        : [
            LONG_THANH_COORDS.ROUTES.T1,
            LONG_THANH_COORDS.ROUTES.T2,
            LONG_THANH_COORDS.ROUTES.T3,
          ];

      routeGroups.forEach((routes) => {
        const inboundArray = routes.flightInbound || routes.inbound || [];
        const outboundArray = routes.flightOutbound || routes.outbound || [];

        staticRoutesLayer.addMany([
          new GraphicClass({
            geometry: new PolylineClass({
              paths: [inboundArray.map((pt) => [pt.lng, pt.lat])],
            }),
            symbol: new LineClass({
              color: new ColorClass([16, 185, 129, 0.35]),
              width: 3,
              style: "short-dash",
            }),
          }),
          new GraphicClass({
            geometry: new PolylineClass({
              paths: [outboundArray.map((pt) => [pt.lng, pt.lat])],
            }),
            symbol: new LineClass({
              color: new ColorClass([245, 158, 11, 0.35]),
              width: 3,
              style: "short-dash",
            }),
          }),
        ]);

        // Add Ground Vehicle paths if available
        if (routes.taxiPath && routes.taxiPath.length > 0) {
          staticRoutesLayer.add(
            new GraphicClass({
              geometry: new PolylineClass({
                paths: [routes.taxiPath.map((pt) => [pt.lng, pt.lat])],
              }),
              symbol: new LineClass({
                color: new ColorClass([168, 162, 158, 0.35]), // Gray for ground vehicles
                width: 2,
                style: "solid",
              }),
            }),
          );
        }
      });

      view.on("click", async (event) => {
        if (useAirportStore.getState().isImmersiveActive) return;

        const response = await view.hitTest(event);
        const hit = response.results.find(
          (r) => r.type === "graphic" && r.graphic?.attributes?.type,
        );
        if (
          hit &&
          hit.type === "graphic" &&
          hit.graphic.attributes.type !== "label"
        ) {
          event.stopPropagation();
          selectEntity(hit.graphic.attributes.id, hit.graphic.attributes.type);
        }
      });

      handleMapReset = () => {
        const center =
          activeAirport === "VVTS"
            ? TAN_SON_NHAT_COORDS.CENTER
            : LONG_THANH_COORDS.CENTER;
        if (!view.destroyed)
          view.goTo(
            {
              center: [center.lng, center.lat],
              zoom: 15,
              tilt: 60,
            },
            { duration: 1500, easing: "ease-in-out" },
          );
      };
      window.addEventListener("reset-map-view", handleMapReset);

      watchHandle = reactiveUtils.watch(
        () => view?.camera,
        () => {
          if (!destroyed && view && !view.destroyed) {
            cancelAnimationFrame(rAFId);
            rAFId = requestAnimationFrame(() => {
              syncTooltips(view);

              const cameraHeading = view.camera.heading || 0;

              // Rotate Planes
              const currentPlanes = useAirportStore.getState().planes;
              const planeMap = new Map(currentPlanes.map((p) => [p.id, p]));
              planeLayerRef.current?.graphics.forEach((g) => {
                const plane = planeMap.get(g.attributes.id);
                if (plane && g.symbol) {
                  const statusStr = (plane.status || "UNKNOWN").toUpperCase();
                  const originStr = (plane.origin || "").toUpperCase();

                  const isHomeOrigin = HOME_ORIGINS.some((kw) =>
                    originStr.includes(kw),
                  );

                  let isOutbound = false;
                  if (OUTBOUND_STATUSES.includes(statusStr)) isOutbound = true;
                  else if (INBOUND_STATUSES.includes(statusStr))
                    isOutbound = false;
                  else isOutbound = isHomeOrigin;

                  const direction = isOutbound ? "outbound" : "inbound";
                  const baseHeading =
                    direction === "inbound"
                      ? plane.heading + 180
                      : plane.heading;
                  const visualHeading = baseHeading - cameraHeading;

                  const updatedSymbol = g.symbol.clone() as PictureMarkerSymbol;
                  updatedSymbol.angle = visualHeading;
                  g.symbol = updatedSymbol;
                }
              });

              // Rotate Vehicles
              const currentVehicles = useAirportStore.getState().vehicles;
              const vehicleMap = new Map(currentVehicles.map((v) => [v.id, v]));
              vehicleLayerRef.current?.graphics.forEach((g) => {
                const vehicle = vehicleMap.get(g.attributes.id);
                if (vehicle && g.symbol) {
                  const visualHeading = (vehicle.heading || 0) - cameraHeading;
                  const updatedSymbol = g.symbol.clone() as PictureMarkerSymbol;
                  updatedSymbol.angle = visualHeading;
                  g.symbol = updatedSymbol;
                }
              });
            });
          }
        },
      );

      await syncTooltips(view);
      setIsMapReady(true);
    };

    init();
    return () => {
      destroyed = true;
      cancelAnimationFrame(rAFId);
      if (watchHandle) watchHandle.remove();
      if (handleMapReset)
        window.removeEventListener("reset-map-view", handleMapReset);
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [currentBasemap, syncTooltips, selectEntity, activeAirport]);

  // Handle Switch Airport Event smoothly without tearing down the map
  useEffect(() => {
    const handleSwitchAirport = (e: CustomEvent) => {
      const { coords } = e.detail;
      if (viewRef.current && !viewRef.current.destroyed) {
        viewRef.current.goTo(
          {
            center: [coords[0], coords[1]],
            zoom: 15,
            tilt: 60,
          },
          { duration: 2500, easing: "ease-in-out" },
        );
      }
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

  // CAMERA ZOOM CONTROLLER
  useEffect(() => {
    if (!isMapReady || !viewRef.current || isImmersiveActive) return;

    if (selectedEntityId && selectedEntityType === "sensor" && focusedSensor) {
      const coords = getOffsetCoords(focusedSensor);
      viewRef.current.goTo(
        {
          center: [coords.lon, coords.lat],
          zoom: 19,
          tilt: 75,
          heading: 0,
        },
        { duration: 1500, easing: "ease-in-out" },
      );
    } else if (selectedEntityId && selectedEntityType === "plane") {
      const plane = planes.find((p) => p.id === selectedEntityId);
      if (plane) {
        viewRef.current.goTo(
          {
            center: [getLon(plane), getLat(plane)],
            zoom: 20,
            tilt: 60,
          },
          { duration: 1500, easing: "ease-in-out" },
        );
      }
    } else if (selectedEntityId && selectedEntityType === "vehicle") {
      const vehicle = vehicles.find((v) => v.id === selectedEntityId);
      if (vehicle) {
        viewRef.current.goTo(
          {
            center: [getLon(vehicle), getLat(vehicle)],
            zoom: 21,
            tilt: 65,
          },
          { duration: 1500, easing: "ease-in-out" },
        );
      }
    }
  }, [
    selectedEntityId,
    selectedEntityType,
    isImmersiveActive,
    isMapReady,
    focusedSensor,
    planes,
    vehicles,
  ]);

  // IMMERSIVE NATIVE 3D HEATMAP ENGINE
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

    if (isImmersiveActive && focusedSensor) {
      if (footprintLayerRef.current) footprintLayerRef.current.visible = true;

      const targetType = focusedSensor.type;
      const allSensors = useAirportStore.getState().sensors;
      const relevantSensors = allSensors.filter(
        (s) => s.type === targetType && getLon(s) !== 0,
      );

      const map = mapInstanceRef.current;
      if (map && map.basemap) {
        const toggleBuildings = (
          layers: Collection<Layer>,
          visible: boolean,
        ) => {
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
        toggleBuildings(map.basemap.baseLayers, false);
        toggleBuildings(map.basemap.referenceLayers, false);
      }

      if (heatmapLayerRef.current)
        mapInstanceRef.current?.remove(heatmapLayerRef.current);

      const isTarmac =
        targetType === "TARMAC_TEMP" || targetType === "WIND_OUTDOOR";
      const isVVTS = activeAirport === "VVTS";

      let targetBlueprint: number[][][] = [];

      if (isVVTS) {
        targetBlueprint = isTarmac
          ? [
              TAN_SON_NHAT_COORDS.RUNWAYS.RWY_25R_07L.area.map((p) => [
                p.lng,
                p.lat,
              ]),
              TAN_SON_NHAT_COORDS.RUNWAYS.RWY_25L_07R.area.map((p) => [
                p.lng,
                p.lat,
              ]),
            ]
          : [
              TAN_SON_NHAT_COORDS.TERMINALS.DOMESTIC.area.map((p) => [
                p.lng,
                p.lat,
              ]),
              TAN_SON_NHAT_COORDS.TERMINALS.INTERNATIONAL.area.map((p) => [
                p.lng,
                p.lat,
              ]),
            ];
      } else {
        targetBlueprint = isTarmac
          ? [LONG_THANH_COORDS.RUNWAYS.MAIN.area.map((p) => [p.lng, p.lat])]
          : [LONG_THANH_COORDS.TERMINALS.MAIN.area.map((p) => [p.lng, p.lat])];
      }

      const outerRing = [
        [106.0, 11.2],
        [107.5, 11.2],
        [107.5, 10.5],
        [106.0, 10.5],
        [106.0, 11.2],
      ];

      const rings = [outerRing];
      targetBlueprint.forEach((bp) => {
        rings.push([...bp].reverse());
      });

      maskLayerRef.current.removeAll();
      maskLayerRef.current.add(
        new GraphicRef.current({
          geometry: new PolygonRef.current({ rings }),
          symbol: new SimpleFillRef.current({
            color: [247, 247, 248, 1],
            outline: { color: [100, 116, 139, 1], width: 2, style: "solid" },
          }),
        }),
      );
      maskLayerRef.current.visible = true;

      const graphics = relevantSensors.map((s, i) => {
        const coords = getOffsetCoords(s);
        return new GraphicRef.current!({
          geometry: new PointRef.current!({
            longitude: coords.lon,
            latitude: coords.lat,
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
            { ratio: 0.5, color: "rgba(255,0,0,0.5)" },
            { ratio: 1, color: "rgba(255,0,0,1)" },
          ],
          radius: 112,
        }),
        elevationInfo: { mode: "on-the-ground" },
      });

      heatmapLayerRef.current = layer;
      mapInstanceRef.current?.add(layer);

      const targetGeometry = new PolygonRef.current!({
        rings: [targetBlueprint[0]],
        spatialReference: { wkid: 4326 },
      });

      viewRef.current?.goTo(
        { target: targetGeometry, tilt: 50, zoom: isTarmac ? 15.5 : 16.5 },
        { duration: 1500, easing: "ease-in-out" },
      );
    } else {
      if (footprintLayerRef.current) footprintLayerRef.current.visible = false;
      if (maskLayerRef.current) maskLayerRef.current.visible = false;

      const map = mapInstanceRef.current;
      if (map && map.basemap) {
        const toggleBuildings = (
          layers: Collection<Layer>,
          visible: boolean,
        ) => {
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
        toggleBuildings(map.basemap.baseLayers, true);
        toggleBuildings(map.basemap.referenceLayers, true);
      }

      if (heatmapLayerRef.current) {
        mapInstanceRef.current?.remove(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
    }
  }, [
    isImmersiveActive,
    focusedSensor?.type,
    isMapReady,
    sensors,
    activeAirport,
  ]);

  // SENSOR LOOP
  useEffect(() => {
    if (!isMapReady || !sensorLayerRef.current) return;

    const PointClass = PointRef.current;
    const GraphicClass = GraphicRef.current;
    const PointSymbol3DClass = PointSymbol3DRef.current;
    const ObjectSymbol3DLayerClass = ObjectSymbol3DLayerRef.current;
    const ColorClass = ColorRef.current;
    if (
      !PointClass ||
      !GraphicClass ||
      !PointSymbol3DClass ||
      !ObjectSymbol3DLayerClass ||
      !ColorClass
    )
      return;

    const currentSensorIds = new Set(sensors.map((s) => s.id));

    const toRemove = sensorLayerRef.current.graphics.filter((g) => {
      const isAnotherSelected =
        selectedEntityType === "sensor" &&
        !!selectedEntityId &&
        selectedEntityId !== g.attributes.id;

      const filterType = g.attributes.filterType;

      return Boolean(
        !currentSensorIds.has(g.attributes.id) ||
        mapFilters[filterType] === false ||
        mapFilters[`cylinders_${filterType}`] === false ||
        isAnotherSelected,
      );
    });

    if (toRemove.length > 0)
      sensorLayerRef.current.removeMany(toRemove.toArray());

    sensors.forEach((sensor) => {
      const isAnotherSelected =
        selectedEntityType === "sensor" &&
        !!selectedEntityId &&
        selectedEntityId !== sensor.id;

      if (mapFilters[sensor.type] === false || isAnotherSelected) return;
      if (mapFilters[`cylinders_${sensor.type}`] === false) return;

      const colProps = getSensorColumnProps(sensor.type, sensor.currentValue);
      const dynamicHeight = Math.max(colProps.height, 10);
      const coords = getOffsetCoords(sensor);

      const symbol3D = new PointSymbol3DClass({
        symbolLayers: [
          new ObjectSymbol3DLayerClass({
            resource: { primitive: "cylinder" },
            material: { color: new ColorClass(colProps.color) },
            width: 10,
            height: dynamicHeight,
            anchor: "bottom",
          }),
        ],
      });

      const existingGraphic = sensorLayerRef.current!.graphics.find(
        (g) => g.attributes.id === sensor.id,
      );

      if (existingGraphic) {
        existingGraphic.geometry = new PointClass({
          longitude: coords.lon,
          latitude: coords.lat,
          spatialReference: { wkid: 4326 },
        });
        existingGraphic.symbol = symbol3D;
      } else {
        sensorLayerRef.current!.add(
          new GraphicClass({
            geometry: new PointClass({
              longitude: coords.lon,
              latitude: coords.lat,
              spatialReference: { wkid: 4326 },
            }),
            symbol: symbol3D,
            attributes: {
              id: sensor.id,
              type: "sensor",
              filterType: sensor.type,
            },
          }),
        );
      }
    });

    if (viewRef.current) syncTooltips(viewRef.current);
  }, [
    sensors,
    mapFilters,
    isMapReady,
    syncTooltips,
    selectedEntityId,
    selectedEntityType,
  ]);

  // PLANES LOOP
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

      const statusStr = (plane.status || "UNKNOWN").toUpperCase();
      const originStr = (plane.origin || "").toUpperCase();

      const isHomeOrigin = HOME_ORIGINS.some((kw) => originStr.includes(kw));

      let isOutbound = false;
      if (OUTBOUND_STATUSES.includes(statusStr)) isOutbound = true;
      else if (INBOUND_STATUSES.includes(statusStr)) isOutbound = false;
      else isOutbound = isHomeOrigin;

      const planeGeom = new PointClass({
        longitude: getLon(plane),
        latitude: getLat(plane),
        spatialReference: { wkid: 4326 },
      });

      const direction = isOutbound ? "outbound" : "inbound";
      const baseHeading =
        direction === "inbound" ? plane.heading + 180 : plane.heading;
      const visualHeading = baseHeading - cameraHeading;

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

        if (existingLogo) {
          existingLogo.geometry = planeGeom;
          const currentSymbol = existingLogo.symbol as PictureMarkerSymbol;

          if (currentSymbol && currentSymbol.url !== proxiedLogoUrl) {
            existingLogo.symbol = new PictureMarkerClass({
              url: proxiedLogoUrl,
              width: "40px",
              height: "40px",
              yoffset: 35,
              xoffset: -6,
            });
          }
        } else if (PictureMarkerClass) {
          airlineLabelLayerRef.current?.add(
            new GraphicClass({
              geometry: planeGeom,
              symbol: new PictureMarkerClass({
                url: proxiedLogoUrl,
                width: "40px",
                height: "40px",
                yoffset: 35,
                xoffset: -6,
              }),
              attributes: { id: `${plane.id}_logo`, type: "label" },
            }),
          );
        }
      }

      const isMovingOnGround = GROUND_STATUSES.includes(statusStr);
      const isAtGroundLevel = plane.altitude < 50;
      const isValidCoordinate = getLon(plane) !== 0 && getLat(plane) !== 0;

      if (
        isMovingOnGround &&
        isAtGroundLevel &&
        isValidCoordinate &&
        plane.path &&
        plane.path.length > 1
      ) {
        const pathCoords = plane.path.map((pt) => [pt.longitude, pt.latitude]);
        if (existingPath) {
          existingPath.geometry = new PolylineClass({ paths: [pathCoords] });
        } else {
          const LineClass = LineRef.current!;
          const ColorClass = ColorRef.current!;
          const trailColor =
            direction === "inbound" ? [6, 182, 212, 1] : [217, 70, 239, 1];
          pathLayerRef.current?.add(
            new GraphicClass({
              geometry: new PolylineClass({ paths: [pathCoords] }),
              symbol: new LineClass({
                style: "solid",
                color: new ColorClass(trailColor),
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

  // ✅ UPDATED VEHICLES LOOP FOR CIVILIAN TRAFFIC
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

      // Hide vehicles if filtered out or explicitly exiting the airport perimeter
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

      // ✅ Dynamically map civilian vehicle types to corresponding icons
      let iconUrl = "/car.svg";
      if (vehicle.type === "TAXI") iconUrl = "/taxi.svg";
      else if (vehicle.type === "RIDE_HAIL") iconUrl = "/ride-hail.svg";
      else if (vehicle.type === "VIP_TRANSFER") iconUrl = "/vip-car.svg";

      if (existingVehicle) {
        existingVehicle.geometry = vehicleGeom;
        if (existingVehicle.symbol) {
          const symbol = existingVehicle.symbol.clone() as PictureMarkerSymbol;
          symbol.angle = visualHeading;

          // Re-assign url smoothly if type payload changes on the fly
          if (symbol.url !== iconUrl) {
            symbol.url = iconUrl;
          }

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
    <>
      <div
        id="map-container"
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: "#f7f7f8" }}
        data-cursor="zoom"
      />

      {!isImmersiveActive && (
        <>
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
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? "bg-[#1e3a8a] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"}`}
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
              className={`flex items-center justify-center p-3.5 rounded-2xl shadow-lg border transition-all ${isBasemapMenuOpen ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white/95 backdrop-blur-md text-gray-700 border-gray-200/80 hover:bg-gray-50 hover:text-[#1e3a8a]"}`}
            >
              <Layers size={20} />
            </motion.button>
          </div>

          <div className="absolute bottom-8 right-[20px] z-40 pointer-events-auto flex flex-col items-end">
            <AnimatePresence>
              {isFilterMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="mb-3 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-xl overflow-hidden flex flex-col origin-bottom-right"
                >
                  <div className="bg-gray-50/80 p-2.5 border-b border-gray-200/60 flex items-center justify-between shrink-0">
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

                  <div className="p-2 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                    {/* PLANES SECTION */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-gray-50">
                      <span className="flex items-center gap-2 truncate uppercase text-[10px] tracking-widest text-gray-700">
                        <Navigation size={12} className="text-[#1e3a8a]" />{" "}
                        Planes
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          title="Toggle Plane Tooltips"
                          onClick={() => toggleMapFilter("tooltips_planes")}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {mapFilters["tooltips_planes"] !== false ? (
                            <MessageSquare
                              size={14}
                              className="text-[#1e3a8a]"
                            />
                          ) : (
                            <MessageSquareOff
                              size={14}
                              className="text-gray-300"
                            />
                          )}
                        </button>
                        <button
                          title="Toggle Plane Visibility"
                          onClick={() => toggleMapFilter("planes")}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {mapFilters["planes"] !== false ? (
                            <Eye size={14} className="text-[#1e3a8a]" />
                          ) : (
                            <EyeOff size={14} className="text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* VEHICLES SECTION - UI Updated for Civilian Traffic */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-gray-50">
                      <span className="flex items-center gap-2 truncate uppercase text-[10px] tracking-widest text-gray-700">
                        <Car size={12} className="text-amber-500" /> Civilian
                        Traffic
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          title="Toggle Vehicle Tooltips"
                          onClick={() => toggleMapFilter("tooltips_vehicles")}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {mapFilters["tooltips_vehicles"] !== false ? (
                            <MessageSquare
                              size={14}
                              className="text-[#1e3a8a]"
                            />
                          ) : (
                            <MessageSquareOff
                              size={14}
                              className="text-gray-300"
                            />
                          )}
                        </button>
                        <button
                          title="Toggle Vehicle Visibility"
                          onClick={() => toggleMapFilter("vehicles")}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {mapFilters["vehicles"] !== false ? (
                            <Eye size={14} className="text-[#1e3a8a]" />
                          ) : (
                            <EyeOff size={14} className="text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* SENSORS HEADER SECTION */}
                    <div
                      className={`mt-2 border-t border-gray-100 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${allSensorsVisible ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <button
                        onClick={() => setIsSensorsExpanded(!isSensorsExpanded)}
                        className={`flex items-center gap-2 flex-1 text-xs font-bold ${allSensorsVisible ? "text-[#1e3a8a]" : "text-gray-500"}`}
                      >
                        {isSensorsExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        <span className="truncate uppercase text-[10px] tracking-widest">
                          Sensors
                        </span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          title="Toggle All Sensor Cylinders"
                          onClick={handleToggleAllSensorCylinders}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <BarChart2
                            size={14}
                            className={
                              allSensorCylindersVisible
                                ? "text-[#1e3a8a]"
                                : "text-gray-300"
                            }
                          />
                        </button>
                        <button
                          title="Toggle All Sensor Tooltips"
                          onClick={handleToggleAllSensorTooltips}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {allSensorTooltipsVisible ? (
                            <MessageSquare
                              size={14}
                              className="text-[#1e3a8a]"
                            />
                          ) : (
                            <MessageSquareOff
                              size={14}
                              className="text-gray-300"
                            />
                          )}
                        </button>
                        <button
                          title="Toggle All Sensor Visibility"
                          onClick={handleToggleAllSensors}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {allSensorsVisible ? (
                            <Eye size={14} className="text-[#1e3a8a]" />
                          ) : (
                            <EyeOff size={14} className="text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED INDIVIDUAL SENSORS LIST */}
                    <AnimatePresence>
                      {isSensorsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-col gap-0.5 overflow-hidden ml-4 pl-2 border-l-2 border-gray-100 mt-1 mb-2"
                        >
                          {sensorKeys.map((key) => {
                            const isVisOn = mapFilters[key] !== false;
                            const isTooltipOn =
                              mapFilters[`tooltips_${key}`] !== false;
                            const isCylinderOn =
                              mapFilters[`cylinders_${key}`] !== false;

                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between py-1.5 px-2 rounded-xl transition-all hover:bg-gray-50"
                              >
                                <span
                                  className={`text-[9px] font-bold uppercase truncate w-24 ${isVisOn ? "text-gray-700" : "text-gray-400"}`}
                                >
                                  {key.replace(/_/g, " ")}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    title={`Toggle ${key} Cylinders`}
                                    onClick={() =>
                                      toggleMapFilter(`cylinders_${key}`)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    <BarChart2
                                      size={12}
                                      className={
                                        isCylinderOn
                                          ? "text-[#1e3a8a]"
                                          : "text-gray-300"
                                      }
                                    />
                                  </button>
                                  <button
                                    title={`Toggle ${key} Tooltips`}
                                    onClick={() =>
                                      toggleMapFilter(`tooltips_${key}`)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    {isTooltipOn ? (
                                      <MessageSquare
                                        size={12}
                                        className="text-[#1e3a8a]"
                                      />
                                    ) : (
                                      <MessageSquareOff
                                        size={12}
                                        className="text-gray-300"
                                      />
                                    )}
                                  </button>
                                  <button
                                    title={`Toggle ${key} Visibility`}
                                    onClick={() => toggleMapFilter(key)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    {isVisOn ? (
                                      <Eye
                                        size={12}
                                        className="text-[#1e3a8a]"
                                      />
                                    ) : (
                                      <EyeOff
                                        size={12}
                                        className="text-gray-300"
                                      />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`flex items-center justify-center p-3.5 rounded-2xl shadow-lg border transition-all ${isFilterMenuOpen ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white/95 backdrop-blur-md text-gray-700 border-gray-200/80 hover:bg-gray-50 hover:text-[#1e3a8a]"}`}
            >
              <Filter size={20} />
            </motion.button>
          </div>
        </>
      )}
    </>
  );
}
