// Loads the per-storey manifest written by the API repo's IFC -> GLB converter.
import { useQuery } from "@tanstack/react-query";

export interface BimStorey {
  id: string;
  name: string;
  elevation: number;
  file: string;
  triangles: number;
  bytes: number;
}

export interface BimManifest {
  source: string;
  schema?: string; // e.g. IFC2X3; older manifests omit it (IFC4)
  storeys: BimStorey[];
}

const manifests = new Map<string, Promise<BimManifest>>();

export const loadBimManifest = (baseUrl: string) => {
  if (!manifests.has(baseUrl)) {
    manifests.set(
      baseUrl,
      fetch(`${baseUrl}/manifest.json`).then((r) => {
        if (!r.ok) throw new Error(`BIM manifest ${r.status}`);
        return r.json() as Promise<BimManifest>;
      }),
    );
  }
  return manifests.get(baseUrl)!;
};

export const useBimManifest = (baseUrl: string | undefined) =>
  useQuery({
    queryKey: ["bim-manifest", baseUrl],
    queryFn: () => loadBimManifest(baseUrl!),
    enabled: !!baseUrl,
    staleTime: Infinity,
  });
