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
import type {
  TCircuitBuildCategoryDictionary,
  TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';

interface ISimulationBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  simulation_campaign_id: string;
  entity_id: string;
  scan_parameters: Record<string, any>;
}

interface ICircuitSimulationCampaignBase {
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

export interface ISimulationCampaignCircuitFilter {
  circuit__name?: string | null;
  circuit__name__in?: Array<string> | null;
  circuit__name__ilike?: string | null;

  circuit__id?: string | null;
  circuit__id__in?: Array<string> | null;

  circuit__scale?: TCircuitScaleDictionary | null;
  circuit__scale__in?: Array<TCircuitScaleDictionary> | null;

  circuit__build_category?: TCircuitBuildCategoryDictionary | null;
  circuit__build_category__in?: Array<TCircuitBuildCategoryDictionary> | null;
}

export interface ICircuitSimulationCampaignFilter
  extends IEntityFilter,
    BrainRegionFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    NameFilter,
    PaginationFilter,
    ISimulationCampaignCircuitFilter {}

const CreateCircuitSimulationCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  simulation_campaign_id: z.uuid(),
  entity_id: z.uuid(),
  scan_parameters: z.record(z.string(), z.any()), // TODO: replace with z.looseObject when migrated to zod 4
  authorized_public: z.boolean(),
});

export type TCreateCircuitSimulation = z.infer<typeof CreateCircuitSimulationCampaignSchema>;
