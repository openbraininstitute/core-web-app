import { renderEmptyOrValue, renderFloatNumber } from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

export const FieldsDefinition: FieldsDefinitionRegistry<EntityCoreObjectTypes> = {
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
      // TODO: use id to renderer the preview
      // return (
      //   <MorphPreviewFromId id={morphId} org={org} project={project} height={116} width={184} />
      // );
      return <span className="text-red-500">Entitycore Needed</span>;
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
      // TODO: use id to renderer the preview
      // return <EModelTracePreview images={images} height={116} width={184} />;
      return <span className="text-red-500">Entitycore Needed</span>;
    },
    vocabulary: {
      plural: 'Trace',
      singular: 'Trace',
    },
    style: { width: 184 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.SynaptomeUsedMEModelName]: {
    className: 'text-center',
    title: 'ME-model',
    filter: null,
    render: (r) => renderEmptyOrValue((r as ISingleNeuronSynaptome).me_model.name),
    vocabulary: {
      plural: 'ME-models',
      singular: 'ME-model',
    },
    style: { width: 184, align: 'left' },
  },
};
