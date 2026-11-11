import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForNotebookResult: ViewDefinitionConfig = {
  title: 'Result',
  name: EntitySlug.AnalysisNotebookResult,
  columns: [
    EntityCoreFields.NotebookImagePreview,
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.Contributions,
    EntityCoreFields.UpdateDate,
    EntityCoreFields.LifecycleStatus,
  ],
  miniDetailView: [
    { field: EntityCoreFields.Contributions },
    { field: EntityCoreFields.UpdateDate },
  ],
  summaryViewFields: [],
};

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.AnalysisNotebookResult]: viewDefForNotebookResult,
};
