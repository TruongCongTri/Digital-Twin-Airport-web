// Tiny command bus from UI controls (toolbar, inspector, header) to the ArcGIS view,
// so the map component stays the only owner of the SceneView instance.
export type MapCommand =
  | { type: "home" }
  | { type: "zoom"; delta: 1 | -1 }
  | { type: "toggle-tilt" }
  | { type: "north" }
  | { type: "focus-selection" };

const EVENT = "twin-map-command";

export const dispatchMapCommand = (command: MapCommand) =>
  window.dispatchEvent(new CustomEvent<MapCommand>(EVENT, { detail: command }));

export const onMapCommand = (handler: (command: MapCommand) => void) => {
  const listener = (e: Event) => handler((e as CustomEvent<MapCommand>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
};
