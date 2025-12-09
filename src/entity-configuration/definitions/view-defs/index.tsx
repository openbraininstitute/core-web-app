import findKey from 'es-toolkit/compat/findKey';
import find from 'es-toolkit/compat/find';
import pick from 'es-toolkit/compat/pick';
import get from 'es-toolkit/compat/get';

import { ViewsDefinition as ExperimentalViewDefinition } from '@/entity-configuration/definitions/view-defs/experimental';
import { ViewsDefinition as ExperimentViewDefinition } from '@/entity-configuration/definitions/view-defs/experiment';
import { ViewsDefinition as ModelViewDefinition } from '@/entity-configuration/definitions/view-defs/model';
import { ViewsDefinition as NotebookViewDefinition } from '@/entity-configuration/definitions/view-defs/notebook';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { TExperimentTypeNames } from '@/entity-configuration/domain/experimental';

export const CommonSummaryViewFields = [
  { field: EntityCoreFields.Description, className: 'col-span-2' },
  { field: EntityCoreFields.CreatedBy },
  { field: EntityCoreFields.Contributions },
  { field: EntityCoreFields.InstitutionalContributions },
  { field: EntityCoreFields.RegistrationDate },
] as TypeSummaryProps[];

export const ViewsDefinitionRegistry = {
  ...ExperimentalViewDefinition,
  ...ModelViewDefinition,
  ...ExperimentViewDefinition,
  ...NotebookViewDefinition,
} as const;

export function getViewDefinitionByExtendedType(type: TExtendedEntitiesTypeDict) {
  return get(ViewsDefinitionRegistry, type, null);
}

export function getViewDefinitionsByLegacyType(types: Array<TExtendedEntitiesTypeDict>) {
  return pick(ViewsDefinitionRegistry, types);
}

export function getViewDefinitionByName(name: TExperimentTypeNames) {
  return find(ViewsDefinitionRegistry, { name });
}

export function getViewDefinitionDataTypeByName(
  name: TExperimentTypeNames
): TExtendedEntitiesTypeDict | undefined {
  return findKey(ViewsDefinitionRegistry, { name }) as TExtendedEntitiesTypeDict;
}
