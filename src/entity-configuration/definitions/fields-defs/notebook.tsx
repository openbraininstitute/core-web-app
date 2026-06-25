import { find } from 'es-toolkit/compat';

import { AnalysisScaleDict, type INotebook } from '@/api/entitycore/types/entities/notebook';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { ActionPopover } from '@/ui/segments/notebooks/table/action-popover';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.NotebookScale]: {
    title: 'Scale',
    filter: null,
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: { dataType: ExtendedEntitiesTypeDict.Notebook },
              value: true,
            },
          ],
        },
      },
      filter: {
        available: {
          default: false,
        },
      },
    },
    render: (r) =>
      renderEmptyOrValue(find(AnalysisScaleDict, { key: (r as INotebook).scale })?.label),
  },
  [EntityCoreFields.NotebookActions]: {
    title: '',
    filter: null,
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: { dataType: ExtendedEntitiesTypeDict.Notebook },
              value: true,
            },
          ],
        },
        hideInFilterPanel: {
          default: false,
          rules: [
            {
              when: { dataType: ExtendedEntitiesTypeDict.Notebook },
              value: true,
            },
          ],
        },
      },
      filter: {
        available: {
          default: false,
        },
      },
    },
    render: (r, i) => {
      return <ActionPopover notebook={r as INotebook} index={i ?? 0} />;
    },
  },
};
