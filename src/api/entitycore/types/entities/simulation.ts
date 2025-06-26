import { z } from 'zod';
import type { IActivity } from '@/api/entitycore/types/entities/activity';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IAsset,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  NameFilter,
  OwnershipFilter,
  SearchFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface ISimulationBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  simulation_campaign_id: string;
  entity_id: string;
  scan_parameters: Record<string, any>;
}

export interface ISimulationGeneratedBy {
  id: string;
  type: string;
  start_time: string;
  end_time: string;
  status: SimulationExecutionStatus;
}

export interface ISimulation
  extends ISimulationBase,
    Timestamps,
    EntityCoreOwnership,
    EntityAuthorization,
    EntityCoreType {
  assets: Array<IAsset>;
  generated_by: Array<ISimulationGeneratedBy>;
}

export interface ISimulationCampaign
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreOwnership,
    EntityAuthorization,
    EntityCoreType {
  assets: Array<IAsset>;
  name: string;
  description: string;
  scan_parameters: Record<string, any>;
  entity_id: string;
  simulations: Array<ISimulationBase>;
}

export interface ISimulationExecution extends IActivity {
  status: string;
}

export interface ISimulationGeneration extends IActivity {}

export interface ISimulationResult
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreOwnership,
    EntityAuthorization,
    EntityCoreType {
  assets: Array<IAsset>;
  name: string;
  description: string;
  simulation_id: string;
}

export interface IEntityFilter
  extends IDFilter,
    OwnershipFilter,
    TimestampsFilter,
    ContributionFilter {}

export interface INestedEntityFilter extends IDFilter {
  type?: string;
  order_by?: Array<string>;
}

export interface IActivityFilter extends IDFilter, OwnershipFilter, TimestampsFilter, SearchFilter {
  start_time?: string;
  end_time?: string;
  used?: INestedEntityFilter;
  generated?: INestedEntityFilter;
}

export interface INestedSimulationFilter extends IDFilter, NameFilter {
  entity_id?: string;
  entity_id__in?: Array<string>;
}

export interface ISimulationFilter
  extends INestedSimulationFilter,
    TimestampsFilter,
    OwnershipFilter,
    ContributionFilter,
    SearchFilter {
  simulation_campaign_id?: string;
  simulation_campaign_id__in?: Array<string>;
}

export interface ISimulationCampaignFilter extends IEntityFilter, NameFilter, SearchFilter {
  simulation?: INestedSimulationFilter;
}

export interface ISimulationExecutionFilter extends IActivityFilter, SearchFilter {
  order_by?: Array<string>;
  status?: string;
}

export interface ISimulationGenerationFilter extends IActivityFilter {
  order_by?: Array<string>;
}

export interface INestedSimulationResultFilter extends IDFilter, NameFilter {}

export interface ISimulationResultFilter
  extends INestedSimulationResultFilter,
    TimestampsFilter,
    OwnershipFilter,
    ContributionFilter {}

export enum SimulationExecutionStatus {
  created = 'created',
  pending = 'pending',
  running = 'running',
  done = 'done',
  error = 'error',
}

export type TSimulationExecutionStatus = `${SimulationExecutionStatus}`;

export const simulationCreateSchema = z.object({
  name: z.string(),
  description: z.string(),
  scan_parameters: z.record(z.string(), z.any()),
  entity_id: z.string().uuid(),
  simulation_campaign_id: z.string().uuid(),
  authorized_public: z.boolean(),
});

export type ISimulationCreate = z.infer<typeof simulationCreateSchema>;

export const simulationCampaignCreateSchema = z.object({
  name: z.string(),
  description: z.string(),
  scan_parameters: z.record(z.string(), z.any()),
  entity_id: z.string().uuid(),
  authorized_public: z.boolean(),
});

export type ISimulationCampaignCreate = z.infer<typeof simulationCampaignCreateSchema>;

export const activityCreateSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  used_ids: z.array(z.string().uuid()),
  generated_ids: z.array(z.string().uuid()),
  authorized_public: z.boolean(),
});

export const simulationExecutionCreateSchema = z
  .object({
    status: z.nativeEnum(SimulationExecutionStatus),
  })
  .merge(activityCreateSchema);

export type ISimulationExecutionCreate = z.infer<typeof simulationExecutionCreateSchema>;
export type ISimulationGenerationCreate = ISimulationExecutionCreate;

export const simulationResultSchema = z.object({
  name: z.string(),
  description: z.string(),
  simulation_id: z.string().uuid(),
  authorized_public: z.boolean(),
});

export type ISimulationResultCreate = z.infer<typeof simulationResultSchema>;
