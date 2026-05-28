// State Management (Zustand)
import { create } from "zustand";

interface UIState {
  theme: "light"; // Locked to flat/light design per spec
  selectedSensorIds: string[];
  activeSensorDetailId: string | null;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  searchQuery: string;
  toggleSensorSelection: (id: string) => void;
  setActiveSensorDetail: (id: string | null) => void;
  setSidebarState: (side: "left" | "right", open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  selectedSensorIds: [],
  activeSensorDetailId: null,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  searchQuery: "",

  toggleSensorSelection: (id) =>
    set((state) => ({
      selectedSensorIds: state.selectedSensorIds.includes(id)
        ? state.selectedSensorIds.filter((sId) => sId !== id)
        : [...state.selectedSensorIds, id],
    })),

  setActiveSensorDetail: (id) =>
    set({
      activeSensorDetailId: id,
      rightSidebarOpen: true, // Auto-open right panel to show details
    }),

  setSidebarState: (side, open) =>
    set({
      [`${side}SidebarOpen`]: open,
    }),
}));
