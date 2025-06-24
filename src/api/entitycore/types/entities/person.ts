import type { OwnershipFilter, PaginationFilter } from '@/api/entitycore/types/shared/request';

type KeycloakIdentifierFilter = {
  sub_id: string | null;
  sub_id__in: string | null;
};

export interface IPersonFilter
  extends PaginationFilter,
    OwnershipFilter,
    KeycloakIdentifierFilter {}
