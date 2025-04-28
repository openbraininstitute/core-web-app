import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  IBrainRegion,
  IContributor,
  Timestamps,
  EntityCoreOwnership,
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
    EntityCoreOwnership {
  contributions?: Array<IContributor> | null;
  brain_region: IBrainRegion;
  me_model: IMEModel;
  type: EntityTypeEnum.SingleNeuronSynaptome;
}

export interface ISingleNeuronSynaptomeFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    BrainRegionFilter,
    SharedFilter,
    IMEModelFilter {}
