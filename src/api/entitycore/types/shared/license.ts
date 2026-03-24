import type {
  IlikeSearchFilter,
  NameFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

export interface ILicenseFilter extends PaginationFilter, IlikeSearchFilter, NameFilter {
  name: string | null;
  label: string | null;
}
