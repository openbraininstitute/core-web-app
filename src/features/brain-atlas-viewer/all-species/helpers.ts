import { SPECIES_IMAGE_MAP } from '@/features/brain-region-hierarchy/types';

import type { IHierarchyWithSpecies } from '@/features/brain-region-hierarchy/types';

export type SpeciesRuntimeHierarchy = IHierarchyWithSpecies & {
  atlasId?: string;
};

export type SpeciesAtlasPreviewSource =
  | { kind: 'atlas'; atlasId: string; fallbackImageSrc?: string }
  | { kind: 'image'; imageSrc: string };

export function resolveSpeciesAtlasPreview(
  hierarchy: SpeciesRuntimeHierarchy
): SpeciesAtlasPreviewSource | null {
  const fallbackImageSrc = SPECIES_IMAGE_MAP[hierarchy.species.taxonomyId];

  if (hierarchy.atlasId) {
    return {
      kind: 'atlas',
      atlasId: hierarchy.atlasId,
      fallbackImageSrc,
    };
  }

  if (fallbackImageSrc) {
    return {
      kind: 'image',
      imageSrc: fallbackImageSrc,
    };
  }

  return null;
}

const mountedPreviewHierarchyIds = new Set<string>();

export function hasMountedSpeciesAtlasPreview(hierarchyId: string) {
  return mountedPreviewHierarchyIds.has(hierarchyId);
}

export function markSpeciesAtlasPreviewMounted(hierarchyId: string) {
  mountedPreviewHierarchyIds.add(hierarchyId);
}
