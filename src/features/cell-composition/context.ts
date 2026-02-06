import { useQueries, useQuery } from '@tanstack/react-query';
import { arrayToTree } from 'performant-array-to-tree';

import type { ICellCompositionRoot } from '@/api/entitycore/types/entities/cell-composition';
import type { WorkspaceContext } from '@/types/common';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCellCompositions } from '@/api/entitycore/queries/general/cell-composition';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { renameKeyDeep } from '@/components/tree/elements/helpers';
import { config } from '@/config';
import { useBrainRegionAtlasQuery } from '@/features/brain-atlas-viewer/context';
import { usePrimaryHierarchyOfCurrentSpeciesQuery } from '@/features/brain-region-hierarchy/context';
import { resolveBrainRegionCellComposition } from '@/features/cell-composition/composition-constructor';
import { keyBuilderAnnotation } from '@/ui/use-query-keys/annotation';
import { cellCompositionKeyBuilder } from '@/ui/use-query-keys/atlas';
import { log } from '@/utils/logger';

const defaultCellCompositionName = 'Cell Composition from Blue Brain Atlas';

const useCellCompositionSummaryQuery = () => {
  const {
    data: cellComposition,
    error: summaryError,
    isLoading: loadingSummary,
  } = useQuery({
    queryKey: cellCompositionKeyBuilder.summary(),
    queryFn: () =>
      getCellCompositions({
        filters: { name: defaultCellCompositionName },
      }),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    select: (data) => data.data,
  });

  const summaryAsset = getAssetElement({
    assets: cellComposition?.at(0)?.assets,
    filter(i) {
      return i.label === AssetLabel.cell_composition_summary;
    },
  });

  const {
    isLoading: loadingAsset,
    data: cellCompositionSummary,
    error: assetError,
  } = useQuery({
    queryKey: cellCompositionKeyBuilder.summaryAsset(cellComposition?.at(0)?.id!),
    queryFn: () =>
      downloadAsset<ICellCompositionRoot>({
        entityType: EntityTypeDict.CellComposition,
        entityId: cellComposition?.at(0)?.id!,
        id: summaryAsset?.id!,
      }),
    enabled: !!cellComposition?.at(0)?.id! && !!summaryAsset?.id,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (summaryError) {
    return { error: summaryError, loading: loadingSummary, result: null };
  }
  if (!cellComposition?.length)
    return {
      error: new Error(`No cell composition found for ${defaultCellCompositionName}`),
      loading: loadingSummary,
      result: null,
    };
  if (!summaryAsset) {
    return {
      error: new Error(`No summary asset found for ${defaultCellCompositionName}`),
      loading: loadingSummary,
      result: null,
    };
  }

  if (assetError)
    return {
      error: new Error(`No summary asset found for ${defaultCellCompositionName}`),
      loading: loadingSummary,
      result: null,
    };

  return {
    error: null,
    result: cellCompositionSummary,
    loading: loadingAsset || loadingSummary,
  };
};

export const useAnnotationTypesQuery = (ctx: WorkspaceContext) => {
  const annotations = useQueries({
    queries: [
      {
        queryKey: keyBuilderAnnotation.annotations({
          type: 'eType',
          page: 1,
          page_size: 1000,
        }),
        queryFn: () => getEtypes({ ctx, filters: { page: 1, page_size: 1000 } }),
      },
      {
        queryKey: keyBuilderAnnotation.annotations({
          type: 'mType',
          page: 1,
          page_size: 1000,
        }),
        queryFn: () => getMtypes({ ctx, filters: { page: 1, page_size: 1000 } }),
      },
    ],
    combine: ([p1, p2]) => {
      return {
        result: [...(p1.data?.data ?? []), ...(p2.data?.data ?? [])],
        loading: p1.isLoading || p2.isLoading,
        error: p1.error || p2.error,
      };
    },
  });
  return annotations;
};

export const useCellCompositionQuery = ({ brainRegionId }: { brainRegionId?: string }) => {
  const {
    result: brainRegionAtlas,
    loadingAtlas,
    error: atlasError,
  } = useBrainRegionAtlasQuery({ id: config.MOUSE_ATLAS__ID });
  const {
    result: brainRegions,
    loading: loadingHierarchy,
    error: hierarchyError,
  } = usePrimaryHierarchyOfCurrentSpeciesQuery();
  const {
    result: cellComposition,
    loading: loadingComposition,
    error: errorSummary,
  } = useCellCompositionSummaryQuery();

  const emptyResult = {
    totalComposition: {
      neuron: { density: 0, count: 0 },
      glia: { density: 0, count: 0 },
    },
    neurons: [],
  };

  if (!cellComposition || !brainRegions || !brainRegionAtlas.atlas) {
    log('warn', 'Missing required data for composition', {
      hasCellComposition: !!cellComposition,
      hasBrainRegions: !!brainRegions,
      hasBrainRegionAtlas: !!brainRegionAtlas.atlas,
    });

    return {
      error: errorSummary || hierarchyError || atlasError,
      result: emptyResult,
      loading: loadingAtlas || loadingHierarchy || loadingComposition,
    };
  }
  if (!brainRegionId)
    return {
      error: null,
      result: emptyResult,
      loading: loadingAtlas || loadingHierarchy || loadingComposition,
    };

  // Guard against species transition race condition:
  // When switching species, the selectedBrainRegion atom updates immediately with the
  // new species' brain region ID, but the hierarchy query may still return stale data
  // from the previous species. Verify the brainRegionId exists in the current hierarchy
  // before resolving composition to prevent cross-species mismatches.
  const brainRegionExistsInHierarchy = brainRegions.options.some(
    (option) => option.value === brainRegionId
  );
  if (!brainRegionExistsInHierarchy) {
    log('warn', 'Brain region ID not found in current hierarchy — species transition in progress', {
      brainRegionId,
    });
    return {
      error: null,
      result: emptyResult,
      loading: true,
    };
  }

  try {
    const { nodes, totalComposition } = resolveBrainRegionCellComposition({
      brainRegionId,
      cellCompositionRoot: cellComposition,
      atlasRegions: brainRegionAtlas.atlas,
      hierarchy: brainRegions,
    });

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
    return {
      error: null,
      result: { totalComposition, neurons },
      loading: loadingAtlas || loadingHierarchy || loadingComposition,
    };
  } catch (error) {
    log('error', 'Error in cellCompositionAtom:', error);
    return {
      error,
      result: {
        totalComposition: {
          neuron: { density: 0, count: 0 },
          glia: { density: 0, count: 0 },
        },
        neurons: [],
      },
      loading: loadingAtlas || loadingHierarchy || loadingComposition,
    };
  }
};
