import { z } from 'zod';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
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
  IlikeSearchFilter,
  NameFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

interface NestedIonChannelRecording extends IIonChannelRecording {}

interface IonChannelModelingConfigBase {
  name: string;
  description: string;
  ion_channel_modeling_campaign_id: string;
  scan_parameters: Record<string, any>;
}

export interface IonChannelModelingConfig
  extends IonChannelModelingConfigBase,
    EntityCoreIdentifiable,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset {}
interface NestedIonChannelModelingConfig
  extends IonChannelModelingConfigBase,
    EntityCoreIdentifiable,
    EntityCoreType {}

interface IonChannelModelingCampaignBase {
  name: string;
  description: string;
  scan_parameters: Record<string, any>;
}

interface NestedIonChannelModelingCampaignRead
  extends IonChannelModelingCampaignBase,
    EntityCoreIdentifiable,
    EntityCoreType {}

export interface IonChannelModelingCampaign
  extends NestedIonChannelModelingCampaignRead,
    Timestamps,
    EntityCoreType,
    EntityCoreOwnership,
    EntityAuthorization,
    EntityCoreBaseAsset {
  contributions?: Array<IContributor> | null;
  input_recordings: NestedIonChannelRecording[];
  ion_channel_modeling_configs: NestedIonChannelModelingConfig[];
}

export interface IonChannelModelingCampaignFilter
  extends PaginationFilter,
    NameFilter,
    TimestampsFilter,
    EntityAuthorization,
    ContributionFilter,
    OwnershipFilter,
    SearchFilter,
    IlikeSearchFilter {
  ion_channel_modeling_config__id?: string | null;
  ion_channel_modeling_config__id__in?: string[] | null;
  ion_channel_modeling_config__name?: string | null;
  ion_channel_modeling_config__name__in?: string[] | null;
  ion_channel_modeling_config__name__ilike?: string | null;

  with_facets?: boolean;
}

const CreateIonChannelModelingCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  scan_parameters: z.record(z.string(), z.any()),
  authorized_public: z.boolean().default(false),
});

export type TCreateIonChannelModelingCampaign = z.infer<
  typeof CreateIonChannelModelingCampaignSchema
>;

const UpdateIonChannelModelingCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scan_parameters: z.record(z.string(), z.any()).optional(),
});

export type TUpdateIonChannelModelingCampaign = z.infer<
  typeof UpdateIonChannelModelingCampaignSchema
>;
