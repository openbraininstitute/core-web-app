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

interface ISkeletonizationCampaignBase {
  name: string;
  description: string;
  scan_parameters: Record<string, unknown>;
}

export interface ISkeletonizationCampaign
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ISkeletonizationCampaignBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface ISkeletonizationCampaignFilter
  extends IEntityFilter,
    NameFilter,
    PaginationFilter,
    IlikeSearchFilter,
    ContributionFilter {}

const CreateSkeletonizationCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  scan_parameters: z.record(z.string(), z.unknown()),
  authorized_public: z.boolean().default(false),
});

export type TCreateSkeletonizationCampaign = z.infer<typeof CreateSkeletonizationCampaignSchema>;

const UpdateSkeletonizationCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scan_parameters: z.record(z.string(), z.unknown()).optional(),
});

export type TUpdateSkeletonizationCampaign = z.infer<typeof UpdateSkeletonizationCampaignSchema>;
