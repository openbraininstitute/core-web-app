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

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

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
    render: () => <span className="text-red-500">Entitycore Needed</span>,
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
      const { morphology } = r as IMEModel;
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
      const { emodel } = r as IMEModel;
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
    className: 'text-left',
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
    className: 'text-left',
    title: 'ME-model',
    filter: null,
    isFilterable: false,
    isDisplayable: false,
    render: (r) => 'me_model' in r && r.me_model.name,
    vocabulary: {
      plural: 'ME-models',
      singular: 'ME-model',
    },
    style: { width: 184, align: 'left' },
  },
};
