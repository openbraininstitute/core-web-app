import {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  Timestamps,
} from '../shared/global';
import {
  BrainRegionFilter,
  ContributionFilter,
  IdFilter,
  PaginationFilter,
  SharedFilter,
} from '../shared/request';

export interface IValidationResult
  extends EntityCoreIdentifiable,
    EntityCoreOwnership,
    EntityAuthorization,
    Timestamps {
  passed: boolean;
  name: string;
  validated_entity_id: string;
  validated_entity: any;
}

export interface IValidationResultFilter
  extends IdFilter,
    BrainRegionFilter,
    SharedFilter,
    ContributionFilter,
    PaginationFilter {
  passed: boolean | null;
  validated_entity_id: string | null;
}
