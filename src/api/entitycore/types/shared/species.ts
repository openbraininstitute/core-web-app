import { z } from 'zod';

import type {
  ContributionFilter,
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
} from '@/api/entitycore/types/shared/request';

export interface ISpeciesFilter
  extends PaginationFilter,
    OwnershipFilter,
    IDFilter,
    SearchFilter,
    ContributionFilter {}

const SpeciesCreateSchema = z.object({
  name: z.string(),
  taxonomy_id: z.string(),
});

export type TSpeciesCreate = z.infer<typeof SpeciesCreateSchema>;
