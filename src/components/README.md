# Components

The workspace UI is built in three layers. A component may only import from layers below it.

| Layer | Folder | What belongs here |
|---|---|---|
| **UI kit** | `ui-kit/` | Domain-agnostic primitives: `Panel`, `PanelSection`, `IconButton`, `Toolbar`, `Menu`, `SegmentedControl`, `Switch`, `SearchField`, `KeyValueList`, `ValueReadout`, `Sparkline`, `RangeBar`, `HealthPill`/`HealthDot`, `StatusTag`. No store access, no airport/sensor knowledge beyond the `SensorHealth` type. |
| **Twin** | `twin/` | Domain components composed from the kit: `sensors/` (badge, row, inspector, health summary), `assets/` (flight + vehicle badges, rows, inspectors), `map/` (badge overlay, view toolbar, legend), `layout/` (header, explorer, inspector dock, status bar). |
| **Screens** | `app/page.tsx` | Arranges twin components into the workspace. |

Supporting modules live in `src/lib/`:

- `sensor-meta.ts` — label, unit, icon, value domain and warning/critical bands per sensor type; `getSensorHealth()` is the only place health is computed.
- `sensor-placement.ts` — where each sensor is drawn in 3D (storey elevation, indoor/outdoor column size, fan-out of co-located sensors). Used by the map, badges, camera and heatmap.
- `bim-manifest.ts` — per-storey GLB manifest produced by the API repo's `npm run ifc:glb`.
- `map-commands.ts` — UI → map camera command bus (home, zoom, tilt, north, focus selection).

## Conventions

- **Status colour is never the only cue.** Health always ships with an icon and a label (`HealthPill`, badge status icon). Warning-yellow is never used for text.
- **Value columns encode two things:** fill height = reading within the type's domain (`sensor-meta`), fill colour = health.
- **One source of truth.** A sensor badge, list row and inspector all read `useSensorView()`; do not re-derive health, formatting or deltas in a component.
- Legacy deep-dive panels (`panels/`, `dashboard/`) are reached via *Analytics* in the inspector and the header *Dashboard* button.
