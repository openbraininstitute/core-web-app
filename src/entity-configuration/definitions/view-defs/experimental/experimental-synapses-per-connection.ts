import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForExperimentalSynapsesPerConnection: ViewDefinitionConfig = {
  title: 'Synapses per connection',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ExperimentalSynapsesPerConnection,
  columns: [
    EntityCoreFields.PreSynapticBrainRegion,
    EntityCoreFields.PostSynapticBrainRegion,
    EntityCoreFields.PreSynapticCellType,
    EntityCoreFields.PostSynapticCellType,
    EntityCoreFields.MeanSTD,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.SubjectAge,
    EntityCoreFields.LifecycleStatus,
    EntityCoreFields.Contributions,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.PreSynapticBrainRegion },
    { field: EntityCoreFields.PostSynapticBrainRegion },
    { field: EntityCoreFields.PreSynapticCellType },
    { field: EntityCoreFields.PostSynapticCellType },
    { field: EntityCoreFields.MeanSTD },
    { field: EntityCoreFields.Sem },
    { field: EntityCoreFields.License },
  ],
  miniDetailView: [
    { field: EntityCoreFields.PreSynapticBrainRegion },
    { field: EntityCoreFields.PostSynapticBrainRegion },
    { field: EntityCoreFields.PreSynapticCellType },
    { field: EntityCoreFields.PostSynapticCellType },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.SubjectAge },
    { field: EntityCoreFields.License },
  ],
  curated: false,
  mlTopic: 'Synapses per connection',
};
