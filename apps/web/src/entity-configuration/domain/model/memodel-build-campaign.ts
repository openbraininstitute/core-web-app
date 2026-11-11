import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { defineTaskConfigCampaign } from '@/entity-configuration/domain/model/task-config-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const MEModelBuildCampaign = defineTaskConfigCampaign({
  title: 'Single neuron',
  extendedType: ExtendedEntitiesTypeDict.MEModelBuildCampaign,
  slug: EntitySlug.MEModelBuildCampaign,
  campaignConfigType: TaskConfigType.MEModelBuildCampaign,
  campaignName: 'ME-model build',
});
