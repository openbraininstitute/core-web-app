import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  IAsset,
  IBrainRegion,
  ILicense,
  ISubject,
  MeasurementBase,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export interface IExperimentalDensity
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    Timestamps {
  name: string;
  description: string;
  subject: ISubject;
  license: ILicense;
  brain_region: IBrainRegion;
  measurements: Array<MeasurementBase> | null;
  assets: Array<IAsset> | null;
}
