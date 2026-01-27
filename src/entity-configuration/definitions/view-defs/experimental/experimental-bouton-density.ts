import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

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
    EntityCoreFields.SpeciesName,
    EntityCoreFields.Contributions,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.MeanSTD },
    { field: EntityCoreFields.Sem },
    { field: EntityCoreFields.NumberOfMeasurements },
    { field: EntityCoreFields.License },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.License },
  ],
  curated: false,
  mlTopic: 'Bouton density',
};
