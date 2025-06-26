import { ReactNode } from 'react';

import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { SingleNeuronSimulationStatus } from '@/api/entitycore/types/shared/neuron-simulation';

import type { EntityTypeValue } from '@/api/entitycore/types';

export type Status =
  | 'initialized'
  | 'processing'
  | 'done'
  | 'running'
  | 'error'
  | 'created'
  | 'default';

export type ActivityRecord = {
  id: string;
  key: string;
  scale: string;
  activity: 'Build' | 'Simulate';
  usecase: 'Single cell' | 'Synaptome';
  name: string;
  // TODO: to be confirmed if we keep the Status type
  status: Status | SingleNeuronSimulationStatus;
  date: string | undefined;
  linkUrl: string;
};

export type ActivityColumn = {
  title: string;
  dataIndex?: string;
  key?: keyof ActivityRecord;
  render?: (text: string, record: ActivityRecord) => ReactNode;
};

export const ActivityEntityTypes = {
  [SingleNeuronSimulation.type]: SingleNeuronSimulation,
  [SingleNeuronSynaptomeSimulation.type]: SingleNeuronSynaptomeSimulation,
  [MEmodel.type]: MEmodel,
  [SingleNeuronSynaptome.type]: SingleNeuronSynaptome,
} as const;

export type AllowedEntityTypes = Extract<
  EntityTypeValue,
  | 'single_neuron_synaptome_simulation'
  | 'single_neuron_synaptome'
  | 'memodel'
  | 'single_neuron_simulation'
>;
