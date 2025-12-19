import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import ActionPopover from '@/ui/segments/notebooks/table/ActionPopover';

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
    render: (r) => <ActionPopover notebook={r as INotebook} />,
  },
};
