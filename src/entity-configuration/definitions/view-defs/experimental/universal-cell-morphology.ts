import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { viewDefForCellMorphology } from '@/entity-configuration/definitions/view-defs/experimental/cell-morphology';

export const viewDefForUniversalCellMorphology = {
  ...viewDefForCellMorphology,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.MType,
    EntityCoreFields.Name,
    EntityCoreFields.GenerationType,
    EntityCoreFields.ProtocolDesign,
    EntityCoreFields.LifecycleStatus,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
};
