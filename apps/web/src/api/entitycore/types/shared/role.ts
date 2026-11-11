import type { EntityCoreIdentifiable, Timestamps } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';

export interface IRoleFilter extends PaginationFilter {
  name: string | null;
  role_id: string | null;
}

type RoleBase = {
  name: string;
  role_id: string;
};

export interface IRole extends RoleBase, Timestamps, EntityCoreIdentifiable {}
