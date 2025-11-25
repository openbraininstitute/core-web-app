import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForExperimentalBoutonDensity: ViewDefinitionConfig = {
  title: 'Bouton density',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ExperimentalBoutonDensity,
  columns: [
    EntityCoreFields.BrainRegion,
    EntityCoreFields.MType,
    EntityCoreFields.MeanSTD,
    EntityCoreFields.Sem,
    EntityCoreFields.NumberOfMeasurements,
    EntityCoreFields.Species,
    EntityCoreFields.Contributions,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.SubjectAge },
    { field: EntityCoreFields.MeanSTD },
    { field: EntityCoreFields.Weight },
    { field: EntityCoreFields.Sem },
    { field: EntityCoreFields.NumberOfMeasurements },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.License },
  ],
  curated: false,
  mlTopic: 'Bouton density',
};
