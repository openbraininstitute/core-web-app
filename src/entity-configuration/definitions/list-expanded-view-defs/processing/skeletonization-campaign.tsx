import { TaskViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/task-activity';

import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { TExtendedSkeletonizationCampaignsType } from '@/entity-configuration/domain/processing/skeletonization-campaign';

type TEnrichedSkeletonizationCampaign = TExtendedSkeletonizationCampaignsType['data'][number];

export const viewConfig: ListExpandedViewConfig<TEnrichedSkeletonizationCampaign> =
  TaskViewConfig as unknown as ListExpandedViewConfig<TEnrichedSkeletonizationCampaign>;
