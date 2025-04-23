import find from 'lodash/find';
import get from 'lodash/get';
import findKey from 'lodash/findKey';

import { ViewsDefinition as ExperimentalViewDefinition } from '@/entity-configuration/definitions/view-defs/experimental';
import { ViewsDefinition as ModelViewDefinition } from '@/entity-configuration/definitions/view-defs/model';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataType } from '@/constants/explore-section/list-views';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { TExperimentTypeNames } from '@/entity-configuration/domain/experimental';

export const CommonSummaryViewFields = [
  { field: EntityCoreFields.Description, className: 'col-span-3' },
  { field: EntityCoreFields.Contributions },
  { field: EntityCoreFields.RegistrationDate },
] as TypeSummaryProps[];

export const ViewsDefinitionRegistry = {
  ...ExperimentalViewDefinition,
  ...ModelViewDefinition,
} as const;

export function getViewDefinitionByLegacyType(legacyType: DataType) {
  return get(ViewsDefinitionRegistry, legacyType, null);
}

export function getViewDefinitionByName(name: TExperimentTypeNames) {
  return find(ViewsDefinitionRegistry, { name });
}

export function getViewDefinitionDataTypeByName(name: TExperimentTypeNames): DataType | undefined {
  return findKey(ViewsDefinitionRegistry, { name }) as DataType;
}
