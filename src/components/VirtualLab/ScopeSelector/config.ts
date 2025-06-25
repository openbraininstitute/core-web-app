import {
  TEntityCoreConfigurationItem,
  EntityCoreConfiguration,
} from '@/entity-configuration/domain';
import { basePath } from '@/config';

export enum ModelTileType {
  IonChannel = 'ion-channel',
  SingleNeuron = 'single-neuron',
  SmallMicrocircuit = 'small-microcircuit',
  BrainRegion = 'brain-region',

  Metabolism = 'metabolism',
  Synaptome = 'synaptome',
  Microcircuit = 'microcircuit',
  BrainSystem = 'brain-system',

  NeuroGliaVasculatureUnit = 'neuron-glia-vasculature-unit',
  PairedNeuron = 'paired-neuron',
  NeuroGliaVasculatureCircuit = 'neuron-glia-vasculature-circuit',
  WholeBrain = 'whole-brain',
}

function imageUrl(img: string) {
  return `${basePath}/images/scales/` + img + '.webp';
}

export type TTileConfig = {
  id: string;
  title: string;
  type: ModelTileType;
  description: string;
  img: string;
  disabled: boolean;
  entities?: {
    build: TEntityCoreConfigurationItem;
    simulate: TEntityCoreConfigurationItem;
  };
  url: {
    build: string;
    explore: string;
  } | null;
};

function makeTile(type: ModelTileType, title: string, description = 'Coming soon.'): TTileConfig {
  return {
    id: type,
    title,
    type,
    description,
    img: imageUrl(type),
    disabled: true,
    url: null,
  };
}

export const ModelTilesConfig: Array<TTileConfig> = [
  makeTile(ModelTileType.IonChannel, 'Ion Channel'),
  {
    id: ModelTileType.SingleNeuron,
    title: 'Single Neuron',
    type: ModelTileType.SingleNeuron,
    description:
      'Load Hodgkin-Huxley single cell models, perform current clamp experiments with different levels of input current, and observe the resulting changes in membrane potential.',
    img: imageUrl('singleNeuron'),
    disabled: false,
    url: {
      build: 'build/me-model/new',
      explore: 'explore/interactive/model/me-model',
    },
    entities: {
      build: EntityCoreConfiguration.MEmodel,
      simulate: EntityCoreConfiguration.SingleNeuronSimulation,
    },
  },
  makeTile(ModelTileType.SmallMicrocircuit, 'Small microcircuit'),
  makeTile(ModelTileType.BrainRegion, 'Brain Region'),
  makeTile(ModelTileType.Metabolism, 'Metabolism'),
  makeTile(
    ModelTileType.Synaptome,
    'Synaptome',
    'Introduce spikes into the synapses of Hodgkin-Huxley cell models and carry out a virtual experiment by setting up a stimulation and reporting protocol.'
  ),
  makeTile(ModelTileType.Microcircuit, 'Microcircuit'),
  makeTile(ModelTileType.BrainSystem, 'Brain system'),
  makeTile(ModelTileType.NeuroGliaVasculatureUnit, 'NGV unit'),
  makeTile(
    ModelTileType.PairedNeuron,
    'Retrieve interconnected Hodgkin-Huxley cell models from a circuit and conduct a simulated experiment by establishing a stimulation and reporting protocol.'
  ),
  makeTile(ModelTileType.NeuroGliaVasculatureCircuit, 'NGV circuit'),
  makeTile(ModelTileType.WholeBrain, 'Whole brain'),
];
