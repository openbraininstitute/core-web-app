import { renderEmptyOrValue, renderFloatNumber } from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

export const FieldsDefinition: FieldsDefinitionRegistry<EntityCoreObjectTypes> = {
  [EntityCoreFields.EModelMorphology]: {
    title: 'Morphology',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => <span className="text-red-500">Entitycore Needed</span>,
    vocabulary: {
      plural: 'Morphologies',
      singular: 'Morphology',
    },
  },
  [EntityCoreFields.EModelScore]: {
    title: 'Model cumulated score',
    filter: null,
    render: (r) => renderEmptyOrValue(String(renderFloatNumber((r as IEModel).score))),
    vocabulary: {
      plural: 'Model cumulated score',
      singular: 'Model cumulated scores',
    },
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
  },
};
