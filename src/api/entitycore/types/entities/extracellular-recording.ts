import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  EntityCoreType,
  ILicense,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionHierarchyFilter,
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  PaginationFilter,
  SharedFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export type ExtracellularRecordingFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    BrainRegionHierarchyFilter &
    PaginationFilter &
    SharedFilter &
    IlikeSearchFilter
>;

export interface IExtracellularRecording
  extends EntityCoreIdentifiableNamed,
    EntityCoreOwnership,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType {
  name: string;
  description: string;
  sampling_frequency: number;
  duration: number;
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
}
