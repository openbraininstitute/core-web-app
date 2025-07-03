import {
  EntityCoreConfiguration,
  TEntityCoreConfigurationItem,
} from '@/entity-configuration/domain';

export enum ModelTileType {
  IonChannel = 'ion-channel',
  SingleNeuron = 'single-neuron',
  TinyCircuit = 'small-microcircuit',
  BrainRegions = 'brain-regions',

  Metabolism = 'metabolism',
  Synaptome = 'synaptome',
  Microcircuit = 'microcircuit',
  BrainSystems = 'brain-systems',

  NeuroGliaVasculature = 'neuro-glia-vasculature',
  PairedNeurons = 'paired-neurons',
  NeuroGliaVasculatureCircuit = 'neuro-glia-vasculature-circuit',
  WholeBrain = 'whole-brain',
}

export type SectionTypeValue = `${ModelTileType}`;

export type TTileConfig = {
  id: string;
  title: string;
  type: ModelTileType;
  description: string;
  img: string;
  disabled: boolean;
  entities?: {
    build?: TEntityCoreConfigurationItem;
    simulate?: TEntityCoreConfigurationItem;
  };
  url: {
    build?: string;
    explore?: string;
  } | null;
};

export const ModelTilesConfig: Array<TTileConfig> = [
  {
    id: 'ion-channel',
    title: 'Ion Channel',
    type: ModelTileType.IonChannel,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/b4af08439a294a672ca4fd317c570adee936fba9-456x456.jpg',
    disabled: true,
    url: null,
  },
  {
    id: 'single-neuron',
    title: 'Single Neuron',
    type: ModelTileType.SingleNeuron,
    description:
      'Load Hodgkin-Huxley single cell models, perform current clamp experiments with different levels of input current, and observe the resulting changes in membrane potential.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/54abb0e7df8f3c96d37672f9ca6a7e65501cb19e-456x456.jpg',
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
  {
    id: 'small-microcircuit',
    title: 'Small Microcircuit',
    type: ModelTileType.TinyCircuit,
    description:
      'Design and run virtual experiments using circuits with 3-20 Hodgkin-Huxley cell models. These small microcircuits are often extracted from larger circuit models.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/9b98c13a388644f3b65c08b95b9471f6a5818f5b-456x456.jpg',
    disabled: false,
    url: null,
    entities: {
      build: EntityCoreConfiguration.Circuit,
      simulate: EntityCoreConfiguration.SimulationCampaign,
    },
  },
  {
    id: 'brain-regions',
    title: 'Brain Regions',
    type: ModelTileType.BrainRegions,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/5fa1aed3d9c655e9de6a58c6f02d879c28bb8ebd-456x456.jpg',
    disabled: true,
    url: null,
  },
  // ===================================================================
  {
    id: 'metabolism',
    title: 'Metabolism',
    type: ModelTileType.Metabolism,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/de70c98814615a5759eefa701d750f95723f750b-456x456.jpg',
    disabled: true,
    url: null,
  },
  {
    id: 'synaptome',
    title: 'Synaptome',
    type: ModelTileType.Synaptome,
    description:
      'Introduce spikes into the synapses of Hodgkin-Huxley cell models and carry out a virtual experiment by setting up a stimulation and reporting protocol.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/64aabdf189cc9f2cb985eb6c40234d044713d94f-456x456.jpg',
    disabled: false,
    url: {
      build: 'build/synaptome/new',
      explore: 'explore/interactive/model/synaptome',
    },
    entities: {
      build: EntityCoreConfiguration.SingleNeuronSynaptome,
      simulate: EntityCoreConfiguration.SingleNeuronSynaptomeSimulation,
    },
  },
  {
    id: 'microcircuit',
    title: 'Microcircuit',
    type: ModelTileType.Microcircuit,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/40863da26299ee004917beb3a09f99d7cd263e5c-456x456.jpg',
    disabled: true,
    url: null,
  },
  {
    id: 'brain-systems',
    title: 'Brain Systems',
    type: ModelTileType.BrainSystems,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/bbfeb983acfa78e8be3c7b75efcaaaefb9e04e2f-456x456.jpg',
    disabled: true,
    url: null,
  },
  // ===================================================================
  {
    id: 'neuro-glia-vasculature',
    title: 'NGV unit',
    type: ModelTileType.NeuroGliaVasculature,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/cb6e6393e5b906e8a8c0ea6a9dd2fa87f61cf80b-456x456.jpg',
    disabled: true,
    url: null,
  },
  {
    id: 'paired-neurons',
    title: 'Paired Neurons',
    type: ModelTileType.PairedNeurons,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/70d553646239f9a4bd866fb4fb178e4b3467b1b9-456x456.jpg',
    disabled: true,
    url: null,
  },
  {
    id: 'neuro-glia-vasculature-circuit',
    title: 'NGV circuit',
    type: ModelTileType.NeuroGliaVasculatureCircuit,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/24c698c5d68e0d5182c1285c7bf963c756c759d4-456x456.jpg',
    disabled: true,
    url: null,
  },
  {
    id: 'whole-brain',
    title: 'Whole Brain',
    type: ModelTileType.WholeBrain,
    description: 'Coming soon.',
    img: 'https://cdn.sanity.io/images/fgi7eh1v/staging/da93d6956c131a0dfd4b9d031bb9f614da82a58a-456x456.jpg',
    disabled: true,
    url: null,
  },
];
