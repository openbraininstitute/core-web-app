import z from 'zod';
import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  IEType,
  IMType,
  ISpecies,
  IStrain,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  ContributionFilter,
  EtypeFilter,
  IdFilter,
  IEModelFilter,
  IMorphologyFilter,
  MtypeFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
  SpeciesFilter,
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
  contributions?: IContributor[] | null;
  mtypes: IMType[] | null;
  etypes: IEType[] | null;
  morphology: ICellMorphology;
  emodel: IEModel;
  calibration_result: {
    rin: number;
  };
}

export interface INestedMEModel extends IMEModelBase, Timestamps {
  id: string;
  mtypes: IMType[];
  etypes: IEType[];
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
  validation_status: z.nativeEnum(ValidationStatus),
  brain_region_id: z.string().uuid(),
  morphology_id: z.string().uuid(),
  emodel_id: z.string().uuid(),
  species_id: z.string().uuid(),
  strain_id: z.string().uuid().nullable(),
});

export type TCreateMEModel = z.infer<typeof CreateMEModelSchema>;
