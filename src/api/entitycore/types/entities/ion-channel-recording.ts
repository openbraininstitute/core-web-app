import { IRecordingFilter } from './electrical-cell-recording';

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

const RecordingType = {
  Intracellular: {
    key: 'intracellular',
    label: 'Intracellular',
  },
  Extracellular: {
    key: 'extracellular',
    label: 'extracellular',
  },
  Both: {
    key: 'both',
    label: 'both',
  },
  Unknown: {
    key: 'unknown',
    label: 'unknown',
  },
} as const;

export const RecordingTypeDictionary = Object.fromEntries(
  Object.entries(RecordingType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof RecordingType]: (typeof RecordingType)[K]['key'];
};

export type IonChannelRecordingFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    BrainRegionFilter &
    PaginationFilter &
    SharedFilter &
    IRecordingFilter
>;

interface IIonChannelRecordingBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
}

export interface IIonChannelRecording
  extends IIonChannelRecordingBase,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType {
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
}
