import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

/**
 * Electrode geometry of a simulatable extracellular recording array.
 * Mirrors the entitycore `ElectrodeType` enum.
 */
export const ElectrodeTypeDict = {
  NeuropixelsV1: {
    key: 'neuropixels_v1',
    label: 'Neuropixels 1.0',
  },
  NeuropixelsV2: {
    key: 'neuropixels_v2',
    label: 'Neuropixels 2.0',
  },
  NeuropixelsUltra: {
    key: 'neuropixels_ultra',
    label: 'Neuropixels Ultra',
  },
  Custom: {
    key: 'custom',
    label: 'Custom',
  },
} as const;

export const ElectrodeTypeDictionary = Object.fromEntries(
  Object.entries(ElectrodeTypeDict).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof ElectrodeTypeDict]: (typeof ElectrodeTypeDict)[K]['key'];
};

export type TElectrodeType = (typeof ElectrodeTypeDictionary)[keyof typeof ElectrodeTypeDictionary];

/**
 * A simulatable extracellular recording array entity (entitycore
 * `SimulatableExtracellularRecordingArrayRead`): an electrode array, bound to a circuit, that the
 * extracellular-recording-array build workflow produces.
 */
export interface ISimulatableExtracellularRecordingArray
  extends EntityCoreIdentifiableNamed,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership,
    Timestamps {
  description: string;
  circuit_id: string;
  electrode_type: TElectrodeType;
  contributions?: Array<IContributor> | null;
}

export interface ISimulatableExtracellularRecordingArrayFilter
  extends IDFilter,
    TimestampsFilter,
    ContributionFilter,
    PaginationFilter,
    SharedFilter,
    IlikeSearchFilter,
    OwnershipFilter {
  electrode_type?: TElectrodeType | null;
  circuit_id?: string | null;
}
