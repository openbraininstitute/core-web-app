import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import {
  EmptyPreview,
  renderEmptyOrValue,
  renderFloatNumber,
  renderImage,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { hasAssets } from '@/api/entitycore/guards';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import {
  EntityTypeEnum,
  type EntityCoreObjectTypes,
  type ISingleNeuronSimulation,
} from '@/api/entitycore/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.EModelExemplarMorphology]: {
    title: 'Morphology',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue((r as IEModel).exemplar_morphology.name),
    vocabulary: {
      plural: 'Morphologies',
      singular: 'Morphology',
    },
    constraint: 'exemplar_morphology__label__in',
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.EModelScore]: {
    title: 'Model cumulated score',
    filter: null,
    render: (r) => renderEmptyOrValue(String(renderFloatNumber((r as IEModel).score))),
    vocabulary: {
      plural: 'Model cumulated score',
      singular: 'Model cumulated scores',
    },
    isFilterable: false,
    isDisplayable: true,
    // constraint: 'brain_region_id',
  },
  [EntityCoreFields.EModelResponse]: {
    title: 'Response',
    filter: null,
    // use image field in nexus
    render: (r) => <span className="text-red-500">Entitycore Needed</span>,
    vocabulary: {
      plural: 'responses',
      singular: 'response',
    },
    // constraint: 'species__name__in',
    // order: {
    //   property: 'species__order_by',
    //   value: 'name',
    // },
    isSortable: false,
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.MEModelMorphologyPreview]: {
    className: 'text-center',
    title: 'Morphology',
    filter: null,
    render: (r) => {
      const morphology = (r as IMEModel).morphology;
      if (hasAssets(morphology)) return renderPreview(morphology, { width: 184, height: 116 });
      return EmptyPreview;
    },
    vocabulary: {
      plural: 'Morphology',
      singular: 'Morphology',
    },
    style: { width: 184 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.MEModelTracePreview]: {
    className: 'text-center',
    title: 'Trace',
    filter: null,
    render: (r) => {
      const emodel = (r as IMEModel).emodel;
      if (hasAssets(emodel)) return renderImage(emodel, { width: 184, height: 116 });
      return EmptyPreview;
    },
    vocabulary: {
      plural: 'Trace',
      singular: 'Trace',
    },
    style: { width: 184 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.MEModelValidationStatus]: {
    className: 'text-center',
    title: 'Validated',
    filter: null,
    render: (r) => {
      return renderEmptyOrValue(
        (r as IMEModel).validation_status === ValidationStatus.Done ? 'True' : 'False'
      );
    },
    vocabulary: {
      plural: 'Validated',
      singular: 'Validated',
    },
    style: { width: 90, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.SynaptomeUsedMEModelName]: {
    className: 'text-center',
    title: 'ME-model',
    filter: nil 
    isFilterable: false
    isDisplayable: false,
    render: (r) => 'me_model' in r && r.me_model.name,
    vocabulary: {
      plural: 'ME-models',
      singular: 'ME-model',
    },
    style: { width: 184, align: 'left' },
    isFilterable: true,
    isDisplayable: true,
  },

  [EntityCoreFields.SimulationSeed]: {
    className: 'text-center',
    title: 'Seed',
    filter: null,
    render: (r) => ('seed' in r ? r.seed : undefined),
    vocabulary: {
      plural: 'Seeds',
      singular: 'Seed',
    },
    style: { width: 184, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.InjectionLocation]: {
    className: 'text-center',
    title: 'Injection location',
    filter: null,
    render: (r) => ('injectionLocation' in r ? r.injectionLocation.join(', ') : undefined),
    vocabulary: {
      plural: 'Injection locations',
      singular: 'Injection location',
    },
    style: { width: 184, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.RecordingLocation]: {
    className: 'text-center',
    title: 'Recording location',
    filter: null,
    render: (r) => ('recordingLocation' in r ? r.recordingLocation.join(', ') : undefined),
    vocabulary: {
      plural: 'Recording locations',
      singular: 'Recording location',
    },
    style: { width: 184, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.SimulationStatus]: {
    className: 'text-center',
    title: 'Status',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => ('status' in r ? r.status : undefined),
    vocabulary: {
      plural: 'Statuses',
      singular: 'Status',
    },
    style: { width: 184, align: 'left' },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.SimulationStimulus]: {
    className: 'text-center',
    title: 'Stimulus',
    filter: null,
    render: (r) => <span className="text-error">Thumbnail generation needed</span>,
    vocabulary: {
      plural: 'Stimuli',
      singular: 'Stimulus',
    },
    style: { width: 184, align: 'left' },
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.SimulationResponse]: {
    className: 'text-center',
    title: 'Response',
    filter: null,
    render: (r) => <span className="text-error">Thumbnail generation needed</span>,
    vocabulary: {
      plural: 'Responses',
      singular: 'Response',
    },
    style: { width: 184, align: 'left' },
    isDisplayable: true,
    isFilterable: false,
  },
};
