// Single registry of every airport the map can show. Add an airport here (plus its
// coordinate constants) and it appears in the pickers, map, panels and heatmaps.
import { LONG_THANH_COORDS, TAN_SON_NHAT_COORDS } from "./airport-coordinate";
import { GREEN_AIRPORT_COORDS } from "./green-airport-coordinates";
import { NHA_GA_COORDS } from "./nha-ga-coordinates";

type LatLng = { lat: number; lng: number };

export type RouteGroup = {
  taxiPath?: LatLng[];
  flightInbound?: LatLng[];
  inbound?: LatLng[];
  flightOutbound?: LatLng[];
  outbound?: LatLng[];
};

export interface AirportConfig {
  id: string; // ICAO code, used as airportId in the API
  code: string; // Short public code shown in the UI
  name: string; // Short name, e.g. "Long Thanh"
  fullName: string; // Directory label, e.g. "Long Thanh Int'l"
  center: LatLng;
  terminalAreas: LatLng[][];
  runwayAreas: LatLng[][];
  routeGroups: RouteGroup[];
  iotVlan: number;
  // Optional BIM model: per-storey glTF files + manifest.json under `baseUrl`,
  // placed at `origin` and rotated by `heading`
  model?: { baseUrl: string; origin: LatLng; heading: number };
  // Pavement drawn by the app where the basemap has none (e.g. a greenfield site)
  pavedAreas?: LatLng[][];
}

export const AIRPORTS: AirportConfig[] = [
  {
    id: "VVLT",
    code: "LTN",
    name: "Long Thanh",
    fullName: "Long Thanh Int'l",
    center: LONG_THANH_COORDS.CENTER,
    terminalAreas: [LONG_THANH_COORDS.TERMINALS.MAIN.area],
    runwayAreas: [
      LONG_THANH_COORDS.RUNWAYS.RWY_05R_23L.area,
      LONG_THANH_COORDS.RUNWAYS.RWY_05L_23R.area,
    ],
    routeGroups: [
      LONG_THANH_COORDS.ROUTES.T1,
      LONG_THANH_COORDS.ROUTES.T2,
      LONG_THANH_COORDS.ROUTES.T3,
    ],
    iotVlan: 4,
  },
  {
    id: "VVTS",
    code: "SGN",
    name: "Tan Son Nhat",
    fullName: "Tan Son Nhat Int'l",
    center: TAN_SON_NHAT_COORDS.CENTER,
    terminalAreas: [
      TAN_SON_NHAT_COORDS.TERMINALS.DOMESTIC.area,
      TAN_SON_NHAT_COORDS.TERMINALS.INTERNATIONAL.area,
    ],
    runwayAreas: [
      TAN_SON_NHAT_COORDS.RUNWAYS.RWY_25R_07L.area,
      TAN_SON_NHAT_COORDS.RUNWAYS.RWY_25L_07R.area,
    ],
    routeGroups: [
      TAN_SON_NHAT_COORDS.ROUTES.DOMESTIC,
      TAN_SON_NHAT_COORDS.ROUTES.INTERNATIONAL,
    ],
    iotVlan: 2,
  },
  {
    id: GREEN_AIRPORT_COORDS.CODE,
    code: "VGA",
    name: "Green Airport",
    fullName: "Vietnam Green Airport",
    center: GREEN_AIRPORT_COORDS.CENTER,
    terminalAreas: [GREEN_AIRPORT_COORDS.TERMINALS.MAIN.area],
    runwayAreas: [
      GREEN_AIRPORT_COORDS.RUNWAYS.RWY_07R_25L.area,
      GREEN_AIRPORT_COORDS.RUNWAYS.RWY_06L_24R.area,
    ],
    routeGroups: [GREEN_AIRPORT_COORDS.ROUTES.MAIN],
    iotVlan: 6,
    model: GREEN_AIRPORT_COORDS.MODEL,
    pavedAreas: [
      GREEN_AIRPORT_COORDS.APRON.area,
      GREEN_AIRPORT_COORDS.RUNWAYS.RWY_07R_25L.area,
      GREEN_AIRPORT_COORDS.RUNWAYS.RWY_06L_24R.area,
    ],
  },
  {
    id: NHA_GA_COORDS.CODE,
    code: "NGA",
    name: "Nha Ga",
    fullName: NHA_GA_COORDS.NAME,
    center: NHA_GA_COORDS.CENTER,
    terminalAreas: [NHA_GA_COORDS.SITE.area],
    runwayAreas: [NHA_GA_COORDS.RUNWAYS.RWY_07_25.area],
    routeGroups: [NHA_GA_COORDS.ROUTES.WEST, NHA_GA_COORDS.ROUTES.EAST],
    iotVlan: 8,
    model: NHA_GA_COORDS.MODEL,
    pavedAreas: [
      ...NHA_GA_COORDS.AIRSIDE.areas,
      NHA_GA_COORDS.RUNWAYS.RWY_07_25.area,
    ],
  },
];

export const DEFAULT_AIRPORT = AIRPORTS[0];

export const getAirportConfig = (id: string | null | undefined) =>
  AIRPORTS.find((a) => a.id === id) ?? DEFAULT_AIRPORT;

export const getAirportName = (id: string | null | undefined) =>
  getAirportConfig(id).name;
