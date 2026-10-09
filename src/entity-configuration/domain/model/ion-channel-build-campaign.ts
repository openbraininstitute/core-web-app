import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { defineTaskConfigCampaign } from '@/entity-configuration/domain/model/task-config-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const IonChannelBuildCampaign = defineTaskConfigCampaign({
  title: 'Ion channel',
  extendedType: ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
  slug: EntitySlug.IonChannelBuildCampaign,
  campaignConfigType: TaskConfigType.IonChannelModelingCampaign,
  campaignName: 'ion channel build',
});
