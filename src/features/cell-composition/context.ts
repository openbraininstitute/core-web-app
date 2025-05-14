import { arrayToTree } from 'performant-array-to-tree';
import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';
import find from 'lodash/find';

import resolveCellCompositions from '@/features/cell-composition/parser';

import { brainRegionHierarchyAtom } from '@/features/brain-region-hierarchy/context';
import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { renameKeyDeep } from '@/components/tree/elements/helpers';
import {
  getCellCompositionSummary,
  getCellCompositionVolume,
} from '@/api/entitycore/queries/general/cell-composition';
import {
  serializeBrainRegionOntologyViews,
  serializeBrainRegionsAndVolumes,
} from '@/features/cell-composition/helpers';
import { tryCatch } from '@/api/utils';

import type { ICellCompositionRoot } from '@/api/entitycore/types/entities/cell-composition';
import type { ConstructedFullCellComposition } from '@/features/cell-composition/parser';
import type { IAnnotation } from '@/api/entitycore/types/shared/global';

export const cellCompositionSummaryAtom = atom(async (): Promise<ICellCompositionRoot> => {
  const { data: cellCompositionSummary, error } = await tryCatch(getCellCompositionSummary());
  if (error) throw error;
  return cellCompositionSummary;
});

export const cellCompositionVolumeAtom = atom(async () => {
  const { data: cellCompositionVolume, error } = await tryCatch(getCellCompositionVolume());
  if (error) throw error;

  const serializedDefinition = serializeBrainRegionsAndVolumes(cellCompositionVolume.defines);

  const brainRegions = serializedDefinition.brainRegions;
  const views =
    'hasHierarchyView' in serializedDefinition
      ? serializeBrainRegionOntologyViews(cellCompositionVolume.hasHierarchyView)
      : null;
  const volumes = serializedDefinition.volumes;

  return {
    views,
    volumes,
    brainRegions,
  };
});

export const annotationTypes = atom<Promise<Array<IAnnotation>>>(async () => {
  const [etypes, mtypes] = await Promise.all([
    getEtypes({ filters: { page: 1, page_size: 1000 } }),
    getMtypes({ filters: { page: 1, page_size: 1000 } }),
  ]);
  return [...etypes.data, ...mtypes.data];
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
