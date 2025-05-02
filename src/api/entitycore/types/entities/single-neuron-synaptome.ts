import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  IBrainRegion,
  IContributor,
  Timestamps,
  EntityCoreOwnership,
  EntityCoreType,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  BrainRegionFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
} from '@/api/entitycore/types/shared/request';

import type { IMEModel, IMEModelFilter } from '@/api/entitycore/types/entities/me-model';

export interface SingleNeuronSynaptomeBase {
  name: string;
  description: string;
  seed: number;
}

export interface ISingleNeuronSynaptome
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    SingleNeuronSynaptomeBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
  brain_region: IBrainRegion;
  me_model: IMEModel;
}

export interface ISingleNeuronSynaptomeFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    BrainRegionFilter,
    SharedFilter,
    IMEModelFilter {}
