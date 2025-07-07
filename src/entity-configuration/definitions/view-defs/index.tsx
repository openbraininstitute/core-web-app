import findKey from 'lodash/findKey';
import find from 'lodash/find';
import pick from 'lodash/pick';
import get from 'lodash/get';

import { ViewsDefinition as ExperimentalViewDefinition } from '@/entity-configuration/definitions/view-defs/experimental';
import { ViewsDefinition as ExperimentViewDefinition } from '@/entity-configuration/definitions/view-defs/experiment';
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
  ...ExperimentViewDefinition,
} as const;

export function getViewDefinitionByLegacyType(legacyType: DataType) {
  return get(ViewsDefinitionRegistry, legacyType, null);
}

export function getViewDefinitionsByLegacyType(types: Array<DataType>) {
  return pick(ViewsDefinitionRegistry, types);
}

function getViewDefinitionByName(name: TExperimentTypeNames) {
  return find(ViewsDefinitionRegistry, { name });
}

function getViewDefinitionDataTypeByName(name: TExperimentTypeNames): DataType | undefined {
  return findKey(ViewsDefinitionRegistry, { name }) as DataType;
}
