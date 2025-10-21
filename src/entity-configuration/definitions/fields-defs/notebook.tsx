import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.NotebookScale]: {
    title: 'Scale',
    filter: null,
    render: (r) => 'scale' in r && r.scale,
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.NotebookActions]: {
    title: '',
    filter: null,
    render: (r) => null,
  },
};
