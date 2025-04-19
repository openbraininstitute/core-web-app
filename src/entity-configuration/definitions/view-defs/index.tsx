import find from 'lodash/find';
import get from 'lodash/get';

import { ViewsDefinition as ExperimentalViewDefinition } from '@/entity-configuration/definitions/view-defs/experimental';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataType } from '@/constants/explore-section/list-views';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { TExperimentTypeNames } from '@/entity-configuration/domain/experimental';
import { findKey } from 'lodash';

export const CommonSummaryViewFields = [
  {
    field: EntityCoreFields.Description,
    className: 'col-span-3',
  },
  {
    field: EntityCoreFields.Contributions,
  },
  {
    field: EntityCoreFields.RegistrationDate,
  },
] as TypeSummaryProps[];

export const ViewsDefinitionRegistry = {
  ...ExperimentalViewDefinition,
} as const;

export function getViewDefinition(type: DataType) {
  return get(ViewsDefinitionRegistry, type, null);
}

export function getViewDefinitionByName(name: TExperimentTypeNames) {
  return find(ViewsDefinitionRegistry, { name });
}

export function getViewDefinitionDataTypeByName(name: TExperimentTypeNames): DataType | undefined {
  return findKey(ViewsDefinitionRegistry, { name }) as DataType;
}
