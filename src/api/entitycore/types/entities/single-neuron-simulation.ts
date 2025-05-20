import z from 'zod';
import { INestedMEModel } from './me-model';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  Timestamps,
  EntityCoreBaseAsset,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  BrainRegionFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
} from '@/api/entitycore/types/shared/request';

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
  injection_location: string[];
  recording_location: string[];
}

export interface ISingleNeuronSimulation
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ISingleNeuronSimulationBase,
    Timestamps,
    EntityAuthorization {
  me_model: INestedMEModel;
  type: EntityTypeEnum.SingleNeuronSimulation;
}

export interface ISingleNeuronSimulationFilter
  extends Partial<ContributionFilter>,
    Partial<MtypeFilter>,
    Partial<EtypeFilter>,
    Partial<BrainRegionFilter>,
    Partial<SharedFilter> {
  me_model__id?: string;
}

export const CreateSingleNeuronSimulationSchema = z.object({
  name: z.string(),
  description: z.string(),
  status: z.nativeEnum(SingleNeuronSimulationStatus),
  seed: z.number().int(),
  injection_location: z.array(z.string()),
  recording_location: z.array(z.string()),
  brain_region_id: z.string().uuid(),
  me_model_id: z.string().uuid(),
});

export type TCreateSingleNeuronSimulation = z.infer<typeof CreateSingleNeuronSimulationSchema>;
