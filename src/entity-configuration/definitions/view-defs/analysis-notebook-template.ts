import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForNotebook: ViewDefinitionConfig = {
  title: 'Notebook',
  name: EntitySlug.AnalysisNotebookTemplate,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.NotebookScale,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.LifecycleStatus,
  ],
  miniDetailView: [
    { field: EntityCoreFields.NotebookScale },
    { field: EntityCoreFields.Contributions },
    { field: EntityCoreFields.RegistrationDate },
  ],
  summaryViewFields: [{ field: EntityCoreFields.NotebookScale }],
};

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.AnalysisNotebookTemplate]: viewDefForNotebook,
};
