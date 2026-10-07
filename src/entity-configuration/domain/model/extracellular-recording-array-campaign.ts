import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { defineTaskConfigCampaign } from '@/entity-configuration/domain/model/task-config-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { extracellularRecordingArrayBuildFlag } from '@/features/feature-flags/flags';

// The build campaign is tracked through the launchable weights-calculation task family (there is no
// dedicated `create_extracellular_recording_array` entitycore task type).
export const ExtracellularRecordingArrayCampaign = defineTaskConfigCampaign({
  title: 'Extracellular recording array',
  extendedType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
  requiredFeatures: [extracellularRecordingArrayBuildFlag.key],
  slug: EntitySlug.ExtracellularRecordingArrayCampaign,
  campaignConfigType: TaskConfigType.ExtracellularRecordingWeightsCalculationCampaign,
  campaignName: 'extracellular recording array',
});
