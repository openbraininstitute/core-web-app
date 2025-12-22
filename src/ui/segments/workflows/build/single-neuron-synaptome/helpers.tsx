'use client';

import type { ReactNode } from 'react';
import superjson from 'superjson';
import type { IMEModel } from '@/api/entitycore/types';
import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { useSessionStorage } from '@/hooks/use-session-storage';
import type { WorkspaceContext } from '@/types/common';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

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

export const DefaultColor = '#003a8c';
export const DefaultInjectionColor = '#fff';
export const SimulationColors = [
  '#32C14E',
  '#8AB5FF',
  '#DC51FF',
  '#B3A26E',
  '#F02124',
  '#32D4C1',
  '#814BFF',
  '#E3F750',
  '#D653C5',
  '#AD7A14',
  '#87BB74',
  '#DFC6AE',
  '#5778FF',
  '#81ADE0',
  '#99FF80',
  '#FFCF30',
  '#5193BA',
  '#DD63CF',
];

export const DefaultSynapseValue: TSingleNeuronSynaptomeConfiguration = {
  id: '',
  name: '',
  target: undefined,
  type: 110,
  formula: '',
  seed: 100,
  exclusion_rules: null,
  soma_synapse_count: 50,
  color: SimulationColors.at(0) ?? DefaultColor,
};
