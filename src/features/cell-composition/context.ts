import { arrayToTree } from 'performant-array-to-tree';
import { atomFamily } from 'jotai/utils';
import { Atom, atom } from 'jotai';

import { resolveBrainRegionCellComposition } from '@/features/cell-composition/composition-constructor';
import { getCellCompositionSummary } from '@/api/entitycore/queries/general/cell-composition';
import { brainRegionBasicCellGroupsRegionsHierarchyAtom } from '@/features/brain-region-hierarchy/context';
import { brainRegionAtlasAtom } from '@/features/brain-atlas-viewer/context';
import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { renameKeyDeep } from '@/components/tree/elements/helpers';
import { tryCatch } from '@/api/utils';
import { log } from '@/utils/logger';

import type { ICellCompositionRoot } from '@/api/entitycore/types/entities/cell-composition';
import type { IAnnotation } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

export const cellCompositionSummaryAtom = atom(async (): Promise<ICellCompositionRoot> => {
  const { data: cellCompositionSummary, error } = await tryCatch(getCellCompositionSummary());
  if (error) throw error;
  return cellCompositionSummary;
});

export const annotationTypesAtom = atomFamily<WorkspaceContext, Atom<Promise<Array<IAnnotation>>>>(
  (ctx: WorkspaceContext) => {
    const childAtom = atom(async () => {
      const [etypes, mtypes] = await Promise.all([
        getEtypes({ ctx, filters: { page: 1, page_size: 1000 } }),
        getMtypes({ ctx, filters: { page: 1, page_size: 1000 } }),
      ]);
      return [...etypes.data, ...mtypes.data];
    });

    childAtom.debugLabel = 'annotation-types';
    return childAtom;
  }
);

export const cellCompositionAtom = atomFamily(({ brainRegionId }: { brainRegionId: string }) => {
  const childAtom = atom(async (get) => {
    try {
      const [cellComposition, brainRegions, brainRegionAtlas] = await Promise.all([
        get(cellCompositionSummaryAtom),
        get(brainRegionBasicCellGroupsRegionsHierarchyAtom),
        get(brainRegionAtlasAtom),
      ]);

      if (!cellComposition || !brainRegions || !brainRegionAtlas?.data?.data) {
        log('warn', 'Missing required data for composition', {
          hasCellComposition: !!cellComposition,
          hasBrainRegions: !!brainRegions,
          hasBrainRegionAtlas: !!brainRegionAtlas?.data?.data,
        });

        return {
          totalComposition: { neuron: { density: 0, count: 0 }, glia: { density: 0, count: 0 } },
          neurons: [],
        };
      }

      const { nodes, totalComposition } = resolveBrainRegionCellComposition(
        brainRegionId,
        cellComposition,
        brainRegionAtlas.data?.data,
        brainRegions
      );

      const neurons = renameKeyDeep(
        arrayToTree(
          nodes.map(({ composition, label, ...node }) => ({
            ...node,
            density: composition.neuron.density,
            count: composition.neuron.count,
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

      return { totalComposition, neurons };
    } catch (error) {
      log('error', 'Error in cellCompositionAtom:', error);
      return {
        totalComposition: { neuron: { density: 0, count: 0 }, glia: { density: 0, count: 0 } },
        neurons: [],
      };
    }
  });

  childAtom.debugLabel = `cell-composition-${brainRegionId}`;
  return childAtom;
});
