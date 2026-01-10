import { entityCoreApi } from '@/api/entitycore/utils';
import { IBrainRegionHierarchyWithSpecies } from '@/api/entitycore/types/entities/brain-region-hierarchy';

export async function getBrainRegionHierarchiesWithSpecies() {
  const api = await entityCoreApi();
  return await api.get<IBrainRegionHierarchyWithSpecies>(`/brain-region-hierarchy`);
}
