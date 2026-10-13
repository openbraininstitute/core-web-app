import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { defineTaskConfigCampaign } from '@/entity-configuration/domain/model/task-config-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const CircuitSynapticPhysiologyCampaign = defineTaskConfigCampaign({
  title: 'Circuit synaptic physiology',
  extendedType: ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign,
  slug: EntitySlug.CircuitSynapticPhysiologyCampaign,
  campaignConfigType: TaskConfigType.CircuitSynapticPhysiologyCampaign,
  campaignName: 'circuit synaptic physiology',
});
