import { find } from 'es-toolkit/compat';

import {
  AnalysisScaleDict,
  type IAnalysisNotebookTemplate,
} from '@/api/entitycore/types/entities/analysis-notebook-template';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { NotebookPreviewThumbnail } from '@/features/notebooks/components/notebook-preview-thumbnail';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.NotebookImagePreview]: {
    className: 'text-center',
    title: 'Preview',
    filter: null,
    render: (r) => <NotebookPreviewThumbnail record={r as unknown as IAnalysisNotebookTemplate} />,
    style: { width: 194 },
    isFilterable: false,
    isSortable: false,
    isDisplayable: true,
  },
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
