import { z } from 'zod';

import type {
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
} from '@/api/entitycore/types/shared/request';

export interface IStrainFilter extends PaginationFilter, OwnershipFilter, IDFilter, SearchFilter {}

const StrainCreateSchema = z.object({
  name: z.string(),
  taxonomy_id: z.string(),
  species_id: z.uuid(),
});

export type TStrainCreate = z.infer<typeof StrainCreateSchema>;
