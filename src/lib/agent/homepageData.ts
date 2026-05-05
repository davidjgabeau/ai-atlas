import type {
  EditorialSurface,
  EditorialSurfaceName,
  MarketSnapshot,
} from "../../types/agent";
import { readAgentDataFiles } from "./jsonStore";
import { loadAgentDataFromSupabase } from "./supabaseAgentStore";

export type StoredAgentHomepageData = {
  editorialSurfaces: EditorialSurface[];
  marketSnapshots: MarketSnapshot[];
};

export async function getStoredAgentHomepageData(): Promise<StoredAgentHomepageData> {
  const [jsonData, supabaseData] = await Promise.all([
    readAgentDataFiles(),
    loadAgentDataFromSupabase(),
  ]);

  return {
    editorialSurfaces: preferSupabase(
      supabaseData.editorialSurfaces,
      jsonData.editorialSurfaces,
    ),
    marketSnapshots: preferSupabase(
      supabaseData.marketSnapshots,
      jsonData.marketSnapshots,
    ),
  };
}

export function getLatestSurface(
  surfaces: EditorialSurface[],
  surfaceName: EditorialSurfaceName,
) {
  return surfaces
    .filter((surface) => surface.surface === surfaceName)
    .sort((a, b) => getTime(b.generatedAt) - getTime(a.generatedAt))[0];
}

export function getLatestSnapshot(snapshots: MarketSnapshot[]) {
  return [...snapshots].sort(
    (a, b) => getTime(b.generatedAt) - getTime(a.generatedAt),
  )[0];
}

function preferSupabase<T>(supabaseValue: T[] | undefined, jsonValue: T[]) {
  return supabaseValue && supabaseValue.length > 0 ? supabaseValue : jsonValue;
}

function getTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
