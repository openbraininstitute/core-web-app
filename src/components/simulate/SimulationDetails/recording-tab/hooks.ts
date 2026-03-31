import { type MorphoViewerTree, morphoViewerConvertMorphologyIntoTree } from '@bbp/morphoviewer';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { getSingleNeuronMorphology } from '@/api/small-scale-simulator';
import useWorkspace from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { logError } from '@/utils/logger';

export function useMorphology(meModelId: string): MorphoViewerTree | undefined {
  const { virtualLabId, projectId } = useWorkspace();
  const {
    isLoading: loading,
    error,
    data,
  } = useQuery({
    queryKey: keyBuilder.neuronMorphology3DData({ virtualLabId, projectId, modelId: meModelId }),
    queryFn: () => {
      return getSingleNeuronMorphology({ ctx: { virtualLabId, projectId }, meModelId });
    },
  });

  const tree = React.useMemo(() => {
    if (!data) return undefined;

    return morphoViewerConvertMorphologyIntoTree(data, 'Cell');
  }, [data]);
  if (error) {
    logError(`Unable to load morphology for me-model "${meModelId}":`, error);
    return undefined;
  }

  return loading ? undefined : tree;
}
