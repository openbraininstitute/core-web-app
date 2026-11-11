import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { defineTaskConfigCampaign } from '@/entity-configuration/domain/model/task-config-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const BuildSynaptomeCampaign = defineTaskConfigCampaign({
  title: 'Synaptome',
  extendedType: ExtendedEntitiesTypeDict.BuildSynaptomeCampaign,
  slug: EntitySlug.BuildSynaptomeCampaign,
  campaignConfigType: TaskConfigType.BuildSynaptomeCampaign,
  campaignName: 'build synaptome',
});
