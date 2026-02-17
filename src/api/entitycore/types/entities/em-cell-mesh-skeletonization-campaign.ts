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

interface IEMCellMeshSkeletonizationCampaignBase {
  name: string;
  description: string;
  scan_parameters: Record<string, unknown>;
}

export interface IEMCellMeshSkeletonizationCampaign
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    IEMCellMeshSkeletonizationCampaignBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface IEMCellMeshSkeletonizationCampaignFilter
  extends IEntityFilter,
    NameFilter,
    PaginationFilter,
    IlikeSearchFilter,
    ContributionFilter {}

const CreateEMCellMeshSkeletonizationCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  scan_parameters: z.record(z.string(), z.unknown()),
  authorized_public: z.boolean().default(false),
});

export type TCreateEMCellMeshSkeletonizationCampaign = z.infer<
  typeof CreateEMCellMeshSkeletonizationCampaignSchema
>;

const UpdateEMCellMeshSkeletonizationCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scan_parameters: z.record(z.string(), z.unknown()).optional(),
});

export type TUpdateEMCellMeshSkeletonizationCampaign = z.infer<
  typeof UpdateEMCellMeshSkeletonizationCampaignSchema
>;
