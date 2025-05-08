import { parseAsString, useQueryStates } from 'nuqs';
import type { Parser } from 'nuqs';

import { useSessionStorage } from '@/hooks/useSessionStorage';

import type { WorkspaceContext } from '@/types/common';
import type { IMEModel } from '@/api/entitycore/types';

export type SingleNeuronSynaptomeConfigPhase = 'basic' | 'me-model' | 'placement';
type Props = WorkspaceContext & {
  stateId: string;
};

export default function useBuildSingleNeuronSynaptomeSessionState(props: Props) {
  const { sessionValue, removeSessionValue, setSessionValue } = useSessionStorage<{
    name: string;
    description: string;
    selectedRows: Array<IMEModel> | null;
  } | null>(props.stateId, null, { initializeWithValue: true });

  const [{ memodelId, phase }, updateQueryConfig] = useQueryStates(
    {
      stateId: parseAsString.withDefault(''),
      phase: parseAsString.withDefault('basic') as Parser<SingleNeuronSynaptomeConfigPhase>,
      memodelId: parseAsString.withDefault(''),
    },
    {
      history: 'push',
      urlKeys: {
        phase: 'p',
        stateId: 's',
        memodelId: 'm',
      },
    }
  );

  return {
    phase,
    memodelId,
    sessionValue,
    setSessionValue,
    updateQueryConfig,
    removeSessionValue,
  };
}

export function useSession() {}
