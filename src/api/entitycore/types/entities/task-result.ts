import { z } from 'zod';

import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  IEntityLifecycleStatus,
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
import type { EntityDerivationFilter } from './derivation';

/** Mirrors entitycore's `TaskResultType`. */
export const TaskResultType = {
  CircuitSimulationResult: 'circuit_simulation__result',
  CircuitExtractionCircuit: 'circuit_extraction__circuit',
  IonChannelModelingResult: 'ion_channel_modeling__result',
  SkeletonizationMorphology: 'skeletonization__morphology',
  IonChannelSimulationResult: 'ion_channel_simulation__result',
  EmSynapseMappingResult: 'em_synapse_mapping__result',
  AindEphysPreprocessingResult: 'aind_ephys_preprocessing__result',
  AindEphysSpikesortingResult: 'aind_ephys_spikesorting__result',
  ExtracellularRecordingWeightsCalculationResult:
    'extracellular_recording_weights_calculation__result',
  MeshLodGenerationResult: 'mesh_lod_generation__result',
  EFeatureExtractionResult: 'efeature_extraction__result',
  EModelOptimizationResult: 'emodel_optimization__result',
  OptimizedEModelAnalysisValidationResult: 'optimized_emodel_analysis_validation__result',
  CircuitSynapticPhysiologyAssignmentResult: 'circuit_synaptic_physiology_assignment__result',
} as const;

export type TTaskResultType = (typeof TaskResultType)[keyof typeof TaskResultType];

/** Mirrors entitycore's `DerivationType`. */
export const DerivationType = {
  Unspecified: 'unspecified',
} as const;

export type TDerivationType = (typeof DerivationType)[keyof typeof DerivationType];

/**
 * The `used`/`generated` side of a derivation as entitycore returns it.
 *
 * Deliberately thin — `NestedEntityRead` carries identity only, not the source entity's own
 * fields, so anything else about it has to be fetched separately.
 */
export interface INestedDerivationEntity {
  id: string;
  type: string;
  authorized_project_id: string | null;
  authorized_public: boolean;
  lifecycle_status?: string;
  creation_date?: string;
  update_date?: string;
}

/** A derivation in which this entity is the generated side: what it was derived from. */
export interface IGeneratedDerivation {
  used: INestedDerivationEntity;
  derivation_type: TDerivationType;
  label: string | null;
}

/** A derivation in which this entity is the used side: what was derived from it. */
export interface IUsedDerivation {
  generated: INestedDerivationEntity;
  derivation_type: TDerivationType;
  label: string | null;
}

export interface ITaskResultBase<T extends Record<string, unknown>> {
  name: string;
  description: string;
  task_result_type: TTaskResultType;
  /** free-form payload the producing task writes; shape varies by `task_result_type` */
  data_payload: T;
}

export interface ITaskResult<T extends Record<string, unknown> = Record<string, unknown>>
  extends ITaskResultBase<T>,
    EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    Timestamps,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreType,
    IEntityLifecycleStatus {
  contributions?: Array<IContributor> | null;
  generated_from_derivations?: Array<IGeneratedDerivation> | null;
  used_by_derivations?: Array<IUsedDerivation> | null;
}

export interface ITaskResultTypeFilter {
  task_result_type?: TTaskResultType | null;
}

export interface ITaskResultFilter
  extends PaginationFilter,
    NameFilter,
    TimestampsFilter,
    ContributionFilter,
    OwnershipFilter,
    SearchFilter,
    IlikeSearchFilter,
    IDFilter,
    ITaskResultTypeFilter,
    EntityDerivationFilter {
  with_facets?: boolean;
}

const CreateTaskResultSchema = z.object({
  name: z.string().nonempty({ message: 'Name is required' }),
  description: z.string().nonempty({ message: 'Description is required' }),
  task_result_type: z.string().nonempty({ message: 'Task result type is required' }),
  data_payload: z.record(z.string(), z.unknown()).default({}),
  authorized_public: z.boolean().default(false),
});

export type TCreateTaskResult = z.infer<typeof CreateTaskResultSchema>;

const UpdateTaskResultSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  task_result_type: z.string().optional(),
  data_payload: z.record(z.string(), z.unknown()).optional(),
});

export type TUpdateTaskResult = z.infer<typeof UpdateTaskResultSchema>;
