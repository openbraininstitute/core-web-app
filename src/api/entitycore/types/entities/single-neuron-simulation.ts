import z from 'zod';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  IBrainRegion,
  IContributor,
  Timestamps,
  ISpecies,
  IStrain,
  IEType,
  IMType,
  EntityCoreType,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IMorphologyFilter,
  BrainRegionFilter,
  IEModelFilter,
  SpeciesFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
} from '@/api/entitycore/types/shared/request';
import { INestedMEModel, IMEModelFilter } from './me-model';

export enum SingleNeuronSimulationStatus {
  started = 'started',
  failure = 'failure',
  success = 'success',
}

export interface ISingleNeuronSimulationBase {
  name: string;
  description: string;
  seed: number;
  status: SingleNeuronSimulationStatus;
  injectionLocation: string[];
  recordingLocation: string[];
}

export interface ISingleNeuronSimulation
  extends EntityCoreIdentifiable,
    ISingleNeuronSimulationBase,
    Timestamps,
    EntityAuthorization {
  me_model: INestedMEModel;
  type: EntityTypeEnum.SingleNeuronSimulation;
}

export interface ISingleNeuronSimulationFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    BrainRegionFilter,
    SharedFilter,
    IMEModelFilter {}

export const CreateSingleNeuronSimulationSchema = z.object({
  name: z.string(),
  description: z.string(),
  status: z.nativeEnum(SingleNeuronSimulationStatus),
  seed: z.number().int(),
  injectionLocation: z.array(z.string()),
  recordingLocation: z.array(z.string()),
  brain_region_id: z.number().int(),
  me_model_id: z.string().uuid(),
});

export type TCreateSingleNeuronSimulation = z.infer<typeof CreateSingleNeuronSimulationSchema>;
