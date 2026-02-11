/* eslint-disable no-nested-ternary */

import pProps from 'p-props';

import { getElectricalCellRecordings } from '@/api/entitycore/queries/experimental/electrical-cell-recording';
import { getEntitiesCount } from '@/api/entitycore/queries/general/entity';
import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { config } from '@/config';
import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { EmCellMesh } from '@/entity-configuration/domain/experimental/em-cell-mesh';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { SynapsesPerConnection } from '@/entity-configuration/domain/experimental/synapses-per-connection';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { IonChannelModel } from '@/entity-configuration/domain/model/ion-channel-model';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { MEModelWithSynapsesCircuit } from '@/entity-configuration/domain/model/me-model-with-synapses';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { MEModelCircuitSimulation } from '@/entity-configuration/domain/simulation/memodel-circuit-simulation';
import { MicrocircuitSimulation } from '@/entity-configuration/domain/simulation/microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { SingeNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/single-neuron-circuit-simulation';
import { SingleNeuronSimulation } from '@/entity-configuration/domain/simulation/single-neuron-simulation';
import { SingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

export const ExperimentalEntitiesTileTypes = {
  ReconstructionMorphology: CellMorphology,
  ElectricalCellRecording,
  IonChannelRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsesPerConnection,
  EmCellMesh,
} as const;

export const ModelEntitiesTileTypes = {
  SingleNeuronSynaptome,
  MEModelWithSynapsesCircuit,
  Emodel,
  MEmodel,
  Circuit,
  IonChannelModel,
} as const;

export const SimulationEntitiesTileTypes = {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
  MEModelCircuitSimulation,
  SingeNeuronCircuitSimulation,
  PairedNeuronCircuitSimulation,
  SmallMicrocircuitSimulation,
  MicrocircuitSimulation,
} as const;

export function getEntityTypeFromUrlOnEntityScope(url: string) {
  const match = url.match(/\/browse\/entity\/([^/?]+)/);
  return match ? match[1] : null;
}
