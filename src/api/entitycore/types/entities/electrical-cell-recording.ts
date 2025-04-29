import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import type {
  BrainRegionFilter,
  ContributionFilter,
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  IDFilter,
} from '@/api/entitycore/types/shared/request';
import type {
  EntityCoreIdentifiable,
  EntityCoreBaseAsset,
  EntityAuthorization,
  IBrainLocation,
  IBrainRegion,
  Timestamps,
  ILicense,
} from '@/api/entitycore/types/shared/global';

export type ElectricalCellRecordingExpandFields =
  | 'brain_location'
  | 'species'
  | 'strain'
  | 'brain_region';

export type ElectricalCellRecordingExpand = ElectricalCellRecordingExpandFields[];

export type ElectricalCellRecordingFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    BrainRegionFilter &
    PaginationFilter &
    SharedFilter
>;

export interface IElectricalCellRecordingBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
}

export interface IElectricalCellRecording
  extends IElectricalCellRecordingBase,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization {
  license?: ILicense | null;
  brain_region: IBrainRegion;
  type: EntityTypeEnum.ReconstructionMorphology;
}
