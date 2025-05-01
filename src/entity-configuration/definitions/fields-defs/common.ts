import {
  EmptyPreview,
  EmptyValue,
  renderDate,
  renderEmptyOrValue,
  renderPreview,
  renderTimestamp,
} from '@/entity-configuration/definitions/renderer';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { transformAgentToNames } from '@/api/entitycore/transformers';
import { hasAssets } from '@/api/entitycore/guards';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IContributor } from '@/api/entitycore/types/shared/global';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

export const FieldsDefinition: FieldsDefinitionRegistry<EntityCoreObjectTypes> = {
  [EntityCoreFields.Preview]: {
    className: 'text-center',
    title: 'Preview',
    filter: null,
    render: (r) => {
      if (hasAssets(r)) return renderPreview(r, { width: 184, height: 116 });
      return EmptyPreview;
    },
    vocabulary: {
      plural: 'previews',
      singular: 'preview',
    },
    style: { width: 184 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.Name]: {
    title: 'Name',
    filter: CoreFieldFilterTypeEnum.Text,
    render: (r) => renderEmptyOrValue(r.name),
    vocabulary: {
      plural: 'Names',
      singular: 'Name',
    },
    constraint: 'name__ilike',
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'name',
    },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.CreationDate]: {
    title: 'Creation date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderDate(r.creation_date),
    vocabulary: {
      plural: 'Dates',
      singular: 'Date',
    },
    constraint: {
      gte: 'creation_date__gte',
      lte: 'creation_date__lte',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'creation_date',
    },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.RegistrationDate]: {
    title: 'Registration date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderDate(r.creation_date),
    vocabulary: {
      plural: 'Dates',
      singular: 'Date',
    },
    constraint: {
      gte: 'creation_date__gte',
      lte: 'creation_date__lte',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'creation_date',
    },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.UpdateDate]: {
    title: 'Update date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderTimestamp(r.update_date),
    vocabulary: {
      plural: 'Dates',
      singular: 'Date',
    },
    constraint: {
      gte: 'update_date__gte',
      lte: 'update_date__lte',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'updated_at',
    },
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.Description]: {
    title: 'Description',
    filter: CoreFieldFilterTypeEnum.Text,
    render: (r) => renderEmptyOrValue(r.description),
    vocabulary: {
      plural: 'Descriptions',
      singular: 'Description',
    },
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.Contributions]: {
    title: 'Contributors',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(
        transformAgentToNames(
          (r as EntityCoreObjectTypes & { contributions?: Array<IContributor> | null })
            .contributions
        )
      ),
    vocabulary: {
      plural: 'Contributors',
      singular: 'Contributor',
    },
    constraint: 'contribution__pref_label__in',
    order: {
      property: 'contribution__order_by',
      value: 'pref_label',
    },
    isSortable: false,
    isFilterable: true,
    isDisplayable: true,
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
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.CreatedBy]: {
    title: 'Created by',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('createdBy' in r) renderEmptyOrValue(r.createdBy);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Users',
      singular: 'User',
    },
  },
  [EntityCoreFields.UpdatedBy]: {
    title: 'Updated by',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('updatedBy' in r) renderEmptyOrValue(r.updatedBy);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Users',
      singular: 'User',
    },
  },
};
