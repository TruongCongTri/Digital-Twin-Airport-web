// Memoized loader for every @arcgis/core module the map needs.
// Calling preloadArcGIS() early (e.g. from page.tsx) starts downloading the SDK chunks
// in parallel with hydration and the initial telemetry fetch, instead of waiting for
// the ArcGISMap chunk to load and mount first.
const loadModules = () =>
  Promise.all([
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
    import("@arcgis/core/Camera"),
  ]);

let modulesPromise: ReturnType<typeof loadModules> | null = null;

export const loadArcGISModules = () => {
  if (!modulesPromise) {
    modulesPromise = loadModules().catch((err) => {
      // Allow a retry on the next call if a chunk failed to download
      modulesPromise = null;
      throw err;
    });
  }
  return modulesPromise;
};

export const preloadArcGIS = () => {
  if (typeof window === "undefined") return;
  loadArcGISModules().catch(() => undefined);
};
