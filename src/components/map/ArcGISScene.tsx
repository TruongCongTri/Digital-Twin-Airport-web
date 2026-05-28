/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useTelemetryStore } from "@/src/store/useTelemetryStore";
import { useUIStore } from "@/src/store/useUIStore";
import { useEffect, useRef } from "react";

export default function ArcGISScene() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const sensors = useTelemetryStore((state) => state.sensors);
  const setScreenPoints = useTelemetryStore((state) => state.setScreenPoints);
  const setActiveSensorDetail = useUIStore(
    (state) => state.setActiveSensorDetail,
  );

  useEffect(() => {
    let view: any;

    const loadMap = async () => {
      const [Map, SceneView, Graphic, GraphicsLayer, reactiveUtils] =
        await Promise.all([
          window.require("esri/Map"),
          window.require("esri/views/SceneView"),
          window.require("esri/Graphic"),
          window.require("esri/layers/GraphicsLayer"),
          window.require("esri/core/reactiveUtils"),
        ]);

      // Base layer applied with flat off-white aesthetic
      const map = new Map({
        basemap: "gray-vector",
        ground: "world-elevation",
      });

      view = new SceneView({
        container: mapDiv.current,
        map: map,
        camera: {
          position: { x: 106.9633, y: 10.75, z: 1200 },
          tilt: 65,
          heading: 0,
        },
        environment: {
          background: { type: "color", color: [244, 245, 247, 1] }, // Matches #F4F5F7
          starsEnabled: false,
          atmosphereEnabled: false,
        },
        ui: { components: [] }, // Hide default Esri widgets for flat design
      });

      // Map Click Interceptor for Sensors
      view.on("click", async (event: any) => {
        const response = await view.hitTest(event);
        const graphicHit = response.results.find(
          (r: any) => r.graphic.attributes?.id,
        );
        if (graphicHit) {
          setActiveSensorDetail(graphicHit.graphic.attributes.id);
        }
      });

      // Sync 3D points to 2D screen coordinates for HTML Bubbles
      const updateScreenCoords = () => {
        if (!view.ready) return;
        const currentSensors = useTelemetryStore.getState().sensors;

        const points = Object.values(currentSensors).map((s: any) => {
          const sp = view.toScreen({
            type: "point",
            longitude: s.x,
            latitude: s.y,
            z: s.z,
          });
          const isValid = sp && !isNaN(sp.x) && !isNaN(sp.y);
          return {
            ...s,
            screenX: isValid ? sp.x : -1000,
            screenY: isValid ? sp.y : -1000,
            visible: isValid,
          };
        });
        setScreenPoints(points);
      };

      reactiveUtils.watch(() => view.camera, updateScreenCoords);
      view.on(["drag", "mouse-wheel"], updateScreenCoords);
    };

    // if (window.require()) loadMap();

    return () => {
      if (view) view.destroy();
    };
  }, []);

  return (
    <div
      ref={mapDiv}
      className="absolute inset-0 w-full h-full z-0 outline-none bg-[#F4F5F7]"
    />
  );
}
