import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  ContributionFilter,
  IdFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface IValidationResult
  extends EntityCoreIdentifiable,
    EntityCoreOwnership,
    EntityAuthorization,
    Timestamps {
  passed: boolean;
  name: string;
  validated_entity_id: string;
  validated_entity: any;
  type: 'validation_result';
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
