import { useSearchParams } from 'next/navigation';
import React from 'react';

import {
  SingleNeuronSynaptomeBaseSchema,
  type TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { DefaultSynapseValue } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

import { useBuildSingleNeuronSynaptomeSessionState } from '../../../helpers';

export function useValidSetCount(
  synapseSets: Map<string, TSingleNeuronSynaptomeConfiguration> | undefined
) {
  return React.useMemo(
    () =>
      Array.from(synapseSets?.values() ?? [])?.filter(
        (o) => SingleNeuronSynaptomeBaseSchema.safeParse(o).success
      ).length,
    [synapseSets]
  );
}

export function useClickWrapper(sessionId: string, onClick: () => void) {
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const searchParams = useSearchParams();
  const size = sessionValue?.synapseSets?.size ?? 0;

  return React.useCallback(() => {
    if (size === 0) {
      const queryParams = new URLSearchParams(searchParams);

      const id = crypto.randomUUID();
      queryParams.set('set', id);
      const synapseSetsMap = new Map<string, TSingleNeuronSynaptomeConfiguration>([]);
      synapseSetsMap.set(id, {
        ...DefaultSynapseValue,
        id,
        seed: 100,
      });

      setSessionValue({
        ...sessionValue,
        seed: sessionValue?.seed ?? 100,
        synapseSets: synapseSetsMap,
      });
    }
    onClick();
  }, [size, onClick, sessionValue, searchParams, setSessionValue]);
}
