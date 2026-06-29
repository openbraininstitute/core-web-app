import { find } from 'es-toolkit/compat';

import {
  AnalysisScaleDict,
  type IAnalysisNotebookTemplate,
} from '@/api/entitycore/types/entities/analysis-notebook-template';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';

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
              when: { dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate },
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
      renderEmptyOrValue(
        find(AnalysisScaleDict, { key: (r as IAnalysisNotebookTemplate).scale })?.label
      ),
  },
};
