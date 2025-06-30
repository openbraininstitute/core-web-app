import z from 'zod';

import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  Timestamps,
  EntityCoreBaseAsset,
  EntityCoreType,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  BrainRegionFilter,
  SharedFilter,
  PaginationFilter,
  OwnershipFilter,
} from '@/api/entitycore/types/shared/request';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';

export interface ICircuitSimulationCampaignBase {
  name: string;
  description: string;
  scan_parameters: { [key: string]: any };
  entity_id: string;
  simulations?: ICircuitSimulation[];
}

export interface ICircuitSimulationCampaign
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ICircuitSimulationCampaignBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {}

export interface ICircuitSimulationCampaignFilter
  extends ContributionFilter,
    BrainRegionFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    SharedFilter,
    PaginationFilter,
    OwnershipFilter {}

export const CreateCircuitSimulationCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  simulation_campaign_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  scan_parameters: z.any(), // TODO: replace with z.looseObject when migrated to zod 4
});

export type TCreateCircuitSimulation = z.infer<typeof CreateCircuitSimulationCampaignSchema>;
