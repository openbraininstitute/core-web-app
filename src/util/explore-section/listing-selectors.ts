import { format, parseISO, isValid } from 'date-fns';
import map from 'lodash/map';
import isMatch from 'lodash/isMatch';
import isNumber from 'lodash/isNumber';
import { Unionize } from '../typing';
import { normalizeContributors } from './sort-contributors';
import { SynapticPosition, SynapticType } from '@/types/explore-section/misc';
import { IdWithLabel } from '@/types/explore-section/common';
import { ensureArray } from '@/util/nexus';
import { formatNumber } from '@/util/common';
import {
  Experiment,
  ExperimentalLayerThickness,
  ExperimentalSynapsesPerConnection,
  ExperimentalTrace,
  NeuronMorphologyFeatureAnnotation,
  ReconstructedNeuronMorphology,
} from '@/types/explore-section/es-experiment';
import { DisplayMessages } from '@/constants/display-messages';
import { formatEsContributors } from '@/components/explore-section/Contributors';
import { Contributor } from '@/types/explore-section/es-properties';
import {
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
  ReconstructionMorphologyExpand,
} from '@/api/entitycore/types/entities/reconstruction-morphology';
import { ReactNode } from 'react';

type Record = { _source: Experiment };
type ContributorEsProperty = Unionize<Contributor>;

/**
 * Selects and formats a brain region based on its format
 * @param {string} _text - The text parameter.
 * @param {Record} record - The record.
 * @returns {string|undefined} - The selected and formatted value for brain region.
 */
export const selectorFnBrainRegion = (_text: string, record: Record): string | undefined => {
  if (!record._source.brainRegion) return undefined;

  if (Array.isArray(record._source.brainRegion?.label))
    return record._source.brainRegion?.label.join(', ');

  return record._source.brainRegion.label;
};

/**
 * Selects and formats contributors based on their format
 * @param {string} _text
 * @param {Record} record
 * @returns {string|undefined} - The selected and formatted value for contributors.
 */
export const selectorFnContributors = (_text: string, record: Record): string | undefined => {
  const { contributors } = record._source;

  if (!contributors || contributors.length < 1) {
    return undefined;
  }

  // Filter out contributors where label is an array.
  // This is a workaround for the indexing issue in Nexus.
  // TODO: Remove this after the migration to Entitycore.
  const filteredContributors = contributors.filter((c) => !Array.isArray(c.label));

  return map(
    normalizeContributors<ContributorEsProperty>(filteredContributors, formatEsContributors),
    'label'
  ).join(', ');
};

/**
 * Selects and formats a statistic from the series array
 * @param {Exclude<Experiment, ExperimentalTrace | ReconstructedNeuronMorphology>} source - The Source object.
 * @param {string} statistic - The statistic to serialize.
 */
export const selectorFnStatistic = (
  source: Exclude<
    Experiment,
    ExperimentalTrace | ReconstructedNeuronMorphology | NeuronMorphologyFeatureAnnotation
  >,
  statistic: string
) => {
  if (!source) return '';
  const statValue = source.series?.find((s: any) => s.statistic === statistic)?.value;
  return statValue ? formatNumber(statValue) : '';
};

/**
 * Selects and formats a MeanStd
 * @param {string} _text
 * @param {{ _source: Exclude<Experiment, ExperimentalTrace | ReconstructedNeuronMorphology> }} record - The statistic to serialize.
 */
export const selectorFnMeanStd = (
  _text: string,
  record: {
    _source: Exclude<
      Experiment,
      ExperimentalTrace | ReconstructedNeuronMorphology | NeuronMorphologyFeatureAnnotation
    >;
  }
) => {
  const mean = selectorFnStatistic(record._source, 'mean');
  const std = selectorFnStatistic(record._source, 'standard deviation');
  if (mean && std) {
    return `${mean} ± ${std}`;
  }
  if (mean) {
    return mean;
  }
  return '';
};

/**
 * Selects and formats a LayerThickness
 * @param {string} _text
 * @param {{ _source: ExperimentalLayerThickness }} record
 */
export const selectorFnLayerThickness = (
  _text: string,
  record: { _source: ExperimentalLayerThickness }
) => {
  const layerThickness = record._source?.layerThickness;

  if (!layerThickness || !Number(layerThickness?.value)) return '';
  return formatNumber(Number(layerThickness?.value));
};

/**
 * Selects and formats a Layer
 * @param {string} _text
 * @param {{ _source: ExperimentalLayerThickness }} record
 */
export const selectorFnLayer = (_text: string, record: { _source: ExperimentalLayerThickness }) => {
  if (!record._source.layer) return '';
  return ensureArray(record._source.layer)
    .map((l) => l.label)
    .join(', ');
};

/**
 * Formats and selects a date
 * @param {string} date - The date to format.
 * @returns {string} - The formatted date.
 */
export const selectorFnDate = (date: string): string =>
  date && isValid(parseISO(date)) ? format(parseISO(date), 'dd.MM.yyyy') : '';

/**
 * Renders the text value
 * @param {string} text - The text value to render.
 * @returns {string} - The rendered text value.
 */
export const selectorFnBasic = (text?: string): string => text || DisplayMessages.NO_DATA_STRING;

export const selectorFnSpecies = (species?: IdWithLabel | IdWithLabel[]) => {
  if (species) {
    return ensureArray(species)
      .map((s) => s.label)
      .join(', ');
  }
  return undefined;
};

export const selectorFnSynaptic = (
  source: ExperimentalSynapsesPerConnection,
  preOrPost: SynapticPosition,
  type: SynapticType
) => {
  const synapticList =
    preOrPost === SynapticPosition.Pre ? source.preSynapticPathway : source.postSynapticPathway;
  const preSynaptic = synapticList.find((synaptic) => synaptic.about === type);
  return preSynaptic?.label ?? DisplayMessages.NO_DATA_STRING;
};

/**
 * Renders a specific morphology measurement
 *
 * @param {IReconstructionMorphologyExpanded} morphology
 * @param {string} structuralDomain - The compartment to serialize.
 * @param {string} label - The label to serialize.
 * @param {string} measurementType - The statistic to serialize.
 * @param {boolean} showUnits - Whether to show the units.
 *
 * @returns {string} - The rendered text value.
 */
export const renderMorphologyMeasurement = (
  morphology: IReconstructionMorphologyExpanded | IReconstructionMorphology,
  structuralDomain: string,
  label: string,
  measurementType: string,
  showUnits?: boolean
): ReactNode => {
  if (!morphology || !('measurement_annotation' in morphology))
    return DisplayMessages.NO_DATA_STRING;

  const measurementKinds = morphology.measurement_annotation.measurement_kinds;

  const measurementKind = measurementKinds?.find(
    (mk) =>
      // mk.structural_domain === structuralDomain &&
      mk.pref_label === label
  );

  const measurement = measurementKind?.measurement_items.find((mi) => mi.name === measurementType);

  if (!measurement) return DisplayMessages.NO_DATA_STRING;

  const { unit, value } = measurement;
  const unitSuffix = showUnits ? `${unit}` : '';

  // TODO: Correct the data if this is still needed.
  // if (label === 'soma_radius') value = 2 * measurement.value;

  return `${formatNumber(value)}${unitSuffix}`;
};
