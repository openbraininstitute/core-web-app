import type {
  AlternativeNameFilter,
  OwnershipFilter,
  PaginationFilter,
  PersonNameFilter,
  PrefLabelFilter,
} from '@/api/entitycore/types/shared/request';

export interface IPersonFilter
  extends PaginationFilter,
    OwnershipFilter,
    PrefLabelFilter,
    PersonNameFilter {}

export interface IOrganizationFilter
  extends PaginationFilter,
    OwnershipFilter,
    PrefLabelFilter,
    AlternativeNameFilter {}

export interface IConsortiumFilter
  extends PaginationFilter,
    OwnershipFilter,
    PrefLabelFilter,
    AlternativeNameFilter {}
