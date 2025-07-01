import z from 'zod';

import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  Timestamps,
  EntityCoreBaseAsset,
  EntityCoreType,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  PaginationFilter,
  NameFilter,
  IEntityFilter,
} from '@/api/entitycore/types/shared/request';

export interface ISimulationBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  simulation_campaign_id: string;
  entity_id: string;
  scan_parameters: Record<string, any>;
}

export interface ICircuitSimulationCampaignBase {
  name: string;
  description: string;
  scan_parameters: { [key: string]: any };
  entity_id: string;
  simulations?: Array<ISimulationBase>;
}

export interface ICircuitSimulationCampaign
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ICircuitSimulationCampaignBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {}

export interface ICircuitSimulationCampaignFilter
  extends IEntityFilter,
    BrainRegionFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    NameFilter,
    PaginationFilter {}

export const CreateCircuitSimulationCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  simulation_campaign_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  scan_parameters: z.record(z.string(), z.any()), // TODO: replace with z.looseObject when migrated to zod 4
  authorized_public: z.boolean(),
});

export type TCreateCircuitSimulation = z.infer<typeof CreateCircuitSimulationCampaignSchema>;
