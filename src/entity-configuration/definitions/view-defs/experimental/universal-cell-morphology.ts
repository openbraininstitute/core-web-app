import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { viewDefForCellMorphology } from '@/entity-configuration/definitions/view-defs/experimental/cell-morphology';

export const viewDefForUniversalCellMorphology = {
  ...viewDefForCellMorphology,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.MType,
    EntityCoreFields.Name,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.GenerationType,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
};
