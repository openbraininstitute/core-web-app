import { z } from 'zod';

import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  NameFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface IIonChannelModelingConfigBase {
  name: string;
  description: string;
  ion_channel_modeling_campaign_id: string;
  scan_parameters: Record<string, any>;
}

export interface IIonChannelModelingConfig
  extends IIonChannelModelingConfigBase,
    EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    Timestamps,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface IIonChannelModelingConfigCampaignFilter {
  ion_channel_modeling_campaign_id?: string | null;
  ion_channel_modeling_campaign_id__in?: string[] | null;
}

export interface IIonChannelModelingConfigFilter
  extends PaginationFilter,
    NameFilter,
    TimestampsFilter,
    ContributionFilter,
    OwnershipFilter,
    SearchFilter,
    IlikeSearchFilter,
    IDFilter,
    IIonChannelModelingConfigCampaignFilter {
  with_facets?: boolean;
}

const CreateIonChannelModelingConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  ion_channel_modeling_campaign_id: z.string().uuid(),
  scan_parameters: z.record(z.string(), z.any()),
  authorized_public: z.boolean().default(false),
});

export type TCreateIonChannelModelingConfig = z.infer<typeof CreateIonChannelModelingConfigSchema>;

const UpdateIonChannelModelingConfigSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  ion_channel_modeling_campaign_id: z.string().uuid().optional(),
  scan_parameters: z.record(z.string(), z.any()).optional(),
});

export type TUpdateIonChannelModelingConfig = z.infer<typeof UpdateIonChannelModelingConfigSchema>;
