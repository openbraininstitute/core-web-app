import z from 'zod';
import type {
  TCircuitBuildCategoryDictionary,
  TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionHierarchyFilter,
  IEntityFilter,
  IlikeSearchFilter,
  NameFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

export const SimulationCampaignEntityTypeDict = {
  circuit: EntityTypeDict.Circuit,
  memodel: EntityTypeDict.Memodel,
} as const;

export type TSimulationCampaignEntityTypeDict =
  (typeof SimulationCampaignEntityTypeDict)[keyof typeof SimulationCampaignEntityTypeDict];

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

  entity__type?: TSimulationCampaignEntityTypeDict | null;

  circuit__scale?: TCircuitScaleDictionary | null;
  circuit__scale__in?: Array<TCircuitScaleDictionary> | null;

  circuit__build_category?: TCircuitBuildCategoryDictionary | null;
  circuit__build_category__in?: Array<TCircuitBuildCategoryDictionary> | null;
}

export interface ICircuitSimulationCampaignFilter
  extends IEntityFilter,
    BrainRegionHierarchyFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    NameFilter,
    PaginationFilter,
    ISimulationCampaignCircuitFilter,
    IlikeSearchFilter {}

const CreateCircuitSimulationCampaignSchema = z.object({
  name: z.string(),
  description: z.string(),
  simulation_campaign_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  scan_parameters: z.record(z.string(), z.any()), // TODO: replace with z.looseObject when migrated to zod 4
  authorized_public: z.boolean(),
});

export type TCreateCircuitSimulation = z.infer<typeof CreateCircuitSimulationCampaignSchema>;
