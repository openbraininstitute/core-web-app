import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields/enums';
import { EntityCoreFields } from '@/constants/explore-section/fields-config/enums';
import { CoreFieldType } from '@/entity-configuration/definitions/types';
import { ensureArray } from '@/utils/array';

import type { CoreFieldDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IMType } from '@/api/entitycore/types/shared/global';
import type { EntityCoreTypes } from '@/api/entitycore/types';

export const FieldConfiguration: CoreFieldDefinitionRegistry<EntityCoreTypes> = {
  [EntityCoreFields.License]: {
    title: 'License',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue(r.license?.name),
    vocabulary: {
      plural: 'Licenses',
      singular: 'License',
    },
  },
  [EntityCoreFields.BrainRegion]: {
    title: 'Brain Region',
    filter: null,
    render: (r) => renderEmptyOrValue(r.brain_region.name),
    vocabulary: {
      plural: 'Brain Regions',
      singular: 'Brain Region',
    },
    constraint: 'brain_region_id',
  },
  [EntityCoreFields.Species]: {
    title: 'Species',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(renderArray(ensureArray({ input: r.species }).map((s) => s.name))),
    vocabulary: {
      plural: 'Species',
      singular: 'Species',
    },
    constraint: 'species__name__in',
    order: {
      property: 'species__order_by',
      value: 'name',
    },
    isSortable: false,
  },
  [EntityCoreFields.MType]: {
    fieldType: CoreFieldType.CellType,
    title: 'M-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(
        renderArray(
          (r as EntityCoreTypes & { mtypes: Array<IMType> | null }).mtypes?.map(
            (m) => m.pref_label
          ) || []
        )
      ),
    vocabulary: {
      plural: 'M-Types',
      singular: 'M-Type',
    },
    constraint: 'mtype__pref_label__in',
    order: {
      property: 'mtype__order_by',
      value: 'pref_label',
    },
    isSortable: false,
  },
};
