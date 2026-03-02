import { usePathname, useSearchParams } from 'next/navigation';
import React from 'react';

import { SingleNeuronSynaptomeBaseSchema } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { browserHistoryReplace } from '@/utils/browser';

import type { BuildStepKeys } from './helpers';
import type { Config } from './synapse-set-item/types';

export function useStepChangeHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return React.useCallback(
    (s: BuildStepKeys) => {
      const query = new URLSearchParams(searchParams);
      query.set('step', s);

      browserHistoryReplace(null, `${pathname}?${query.toString()}`);
    },
    [searchParams, pathname]
  );
}

export function useAddSynapticButtonEnabled(
  synapseSets: Map<string, Config | undefined> | undefined,
  setId: string | null
) {
  if (!synapseSets) return true;

  const currentSet = synapseSets.get(setId ?? '');
  if (!currentSet) return true;

  return SingleNeuronSynaptomeBaseSchema.safeParse(currentSet).success;
}
