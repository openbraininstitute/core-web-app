import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSingleNeuronMorphology } from '@/api/small-scale-simulator';
import type { Morphology } from '@/services/bluenaas-single-cell/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

export function useMorphology({
  modelId,
  callback,
  projectId,
  virtualLabId,
}: {
  modelId: string;
  callback: (morphology: Morphology) => void;
  projectId: string;
  virtualLabId: string;
}) {
  const {
    isLoading: loading,
    isSuccess,
    error,
    data,
  } = useQuery({
    queryKey: keyBuilder.neuronMorphology3DData({
      virtualLabId,
      projectId,
      modelId,
    }),
    queryFn: () => {
      return getSingleNeuronMorphology({
        ctx: { virtualLabId, projectId },
        meModelId: modelId,
      });
    },
  });

  useEffect(() => {
    if (isSuccess && data) {
      callback(data);
    }
  }, [data, callback, isSuccess]);

  return { loading, error };
}
