import { forceFlightPipeline } from "@/src/lib/api-client";
import { useAirportStore } from "@/src/store/airport-store";
import { toast } from "sonner";

export function PipelineControlPanel() {
  const activeAirport = useAirportStore((state) => state.activeAirport); // e.g., "VVTS"

  const handleForcePipeline = async () => {
    toast.loading("Resetting and triggering pipeline...");
    try {
      const result = await forceFlightPipeline(activeAirport);
      toast.success("Pipeline Triggered!", {
        description: result.data.message,
      });
    } catch (error) {
      toast.error("Failed to trigger pipeline");
    }
  };

  return (
    <button
      onClick={handleForcePipeline}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold"
    >
      Force Flight Pipeline
    </button>
  );
}
