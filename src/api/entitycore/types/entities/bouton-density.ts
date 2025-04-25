import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type { IMType } from '@/api/entitycore/types/shared/global';
import type {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  ContributionFilter,
  BrainRegionFilter,
  SpeciesFilter,
  StainFilter,
  MtypeFilter,
} from '@/api/entitycore/types/shared/request';
import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';

export interface IExperimentalBoutonDensity extends IExperimentalDensity {
  mtypes: Array<IMType>;
  type: EntityTypeEnum.ExperimentalBoutonDensity;
}

export type ExperimentalBoutonDensityFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    SpeciesFilter &
    StainFilter &
    MtypeFilter
>;
