import type {
  AlternativeNameFilter,
  OwnershipFilter,
  PaginationFilter,
  PersonNameFilter,
  PrefLabelFilter,
} from '@/api/entitycore/types/shared/request';

type KeycloakIdentifierFilter = {
  sub_id: string | null;
  sub_id__in: string | null;
};

export interface IPersonFilter
  extends PaginationFilter,
    OwnershipFilter,
    PrefLabelFilter,
    PersonNameFilter,
    KeycloakIdentifierFilter {}

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
