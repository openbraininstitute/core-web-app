import type { PaginationFilter } from '@/api/entitycore/types/shared/request';

export interface ILicenseFilter extends PaginationFilter {
  name: string | null;
  label: string | null;
}
