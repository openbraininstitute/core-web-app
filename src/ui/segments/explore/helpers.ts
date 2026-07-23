import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { EmCellMesh } from '@/entity-configuration/domain/experimental/em-cell-mesh';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { SynapsesPerConnection } from '@/entity-configuration/domain/experimental/synapses-per-connection';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { ExtracellularRecordingArray } from '@/entity-configuration/domain/model/extracellular-recording-array';
import { IonChannelModel } from '@/entity-configuration/domain/model/ion-channel-model';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { SingleNeuronCircuit } from '@/entity-configuration/domain/model/single-neuron-circuit';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { SynthesizedCellMorphology } from '@/entity-configuration/domain/model/synthesized-morphology';
import { IonChannelModelSimulation } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { MEModelCircuitSimulation } from '@/entity-configuration/domain/simulation/memodel-circuit-simulation';
import { MicrocircuitSimulation } from '@/entity-configuration/domain/simulation/microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { RegionCircuitSimulation } from '@/entity-configuration/domain/simulation/region-circuit-simulation';
import { SingeNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/single-neuron-circuit-simulation';
import { SingleNeuronSimulation } from '@/entity-configuration/domain/simulation/single-neuron-simulation';
import { SingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { WholeBrainCircuitSimulation } from '@/entity-configuration/domain/simulation/whole-brain-circuit-simulation';

export const ExploreDataTypeTabs = {
  Experimental: 'experimental',
  Models: 'models',
  Simulations: 'simulations',
} as const;

export type TExploreDataTypeTabs = (typeof ExploreDataTypeTabs)[keyof typeof ExploreDataTypeTabs];

export const DataSectionDataTypeTabsConfig: Array<{
  key: TExploreDataTypeTabs;
  title: string;
}> = [
  {
    key: ExploreDataTypeTabs.Experimental,
    title: 'Experimental',
  },
  {
    key: ExploreDataTypeTabs.Models,
    title: 'Model',
  },
  {
    key: ExploreDataTypeTabs.Simulations,
    title: 'Simulations',
  },
];

export const BrowseExperimentalDataExtendedTypes = {
  CellMorphology,
  ElectricalCellRecording,
  IonChannelRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsesPerConnection,
  EmCellMesh,
} as const;

/**
 * Key order is the render order of the Data nav — there is no sort in the render path.
 * The superseded single-neuron/synaptome entries ("(legacy)") are listed last.
 */
export const ModelDataExtendedTypes = {
  IonChannelModel,
  SynthesizedCellMorphology,
  Emodel,
  MEmodel,
  SingleNeuronCircuit,
  Circuit,
  ExtracellularRecordingArray,
  SingleNeuronSynaptome,
} as const;

export const SimulationDataExtendedTypes = {
  IonChannelModelSimulation,
  MEModelCircuitSimulation,
  SingeNeuronCircuitSimulation,
  PairedNeuronCircuitSimulation,
  SmallMicrocircuitSimulation,
  MicrocircuitSimulation,
  RegionCircuitSimulation,
  WholeBrainCircuitSimulation,
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} as const;

export function getEntityTypeFromUrlOnEntityScope(url: string) {
  const match = url.match(/\/browse\/entity\/([^/?]+)/);
  return match ? match[1] : null;
}
