import z from 'zod';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { MeTypeFilter } from '@/api/entitycore/types/entities/single-neuron-simulation';
import type { SingleNeuronSynaptomeBase } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type { ISingleNeuronSimulationBase } from '@/api/entitycore/types/shared/neuron-simulation';
import type {
  BrainRegionFilter,
  BrainRegionHierarchyFilter,
  ContributionFilter,
  EtypeFilter,
  IDFilter,
  IlikeSearchFilter,
  MtypeFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';
import type { Prettify } from '@/utils/type';

export interface ISingleNeuronSynaptomeSimulation
  extends ISingleNeuronSimulationBase,
    EntityAuthorization,
    Timestamps,
    EntityCoreType,
    EntityCoreBaseAsset {
  brain_region: IBrainRegionHierarchy;
  synaptome: Prettify<SingleNeuronSynaptomeBase & EntityCoreIdentifiable & Timestamps>;
}

interface SynaptomeFilter {
  synaptome_creation_date_gte?: string | null;
  synaptome_update_date__lte?: string | null;
  synaptome_update_date_gte?: string | null;
  synaptome_name?: string | null;
  synaptome__name__in?: string | null;
  synaptome_name__ilike?: string | null;
  synaptome__id?: string | null;
  synaptome_id_in?: string | null;
  synaptome_order_by?: string | null;
}

export interface ISingleNeuronSynaptomeSimulationFilter
  extends IDFilter,
    ContributionFilter,
    BrainRegionFilter,
    BrainRegionHierarchyFilter,
    OwnershipFilter,
    SharedFilter,
    TimestampsFilter,
    MeTypeFilter,
    MtypeFilter,
    EtypeFilter,
    SynaptomeFilter,
    PaginationFilter,
    OwnershipFilter,
    IlikeSearchFilter {}

const CreateSingleNeuronSynaptomeSimulationSchema = z.object({
  name: z.string(),
  description: z.string(),
  seed: z.number().int(),
  injection_location: z.array(z.string()),
  recording_location: z.array(z.string()),
  brain_region_id: z.string().uuid(),
  synaptome_id: z.string().uuid(),
});

export type TCreateSingleNeuronSynaptomeSimulation = z.infer<
  typeof CreateSingleNeuronSynaptomeSimulationSchema
>;
