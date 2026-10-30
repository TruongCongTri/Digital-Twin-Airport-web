# 🚀 Enterprise Next.js Boilerplate

An Enterprise-grade boilerplate built with Next.js App Router, Tailwind CSS, Zustand, React Hook Form, Zod, and Axios.

## 🛠 Environment Setup

Clone the repository to your local machine.

Run npm install to install dependencies.

Duplicate the .env.example file, rename it to .env, and fill in the required environment variables.

Run npm run dev to start the development server.

## 🤖 Automated Code Scaffolding (Plop.js)

This project strictly utilizes Plop.js to automatically generate structurally compliant files. To maintain architectural consistency and avoid errors, absolutely DO NOT create files or folders manually.

Run the following command in your Terminal whenever you need to add a new feature or component:

npm run generate


The system will prompt you with 3 options:

page: Create a new Route/Page (Automatically includes layout.tsx, loading.tsx, error.tsx, and an internal _components folder).

local-ui: Create a localized UI Component scoped strictly to a specific route's _components directory.

global-ui: Create a globally reusable Component (e.g., Buttons, Modals, Containers, Shells) placed in components/ui or components/layouts.

## 🚢 Deployment

**Vercel:** deploy as usual; set `NEXT_PUBLIC_API_URL` (e.g. `https://api.example.com/api/v1`) in the project's environment variables. The build uses Vercel's native output.

**Docker:** the `Dockerfile` builds a Next.js standalone server (non-root, port 3000). `NEXT_PUBLIC_API_URL` is compiled into the client bundle, so it is a **required build arg** (build one image per API endpoint):

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 -t digital-twin-airport-web .
docker run -p 3000:3000 digital-twin-airport-web
```

Make sure the API's `CLIENT_URL` includes this app's origin (CORS and Socket.IO). BIM models in `public/models` are served by the app itself; regenerate them from the IFC with `npm run ifc:glb` (VVGA) or `npm run ifc:glb:vvng` (VVNG) in the API repo.

**ArcGIS is loaded from the Esri CDN, not bundled.** `src/components/map/arcgis-modules.ts` injects `https://js.arcgis.com/5.0/core.js` (and the light theme CSS) at runtime and loads classes with `$arcgis.import`. Bundling `@arcgis/core` used to take ~12 min and emit ~5,000 chunks (~310MB), which free-tier builders (Vercel Hobby, Render free) could not finish; the build now takes well under a minute. `@arcgis/core` and `@esri/calcite-components` are devDependencies used for `import type` only, so:

- never add a runtime (non-`type`) `import ... from "@arcgis/core/..."`; add the module id to `loadModules()` in `arcgis-modules.ts` instead;
- when upgrading `@arcgis/core`, bump `ARCGIS_VERSION` in `arcgis-modules.ts` to the same major.minor;
- the browser needs to reach `js.arcgis.com` (add it to `script-src`, `style-src` and `connect-src` if you add a CSP).

