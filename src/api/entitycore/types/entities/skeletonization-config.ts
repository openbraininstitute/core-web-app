import { z } from 'zod';

import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IEntityFilter,
  IlikeSearchFilter,
  NameFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

interface ISkeletonizationConfigBase {
  name: string;
  description: string;
  em_cell_mesh_id: string;
  scan_parameters: Record<string, unknown>;
}

export interface ISkeletonizationConfig
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ISkeletonizationConfigBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface ISkeletonizationConfigFilter
  extends IEntityFilter,
    NameFilter,
    PaginationFilter,
    IlikeSearchFilter,
    ContributionFilter {
  em_cell_mesh_id?: string | null;
  em_cell_mesh_id__in?: Array<string> | null;
  skeletonization_campaign_id?: string | null;
  skeletonization_campaign_id__in?: Array<string> | null;
}

const CreateSkeletonizationConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  em_cell_mesh_id: z.string().uuid(),
  scan_parameters: z.record(z.string(), z.unknown()),
  authorized_public: z.boolean().default(false),
});

export type TCreateSkeletonizationConfig = z.infer<typeof CreateSkeletonizationConfigSchema>;

const UpdateSkeletonizationConfigSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  em_cell_mesh_id: z.string().uuid().optional(),
  scan_parameters: z.record(z.string(), z.unknown()).optional(),
});

export type TUpdateSkeletonizationConfig = z.infer<typeof UpdateSkeletonizationConfigSchema>;
