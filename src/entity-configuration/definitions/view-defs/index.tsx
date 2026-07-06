import { find, findKey, get, pick } from 'es-toolkit/compat';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { ViewsDefinition as AnalysisNotebookResultViewDefinition } from '@/entity-configuration/definitions/view-defs/analysis-notebook-result';
import { ViewsDefinition as AnalysisNotebookTemplateViewDefinition } from '@/entity-configuration/definitions/view-defs/analysis-notebook-template';
import { ViewsDefinition as ExperimentalViewDefinition } from '@/entity-configuration/definitions/view-defs/experimental';
import { ViewsDefinition as ModelViewDefinition } from '@/entity-configuration/definitions/view-defs/model';
import { ViewsDefinition as ExperimentViewDefinition } from '@/entity-configuration/definitions/view-defs/simulation';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { TExperimentTypeNames } from '@/entity-configuration/domain/experimental';

export const CommonSummaryViewFields = [
  { field: EntityCoreFields.CreatedBy },
  { field: EntityCoreFields.Contributions },
  { field: EntityCoreFields.InstitutionalContributions },
  { field: EntityCoreFields.RegistrationDate },
] as TypeSummaryProps[];

export const ViewsDefinitionRegistry = {
  ...ExperimentalViewDefinition,
  ...ModelViewDefinition,
  ...ExperimentViewDefinition,
  ...AnalysisNotebookTemplateViewDefinition,
  ...AnalysisNotebookResultViewDefinition,
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
