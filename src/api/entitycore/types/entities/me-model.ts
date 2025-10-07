import z from 'zod';
import { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  IContributor,
  Timestamps,
  ISpecies,
  IStrain,
  IEType,
  IMType,
  EntityCoreType,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IMorphologyFilter,
  BrainRegionFilter,
  PaginationFilter,
  IEModelFilter,
  SpeciesFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
  IdFilter,
  OwnershipFilter,
} from '@/api/entitycore/types/shared/request';

export enum ValidationStatus {
  Created = 'created',
  Initialized = 'initialized',
  Running = 'running',
  Done = 'done',
  Error = 'error',
}

interface IMEModelBase {
  name: string;
  description: string;
  validation_status: ValidationStatus;
}

export interface IMEModel
  extends EntityCoreIdentifiable,
    IMEModelBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: BrainRegionHierarchyBase;
  contributions?: Array<IContributor> | null;
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
  morphology: ICellMorphology;
  emodel: IEModel;
}

export interface INestedMEModel extends IMEModelBase, Timestamps {
  id: string;
  mtypes: Array<IMType>;
  etypes: Array<IEType>;
}

export interface IMEModelFilter
  extends ContributionFilter,
    IdFilter,
    MtypeFilter,
    EtypeFilter,
    SpeciesFilter,
    BrainRegionFilter,
    IMorphologyFilter,
    PaginationFilter,
    IEModelFilter,
    SharedFilter,
    OwnershipFilter {
  score__lte: number | null;
  score__gte: number | null;
  validation_status: ValidationStatus;
}

export const CreateMEModelSchema = z.object({
  name: z.string().nonempty(),
  description: z.string(),
  validation_status: z.enum(ValidationStatus),
  brain_region_id: z.uuid(),
  morphology_id: z.uuid(),
  emodel_id: z.uuid(),
  species_id: z.uuid(),
  strain_id: z.uuid().nullable(),
});

export type TCreateMEModel = z.infer<typeof CreateMEModelSchema>;
