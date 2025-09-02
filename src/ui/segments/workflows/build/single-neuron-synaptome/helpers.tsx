'use client';

import type { ReactNode } from 'react';
import superjson from 'superjson';

import { useSessionStorage } from '@/hooks/use-session-storage';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IMEModel } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  sessionId: string;
};

export const BuildStep = {
  Info: 'info',
  MEModel: 'me-model',
  SynapseSet: 'synapse-set',
} as const;
export type BuildStepKeys = (typeof BuildStep)[keyof typeof BuildStep];

export function useBuildSingleNeuronSynaptomeSessionState(props: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { sessionValue, removeSessionValue, setSessionValue } = useSessionStorage<
    | (Partial<WorkspaceContext> & {
        seed: number;
        name?: string | undefined;
        description?: string | undefined;
        memodel?: IMEModel | undefined;
        synapseSets?: Map<string, TSingleNeuronSynaptomeConfiguration>;
        synapseCount?: Map<string, number>;
      })
    | null
  >(
    props.sessionId,
    {
      seed: 100,
      name: undefined,
      description: undefined,
      memodel: undefined,
      virtualLabId,
      projectId,
      synapseSets: undefined,
    },
    {
      initializeWithValue: true,
      serializer: (value) => superjson.stringify(value),
      deserializer: (value) => superjson.parse(value),
    }
  );

  return {
    sessionValue,
    setSessionValue,
    removeSessionValue,
  };
}

export const label = (text: string, type: 'main' | 'secondary' = 'main', extra?: ReactNode) => (
  <span
    className={cn(
      'text-base font-light uppercase',
      type === 'main' && 'text-primary-8 !font-bold',
      type === 'secondary' && 'text-label'
    )}
  >
    {text} {extra}
  </span>
);
