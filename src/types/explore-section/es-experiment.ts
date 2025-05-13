import {
  BrainRegion,
  Contributor,
  CoordinatesInBrainAtlas,
  DerivationResource,
  EType,
  FileDistribution,
  Generation,
  Layer,
  LayerThickness,
  License,
  MType,
  Statistic,
  StimulusImage,
  SubjectAge,
  SubjectSpecies,
  SubjectWeight,
} from './es-properties';
import { ESHitSource } from './es-common';
import { IdWithName } from './common';
import { SynapticPathway } from '@/types/explore-section/misc';

type ExperimentProps = ESHitSource & {
  brainRegion: BrainRegion;
  contributors: Contributor[];
  subjectSpecies: SubjectSpecies;
};

type ExperimentalBoutonDensity = ExperimentProps & {
  mType: MType;
  series: Statistic[]; // Not on ExperimentalTrace
  subjectWeight: SubjectWeight;
};

export type ExperimentalLayerThickness = ExperimentProps & {
  derivation: DerivationResource;
  description: string;
  layer: Layer[];
  layerThickness: LayerThickness;
  series: Statistic[];
};

type ExperimentalNeuronDensity = ExperimentProps & {
  mType: MType;
  series: Statistic[];
};

export type ExperimentalSynapsesPerConnection = ExperimentProps & {
  description: string;
  series: Statistic[];
  subjectWeight: SubjectWeight;
  preSynapticPathway: SynapticPathway[];
  postSynapticPathway: SynapticPathway[];
};

export type ExperimentalTrace = ExperimentProps & {
  description: string;
  distribution: FileDistribution[];
  eType: EType;
  image: StimulusImage[];
  license: License;
  subjectAge: SubjectAge;
  subjectWeight: SubjectWeight;
};

export type ReconstructedNeuronMorphology = ExperimentProps & {
  coordinatesInBrainAtlas: CoordinatesInBrainAtlas;
  derivation: DerivationResource;
  description: string;
  distribution: FileDistribution[];
  generation: Generation;
  license: License;
  featureSeries: MorphologyFeature[];
  mType?: MType;
};

// TODO: this doesn't belong to ES types anymore, move it to a new file
export enum MorphoMetricCompartment {
  Axon = 'axon',
  Soma = 'soma',
  ApicalDendrite = 'apical_dendrite',
  BasalDendrite = 'basal_dendrite',
  NeuronMorphology = 'neuron_morphology',
}

type MorphologyFeature = {
  compartment: MorphoMetricCompartment;
  label: string;
  statistic: string;
  unit: string;
  value: number;
};

export type NeuronMorphologyFeatureAnnotation = ExperimentProps & {
  neuronMorphology: IdWithName;
  compartment: MorphoMetricCompartment;
};

export type Experiment =
  | ExperimentalBoutonDensity
  | ExperimentalLayerThickness
  | ExperimentalNeuronDensity
  | ExperimentalSynapsesPerConnection
  | ExperimentalTrace
  | NeuronMorphologyFeatureAnnotation // TODO: I don't think that this belongs here (it's not an "experiment")
  | ReconstructedNeuronMorphology;
