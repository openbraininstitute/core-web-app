import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  IAsset,
  ILicense,
  MeasurementBase,
  Subject,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export interface IExperimentalDensity
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    Timestamps,
    Subject,
    EntityCoreOwnership {
  name: string;
  description: string;
  license: ILicense;
  brain_region: BrainRegionHierarchyBase;
  measurements: Array<MeasurementBase> | null;
  assets: Array<IAsset> | null;
}
