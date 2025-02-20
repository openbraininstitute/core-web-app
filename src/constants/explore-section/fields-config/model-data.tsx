import { ExploreFieldsConfigProps } from './types';
import { Field } from './enums';
import { DisplayMessages } from '@/constants/display-messages';
import { FilterTypeEnum } from '@/types/explore-section/filters';
import { EModelResource, Model, SynaptomeModelResource } from '@/types/explore-section/delta-model';
import { formatNumber } from '@/util/common';
import { ESeModel, ESmeModel } from '@/types/explore-section/es';
import { selectorFnBasic } from '@/util/explore-section/listing-selectors';
import { getEtype, getMtype } from '@/util/modelMEtypes';
import { MEModel } from '@/types/me-model';

import EModelTracePreview from '@/components/explore-section/ExploreSectionListingView/EModelTracePreview';
import MorphPreviewFromId from '@/components/build-section/virtual-lab/me-model/MorphPreviewFromId';

export const MODEL_DATA_FIELDS_CONFIG: ExploreFieldsConfigProps<Model> = {
  [Field.EModelMorphology]: {
    title: 'Morphology',
    filter: FilterTypeEnum.CheckList,
    esTerms: {
      flat: {
        filter: 'emodel.neuronMorphology.name.keyword',
        aggregation: 'emodel.neuronMorphology.name.keyword',
        sort: 'emodel.neuronMorphology.name.keyword',
      },
    },
    render: {
      esResourceViewFn: (_t, r) =>
        r._source.emodel?.neuronMorphology?.name || DisplayMessages.NO_DATA_STRING,
    },
    vocabulary: {
      plural: 'Morphology',
      singular: 'Morphologies',
    },
  },
  [Field.EModelScore]: {
    title: 'Model cumulated score',
    filter: FilterTypeEnum.ValueRange,
    esTerms: {
      flat: {
        filter: 'emodel.score',
        aggregation: 'emodel.score',
        sort: 'emodel.score',
      },
    },
    render: {
      esResourceViewFn: (_t, r) =>
        r._source.emodel?.score
          ? formatNumber(r._source.emodel?.score)
          : DisplayMessages.NO_DATA_STRING,
      deltaResourceViewFn: (resource) =>
        (resource as EModelResource).score
          ? formatNumber((resource as EModelResource).score!)
          : DisplayMessages.NO_DATA_STRING,
    },
    vocabulary: {
      plural: 'Model cumulated score',
      singular: 'Model cumulated scores',
    },
  },
  [Field.EModelResponse]: {
    className: 'text-center',
    title: 'Response',
    filter: null,
    render: {
      esResourceViewFn: (_value, record) => {
        const { _source: source } = record;

        const images = (source as ESeModel)?.image;
        return <EModelTracePreview images={images} height={116} width={184} />;
      },
    },
    vocabulary: {
      plural: 'responses',
      singular: 'response',
    },
    style: { width: 184 },
  },
  [Field.MEModelMorphologyPreview]: {
    className: 'text-center',
    title: 'Morphology',
    filter: null,
    render: {
      esResourceViewFn: (_value, record) => {
        const { _source: source } = record;

        const morphId = (source as ESmeModel)?.memodel?.neuronMorphology?.['@id'] || '';
        const org = (source as ESmeModel)?.project.label.split('/')[0] || '';
        const project = (source as ESmeModel)?.project.label.split('/')[1] || '';
        return (
          <MorphPreviewFromId id={morphId} org={org} project={project} height={116} width={184} />
        );
      },
    },
    vocabulary: {
      plural: 'responses',
      singular: 'response',
    },
    style: { width: 184 },
  },
  [Field.MEModelResponse]: {
    className: 'text-center',
    title: 'Trace',
    filter: null,
    render: {
      esResourceViewFn: (_value, record) => {
        const { _source: source } = record;

        const images = (source as ESmeModel)?.image;
        return <EModelTracePreview images={images} height={116} width={184} />;
      },
    },
    vocabulary: {
      plural: 'responses',
      singular: 'response',
    },
    style: { width: 184 },
  },
  [Field.MEModelValidated]: {
    className: 'text-center',
    title: 'Validated',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        return selectorFnBasic((resource as unknown as MEModel).validated ? 'True' : 'False');
      },
      esResourceViewFn: (_value, record) => {
        const { _source: source } = record;

        const isValidated = (source as ESmeModel)?.memodel?.validated;
        return selectorFnBasic(isValidated ? 'True' : 'False');
      },
    },
    vocabulary: {
      plural: 'Validated',
      singular: 'Validated',
    },
    style: { align: 'left' },
  },
  [Field.SynatomeUsedMEModelName]: {
    className: 'text-center',
    title: 'ME-model',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        const { linkedMeModel } = resource as SynaptomeModelResource;
        return selectorFnBasic(linkedMeModel?.name);
      },
      esResourceViewFn: (_t, r) => {
        const { linkedMeModel } = r._source as SynaptomeModelResource;
        return selectorFnBasic(linkedMeModel?.name);
      },
    },
    vocabulary: {
      plural: 'ME-models',
      singular: 'ME-model',
    },
    style: { width: 184, align: 'left' },
  },
  [Field.SynatomeUsedEModelName]: {
    className: 'text-center',
    title: 'e-model',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        const { linkedEModel } = resource as SynaptomeModelResource;
        return selectorFnBasic(linkedEModel?.name);
      },
    },
    vocabulary: {
      plural: 'E-models',
      singular: 'E-model',
    },
    style: { width: 184 },
  },
  [Field.SynatomeUsedMModelName]: {
    className: 'text-center',
    title: 'm-model',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        const { linkedMModel } = resource as SynaptomeModelResource;
        return selectorFnBasic(linkedMModel?.name);
      },
    },
    vocabulary: {
      plural: 'M-models',
      singular: 'M-model',
    },
    style: { width: 184 },
  },
  [Field.SynatomeUsedSpecies]: {
    className: 'text-center',
    title: 'Species',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        const { linkedMeModel } = resource as SynaptomeModelResource;
        return selectorFnBasic(linkedMeModel?.subject?.species.label);
      },
    },
    vocabulary: {
      plural: 'species',
      singular: 'Species',
    },
    style: { width: 184 },
  },
  [Field.SynaptomeUsedEType]: {
    className: 'text-center',
    title: 'E-type',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        const { linkedEModel, linkedMeModel } = resource as SynaptomeModelResource;
        const eType = getEtype(linkedMeModel, linkedEModel);

        return selectorFnBasic(eType);
      },
      esResourceViewFn: (_t, r) => {
        const { linkedMeModel, linkedEModel } = r._source as SynaptomeModelResource;
        const eType = getEtype(linkedMeModel, linkedEModel);

        return selectorFnBasic(eType);
      },
    },
    vocabulary: {
      plural: 'E-type',
      singular: 'E-type',
    },
    style: { align: 'left' },
  },
  [Field.SynaptomeUsedMType]: {
    className: 'text-center',
    title: 'M-type',
    filter: null,
    render: {
      deltaResourceViewFn: (resource) => {
        const { linkedMeModel, linkedMModel } = resource as SynaptomeModelResource;
        const mType = getMtype(linkedMeModel, linkedMModel);

        return selectorFnBasic(mType);
      },
      esResourceViewFn: (_t, r) => {
        const { linkedMeModel, linkedMModel } = r._source as SynaptomeModelResource;
        const mType = getMtype(linkedMeModel, linkedMModel);

        return selectorFnBasic(mType);
      },
    },
    vocabulary: {
      plural: 'M-type',
      singular: 'M-type',
    },
    style: { align: 'left' },
  },
};
