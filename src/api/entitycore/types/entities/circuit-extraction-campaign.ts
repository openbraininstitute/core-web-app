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

interface ICircuitExtractionCampaignBase {
  name: string;
  description: string;
  scan_parameters: Record<string, unknown>;
}

export interface ICircuitExtractionCampaign
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ICircuitExtractionCampaignBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface ICircuitExtractionCampaignFilter
  extends IEntityFilter,
    NameFilter,
    PaginationFilter,
    IlikeSearchFilter,
    ContributionFilter {}

const CreateCircuitExtractionCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  scan_parameters: z.record(z.string(), z.unknown()),
  authorized_public: z.boolean().prefault(false),
});

export type TCreateCircuitExtractionCampaign = z.infer<
  typeof CreateCircuitExtractionCampaignSchema
>;

const UpdateCircuitExtractionCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scan_parameters: z.record(z.string(), z.unknown()).optional(),
});

export type TUpdateCircuitExtractionCampaign = z.infer<
  typeof UpdateCircuitExtractionCampaignSchema
>;
