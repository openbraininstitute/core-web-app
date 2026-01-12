import type { IBrainRegionHierarchy } from "@/api/entitycore/types/entities/brain-region";
import type { IBrainRegionHierarchiesResponse } from "@/api/entitycore/types/entities/brain-region-hierarchy";
import { entityCoreApi } from "@/api/entitycore/utils";
import { config } from "@/config";

/**
 * Retrieves the brain region hierarchy from the entity core API.
 *
 * @param params - An object containing the name of the brain region hierarchy to fetch.
 * @param params.name - The name of the brain region hierarchy. Defaults to 'aibs'.
 * @returns A promise that resolves to the brain region hierarchy data.
 */
export async function getBrainRegionHierarchy({
  id = config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
}: {
  id?: string;
}) {
  const api = await entityCoreApi();
  return await api.get<IBrainRegionHierarchy>(
    `/brain-region-hierarchy/${id}/hierarchy`,
  );
}

/**
 * Retrieves all brain region hierarchies with their associated species information from the entity core API.
 *
 * @returns A promise that resolves to the brain region hierarchies data with species information.
 */
export async function getBrainRegionHierarchiesWithSpecies() {
  const api = await entityCoreApi();
  return await api.get<IBrainRegionHierarchiesResponse>(
    `/brain-region-hierarchy`,
  );
}
