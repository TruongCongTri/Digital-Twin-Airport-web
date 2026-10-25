// Workspace UI state (panels, viewer settings). Entity data and map layer
// filters live in airport-store; this store only holds how the workspace is laid out.
import { create } from "zustand";
import type { SensorHealth } from "@/src/lib/sensor-meta";
import type { SensorType } from "@/types";

export type ExplorerTab = "layers" | "sensors" | "assets";
export type BadgeMode = "all" | "alerts" | "off";

interface UIState {
  explorerOpen: boolean;
  explorerTab: ExplorerTab;
  analyticsOpen: boolean; // deep-dive panels for the selected entity
  basemap: string;
  badgeMode: BadgeMode;
  sensorSearch: string;
  sensorHealthFilter: SensorHealth | "all";
  sensorTypeFilter: SensorType | "all";
  bimXray: boolean;
  autoSection: boolean; // cut away the model above a selected indoor sensor
  hiddenStoreys: string[];

  setExplorerOpen: (open: boolean) => void;
  setExplorerTab: (tab: ExplorerTab) => void;
  setAnalyticsOpen: (open: boolean) => void;
  setBasemap: (basemap: string) => void;
  setBadgeMode: (mode: BadgeMode) => void;
  setSensorSearch: (query: string) => void;
  setSensorHealthFilter: (filter: SensorHealth | "all") => void;
  setSensorTypeFilter: (filter: SensorType | "all") => void;
  setAutoSection: (on: boolean) => void;
  setBimXray: (xray: boolean) => void;
  toggleStorey: (storeyId: string) => void;
  setHiddenStoreys: (storeyIds: string[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  explorerOpen: true,
  explorerTab: "sensors",
  analyticsOpen: false,
  basemap: "gray-3d",
  badgeMode: "all",
  sensorSearch: "",
  sensorHealthFilter: "all",
  sensorTypeFilter: "all",
  bimXray: false,
  autoSection: true,
  hiddenStoreys: [],

  setExplorerOpen: (open) => set({ explorerOpen: open }),
  setExplorerTab: (tab) => set({ explorerTab: tab, explorerOpen: true }),
  setAnalyticsOpen: (open) => set({ analyticsOpen: open }),
  setBasemap: (basemap) => set({ basemap }),
  setBadgeMode: (mode) => set({ badgeMode: mode }),
  setSensorSearch: (query) => set({ sensorSearch: query }),
  setSensorHealthFilter: (filter) => set({ sensorHealthFilter: filter }),
  setSensorTypeFilter: (filter) => set({ sensorTypeFilter: filter }),
  setAutoSection: (on) => set({ autoSection: on }),
  setBimXray: (xray) => set({ bimXray: xray }),
  toggleStorey: (storeyId) =>
    set((state) => ({
      hiddenStoreys: state.hiddenStoreys.includes(storeyId)
        ? state.hiddenStoreys.filter((id) => id !== storeyId)
        : [...state.hiddenStoreys, storeyId],
    })),
  setHiddenStoreys: (storeyIds) => set({ hiddenStoreys: storeyIds }),
}));
