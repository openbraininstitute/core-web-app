import { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
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
  Timestamps,
  ILicense,
  EntityCoreType,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';

type ElectricalCellRecordingExpandFields = 'brain_location' | 'species' | 'strain' | 'brain_region';

type ElectricalCellRecordingExpand = ElectricalCellRecordingExpandFields[];

export type ElectricalCellRecordingFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    BrainRegionFilter &
    PaginationFilter &
    SharedFilter
>;

interface IElectricalCellRecordingBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
}

export interface IElectricalCellRecording
  extends IElectricalCellRecordingBase,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType {
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
}
