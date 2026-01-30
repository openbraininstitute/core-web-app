import z from 'zod';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { INestedMEModel } from '@/api/entitycore/types/entities/me-model';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import {
  type ISingleNeuronSimulationBase,
  SingleNeuronSimulationStatus,
} from '@/api/entitycore/types/shared/neuron-simulation';
import type {
  BrainRegionFilter,
  BrainRegionHierarchyFilter,
  ContributionFilter,
  EtypeFilter,
  IlikeSearchFilter,
  MtypeFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface ISingleNeuronSimulation
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ISingleNeuronSimulationBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {
  brain_region: IBrainRegionHierarchy;
  me_model: INestedMEModel;
}

export interface MeTypeFilter {
  me_type_creation_date__lte?: string | null;
  me_type_creation_date__gte?: string | null;
  me_type_update_date__lte?: string | null;
  me_type_update_date__gte?: string | null;
  me_type__name?: string | null;
  me_type__name__in?: string | null;
  me_type__name_ilike?: string | null;
  me_type__id?: string | null;
  me_type__id_in?: string | null;
  me_type_species__id_in?: string | null;
  me_type__validation_status?: string | null;
  me_type__order_by?: string | null;
}

interface MeModelFilter {
  me_model__creation_date__lte?: string | null;
  me_model__creation_date__gte?: string | null;
  me_model__update_date__lte?: string | null;
  me_model__update_date__gte?: string | null;
  me_model__name?: string | null;
  me_model__name__in?: Array<string | null>;
  me_model__name__ilike?: string | null;
  me_model__id?: string | null;
  me_model__id__in?: Array<string | null>;
  me_model__species_id__in?: Array<string | null>;
  me_model__validation_status?: string | null;
  me_model__order_by?: string | null;
}
export interface ISingleNeuronSimulationFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    BrainRegionFilter,
    BrainRegionHierarchyFilter,
    SharedFilter,
    MeTypeFilter,
    MeModelFilter,
    PaginationFilter,
    OwnershipFilter,
    IlikeSearchFilter {}

const CreateSingleNeuronSimulationSchema = z.object({
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
