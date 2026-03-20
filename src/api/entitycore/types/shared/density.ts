import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  IAsset,
  ILicense,
  ISubject,
  MeasurementBase,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export interface IExperimentalDensity
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    Timestamps,
    EntityCoreOwnership {
  name: string;
  description: string;
  subject: ISubject;
  license: ILicense;
  brain_region: BrainRegionHierarchyBase;
  measurements: Array<MeasurementBase> | null;
  assets: Array<IAsset> | null;
}
