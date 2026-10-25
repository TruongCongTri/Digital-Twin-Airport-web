// Memoized loader for every @arcgis/core module the map needs.
//
// The SDK is loaded at runtime from the Esri CDN (core.js + $arcgis.import) instead of
// being bundled: bundling @arcgis/core made Turbopack emit ~5,000 chunks (~310MB) and
// took ~12 minutes, too slow for free-tier CI builders. The npm package stays as a
// devDependency for `import type` only. Keep ARCGIS_VERSION on the same major.minor
// as @arcgis/core in package.json so the types match the runtime.
//
// Calling preloadArcGIS() early (e.g. from page.tsx) starts downloading the SDK in
// parallel with hydration and the initial telemetry fetch, instead of waiting for
// the ArcGISMap chunk to load and mount first.
export const ARCGIS_VERSION = "5.0";
const CDN = `https://js.arcgis.com/${ARCGIS_VERSION}`;

declare global {
  var $arcgis:
    | { import: (ids: string | string[]) => Promise<unknown> }
    | undefined;
}

const injectOnce = (id: string, create: () => HTMLElement, wait: boolean) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (!wait || existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${id}`)),
        { once: true },
      );
      return;
    }
    const el = create();
    el.id = id;
    el.addEventListener(
      "load",
      () => {
        el.dataset.loaded = "1";
        resolve();
      },
      { once: true },
    );
    el.addEventListener(
      "error",
      () => {
        // Remove the failed tag so a retry injects a fresh one
        el.remove();
        reject(new Error(`Failed to load ${id}`));
      },
      { once: true },
    );
    document.head.appendChild(el);
    if (!wait) resolve();
  });

const loadSdk = async () => {
  // Theme CSS: fire and forget, the view renders fine while it streams in
  void injectOnce(
    "arcgis-css",
    () => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${CDN}/esri/themes/light/main.css`;
      return link;
    },
    false,
  );

  if (!globalThis.$arcgis?.import) {
    await injectOnce(
      "arcgis-core",
      () => {
        const script = document.createElement("script");
        script.type = "module";
        script.src = `${CDN}/core.js`;
        return script;
      },
      true,
    );
  }
  const sdk = globalThis.$arcgis;
  if (!sdk?.import) throw new Error("ArcGIS SDK did not initialise");
  return sdk.import;
};

// $arcgis.import resolves to a module's default export when it has one; wrap the
// classes back into { default } so callers destructure them like dynamic imports.
const asModule = <T>(m: unknown) => {
  const value =
    m && typeof m === "object" && "default" in m
      ? (m as { default: unknown }).default
      : m;
  return { default: value as T };
};

const loadModules = async () => {
  const arcgisImport = await loadSdk();
  const m = (await arcgisImport([
    "@arcgis/core/Map.js",
    "@arcgis/core/views/SceneView.js",
    "@arcgis/core/layers/GraphicsLayer.js",
    "@arcgis/core/Graphic.js",
    "@arcgis/core/geometry/Point.js",
    "@arcgis/core/symbols/PointSymbol3D.js",
    "@arcgis/core/symbols/ObjectSymbol3DLayer.js",
    "@arcgis/core/symbols/PictureMarkerSymbol.js",
    "@arcgis/core/geometry/Polyline.js",
    "@arcgis/core/symbols/SimpleLineSymbol.js",
    "@arcgis/core/Color.js",
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/renderers/HeatmapRenderer.js",
    "@arcgis/core/geometry/Polygon.js",
    "@arcgis/core/symbols/SimpleFillSymbol.js",
    "@arcgis/core/core/reactiveUtils.js",
    "@arcgis/core/Camera.js",
  ])) as unknown[];

  return [
    asModule<typeof import("@arcgis/core/Map").default>(m[0]),
    asModule<typeof import("@arcgis/core/views/SceneView").default>(m[1]),
    asModule<typeof import("@arcgis/core/layers/GraphicsLayer").default>(m[2]),
    asModule<typeof import("@arcgis/core/Graphic").default>(m[3]),
    asModule<typeof import("@arcgis/core/geometry/Point").default>(m[4]),
    asModule<typeof import("@arcgis/core/symbols/PointSymbol3D").default>(m[5]),
    asModule<typeof import("@arcgis/core/symbols/ObjectSymbol3DLayer").default>(
      m[6],
    ),
    asModule<typeof import("@arcgis/core/symbols/PictureMarkerSymbol").default>(
      m[7],
    ),
    asModule<typeof import("@arcgis/core/geometry/Polyline").default>(m[8]),
    asModule<typeof import("@arcgis/core/symbols/SimpleLineSymbol").default>(
      m[9],
    ),
    asModule<typeof import("@arcgis/core/Color").default>(m[10]),
    asModule<typeof import("@arcgis/core/layers/FeatureLayer").default>(m[11]),
    asModule<typeof import("@arcgis/core/renderers/HeatmapRenderer").default>(
      m[12],
    ),
    asModule<typeof import("@arcgis/core/geometry/Polygon").default>(m[13]),
    asModule<typeof import("@arcgis/core/symbols/SimpleFillSymbol").default>(
      m[14],
    ),
    m[15] as typeof import("@arcgis/core/core/reactiveUtils"),
    asModule<typeof import("@arcgis/core/Camera").default>(m[16]),
  ] as const;
};

let modulesPromise: ReturnType<typeof loadModules> | null = null;

export const loadArcGISModules = () => {
  if (!modulesPromise) {
    modulesPromise = loadModules().catch((err) => {
      // Allow a retry on the next call if the CDN request failed
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
