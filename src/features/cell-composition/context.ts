import { arrayToTree } from 'performant-array-to-tree';
import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';
import find from 'lodash/find';

import {
  serializeBrainRegionOntologyViews,
  serializeBrainRegionsAndVolumes,
} from '@/features/cell-composition/helpers';
import resolveCellCompositions, {
  ConstructedFullCellComposition,
} from '@/features/cell-composition/parser';
import { brainRegionHierarchyAtom } from '@/features/brain-region-hierarchy/context';
import {
  getCellCompositionSummary,
  getCellCompositionVolume,
} from '@/api/entitycore/queries/general/cell-composition';
import { tryCatch } from '@/api/utils';

import type { ICellCompositionRoot } from '@/api/entitycore/types/entities/cell-composition';
import { renameKeyDeep } from '@/components/tree/elements/helpers';

export const cellCompositionSummaryAtom = atom(async (): Promise<ICellCompositionRoot> => {
  const { data: cellCompositionSummary, error } = await tryCatch(getCellCompositionSummary());

  if (error) {
    console.error('Failed to fetch cell composition summary:', error);
    throw error;
  }

  return cellCompositionSummary;
});

export const cellCompositionVolumeAtom = atom(async () => {
  const { data: cellCompositionVolume, error } = await tryCatch(getCellCompositionVolume());

  if (error) {
    console.error('Failed to fetch cell composition volume:', error);
    throw error;
  }

  const serializedDefinition = serializeBrainRegionsAndVolumes(cellCompositionVolume.defines);
  const brainRegions = serializedDefinition.brainRegions;
  const views =
    'hasHierarchyView' in serializedDefinition
      ? serializeBrainRegionOntologyViews(cellCompositionVolume.hasHierarchyView)
      : null;
  const volumes = serializedDefinition.volumes;

  return {
    volumes,
    views,
    brainRegions,
  };
});

export const cellCompositionAtom = atomFamily(({ brainRegionId }: { brainRegionId: string }) => {
  const childAtom = atom<Promise<ConstructedFullCellComposition>>(async (get): Promise<any> => {
    const [cellComposition, volumesObject, brainRegions] = await Promise.all([
      get(cellCompositionSummaryAtom),
      get(cellCompositionVolumeAtom),
      get(brainRegionHierarchyAtom),
    ]);
    const leaves = find(brainRegions?.leaves, { id: brainRegionId })?.leaves;
    const composition = await resolveCellCompositions({
      leaves,
      volumes: volumesObject.volumes,
      brainRegionId,
      cellComposition,
    });

    const neurons = renameKeyDeep(
      arrayToTree(
        composition.nodes.map(({ neuronComposition, label, ...node }) => ({
          ...node,
          density: neuronComposition.density,
          count: neuronComposition.count,
          title: label,
        })),
        {
          dataField: null,
          parentId: 'parentId',
          childrenField: 'children',
        }
      ),
      'title',
      'name'
    );

    return { ...composition, neurons };
  });

  childAtom.debugLabel = `cell-composition-${brainRegionId}`;
  return childAtom;
});
