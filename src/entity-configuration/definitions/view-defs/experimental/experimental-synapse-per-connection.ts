import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForExperimentalSynapsePerConnection: ViewDefinitionConfig = {
  title: 'Synapse per connection',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ExperimentalSynapsesPerConnection,
  columns: [
    EntityCoreFields.PreSynapticBrainRegion,
    EntityCoreFields.PostSynapticBrainRegion,
    EntityCoreFields.PreSynapticCellType,
    EntityCoreFields.PostSynapticCellType,
    EntityCoreFields.MeanSTD,
    EntityCoreFields.Species,
    EntityCoreFields.SubjectAge,
    EntityCoreFields.Contributions,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.PreSynapticBrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.PostSynapticBrainRegion },
    { field: EntityCoreFields.SubjectAge },
    { field: EntityCoreFields.PreSynapticCellType },
    { field: EntityCoreFields.Weight },
    { field: EntityCoreFields.PostSynapticCellType },
    { field: EntityCoreFields.MeanSTD },
    { field: EntityCoreFields.Sem },
    // {
    //   field: EntityCoreFields.NumberOfConnections,
    // },
  ],
  miniDetailView: [
    { field: EntityCoreFields.PreSynapticBrainRegion },
    { field: EntityCoreFields.PostSynapticBrainRegion },
    { field: EntityCoreFields.PreSynapticCellType },
    { field: EntityCoreFields.PostSynapticCellType },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.SubjectAge },
    { field: EntityCoreFields.License },
  ],
  curated: false,
  mlTopic: 'Synapse per connection',
};
