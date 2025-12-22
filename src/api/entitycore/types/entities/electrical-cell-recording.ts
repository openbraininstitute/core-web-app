import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IBrainLocation,
  ILicense,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  ContributionFilter,
  IDFilter,
  PaginationFilter,
  SharedFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export const RecordingType = {
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

export type TRecordingTypeDictionary =
  (typeof RecordingTypeDictionary)[keyof typeof RecordingTypeDictionary];

export const ElectricalRecordingOrigin = {
  InVivo: {
    key: 'in_vivo',
    label: 'in vivo',
  },
  InVitro: {
    key: 'in_vitro',
    label: 'in vitro',
  },
  InSilico: {
    key: 'in_silico',
    label: 'in silico',
  },
  Unknown: {
    key: 'unknown',
    label: 'unknown',
  },
} as const;

export const ElectricalRecordingOriginDictionary = Object.fromEntries(
  Object.entries(ElectricalRecordingOrigin).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof ElectricalRecordingOrigin]: (typeof ElectricalRecordingOrigin)[K]['key'];
};

export type TElectricalRecordingOriginDictionary =
  (typeof ElectricalRecordingOriginDictionary)[keyof typeof ElectricalRecordingOriginDictionary];

export interface IRecordingFilter {
  recording_type: TRecordingTypeDictionary | null;
  recording_type__in: TRecordingTypeDictionary[] | null;
  recording_origin: TElectricalRecordingOriginDictionary | null;
  recording_origin__in: TElectricalRecordingOriginDictionary[] | null;
}

export type ElectricalCellRecordingFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    BrainRegionFilter &
    PaginationFilter &
    SharedFilter &
    IRecordingFilter
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
