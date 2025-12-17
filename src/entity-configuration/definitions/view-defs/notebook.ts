import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForNotebook: ViewDefinitionConfig = {
  title: 'Notebook',
  name: EntitySlug.Notebook,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.NotebookScale,
    EntityCoreFields.NotebookActions,
  ],
};

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [ExtendedEntitiesTypeDict.Notebook]: viewDefForNotebook,
};
