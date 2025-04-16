import {
  renderDate,
  renderEmptyOrValue,
  renderPreview,
  renderTimestamp,
} from '@/entity-configuration/definitions/renderer';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields/enums';
import { EntityCoreFields } from '@/constants/explore-section/fields-config/enums';
import { transformAgentToNames } from '@/api/entitycore/transformers';

import type { CoreFieldDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IAsset, IContributor } from '@/api/entitycore/types/shared/global';
import type { EntityCoreTypes } from '@/api/entitycore/types';

export const FieldConfiguration: CoreFieldDefinitionRegistry<EntityCoreTypes> = {
  [EntityCoreFields.Preview]: {
    className: 'text-center',
    title: 'Preview',
    filter: null,
    render: (r) =>
      renderPreview(r as EntityCoreTypes & { assets: Array<IAsset> }, { width: 184, height: 116 }),
    vocabulary: {
      plural: 'previews',
      singular: 'preview',
    },
    style: { width: 184 },
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
  },
  [EntityCoreFields.Description]: {
    title: 'Description',
    filter: CoreFieldFilterTypeEnum.Text,
    render: (r) => renderEmptyOrValue(r.description),
    vocabulary: {
      plural: 'Descriptions',
      singular: 'Description',
    },
  },
  [EntityCoreFields.Contributions]: {
    title: 'Contributors',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(
        transformAgentToNames(
          (r as EntityCoreTypes & { contributions?: Array<IContributor> | null }).contributions
        )
      ),
    vocabulary: {
      plural: 'Contributors',
      singular: 'Contributor',
    },
    constraint: 'contribution__pref_label__in',
    isSortable: false,
    order: {
      property: 'contribution__order_by',
      value: 'pref_label',
    },
  },
  [EntityCoreFields.Contribution]: {
    title: 'Contributors',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(
        transformAgentToNames(
          (r as EntityCoreTypes & { contributions?: Array<IContributor> | null }).contributions
        )
      ),
    vocabulary: {
      plural: 'Contributors',
      singular: 'Contributor',
    },
    constraint: 'contribution__pref_label__in',
    isSortable: false,
    order: {
      property: 'contribution__order_by',
      value: 'pref_label',
    },
  },
};
