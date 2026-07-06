import {
  getAnalysisNotebookResult,
  getAnalysisNotebookResults,
} from '@/api/entitycore/queries/analysis-notebook-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const AnalysisNotebookResult: EntityCoreTypeConfig<IAnalysisNotebookResult> = {
  group: EntityTypeGroup.Notebooks,
  title: 'Results',
  extendedType: ExtendedEntitiesTypeDict.AnalysisNotebookResult,
  type: EntityTypeDict.AnalysisNotebookResult,
  slug: EntitySlug.AnalysisNotebookResult,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getAnalysisNotebookResults,
      one: getAnalysisNotebookResult,
    },
  },
  asset: {},
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.AnalysisNotebookResult],
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: false,
  isSimulatable: false,
  isContributable: false,
} as const;
