import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { SynapsePerConnection } from '@/entity-configuration/domain/experimental/synapse-per-connection';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { tempIsCircuitInDev } from '@/temp-circuit-check';

export const ExperimentalEntitiesTileTypes = {
  ReconstructionMorphology: CellMorphology,
  ElectricalCellRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsePerConnection,
} as const;

export const ModelEntitiesTileTypes = {
  Emodel,
  MEmodel,
  SingleNeuronSynaptome,
  ...(tempIsCircuitInDev() ? { Circuit } : {}),
} as const;
