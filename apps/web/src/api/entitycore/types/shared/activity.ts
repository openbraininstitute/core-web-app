// TODO: this file should be removed as it get replaced by entities/task-activity
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

interface IUsedEntity extends EntityCoreIdentifiable, EntityAuthorization {}
interface IGeneratedEntity extends EntityCoreIdentifiable, EntityAuthorization {}

// @deprecated use ActivityStatus from entities/task-activity instead
export enum ActivityStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

// @deprecated use TActivityStatus from entities/task-activity instead
export type TActivityStatus = `${ActivityStatus}`;

export const ActivityTypeDict = {
  simulation_execution: 'simulation_execution',
  simulation_generation: 'simulation_generation',
  validation: 'validation',
  calibration: 'calibration',
  analysis_notebook_execution: 'analysis_notebook_execution',
  ion_channel_modeling_execution: 'ion_channel_modeling_execution',
  ion_channel_modeling_config_generation: 'ion_channel_modeling_config_generation',
  circuit_extraction_config_generation: 'circuit_extraction_config_generation',
  circuit_extraction_execution: 'circuit_extraction_execution',
  skeletonization_execution: 'skeletonization_execution',
  skeletonization_config_generation: 'skeletonization_config_generation',
} as const;

export type TActivityType = (typeof ActivityTypeDict)[keyof typeof ActivityTypeDict];

interface IActivityBase {
  start_time: string;
  end_time: string;
  used: IUsedEntity[];
  generated?: IGeneratedEntity[];
  status: ActivityStatus;
  type: TActivityType;
}

export interface IActivity
  extends EntityCoreIdentifiable,
    IActivityBase,
    Timestamps,
    EntityAuthorization {}

interface IActivityFilterBase {
  used__id?: string | null;
  used__id__in?: string | Array<string> | null;
  used__type?: string | null;
  generated__id?: string | null;
  generated__id__in?: string[] | null;
  generated__type?: string | null;
}

export interface IActivityFilter
  extends IActivityFilterBase,
    ContributionFilter,
    SharedFilter,
    PaginationFilter,
    OwnershipFilter {}
