import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { defineTaskConfigCampaign } from '@/entity-configuration/domain/model/task-config-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const EmSynapseMappingCampaign = defineTaskConfigCampaign({
  title: 'Electron Microscopy Synaptome',
  extendedType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
  slug: EntitySlug.EmSynapseMappingCampaign,
  campaignConfigType: TaskConfigType.EmSynapseMappingCampaign,
  campaignName: 'EM synapse mapping',
});
