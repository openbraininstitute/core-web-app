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

function makeTile(
  type: ModelTileType,
  title: string,
  description = 'Coming soon.',
  more: Partial<TTileConfig> = {}
): TTileConfig {
  return {
    id: type,
    title,
    type,
    description,
    img: imageUrl(type),
    disabled: true,
    url: null,
    ...more,
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
    img: imageUrl('single-neuron'),
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
  makeTile(
    ModelTileType.SmallMicrocircuit,
    'Small microcircuit',
    'Circuit with 3-20 neurons together with synapses coming from inside and outside its volume (usually called intrinsic and extrinsic synapses respectively).',
    {
      disabled: false,
      url: null,
      // entities: {
      //   build: EntityCoreConfiguration.Circuit,
      //   simulate: EntityCoreConfiguration.Circuit,
      // },
    }
  ),
  makeTile(ModelTileType.BrainRegion, 'Brain Region'),
  makeTile(ModelTileType.Metabolism, 'Metabolism'),
  makeTile(
    ModelTileType.Synaptome,
    'Synaptome',
    'Introduce spikes into the synapses of Hodgkin-Huxley cell models and carry out a virtual experiment by setting up a stimulation and reporting protocol.',
    {
      disabled: false,
      url: {
        build: 'build/synaptome/new',
        explore: 'explore/interactive/model/synaptome',
      },
      entities: {
        build: EntityCoreConfiguration.SingleNeuronSynaptome,
        simulate: EntityCoreConfiguration.SingleNeuronSynaptomeSimulation,
      },
    }
  ),
  makeTile(ModelTileType.Microcircuit, 'Microcircuit'),
  makeTile(ModelTileType.BrainSystem, 'Brain system'),
  makeTile(ModelTileType.NeuroGliaVasculatureUnit, 'NGV unit'),
  makeTile(ModelTileType.PairedNeuron, 'Paired neurons'),
  makeTile(ModelTileType.NeuroGliaVasculatureCircuit, 'NGV circuit'),
  makeTile(ModelTileType.WholeBrain, 'Whole brain'),
];
