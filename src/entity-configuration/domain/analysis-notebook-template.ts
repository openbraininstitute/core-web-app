import {
  getAnalysisNotebookTemplate,
  getAnalysisNotebookTemplates,
} from '@/api/entitycore/queries/analysis-notebook-template';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const AnalysisNotebookTemplate: EntityCoreTypeConfig<IAnalysisNotebookTemplate> = {
  group: EntityTypeGroup.Notebooks,
  title: 'Notebook',
  extendedType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
  type: EntityTypeDict.AnalysisNotebookTemplate,
  slug: EntitySlug.AnalysisNotebookTemplate,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getAnalysisNotebookTemplates,
      one: getAnalysisNotebookTemplate,
    },
  },
  asset: {},
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.AnalysisNotebookTemplate],
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: false,
  isSimulatable: false,
  isContributable: false,
} as const;
