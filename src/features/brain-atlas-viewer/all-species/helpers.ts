import { SPECIES_IMAGE_MAP } from '@/features/brain-region-hierarchy/types';

import type { IHierarchyWithSpecies } from '@/features/brain-region-hierarchy/types';

export type SpeciesRuntimeHierarchy = IHierarchyWithSpecies & {
  atlasId?: string;
};

export const AtlasKindDict = {
  Atlas: 'atlas',
  Image: 'image',
} as const;

export type AtlasKind = (typeof AtlasKindDict)[keyof typeof AtlasKindDict];

export type SpeciesAtlasPreviewSource =
  | { kind: typeof AtlasKindDict.Atlas; atlasId: string; fallbackImageSrc?: string }
  | { kind: typeof AtlasKindDict.Image; imageSrc: string };

export function resolveSpeciesAtlasPreview(
  hierarchy: SpeciesRuntimeHierarchy
): SpeciesAtlasPreviewSource | null {
  const fallbackImageSrc = SPECIES_IMAGE_MAP[hierarchy.species.taxonomyId];

  if (hierarchy.atlasId) {
    return {
      kind: AtlasKindDict.Atlas,
      atlasId: hierarchy.atlasId,
      fallbackImageSrc,
    };
  }

  if (fallbackImageSrc) {
    return {
      kind: AtlasKindDict.Image,
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
