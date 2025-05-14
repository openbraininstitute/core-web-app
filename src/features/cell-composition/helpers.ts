import has from 'lodash/has';

import type { ITemporaryBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type {
  CellCompositionDefinesItem,
  CellCompositionHierarchyOntologyView,
  CellCompositionHierarchyView,
} from '@/api/entitycore/types/entities/cell-composition';

export type SerializedBrainRegionsAndVolumesResponse = {
  brainRegions: ITemporaryBrainRegionHierarchy[];
  volumes: { [key: string]: number };
};

const sanitizeLeaves = (payload: CellCompositionDefinesItem): string[] => {
  if (has(payload, 'hasLeafRegionPart')) {
    if (typeof payload.hasLeafRegionPart === 'string') {
      return [payload.hasLeafRegionPart];
    }
    return payload.hasLeafRegionPart;
  }
  return payload.hasLeafRegionPart as string[];
};

/**
 * Serializes the brain regions from Nexus format to the local one
 * @param brainRegionPayloads the array of the payloads
 */
export const serializeBrainRegionsAndVolumes = (
  brainRegionPayloads: CellCompositionDefinesItem[]
): SerializedBrainRegionsAndVolumesResponse => {
  const serializedBrainRegions: ITemporaryBrainRegionHierarchy[] = [];
  const volumes: { [key: string]: number } = {};

  brainRegionPayloads.forEach((brainRegionPayload) => {
    const leaves = sanitizeLeaves(brainRegionPayload);

    if (typeof brainRegionPayload !== 'string' && brainRegionPayload.prefLabel) {
      serializedBrainRegions.push({
        id: brainRegionPayload['@id'],
        colorCode: `#${
          brainRegionPayload.color_hex_triplet ? brainRegionPayload.color_hex_triplet : 'FFF'
        }`,
        isPartOf: brainRegionPayload.isPartOf ? brainRegionPayload.isPartOf[0] : null,
        isLayerPartOf: brainRegionPayload.isLayerPartOf
          ? brainRegionPayload.isLayerPartOf[0]
          : null,
        hasLayerPart: brainRegionPayload.hasLayerPart,
        hasPart: brainRegionPayload.hasPart,
        title: brainRegionPayload.prefLabel,
        notation: brainRegionPayload.notation,
        leaves,
        representedInAnnotation: brainRegionPayload.representedInAnnotation,
        volume: (brainRegionPayload.regionVolume?.value || 0) * 10 ** -9,
      });
      if (brainRegionPayload.regionVolume) {
        // retrieving region volume and converting it from cubic micrometer to cubic millimeter
        volumes[brainRegionPayload['@id']] = brainRegionPayload.regionVolume.value * 10 ** -9;
      }
    }
  });
  // removing the duplicate ids
  const ids = serializedBrainRegions.map((br) => br.id);
  return {
    brainRegions: serializedBrainRegions
      .filter(({ id }, index) => !ids.includes(id, index + 1))
      .sort((a, b) => a.title.localeCompare(b.title)),
    volumes,
  };
};

export const serializeBrainRegionOntologyViews = (
  views: Array<CellCompositionHierarchyView>
): Array<CellCompositionHierarchyOntologyView> =>
  views.map((view) => ({
    id: view['@id'],
    leafProperty: view.hasLeafHierarchyProperty,
    parentProperty: view.hasParentHierarchyProperty,
    childrenProperty: view.hasChildrenHierarchyProperty,
    title: view.label,
  }));
