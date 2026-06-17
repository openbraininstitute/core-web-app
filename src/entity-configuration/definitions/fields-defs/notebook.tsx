import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { ActionPopover } from '@/ui/segments/notebooks/table/action-popover';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

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
    render: (r, i) => {
      return <ActionPopover notebook={r as INotebook} index={i ?? 0} />;
    },
    isDisplayable: true,
  },
};
