import z from 'zod';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
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

export enum ValidationStatus {
  Created = 'created',
  Initialized = 'initialized',
  Running = 'running',
  Done = 'done',
  Error = 'error',
}

export interface IMEModelBase {
  name: string;
  description: string;
  validation_status: ValidationStatus;
}

export interface IMEModel
  extends EntityCoreIdentifiable,
    IMEModelBase,
    Timestamps,
    EntityAuthorization {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: BrainRegionHierarchyBase;
  contributions?: Array<IContributor> | null;
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
  morphology: IReconstructionMorphology;
  emodel: IEModel;
  type: EntityTypeEnum.Memodel;
}

export interface INestedMEModel extends IMEModelBase, Timestamps {
  id: string;
  mtypes: Array<IMType>;
  etypes: Array<IEType>;
}

export interface IMEModelFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    SpeciesFilter,
    BrainRegionFilter,
    IMorphologyFilter,
    IEModelFilter,
    SharedFilter {
  score__lte: number | null;
  score__gte: number | null;
  validation_status: ValidationStatus;
}

export const CreateMEModelSchema = z.object({
  name: z.string(),
  description: z.string(),
  validation_status: z.nativeEnum(ValidationStatus),
  brain_region_id: z.string().uuid(),
  morphology_id: z.string().uuid(),
  emodel_id: z.string().uuid(),
  species_id: z.string().uuid(),
  strain_id: z.string().uuid().nullable(),
});

export type TCreateMEModel = z.infer<typeof CreateMEModelSchema>;
